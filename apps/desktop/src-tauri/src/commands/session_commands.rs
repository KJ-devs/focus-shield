//! Tauri IPC commands for session management.
//!
//! These are thin wrappers around SessionManager — they validate input,
//! call the manager, and return the result.

use crate::error::FocusError;
use crate::session::{SessionConfig, SessionManager, SessionReview, SessionSnapshot};
use serde::Deserialize;
use tauri::State;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionPayload {
    pub preset_id: String,
    pub preset_name: String,
    pub lock_level: u8,
    pub duration_ms: u64,
    pub blocks: Vec<crate::session::SessionBlock>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionResult {
    pub token: String,
    pub snapshot: SessionSnapshot,
}

#[tauri::command]
pub async fn session_start(
    payload: StartSessionPayload,
    session: State<'_, SessionManager>,
    app: tauri::AppHandle,
) -> Result<StartSessionResult, FocusError> {
    if payload.lock_level < 1 || payload.lock_level > 5 {
        return Err(FocusError::new("INVALID_LOCK_LEVEL", "Lock level must be between 1 and 5"));
    }
    if payload.duration_ms == 0 {
        return Err(FocusError::new("INVALID_DURATION", "Duration must be greater than 0"));
    }

    let config = SessionConfig {
        preset_id: payload.preset_id,
        preset_name: payload.preset_name,
        lock_level: payload.lock_level,
        duration_ms: payload.duration_ms,
        blocks: payload.blocks,
    };

    let (token, snapshot) = session.start(config, app)
        .await
        .map_err(|e| FocusError::new("SESSION_ERROR", e))?;

    Ok(StartSessionResult { token, snapshot })
}

#[tauri::command]
pub async fn session_stop(
    token: Option<String>,
    session: State<'_, SessionManager>,
    app: tauri::AppHandle,
) -> Result<SessionReview, FocusError> {
    session.stop(token, &app)
        .await
        .map_err(|e| FocusError::new("SESSION_ERROR", e))
}

#[tauri::command]
pub async fn session_request_unlock(
    session: State<'_, SessionManager>,
    app: tauri::AppHandle,
) -> Result<SessionSnapshot, FocusError> {
    session.request_unlock(&app)
        .await
        .map_err(|e| FocusError::new("SESSION_ERROR", e))
}

#[tauri::command]
pub async fn session_cancel_unlock(
    session: State<'_, SessionManager>,
    app: tauri::AppHandle,
) -> Result<SessionSnapshot, FocusError> {
    session.cancel_unlock(&app)
        .await
        .map_err(|e| FocusError::new("SESSION_ERROR", e))
}

#[tauri::command]
pub async fn session_status(
    session: State<'_, SessionManager>,
) -> Result<SessionSnapshot, FocusError> {
    Ok(session.status().await)
}

#[tauri::command]
pub async fn session_dismiss(
    session: State<'_, SessionManager>,
    app: tauri::AppHandle,
) -> Result<(), FocusError> {
    session.dismiss(&app)
        .await
        .map_err(|e| FocusError::new("SESSION_ERROR", e))
}

#[tauri::command]
pub async fn session_record_distraction(
    session: State<'_, SessionManager>,
) -> Result<(), FocusError> {
    session.record_distraction().await;
    Ok(())
}
