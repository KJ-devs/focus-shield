use std::sync::Arc;
use std::time::Instant;

use tokio::sync::RwLock;

use crate::hosts_manager::HostsManager;
use crate::process_watcher::{self, WatcherState, DEFAULT_SCAN_INTERVAL_MS};
use crate::protocol::{
    DaemonCommand, DaemonRequest, DaemonResponse, DaemonStatus, DomainRule,
    ProcessRule, StartBlockingPayload, StopBlockingPayload, PROTOCOL_VERSION,
};

/// Current blocking state managed by the daemon
#[derive(Debug, Default)]
pub struct BlockingState {
    pub active_session_id: Option<String>,
    pub blocked_domains: Vec<DomainRule>,
    pub blocked_processes: Vec<ProcessRule>,
}

/// Info about a connected browser extension (stored in DaemonState).
#[derive(Debug, Clone, serde::Serialize)]
pub struct ExtensionInfo {
    pub extension_id: String,
    pub browser: String,
    pub version: String,
    pub connected_at: String,
    pub incognito_allowed: bool,
}

/// Shared daemon state accessible across connections
pub struct DaemonState {
    pub blocking: RwLock<BlockingState>,
    pub watcher: Arc<RwLock<WatcherState>>,
    pub watcher_cancel: Arc<tokio::sync::Notify>,
    pub start_time: Instant,
    pub shutdown_signal: tokio::sync::Notify,
    /// Broadcast channel for pushing events to WebSocket-connected extensions.
    /// Serialized JSON messages are sent through this channel.
    pub extension_broadcast: tokio::sync::broadcast::Sender<String>,
    /// Currently connected browser extensions.
    pub extensions: RwLock<Vec<ExtensionInfo>>,
}

impl DaemonState {
    pub fn new() -> Arc<Self> {
        let watcher = Arc::new(RwLock::new(WatcherState::new()));
        let watcher_cancel = Arc::new(tokio::sync::Notify::new());
        let (broadcast_tx, _) = tokio::sync::broadcast::channel(64);

        // Spawn the watcher background task
        let watcher_clone = watcher.clone();
        let cancel_clone = watcher_cancel.clone();
        tokio::spawn(async move {
            process_watcher::run_watcher(watcher_clone, cancel_clone, DEFAULT_SCAN_INTERVAL_MS)
                .await;
        });

        Arc::new(Self {
            blocking: RwLock::new(BlockingState::default()),
            watcher,
            watcher_cancel,
            start_time: Instant::now(),
            shutdown_signal: tokio::sync::Notify::new(),
            extension_broadcast: broadcast_tx,
            extensions: RwLock::new(Vec::new()),
        })
    }

    /// Create a new state without spawning the watcher (for tests)
    #[cfg(test)]
    pub fn new_for_test() -> Arc<Self> {
        let (broadcast_tx, _) = tokio::sync::broadcast::channel(64);
        Arc::new(Self {
            blocking: RwLock::new(BlockingState::default()),
            watcher: Arc::new(RwLock::new(WatcherState::new())),
            watcher_cancel: Arc::new(tokio::sync::Notify::new()),
            start_time: Instant::now(),
            shutdown_signal: tokio::sync::Notify::new(),
            extension_broadcast: broadcast_tx,
            extensions: RwLock::new(Vec::new()),
        })
    }

    pub fn uptime_seconds(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }
}

/// Process a single daemon request and produce a response
pub async fn handle_request(
    state: &Arc<DaemonState>,
    request: DaemonRequest,
) -> DaemonResponse {
    log::debug!("Handling command: {:?} (id: {})", request.command, request.id);

    match request.command {
        DaemonCommand::StartBlocking => handle_start_blocking(state, request).await,
        DaemonCommand::StopBlocking => handle_stop_blocking(state, request).await,
        DaemonCommand::GetStatus => handle_get_status(state, request).await,
        DaemonCommand::HealthCheck => handle_health_check(state, request).await,
        DaemonCommand::Shutdown => handle_shutdown(state, request).await,
        DaemonCommand::ListProcesses => handle_list_processes(state, request).await,
        DaemonCommand::GetExtensionStatus => handle_get_extension_status(state, request).await,
    }
}

async fn handle_start_blocking(
    state: &Arc<DaemonState>,
    request: DaemonRequest,
) -> DaemonResponse {
    let payload: StartBlockingPayload = match request.parse_payload() {
        Ok(p) => p,
        Err(e) => return DaemonResponse::err(request.id, e.code, e.message),
    };

    let mut blocking = state.blocking.write().await;

    if blocking.active_session_id.is_some() {
        return DaemonResponse::err(
            request.id,
            "SESSION_ALREADY_ACTIVE",
            "A blocking session is already active. Stop it first.",
        );
    }

    log::info!(
        "Starting blocking for session {} ({} domains, {} processes)",
        payload.session_id,
        payload.domains.len(),
        payload.processes.len()
    );

    blocking.active_session_id = Some(payload.session_id);
    blocking.blocked_domains = payload.domains;
    blocking.blocked_processes = payload.processes.clone();

    // Start the process watcher with the given rules
    let mut watcher = state.watcher.write().await;
    let results = watcher.start(payload.processes);

    let blocked_count = results.iter().filter(|r| r.success).count();
    if blocked_count > 0 {
        log::info!(
            "Immediately blocked {} process(es) on session start",
            blocked_count
        );
    }

    // Block domains in the hosts file
    let domains: Vec<String> = blocking
        .blocked_domains
        .iter()
        .map(|d| d.pattern.clone())
        .collect();
    let hosts_blocked = if !domains.is_empty() {
        let hosts = HostsManager::new();
        match hosts.add_blocked_domains(&domains) {
            Ok(count) => {
                log::info!("Blocked {} domain(s) in hosts file", count);
                count
            }
            Err(e) => {
                log::warn!("Failed to modify hosts file (continuing without): {}", e);
                0
            }
        }
    } else {
        0
    };

    // Notify connected extensions to start blocking
    let ext_msg = serde_json::json!({
        "type": "desktop:start_blocking",
        "sessionId": blocking.active_session_id,
        "domains": blocking.blocked_domains.iter().map(|d| &d.pattern).collect::<Vec<_>>(),
        "endTime": null as Option<String>,
    });
    if let Ok(json) = serde_json::to_string(&ext_msg) {
        let _ = state.extension_broadcast.send(json);
    }

    DaemonResponse::ok_with_data(
        request.id,
        &serde_json::json!({
            "processes_blocked": blocked_count,
            "hosts_blocked": hosts_blocked,
            "actions": results,
        }),
    )
}

async fn handle_stop_blocking(
    state: &Arc<DaemonState>,
    request: DaemonRequest,
) -> DaemonResponse {
    let payload: StopBlockingPayload = match request.parse_payload() {
        Ok(p) => p,
        Err(e) => return DaemonResponse::err(request.id, e.code, e.message),
    };

    let mut blocking = state.blocking.write().await;

    match &blocking.active_session_id {
        Some(active_id) if *active_id == payload.session_id => {
            log::info!("Stopping blocking for session {}", payload.session_id);

            // Stop the process watcher and resume suspended processes
            let mut watcher = state.watcher.write().await;
            let resume_results = watcher.stop();
            let total_blocked = watcher.total_blocked;
            let respawn_blocks = watcher.respawn_blocks;

            let resumed_count = resume_results.iter().filter(|r| r.success).count();
            if resumed_count > 0 {
                log::info!("Resumed {} suspended process(es)", resumed_count);
            }

            blocking.active_session_id = None;
            blocking.blocked_domains.clear();
            blocking.blocked_processes.clear();

            // Rollback hosts file
            let hosts_rolled_back = {
                let hosts = HostsManager::new();
                match hosts.remove_blocked_domains() {
                    Ok(removed) => {
                        if removed {
                            log::info!("Hosts file entries removed (rollback)");
                        }
                        removed
                    }
                    Err(e) => {
                        log::warn!("Failed to rollback hosts file: {}", e);
                        false
                    }
                }
            };

            // Notify connected extensions to stop blocking
            let ext_msg = serde_json::json!({
                "type": "desktop:stop_blocking",
                "sessionId": payload.session_id,
            });
            if let Ok(json) = serde_json::to_string(&ext_msg) {
                let _ = state.extension_broadcast.send(json);
            }

            DaemonResponse::ok_with_data(
                request.id,
                &serde_json::json!({
                    "processes_resumed": resumed_count,
                    "total_blocked": total_blocked,
                    "respawn_blocks": respawn_blocks,
                    "hosts_rolled_back": hosts_rolled_back,
                }),
            )
        }
        Some(active_id) => DaemonResponse::err(
            request.id,
            "SESSION_MISMATCH",
            format!(
                "Active session is {}, not {}",
                active_id, payload.session_id
            ),
        ),
        None => DaemonResponse::err(
            request.id,
            "NO_ACTIVE_SESSION",
            "No blocking session is currently active",
        ),
    }
}

async fn handle_get_status(
    state: &Arc<DaemonState>,
    request: DaemonRequest,
) -> DaemonResponse {
    let blocking = state.blocking.read().await;

    let status = DaemonStatus {
        running: true,
        active_session_id: blocking.active_session_id.clone(),
        blocked_domain_count: blocking.blocked_domains.len() as u32,
        blocked_process_count: blocking.blocked_processes.len() as u32,
        uptime_seconds: state.uptime_seconds(),
        pid: std::process::id(),
        version: PROTOCOL_VERSION.to_string(),
    };

    DaemonResponse::ok_with_data(request.id, &status)
}

async fn handle_health_check(
    state: &Arc<DaemonState>,
    request: DaemonRequest,
) -> DaemonResponse {
    let health = serde_json::json!({
        "alive": true,
        "version": PROTOCOL_VERSION,
        "uptime_seconds": state.uptime_seconds(),
    });

    DaemonResponse::ok_with_data(request.id, &health)
}

async fn handle_shutdown(
    state: &Arc<DaemonState>,
    request: DaemonRequest,
) -> DaemonResponse {
    log::info!("Shutdown requested");

    // Stop the process watcher and resume all suspended processes
    let mut watcher = state.watcher.write().await;
    if watcher.is_active() {
        log::warn!("Shutting down with active watcher — resuming suspended processes");
        watcher.stop();
    }
    drop(watcher);

    // Stop the watcher background task
    state.watcher_cancel.notify_one();

    // Rollback hosts file if there are active entries
    let hosts = HostsManager::new();
    if let Err(e) = hosts.remove_blocked_domains() {
        log::warn!("Failed to rollback hosts file during shutdown: {}", e);
    }

    // Clean up blocking state
    let mut blocking = state.blocking.write().await;
    blocking.active_session_id = None;
    blocking.blocked_domains.clear();
    blocking.blocked_processes.clear();
    drop(blocking);

    // Signal the main loop to shut down
    state.shutdown_signal.notify_one();

    DaemonResponse::ok(request.id)
}

async fn handle_list_processes(
    state: &Arc<DaemonState>,
    request: DaemonRequest,
) -> DaemonResponse {
    let mut watcher = state.watcher.write().await;
    let processes = watcher.list_processes();

    DaemonResponse::ok_with_data(
        request.id,
        &serde_json::json!({
            "processes": processes,
            "count": processes.len(),
        }),
    )
}

async fn handle_get_extension_status(
    state: &Arc<DaemonState>,
    request: DaemonRequest,
) -> DaemonResponse {
    let extensions = state.extensions.read().await;
    DaemonResponse::ok_with_data(
        request.id,
        &serde_json::json!({
            "connected": !extensions.is_empty(),
            "connections": *extensions,
        }),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn should_start_and_stop_blocking() {
        let state = DaemonState::new_for_test();

        // Start blocking
        let start_req = DaemonRequest::with_payload(
            DaemonCommand::StartBlocking,
            &StartBlockingPayload {
                session_id: "sess-1".to_string(),
                domains: vec![DomainRule {
                    pattern: "*.reddit.com".to_string(),
                }],
                processes: vec![],
            },
        );
        let res = handle_request(&state, start_req).await;
        assert!(res.success);

        // Verify status
        let status_req = DaemonRequest::new(DaemonCommand::GetStatus);
        let res = handle_request(&state, status_req).await;
        assert!(res.success);
        let status: DaemonStatus = serde_json::from_value(res.data.unwrap()).unwrap();
        assert_eq!(status.active_session_id, Some("sess-1".to_string()));
        assert_eq!(status.blocked_domain_count, 1);

        // Stop blocking
        let stop_req = DaemonRequest::with_payload(
            DaemonCommand::StopBlocking,
            &StopBlockingPayload {
                session_id: "sess-1".to_string(),
            },
        );
        let res = handle_request(&state, stop_req).await;
        assert!(res.success);

        // Verify cleared
        let status_req = DaemonRequest::new(DaemonCommand::GetStatus);
        let res = handle_request(&state, status_req).await;
        let status: DaemonStatus = serde_json::from_value(res.data.unwrap()).unwrap();
        assert!(status.active_session_id.is_none());
    }

    #[tokio::test]
    async fn should_reject_duplicate_session() {
        let state = DaemonState::new_for_test();

        let start_req = DaemonRequest::with_payload(
            DaemonCommand::StartBlocking,
            &StartBlockingPayload {
                session_id: "sess-1".to_string(),
                domains: vec![],
                processes: vec![],
            },
        );
        let res = handle_request(&state, start_req).await;
        assert!(res.success);

        // Try starting another session
        let start_req2 = DaemonRequest::with_payload(
            DaemonCommand::StartBlocking,
            &StartBlockingPayload {
                session_id: "sess-2".to_string(),
                domains: vec![],
                processes: vec![],
            },
        );
        let res = handle_request(&state, start_req2).await;
        assert!(!res.success);
        assert_eq!(res.error.unwrap().code, "SESSION_ALREADY_ACTIVE");
    }

    #[tokio::test]
    async fn should_reject_stop_wrong_session() {
        let state = DaemonState::new_for_test();

        let start_req = DaemonRequest::with_payload(
            DaemonCommand::StartBlocking,
            &StartBlockingPayload {
                session_id: "sess-1".to_string(),
                domains: vec![],
                processes: vec![],
            },
        );
        handle_request(&state, start_req).await;

        let stop_req = DaemonRequest::with_payload(
            DaemonCommand::StopBlocking,
            &StopBlockingPayload {
                session_id: "sess-wrong".to_string(),
            },
        );
        let res = handle_request(&state, stop_req).await;
        assert!(!res.success);
        assert_eq!(res.error.unwrap().code, "SESSION_MISMATCH");
    }

    #[tokio::test]
    async fn should_return_health_check() {
        let state = DaemonState::new_for_test();
        let req = DaemonRequest::new(DaemonCommand::HealthCheck);
        let res = handle_request(&state, req).await;
        assert!(res.success);

        let data = res.data.unwrap();
        assert_eq!(data["alive"], true);
        assert_eq!(data["version"], PROTOCOL_VERSION);
    }

    #[tokio::test]
    async fn should_cleanup_on_shutdown() {
        let state = DaemonState::new_for_test();

        // Start a session
        let start_req = DaemonRequest::with_payload(
            DaemonCommand::StartBlocking,
            &StartBlockingPayload {
                session_id: "sess-1".to_string(),
                domains: vec![DomainRule {
                    pattern: "*.test.com".to_string(),
                }],
                processes: vec![],
            },
        );
        handle_request(&state, start_req).await;

        // Shutdown should clean up
        let req = DaemonRequest::new(DaemonCommand::Shutdown);
        let res = handle_request(&state, req).await;
        assert!(res.success);

        let blocking = state.blocking.read().await;
        assert!(blocking.active_session_id.is_none());
        assert!(blocking.blocked_domains.is_empty());
    }

    #[tokio::test]
    async fn should_start_blocking_with_process_rules() {
        let state = DaemonState::new_for_test();

        let start_req = DaemonRequest::with_payload(
            DaemonCommand::StartBlocking,
            &StartBlockingPayload {
                session_id: "sess-1".to_string(),
                domains: vec![],
                processes: vec![
                    crate::protocol::ProcessRule {
                        name: "nonexistent-test-process-xyz".to_string(),
                        aliases: vec![],
                        action: crate::protocol::ProcessAction::Kill,
                    },
                ],
            },
        );
        let res = handle_request(&state, start_req).await;
        assert!(res.success);

        // The response should include process blocking data
        let data = res.data.unwrap();
        assert_eq!(data["processes_blocked"], 0); // No such process exists

        // Watcher should be active
        let watcher = state.watcher.read().await;
        assert!(watcher.is_active());
        assert_eq!(watcher.rules_count(), 1);
    }

    #[tokio::test]
    async fn should_list_processes() {
        let state = DaemonState::new_for_test();

        let req = DaemonRequest::new(DaemonCommand::ListProcesses);
        let res = handle_request(&state, req).await;
        assert!(res.success);

        let data = res.data.unwrap();
        let count = data["count"].as_u64().unwrap();
        assert!(count > 0, "Should list at least one process");
    }

    #[tokio::test]
    async fn should_stop_watcher_on_stop_blocking() {
        let state = DaemonState::new_for_test();

        // Start with process rules
        let start_req = DaemonRequest::with_payload(
            DaemonCommand::StartBlocking,
            &StartBlockingPayload {
                session_id: "sess-1".to_string(),
                domains: vec![],
                processes: vec![crate::protocol::ProcessRule {
                    name: "nonexistent-test-xyz".to_string(),
                    aliases: vec![],
                    action: crate::protocol::ProcessAction::Suspend,
                }],
            },
        );
        handle_request(&state, start_req).await;

        // Verify watcher is active
        {
            let watcher = state.watcher.read().await;
            assert!(watcher.is_active());
        }

        // Stop blocking
        let stop_req = DaemonRequest::with_payload(
            DaemonCommand::StopBlocking,
            &StopBlockingPayload {
                session_id: "sess-1".to_string(),
            },
        );
        let res = handle_request(&state, stop_req).await;
        assert!(res.success);

        // Verify watcher is stopped
        let watcher = state.watcher.read().await;
        assert!(!watcher.is_active());
    }
}
