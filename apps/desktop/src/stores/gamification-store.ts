import { create } from "zustand";
import type { LockLevel } from "@focus-shield/shared-types";
import {
  calculateSessionXP,
  getLevelInfo,
} from "@focus-shield/storage/gamification/xp-system";
import type {
  LevelInfo,
  XPGain,
} from "@focus-shield/storage/gamification/xp-system";
import {
  checkAchievementProgress,
  getNewlyUnlockedAchievements,
  ACHIEVEMENT_CATALOG,
} from "@focus-shield/storage/gamification/achievements";
import type {
  AchievementProgress,
  AchievementDefinition,
  UserGameStats,
} from "@focus-shield/storage/gamification/achievements";
import {
  storageGetUserProgress,
  storageUpdateUserProgress,
  storageSaveXpGain,
  storageGetStreakInfo,
  storageUseStreakFreeze,
  storageGetGameStats,
} from "@/tauri/storage";
import { toastInfo } from "@/stores/notification-store";

export interface GamificationState {
  // XP & Level
  totalXp: number;
  levelInfo: LevelInfo;

  // Achievements
  achievementProgress: AchievementProgress[];
  newlyUnlocked: AchievementDefinition[];

  // Streak
  currentStreak: number;
  longestStreak: number;
  freezeAvailable: boolean;
  freezesUsedThisWeek: number;

  // Last XP gain (for toast display)
  lastXpGain: XPGain | null;

  // Loading
  isLoaded: boolean;

  // Actions
  hydrate: () => Promise<void>;
  recordSessionXP: (
    sessionId: string,
    durationMinutes: number,
    lockLevel: LockLevel,
    completedNormally: boolean,
    distractionCount: number,
    startHour: number,
    endHour: number,
  ) => Promise<void>;
  recordReviewXP: (correctCount: number, wrongCount: number) => Promise<void>;
  useStreakFreeze: () => Promise<boolean>;
  dismissNewlyUnlocked: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  totalXp: 0,
  levelInfo: getLevelInfo(0),
  achievementProgress: [],
  newlyUnlocked: [],
  currentStreak: 0,
  longestStreak: 0,
  freezeAvailable: false,
  freezesUsedThisWeek: 0,
  lastXpGain: null,
  isLoaded: false,

  hydrate: async () => {
    try {
      const [progress, streakInfo] = await Promise.all([
        storageGetUserProgress(),
        storageGetStreakInfo(),
      ]);

      let achievementProgress: AchievementProgress[] = [];
      try {
        achievementProgress = JSON.parse(progress.achievementProgress);
      } catch {
        // Invalid JSON — start fresh
      }

      set({
        totalXp: progress.totalXp,
        levelInfo: getLevelInfo(progress.totalXp),
        achievementProgress,
        currentStreak: streakInfo.currentStreak,
        longestStreak: streakInfo.longestStreak,
        freezeAvailable: streakInfo.freezeAvailable,
        freezesUsedThisWeek: streakInfo.freezesUsedThisWeek,
        isLoaded: true,
      });
    } catch {
      // Not in Tauri or DB not ready — use defaults
      set({ isLoaded: true });
    }
  },

  recordSessionXP: async (
    sessionId,
    durationMinutes,
    lockLevel,
    completedNormally,
    distractionCount,
    startHour,
    endHour,
  ) => {
    const state = get();
    const xpAmount = calculateSessionXP(durationMinutes, lockLevel, completedNormally);

    const xpGain: XPGain = {
      sessionId,
      amount: xpAmount,
      reason: completedNormally ? "Session completed" : "Session aborted",
      timestamp: Date.now(),
    };

    const newTotalXp = state.totalXp + xpAmount;
    const newLevelInfo = getLevelInfo(newTotalXp);

    // Build game stats for achievement evaluation
    let gameStats: GameStatsData | null = null;
    try {
      gameStats = await storageGetGameStats();
    } catch {
      // Fallback
    }

    const stats: UserGameStats = {
      totalSessionsCompleted: (gameStats?.totalSessionsCompleted ?? 0) + (completedNormally ? 1 : 0),
      currentStreak: gameStats?.currentStreak ?? state.currentStreak,
      totalFocusHours: (gameStats?.totalFocusHours ?? 0) + durationMinutes / 60,
      longestSessionMinutes: durationMinutes,
      hardcoreSessionsWithoutOverride: lockLevel >= 4 && completedNormally
        ? 1
        : 0,
      zeroDistractionSessions: distractionCount === 0 && completedNormally ? 1 : 0,
      earliestSessionStartHour: startHour,
      latestSessionEndHour: endHour,
      daysSinceLastSession: 0,
      deepWorkHours: durationMinutes >= 90 ? durationMinutes / 60 : 0,
    };

    const oldProgress = state.achievementProgress;
    const newProgress = checkAchievementProgress(stats, oldProgress);
    const newlyUnlocked = getNewlyUnlockedAchievements(oldProgress, newProgress);

    // Persist to DB
    try {
      await Promise.all([
        storageSaveXpGain(sessionId, xpAmount, xpGain.reason),
        storageUpdateUserProgress(newTotalXp, JSON.stringify(newProgress)),
      ]);
    } catch {
      // Best effort
    }

    // Show toast
    if (xpAmount > 0) {
      toastInfo(`+${xpAmount} XP earned!`);
    }

    // Check level up
    if (newLevelInfo.level > state.levelInfo.level) {
      toastInfo(`Level up! You are now ${newLevelInfo.title} (Level ${newLevelInfo.level})`);
    }

    // Notify achievements
    for (const achievement of newlyUnlocked) {
      toastInfo(`Achievement unlocked: ${achievement.name}!`);
    }

    set({
      totalXp: newTotalXp,
      levelInfo: newLevelInfo,
      achievementProgress: newProgress,
      newlyUnlocked: [...state.newlyUnlocked, ...newlyUnlocked],
      lastXpGain: xpGain,
    });

    // Refresh streak info
    try {
      const streakInfo = await storageGetStreakInfo();
      set({
        currentStreak: streakInfo.currentStreak,
        longestStreak: streakInfo.longestStreak,
        freezeAvailable: streakInfo.freezeAvailable,
        freezesUsedThisWeek: streakInfo.freezesUsedThisWeek,
      });
    } catch {
      // Best effort
    }
  },

  recordReviewXP: async (correctCount, wrongCount) => {
    const state = get();
    const xpAmount = correctCount * 5 + wrongCount * 2;
    if (xpAmount === 0) return;

    const sessionId = `review-${Date.now()}`;
    const xpGain: XPGain = {
      sessionId,
      amount: xpAmount,
      reason: "knowledge_review",
      timestamp: Date.now(),
    };

    const newTotalXp = state.totalXp + xpAmount;
    const newLevelInfo = getLevelInfo(newTotalXp);

    // Build knowledge-aware stats for achievement evaluation
    const totalReviewed = correctCount + wrongCount;
    const stats: UserGameStats = {
      totalSessionsCompleted: 0,
      currentStreak: state.currentStreak,
      totalFocusHours: 0,
      longestSessionMinutes: 0,
      hardcoreSessionsWithoutOverride: 0,
      zeroDistractionSessions: 0,
      earliestSessionStartHour: null,
      latestSessionEndHour: null,
      daysSinceLastSession: 0,
      deepWorkHours: 0,
      totalCardsReviewed: totalReviewed,
      cardsInLastSession: totalReviewed,
      lastSessionPerfectRecall: wrongCount === 0,
      lastSessionCardCount: totalReviewed,
      cardsReviewedToday: totalReviewed,
    };

    const oldProgress = state.achievementProgress;
    const newProgress = checkAchievementProgress(stats, oldProgress);
    const newlyUnlocked = getNewlyUnlockedAchievements(oldProgress, newProgress);

    try {
      await Promise.all([
        storageSaveXpGain(sessionId, xpAmount, "knowledge_review"),
        storageUpdateUserProgress(newTotalXp, JSON.stringify(newProgress)),
      ]);
    } catch {
      // Best effort
    }

    if (xpAmount > 0) {
      toastInfo(`+${xpAmount} XP earned!`);
    }

    if (newLevelInfo.level > state.levelInfo.level) {
      toastInfo(`Level up! You are now ${newLevelInfo.title} (Level ${newLevelInfo.level})`);
    }

    for (const achievement of newlyUnlocked) {
      toastInfo(`Achievement unlocked: ${achievement.name}!`);
    }

    set({
      totalXp: newTotalXp,
      levelInfo: newLevelInfo,
      achievementProgress: newProgress,
      newlyUnlocked: [...state.newlyUnlocked, ...newlyUnlocked],
      lastXpGain: xpGain,
    });
  },

  useStreakFreeze: async () => {
    try {
      const success = await storageUseStreakFreeze();
      if (success) {
        const streakInfo = await storageGetStreakInfo();
        set({
          freezeAvailable: streakInfo.freezeAvailable,
          freezesUsedThisWeek: streakInfo.freezesUsedThisWeek,
        });
        toastInfo("Streak freeze used! Your streak is protected for today.");
      }
      return success;
    } catch {
      return false;
    }
  },

  dismissNewlyUnlocked: () => {
    set({ newlyUnlocked: [] });
  },
}));

// Re-export for convenience
type GameStatsData = Awaited<ReturnType<typeof storageGetGameStats>>;
export { ACHIEVEMENT_CATALOG, type AchievementDefinition, type AchievementProgress };
