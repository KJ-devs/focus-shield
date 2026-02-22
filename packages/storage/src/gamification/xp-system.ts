import type { LockLevel } from "@focus-shield/shared-types";

/**
 * Represents XP gained from a single session.
 */
export interface XPGain {
  sessionId: string;
  amount: number;
  reason: string;
  timestamp: number;
}

/**
 * Snapshot of a user's current level progression.
 */
export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number; // 0-1
  title: string;
}

/**
 * Cumulative XP thresholds for each level (index = level number).
 * Level 0 requires 0 XP, level 1 requires 100 XP, etc.
 */
const LEVEL_THRESHOLDS: readonly number[] = [
  0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000, 13000,
  17000, 22000, 28000, 35000, 43000, 52000, 65000,
];

/**
 * Display titles for each level.
 */
const LEVEL_TITLES: readonly string[] = [
  "Novice",
  "Apprentice",
  "Focused",
  "Dedicated",
  "Disciplined",
  "Mindful",
  "Centered",
  "Enlightened",
  "Master",
  "Grandmaster",
  "Sage",
  "Oracle",
  "Transcendent",
  "Legendary",
  "Mythic",
  "Cosmic",
  "Eternal",
  "Infinite",
  "Ascended",
  "Ultimate",
];

const MAX_LEVEL = LEVEL_THRESHOLDS.length - 1;

// ──────────────────── XP System (pure functions) ────────────────────

/**
 * Calculate XP gained from completing (or aborting) a focus session.
 *
 * XP formula:
 *   base      = durationMinutes * 2
 *   lockMult  = 1.0 + (lockLevel - 1) * 0.25
 *   compBonus = completedNormally ? 1.5 : 0.75
 *   result    = round(base * lockMult * compBonus)
 *
 * @param durationMinutes - actual focus minutes in the session
 * @param lockLevel       - friction level (1-5)
 * @param completedNormally - true if the session ended without override / abort
 * @returns XP amount (always >= 0)
 */
export function calculateSessionXP(
  durationMinutes: number,
  lockLevel: LockLevel,
  completedNormally: boolean,
): number {
  const base = durationMinutes * 2;
  const lockMultiplier = 1.0 + (lockLevel - 1) * 0.25;
  const completionBonus = completedNormally ? 1.5 : 0.75;
  return Math.round(base * lockMultiplier * completionBonus);
}

/**
 * Derive level information from a cumulative XP total.
 */
export function getLevelInfo(totalXP: number): LevelInfo {
  let level = 0;
  for (let i = MAX_LEVEL; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && totalXP >= threshold) {
      level = i;
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level] ?? 0;
  const nextThreshold =
    level < MAX_LEVEL
      ? (LEVEL_THRESHOLDS[level + 1] ?? currentThreshold)
      : currentThreshold;

  const xpIntoLevel = totalXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = xpNeeded > 0 ? Math.min(xpIntoLevel / xpNeeded, 1) : 1;

  return {
    level,
    currentXP: totalXP,
    xpForCurrentLevel: currentThreshold,
    xpForNextLevel: nextThreshold,
    progress,
    title: LEVEL_TITLES[level] ?? "Ultimate",
  };
}

/**
 * Return the cumulative XP threshold for the given level.
 */
export function getXPThreshold(level: number): number {
  if (level < 0) return 0;
  if (level > MAX_LEVEL) return LEVEL_THRESHOLDS[MAX_LEVEL] ?? 0;
  return LEVEL_THRESHOLDS[level] ?? 0;
}
