export interface KnowledgeFolder {
  id: string;
  name: string;
  parentId: string | null;
  icon: string;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeDocument {
  id: string;
  folderId: string;
  title: string;
  content: string; // raw markdown
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type FlashcardType = "basic" | "cloze" | "qa";

export interface Flashcard {
  id: string;
  documentId: string | null; // null = manually created
  folderId: string;
  front: string; // markdown
  back: string; // markdown
  type: FlashcardType;
  // SM-2 fields
  ease: number; // ease factor, default 2.5
  interval: number; // days until next review
  repetitions: number; // successful review count
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
  createdAt: Date;
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewResult {
  ease: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date;
}

export interface ReviewSession {
  id: string;
  folderId: string;
  startedAt: Date;
  endedAt: Date | null;
  cardsReviewed: number;
  correctCount: number;
  wrongCount: number;
}

export interface QuizQuestion {
  card: Flashcard;
  choices: string[];
  correctIndex: number;
}

export interface MarkdownSection {
  heading: string;
  level: number;
  content: string;
  boldTerms: string[];
}
