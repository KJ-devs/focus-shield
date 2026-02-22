/**
 * Condition types used to determine when an achievement is unlocked.
 */
export type AchievementCondition =
  | { type: "sessions_completed"; count: number }
  | { type: "streak_days"; days: number }
  | { type: "total_focus_hours"; hours: number }
  | { type: "session_duration_minutes"; minutes: number }
  | { type: "lock_level_sessions"; level: number; count: number }
  | { type: "zero_distractions"; count: number }
  | { type: "time_of_day"; beforeHour?: number; afterHour?: number }
  | { type: "comeback"; inactiveDays: number };

/**
 * Static definition of an achievement in the catalogue.
 */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  maxProgress: number;
}

/**
 * Tracked progress toward a single achievement.
 */
export interface AchievementProgress {
  achievementId: string;
  currentProgress: number;
  unlocked: boolean;
  unlockedAt: number | null;
}

/**
 * Aggregated user statistics used to evaluate achievement conditions.
 */
export interface UserGameStats {
  totalSessionsCompleted: number;
  currentStreak: number;
  totalFocusHours: number;
  longestSessionMinutes: number;
  hardcoreSessionsWithoutOverride: number;
  zeroDistractionSessions: number;
  earliestSessionStartHour: number | null;
  latestSessionEndHour: number | null;
  daysSinceLastSession: number;
  deepWorkHours: number;
}

/**
 * The nine built-in achievements defined in the project spec.
 */
export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  {
    id: "first-focus",
    name: "First Focus",
    description: "Complete your first session",
    icon: "star",
    condition: { type: "sessions_completed", count: 1 },
    maxProgress: 1,
  },
  {
    id: "iron-will",
    name: "Iron Will",
    description: "Complete 10 Hardcore sessions without override",
    icon: "shield",
    condition: { type: "lock_level_sessions", level: 4, count: 10 },
    maxProgress: 10,
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Start a session before 7am",
    icon: "sunrise",
    condition: { type: "time_of_day", beforeHour: 7 },
    maxProgress: 1,
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Complete a session after 11pm",
    icon: "moon",
    condition: { type: "time_of_day", afterHour: 23 },
    maxProgress: 1,
  },
  {
    id: "marathon",
    name: "Marathon",
    description: "Complete a 3+ hour session",
    icon: "trophy",
    condition: { type: "session_duration_minutes", minutes: 180 },
    maxProgress: 1,
  },
  {
    id: "zero-temptation",
    name: "Zero Temptation",
    description: "Complete a session with no distractions",
    icon: "sparkle",
    condition: { type: "zero_distractions", count: 1 },
    maxProgress: 1,
  },
  {
    id: "comeback-kid",
    name: "Comeback Kid",
    description: "Return after 7 days of inactivity",
    icon: "rocket",
    condition: { type: "comeback", inactiveDays: 7 },
    maxProgress: 1,
  },
  {
    id: "century",
    name: "Century",
    description: "Complete 100 sessions",
    icon: "hundred",
    condition: { type: "sessions_completed", count: 100 },
    maxProgress: 100,
  },
  {
    id: "deep-diver",
    name: "Deep Diver",
    description: "Accumulate 50 hours in Deep Work mode",
    icon: "ocean",
    condition: { type: "total_focus_hours", hours: 50 },
    maxProgress: 50,
  },
] as const;

/**
 * Evaluate whether a single condition is met and compute raw progress.
 */
function evaluateCondition(
  condition: AchievementCondition,
  stats: UserGameStats,
): { met: boolean; progress: number } {
  switch (condition.type) {
    case "sessions_completed":
      return {
        met: stats.totalSessionsCompleted >= condition.count,
        progress: Math.min(stats.totalSessionsCompleted, condition.count),
      };

    case "streak_days":
      return {
        met: stats.currentStreak >= condition.days,
        progress: Math.min(stats.currentStreak, condition.days),
      };

    case "total_focus_hours":
      return {
        met: stats.totalFocusHours >= condition.hours,
        progress: Math.min(stats.totalFocusHours, condition.hours),
      };

    case "session_duration_minutes":
      return {
        met: stats.longestSessionMinutes >= condition.minutes,
        progress: Math.min(stats.longestSessionMinutes, condition.minutes),
      };

    case "lock_level_sessions":
      return {
        met: stats.hardcoreSessionsWithoutOverride >= condition.count,
        progress: Math.min(
          stats.hardcoreSessionsWithoutOverride,
          condition.count,
        ),
      };

    case "zero_distractions":
      return {
        met: stats.zeroDistractionSessions >= condition.count,
        progress: Math.min(stats.zeroDistractionSessions, condition.count),
      };

    case "time_of_day": {
      if (
        condition.beforeHour !== undefined &&
        stats.earliestSessionStartHour !== null
      ) {
        const met = stats.earliestSessionStartHour < condition.beforeHour;
        return { met, progress: met ? 1 : 0 };
      }
      if (
        condition.afterHour !== undefined &&
        stats.latestSessionEndHour !== null
      ) {
        const met = stats.latestSessionEndHour >= condition.afterHour;
        return { met, progress: met ? 1 : 0 };
      }
      return { met: false, progress: 0 };
    }

    case "comeback":
      return {
        met: stats.daysSinceLastSession >= condition.inactiveDays,
        progress: stats.daysSinceLastSession >= condition.inactiveDays ? 1 : 0,
      };
  }
}

// ──────────────────── Achievement Tracker (pure functions) ────────────────────

/**
 * Check progress on every achievement in the catalogue.
 *
 * Previously-unlocked achievements (supplied via `existing`) keep their
 * original `unlockedAt` timestamp and are never "re-locked".
 */
export function checkAchievementProgress(
  stats: UserGameStats,
  existing: AchievementProgress[] = [],
): AchievementProgress[] {
  const existingMap = new Map(
    existing.map((p) => [p.achievementId, p]),
  );

  return ACHIEVEMENT_CATALOG.map((def) => {
    const prev = existingMap.get(def.id);
    const { met, progress } = evaluateCondition(def.condition, stats);

    // Already unlocked: keep the existing record but update progress ceiling
    if (prev?.unlocked) {
      return {
        achievementId: def.id,
        currentProgress: Math.max(prev.currentProgress, progress),
        unlocked: true,
        unlockedAt: prev.unlockedAt,
      };
    }

    return {
      achievementId: def.id,
      currentProgress: progress,
      unlocked: met,
      unlockedAt: met ? Date.now() : null,
    };
  });
}

/**
 * Evaluate a single condition against user stats.
 */
export function isAchievementConditionMet(
  condition: AchievementCondition,
  stats: UserGameStats,
): { met: boolean; progress: number } {
  return evaluateCondition(condition, stats);
}

/**
 * Compare two progress snapshots and return the definitions of
 * achievements that were newly unlocked in `newProgress`.
 */
export function getNewlyUnlockedAchievements(
  oldProgress: AchievementProgress[],
  newProgress: AchievementProgress[],
): AchievementDefinition[] {
  const wasUnlocked = new Set(
    oldProgress.filter((p) => p.unlocked).map((p) => p.achievementId),
  );

  const newlyUnlockedIds = newProgress
    .filter((p) => p.unlocked && !wasUnlocked.has(p.achievementId))
    .map((p) => p.achievementId);

  const idSet = new Set(newlyUnlockedIds);
  return ACHIEVEMENT_CATALOG.filter((def) => idSet.has(def.id));
}
