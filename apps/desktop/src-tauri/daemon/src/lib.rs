pub mod protocol;
pub mod handler;
pub mod server;
pub mod client;
pub mod process_monitor;
pub mod process_watcher;
pub mod hosts_manager;
pub mod privilege;
pub mod ws_server;

pub use client::DaemonClient;
pub use protocol::{
    DaemonCommand, DaemonRequest, DaemonResponse, DaemonStatus,
    DaemonError, DomainRule, ProcessRule, ProcessAction,
    StartBlockingPayload, StopBlockingPayload,
    PIPE_NAME, SOCKET_PATH, PROTOCOL_VERSION,
};
pub use server::run_server;
pub use handler::DaemonState;
pub use process_monitor::{ProcessInfo, BlockActionResult, ProcessMonitor};
pub use process_watcher::WatcherState;
pub use hosts_manager::HostsManager;
pub use privilege::{is_elevated, can_write_hosts};
pub use ws_server::{WsState, run_ws_server, WS_PORT};
