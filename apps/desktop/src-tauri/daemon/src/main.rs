use std::sync::Arc;

use focus_shield_daemon::handler::DaemonState;
use focus_shield_daemon::hosts_manager::HostsManager;
use focus_shield_daemon::server::run_server;
use focus_shield_daemon::ws_server::{run_ws_server, WsState};

#[tokio::main]
async fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_millis()
        .init();

    log::info!(
        "Focus Shield Daemon v{} starting (PID: {})",
        focus_shield_daemon::PROTOCOL_VERSION,
        std::process::id()
    );

    // Watchdog: clean up stale hosts entries from a previous crash
    let hosts = HostsManager::new();
    if let Err(e) = hosts.cleanup_stale_entries() {
        log::warn!("Failed to clean up stale hosts entries: {}", e);
    }

    let state = DaemonState::new();
    let ws_state = WsState::new();

    // Write PID file for the main app to find us
    if let Err(e) = write_pid_file() {
        log::warn!("Failed to write PID file: {}", e);
    }

    // Spawn the WebSocket server for extension communication
    let ws_daemon_state = Arc::clone(&state);
    let ws_state_clone = Arc::clone(&ws_state);
    tokio::spawn(async move {
        if let Err(e) = run_ws_server(ws_daemon_state, ws_state_clone).await {
            log::error!("WebSocket server error: {}", e);
        }
    });

    // Run the IPC server (blocks until shutdown)
    if let Err(e) = run_server(Arc::clone(&state)).await {
        log::error!("Server error: {}", e);
        std::process::exit(1);
    }

    // Cleanup hosts file entries on graceful shutdown (safety net)
    let hosts = HostsManager::new();
    if let Err(e) = hosts.remove_blocked_domains() {
        log::warn!("Failed to clean hosts file on shutdown: {}", e);
    }

    // Cleanup PID file on graceful shutdown
    cleanup_pid_file();

    log::info!("Focus Shield Daemon stopped");
}

fn pid_file_path() -> std::path::PathBuf {
    let mut path = std::env::temp_dir();
    path.push("focus-shield-daemon.pid");
    path
}

fn write_pid_file() -> std::io::Result<()> {
    let pid = std::process::id();
    std::fs::write(pid_file_path(), pid.to_string())
}

fn cleanup_pid_file() {
    let _ = std::fs::remove_file(pid_file_path());
}
