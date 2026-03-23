/**
 * Typed Tauri IPC wrappers for the Knowledge Module.
 */

import { invoke } from "@tauri-apps/api/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeFolder {
  id: string;
  name: string;
  parentId: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  folderId: string;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardRecord {
  id: string;
  documentId: string | null;
  folderId: string;
  front: string;
  back: string;
  cardType: string;
  ease: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  createdAt: string;
}

export interface ReviewSession {
  id: string;
  folderId: string;
  startedAt: string;
  endedAt: string | null;
  cardsReviewed: number;
  correctCount: number;
  wrongCount: number;
}

export interface KnowledgeStats {
  totalCards: number;
  dueCards: number;
  masteredCards: number;
  totalReviews: number;
  successRate: number;
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export async function knowledgeCreateFolder(payload: {
  id: string;
  name: string;
  parentId: string | null;
  icon: string;
  color: string;
  sortOrder: number;
}): Promise<void> {
  return invoke("knowledge_create_folder", { payload });
}

export async function knowledgeListFolders(): Promise<KnowledgeFolder[]> {
  return invoke("knowledge_list_folders");
}

export async function knowledgeUpdateFolder(payload: {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
}): Promise<void> {
  return invoke("knowledge_update_folder", { payload });
}

export async function knowledgeDeleteFolder(id: string): Promise<void> {
  return invoke("knowledge_delete_folder", { id });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function knowledgeCreateDocument(payload: {
  id: string;
  folderId: string;
  title: string;
  content: string;
  tags: string;
}): Promise<void> {
  return invoke("knowledge_create_document", { payload });
}

export async function knowledgeGetDocument(
  id: string,
): Promise<KnowledgeDocument | null> {
  return invoke("knowledge_get_document", { id });
}

export async function knowledgeListDocuments(
  folderId: string,
): Promise<KnowledgeDocument[]> {
  return invoke("knowledge_list_documents", { folderId });
}

export async function knowledgeUpdateDocument(payload: {
  id: string;
  title: string;
  content: string;
  tags: string;
}): Promise<void> {
  return invoke("knowledge_update_document", { payload });
}

export async function knowledgeDeleteDocument(id: string): Promise<void> {
  return invoke("knowledge_delete_document", { id });
}

export async function knowledgeSearchDocuments(
  query: string,
): Promise<KnowledgeDocument[]> {
  return invoke("knowledge_search_documents", { query });
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

export async function knowledgeCreateFlashcard(payload: {
  id: string;
  documentId: string | null;
  folderId: string;
  front: string;
  back: string;
  cardType: string;
}): Promise<void> {
  return invoke("knowledge_create_flashcard", { payload });
}

export async function knowledgeCreateFlashcardsBatch(
  cards: FlashcardRecord[],
): Promise<void> {
  return invoke("knowledge_create_flashcards_batch", { cards });
}

export async function knowledgeListFlashcards(
  folderId: string,
): Promise<FlashcardRecord[]> {
  return invoke("knowledge_list_flashcards", { folderId });
}

export async function knowledgeListFlashcardsByDocument(
  documentId: string,
): Promise<FlashcardRecord[]> {
  return invoke("knowledge_list_flashcards_by_document", { documentId });
}

export async function knowledgeGetDueFlashcards(
  folderId?: string,
): Promise<FlashcardRecord[]> {
  return invoke("knowledge_get_due_flashcards", {
    folderId: folderId ?? null,
  });
}

export async function knowledgeUpdateFlashcardReview(payload: {
  id: string;
  ease: number;
  interval: number;
  repetitions: number;
  nextReviewAt: string;
}): Promise<void> {
  return invoke("knowledge_update_flashcard_review", { payload });
}

export async function knowledgeDeleteFlashcard(id: string): Promise<void> {
  return invoke("knowledge_delete_flashcard", { id });
}

export async function knowledgeDeleteFlashcardsByDocument(
  documentId: string,
): Promise<void> {
  return invoke("knowledge_delete_flashcards_by_document", { documentId });
}

// ---------------------------------------------------------------------------
// Review Sessions
// ---------------------------------------------------------------------------

export async function knowledgeCreateReviewSession(payload: {
  id: string;
  folderId: string;
  startedAt: string;
  endedAt: string | null;
  cardsReviewed: number;
  correctCount: number;
  wrongCount: number;
}): Promise<void> {
  return invoke("knowledge_create_review_session", { payload });
}

export async function knowledgeListReviewSessions(
  folderId: string,
  limit?: number,
): Promise<ReviewSession[]> {
  return invoke("knowledge_list_review_sessions", {
    folderId,
    limit: limit ?? null,
  });
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function knowledgeGetStats(
  folderId: string,
): Promise<KnowledgeStats> {
  return invoke("knowledge_get_stats", { folderId });
}
