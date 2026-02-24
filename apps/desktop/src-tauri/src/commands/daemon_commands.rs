use serde::{Deserialize, Serialize};
use tauri::State;

use focus_shield_daemon::{
    DaemonClient, DaemonCommand, DaemonRequest, DaemonStatus,
    StartBlockingPayload, StopBlockingPayload,
    DomainRule, ProcessRule, ProcessAction,
};

use crate::daemon::DaemonManager;
use crate::error::FocusError;

/// Frontend-facing domain rule (matches shared-types)
#[derive(Debug, Deserialize)]
pub struct JsDomainRule {
    pub pattern: String,
}

/// Frontend-facing process rule (matches shared-types)
#[derive(Debug, Deserialize)]
pub struct JsProcessRule {
    pub name: String,
    pub aliases: Vec<String>,
    pub action: String, // "kill" | "suspend"
}

/// Frontend-facing start blocking request
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartBlockingRequest {
    pub session_id: String,
    pub domains: Vec<JsDomainRule>,
    pub processes: Vec<JsProcessRule>,
}

/// Frontend-facing daemon status response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaemonStatusResponse {
    pub running: bool,
    pub active_session_id: Option<String>,
    pub blocked_domain_count: u32,
    pub blocked_process_count: u32,
    pub uptime_seconds: u64,
    pub pid: u32,
    pub version: String,
}

impl From<DaemonStatus> for DaemonStatusResponse {
    fn from(status: DaemonStatus) -> Self {
        Self {
            running: status.running,
            active_session_id: status.active_session_id,
            blocked_domain_count: status.blocked_domain_count,
            blocked_process_count: status.blocked_process_count,
            uptime_seconds: status.uptime_seconds,
            pid: status.pid,
            version: status.version,
        }
    }
}

/// Ensure the daemon sidecar is running
#[tauri::command]
pub async fn daemon_start(
    manager: State<'_, DaemonManager>,
) -> Result<(), FocusError> {
    manager
        .ensure_running()
        .await
        .map_err(FocusError::daemon_error)
}

/// Stop the daemon sidecar
#[tauri::command]
pub async fn daemon_stop(
    manager: State<'_, DaemonManager>,
) -> Result<(), FocusError> {
    manager
        .shutdown()
        .await
        .map_err(FocusError::daemon_error)
}

/// Get daemon status
#[tauri::command]
pub async fn daemon_status() -> Result<DaemonStatusResponse, FocusError> {
    let status = DaemonClient::get_status().await?;
    Ok(DaemonStatusResponse::from(status))
}

/// Start blocking domains and processes for a session
#[tauri::command]
pub async fn daemon_start_blocking(
    request: StartBlockingRequest,
) -> Result<(), FocusError> {
    let payload = StartBlockingPayload {
        session_id: request.session_id,
        domains: request
            .domains
            .into_iter()
            .map(|d| DomainRule {
                pattern: d.pattern,
            })
            .collect(),
        processes: request
            .processes
            .into_iter()
            .map(|p| ProcessRule {
                name: p.name,
                aliases: p.aliases,
                action: match p.action.as_str() {
                    "kill" => ProcessAction::Kill,
                    _ => ProcessAction::Suspend,
                },
            })
            .collect(),
    };

    let response = DaemonClient::start_blocking(payload).await?;

    if response.success {
        Ok(())
    } else {
        let err = response.error.unwrap_or_default();
        Err(FocusError::daemon_error(format!("[{}] {}", err.code, err.message)))
    }
}

/// Stop blocking for a session
#[tauri::command]
pub async fn daemon_stop_blocking(
    session_id: String,
) -> Result<(), FocusError> {
    let response = DaemonClient::stop_blocking(session_id).await?;

    if response.success {
        Ok(())
    } else {
        let err = response.error.unwrap_or_default();
        Err(FocusError::daemon_error(format!("[{}] {}", err.code, err.message)))
    }
}

/// Health check — returns true if daemon is alive
#[tauri::command]
pub async fn daemon_health_check() -> Result<bool, FocusError> {
    Ok(DaemonClient::health_check().await.unwrap_or(false))
}

/// Process info returned to frontend
#[derive(Debug, Serialize)]
pub struct JsProcessInfo {
    pub pid: u32,
    pub name: String,
}

/// List running processes via the daemon
#[tauri::command]
pub async fn daemon_list_processes() -> Result<Vec<JsProcessInfo>, FocusError> {
    let request = DaemonRequest::new(DaemonCommand::ListProcesses);
    let response = DaemonClient::send(&request).await?;

    if !response.success {
        let err = response.error.unwrap_or_default();
        return Err(FocusError::daemon_error(format!("[{}] {}", err.code, err.message)));
    }

    let data = response
        .data
        .ok_or_else(|| FocusError::daemon_error("Missing process list data"))?;

    let processes: Vec<JsProcessInfo> = match data.get("processes") {
        Some(procs) => serde_json::from_value(procs.clone())
            .map_err(|e| FocusError::daemon_error(format!("Failed to parse processes: {}", e)))?,
        None => Vec::new(),
    };

    Ok(processes)
}
