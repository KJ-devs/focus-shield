use std::io;

/// Check if the current process has admin/root privileges.
pub fn is_elevated() -> bool {
    #[cfg(windows)]
    {
        windows_is_elevated()
    }
    #[cfg(unix)]
    {
        unix_is_elevated()
    }
}

/// Check if hosts file is writable by attempting to open it for writing.
pub fn can_write_hosts() -> bool {
    let hosts_path = crate::hosts_manager::hosts_file_path();
    std::fs::OpenOptions::new()
        .write(true)
        .append(true)
        .open(&hosts_path)
        .is_ok()
}

/// Request elevated privileges for the daemon process.
///
/// This function returns an error describing what the user needs to do.
/// The daemon itself cannot self-elevate — the Tauri app must relaunch
/// the daemon with admin privileges.
pub fn require_elevation() -> Result<(), PrivilegeError> {
    if is_elevated() {
        return Ok(());
    }

    if can_write_hosts() {
        // Hosts file is writable even without elevation (unlikely but possible)
        return Ok(());
    }

    Err(PrivilegeError::ElevationRequired(elevation_instructions()))
}

/// Get platform-specific instructions for elevation.
fn elevation_instructions() -> String {
    #[cfg(windows)]
    {
        "The Focus Shield daemon needs administrator privileges to modify the hosts file. \
         Please restart the application as administrator (right-click → Run as administrator)."
            .to_string()
    }
    #[cfg(target_os = "macos")]
    {
        "The Focus Shield daemon needs root privileges to modify /etc/hosts. \
         The application will request permission via the system dialog."
            .to_string()
    }
    #[cfg(target_os = "linux")]
    {
        "The Focus Shield daemon needs root privileges to modify /etc/hosts. \
         Please run with sudo or configure the daemon as a system service."
            .to_string()
    }
    #[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
    {
        "The Focus Shield daemon needs elevated privileges to modify the hosts file.".to_string()
    }
}

#[derive(Debug)]
pub enum PrivilegeError {
    ElevationRequired(String),
    Io(io::Error),
}

impl std::fmt::Display for PrivilegeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PrivilegeError::ElevationRequired(msg) => write!(f, "{}", msg),
            PrivilegeError::Io(e) => write!(f, "I/O error: {}", e),
        }
    }
}

impl std::error::Error for PrivilegeError {}

// --- Platform-specific implementations ---

#[cfg(windows)]
fn windows_is_elevated() -> bool {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::Security::{
        GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
    };
    use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token: HANDLE = 0;
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;

        let result = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            size,
            &mut size,
        );

        CloseHandle(token);

        result != 0 && elevation.TokenIsElevated != 0
    }
}

#[cfg(unix)]
fn unix_is_elevated() -> bool {
    unsafe { libc::geteuid() == 0 }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_check_elevation_status() {
        // This test just verifies the function doesn't panic
        let _elevated = is_elevated();
    }

    #[test]
    fn should_check_hosts_writability() {
        // This test just verifies the function doesn't panic
        let _writable = can_write_hosts();
    }
}
