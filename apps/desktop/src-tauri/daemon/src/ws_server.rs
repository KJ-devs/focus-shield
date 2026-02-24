use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::RwLock;
use tokio_tungstenite::tungstenite::Message;

use crate::handler::DaemonState;
use crate::protocol::PROTOCOL_VERSION;

/// Default WebSocket port for extension communication.
pub const WS_PORT: u16 = 7532;

// --- Extension → Desktop message types ---

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ExtensionMessage {
    #[serde(rename = "ext:hello")]
    Hello {
        #[serde(rename = "extensionId")]
        extension_id: String,
        browser: String,
        version: String,
        #[serde(rename = "incognitoAllowed")]
        incognito_allowed: bool,
    },
    #[serde(rename = "ext:status_request")]
    StatusRequest,
    #[serde(rename = "ext:distraction_report")]
    DistractionReport {
        domain: String,
        timestamp: String,
    },
    #[serde(rename = "ext:blocking_confirmed")]
    BlockingConfirmed {
        #[serde(rename = "ruleCount")]
        rule_count: u32,
    },
    #[serde(rename = "ext:incognito_status")]
    IncognitoStatus {
        allowed: bool,
    },
}

// --- Desktop → Extension message types ---

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DesktopMessage {
    #[serde(rename = "desktop:welcome")]
    Welcome {
        #[serde(rename = "daemonVersion")]
        daemon_version: String,
        #[serde(rename = "activeSessionId")]
        active_session_id: Option<String>,
    },
    #[serde(rename = "desktop:start_blocking")]
    StartBlocking {
        #[serde(rename = "sessionId")]
        session_id: String,
        domains: Vec<String>,
        #[serde(rename = "endTime")]
        end_time: Option<String>,
    },
    #[serde(rename = "desktop:stop_blocking")]
    StopBlocking {
        #[serde(rename = "sessionId")]
        session_id: String,
    },
    #[serde(rename = "desktop:status")]
    Status {
        running: bool,
        #[serde(rename = "activeSessionId")]
        active_session_id: Option<String>,
        #[serde(rename = "blockedDomainCount")]
        blocked_domain_count: u32,
        #[serde(rename = "blockedProcessCount")]
        blocked_process_count: u32,
        #[serde(rename = "uptimeSeconds")]
        uptime_seconds: u64,
    },
    #[serde(rename = "desktop:incognito_warning")]
    IncognitoWarning {
        message: String,
    },
}

/// Info about a connected extension.
#[derive(Debug, Clone, Serialize)]
pub struct ExtensionConnectionInfo {
    pub extension_id: String,
    pub browser: String,
    pub version: String,
    pub connected_at: String,
    pub incognito_allowed: bool,
    pub addr: String,
}

/// Shared state for the WebSocket server.
pub struct WsState {
    pub connections: RwLock<HashMap<SocketAddr, ExtensionConnectionInfo>>,
}

impl WsState {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            connections: RwLock::new(HashMap::new()),
        })
    }

    /// Get the number of connected extensions.
    pub async fn connection_count(&self) -> usize {
        self.connections.read().await.len()
    }

    /// Get info about all connected extensions.
    pub async fn get_connections(&self) -> Vec<ExtensionConnectionInfo> {
        self.connections.read().await.values().cloned().collect()
    }
}

/// Run the WebSocket server for extension communication.
pub async fn run_ws_server(
    daemon_state: Arc<DaemonState>,
    ws_state: Arc<WsState>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let addr = format!("127.0.0.1:{}", WS_PORT);
    let listener = TcpListener::bind(&addr).await?;

    log::info!("Extension WebSocket server listening on ws://{}", addr);

    loop {
        tokio::select! {
            accept_result = listener.accept() => {
                match accept_result {
                    Ok((stream, addr)) => {
                        let daemon_state = daemon_state.clone();
                        let ws_state = ws_state.clone();
                        tokio::spawn(async move {
                            if let Err(e) = handle_connection(stream, addr, daemon_state, ws_state).await {
                                log::debug!("WebSocket connection {} ended: {}", addr, e);
                            }
                        });
                    }
                    Err(e) => {
                        log::warn!("Failed to accept WebSocket connection: {}", e);
                    }
                }
            }
            _ = daemon_state.shutdown_signal.notified() => {
                log::info!("WebSocket server shutting down");
                break;
            }
        }
    }

    Ok(())
}

async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    daemon_state: Arc<DaemonState>,
    ws_state: Arc<WsState>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ws_stream = tokio_tungstenite::accept_async(stream).await?;
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    log::info!("Extension connected from {}", addr);

    // Subscribe to broadcasts from daemon (start/stop blocking events)
    let mut broadcast_rx = daemon_state.extension_broadcast.subscribe();

    loop {
        tokio::select! {
            // Incoming message from extension
            msg = ws_receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        match serde_json::from_str::<ExtensionMessage>(&text) {
                            Ok(ext_msg) => {
                                let response = handle_extension_message(
                                    ext_msg, addr, &daemon_state, &ws_state
                                ).await;
                                if let Some(resp) = response {
                                    let json = serde_json::to_string(&resp)?;
                                    ws_sender.send(Message::Text(json.into())).await?;
                                }
                            }
                            Err(e) => {
                                log::warn!("Invalid message from {}: {}", addr, e);
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        break;
                    }
                    Some(Ok(Message::Ping(data))) => {
                        ws_sender.send(Message::Pong(data)).await?;
                    }
                    Some(Err(e)) => {
                        log::debug!("WebSocket error from {}: {}", addr, e);
                        break;
                    }
                    _ => {}
                }
            }
            // Broadcast message from daemon to all extensions
            broadcast = broadcast_rx.recv() => {
                if let Ok(json) = broadcast {
                    if ws_sender.send(Message::Text(json.into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }

    // Cleanup on disconnect — remove from both WsState and DaemonState
    let removed_ext_id = {
        let mut conns = ws_state.connections.write().await;
        conns.remove(&addr).map(|info| info.extension_id)
    };
    if let Some(ext_id) = &removed_ext_id {
        let mut exts = daemon_state.extensions.write().await;
        exts.retain(|e| e.extension_id != *ext_id);
    }
    log::info!(
        "Extension disconnected from {} ({} remaining)",
        addr,
        ws_state.connection_count().await
    );

    Ok(())
}

async fn handle_extension_message(
    msg: ExtensionMessage,
    addr: SocketAddr,
    daemon_state: &Arc<DaemonState>,
    ws_state: &Arc<WsState>,
) -> Option<DesktopMessage> {
    match msg {
        ExtensionMessage::Hello {
            extension_id,
            browser,
            version,
            incognito_allowed,
        } => {
            log::info!(
                "Extension hello: id={}, browser={}, version={}, incognito={}",
                extension_id, browser, version, incognito_allowed
            );

            // Track the connection in WsState (for WebSocket layer)
            let info = ExtensionConnectionInfo {
                extension_id: extension_id.clone(),
                browser: browser.clone(),
                version: version.clone(),
                connected_at: chrono::Utc::now().to_rfc3339(),
                incognito_allowed,
                addr: addr.to_string(),
            };
            ws_state.connections.write().await.insert(addr, info);

            // Also track in DaemonState (for IPC queries)
            {
                use crate::handler::ExtensionInfo;
                let ext_info = ExtensionInfo {
                    extension_id,
                    browser,
                    version,
                    connected_at: chrono::Utc::now().to_rfc3339(),
                    incognito_allowed,
                };
                daemon_state.extensions.write().await.push(ext_info);
            }

            // Send welcome with current state
            let blocking = daemon_state.blocking.read().await;
            let active_session = blocking.active_session_id.clone();
            drop(blocking);

            // Warn if incognito not allowed
            if !incognito_allowed {
                let warning = DesktopMessage::IncognitoWarning {
                    message: "Focus Shield cannot block sites in incognito mode. \
                              Please enable incognito access in extension settings."
                        .to_string(),
                };
                if let Ok(json) = serde_json::to_string(&warning) {
                    let _ = daemon_state.extension_broadcast.send(json);
                }
            }

            Some(DesktopMessage::Welcome {
                daemon_version: PROTOCOL_VERSION.to_string(),
                active_session_id: active_session,
            })
        }

        ExtensionMessage::StatusRequest => {
            let blocking = daemon_state.blocking.read().await;
            Some(DesktopMessage::Status {
                running: true,
                active_session_id: blocking.active_session_id.clone(),
                blocked_domain_count: blocking.blocked_domains.len() as u32,
                blocked_process_count: blocking.blocked_processes.len() as u32,
                uptime_seconds: daemon_state.uptime_seconds(),
            })
        }

        ExtensionMessage::DistractionReport { domain, timestamp } => {
            log::info!(
                "Distraction blocked by extension: {} at {}",
                domain, timestamp
            );
            // Distraction counting is tracked by the extension.
            // Future: aggregate in daemon stats.
            None
        }

        ExtensionMessage::BlockingConfirmed { rule_count } => {
            log::info!("Extension confirmed {} blocking rules applied", rule_count);
            None
        }

        ExtensionMessage::IncognitoStatus { allowed } => {
            log::info!("Extension incognito status: {}", allowed);
            // Update connection info
            let mut conns = ws_state.connections.write().await;
            if let Some(info) = conns.get_mut(&addr) {
                info.incognito_allowed = allowed;
            }
            None
        }
    }
}
