use std::fmt;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Markers used to delimit Focus Shield entries in the hosts file.
const MARKER_START: &str = "# >>> FOCUS SHIELD START >>>";
const MARKER_END: &str = "# <<< FOCUS SHIELD END <<<";

/// Redirect target for blocked domains (localhost).
const REDIRECT_IP: &str = "127.0.0.1";

/// Error types for hosts file operations.
#[derive(Debug)]
pub enum HostsError {
    Io(io::Error),
    PermissionDenied(String),
    BackupFailed(String),
    ParseError(String),
}

impl fmt::Display for HostsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            HostsError::Io(e) => write!(f, "I/O error: {}", e),
            HostsError::PermissionDenied(msg) => write!(f, "Permission denied: {}", msg),
            HostsError::BackupFailed(msg) => write!(f, "Backup failed: {}", msg),
            HostsError::ParseError(msg) => write!(f, "Parse error: {}", msg),
        }
    }
}

impl std::error::Error for HostsError {}

impl From<io::Error> for HostsError {
    fn from(e: io::Error) -> Self {
        if e.kind() == io::ErrorKind::PermissionDenied {
            HostsError::PermissionDenied(e.to_string())
        } else {
            HostsError::Io(e)
        }
    }
}

/// Returns the platform-specific hosts file path.
pub fn hosts_file_path() -> PathBuf {
    #[cfg(windows)]
    {
        PathBuf::from(r"C:\Windows\System32\drivers\etc\hosts")
    }
    #[cfg(not(windows))]
    {
        PathBuf::from("/etc/hosts")
    }
}

/// Returns the backup file path for the hosts file.
fn backup_path(hosts_path: &Path) -> PathBuf {
    let mut backup = hosts_path.to_path_buf();
    backup.set_extension("focus-shield.bak");
    backup
}

/// Manages reading, writing, and rollback of the system hosts file.
pub struct HostsManager {
    hosts_path: PathBuf,
}

impl HostsManager {
    /// Create a new HostsManager using the system hosts file.
    pub fn new() -> Self {
        Self {
            hosts_path: hosts_file_path(),
        }
    }

    /// Create a HostsManager with a custom hosts file path (for testing).
    pub fn with_path(hosts_path: PathBuf) -> Self {
        Self { hosts_path }
    }

    /// Read the current hosts file content.
    pub fn read_hosts(&self) -> Result<String, HostsError> {
        fs::read_to_string(&self.hosts_path).map_err(HostsError::from)
    }

    /// Check if Focus Shield entries already exist in the hosts file.
    pub fn has_focus_shield_entries(&self) -> Result<bool, HostsError> {
        let content = self.read_hosts()?;
        Ok(content.contains(MARKER_START))
    }

    /// Create an atomic backup of the hosts file before modification.
    fn create_backup(&self) -> Result<(), HostsError> {
        let backup = backup_path(&self.hosts_path);
        fs::copy(&self.hosts_path, &backup).map_err(|e| {
            HostsError::BackupFailed(format!(
                "Failed to backup {} to {}: {}",
                self.hosts_path.display(),
                backup.display(),
                e
            ))
        })?;
        Ok(())
    }

    /// Restore the hosts file from backup.
    pub fn restore_from_backup(&self) -> Result<bool, HostsError> {
        let backup = backup_path(&self.hosts_path);
        if backup.exists() {
            fs::copy(&backup, &self.hosts_path)?;
            fs::remove_file(&backup)?;
            log::info!("Hosts file restored from backup");
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Add blocked domains to the hosts file.
    ///
    /// Domains are added between marker comments so they can be cleanly removed.
    /// Wildcard patterns like `*.reddit.com` are expanded to block the base domain
    /// plus common subdomains (www).
    pub fn add_blocked_domains(&self, domains: &[String]) -> Result<usize, HostsError> {
        if domains.is_empty() {
            return Ok(0);
        }

        // Read current content
        let content = self.read_hosts()?;

        // If we already have entries, remove them first
        let clean_content = remove_focus_shield_section(&content);

        // Create backup before modification
        self.create_backup()?;

        // Expand wildcard patterns and deduplicate
        let expanded = expand_domain_patterns(domains);

        // Build the new section
        let mut section = String::new();
        section.push_str(MARKER_START);
        section.push('\n');
        for domain in &expanded {
            section.push_str(&format!("{} {}\n", REDIRECT_IP, domain));
        }
        section.push_str(MARKER_END);
        section.push('\n');

        // Append to hosts file content
        let mut new_content = clean_content;
        if !new_content.ends_with('\n') {
            new_content.push('\n');
        }
        new_content.push_str(&section);

        // Write atomically: write to temp file, then rename
        self.write_hosts(&new_content)?;

        log::info!(
            "Added {} domain entries to hosts file ({} patterns)",
            expanded.len(),
            domains.len()
        );

        Ok(expanded.len())
    }

    /// Remove all Focus Shield entries from the hosts file (rollback).
    pub fn remove_blocked_domains(&self) -> Result<bool, HostsError> {
        let content = self.read_hosts()?;

        if !content.contains(MARKER_START) {
            log::debug!("No Focus Shield entries found in hosts file");
            return Ok(false);
        }

        let clean_content = remove_focus_shield_section(&content);
        self.write_hosts(&clean_content)?;

        // Remove backup file if it exists
        let backup = backup_path(&self.hosts_path);
        if backup.exists() {
            let _ = fs::remove_file(&backup);
        }

        log::info!("Removed Focus Shield entries from hosts file");
        Ok(true)
    }

    /// Startup cleanup: remove any stale Focus Shield entries left from a previous crash.
    pub fn cleanup_stale_entries(&self) -> Result<bool, HostsError> {
        match self.has_focus_shield_entries() {
            Ok(true) => {
                log::warn!(
                    "Found stale Focus Shield entries in hosts file — cleaning up (possible previous crash)"
                );
                self.remove_blocked_domains()
            }
            Ok(false) => Ok(false),
            Err(e) => {
                log::warn!("Could not check hosts file for stale entries: {}", e);
                Ok(false)
            }
        }
    }

    /// Write content to the hosts file.
    ///
    /// We write to a temporary file first, then attempt to rename.
    /// If rename fails (common on Windows when the file is locked), we fall back
    /// to a direct write.
    fn write_hosts(&self, content: &str) -> Result<(), HostsError> {
        let parent = self
            .hosts_path
            .parent()
            .unwrap_or(Path::new("."));

        // Try atomic write via temp file + rename
        let temp_path = parent.join("hosts.focus-shield.tmp");
        fs::write(&temp_path, content)?;

        match fs::rename(&temp_path, &self.hosts_path) {
            Ok(()) => Ok(()),
            Err(_) => {
                // Rename failed (common on Windows), fall back to direct write
                let _ = fs::remove_file(&temp_path);
                fs::write(&self.hosts_path, content)?;
                Ok(())
            }
        }
    }
}

/// Remove the Focus Shield section (between markers) from hosts content.
fn remove_focus_shield_section(content: &str) -> String {
    let mut result = String::with_capacity(content.len());
    let mut in_section = false;

    for line in content.lines() {
        if line.trim() == MARKER_START {
            in_section = true;
            continue;
        }
        if line.trim() == MARKER_END {
            in_section = false;
            continue;
        }
        if !in_section {
            result.push_str(line);
            result.push('\n');
        }
    }

    // Remove trailing blank lines that may have been left
    while result.ends_with("\n\n") {
        result.pop();
    }

    result
}

/// Expand wildcard domain patterns into concrete entries.
///
/// `*.reddit.com` → `reddit.com`, `www.reddit.com`
/// `youtube.com` → `youtube.com` (no expansion)
/// Path-based patterns like `youtube.com/shorts/*` are stripped to just the domain.
fn expand_domain_patterns(patterns: &[String]) -> Vec<String> {
    let mut domains: Vec<String> = Vec::new();

    for pattern in patterns {
        // Strip path components — hosts file only works at domain level
        let domain_part = pattern.split('/').next().unwrap_or(pattern);

        if let Some(base) = domain_part.strip_prefix("*.") {
            // Wildcard: add the base domain and www subdomain
            let base = base.to_lowercase();
            if !domains.contains(&base) {
                domains.push(base.clone());
            }
            let www = format!("www.{}", base);
            if !domains.contains(&www) {
                domains.push(www);
            }
        } else {
            let domain = domain_part.to_lowercase();
            if !domain.is_empty() && !domains.contains(&domain) {
                domains.push(domain);
            }
        }
    }

    domains
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn create_temp_hosts(content: &str) -> (tempfile::TempDir, HostsManager) {
        let dir = tempfile::tempdir().unwrap();
        let hosts_path = dir.path().join("hosts");
        fs::write(&hosts_path, content).unwrap();
        let manager = HostsManager::with_path(hosts_path);
        (dir, manager)
    }

    #[test]
    fn should_read_hosts_file() {
        let content = "127.0.0.1 localhost\n::1 localhost\n";
        let (_dir, manager) = create_temp_hosts(content);

        let result = manager.read_hosts().unwrap();
        assert_eq!(result, content);
    }

    #[test]
    fn should_detect_no_focus_shield_entries() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");
        assert!(!manager.has_focus_shield_entries().unwrap());
    }

    #[test]
    fn should_detect_existing_focus_shield_entries() {
        let content = format!(
            "127.0.0.1 localhost\n{}\n127.0.0.1 reddit.com\n{}\n",
            MARKER_START, MARKER_END
        );
        let (_dir, manager) = create_temp_hosts(&content);
        assert!(manager.has_focus_shield_entries().unwrap());
    }

    #[test]
    fn should_add_blocked_domains() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");

        let count = manager
            .add_blocked_domains(&["reddit.com".to_string(), "twitter.com".to_string()])
            .unwrap();

        assert_eq!(count, 2);

        let content = manager.read_hosts().unwrap();
        assert!(content.contains(MARKER_START));
        assert!(content.contains(MARKER_END));
        assert!(content.contains("127.0.0.1 reddit.com"));
        assert!(content.contains("127.0.0.1 twitter.com"));
        // Original content preserved
        assert!(content.contains("127.0.0.1 localhost"));
    }

    #[test]
    fn should_expand_wildcard_patterns() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");

        let count = manager
            .add_blocked_domains(&["*.reddit.com".to_string()])
            .unwrap();

        assert_eq!(count, 2); // reddit.com + www.reddit.com

        let content = manager.read_hosts().unwrap();
        assert!(content.contains("127.0.0.1 reddit.com"));
        assert!(content.contains("127.0.0.1 www.reddit.com"));
    }

    #[test]
    fn should_strip_path_from_patterns() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");

        manager
            .add_blocked_domains(&["youtube.com/shorts/*".to_string()])
            .unwrap();

        let content = manager.read_hosts().unwrap();
        assert!(content.contains("127.0.0.1 youtube.com"));
        assert!(!content.contains("/shorts"));
    }

    #[test]
    fn should_deduplicate_domains() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");

        let count = manager
            .add_blocked_domains(&[
                "reddit.com".to_string(),
                "reddit.com".to_string(),
                "*.reddit.com".to_string(),
            ])
            .unwrap();

        // reddit.com (from first) + www.reddit.com (from wildcard expansion)
        // The second reddit.com is a duplicate and the wildcard's base is also a duplicate
        assert_eq!(count, 2);
    }

    #[test]
    fn should_remove_blocked_domains() {
        let content = format!(
            "127.0.0.1 localhost\n{}\n127.0.0.1 reddit.com\n{}\n",
            MARKER_START, MARKER_END
        );
        let (_dir, manager) = create_temp_hosts(&content);

        let removed = manager.remove_blocked_domains().unwrap();
        assert!(removed);

        let new_content = manager.read_hosts().unwrap();
        assert!(!new_content.contains(MARKER_START));
        assert!(!new_content.contains("reddit.com"));
        assert!(new_content.contains("127.0.0.1 localhost"));
    }

    #[test]
    fn should_return_false_when_no_entries_to_remove() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");
        let removed = manager.remove_blocked_domains().unwrap();
        assert!(!removed);
    }

    #[test]
    fn should_replace_existing_entries_on_add() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");

        // Add first set
        manager
            .add_blocked_domains(&["reddit.com".to_string()])
            .unwrap();

        // Add second set (should replace, not duplicate)
        manager
            .add_blocked_domains(&["twitter.com".to_string()])
            .unwrap();

        let content = manager.read_hosts().unwrap();
        // Should only contain the second set
        assert!(content.contains("127.0.0.1 twitter.com"));
        // The first set should be replaced
        assert!(!content.contains("127.0.0.1 reddit.com"));
        // Only one marker pair
        assert_eq!(content.matches(MARKER_START).count(), 1);
    }

    #[test]
    fn should_create_backup_on_add() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");

        manager
            .add_blocked_domains(&["reddit.com".to_string()])
            .unwrap();

        let backup = backup_path(&manager.hosts_path);
        assert!(backup.exists());
        let backup_content = fs::read_to_string(&backup).unwrap();
        assert_eq!(backup_content, "127.0.0.1 localhost\n");
    }

    #[test]
    fn should_restore_from_backup() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");

        manager
            .add_blocked_domains(&["reddit.com".to_string()])
            .unwrap();

        // Restore from backup
        let restored = manager.restore_from_backup().unwrap();
        assert!(restored);

        let content = manager.read_hosts().unwrap();
        assert_eq!(content, "127.0.0.1 localhost\n");

        // Backup should be removed after restore
        let backup = backup_path(&manager.hosts_path);
        assert!(!backup.exists());
    }

    #[test]
    fn should_return_false_when_no_backup_to_restore() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");
        let restored = manager.restore_from_backup().unwrap();
        assert!(!restored);
    }

    #[test]
    fn should_cleanup_stale_entries() {
        let content = format!(
            "127.0.0.1 localhost\n{}\n127.0.0.1 stale.com\n{}\n",
            MARKER_START, MARKER_END
        );
        let (_dir, manager) = create_temp_hosts(&content);

        let cleaned = manager.cleanup_stale_entries().unwrap();
        assert!(cleaned);

        let new_content = manager.read_hosts().unwrap();
        assert!(!new_content.contains("stale.com"));
        assert!(new_content.contains("127.0.0.1 localhost"));
    }

    #[test]
    fn should_skip_cleanup_when_no_stale_entries() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");
        let cleaned = manager.cleanup_stale_entries().unwrap();
        assert!(!cleaned);
    }

    #[test]
    fn should_return_empty_count_for_empty_domains() {
        let (_dir, manager) = create_temp_hosts("127.0.0.1 localhost\n");
        let count = manager.add_blocked_domains(&[]).unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn should_preserve_hosts_content_outside_markers() {
        let content = "# System hosts\n127.0.0.1 localhost\n::1 localhost\n# Custom entry\n10.0.0.1 myserver\n";
        let (_dir, manager) = create_temp_hosts(content);

        manager
            .add_blocked_domains(&["reddit.com".to_string()])
            .unwrap();

        let new_content = manager.read_hosts().unwrap();
        assert!(new_content.contains("# System hosts"));
        assert!(new_content.contains("127.0.0.1 localhost"));
        assert!(new_content.contains("::1 localhost"));
        assert!(new_content.contains("10.0.0.1 myserver"));
        assert!(new_content.contains("127.0.0.1 reddit.com"));
    }

    #[test]
    fn should_lowercase_domains() {
        let expanded = expand_domain_patterns(&["Reddit.COM".to_string()]);
        assert_eq!(expanded, vec!["reddit.com"]);
    }

    #[test]
    fn should_expand_wildcard_correctly() {
        let expanded = expand_domain_patterns(&["*.Facebook.com".to_string()]);
        assert_eq!(expanded, vec!["facebook.com", "www.facebook.com"]);
    }

    #[test]
    fn should_handle_remove_section_correctly() {
        let content = "line1\n# >>> FOCUS SHIELD START >>>\n127.0.0.1 blocked.com\n# <<< FOCUS SHIELD END <<<\nline2\n";
        let result = remove_focus_shield_section(content);
        assert!(result.contains("line1"));
        assert!(result.contains("line2"));
        assert!(!result.contains("blocked.com"));
        assert!(!result.contains("FOCUS SHIELD"));
    }
}
