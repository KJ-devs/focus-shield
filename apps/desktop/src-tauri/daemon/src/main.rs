use std::sync::Arc;

use focus_shield_daemon::handler::DaemonState;
use focus_shield_daemon::server::run_server;

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

    let state = DaemonState::new();

    // Write PID file for the main app to find us
    if let Err(e) = write_pid_file() {
        log::warn!("Failed to write PID file: {}", e);
    }

    // Run the IPC server
    if let Err(e) = run_server(Arc::clone(&state)).await {
        log::error!("Server error: {}", e);
        std::process::exit(1);
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
