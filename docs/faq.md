# Frequently Asked Questions

---

## General

### What is Focus Shield?

Focus Shield is a free, open-source application that helps you stay productive by blocking distracting websites and applications during configurable focus sessions. It combines a desktop app (built with Tauri), a browser extension, and an optional self-hosted sync server.

### Is Focus Shield really free?

Yes. Focus Shield is open-source under the MIT license. There are no subscriptions, no ads, and no premium tiers. All features are available to everyone.

### Which platforms are supported?

- **Desktop**: Windows, macOS, and Linux.
- **Browser**: Chrome and Firefox (Manifest V3 extension).
- **Sync server**: Any machine that can run Docker.

### Does Focus Shield collect any data?

No data leaves your device by default. If you enable the optional crash reporter (disabled by default), only crash stack traces, app version, and OS information are sent to a configurable endpoint. Session data, blocked sites, and personal information are never collected.

---

## Sessions

### What happens if my computer crashes during a session?

Focus Shield includes a watchdog that restores the hosts file and resumes suspended processes on the next startup. Your session run is recorded as aborted, and the time you focused before the crash still counts toward your stats.

### Can I pause a session?

Pausing is available if the session preset allows it. The Pomodoro Classic preset disables pausing by default to maintain the time-boxed discipline, but custom presets can enable it. Smart pause activates automatically when your PC is locked.

### Can I extend a session that is already running?

Yes. Use the "Extend" button on the active session screen to add more focus time without restarting the session.

---

## Blocking

### Why does Focus Shield need administrator / root privileges?

Administrator privileges are required only by the system daemon to modify the hosts file and manage processes. The main desktop app and browser extension run without elevated permissions. If you decline privilege escalation, hosts-level and process-level blocking are unavailable, but browser-level blocking still works.

### A site is blocked but I need it for work. What do I do?

Add the site to your allowlist. You can allowlist specific paths (e.g., allow `reddit.com/r/reactjs` while blocking the rest of Reddit) or set time-based quotas.

### How do I unblock everything in an emergency?

If you configured a master key, enter it in the unlock dialog. The session ends, and usage is logged. If you are at lock level 5 (Nuclear), the session cannot be interrupted at all.

---

## Sync Server

### Do I need the sync server?

No. The sync server is entirely optional. Focus Shield works fully offline with local SQLite storage. The sync server adds multi-device sync, buddy features, and challenges.

### Can multiple people share one sync server?

Yes. The sync server supports multiple users. Each user registers with an email and display name.

### Is the sync server secure?

The server uses token-based authentication. For production deployments, you should run it behind a reverse proxy with TLS (HTTPS). Database credentials should be changed from the defaults.

---

## Troubleshooting

### The browser extension is not blocking sites.

1. Verify the extension is enabled in your browser's extension settings.
2. Check that the extension has permission to run in incognito/private mode if you use it.
3. Ensure a focus session is active (the extension only blocks during active sessions unless configured otherwise).
4. Check the extension popup for connection status with the desktop app.

### The hosts file was not restored after a crash.

Focus Shield includes a cleanup routine that runs on startup. If the hosts file still contains Focus Shield entries after a crash:

1. Restart the Focus Shield desktop app -- it will clean up automatically.
2. If the app cannot start, manually edit the hosts file and remove lines between the `# FOCUS-SHIELD-BEGIN` and `# FOCUS-SHIELD-END` markers.
   - Windows: `C:\Windows\System32\drivers\etc\hosts`
   - macOS / Linux: `/etc/hosts`

### The app is using too much memory or CPU.

Open Settings and check the process monitoring interval. The default polling interval is optimized for low overhead, but reducing the blocklist size or disabling process-level blocking can further reduce resource usage.

---

## How to Report Bugs

1. Check the [existing issues](https://github.com/KJ-devs/focus-shield/issues) to see if the bug has already been reported.
2. If not, [open a new issue](https://github.com/KJ-devs/focus-shield/issues/new) and include:
   - Your operating system and version.
   - Focus Shield version (shown in Settings > About).
   - Steps to reproduce the issue.
   - Expected vs. actual behavior.
   - Relevant screenshots or logs.
