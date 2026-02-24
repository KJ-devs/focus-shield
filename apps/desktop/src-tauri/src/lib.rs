mod commands;
mod daemon;
mod error;

use daemon::DaemonManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Resolve daemon binary path.
    // In development, the daemon binary is at a relative path.
    // In production, Tauri bundles it as a sidecar via externalBin.
    let daemon_path = resolve_daemon_path();
    let daemon_manager = DaemonManager::new(daemon_path);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .manage(daemon_manager)
        .invoke_handler(tauri::generate_handler![
            commands::daemon_start,
            commands::daemon_stop,
            commands::daemon_status,
            commands::daemon_start_blocking,
            commands::daemon_stop_blocking,
            commands::daemon_health_check,
            commands::daemon_list_processes,
        ])
        .setup(|app| {
            // Spawn daemon on app startup in background
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let manager = handle.state::<DaemonManager>();
                if let Err(e) = manager.ensure_running().await {
                    log::warn!("Failed to start daemon on startup: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Resolve the path to the daemon binary based on the current environment.
fn resolve_daemon_path() -> String {
    // In development, look for the daemon binary in the target directory
    #[cfg(debug_assertions)]
    {
        let mut path = std::env::current_exe()
            .unwrap_or_default()
            .parent()
            .unwrap_or(std::path::Path::new("."))
            .to_path_buf();
        path.push("focus-shield-daemon");

        #[cfg(windows)]
        path.set_extension("exe");

        path.to_string_lossy().to_string()
    }

    // In release, the sidecar is bundled alongside the main binary
    #[cfg(not(debug_assertions))]
    {
        let mut path = std::env::current_exe()
            .unwrap_or_default()
            .parent()
            .unwrap_or(std::path::Path::new("."))
            .to_path_buf();
        path.push("focus-shield-daemon");

        #[cfg(windows)]
        path.set_extension("exe");

        path.to_string_lossy().to_string()
    }
}
