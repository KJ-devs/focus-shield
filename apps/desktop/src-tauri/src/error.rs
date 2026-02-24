use serde::Serialize;

/// Centralized error type for the Tauri app.
/// Serializes to a structured JSON error for the frontend.
#[derive(Debug, Serialize)]
pub struct FocusError {
    pub code: String,
    pub message: String,
}

impl FocusError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }

    pub fn daemon_not_running() -> Self {
        Self::new(
            "DAEMON_NOT_RUNNING",
            "The Focus Shield daemon is not running. Try restarting the app.",
        )
    }

    pub fn daemon_error(msg: impl Into<String>) -> Self {
        Self::new("DAEMON_ERROR", msg)
    }

    pub fn internal(msg: impl Into<String>) -> Self {
        Self::new("INTERNAL_ERROR", msg)
    }
}

impl std::fmt::Display for FocusError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for FocusError {}

impl From<focus_shield_daemon::client::ClientError> for FocusError {
    fn from(err: focus_shield_daemon::client::ClientError) -> Self {
        match err {
            focus_shield_daemon::client::ClientError::Connect(_) => Self::daemon_not_running(),
            _ => Self::daemon_error(err.to_string()),
        }
    }
}
