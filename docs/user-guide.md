# User Guide

A comprehensive guide to all Focus Shield features.

---

## Sessions

### Session Types

- **Simple** -- a single focus block with a fixed duration.
- **Pomodoro** -- alternating focus and break blocks with configurable cycle count.
- **Custom Sequence** -- build any sequence of focus, break, and deep-focus blocks.
- **Timeboxed** -- a fixed time window (e.g., 9:00--12:00) without internal structure.
- **Progressive** -- starts with light blocking (notifications only) and escalates to full blocking over time.

### Built-in Presets

| Preset | Configuration |
|--------|---------------|
| Pomodoro Classic | 4 x [25 min focus / 5 min break] then 15 min long break |
| Deep Work | 90 min focus / 20 min break |
| Sprint | 45 min focus / 10 min break |
| Study Session | 50 min focus / 10 min break |
| Flow State | 120 min focus / 30 min break |
| Quick Task | 15 min focus, no break |
| Marathon | 180 min focus / 30 min break |

### Custom Sessions

Open the **Sessions** page and click **Create Custom**. You can:

- Add any number of blocks (focus, break, deep focus).
- Set the duration of each block independently.
- Choose whether blocking is active during break blocks.
- Define an allowlist of sites permitted during breaks.

### Scheduling

- **Recurring sessions** -- set sessions to repeat daily, on weekdays, weekends, or specific days.
- **Auto-start** -- sessions can begin automatically at a scheduled time.
- Calendar integration helps avoid conflicts with existing events.

---

## Blocking

### Browser Level

The Focus Shield browser extension intercepts requests using the `declarativeNetRequest` API. Blocked pages are redirected to a custom page showing a motivational quote, the session timer, and a distraction counter.

### Hosts / DNS Level

When the daemon is running with elevated privileges, Focus Shield modifies the system hosts file to redirect blocked domains to `127.0.0.1`. This blocks all applications on your computer, not just the browser.

### Process Level

The daemon can also monitor running processes and either suspend (soft block) or terminate (hard block) distracting applications like Discord, Steam, or Spotify.

### Granular Control

- Block YouTube but allow specific channels.
- Block Reddit but allow certain subreddits (e.g., `r/learnprogramming`).
- Time-based allowlists: permit a site at certain hours even during a session.
- Quota-based rules: allow 10 minutes of Reddit per session, then block.

---

## Lock Levels

Lock levels determine how difficult it is to end a session early.

| Level | Name | Description |
|-------|------|-------------|
| 1 | Gentle | 8-character alphanumeric token. Copy-paste allowed. |
| 2 | Moderate | 16-character mixed token. Copy-paste blocked. |
| 3 | Strict | 32-character token with symbols. 60 s cooldown before entry. |
| 4 | Hardcore | 48-character token. 120 s cooldown and double entry required. |
| 5 | Nuclear | No token generated. The session cannot be interrupted. |

### Emergency Override

If you set a master key during initial setup, you can use it to terminate any session regardless of lock level. Usage is logged and optionally penalizes your streak.

---

## Analytics

### Tracked Metrics

- Total focus time per day, week, and month.
- Sessions completed vs. aborted.
- Distraction attempts blocked.
- Most-tempted sites and apps.
- Focus-to-slack ratio.
- Peak focus hours.
- Average time to first distraction attempt.
- Per-session focus score.

### Visualizations

- **Annual Heatmap** -- GitHub-style contribution grid showing daily focus intensity.
- **Daily Timeline** -- horizontal bar of focus, break, and idle blocks.
- **30/90-day Trend Chart** -- line chart of focus time over time.
- **Radar Chart** -- distribution of distraction categories.
- **Streak Counter** -- consecutive days meeting your focus goal.

### Reports

- Automatic weekly summary.
- Export data as CSV or JSON.
- Monthly insights (e.g., "You are 23% more productive on Tuesday mornings").

---

## Gamification

### Streaks

Consecutive days with at least one completed session. Milestones at 7, 30, 100, and 365 days. A configurable freeze allows one skip day per week without breaking the streak.

### XP and Levels

XP is earned per session proportional to duration multiplied by lock level. Levels unlock cosmetic themes for the blocked page.

### Achievements

| Achievement | Condition |
|-------------|-----------|
| First Focus | Complete your first session |
| Iron Will | 10 Hardcore sessions without override |
| Early Bird | Start a session before 7:00 AM |
| Night Owl | Complete a session after 11:00 PM |
| Marathon | 3+ hour session without interruption |
| Zero Temptation | Session with zero distraction attempts |
| Comeback Kid | Resume after 7 days of inactivity |
| Century | 100 sessions completed |
| Deep Diver | 50 cumulative hours of Deep Work |

---

## Profiles

Create contextual profiles (e.g., Work, Study, Personal Project). Each profile stores its own:

- Default lock level.
- Blocklist selection.
- Daily and weekly focus goals.

Switch profiles from the sidebar dropdown. Profile-specific stats are tracked separately in the analytics dashboard.

---

## Buddy System

### Inviting a Buddy

1. Go to the **Buddy** page and click **Create Invite**.
2. Share the generated invite code with your accountability partner.
3. Your buddy enters the code in their own Focus Shield app to accept.

### Buddy Features

- See each other's focus status in real time.
- Receive notifications when your buddy uses an emergency override.
- Participate in weekly focus challenges with a leaderboard.
- Start synchronized coworking sessions (virtual coworking room).
