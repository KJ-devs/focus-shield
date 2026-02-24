use std::sync::Arc;

use tokio::sync::RwLock;
use tokio::time::{interval, Duration};

use crate::process_monitor::ProcessMonitor;
use crate::protocol::ProcessRule;

/// Default watcher scan interval in milliseconds
pub const DEFAULT_SCAN_INTERVAL_MS: u64 = 2000;

/// State shared between the watcher task and the handler
pub struct WatcherState {
    /// Active process rules to enforce
    rules: Vec<ProcessRule>,
    /// Whether the watcher should be actively scanning
    active: bool,
    /// The process monitor instance
    monitor: ProcessMonitor,
    /// Stats: total number of processes blocked since session start
    pub total_blocked: u32,
    /// Stats: total number of respawn blocks
    pub respawn_blocks: u32,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            rules: Vec::new(),
            active: false,
            monitor: ProcessMonitor::new(),
            total_blocked: 0,
            respawn_blocks: 0,
        }
    }

    /// Start watching with the given process rules.
    /// Immediately enforces rules on first call.
    pub fn start(&mut self, rules: Vec<ProcessRule>) -> Vec<crate::process_monitor::BlockActionResult> {
        self.rules = rules;
        self.active = true;
        self.total_blocked = 0;
        self.respawn_blocks = 0;

        // Enforce immediately
        let results = self.monitor.enforce_rules(&self.rules);
        self.total_blocked += results.iter().filter(|r| r.success).count() as u32;
        results
    }

    /// Stop watching. Resumes all suspended processes.
    pub fn stop(&mut self) -> Vec<crate::process_monitor::BlockActionResult> {
        self.active = false;
        self.rules.clear();
        self.monitor.resume_all()
    }

    /// Perform one scan cycle: check for new/respawned processes and enforce rules
    pub fn scan(&mut self) -> Vec<crate::process_monitor::BlockActionResult> {
        if !self.active || self.rules.is_empty() {
            return Vec::new();
        }

        let results = self.monitor.enforce_rules(&self.rules);
        let blocked_count = results.iter().filter(|r| r.success).count() as u32;

        if blocked_count > 0 {
            self.respawn_blocks += blocked_count;
            self.total_blocked += blocked_count;
            log::info!(
                "Anti-respawn: blocked {} process(es) (total respawn blocks: {})",
                blocked_count,
                self.respawn_blocks
            );
        }

        results
    }

    /// Get current rules count
    pub fn rules_count(&self) -> usize {
        self.rules.len()
    }

    /// Check if watcher is active
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// List all running processes (delegates to monitor)
    pub fn list_processes(&mut self) -> Vec<crate::process_monitor::ProcessInfo> {
        self.monitor.list_processes()
    }
}

/// Run the anti-respawn watcher loop.
/// Periodically scans for blocked processes that have respawned and re-blocks them.
///
/// This function runs indefinitely until the cancel token is notified.
pub async fn run_watcher(
    state: Arc<RwLock<WatcherState>>,
    cancel: Arc<tokio::sync::Notify>,
    scan_interval_ms: u64,
) {
    let mut tick = interval(Duration::from_millis(scan_interval_ms));

    log::info!(
        "Process watcher started (scan interval: {}ms)",
        scan_interval_ms
    );

    loop {
        tokio::select! {
            _ = tick.tick() => {
                let mut watcher = state.write().await;
                if !watcher.is_active() {
                    continue;
                }
                watcher.scan();
            }
            _ = cancel.notified() => {
                log::info!("Process watcher stopped");
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::{ProcessAction, ProcessRule};

    #[test]
    fn should_create_inactive_watcher() {
        let state = WatcherState::new();
        assert!(!state.is_active());
        assert_eq!(state.rules_count(), 0);
        assert_eq!(state.total_blocked, 0);
        assert_eq!(state.respawn_blocks, 0);
    }

    #[test]
    fn should_activate_on_start() {
        let mut state = WatcherState::new();
        let rules = vec![ProcessRule {
            name: "nonexistent-test-process".to_string(),
            aliases: vec![],
            action: ProcessAction::Kill,
        }];

        state.start(rules);

        assert!(state.is_active());
        assert_eq!(state.rules_count(), 1);
    }

    #[test]
    fn should_deactivate_on_stop() {
        let mut state = WatcherState::new();
        state.start(vec![ProcessRule {
            name: "nonexistent-test-process".to_string(),
            aliases: vec![],
            action: ProcessAction::Kill,
        }]);
        assert!(state.is_active());

        state.stop();

        assert!(!state.is_active());
        assert_eq!(state.rules_count(), 0);
    }

    #[test]
    fn should_not_block_nonexistent_processes() {
        let mut state = WatcherState::new();
        let rules = vec![ProcessRule {
            name: "this-process-definitely-does-not-exist-xyz-12345".to_string(),
            aliases: vec![],
            action: ProcessAction::Kill,
        }];

        let results = state.start(rules);
        assert!(results.is_empty());
        assert_eq!(state.total_blocked, 0);
    }

    #[test]
    fn should_scan_without_active_rules() {
        let mut state = WatcherState::new();
        let results = state.scan();
        assert!(results.is_empty());
    }

    #[test]
    fn should_list_processes() {
        let mut state = WatcherState::new();
        let processes = state.list_processes();
        // Should find at least the current process
        assert!(!processes.is_empty());
    }

    #[tokio::test]
    async fn should_stop_watcher_on_cancel() {
        let state = Arc::new(RwLock::new(WatcherState::new()));
        let cancel = Arc::new(tokio::sync::Notify::new());

        let state_clone = state.clone();
        let cancel_clone = cancel.clone();

        let handle = tokio::spawn(async move {
            run_watcher(state_clone, cancel_clone, 100).await;
        });

        // Let it tick a couple of times
        tokio::time::sleep(Duration::from_millis(300)).await;

        // Cancel the watcher
        cancel.notify_one();

        // Should complete without hanging
        tokio::time::timeout(Duration::from_secs(2), handle)
            .await
            .expect("Watcher did not stop within timeout")
            .expect("Watcher task panicked");
    }
}
