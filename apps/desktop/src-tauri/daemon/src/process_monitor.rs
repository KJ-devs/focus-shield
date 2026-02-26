use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use sysinfo::{System, Pid, ProcessesToUpdate, ProcessRefreshKind, RefreshKind};

use crate::protocol::{ProcessAction, ProcessRule};

/// Information about a running process discovered by the monitor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
}

/// Result of a blocking action on a single process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockActionResult {
    pub pid: u32,
    pub name: String,
    pub action: ProcessAction,
    pub success: bool,
    pub error: Option<String>,
}

/// Tracks which processes we've suspended so we can resume them later
#[derive(Debug, Default)]
pub struct SuspendedProcesses {
    /// pid -> process name
    entries: HashMap<u32, String>,
}

impl SuspendedProcesses {
    pub fn add(&mut self, pid: u32, name: String) {
        self.entries.insert(pid, name);
    }

    pub fn remove(&mut self, pid: &u32) -> Option<String> {
        self.entries.remove(pid)
    }

    pub fn list(&self) -> Vec<(u32, &str)> {
        self.entries.iter().map(|(pid, name)| (*pid, name.as_str())).collect()
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

/// Cross-platform process monitor.
/// Uses `sysinfo` for process enumeration and platform-specific APIs for suspend/resume/kill.
pub struct ProcessMonitor {
    system: System,
    suspended: SuspendedProcesses,
}

impl ProcessMonitor {
    pub fn new() -> Self {
        Self {
            system: System::new_with_specifics(
                RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
            ),
            suspended: SuspendedProcesses::default(),
        }
    }

    /// Refresh the process list from the OS
    pub fn refresh(&mut self) {
        self.system.refresh_processes(ProcessesToUpdate::All, true);
    }

    /// List all running processes
    pub fn list_processes(&mut self) -> Vec<ProcessInfo> {
        self.refresh();
        self.system
            .processes()
            .iter()
            .map(|(pid, proc)| ProcessInfo {
                pid: pid.as_u32(),
                name: proc.name().to_string_lossy().to_string(),
            })
            .collect()
    }

    /// Find running processes that match the given rules.
    /// Returns tuples of (ProcessInfo, matching rule index).
    pub fn find_matching(&mut self, rules: &[ProcessRule]) -> Vec<(ProcessInfo, usize)> {
        self.refresh();

        let mut matches = Vec::new();

        for (pid, proc) in self.system.processes() {
            let proc_name = proc.name().to_string_lossy().to_string();
            let proc_name_lower = proc_name.to_lowercase();
            let pid_u32 = pid.as_u32();

            // Skip our own process
            if pid_u32 == std::process::id() {
                continue;
            }

            for (rule_idx, rule) in rules.iter().enumerate() {
                if matches_rule(&proc_name_lower, rule) {
                    matches.push((
                        ProcessInfo {
                            pid: pid_u32,
                            name: proc_name.clone(),
                        },
                        rule_idx,
                    ));
                    break; // First matching rule wins
                }
            }
        }

        matches
    }

    /// Enforce blocking rules: suspend or kill matching processes.
    /// Returns results for each action taken.
    pub fn enforce_rules(&mut self, rules: &[ProcessRule]) -> Vec<BlockActionResult> {
        let matching = self.find_matching(rules);
        let mut results = Vec::new();

        for (proc_info, rule_idx) in matching {
            let rule = &rules[rule_idx];
            let result = match rule.action {
                ProcessAction::Suspend => {
                    let res = platform::suspend_process(proc_info.pid);
                    if res.is_ok() {
                        self.suspended.add(proc_info.pid, proc_info.name.clone());
                    }
                    res
                }
                ProcessAction::Kill => platform::kill_process(proc_info.pid),
            };

            results.push(BlockActionResult {
                pid: proc_info.pid,
                name: proc_info.name,
                action: rule.action.clone(),
                success: result.is_ok(),
                error: result.err().map(|e| e.to_string()),
            });
        }

        results
    }

    /// Resume all previously suspended processes.
    /// Called when blocking is stopped.
    pub fn resume_all(&mut self) -> Vec<BlockActionResult> {
        let suspended_list: Vec<(u32, String)> = self
            .suspended
            .list()
            .into_iter()
            .map(|(pid, name)| (pid, name.to_string()))
            .collect();

        let mut results = Vec::new();

        for (pid, name) in suspended_list {
            let result = platform::resume_process(pid);
            results.push(BlockActionResult {
                pid,
                name,
                action: ProcessAction::Suspend, // was suspended, now resuming
                success: result.is_ok(),
                error: result.err().map(|e| e.to_string()),
            });
        }

        self.suspended.clear();
        results
    }

    /// Get the list of currently suspended PIDs
    pub fn suspended_pids(&self) -> &SuspendedProcesses {
        &self.suspended
    }
}

/// Check if a process name (lowercased) matches a rule
fn matches_rule(proc_name_lower: &str, rule: &ProcessRule) -> bool {
    // Match against rule name (case-insensitive)
    if proc_name_lower == rule.name.to_lowercase() {
        return true;
    }

    // Match against aliases (case-insensitive)
    for alias in &rule.aliases {
        if proc_name_lower == alias.to_lowercase() {
            return true;
        }
    }

    // On Windows, also try without .exe extension
    #[cfg(windows)]
    {
        let without_exe = proc_name_lower.strip_suffix(".exe").unwrap_or(proc_name_lower);
        if without_exe == rule.name.to_lowercase() {
            return true;
        }
        for alias in &rule.aliases {
            let alias_lower = alias.to_lowercase();
            let alias_without_exe = alias_lower.strip_suffix(".exe").unwrap_or(&alias_lower);
            if without_exe == alias_without_exe {
                return true;
            }
        }
    }

    false
}

/// Process operation errors
#[derive(Debug)]
pub struct ProcessError {
    pub pid: u32,
    pub message: String,
}

impl std::fmt::Display for ProcessError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Process {} error: {}", self.pid, self.message)
    }
}

impl std::error::Error for ProcessError {}

// ---- Platform-specific implementations ----

mod platform {
    use super::ProcessError;

    /// Kill a process by PID (cross-platform via sysinfo)
    pub fn kill_process(pid: u32) -> Result<(), ProcessError> {
        use sysinfo::{Pid, System, ProcessesToUpdate, ProcessRefreshKind, RefreshKind, Signal};

        let mut sys = System::new_with_specifics(
            RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
        );
        sys.refresh_processes(ProcessesToUpdate::Some(&[Pid::from_u32(pid)]), true);

        if let Some(process) = sys.process(Pid::from_u32(pid)) {
            if process.kill_with(Signal::Kill).unwrap_or(false) {
                log::info!("Killed process {} (PID: {})", process.name().to_string_lossy(), pid);
                Ok(())
            } else {
                Err(ProcessError {
                    pid,
                    message: "Failed to kill process (permission denied or process exited)".to_string(),
                })
            }
        } else {
            // Process no longer exists — not an error
            Ok(())
        }
    }

    /// Suspend a process (platform-specific)
    #[cfg(windows)]
    pub fn suspend_process(pid: u32) -> Result<(), ProcessError> {
        windows::suspend_process(pid)
    }

    #[cfg(unix)]
    pub fn suspend_process(pid: u32) -> Result<(), ProcessError> {
        unix::suspend_process(pid)
    }

    /// Resume a process (platform-specific)
    #[cfg(windows)]
    pub fn resume_process(pid: u32) -> Result<(), ProcessError> {
        windows::resume_process(pid)
    }

    #[cfg(unix)]
    pub fn resume_process(pid: u32) -> Result<(), ProcessError> {
        unix::resume_process(pid)
    }

    // ---- Windows implementation ----

    #[cfg(windows)]
    mod windows {
        use super::ProcessError;
        use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
        use windows_sys::Win32::System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Thread32First, Thread32Next, TH32CS_SNAPTHREAD, THREADENTRY32,
        };
        use windows_sys::Win32::System::Threading::{
            OpenThread, ResumeThread, SuspendThread, THREAD_SUSPEND_RESUME,
        };

        /// Suspend all threads of a process on Windows
        pub fn suspend_process(pid: u32) -> Result<(), ProcessError> {
            let thread_ids = get_thread_ids(pid)?;

            for tid in &thread_ids {
                unsafe {
                    let handle = OpenThread(THREAD_SUSPEND_RESUME, 0, *tid);
                    if handle == std::ptr::null_mut() {
                        log::warn!("Failed to open thread {} of process {}", tid, pid);
                        continue;
                    }

                    let result = SuspendThread(handle);
                    CloseHandle(handle);

                    if result == u32::MAX {
                        log::warn!("Failed to suspend thread {} of process {}", tid, pid);
                    }
                }
            }

            log::info!("Suspended process {} ({} threads)", pid, thread_ids.len());
            Ok(())
        }

        /// Resume all threads of a process on Windows
        pub fn resume_process(pid: u32) -> Result<(), ProcessError> {
            let thread_ids = get_thread_ids(pid)?;

            for tid in &thread_ids {
                unsafe {
                    let handle = OpenThread(THREAD_SUSPEND_RESUME, 0, *tid);
                    if handle == std::ptr::null_mut() {
                        continue;
                    }

                    ResumeThread(handle);
                    CloseHandle(handle);
                }
            }

            log::info!("Resumed process {} ({} threads)", pid, thread_ids.len());
            Ok(())
        }

        /// Get all thread IDs for a given process ID
        fn get_thread_ids(pid: u32) -> Result<Vec<u32>, ProcessError> {
            let mut thread_ids = Vec::new();

            unsafe {
                let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
                if snapshot == INVALID_HANDLE_VALUE {
                    return Err(ProcessError {
                        pid,
                        message: "Failed to create thread snapshot".to_string(),
                    });
                }

                let mut entry: THREADENTRY32 = std::mem::zeroed();
                entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

                if Thread32First(snapshot, &mut entry) != 0 {
                    loop {
                        if entry.th32OwnerProcessID == pid {
                            thread_ids.push(entry.th32ThreadID);
                        }
                        if Thread32Next(snapshot, &mut entry) == 0 {
                            break;
                        }
                    }
                }

                CloseHandle(snapshot);
            }

            Ok(thread_ids)
        }
    }

    // ---- Unix implementation ----

    #[cfg(unix)]
    mod unix {
        use super::ProcessError;

        /// Send SIGSTOP to suspend a process on Unix
        pub fn suspend_process(pid: u32) -> Result<(), ProcessError> {
            let result = unsafe { libc::kill(pid as i32, libc::SIGSTOP) };

            if result == 0 {
                log::info!("Suspended process {} (SIGSTOP)", pid);
                Ok(())
            } else {
                let errno = std::io::Error::last_os_error();
                Err(ProcessError {
                    pid,
                    message: format!("SIGSTOP failed: {}", errno),
                })
            }
        }

        /// Send SIGCONT to resume a process on Unix
        pub fn resume_process(pid: u32) -> Result<(), ProcessError> {
            let result = unsafe { libc::kill(pid as i32, libc::SIGCONT) };

            if result == 0 {
                log::info!("Resumed process {} (SIGCONT)", pid);
                Ok(())
            } else {
                let errno = std::io::Error::last_os_error();
                Err(ProcessError {
                    pid,
                    message: format!("SIGCONT failed: {}", errno),
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::ProcessAction;

    #[test]
    fn should_match_exact_process_name() {
        let rule = ProcessRule {
            name: "discord".to_string(),
            aliases: vec![],
            action: ProcessAction::Kill,
        };
        assert!(matches_rule("discord", &rule));
    }

    #[test]
    fn should_match_case_insensitive() {
        let rule = ProcessRule {
            name: "Discord".to_string(),
            aliases: vec![],
            action: ProcessAction::Kill,
        };
        assert!(matches_rule("discord", &rule));
        assert!(matches_rule("discord", &rule));
    }

    #[test]
    fn should_match_alias() {
        let rule = ProcessRule {
            name: "discord".to_string(),
            aliases: vec!["Discord.exe".to_string(), "discord-ptb".to_string()],
            action: ProcessAction::Suspend,
        };
        assert!(matches_rule("discord.exe", &rule));
        assert!(matches_rule("discord-ptb", &rule));
    }

    #[test]
    fn should_not_match_unrelated_process() {
        let rule = ProcessRule {
            name: "discord".to_string(),
            aliases: vec!["Discord.exe".to_string()],
            action: ProcessAction::Kill,
        };
        assert!(!matches_rule("chrome", &rule));
        assert!(!matches_rule("firefox", &rule));
        assert!(!matches_rule("discordant", &rule));
    }

    #[test]
    fn should_list_processes() {
        let mut monitor = ProcessMonitor::new();
        let processes = monitor.list_processes();
        // Should find at least one process (our own process at minimum)
        assert!(!processes.is_empty());
    }

    #[test]
    fn should_not_match_own_process() {
        let mut monitor = ProcessMonitor::new();
        let own_pid = std::process::id();

        // Create a rule that would match any common test runner process
        let rules = vec![ProcessRule {
            name: "nonexistent-process-name-12345".to_string(),
            aliases: vec![],
            action: ProcessAction::Kill,
        }];

        let matches = monitor.find_matching(&rules);

        // Our own PID should never be in the results
        for (proc_info, _) in &matches {
            assert_ne!(proc_info.pid, own_pid, "Should not match own process");
        }
    }

    #[test]
    fn should_track_suspended_processes() {
        let mut suspended = SuspendedProcesses::default();

        assert!(suspended.is_empty());

        suspended.add(1234, "test-process".to_string());
        assert!(!suspended.is_empty());
        assert_eq!(suspended.list().len(), 1);

        suspended.add(5678, "another-process".to_string());
        assert_eq!(suspended.list().len(), 2);

        let removed = suspended.remove(&1234);
        assert_eq!(removed, Some("test-process".to_string()));
        assert_eq!(suspended.list().len(), 1);

        suspended.clear();
        assert!(suspended.is_empty());
    }
}
