//! Authoritative session manager — the timer runs HERE, not in React.
//!
//! React is a display. Rust is the clock.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{Mutex, Notify};
use tokio::time::{interval, Duration};
use tauri::{AppHandle, Emitter};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum SessionPhase {
    Idle,
    TokenDisplay,
    Active,
    UnlockPrompt,
    Paused,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub duration: f64,        // minutes
    pub blocking_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionConfig {
    pub preset_id: String,
    pub preset_name: String,
    pub lock_level: u8,
    pub duration_ms: u64,
    pub blocks: Vec<SessionBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub phase: SessionPhase,
    pub run_id: Option<String>,
    pub preset_name: Option<String>,
    pub lock_level: u8,
    pub time_remaining_ms: u64,
    pub total_duration_ms: u64,
    pub current_block_index: usize,
    pub distraction_count: u32,
    pub started_at: Option<u64>,
    pub token_countdown: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionReview {
    pub session_name: String,
    pub total_duration_ms: u64,
    pub actual_focus_ms: u64,
    pub distraction_count: u32,
    pub completed_normally: bool,
    pub focus_score: u32,
}

/// Events emitted to the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TickPayload {
    pub time_remaining_ms: u64,
    pub current_block_index: usize,
    pub phase: SessionPhase,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseChangedPayload {
    pub phase: SessionPhase,
    pub snapshot: SessionSnapshot,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionCompletedPayload {
    pub review: SessionReview,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenDisplayPayload {
    pub token: String,
    pub countdown: u8,
    pub lock_level: u8,
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

#[derive(Debug)]
struct SessionInner {
    phase: SessionPhase,
    config: Option<SessionConfig>,
    run_id: Option<String>,
    time_remaining_ms: u64,
    current_block_index: usize,
    distraction_count: u32,
    started_at: Option<u64>,
    token_hash: Option<String>,
    token_countdown: u8,
    unlock_attempts: u32,
    cooldown_until: Option<u64>,
}

impl Default for SessionInner {
    fn default() -> Self {
        Self {
            phase: SessionPhase::Idle,
            config: None,
            run_id: None,
            time_remaining_ms: 0,
            current_block_index: 0,
            distraction_count: 0,
            started_at: None,
            token_hash: None,
            token_countdown: 0,
            unlock_attempts: 0,
            cooldown_until: None,
        }
    }
}

impl SessionInner {
    fn snapshot(&self) -> SessionSnapshot {
        SessionSnapshot {
            phase: self.phase.clone(),
            run_id: self.run_id.clone(),
            preset_name: self.config.as_ref().map(|c| c.preset_name.clone()),
            lock_level: self.config.as_ref().map(|c| c.lock_level).unwrap_or(1),
            time_remaining_ms: self.time_remaining_ms,
            total_duration_ms: self.config.as_ref().map(|c| c.duration_ms).unwrap_or(0),
            current_block_index: self.current_block_index,
            distraction_count: self.distraction_count,
            started_at: self.started_at,
            token_countdown: self.token_countdown,
        }
    }

    fn compute_block_index(&self) -> usize {
        let config = match &self.config {
            Some(c) => c,
            None => return 0,
        };
        let elapsed_ms = config.duration_ms.saturating_sub(self.time_remaining_ms);
        let elapsed_min = elapsed_ms as f64 / 60_000.0;
        let mut accum = 0.0;
        for (i, block) in config.blocks.iter().enumerate() {
            accum += block.duration;
            if elapsed_min < accum {
                return i;
            }
        }
        config.blocks.len().saturating_sub(1)
    }

    fn compute_review(&self, completed_normally: bool) -> SessionReview {
        let total = self.config.as_ref().map(|c| c.duration_ms).unwrap_or(0);
        let actual = if completed_normally {
            total
        } else {
            total.saturating_sub(self.time_remaining_ms)
        };
        let score = if total == 0 {
            0
        } else {
            let base = ((actual as f64 / total as f64) * 100.0) as i32;
            let penalty = (self.distraction_count * 5) as i32;
            (base - penalty).clamp(0, 100) as u32
        };

        SessionReview {
            session_name: self.config.as_ref()
                .map(|c| c.preset_name.clone())
                .unwrap_or_else(|| "Session".to_string()),
            total_duration_ms: total,
            actual_focus_ms: actual,
            distraction_count: self.distraction_count,
            completed_normally,
            focus_score: score,
        }
    }
}

// ---------------------------------------------------------------------------
// Public manager
// ---------------------------------------------------------------------------

pub struct SessionManager {
    inner: Arc<Mutex<SessionInner>>,
    stop_notify: Arc<Notify>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(SessionInner::default())),
            stop_notify: Arc::new(Notify::new()),
        }
    }

    /// Start a new session. Returns the generated token (empty for level 5).
    pub async fn start(
        &self,
        config: SessionConfig,
        app: AppHandle,
    ) -> Result<(String, SessionSnapshot), String> {
        let mut state = self.inner.lock().await;

        if state.phase != SessionPhase::Idle && state.phase != SessionPhase::Completed {
            return Err("A session is already in progress".to_string());
        }

        let run_id = format!("run-{}-{}", now_ms(), &uuid::Uuid::new_v4().to_string()[..8]);
        let lock_level = config.lock_level;

        // Generate token and hash with Argon2id
        let token = generate_token(lock_level);
        let token_hash = if !token.is_empty() {
            Some(argon2_hash(&token))
        } else {
            None
        };

        state.config = Some(config.clone());
        state.run_id = Some(run_id);
        state.token_hash = token_hash;
        state.distraction_count = 0;
        state.unlock_attempts = 0;
        state.cooldown_until = None;

        if lock_level == 5 || token.is_empty() {
            // Level 5: no token, go straight to active
            state.phase = SessionPhase::Active;
            state.time_remaining_ms = config.duration_ms;
            state.current_block_index = 0;
            state.started_at = Some(now_ms());
            state.token_countdown = 0;

            let snapshot = state.snapshot();
            drop(state);

            self.spawn_timer(app.clone());
            emit_phase_changed(&app, &snapshot);

            return Ok((String::new(), snapshot));
        }

        // Display token for 10 seconds, then auto-start
        state.phase = SessionPhase::TokenDisplay;
        state.token_countdown = 10;
        state.time_remaining_ms = config.duration_ms;

        let snapshot = state.snapshot();
        let token_clone = token.clone();
        drop(state);

        // Emit token display event
        let _ = app.emit("session:token_display", TokenDisplayPayload {
            token: token_clone.clone(),
            countdown: 10,
            lock_level,
        });

        // Spawn countdown task
        let inner = self.inner.clone();
        let stop = self.stop_notify.clone();
        let app2 = app.clone();
        let mgr_inner = self.inner.clone();
        let mgr_stop = self.stop_notify.clone();

        tauri::async_runtime::spawn(async move {
            let mut ticker = interval(Duration::from_secs(1));
            ticker.tick().await; // first tick is immediate

            for countdown in (0..10).rev() {
                tokio::select! {
                    _ = ticker.tick() => {},
                    _ = stop.notified() => return,
                }

                let mut s = inner.lock().await;
                if s.phase != SessionPhase::TokenDisplay {
                    return;
                }

                s.token_countdown = countdown;

                if countdown == 0 {
                    // Auto-start
                    s.phase = SessionPhase::Active;
                    s.started_at = Some(now_ms());
                    s.current_block_index = 0;

                    let snap = s.snapshot();
                    drop(s);

                    emit_phase_changed(&app2, &snap);

                    // Spawn the main timer
                    let timer_mgr = SessionManager {
                        inner: mgr_inner,
                        stop_notify: mgr_stop,
                    };
                    timer_mgr.spawn_timer(app2);
                    return;
                } else {
                    let _ = app2.emit("session:token_countdown", serde_json::json!({
                        "countdown": countdown,
                    }));
                }
            }
        });

        Ok((token_clone, snapshot))
    }

    /// Stop session (requires token verification for lock level > 1).
    pub async fn stop(&self, token: Option<String>, app: &AppHandle) -> Result<SessionReview, String> {
        let mut state = self.inner.lock().await;

        match state.phase {
            SessionPhase::Active | SessionPhase::UnlockPrompt | SessionPhase::Paused => {},
            _ => return Err("No active session to stop".to_string()),
        }

        let lock_level = state.config.as_ref().map(|c| c.lock_level).unwrap_or(1);

        // Verify token for lock level > 1
        if lock_level > 1 {
            // Check cooldown
            if let Some(until) = state.cooldown_until {
                if now_ms() < until {
                    let remaining = (until - now_ms()) / 1000;
                    return Err(format!("Rate limited. Try again in {} seconds.", remaining));
                }
            }

            let token_str = token.ok_or("Token required for lock level > 1")?;
            let expected_hash = state.token_hash.as_ref()
                .ok_or("No token hash stored")?;

            if !argon2_verify(&token_str, expected_hash) {
                state.unlock_attempts += 1;
                if state.unlock_attempts >= 3 {
                    // 5 minute cooldown
                    state.cooldown_until = Some(now_ms() + 5 * 60 * 1000);
                    state.unlock_attempts = 0;
                    return Err("Too many attempts. Locked for 5 minutes.".to_string());
                }
                return Err(format!(
                    "Invalid token. {} attempts remaining.",
                    3 - state.unlock_attempts
                ));
            }
        }

        // Stop the timer
        self.stop_notify.notify_waiters();

        let review = state.compute_review(false);
        state.phase = SessionPhase::Completed;
        state.time_remaining_ms = 0;

        let snapshot = state.snapshot();
        drop(state);

        emit_phase_changed(app, &snapshot);
        let _ = app.emit("session:completed", SessionCompletedPayload {
            review: review.clone(),
        });

        Ok(review)
    }

    /// Request unlock prompt (transitions from Active to UnlockPrompt).
    pub async fn request_unlock(&self, app: &AppHandle) -> Result<SessionSnapshot, String> {
        let mut state = self.inner.lock().await;
        if state.phase != SessionPhase::Active {
            return Err("Can only request unlock from active phase".to_string());
        }
        state.phase = SessionPhase::UnlockPrompt;
        let snapshot = state.snapshot();
        drop(state);
        emit_phase_changed(app, &snapshot);
        Ok(snapshot)
    }

    /// Cancel unlock (back to active).
    pub async fn cancel_unlock(&self, app: &AppHandle) -> Result<SessionSnapshot, String> {
        let mut state = self.inner.lock().await;
        if state.phase != SessionPhase::UnlockPrompt {
            return Err("Not in unlock prompt phase".to_string());
        }
        state.phase = SessionPhase::Active;
        let snapshot = state.snapshot();
        drop(state);
        emit_phase_changed(app, &snapshot);
        Ok(snapshot)
    }

    /// Get current session status.
    pub async fn status(&self) -> SessionSnapshot {
        self.inner.lock().await.snapshot()
    }

    /// Record a distraction attempt.
    pub async fn record_distraction(&self) {
        let mut state = self.inner.lock().await;
        if state.phase == SessionPhase::Active || state.phase == SessionPhase::UnlockPrompt {
            state.distraction_count += 1;
        }
    }

    /// Reset to idle (after review dismissed).
    pub async fn dismiss(&self, app: &AppHandle) -> Result<(), String> {
        let mut state = self.inner.lock().await;
        *state = SessionInner::default();
        let snapshot = state.snapshot();
        drop(state);
        emit_phase_changed(app, &snapshot);
        Ok(())
    }

    /// Spawn the background timer task.
    fn spawn_timer(&self, app: AppHandle) {
        let inner = self.inner.clone();
        let stop = self.stop_notify.clone();

        tauri::async_runtime::spawn(async move {
            let mut ticker = interval(Duration::from_secs(1));
            ticker.tick().await; // first tick immediate, skip it

            loop {
                tokio::select! {
                    _ = ticker.tick() => {},
                    _ = stop.notified() => break,
                }

                let mut state = inner.lock().await;

                if state.phase != SessionPhase::Active && state.phase != SessionPhase::UnlockPrompt {
                    break;
                }

                let next = state.time_remaining_ms.saturating_sub(1000);

                if next == 0 {
                    // Session completed normally
                    let review = state.compute_review(true);
                    state.phase = SessionPhase::Completed;
                    state.time_remaining_ms = 0;

                    let snapshot = state.snapshot();
                    drop(state);

                    emit_phase_changed(&app, &snapshot);
                    let _ = app.emit("session:completed", SessionCompletedPayload {
                        review,
                    });
                    break;
                }

                state.time_remaining_ms = next;
                state.current_block_index = state.compute_block_index();

                let payload = TickPayload {
                    time_remaining_ms: next,
                    current_block_index: state.current_block_index,
                    phase: state.phase.clone(),
                };
                drop(state);

                let _ = app.emit("session:tick", payload);
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Hash a token using Argon2id.
///
/// Parameters tuned for a self-discipline tool (not a server auth system):
/// - memory_cost: 16 MiB (fast enough for UX, slow enough to deter brute-force)
/// - time_cost: 2 iterations
/// - parallelism: 1
///
/// Returns a PHC-formatted string: `$argon2id$v=19$m=16384,t=2,p=1$<salt>$<hash>`
fn argon2_hash(token: &str) -> String {
    use argon2::{Argon2, Algorithm, Version, Params, password_hash::{SaltString, PasswordHasher}};
    use rand::rngs::OsRng;

    let salt = SaltString::generate(&mut OsRng);
    let params = Params::new(16_384, 2, 1, None)
        .expect("Invalid Argon2 params");
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    argon2
        .hash_password(token.as_bytes(), &salt)
        .expect("Failed to hash token")
        .to_string()
}

/// Verify a token against an Argon2id hash.
///
/// Constant-time comparison via the argon2 crate.
fn argon2_verify(token: &str, hash: &str) -> bool {
    use argon2::{Argon2, password_hash::{PasswordHash, PasswordVerifier}};

    let parsed = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };

    Argon2::default()
        .verify_password(token.as_bytes(), &parsed)
        .is_ok()
}

/// Generate a random token based on lock level.
fn generate_token(level: u8) -> String {
    if level >= 5 { return String::new(); }

    let (length, charset) = match level {
        1 => (8, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
        2 => (16, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"),
        3 => (32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?"),
        4 => (48, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?"),
        _ => (8, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
    };

    let charset_bytes = charset.as_bytes();
    let charset_len = charset_bytes.len();
    let mut result = Vec::with_capacity(length);

    // Use getrandom for cryptographic randomness
    let mut random_bytes = vec![0u8; length * 2];
    getrandom::getrandom(&mut random_bytes).expect("Failed to generate random bytes");

    let max_acceptable = (256 / charset_len) * charset_len;

    let mut i = 0;
    while result.len() < length {
        if i >= random_bytes.len() {
            // Need more random bytes
            getrandom::getrandom(&mut random_bytes).expect("Failed to generate random bytes");
            i = 0;
        }
        let byte = random_bytes[i] as usize;
        i += 1;
        if byte < max_acceptable {
            result.push(charset_bytes[byte % charset_len]);
        }
    }

    String::from_utf8(result).unwrap_or_default()
}

fn emit_phase_changed(app: &AppHandle, snapshot: &SessionSnapshot) {
    let _ = app.emit("session:phase_changed", PhaseChangedPayload {
        phase: snapshot.phase.clone(),
        snapshot: snapshot.clone(),
    });
}
