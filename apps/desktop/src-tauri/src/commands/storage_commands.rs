//! Tauri IPC commands for storage operations.
//!
//! All persistent data access goes through these commands.

use crate::db::{DailyStatsRecord, SessionRunRecord, StorageManager};
use crate::error::FocusError;
use serde::{Deserialize, Serialize};
use tauri::State;

// ---------------------------------------------------------------------------
// Save session run
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSessionRunPayload {
    pub id: String,
    pub session_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub status: String,
    pub distraction_count: i64,
    pub focus_score: f64,
    pub total_focus_minutes: f64,
    pub total_break_minutes: f64,
    pub completed_normally: bool,
}

#[tauri::command]
pub async fn storage_save_session_run(
    payload: SaveSessionRunPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    let run = SessionRunRecord {
        id: payload.id.clone(),
        session_id: payload.session_id,
        profile_id: "default".to_string(),
        started_at: payload.started_at,
        ended_at: Some(payload.ended_at.clone()),
        status: payload.status.clone(),
        current_block_index: 0,
        token_hash: String::new(),
        distraction_attempts: "[]".to_string(),
        unlock_attempts: "[]".to_string(),
        focus_score: Some(payload.focus_score),
        total_focus_minutes: payload.total_focus_minutes,
        total_break_minutes: payload.total_break_minutes,
    };

    storage.save_session_run(&run)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    // Upsert daily stats for today
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    storage.upsert_daily_stats(
        &today,
        "default",
        payload.total_focus_minutes,
        payload.total_break_minutes,
        payload.completed_normally,
        payload.distraction_count,
        payload.focus_score,
        "[]",
    ).map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Get today stats
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayStatsResponse {
    pub focus_minutes: f64,
    pub sessions_completed: i64,
    pub distractions_blocked: i64,
    pub current_streak: i64,
}

#[tauri::command]
pub async fn storage_get_today_stats(
    storage: State<'_, StorageManager>,
) -> Result<TodayStatsResponse, FocusError> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let stats = storage.get_daily_stats(&today, "default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    let streak = storage.calculate_streak("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    match stats {
        Some(s) => Ok(TodayStatsResponse {
            focus_minutes: s.total_focus_minutes,
            sessions_completed: s.sessions_completed,
            distractions_blocked: s.distraction_attempts,
            current_streak: streak,
        }),
        None => Ok(TodayStatsResponse {
            focus_minutes: 0.0,
            sessions_completed: 0,
            distractions_blocked: 0,
            current_streak: streak,
        }),
    }
}

// ---------------------------------------------------------------------------
// Get recent session runs (for HomePage)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentSessionResponse {
    pub id: String,
    pub session_id: String,
    pub started_at: String,
    pub status: String,
    pub focus_score: Option<f64>,
    pub total_focus_minutes: f64,
}

#[tauri::command]
pub async fn storage_get_recent_sessions(
    limit: Option<usize>,
    storage: State<'_, StorageManager>,
) -> Result<Vec<RecentSessionResponse>, FocusError> {
    let runs = storage.get_recent_runs(limit.unwrap_or(10))
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))?;

    Ok(runs.into_iter().map(|r| RecentSessionResponse {
        id: r.id,
        session_id: r.session_id,
        started_at: r.started_at,
        status: r.status,
        focus_score: r.focus_score,
        total_focus_minutes: r.total_focus_minutes,
    }).collect())
}

// ---------------------------------------------------------------------------
// Get stats range (for Analytics)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn storage_get_stats_range(
    start_date: String,
    end_date: String,
    storage: State<'_, StorageManager>,
) -> Result<Vec<DailyStatsRecord>, FocusError> {
    storage.get_stats_range(&start_date, &end_date, "default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Get streak
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn storage_get_streak(
    storage: State<'_, StorageManager>,
) -> Result<i64, FocusError> {
    storage.calculate_streak("default")
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}
