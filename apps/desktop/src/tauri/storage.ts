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

// ---------------------------------------------------------------------------
// Gamification IPC
// ---------------------------------------------------------------------------

export interface UserProgressData {
  profileId: string;
  totalXp: number;
  achievementProgress: string; // JSON array
  updatedAt: string;
}

export interface XPHistoryEntry {
  id: string;
  profileId: string;
  sessionId: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface StreakInfoData {
  currentStreak: number;
  longestStreak: number;
  freezeAvailable: boolean;
  freezesUsedThisWeek: number;
}

export interface GameStatsData {
  totalSessionsCompleted: number;
  totalFocusHours: number;
  currentStreak: number;
  longestStreak: number;
}

export async function storageGetUserProgress(): Promise<UserProgressData> {
  return invoke("storage_get_user_progress");
}

export async function storageUpdateUserProgress(
  totalXp: number,
  achievementProgress: string,
): Promise<void> {
  return invoke("storage_update_user_progress", { totalXp, achievementProgress });
}

export async function storageSaveXpGain(
  sessionId: string,
  amount: number,
  reason: string,
): Promise<void> {
  return invoke("storage_save_xp_gain", { sessionId, amount, reason });
}

export async function storageGetXpHistory(
  limit?: number,
): Promise<XPHistoryEntry[]> {
  return invoke("storage_get_xp_history", { limit: limit ?? null });
}

export async function storageGetStreakInfo(): Promise<StreakInfoData> {
  return invoke("storage_get_streak_info");
}

export async function storageUseStreakFreeze(): Promise<boolean> {
  return invoke("storage_use_streak_freeze");
}

export async function storageGetGameStats(): Promise<GameStatsData> {
  return invoke("storage_get_game_stats");
}
