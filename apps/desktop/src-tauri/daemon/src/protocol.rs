use serde::{Deserialize, Serialize};

/// Pipe/socket names for daemon IPC
pub const PIPE_NAME: &str = r"\\.\pipe\focus-shield-daemon";
pub const SOCKET_PATH: &str = "/tmp/focus-shield-daemon.sock";

/// Daemon protocol version
pub const PROTOCOL_VERSION: &str = "1.0.0";

/// Commands the daemon can handle
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DaemonCommand {
    StartBlocking,
    StopBlocking,
    GetStatus,
    HealthCheck,
    Shutdown,
    ListProcesses,
    GetExtensionStatus,
}

/// Process blocking action
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProcessAction {
    Kill,
    Suspend,
}

/// Domain rule for blocking
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DomainRule {
    pub pattern: String,
}

/// Process rule for blocking
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProcessRule {
    pub name: String,
    pub aliases: Vec<String>,
    pub action: ProcessAction,
}

/// Payload for start_blocking command
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StartBlockingPayload {
    pub session_id: String,
    pub domains: Vec<DomainRule>,
    pub processes: Vec<ProcessRule>,
}

/// Payload for stop_blocking command
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StopBlockingPayload {
    pub session_id: String,
}

/// Generic request envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonRequest {
    pub id: String,
    pub command: DaemonCommand,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
}

/// Error in daemon response
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DaemonError {
    pub code: String,
    pub message: String,
}

/// Daemon status information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DaemonStatus {
    pub running: bool,
    pub active_session_id: Option<String>,
    pub blocked_domain_count: u32,
    pub blocked_process_count: u32,
    pub uptime_seconds: u64,
    pub pid: u32,
    pub version: String,
}

/// Generic response envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonResponse {
    pub id: String,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<DaemonError>,
}

impl DaemonResponse {
    pub fn ok(id: String) -> Self {
        Self {
            id,
            success: true,
            data: None,
            error: None,
        }
    }

    pub fn ok_with_data(id: String, data: impl Serialize) -> Self {
        Self {
            id,
            success: true,
            data: serde_json::to_value(data).ok(),
            error: None,
        }
    }

    pub fn err(id: String, code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            id,
            success: false,
            data: None,
            error: Some(DaemonError {
                code: code.into(),
                message: message.into(),
            }),
        }
    }
}

impl DaemonRequest {
    pub fn new(command: DaemonCommand) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            command,
            payload: None,
        }
    }

    pub fn with_payload(command: DaemonCommand, payload: impl Serialize) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            command,
            payload: serde_json::to_value(payload).ok(),
        }
    }

    /// Deserialize the payload into a specific type
    pub fn parse_payload<T: for<'de> Deserialize<'de>>(&self) -> Result<T, DaemonError> {
        match &self.payload {
            Some(value) => serde_json::from_value(value.clone()).map_err(|e| DaemonError {
                code: "INVALID_PAYLOAD".to_string(),
                message: format!("Failed to parse payload: {}", e),
            }),
            None => Err(DaemonError {
                code: "MISSING_PAYLOAD".to_string(),
                message: "Command requires a payload".to_string(),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_serialize_request_roundtrip() {
        let payload = StartBlockingPayload {
            session_id: "test-session".to_string(),
            domains: vec![DomainRule {
                pattern: "*.reddit.com".to_string(),
            }],
            processes: vec![ProcessRule {
                name: "discord".to_string(),
                aliases: vec!["Discord.exe".to_string()],
                action: ProcessAction::Suspend,
            }],
        };

        let request = DaemonRequest::with_payload(DaemonCommand::StartBlocking, &payload);
        let json = serde_json::to_string(&request).unwrap();
        let parsed: DaemonRequest = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.command, DaemonCommand::StartBlocking);
        let parsed_payload: StartBlockingPayload = parsed.parse_payload().unwrap();
        assert_eq!(parsed_payload.session_id, "test-session");
        assert_eq!(parsed_payload.domains.len(), 1);
        assert_eq!(parsed_payload.processes.len(), 1);
    }

    #[test]
    fn should_serialize_response_ok() {
        let response = DaemonResponse::ok("req-1".to_string());
        let json = serde_json::to_string(&response).unwrap();
        let parsed: DaemonResponse = serde_json::from_str(&json).unwrap();

        assert!(parsed.success);
        assert!(parsed.error.is_none());
    }

    #[test]
    fn should_serialize_response_with_status() {
        let status = DaemonStatus {
            running: true,
            active_session_id: Some("session-1".to_string()),
            blocked_domain_count: 5,
            blocked_process_count: 2,
            uptime_seconds: 3600,
            pid: 12345,
            version: PROTOCOL_VERSION.to_string(),
        };

        let response = DaemonResponse::ok_with_data("req-2".to_string(), &status);
        let json = serde_json::to_string(&response).unwrap();
        let parsed: DaemonResponse = serde_json::from_str(&json).unwrap();

        assert!(parsed.success);
        let parsed_status: DaemonStatus =
            serde_json::from_value(parsed.data.unwrap()).unwrap();
        assert_eq!(parsed_status.blocked_domain_count, 5);
        assert_eq!(parsed_status.pid, 12345);
    }

    #[test]
    fn should_serialize_response_error() {
        let response = DaemonResponse::err(
            "req-3".to_string(),
            "SESSION_NOT_FOUND",
            "No active session",
        );
        let json = serde_json::to_string(&response).unwrap();
        let parsed: DaemonResponse = serde_json::from_str(&json).unwrap();

        assert!(!parsed.success);
        let err = parsed.error.unwrap();
        assert_eq!(err.code, "SESSION_NOT_FOUND");
    }

    #[test]
    fn should_fail_parse_payload_when_missing() {
        let request = DaemonRequest::new(DaemonCommand::StartBlocking);
        let result: Result<StartBlockingPayload, _> = request.parse_payload();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().code, "MISSING_PAYLOAD");
    }
}
