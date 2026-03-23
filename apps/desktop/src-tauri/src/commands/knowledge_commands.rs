//! Tauri IPC commands for the Knowledge Module.

use crate::db::{
    FlashcardRecord, KnowledgeDocumentRecord, KnowledgeFolderRecord,
    KnowledgeStatsRecord, ReviewSessionRecord, StorageManager,
};
use crate::error::FocusError;
use serde::Deserialize;
use tauri::State;

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderPayload {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub icon: String,
    pub color: String,
    pub sort_order: i64,
}

#[tauri::command]
pub async fn knowledge_create_folder(
    payload: CreateFolderPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    let now = chrono::Utc::now().to_rfc3339();
    let folder = KnowledgeFolderRecord {
        id: payload.id,
        name: payload.name,
        parent_id: payload.parent_id,
        icon: payload.icon,
        color: payload.color,
        sort_order: payload.sort_order,
        created_at: now.clone(),
        updated_at: now,
    };
    storage.create_knowledge_folder(&folder)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_list_folders(
    storage: State<'_, StorageManager>,
) -> Result<Vec<KnowledgeFolderRecord>, FocusError> {
    storage.list_knowledge_folders()
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFolderPayload {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub sort_order: i64,
}

#[tauri::command]
pub async fn knowledge_update_folder(
    payload: UpdateFolderPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.update_knowledge_folder(&payload.id, &payload.name, &payload.icon, &payload.color, payload.sort_order)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_delete_folder(
    id: String,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.delete_knowledge_folder(&id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDocumentPayload {
    pub id: String,
    pub folder_id: String,
    pub title: String,
    pub content: String,
    pub tags: String,
}

#[tauri::command]
pub async fn knowledge_create_document(
    payload: CreateDocumentPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    let now = chrono::Utc::now().to_rfc3339();
    let doc = KnowledgeDocumentRecord {
        id: payload.id,
        folder_id: payload.folder_id,
        title: payload.title,
        content: payload.content,
        tags: payload.tags,
        created_at: now.clone(),
        updated_at: now,
    };
    storage.create_knowledge_document(&doc)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_get_document(
    id: String,
    storage: State<'_, StorageManager>,
) -> Result<Option<KnowledgeDocumentRecord>, FocusError> {
    storage.get_knowledge_document(&id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_list_documents(
    folder_id: String,
    storage: State<'_, StorageManager>,
) -> Result<Vec<KnowledgeDocumentRecord>, FocusError> {
    storage.list_knowledge_documents(&folder_id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDocumentPayload {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: String,
}

#[tauri::command]
pub async fn knowledge_update_document(
    payload: UpdateDocumentPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.update_knowledge_document(&payload.id, &payload.title, &payload.content, &payload.tags)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_delete_document(
    id: String,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.delete_knowledge_document(&id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_search_documents(
    query: String,
    storage: State<'_, StorageManager>,
) -> Result<Vec<KnowledgeDocumentRecord>, FocusError> {
    storage.search_knowledge_documents(&query)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFlashcardPayload {
    pub id: String,
    pub document_id: Option<String>,
    pub folder_id: String,
    pub front: String,
    pub back: String,
    pub card_type: String,
}

#[tauri::command]
pub async fn knowledge_create_flashcard(
    payload: CreateFlashcardPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    let now = chrono::Utc::now().to_rfc3339();
    let card = FlashcardRecord {
        id: payload.id,
        document_id: payload.document_id,
        folder_id: payload.folder_id,
        front: payload.front,
        back: payload.back,
        card_type: payload.card_type,
        ease: 2.5,
        interval: 0,
        repetitions: 0,
        next_review_at: now.clone(),
        last_reviewed_at: None,
        created_at: now,
    };
    storage.create_flashcard(&card)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_create_flashcards_batch(
    cards: Vec<FlashcardRecord>,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.create_flashcards_batch(&cards)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_list_flashcards(
    folder_id: String,
    storage: State<'_, StorageManager>,
) -> Result<Vec<FlashcardRecord>, FocusError> {
    storage.list_flashcards_by_folder(&folder_id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_list_flashcards_by_document(
    document_id: String,
    storage: State<'_, StorageManager>,
) -> Result<Vec<FlashcardRecord>, FocusError> {
    storage.list_flashcards_by_document(&document_id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_get_due_flashcards(
    folder_id: Option<String>,
    storage: State<'_, StorageManager>,
) -> Result<Vec<FlashcardRecord>, FocusError> {
    match folder_id {
        Some(fid) => storage.get_due_flashcards(&fid),
        None => storage.get_all_due_flashcards(),
    }.map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFlashcardReviewPayload {
    pub id: String,
    pub ease: f64,
    pub interval: i64,
    pub repetitions: i64,
    pub next_review_at: String,
}

#[tauri::command]
pub async fn knowledge_update_flashcard_review(
    payload: UpdateFlashcardReviewPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.update_flashcard_review(&payload.id, payload.ease, payload.interval, payload.repetitions, &payload.next_review_at)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_delete_flashcard(
    id: String,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.delete_flashcard(&id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_delete_flashcards_by_document(
    document_id: String,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    storage.delete_flashcards_by_document(&document_id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Review Sessions
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReviewSessionPayload {
    pub id: String,
    pub folder_id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub cards_reviewed: i64,
    pub correct_count: i64,
    pub wrong_count: i64,
}

#[tauri::command]
pub async fn knowledge_create_review_session(
    payload: CreateReviewSessionPayload,
    storage: State<'_, StorageManager>,
) -> Result<(), FocusError> {
    let session = ReviewSessionRecord {
        id: payload.id,
        folder_id: payload.folder_id,
        started_at: payload.started_at,
        ended_at: payload.ended_at,
        cards_reviewed: payload.cards_reviewed,
        correct_count: payload.correct_count,
        wrong_count: payload.wrong_count,
    };
    storage.create_review_session(&session)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

#[tauri::command]
pub async fn knowledge_list_review_sessions(
    folder_id: String,
    limit: Option<usize>,
    storage: State<'_, StorageManager>,
) -> Result<Vec<ReviewSessionRecord>, FocusError> {
    storage.list_review_sessions(&folder_id, limit.unwrap_or(20))
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn knowledge_get_stats(
    folder_id: String,
    storage: State<'_, StorageManager>,
) -> Result<KnowledgeStatsRecord, FocusError> {
    storage.get_knowledge_stats(&folder_id)
        .map_err(|e| FocusError::new("STORAGE_ERROR", e))
}
