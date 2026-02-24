use std::sync::Arc;

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

use crate::handler::{handle_request, DaemonState};
use crate::protocol::{DaemonRequest, DaemonResponse};

/// Start the IPC server on the platform-appropriate transport.
/// Returns when the shutdown signal is received.
pub async fn run_server(state: Arc<DaemonState>) -> Result<(), ServerError> {
    #[cfg(windows)]
    {
        run_named_pipe_server(state).await
    }

    #[cfg(unix)]
    {
        run_unix_socket_server(state).await
    }
}

/// Process a single line-delimited JSON message from a client stream
async fn process_message(
    state: &Arc<DaemonState>,
    line: &str,
) -> String {
    let response = match serde_json::from_str::<DaemonRequest>(line) {
        Ok(request) => handle_request(state, request).await,
        Err(e) => DaemonResponse::err(
            "unknown".to_string(),
            "PARSE_ERROR",
            format!("Failed to parse request: {}", e),
        ),
    };

    // Serialize response — should never fail for our types
    serde_json::to_string(&response).unwrap_or_else(|e| {
        format!(
            r#"{{"id":"unknown","success":false,"error":{{"code":"SERIALIZE_ERROR","message":"{}"}}}}"#,
            e
        )
    })
}

// ---- Windows: Named Pipe Server ----

#[cfg(windows)]
async fn run_named_pipe_server(state: Arc<DaemonState>) -> Result<(), ServerError> {
    use tokio::net::windows::named_pipe::{ServerOptions, PipeMode};

    let pipe_name = crate::protocol::PIPE_NAME;
    log::info!("Starting named pipe server at {}", pipe_name);

    loop {
        // Create a new pipe instance for each connection
        let server = ServerOptions::new()
            .pipe_mode(PipeMode::Byte)
            .first_pipe_instance(false)
            .create(pipe_name)
            .map_err(|e| ServerError::Bind(format!("Failed to create named pipe: {}", e)))?;

        // Wait for a client to connect, or shutdown
        tokio::select! {
            result = server.connect() => {
                match result {
                    Ok(()) => {
                        let state = state.clone();
                        tokio::spawn(async move {
                            if let Err(e) = handle_pipe_client(state, server).await {
                                log::warn!("Pipe client error: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        log::error!("Failed to accept pipe connection: {}", e);
                    }
                }
            }
            _ = state.shutdown_signal.notified() => {
                log::info!("Shutdown signal received, stopping server");
                break;
            }
        }
    }

    Ok(())
}

#[cfg(windows)]
async fn handle_pipe_client(
    state: Arc<DaemonState>,
    pipe: tokio::net::windows::named_pipe::NamedPipeServer,
) -> Result<(), ServerError> {
    let (reader, mut writer) = tokio::io::split(pipe);
    let mut reader = BufReader::new(reader);
    let mut line = String::new();

    loop {
        line.clear();
        let bytes_read = reader
            .read_line(&mut line)
            .await
            .map_err(|e| ServerError::Io(e.to_string()))?;

        if bytes_read == 0 {
            break; // Client disconnected
        }

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let response = process_message(&state, trimmed).await;
        writer
            .write_all(response.as_bytes())
            .await
            .map_err(|e| ServerError::Io(e.to_string()))?;
        writer
            .write_all(b"\n")
            .await
            .map_err(|e| ServerError::Io(e.to_string()))?;
        writer
            .flush()
            .await
            .map_err(|e| ServerError::Io(e.to_string()))?;
    }

    Ok(())
}

// ---- Unix: Unix Socket Server ----

#[cfg(unix)]
async fn run_unix_socket_server(state: Arc<DaemonState>) -> Result<(), ServerError> {
    use tokio::net::UnixListener;

    let socket_path = crate::protocol::SOCKET_PATH;

    // Remove stale socket file if it exists
    let _ = std::fs::remove_file(socket_path);

    let listener = UnixListener::bind(socket_path)
        .map_err(|e| ServerError::Bind(format!("Failed to bind Unix socket: {}", e)))?;

    log::info!("Starting Unix socket server at {}", socket_path);

    loop {
        tokio::select! {
            result = listener.accept() => {
                match result {
                    Ok((stream, _addr)) => {
                        let state = state.clone();
                        tokio::spawn(async move {
                            if let Err(e) = handle_unix_client(state, stream).await {
                                log::warn!("Unix client error: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        log::error!("Failed to accept Unix connection: {}", e);
                    }
                }
            }
            _ = state.shutdown_signal.notified() => {
                log::info!("Shutdown signal received, stopping server");
                break;
            }
        }
    }

    // Cleanup socket file
    let _ = std::fs::remove_file(socket_path);

    Ok(())
}

#[cfg(unix)]
async fn handle_unix_client(
    state: Arc<DaemonState>,
    stream: tokio::net::UnixStream,
) -> Result<(), ServerError> {
    let (reader, mut writer) = tokio::io::split(stream);
    let mut reader = BufReader::new(reader);
    let mut line = String::new();

    loop {
        line.clear();
        let bytes_read = reader
            .read_line(&mut line)
            .await
            .map_err(|e| ServerError::Io(e.to_string()))?;

        if bytes_read == 0 {
            break; // Client disconnected
        }

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let response = process_message(&state, trimmed).await;
        writer
            .write_all(response.as_bytes())
            .await
            .map_err(|e| ServerError::Io(e.to_string()))?;
        writer
            .write_all(b"\n")
            .await
            .map_err(|e| ServerError::Io(e.to_string()))?;
        writer
            .flush()
            .await
            .map_err(|e| ServerError::Io(e.to_string()))?;
    }

    Ok(())
}

/// Server errors
#[derive(Debug)]
pub enum ServerError {
    Bind(String),
    Io(String),
}

impl std::fmt::Display for ServerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ServerError::Bind(msg) => write!(f, "Bind error: {}", msg),
            ServerError::Io(msg) => write!(f, "IO error: {}", msg),
        }
    }
}

impl std::error::Error for ServerError {}
