mod commands;
mod daemon;
mod db;
mod error;
mod session;

use daemon::DaemonManager;
use db::StorageManager;
use session::SessionManager;
use tauri::Manager;

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
        .manage(SessionManager::new())
        .invoke_handler(tauri::generate_handler![
            commands::daemon_start,
            commands::daemon_stop,
            commands::daemon_status,
            commands::daemon_start_blocking,
            commands::daemon_stop_blocking,
            commands::daemon_health_check,
            commands::daemon_list_processes,
            commands::daemon_extension_status,
            commands::session_start,
            commands::session_stop,
            commands::session_request_unlock,
            commands::session_cancel_unlock,
            commands::session_status,
            commands::session_dismiss,
            commands::session_record_distraction,
            commands::storage_save_session_run,
            commands::storage_get_today_stats,
            commands::storage_get_recent_sessions,
            commands::storage_get_stats_range,
            commands::storage_get_streak,
            commands::storage_get_user_progress,
            commands::storage_update_user_progress,
            commands::storage_save_xp_gain,
            commands::storage_get_xp_history,
            commands::storage_get_streak_info,
            commands::storage_use_streak_freeze,
            commands::storage_get_game_stats,
            // Knowledge module
            commands::knowledge_create_folder,
            commands::knowledge_list_folders,
            commands::knowledge_update_folder,
            commands::knowledge_delete_folder,
            commands::knowledge_create_document,
            commands::knowledge_get_document,
            commands::knowledge_list_documents,
            commands::knowledge_update_document,
            commands::knowledge_delete_document,
            commands::knowledge_search_documents,
            commands::knowledge_create_flashcard,
            commands::knowledge_create_flashcards_batch,
            commands::knowledge_list_flashcards,
            commands::knowledge_list_flashcards_by_document,
            commands::knowledge_get_due_flashcards,
            commands::knowledge_update_flashcard_review,
            commands::knowledge_delete_flashcard,
            commands::knowledge_delete_flashcards_by_document,
            commands::knowledge_create_review_session,
            commands::knowledge_list_review_sessions,
            commands::knowledge_get_stats,
        ])
        .setup(|app| {
            // Initialize SQLite storage
            let app_data_dir = app.path().app_data_dir()
                .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
            let db_path = app_data_dir.join("focus-shield.db");
            log::info!("Database path: {:?}", db_path);

            let storage = StorageManager::open(&db_path)
                .map_err(|e| {
                    log::error!("Failed to initialize storage: {}", e);
                    e
                })?;
            app.manage(storage);

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
