//! Tauri IPC commands for storage operations.
//!
//! All persistent data access goes through these commands.

use crate::db::{DailyStatsRecord, SessionRunRecord, StorageManager, UserProgressRecord, XPHistoryRecord};
use crate::error::FocusError;
use serde::{Deserialize, Serialize};
use tauri::State;

// ---------------------------------------------------------------------------
// Save session run
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSessionRunPayload {
    pub id: String,
    pub session_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub status: String,
    pub distraction_count: i64,
    pub focus_score: f64,
    pub total_focus_minutes: f64,
    pub total_break_minutes: f64,
    pub completed_normally: bool,
}

#[tauri::command]
pub async fn storage_save_session_run(
    payload: SaveSessionRunPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    let run = SessionRunRecord {
        id: payload.id.clone(),
        session_id: payload.session_id,
        profile_id: "default".to_string(),
        started_at: payload.started_at,
        ended_at: Some(payload.ended_at.clone()),
        status: payload.status.clone(),
        current_block_index: 0,
        token_hash: String::new(),
        distraction_attempts: "[]".to_string(),
        unlock_attempts: "[]".to_string(),
        focus_score: Some(payload.focus_score),
        total_focus_minutes: payload.total_focus_minutes,
        total_break_minutes: payload.total_break_minutes,
    };

    storage.save_session_run(&run)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    // Upsert daily stats for today
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    storage.upsert_daily_stats(
        &today,
        "default",
        payload.total_focus_minutes,
        payload.total_break_minutes,
        payload.completed_normally,
        payload.distraction_count,
        payload.focus_score,
        "[]",
    ).map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Get today stats
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayStatsResponse {
    pub focus_minutes: f64,
    pub sessions_completed: i64,
    pub distractions_blocked: i64,
    pub current_streak: i64,
}

#[tauri::command]
pub async fn storage_get_today_stats(
    storage: State<'_, StorageManager>,
) -> Result<TodayStatsResponse, FocusError> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let stats = storage.get_daily_stats(&today, "default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    let streak = storage.calculate_streak("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    match stats {
        Some(s) => Ok(TodayStatsResponse {
            focus_minutes: s.total_focus_minutes,
            sessions_completed: s.sessions_completed,
            distractions_blocked: s.distraction_attempts,
            current_streak: streak,
        }),
        None => Ok(TodayStatsResponse {
            focus_minutes: 0.0,
            sessions_completed: 0,
            distractions_blocked: 0,
            current_streak: streak,
        }),
    }
}

// ---------------------------------------------------------------------------
// Get recent session runs (for HomePage)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentSessionResponse {
    pub id: String,
    pub session_id: String,
    pub started_at: String,
    pub status: String,
    pub focus_score: Option<f64>,
    pub total_focus_minutes: f64,
}

#[tauri::command]
pub async fn storage_get_recent_sessions(
    limit: Option<usize>,
    storage: State<'_, StorageManager>,
) -> Result<Vec<RecentSessionResponse>, FocusError> {
    let runs = storage.get_recent_runs(limit.unwrap_or(10))
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    Ok(runs.into_iter().map(|r| RecentSessionResponse {
        id: r.id,
        session_id: r.session_id,
        started_at: r.started_at,
        status: r.status,
        focus_score: r.focus_score,
        total_focus_minutes: r.total_focus_minutes,
    }).collect())
}

// ---------------------------------------------------------------------------
// Get stats range (for Analytics)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn storage_get_stats_range(
    start_date: String,
    end_date: String,
    storage: State<'_, StorageManager>,
) -> Result<Vec<DailyStatsRecord>, FocusError> {
    storage.get_stats_range(&start_date, &end_date, "default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Get streak
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn storage_get_streak(
    storage: State<'_, StorageManager>,
) -> Result<i64, FocusError> {
    storage.calculate_streak("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Gamification — user progress
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn storage_get_user_progress(
    storage: State<'_, StorageManager>,
) -> Result<UserProgressRecord, FocusError> {
    storage.get_user_progress("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn storage_update_user_progress(
    total_xp: i64,
    achievement_progress: String,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.update_user_progress("default", total_xp, &achievement_progress)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn storage_save_xp_gain(
    session_id: String,
    amount: i64,
    reason: String,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.save_xp_gain("default", &session_id, amount, &reason)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn storage_get_xp_history(
    limit: Option<usize>,
    storage: State<'_, StorageManager>,
) -> Result<Vec<XPHistoryRecord>, FocusError> {
    storage.get_xp_history("default", limit.unwrap_or(20))
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Gamification — streak info
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreakInfoResponse {
    pub current_streak: i64,
    pub longest_streak: i64,
    pub freeze_available: bool,
    pub freezes_used_this_week: i64,
}

#[tauri::command]
pub async fn storage_get_streak_info(
    storage: State<'_, StorageManager>,
) -> Result<StreakInfoResponse, FocusError> {
    let current = storage.calculate_streak("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;
    let longest = storage.get_longest_streak("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;
    let freezes_used = storage.get_freezes_this_week("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    Ok(StreakInfoResponse {
        current_streak: current,
        longest_streak: std::cmp::max(current, longest),
        freeze_available: freezes_used < 1,
        freezes_used_this_week: freezes_used,
    })
}

#[tauri::command]
pub async fn storage_use_streak_freeze(
    storage: State<'_, StorageManager>,
) -> Result<bool, FocusError> {
    let freezes_used = storage.get_freezes_this_week("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;
    if freezes_used >= 1 {
        return Ok(false);
    }
    storage.record_streak_freeze("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Gamification — aggregate stats for achievement evaluation
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStatsResponse {
    pub total_sessions_completed: i64,
    pub total_focus_hours: f64,
    pub current_streak: i64,
    pub longest_streak: i64,
}

#[tauri::command]
pub async fn storage_get_game_stats(
    storage: State<'_, StorageManager>,
) -> Result<GameStatsResponse, FocusError> {
    let sessions = storage.get_total_sessions_completed("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;
    let hours = storage.get_total_focus_hours("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;
    let current = storage.calculate_streak("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;
    let longest = storage.get_longest_streak("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    Ok(GameStatsResponse {
        total_sessions_completed: sessions,
        total_focus_hours: hours,
        current_streak: current,
        longest_streak: std::cmp::max(current, longest),
    })
}
