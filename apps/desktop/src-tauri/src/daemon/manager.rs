use std::process::Stdio;
use std::sync::Arc;

use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};

use focus_shield_daemon::DaemonClient;

/// Manages the daemon sidecar lifecycle: spawn, health check, restart.
pub struct DaemonManager {
    state: Arc<RwLock<DaemonManagerState>>,
}

struct DaemonManagerState {
    child: Option<tokio::process::Child>,
    daemon_path: String,
}

impl DaemonManager {
    /// Create a new DaemonManager with the path to the daemon binary.
    pub fn new(daemon_path: String) -> Self {
        Self {
            state: Arc::new(RwLock::new(DaemonManagerState {
                child: None,
                daemon_path,
            })),
        }
    }

    /// Spawn the daemon process if not already running.
    pub async fn ensure_running(&self) -> Result<(), String> {
        // Check if daemon is already alive
        if DaemonClient::health_check().await.unwrap_or(false) {
            log::info!("Daemon is already running");
            return Ok(());
        }

        let mut state = self.state.write().await;

        // Spawn the daemon binary
        log::info!("Spawning daemon: {}", state.daemon_path);
        let child = tokio::process::Command::new(&state.daemon_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn daemon: {}", e))?;

        state.child = Some(child);
        drop(state);

        // Wait for daemon to be ready
        for _ in 0..20 {
            sleep(Duration::from_millis(250)).await;
            if DaemonClient::health_check().await.unwrap_or(false) {
                log::info!("Daemon is ready");
                return Ok(());
            }
        }

        Err("Daemon failed to start within 5 seconds".to_string())
    }

    /// Shut down the daemon gracefully.
    pub async fn shutdown(&self) -> Result<(), String> {
        // Try graceful shutdown via IPC
        if DaemonClient::health_check().await.unwrap_or(false) {
            match DaemonClient::shutdown().await {
                Ok(_) => {
                    log::info!("Daemon shut down gracefully");

                    // Wait for process to exit
                    let mut state = self.state.write().await;
                    if let Some(ref mut child) = state.child {
                        let _ = tokio::time::timeout(
                            Duration::from_secs(5),
                            child.wait(),
                        )
                        .await;
                    }
                    state.child = None;
                    return Ok(());
                }
                Err(e) => {
                    log::warn!("Graceful shutdown failed: {}", e);
                }
            }
        }

        // Force kill if graceful shutdown failed
        let mut state = self.state.write().await;
        if let Some(ref mut child) = state.child {
            let _ = child.kill().await;
            log::warn!("Daemon force-killed");
        }
        state.child = None;

        Ok(())
    }

    /// Check if the daemon process is alive.
    pub async fn is_running(&self) -> bool {
        DaemonClient::health_check().await.unwrap_or(false)
    }
}
