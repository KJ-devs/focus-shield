# Getting Started

This guide covers installing Focus Shield, setting up the browser extension, and running your first focus session.

---

## Installation

### Desktop Application

Download the latest release for your operating system from the [GitHub Releases page](https://github.com/KJ-devs/focus-shield/releases/latest).

#### Windows

1. Download `Focus-Shield_x.y.z_x64-setup.exe`.
2. Run the installer and follow the prompts.
3. Launch Focus Shield from the Start menu.

#### macOS

1. Download `Focus-Shield_x.y.z_x64.dmg`.
2. Open the `.dmg` and drag **Focus Shield** into your Applications folder.
3. Launch the app. On first run macOS may ask you to approve it under **System Preferences > Security & Privacy**.

#### Linux

1. Download the `.AppImage` or `.deb` package from the release page.
2. For AppImage: make it executable (`chmod +x Focus-Shield_x.y.z_amd64.AppImage`) and run it.
3. For Debian/Ubuntu: install with `sudo dpkg -i focus-shield_x.y.z_amd64.deb`.

### Browser Extension

The extension enhances Focus Shield by blocking distracting websites directly inside your browser.

#### Chrome / Chromium

1. Go to the [Chrome Web Store listing](#) (or download the `.zip` from the GitHub release).
2. If installing from a zip: open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked** after extracting the archive.

#### Firefox

1. Go to the [Firefox Add-ons listing](#) (or download the `.xpi` from the GitHub release).
2. If installing manually: open `about:addons`, click the gear icon, and select **Install Add-on From File**.

---

## First Session Walkthrough

1. **Open Focus Shield** -- you will see the Home dashboard with a quick-start panel.
2. **Choose a preset** -- click "Start Session" and pick one of the built-in presets:
   - Pomodoro Classic (4 x 25 min focus / 5 min break, then 15 min long break)
   - Deep Work (90 min focus / 20 min break)
   - Sprint (45 min focus / 10 min break)
   - Quick Task (15 min focus, no break)
3. **Select a blocklist** -- the "Social Media" blocklist is enabled by default. You can add or remove categories.
4. **Set your lock level** -- Level 2 (Moderate) is the default. Higher levels make it harder to quit early.
5. **Start** -- a countdown appears and your session token is displayed briefly. Write it down if you might need to unlock early.
6. **Focus** -- distraction attempts are blocked and logged. The timer shows your remaining time.
7. **Review** -- when the session ends, a summary screen shows your focus score, distraction attempts, and session duration.

---

## Configuration Basics

### Lock Levels

| Level | Name | Token Length | Copy-Paste | Extras |
|-------|------|-------------|-----------|--------|
| 1 | Gentle | 8 chars | Allowed | None |
| 2 | Moderate | 16 chars | Blocked | None |
| 3 | Strict | 32 chars | Blocked | 60 s cooldown |
| 4 | Hardcore | 48 chars | Blocked | 120 s cooldown + double entry |
| 5 | Nuclear | N/A | N/A | Session cannot be interrupted |

### Master Key

A master key is an emergency override password you set during initial configuration. It is encrypted with AES-256 and stored locally. Using it terminates the session and is logged in your analytics (including streak penalties if enabled).

### Blocklists

Focus Shield ships with several built-in blocklist categories:

- **Social Media** -- Facebook, Instagram, Twitter/X, TikTok, LinkedIn feed
- **Entertainment** -- YouTube, Netflix, Twitch, Spotify, Reddit
- **Gaming** -- Steam, Epic Games, Riot Games
- **News** -- CNN, BBC, Hacker News, Google News
- **Shopping** -- Amazon, eBay, AliExpress

You can create custom blocklists with wildcard patterns (e.g., `*.reddit.com`) and path-based rules (e.g., `youtube.com/shorts/*`).

### Profiles

Create multiple profiles (Work, Study, Personal Project) each with their own blocklists, lock level, and focus goals. Switch between profiles from the sidebar.
