/**
 * Typed Tauri IPC wrappers for storage commands.
 *
 * All persistent data access goes through these functions.
 */

import { invoke } from "@tauri-apps/api/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TodayStats {
  focusMinutes: number;
  sessionsCompleted: number;
  distractionsBlocked: number;
  currentStreak: number;
}

export interface RecentSession {
  id: string;
  sessionId: string;
  startedAt: string;
  status: string;
  focusScore: number | null;
  totalFocusMinutes: number;
}

export interface DailyStatsRecord {
  date: string;
  profileId: string;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  sessionsCompleted: number;
  sessionsAborted: number;
  distractionAttempts: number;
  topDistractors: string;
  averageFocusScore: number;
  streakDay: number;
}

export interface SaveSessionRunPayload {
  id: string;
  sessionId: string;
  startedAt: string;
  endedAt: string;
  status: string;
  distractionCount: number;
  focusScore: number;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  completedNormally: boolean;
}

// ---------------------------------------------------------------------------
// IPC calls
// ---------------------------------------------------------------------------

export async function storageSaveSessionRun(
  payload: SaveSessionRunPayload,
): Promise<void> {
  return invoke("storage_save_session_run", { payload });
}

export async function storageGetTodayStats(): Promise<TodayStats> {
  return invoke("storage_get_today_stats");
}

export async function storageGetRecentSessions(
  limit?: number,
): Promise<RecentSession[]> {
  return invoke("storage_get_recent_sessions", { limit: limit ?? null });
}

export async function storageGetStatsRange(
  startDate: string,
  endDate: string,
): Promise<DailyStatsRecord[]> {
  return invoke("storage_get_stats_range", { startDate, endDate });
}

export async function storageGetStreak(): Promise<number> {
  return invoke("storage_get_streak");
}
