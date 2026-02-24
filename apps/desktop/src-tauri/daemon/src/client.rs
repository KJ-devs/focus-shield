use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use crate::protocol::{
    DaemonCommand, DaemonRequest, DaemonResponse, DaemonStatus,
    StartBlockingPayload, StopBlockingPayload,
};

/// Client for communicating with the daemon via IPC (named pipe or Unix socket).
///
/// Used by the Tauri app to send commands to the running daemon sidecar.
pub struct DaemonClient;

impl DaemonClient {
    /// Send a request to the daemon and receive a response.
    pub async fn send(request: &DaemonRequest) -> Result<DaemonResponse, ClientError> {
        let json = serde_json::to_string(request)
            .map_err(|e| ClientError::Serialize(e.to_string()))?;

        let response_line = Self::send_raw(&json).await?;

        serde_json::from_str(&response_line)
            .map_err(|e| ClientError::Deserialize(e.to_string()))
    }

    /// Start a blocking session on the daemon.
    pub async fn start_blocking(payload: StartBlockingPayload) -> Result<DaemonResponse, ClientError> {
        let request = DaemonRequest::with_payload(DaemonCommand::StartBlocking, &payload);
        Self::send(&request).await
    }

    /// Stop the active blocking session on the daemon.
    pub async fn stop_blocking(session_id: String) -> Result<DaemonResponse, ClientError> {
        let payload = StopBlockingPayload { session_id };
        let request = DaemonRequest::with_payload(DaemonCommand::StopBlocking, &payload);
        Self::send(&request).await
    }

    /// Get the current daemon status.
    pub async fn get_status() -> Result<DaemonStatus, ClientError> {
        let request = DaemonRequest::new(DaemonCommand::GetStatus);
        let response = Self::send(&request).await?;

        if !response.success {
            let err = response.error.unwrap_or_default();
            return Err(ClientError::DaemonError(err.code, err.message));
        }

        let data = response
            .data
            .ok_or_else(|| ClientError::Deserialize("Missing status data".to_string()))?;

        serde_json::from_value(data).map_err(|e| ClientError::Deserialize(e.to_string()))
    }

    /// Check if the daemon is alive.
    pub async fn health_check() -> Result<bool, ClientError> {
        let request = DaemonRequest::new(DaemonCommand::HealthCheck);
        match Self::send(&request).await {
            Ok(response) => Ok(response.success),
            Err(_) => Ok(false),
        }
    }

    /// Request daemon shutdown.
    pub async fn shutdown() -> Result<DaemonResponse, ClientError> {
        let request = DaemonRequest::new(DaemonCommand::Shutdown);
        Self::send(&request).await
    }

    // --- Platform-specific transport ---

    #[cfg(windows)]
    async fn send_raw(json: &str) -> Result<String, ClientError> {
        use tokio::net::windows::named_pipe::ClientOptions;
        use tokio::time::{timeout, Duration};

        let pipe_name = crate::protocol::PIPE_NAME;

        let client = timeout(Duration::from_secs(5), async {
            loop {
                match ClientOptions::new().open(pipe_name) {
                    Ok(client) => return Ok(client),
                    Err(e) if e.raw_os_error() == Some(231) => {
                        // ERROR_PIPE_BUSY — wait and retry
                        tokio::time::sleep(Duration::from_millis(50)).await;
                    }
                    Err(e) => return Err(ClientError::Connect(format!(
                        "Failed to connect to pipe {}: {}",
                        pipe_name, e
                    ))),
                }
            }
        })
        .await
        .map_err(|_| ClientError::Connect("Connection timeout".to_string()))??;

        let (reader, mut writer) = tokio::io::split(client);
        let mut reader = BufReader::new(reader);

        let mut message = json.to_string();
        message.push('\n');
        writer
            .write_all(message.as_bytes())
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;
        writer
            .flush()
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;

        let mut response_line = String::new();
        reader
            .read_line(&mut response_line)
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;

        Ok(response_line.trim().to_string())
    }

    #[cfg(unix)]
    async fn send_raw(json: &str) -> Result<String, ClientError> {
        use tokio::net::UnixStream;

        let socket_path = crate::protocol::SOCKET_PATH;
        let stream = UnixStream::connect(socket_path)
            .await
            .map_err(|e| ClientError::Connect(format!(
                "Failed to connect to socket {}: {}",
                socket_path, e
            )))?;

        let (reader, mut writer) = tokio::io::split(stream);
        let mut reader = BufReader::new(reader);

        let mut message = json.to_string();
        message.push('\n');
        writer
            .write_all(message.as_bytes())
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;
        writer
            .flush()
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;

        let mut response_line = String::new();
        reader
            .read_line(&mut response_line)
            .await
            .map_err(|e| ClientError::Io(e.to_string()))?;

        Ok(response_line.trim().to_string())
    }
}

/// Default impl for DaemonError to simplify error handling
impl Default for crate::protocol::DaemonError {
    fn default() -> Self {
        Self {
            code: "UNKNOWN".to_string(),
            message: "Unknown error".to_string(),
        }
    }
}

/// Client-side errors
#[derive(Debug)]
pub enum ClientError {
    Connect(String),
    Io(String),
    Serialize(String),
    Deserialize(String),
    DaemonError(String, String),
}

impl std::fmt::Display for ClientError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ClientError::Connect(msg) => write!(f, "Connection error: {}", msg),
            ClientError::Io(msg) => write!(f, "IO error: {}", msg),
            ClientError::Serialize(msg) => write!(f, "Serialization error: {}", msg),
            ClientError::Deserialize(msg) => write!(f, "Deserialization error: {}", msg),
            ClientError::DaemonError(code, msg) => {
                write!(f, "Daemon error [{}]: {}", code, msg)
            }
        }
    }
}

impl std::error::Error for ClientError {}
