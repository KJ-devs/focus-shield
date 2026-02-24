use std::sync::Arc;
use std::time::Instant;

use tokio::sync::RwLock;

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

/// Shared daemon state accessible across connections
pub struct DaemonState {
    pub blocking: RwLock<BlockingState>,
    pub start_time: Instant,
    pub shutdown_signal: tokio::sync::Notify,
}

impl DaemonState {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            blocking: RwLock::new(BlockingState::default()),
            start_time: Instant::now(),
            shutdown_signal: tokio::sync::Notify::new(),
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
    blocking.blocked_processes = payload.processes;

    // NOTE: Actual hosts file modification and process blocking
    // will be implemented in US-12 (hosts manager) and US-13 (process monitor).
    // This handler sets up the state that those modules will consume.

    DaemonResponse::ok(request.id)
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
            blocking.active_session_id = None;
            blocking.blocked_domains.clear();
            blocking.blocked_processes.clear();

            // NOTE: Actual cleanup (hosts file rollback, process resume)
            // will be implemented in US-12 and US-13.

            DaemonResponse::ok(request.id)
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

    // Clean up blocking state before shutdown
    let mut blocking = state.blocking.write().await;
    if blocking.active_session_id.is_some() {
        log::warn!("Shutting down with active blocking session — cleaning up");
        blocking.active_session_id = None;
        blocking.blocked_domains.clear();
        blocking.blocked_processes.clear();
        // NOTE: Actual cleanup will be in US-12/US-13
    }
    drop(blocking);

    // Signal the main loop to shut down
    state.shutdown_signal.notify_one();

    DaemonResponse::ok(request.id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn should_start_and_stop_blocking() {
        let state = DaemonState::new();

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
        let state = DaemonState::new();

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
        let state = DaemonState::new();

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
        let state = DaemonState::new();
        let req = DaemonRequest::new(DaemonCommand::HealthCheck);
        let res = handle_request(&state, req).await;
        assert!(res.success);

        let data = res.data.unwrap();
        assert_eq!(data["alive"], true);
        assert_eq!(data["version"], PROTOCOL_VERSION);
    }

    #[tokio::test]
    async fn should_cleanup_on_shutdown() {
        let state = DaemonState::new();

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
}
