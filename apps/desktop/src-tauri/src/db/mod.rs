//! SQLite storage layer for Focus Shield.
//!
//! Manages the database lifecycle: creation, migrations, and CRUD operations.
//! The database is the single source of truth for all persistent data.

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
}

// ---------------------------------------------------------------------------
// Record types (serializable for IPC)
// ---------------------------------------------------------------------------

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
