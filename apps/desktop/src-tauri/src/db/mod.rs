//! SQLite storage layer for Focus Shield.
//!
//! Manages the database lifecycle: creation, migrations, and CRUD operations.
//! The database is the single source of truth for all persistent data.

use chrono::Datelike;
use rusqlite::{Connection, params};
use std::path::Path;
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Migrations — must match packages/storage/src/schema.ts
// ---------------------------------------------------------------------------

const MIGRATIONS: &[(&str, &str)] = &[
    ("initial_schema", r#"
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
            session_id TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            current_block_index INTEGER NOT NULL DEFAULT 0,
            token_hash TEXT NOT NULL DEFAULT '',
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
    "#),
    ("add_indexes", r#"
        CREATE INDEX IF NOT EXISTS idx_session_runs_session_id ON session_runs(session_id);
        CREATE INDEX IF NOT EXISTS idx_session_runs_profile_id ON session_runs(profile_id);
        CREATE INDEX IF NOT EXISTS idx_session_runs_started_at ON session_runs(started_at);
        CREATE INDEX IF NOT EXISTS idx_session_runs_status ON session_runs(status);
        CREATE INDEX IF NOT EXISTS idx_daily_stats_profile_id ON daily_stats(profile_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON sessions(profile_id);
    "#),
    ("knowledge_tables", r#"
        CREATE TABLE IF NOT EXISTS knowledge_folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            icon TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT '#3b82f6',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS knowledge_documents (
            id TEXT PRIMARY KEY,
            folder_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS flashcards (
            id TEXT PRIMARY KEY,
            document_id TEXT,
            folder_id TEXT NOT NULL,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            card_type TEXT NOT NULL DEFAULT 'basic',
            ease REAL NOT NULL DEFAULT 2.5,
            interval INTEGER NOT NULL DEFAULT 0,
            repetitions INTEGER NOT NULL DEFAULT 0,
            next_review_at TEXT NOT NULL,
            last_reviewed_at TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS review_sessions (
            id TEXT PRIMARY KEY,
            folder_id TEXT NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            cards_reviewed INTEGER NOT NULL DEFAULT 0,
            correct_count INTEGER NOT NULL DEFAULT 0,
            wrong_count INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_knowledge_docs_folder ON knowledge_documents(folder_id);
        CREATE INDEX IF NOT EXISTS idx_flashcards_folder ON flashcards(folder_id);
        CREATE INDEX IF NOT EXISTS idx_flashcards_document ON flashcards(document_id);
        CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_at);
        CREATE INDEX IF NOT EXISTS idx_review_sessions_folder ON review_sessions(folder_id);
    "#),
    ("gamification_tables", r#"
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
    "#),
];

// ---------------------------------------------------------------------------
// Database manager
// ---------------------------------------------------------------------------

pub struct StorageManager {
    conn: Mutex<Connection>,
}

impl StorageManager {
    /// Open (or create) the database at the given path and run all migrations.
    pub fn open(db_path: &Path) -> Result<Self, String> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create database directory: {}", e))?;
        }

        let conn = Connection::open(db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        // Configure SQLite for performance
        conn.execute_batch("
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA busy_timeout = 5000;
        ").map_err(|e| format!("Failed to configure database: {}", e))?;

        let mgr = Self { conn: Mutex::new(conn) };
        mgr.run_migrations()?;
        mgr.ensure_default_profile()?;
        Ok(mgr)
    }

    /// Open an in-memory database (for testing).
    #[allow(dead_code)]
    pub fn open_in_memory() -> Result<Self, String> {
        let conn = Connection::open_in_memory()
            .map_err(|e| format!("Failed to open in-memory database: {}", e))?;

        conn.execute_batch("PRAGMA foreign_keys = ON;")
            .map_err(|e| format!("Failed to configure database: {}", e))?;

        let mgr = Self { conn: Mutex::new(conn) };
        mgr.run_migrations()?;
        mgr.ensure_default_profile()?;
        Ok(mgr)
    }

    fn run_migrations(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS _migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            );"
        ).map_err(|e| format!("Failed to create migrations table: {}", e))?;

        let current_version: i64 = conn
            .query_row("SELECT COALESCE(MAX(version), 0) FROM _migrations", [], |row| row.get(0))
            .map_err(|e| format!("Failed to get migration version: {}", e))?;

        for (i, (name, sql)) in MIGRATIONS.iter().enumerate() {
            let version = (i + 1) as i64;
            if version > current_version {
                conn.execute_batch(sql)
                    .map_err(|e| format!("Migration '{}' failed: {}", name, e))?;
                conn.execute(
                    "INSERT INTO _migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
                    params![version, name, chrono::Utc::now().to_rfc3339()],
                ).map_err(|e| format!("Failed to record migration: {}", e))?;
                log::info!("Applied migration {}: {}", version, name);
            }
        }

        Ok(())
    }

    fn ensure_default_profile(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM profiles WHERE id = 'default')",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Profile check failed: {}", e))?;

        if !exists {
            conn.execute(
                "INSERT INTO profiles (id, name, icon, default_lock_level, default_blocklists, daily_focus_goal, weekly_focus_goal, created_at)
                 VALUES ('default', 'Default', '', 1, '[]', 240, 1200, ?1)",
                params![chrono::Utc::now().to_rfc3339()],
            ).map_err(|e| format!("Failed to create default profile: {}", e))?;
        }

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Session runs
    // -----------------------------------------------------------------------

    /// Save a completed session run.
    pub fn save_session_run(&self, run: &SessionRunRecord) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        conn.execute(
            "INSERT OR REPLACE INTO session_runs
             (id, session_id, profile_id, started_at, ended_at, status, current_block_index,
              token_hash, distraction_attempts, unlock_attempts, focus_score,
              total_focus_minutes, total_break_minutes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                run.id,
                run.session_id,
                run.profile_id,
                run.started_at,
                run.ended_at,
                run.status,
                run.current_block_index,
                run.token_hash,
                run.distraction_attempts,
                run.unlock_attempts,
                run.focus_score,
                run.total_focus_minutes,
                run.total_break_minutes,
            ],
        ).map_err(|e| format!("Failed to save session run: {}", e))?;
        Ok(())
    }

    /// Get recent session runs (most recent first).
    pub fn get_recent_runs(&self, limit: usize) -> Result<Vec<SessionRunRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT id, session_id, profile_id, started_at, ended_at, status,
                    current_block_index, token_hash, distraction_attempts, unlock_attempts,
                    focus_score, total_focus_minutes, total_break_minutes
             FROM session_runs
             ORDER BY started_at DESC
             LIMIT ?1"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![limit as i64], |row| {
            Ok(SessionRunRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                profile_id: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                status: row.get(5)?,
                current_block_index: row.get(6)?,
                token_hash: row.get(7)?,
                distraction_attempts: row.get(8)?,
                unlock_attempts: row.get(9)?,
                focus_score: row.get(10)?,
                total_focus_minutes: row.get(11)?,
                total_break_minutes: row.get(12)?,
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| format!("Row parse error: {}", e))?);
        }
        Ok(results)
    }

    // -----------------------------------------------------------------------
    // Daily stats
    // -----------------------------------------------------------------------

    /// Upsert daily stats — add to existing or create new.
    pub fn upsert_daily_stats(
        &self,
        date: &str,
        profile_id: &str,
        focus_minutes: f64,
        break_minutes: f64,
        completed: bool,
        distraction_count: i64,
        focus_score: f64,
        top_distractors_json: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

        let (sessions_completed_delta, sessions_aborted_delta) = if completed {
            (1i64, 0i64)
        } else {
            (0i64, 1i64)
        };

        // Check if row exists
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM daily_stats WHERE date = ?1 AND profile_id = ?2)",
                params![date, profile_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("Stats check failed: {}", e))?;

        if exists {
            // Update existing — accumulate values
            conn.execute(
                "UPDATE daily_stats SET
                    total_focus_minutes = total_focus_minutes + ?3,
                    total_break_minutes = total_break_minutes + ?4,
                    sessions_completed = sessions_completed + ?5,
                    sessions_aborted = sessions_aborted + ?6,
                    distraction_attempts = distraction_attempts + ?7,
                    average_focus_score = (average_focus_score * (sessions_completed + sessions_aborted) + ?8)
                        / (sessions_completed + sessions_aborted + 1),
                    top_distractors = ?9
                 WHERE date = ?1 AND profile_id = ?2",
                params![
                    date,
                    profile_id,
                    focus_minutes,
                    break_minutes,
                    sessions_completed_delta,
                    sessions_aborted_delta,
                    distraction_count,
                    focus_score,
                    top_distractors_json,
                ],
            ).map_err(|e| format!("Stats update failed: {}", e))?;
        } else {
            conn.execute(
                "INSERT INTO daily_stats
                 (date, profile_id, total_focus_minutes, total_break_minutes,
                  sessions_completed, sessions_aborted, distraction_attempts,
                  top_distractors, average_focus_score, streak_day)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0)",
                params![
                    date,
                    profile_id,
                    focus_minutes,
                    break_minutes,
                    sessions_completed_delta,
                    sessions_aborted_delta,
                    distraction_count,
                    top_distractors_json,
                    focus_score,
                ],
            ).map_err(|e| format!("Stats insert failed: {}", e))?;
        }

        Ok(())
    }

    /// Get stats for a specific date.
    pub fn get_daily_stats(&self, date: &str, profile_id: &str) -> Result<Option<DailyStatsRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT date, profile_id, total_focus_minutes, total_break_minutes,
                    sessions_completed, sessions_aborted, distraction_attempts,
                    top_distractors, average_focus_score, streak_day
             FROM daily_stats
             WHERE date = ?1 AND profile_id = ?2"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let result = stmt.query_row(params![date, profile_id], |row| {
            Ok(DailyStatsRecord {
                date: row.get(0)?,
                profile_id: row.get(1)?,
                total_focus_minutes: row.get(2)?,
                total_break_minutes: row.get(3)?,
                sessions_completed: row.get(4)?,
                sessions_aborted: row.get(5)?,
                distraction_attempts: row.get(6)?,
                top_distractors: row.get(7)?,
                average_focus_score: row.get(8)?,
                streak_day: row.get(9)?,
            })
        });

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Stats query failed: {}", e)),
        }
    }

    /// Get stats for a date range.
    pub fn get_stats_range(
        &self,
        start_date: &str,
        end_date: &str,
        profile_id: &str,
    ) -> Result<Vec<DailyStatsRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT date, profile_id, total_focus_minutes, total_break_minutes,
                    sessions_completed, sessions_aborted, distraction_attempts,
                    top_distractors, average_focus_score, streak_day
             FROM daily_stats
             WHERE date >= ?1 AND date <= ?2 AND profile_id = ?3
             ORDER BY date ASC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![start_date, end_date, profile_id], |row| {
            Ok(DailyStatsRecord {
                date: row.get(0)?,
                profile_id: row.get(1)?,
                total_focus_minutes: row.get(2)?,
                total_break_minutes: row.get(3)?,
                sessions_completed: row.get(4)?,
                sessions_aborted: row.get(5)?,
                distraction_attempts: row.get(6)?,
                top_distractors: row.get(7)?,
                average_focus_score: row.get(8)?,
                streak_day: row.get(9)?,
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| format!("Row parse error: {}", e))?);
        }
        Ok(results)
    }

    /// Calculate the current streak (consecutive days with at least one completed session).
    // -----------------------------------------------------------------------
    // Gamification — XP & achievements
    // -----------------------------------------------------------------------

    /// Record an XP gain event.
    pub fn save_xp_gain(
        &self,
        profile_id: &str,
        session_id: &str,
        amount: i64,
        reason: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO xp_history (id, profile_id, session_id, amount, reason, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, profile_id, session_id, amount, reason, timestamp],
        ).map_err(|e| format!("Failed to save XP gain: {}", e))?;
        Ok(())
    }

    /// Get or create user progress for a profile.
    pub fn get_user_progress(&self, profile_id: &str) -> Result<UserProgressRecord, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let result = conn.query_row(
            "SELECT profile_id, total_xp, achievement_progress, updated_at
             FROM user_progress WHERE profile_id = ?1",
            params![profile_id],
            |row| Ok(UserProgressRecord {
                profile_id: row.get(0)?,
                total_xp: row.get(1)?,
                achievement_progress: row.get(2)?,
                updated_at: row.get(3)?,
            }),
        );

        match result {
            Ok(record) => Ok(record),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(UserProgressRecord {
                profile_id: profile_id.to_string(),
                total_xp: 0,
                achievement_progress: "[]".to_string(),
                updated_at: chrono::Utc::now().to_rfc3339(),
            }),
            Err(e) => Err(format!("Failed to get user progress: {}", e)),
        }
    }

    /// Update user progress (upsert).
    pub fn update_user_progress(
        &self,
        profile_id: &str,
        total_xp: i64,
        achievement_progress: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO user_progress (profile_id, total_xp, achievement_progress, updated_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(profile_id) DO UPDATE SET
                total_xp = ?2,
                achievement_progress = ?3,
                updated_at = ?4",
            params![profile_id, total_xp, achievement_progress, now],
        ).map_err(|e| format!("Failed to update user progress: {}", e))?;
        Ok(())
    }

    /// Get XP history for a profile.
    pub fn get_xp_history(&self, profile_id: &str, limit: usize) -> Result<Vec<XPHistoryRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT id, profile_id, session_id, amount, reason, timestamp
             FROM xp_history WHERE profile_id = ?1
             ORDER BY timestamp DESC LIMIT ?2"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![profile_id, limit as i64], |row| {
            Ok(XPHistoryRecord {
                id: row.get(0)?,
                profile_id: row.get(1)?,
                session_id: row.get(2)?,
                amount: row.get(3)?,
                reason: row.get(4)?,
                timestamp: row.get(5)?,
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| format!("Row parse error: {}", e))?);
        }
        Ok(results)
    }

    /// Record a streak freeze.
    pub fn record_streak_freeze(&self, profile_id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let id = uuid::Uuid::new_v4().to_string();
        let result = conn.execute(
            "INSERT OR IGNORE INTO streak_freezes (id, profile_id, date) VALUES (?1, ?2, ?3)",
            params![id, profile_id, today],
        ).map_err(|e| format!("Failed to record streak freeze: {}", e))?;
        Ok(result > 0)
    }

    /// Count streak freezes used this ISO week.
    pub fn get_freezes_this_week(&self, profile_id: &str) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let today = chrono::Local::now().naive_local().date();
        let weekday = today.weekday().num_days_from_monday();
        let week_start = today - chrono::Duration::days(weekday as i64);
        let week_end = week_start + chrono::Duration::days(6);
        let start_str = week_start.format("%Y-%m-%d").to_string();
        let end_str = week_end.format("%Y-%m-%d").to_string();

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM streak_freezes
             WHERE profile_id = ?1 AND date >= ?2 AND date <= ?3",
            params![profile_id, start_str, end_str],
            |row| row.get(0),
        ).map_err(|e| format!("Query failed: {}", e))?;

        Ok(count)
    }

    /// Get the longest streak ever achieved.
    pub fn get_longest_streak(&self, profile_id: &str) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT date FROM daily_stats
             WHERE profile_id = ?1 AND sessions_completed > 0
             ORDER BY date ASC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let dates: Vec<String> = stmt.query_map(params![profile_id], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Query failed: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

        if dates.is_empty() {
            return Ok(0);
        }

        let mut longest = 1i64;
        let mut current = 1i64;

        for i in 1..dates.len() {
            let prev = chrono::NaiveDate::parse_from_str(&dates[i - 1], "%Y-%m-%d")
                .map_err(|e| format!("Date parse error: {}", e))?;
            let curr = chrono::NaiveDate::parse_from_str(&dates[i], "%Y-%m-%d")
                .map_err(|e| format!("Date parse error: {}", e))?;

            if (curr - prev).num_days() == 1 {
                current += 1;
                if current > longest {
                    longest = current;
                }
            } else {
                current = 1;
            }
        }

        Ok(longest)
    }

    /// Get count of total sessions completed.
    pub fn get_total_sessions_completed(&self, profile_id: &str) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let count: i64 = conn.query_row(
            "SELECT COALESCE(SUM(sessions_completed), 0) FROM daily_stats WHERE profile_id = ?1",
            params![profile_id],
            |row| row.get(0),
        ).map_err(|e| format!("Query failed: {}", e))?;
        Ok(count)
    }

    /// Get total focus hours.
    pub fn get_total_focus_hours(&self, profile_id: &str) -> Result<f64, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let minutes: f64 = conn.query_row(
            "SELECT COALESCE(SUM(total_focus_minutes), 0) FROM daily_stats WHERE profile_id = ?1",
            params![profile_id],
            |row| row.get(0),
        ).map_err(|e| format!("Query failed: {}", e))?;
        Ok(minutes / 60.0)
    }

    pub fn calculate_streak(&self, profile_id: &str) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        // Get all dates with completed sessions, ordered DESC
        let mut stmt = conn.prepare(
            "SELECT date FROM daily_stats
             WHERE profile_id = ?1 AND sessions_completed > 0
             ORDER BY date DESC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let dates: Vec<String> = stmt.query_map(params![profile_id], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Query failed: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

        if dates.is_empty() {
            return Ok(0);
        }

        let mut streak = 0i64;
        let mut expected = chrono::NaiveDate::parse_from_str(&today, "%Y-%m-%d")
            .map_err(|e| format!("Date parse error: {}", e))?;

        for date_str in &dates {
            let date = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
                .map_err(|e| format!("Date parse error: {}", e))?;

            if date == expected {
                streak += 1;
                expected = expected - chrono::Duration::days(1);
            } else if date == expected - chrono::Duration::days(1) {
                // Allow one gap (today might not have sessions yet)
                if streak == 0 {
                    expected = date;
                    streak += 1;
                    expected = expected - chrono::Duration::days(1);
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        Ok(streak)
    }

    // -----------------------------------------------------------------------
    // Knowledge — Folders
    // -----------------------------------------------------------------------

    pub fn create_knowledge_folder(&self, folder: &KnowledgeFolderRecord) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        conn.execute(
            "INSERT INTO knowledge_folders (id, name, parent_id, icon, color, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![folder.id, folder.name, folder.parent_id, folder.icon, folder.color, folder.sort_order, folder.created_at, folder.updated_at],
        ).map_err(|e| format!("Failed to create folder: {}", e))?;
        Ok(())
    }

    pub fn list_knowledge_folders(&self) -> Result<Vec<KnowledgeFolderRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT id, name, parent_id, icon, color, sort_order, created_at, updated_at
             FROM knowledge_folders ORDER BY sort_order ASC, name ASC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map([], |row| {
            Ok(KnowledgeFolderRecord {
                id: row.get(0)?, name: row.get(1)?, parent_id: row.get(2)?,
                icon: row.get(3)?, color: row.get(4)?, sort_order: row.get(5)?,
                created_at: row.get(6)?, updated_at: row.get(7)?,
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row error: {}", e))
    }

    pub fn update_knowledge_folder(&self, id: &str, name: &str, icon: &str, color: &str, sort_order: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE knowledge_folders SET name = ?2, icon = ?3, color = ?4, sort_order = ?5, updated_at = ?6 WHERE id = ?1",
            params![id, name, icon, color, sort_order, now],
        ).map_err(|e| format!("Failed to update folder: {}", e))?;
        Ok(())
    }

    pub fn delete_knowledge_folder(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        // Delete related flashcards and documents first
        conn.execute("DELETE FROM flashcards WHERE folder_id = ?1", params![id])
            .map_err(|e| format!("Failed to delete flashcards: {}", e))?;
        conn.execute("DELETE FROM knowledge_documents WHERE folder_id = ?1", params![id])
            .map_err(|e| format!("Failed to delete documents: {}", e))?;
        conn.execute("DELETE FROM review_sessions WHERE folder_id = ?1", params![id])
            .map_err(|e| format!("Failed to delete review sessions: {}", e))?;
        // Move children to parent or root
        let parent_id: Option<String> = conn.query_row(
            "SELECT parent_id FROM knowledge_folders WHERE id = ?1", params![id], |row| row.get(0)
        ).map_err(|e| format!("Query failed: {}", e))?;
        conn.execute(
            "UPDATE knowledge_folders SET parent_id = ?2 WHERE parent_id = ?1",
            params![id, parent_id],
        ).map_err(|e| format!("Failed to reparent children: {}", e))?;
        conn.execute("DELETE FROM knowledge_folders WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete folder: {}", e))?;
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Knowledge — Documents
    // -----------------------------------------------------------------------

    pub fn create_knowledge_document(&self, doc: &KnowledgeDocumentRecord) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        conn.execute(
            "INSERT INTO knowledge_documents (id, folder_id, title, content, tags, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![doc.id, doc.folder_id, doc.title, doc.content, doc.tags, doc.created_at, doc.updated_at],
        ).map_err(|e| format!("Failed to create document: {}", e))?;
        Ok(())
    }

    pub fn get_knowledge_document(&self, id: &str) -> Result<Option<KnowledgeDocumentRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let result = conn.query_row(
            "SELECT id, folder_id, title, content, tags, created_at, updated_at FROM knowledge_documents WHERE id = ?1",
            params![id],
            |row| Ok(KnowledgeDocumentRecord {
                id: row.get(0)?, folder_id: row.get(1)?, title: row.get(2)?,
                content: row.get(3)?, tags: row.get(4)?, created_at: row.get(5)?, updated_at: row.get(6)?,
            }),
        );
        match result {
            Ok(r) => Ok(Some(r)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Query failed: {}", e)),
        }
    }

    pub fn list_knowledge_documents(&self, folder_id: &str) -> Result<Vec<KnowledgeDocumentRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, title, content, tags, created_at, updated_at
             FROM knowledge_documents WHERE folder_id = ?1 ORDER BY updated_at DESC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![folder_id], |row| {
            Ok(KnowledgeDocumentRecord {
                id: row.get(0)?, folder_id: row.get(1)?, title: row.get(2)?,
                content: row.get(3)?, tags: row.get(4)?, created_at: row.get(5)?, updated_at: row.get(6)?,
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row error: {}", e))
    }

    pub fn update_knowledge_document(&self, id: &str, title: &str, content: &str, tags: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE knowledge_documents SET title = ?2, content = ?3, tags = ?4, updated_at = ?5 WHERE id = ?1",
            params![id, title, content, tags, now],
        ).map_err(|e| format!("Failed to update document: {}", e))?;
        Ok(())
    }

    pub fn delete_knowledge_document(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        conn.execute("DELETE FROM flashcards WHERE document_id = ?1", params![id])
            .map_err(|e| format!("Failed to delete flashcards: {}", e))?;
        conn.execute("DELETE FROM knowledge_documents WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete document: {}", e))?;
        Ok(())
    }

    pub fn search_knowledge_documents(&self, query: &str) -> Result<Vec<KnowledgeDocumentRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, title, content, tags, created_at, updated_at
             FROM knowledge_documents
             WHERE title LIKE ?1 OR content LIKE ?1
             ORDER BY updated_at DESC LIMIT 50"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![pattern], |row| {
            Ok(KnowledgeDocumentRecord {
                id: row.get(0)?, folder_id: row.get(1)?, title: row.get(2)?,
                content: row.get(3)?, tags: row.get(4)?, created_at: row.get(5)?, updated_at: row.get(6)?,
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row error: {}", e))
    }

    // -----------------------------------------------------------------------
    // Knowledge — Flashcards
    // -----------------------------------------------------------------------

    pub fn create_flashcard(&self, card: &FlashcardRecord) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        conn.execute(
            "INSERT INTO flashcards (id, document_id, folder_id, front, back, card_type, ease, interval, repetitions, next_review_at, last_reviewed_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![card.id, card.document_id, card.folder_id, card.front, card.back, card.card_type,
                    card.ease, card.interval, card.repetitions, card.next_review_at, card.last_reviewed_at, card.created_at],
        ).map_err(|e| format!("Failed to create flashcard: {}", e))?;
        Ok(())
    }

    pub fn create_flashcards_batch(&self, cards: &[FlashcardRecord]) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let tx = conn.unchecked_transaction().map_err(|e| format!("Transaction failed: {}", e))?;
        for card in cards {
            tx.execute(
                "INSERT INTO flashcards (id, document_id, folder_id, front, back, card_type, ease, interval, repetitions, next_review_at, last_reviewed_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                params![card.id, card.document_id, card.folder_id, card.front, card.back, card.card_type,
                        card.ease, card.interval, card.repetitions, card.next_review_at, card.last_reviewed_at, card.created_at],
            ).map_err(|e| format!("Failed to create flashcard: {}", e))?;
        }
        tx.commit().map_err(|e| format!("Commit failed: {}", e))?;
        Ok(())
    }

    pub fn list_flashcards_by_folder(&self, folder_id: &str) -> Result<Vec<FlashcardRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT id, document_id, folder_id, front, back, card_type, ease, interval, repetitions, next_review_at, last_reviewed_at, created_at
             FROM flashcards WHERE folder_id = ?1 ORDER BY created_at DESC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![folder_id], Self::map_flashcard_row)
            .map_err(|e| format!("Query failed: {}", e))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row error: {}", e))
    }

    pub fn list_flashcards_by_document(&self, document_id: &str) -> Result<Vec<FlashcardRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT id, document_id, folder_id, front, back, card_type, ease, interval, repetitions, next_review_at, last_reviewed_at, created_at
             FROM flashcards WHERE document_id = ?1 ORDER BY created_at DESC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![document_id], Self::map_flashcard_row)
            .map_err(|e| format!("Query failed: {}", e))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row error: {}", e))
    }

    pub fn get_due_flashcards(&self, folder_id: &str) -> Result<Vec<FlashcardRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();
        let mut stmt = conn.prepare(
            "SELECT id, document_id, folder_id, front, back, card_type, ease, interval, repetitions, next_review_at, last_reviewed_at, created_at
             FROM flashcards WHERE folder_id = ?1 AND next_review_at <= ?2
             ORDER BY next_review_at ASC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![folder_id, now], Self::map_flashcard_row)
            .map_err(|e| format!("Query failed: {}", e))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row error: {}", e))
    }

    pub fn get_all_due_flashcards(&self) -> Result<Vec<FlashcardRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();
        let mut stmt = conn.prepare(
            "SELECT id, document_id, folder_id, front, back, card_type, ease, interval, repetitions, next_review_at, last_reviewed_at, created_at
             FROM flashcards WHERE next_review_at <= ?1
             ORDER BY next_review_at ASC"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![now], Self::map_flashcard_row)
            .map_err(|e| format!("Query failed: {}", e))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row error: {}", e))
    }

    pub fn update_flashcard_review(&self, id: &str, ease: f64, interval: i64, repetitions: i64, next_review_at: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE flashcards SET ease = ?2, interval = ?3, repetitions = ?4, next_review_at = ?5, last_reviewed_at = ?6 WHERE id = ?1",
            params![id, ease, interval, repetitions, next_review_at, now],
        ).map_err(|e| format!("Failed to update flashcard: {}", e))?;
        Ok(())
    }

    pub fn delete_flashcard(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        conn.execute("DELETE FROM flashcards WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete flashcard: {}", e))?;
        Ok(())
    }

    pub fn delete_flashcards_by_document(&self, document_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        conn.execute("DELETE FROM flashcards WHERE document_id = ?1", params![document_id])
            .map_err(|e| format!("Failed to delete flashcards: {}", e))?;
        Ok(())
    }

    fn map_flashcard_row(row: &rusqlite::Row) -> rusqlite::Result<FlashcardRecord> {
        Ok(FlashcardRecord {
            id: row.get(0)?, document_id: row.get(1)?, folder_id: row.get(2)?,
            front: row.get(3)?, back: row.get(4)?, card_type: row.get(5)?,
            ease: row.get(6)?, interval: row.get(7)?, repetitions: row.get(8)?,
            next_review_at: row.get(9)?, last_reviewed_at: row.get(10)?, created_at: row.get(11)?,
        })
    }

    // -----------------------------------------------------------------------
    // Knowledge — Review Sessions
    // -----------------------------------------------------------------------

    pub fn create_review_session(&self, session: &ReviewSessionRecord) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        conn.execute(
            "INSERT INTO review_sessions (id, folder_id, started_at, ended_at, cards_reviewed, correct_count, wrong_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![session.id, session.folder_id, session.started_at, session.ended_at,
                    session.cards_reviewed, session.correct_count, session.wrong_count],
        ).map_err(|e| format!("Failed to create review session: {}", e))?;
        Ok(())
    }

    pub fn list_review_sessions(&self, folder_id: &str, limit: usize) -> Result<Vec<ReviewSessionRecord>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let mut stmt = conn.prepare(
            "SELECT id, folder_id, started_at, ended_at, cards_reviewed, correct_count, wrong_count
             FROM review_sessions WHERE folder_id = ?1 ORDER BY started_at DESC LIMIT ?2"
        ).map_err(|e| format!("Query failed: {}", e))?;

        let rows = stmt.query_map(params![folder_id, limit as i64], |row| {
            Ok(ReviewSessionRecord {
                id: row.get(0)?, folder_id: row.get(1)?, started_at: row.get(2)?,
                ended_at: row.get(3)?, cards_reviewed: row.get(4)?,
                correct_count: row.get(5)?, wrong_count: row.get(6)?,
            })
        }).map_err(|e| format!("Query failed: {}", e))?;

        rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row error: {}", e))
    }

    pub fn get_knowledge_stats(&self, folder_id: &str) -> Result<KnowledgeStatsRecord, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();

        let total_cards: i64 = conn.query_row(
            "SELECT COUNT(*) FROM flashcards WHERE folder_id = ?1", params![folder_id], |r| r.get(0)
        ).map_err(|e| format!("Query failed: {}", e))?;

        let due_cards: i64 = conn.query_row(
            "SELECT COUNT(*) FROM flashcards WHERE folder_id = ?1 AND next_review_at <= ?2",
            params![folder_id, now], |r| r.get(0)
        ).map_err(|e| format!("Query failed: {}", e))?;

        let mastered_cards: i64 = conn.query_row(
            "SELECT COUNT(*) FROM flashcards WHERE folder_id = ?1 AND interval >= 30",
            params![folder_id], |r| r.get(0)
        ).map_err(|e| format!("Query failed: {}", e))?;

        let total_reviews: i64 = conn.query_row(
            "SELECT COALESCE(SUM(cards_reviewed), 0) FROM review_sessions WHERE folder_id = ?1",
            params![folder_id], |r| r.get(0)
        ).map_err(|e| format!("Query failed: {}", e))?;

        let total_correct: i64 = conn.query_row(
            "SELECT COALESCE(SUM(correct_count), 0) FROM review_sessions WHERE folder_id = ?1",
            params![folder_id], |r| r.get(0)
        ).map_err(|e| format!("Query failed: {}", e))?;

        Ok(KnowledgeStatsRecord {
            total_cards,
            due_cards,
            mastered_cards,
            total_reviews,
            success_rate: if total_reviews > 0 { total_correct as f64 / total_reviews as f64 * 100.0 } else { 0.0 },
        })
    }
}

// ---------------------------------------------------------------------------
// Record types (serializable for IPC)
// --------------------------------------------------------------------------

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRunRecord {
    pub id: String,
    pub session_id: String,
    pub profile_id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub status: String,
    pub current_block_index: i64,
    pub token_hash: String,
    pub distraction_attempts: String,
    pub unlock_attempts: String,
    pub focus_score: Option<f64>,
    pub total_focus_minutes: f64,
    pub total_break_minutes: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStatsRecord {
    pub date: String,
    pub profile_id: String,
    pub total_focus_minutes: f64,
    pub total_break_minutes: f64,
    pub sessions_completed: i64,
    pub sessions_aborted: i64,
    pub distraction_attempts: i64,
    pub top_distractors: String,
    pub average_focus_score: f64,
    pub streak_day: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProgressRecord {
    pub profile_id: String,
    pub total_xp: i64,
    pub achievement_progress: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XPHistoryRecord {
    pub id: String,
    pub profile_id: String,
    pub session_id: String,
    pub amount: i64,
    pub reason: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeFolderRecord {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub icon: String,
    pub color: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeDocumentRecord {
    pub id: String,
    pub folder_id: String,
    pub title: String,
    pub content: String,
    pub tags: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardRecord {
    pub id: String,
    pub document_id: Option<String>,
    pub folder_id: String,
    pub front: String,
    pub back: String,
    pub card_type: String,
    pub ease: f64,
    pub interval: i64,
    pub repetitions: i64,
    pub next_review_at: String,
    pub last_reviewed_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewSessionRecord {
    pub id: String,
    pub folder_id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub cards_reviewed: i64,
    pub correct_count: i64,
    pub wrong_count: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeStatsRecord {
    pub total_cards: i64,
    pub due_cards: i64,
    pub mastered_cards: i64,
    pub total_reviews: i64,
    pub success_rate: f64,
}
