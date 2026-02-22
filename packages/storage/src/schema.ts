import type { Migration } from "./migrations";

/**
 * Initial schema migration (version 1).
 * Creates all core tables for Focus Shield.
 */
export const initialMigration: Migration = {
  version: 1,
  name: "initial_schema",
  up: `
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      blocks TEXT NOT NULL,
      lock_level INTEGER NOT NULL DEFAULT 1,
      blocklist TEXT NOT NULL DEFAULT 'custom',
      custom_blocklist TEXT,
      allowlist TEXT,
      repeat_config TEXT,
      auto_start INTEGER NOT NULL DEFAULT 0,
      profile_id TEXT NOT NULL,
      notifications TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE session_runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      profile_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      current_block_index INTEGER NOT NULL DEFAULT 0,
      token_hash TEXT NOT NULL,
      distraction_attempts TEXT NOT NULL DEFAULT '[]',
      unlock_attempts TEXT NOT NULL DEFAULT '[]',
      focus_score REAL,
      total_focus_minutes REAL NOT NULL DEFAULT 0,
      total_break_minutes REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE blocklists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'custom',
      domains TEXT NOT NULL DEFAULT '[]',
      processes TEXT NOT NULL DEFAULT '[]',
      is_built_in INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '',
      default_lock_level INTEGER NOT NULL DEFAULT 1,
      default_blocklists TEXT NOT NULL DEFAULT '[]',
      daily_focus_goal INTEGER NOT NULL DEFAULT 240,
      weekly_focus_goal INTEGER NOT NULL DEFAULT 1200,
      created_at TEXT NOT NULL
    );

    CREATE TABLE daily_stats (
      date TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      total_focus_minutes REAL NOT NULL DEFAULT 0,
      total_break_minutes REAL NOT NULL DEFAULT 0,
      sessions_completed INTEGER NOT NULL DEFAULT 0,
      sessions_aborted INTEGER NOT NULL DEFAULT 0,
      distraction_attempts INTEGER NOT NULL DEFAULT 0,
      top_distractors TEXT NOT NULL DEFAULT '[]',
      average_focus_score REAL NOT NULL DEFAULT 0,
      streak_day INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, profile_id)
    );

    CREATE TABLE achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '',
      unlocked_at TEXT,
      progress REAL DEFAULT 0
    );
  `,
  down: `
    DROP TABLE IF EXISTS achievements;
    DROP TABLE IF EXISTS daily_stats;
    DROP TABLE IF EXISTS profiles;
    DROP TABLE IF EXISTS blocklists;
    DROP TABLE IF EXISTS session_runs;
    DROP TABLE IF EXISTS sessions;
  `,
};

/**
 * Migration v2: Add indexes for better query performance.
 * Covers session_runs, daily_stats, and sessions lookups.
 */
export const indexesMigration: Migration = {
  version: 2,
  name: "add_indexes",
  up: `
    CREATE INDEX IF NOT EXISTS idx_session_runs_session_id ON session_runs(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_runs_profile_id ON session_runs(profile_id);
    CREATE INDEX IF NOT EXISTS idx_session_runs_started_at ON session_runs(started_at);
    CREATE INDEX IF NOT EXISTS idx_session_runs_status ON session_runs(status);
    CREATE INDEX IF NOT EXISTS idx_daily_stats_profile_id ON daily_stats(profile_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON sessions(profile_id);
  `,
  down: `
    DROP INDEX IF EXISTS idx_session_runs_session_id;
    DROP INDEX IF EXISTS idx_session_runs_profile_id;
    DROP INDEX IF EXISTS idx_session_runs_started_at;
    DROP INDEX IF EXISTS idx_session_runs_status;
    DROP INDEX IF EXISTS idx_daily_stats_profile_id;
    DROP INDEX IF EXISTS idx_sessions_profile_id;
  `,
};

/**
 * Migration v3: Add gamification tables for XP, achievements, and streak freezes.
 */
export const gamificationMigration: Migration = {
  version: 3,
  name: "gamification_tables",
  up: `
    CREATE TABLE IF NOT EXISTS user_progress (
      profile_id TEXT PRIMARY KEY,
      total_xp INTEGER NOT NULL DEFAULT 0,
      achievement_progress TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS xp_history (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS streak_freezes (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      date TEXT NOT NULL,
      UNIQUE(profile_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_xp_history_profile ON xp_history(profile_id);
    CREATE INDEX IF NOT EXISTS idx_xp_history_timestamp ON xp_history(timestamp);
    CREATE INDEX IF NOT EXISTS idx_streak_freezes_profile ON streak_freezes(profile_id);
  `,
  down: `
    DROP INDEX IF EXISTS idx_streak_freezes_profile;
    DROP INDEX IF EXISTS idx_xp_history_timestamp;
    DROP INDEX IF EXISTS idx_xp_history_profile;
    DROP TABLE IF EXISTS streak_freezes;
    DROP TABLE IF EXISTS xp_history;
    DROP TABLE IF EXISTS user_progress;
  `,
};

/**
 * All migrations in order. Add new migrations to this array.
 */
export const allMigrations: Migration[] = [
  initialMigration,
  indexesMigration,
  gamificationMigration,
];
