/**
 * Typed Tauri IPC wrappers for session commands.
 *
 * The session timer runs in Rust. These functions call the backend
 * and the backend emits events that the store listens to.
 */

import { invoke } from "@tauri-apps/api/core";
import type { LockLevel, SessionBlock } from "@focus-shield/shared-types";

// ---------------------------------------------------------------------------
// Types (mirror Rust structs)
// ---------------------------------------------------------------------------

export type SessionPhase =
  | "idle"
  | "token-display"
  | "active"
  | "unlock-prompt"
  | "paused"
  | "completed";

export interface SessionSnapshot {
  phase: SessionPhase;
  runId: string | null;
  presetName: string | null;
  lockLevel: number;
  timeRemainingMs: number;
  totalDurationMs: number;
  currentBlockIndex: number;
  distractionCount: number;
  startedAt: number | null;
  tokenCountdown: number;
}

export interface SessionReview {
  sessionName: string;
  totalDurationMs: number;
  actualFocusMs: number;
  distractionCount: number;
  completedNormally: boolean;
  focusScore: number;
}

export interface StartSessionResult {
  token: string;
  snapshot: SessionSnapshot;
}

export interface TickPayload {
  timeRemainingMs: number;
  currentBlockIndex: number;
  phase: SessionPhase;
}

export interface PhaseChangedPayload {
  phase: SessionPhase;
  snapshot: SessionSnapshot;
}

export interface SessionCompletedPayload {
  review: SessionReview;
}

export interface TokenDisplayPayload {
  token: string;
  countdown: number;
  lockLevel: number;
}

// ---------------------------------------------------------------------------
// IPC calls
// ---------------------------------------------------------------------------

export async function sessionStart(config: {
  presetId: string;
  presetName: string;
  lockLevel: LockLevel;
  durationMs: number;
  blocks: SessionBlock[];
}): Promise<StartSessionResult> {
  return invoke("session_start", { payload: config });
}

export async function sessionStop(token?: string): Promise<SessionReview> {
  return invoke("session_stop", { token: token ?? null });
}

export async function sessionRequestUnlock(): Promise<SessionSnapshot> {
  return invoke("session_request_unlock");
}

export async function sessionCancelUnlock(): Promise<SessionSnapshot> {
  return invoke("session_cancel_unlock");
}

export async function sessionStatus(): Promise<SessionSnapshot> {
  return invoke("session_status");
}

export async function sessionDismiss(): Promise<void> {
  return invoke("session_dismiss");
}

export async function sessionRecordDistraction(): Promise<void> {
  return invoke("session_record_distraction");
}
