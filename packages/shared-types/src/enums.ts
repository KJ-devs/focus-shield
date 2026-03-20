// Lock level (friction level for session unlocking)
export type LockLevel = 1 | 2 | 3 | 4 | 5;

// Session block types
export type SessionBlockType = "focus" | "break" | "deep_focus";

// Repeat patterns for scheduled sessions
export type RepeatPattern = "daily" | "weekdays" | "weekends" | "custom";

// Session run execution status
export type SessionRunStatus = "active" | "completed" | "aborted" | "overridden";

// Distraction attempt source types
export type DistractionType = "domain" | "process";

// Methods available for unlocking a session
export type UnlockMethod = "token" | "master_key" | "emergency";

// Blocklist preset categories
export type BlocklistCategory =
  | "social"
  | "gaming"
  | "entertainment"
  | "news"
  | "shopping"
  | "adult"
  | "dating"
  | "gambling"
  | "crypto"
  | "timekillers"
  | "ai"
  | "sports"
  | "food"
  | "custom";

// Domain/process rule action types
export type RuleType = "block" | "allow";

// Process blocking actions
export type ProcessAction = "kill" | "suspend";

// Session state machine states (from F1.5 in project.md)
export type SessionState =
  | "idle"
  | "scheduled"
  | "starting"
  | "focus_active"
  | "break_transition"
  | "break_active"
  | "focus_transition"
  | "unlock_requested"
  | "cooldown_waiting"
  | "password_entry"
  | "unlock_failed"
  | "unlocked"
  | "paused"
  | "completed"
  | "review";
