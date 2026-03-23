import {
  ACHIEVEMENT_CATALOG,
  isAchievementConditionMet,
  checkAchievementProgress,
  getNewlyUnlockedAchievements,
} from "../gamification/achievements";
import type {
  AchievementCondition,
  AchievementProgress,
  UserGameStats,
} from "../gamification/achievements";

/** Helper to build a UserGameStats with sensible defaults. */
function makeStats(overrides?: Partial<UserGameStats>): UserGameStats {
  return {
    totalSessionsCompleted: 0,
    currentStreak: 0,
    totalFocusHours: 0,
    longestSessionMinutes: 0,
    hardcoreSessionsWithoutOverride: 0,
    zeroDistractionSessions: 0,
    earliestSessionStartHour: null,
    latestSessionEndHour: null,
    daysSinceLastSession: 0,
    deepWorkHours: 0,
    ...overrides,
  };
}

// ──────────────────── ACHIEVEMENT_CATALOG ────────────────────

describe("ACHIEVEMENT_CATALOG", () => {
  it("contains exactly 16 achievements", () => {
    expect(ACHIEVEMENT_CATALOG).toHaveLength(16);
  });

  it("has all expected IDs", () => {
    const ids = ACHIEVEMENT_CATALOG.map((a) => a.id);
    expect(ids).toEqual([
      "first-focus",
      "iron-will",
      "early-bird",
      "night-owl",
      "marathon",
      "zero-temptation",
      "comeback-kid",
      "century",
      "deep-diver",
      "first-card",
      "scholar",
      "speed-reader",
      "knowledge-builder",
      "perfect-recall",
      "cram-master",
      "deep-memory",
    ]);
  });

  it("every achievement has required fields", () => {
    for (const achievement of ACHIEVEMENT_CATALOG) {
      expect(achievement.id).toBeTruthy();
      expect(achievement.name).toBeTruthy();
      expect(achievement.description).toBeTruthy();
      expect(achievement.icon).toBeTruthy();
      expect(achievement.condition).toBeDefined();
      expect(achievement.maxProgress).toBeGreaterThan(0);
    }
  });
});

// ──────────────────── isAchievementConditionMet ────────────────────

describe("isAchievementConditionMet", () => {
  describe("sessions_completed", () => {
    const condition: AchievementCondition = {
      type: "sessions_completed",
      count: 100,
    };

    it("met when totalSessionsCompleted >= count", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ totalSessionsCompleted: 100 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(100);
    });

    it("met when totalSessionsCompleted exceeds count", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ totalSessionsCompleted: 150 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(100); // capped at count
    });

    it("not met when totalSessionsCompleted < count", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ totalSessionsCompleted: 50 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(50);
    });
  });

  describe("streak_days", () => {
    const condition: AchievementCondition = {
      type: "streak_days",
      days: 30,
    };

    it("met when currentStreak >= days", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ currentStreak: 30 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(30);
    });

    it("not met when currentStreak < days", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ currentStreak: 15 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(15);
    });
  });

  describe("total_focus_hours", () => {
    const condition: AchievementCondition = {
      type: "total_focus_hours",
      hours: 50,
    };

    it("met when totalFocusHours >= hours", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ totalFocusHours: 50 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(50);
    });

    it("not met when totalFocusHours < hours", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ totalFocusHours: 25 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(25);
    });
  });

  describe("session_duration_minutes", () => {
    const condition: AchievementCondition = {
      type: "session_duration_minutes",
      minutes: 180,
    };

    it("met when longestSessionMinutes >= minutes", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ longestSessionMinutes: 180 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(180);
    });

    it("not met when longestSessionMinutes < minutes", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ longestSessionMinutes: 120 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(120);
    });
  });

  describe("lock_level_sessions", () => {
    const condition: AchievementCondition = {
      type: "lock_level_sessions",
      level: 4,
      count: 10,
    };

    it("met when hardcoreSessionsWithoutOverride >= count", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ hardcoreSessionsWithoutOverride: 10 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(10);
    });

    it("not met when hardcoreSessionsWithoutOverride < count", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ hardcoreSessionsWithoutOverride: 5 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(5);
    });
  });

  describe("zero_distractions", () => {
    const condition: AchievementCondition = {
      type: "zero_distractions",
      count: 1,
    };

    it("met when zeroDistractionSessions >= count", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ zeroDistractionSessions: 1 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(1);
    });

    it("not met when zeroDistractionSessions < count", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ zeroDistractionSessions: 0 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(0);
    });
  });

  describe("time_of_day with beforeHour", () => {
    const condition: AchievementCondition = {
      type: "time_of_day",
      beforeHour: 7,
    };

    it("met when earliestSessionStartHour < beforeHour", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ earliestSessionStartHour: 5 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(1);
    });

    it("not met when earliestSessionStartHour >= beforeHour", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ earliestSessionStartHour: 7 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(0);
    });

    it("not met when earliestSessionStartHour is null", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ earliestSessionStartHour: null }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(0);
    });
  });

  describe("time_of_day with afterHour", () => {
    const condition: AchievementCondition = {
      type: "time_of_day",
      afterHour: 23,
    };

    it("met when latestSessionEndHour >= afterHour", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ latestSessionEndHour: 23 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(1);
    });

    it("met when latestSessionEndHour exceeds afterHour", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ latestSessionEndHour: 23 }),
      );
      expect(result.met).toBe(true);
    });

    it("not met when latestSessionEndHour < afterHour", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ latestSessionEndHour: 22 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(0);
    });

    it("not met when latestSessionEndHour is null", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ latestSessionEndHour: null }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(0);
    });
  });

  describe("time_of_day with null hours (no beforeHour or afterHour)", () => {
    it("not met when neither beforeHour nor afterHour is defined", () => {
      const condition: AchievementCondition = {
        type: "time_of_day",
      };
      const result = isAchievementConditionMet(
        condition,
        makeStats({ earliestSessionStartHour: 5, latestSessionEndHour: 23 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(0);
    });
  });

  describe("comeback", () => {
    const condition: AchievementCondition = {
      type: "comeback",
      inactiveDays: 7,
    };

    it("met when daysSinceLastSession >= inactiveDays", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ daysSinceLastSession: 7 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(1);
    });

    it("met when daysSinceLastSession exceeds inactiveDays", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ daysSinceLastSession: 30 }),
      );
      expect(result.met).toBe(true);
      expect(result.progress).toBe(1);
    });

    it("not met when daysSinceLastSession < inactiveDays", () => {
      const result = isAchievementConditionMet(
        condition,
        makeStats({ daysSinceLastSession: 3 }),
      );
      expect(result.met).toBe(false);
      expect(result.progress).toBe(0);
    });
  });
});

// ──────────────────── checkAchievementProgress ────────────────────

describe("checkAchievementProgress", () => {
  it("returns progress for all achievements with empty existing array", () => {
    const stats = makeStats();
    const progress = checkAchievementProgress(stats, []);
    expect(progress).toHaveLength(ACHIEVEMENT_CATALOG.length);
  });

  it("returns progress for all achievements when existing is omitted", () => {
    const stats = makeStats();
    const progress = checkAchievementProgress(stats);
    expect(progress).toHaveLength(ACHIEVEMENT_CATALOG.length);
  });

  it("marks achievements as unlocked when conditions are met", () => {
    const stats = makeStats({ totalSessionsCompleted: 1 });
    const progress = checkAchievementProgress(stats, []);
    const firstFocus = progress.find((p) => p.achievementId === "first-focus");
    expect(firstFocus!.unlocked).toBe(true);
    expect(firstFocus!.unlockedAt).toBeTypeOf("number");
  });

  it("marks achievements as not unlocked when conditions are not met", () => {
    const stats = makeStats({ totalSessionsCompleted: 0 });
    const progress = checkAchievementProgress(stats, []);
    const firstFocus = progress.find((p) => p.achievementId === "first-focus");
    expect(firstFocus!.unlocked).toBe(false);
    expect(firstFocus!.unlockedAt).toBeNull();
  });

  it("preserves unlockedAt timestamp for already-unlocked achievements", () => {
    const existingTimestamp = 1700000000000;
    const existing: AchievementProgress[] = [
      {
        achievementId: "first-focus",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: existingTimestamp,
      },
    ];

    const stats = makeStats({ totalSessionsCompleted: 5 });
    const progress = checkAchievementProgress(stats, existing);
    const firstFocus = progress.find((p) => p.achievementId === "first-focus");

    expect(firstFocus!.unlocked).toBe(true);
    expect(firstFocus!.unlockedAt).toBe(existingTimestamp);
  });

  it("never re-locks an already-unlocked achievement", () => {
    const existing: AchievementProgress[] = [
      {
        achievementId: "comeback-kid",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
    ];

    // Stats no longer meet the comeback condition (daysSinceLastSession = 0)
    const stats = makeStats({ daysSinceLastSession: 0 });
    const progress = checkAchievementProgress(stats, existing);
    const comeback = progress.find((p) => p.achievementId === "comeback-kid");

    expect(comeback!.unlocked).toBe(true);
    expect(comeback!.unlockedAt).toBe(1700000000000);
  });

  it("newly unlocked achievements get a Date.now() timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-08-01T12:00:00Z"));

    const stats = makeStats({ totalSessionsCompleted: 1 });
    const progress = checkAchievementProgress(stats, []);
    const firstFocus = progress.find((p) => p.achievementId === "first-focus");

    expect(firstFocus!.unlockedAt).toBe(Date.now());

    vi.useRealTimers();
  });

  it("computes correct progress values for progressive achievements", () => {
    const stats = makeStats({ totalSessionsCompleted: 42 });
    const progress = checkAchievementProgress(stats, []);
    const century = progress.find((p) => p.achievementId === "century");

    expect(century!.currentProgress).toBe(42);
    expect(century!.unlocked).toBe(false);
  });

  it("caps progress at maxProgress for completed progressive achievements", () => {
    const stats = makeStats({ totalSessionsCompleted: 200 });
    const progress = checkAchievementProgress(stats, []);
    const century = progress.find((p) => p.achievementId === "century");

    expect(century!.currentProgress).toBe(100); // capped at condition count
    expect(century!.unlocked).toBe(true);
  });
});

// ──────────────────── getNewlyUnlockedAchievements ────────────────────

describe("getNewlyUnlockedAchievements", () => {
  it("returns newly unlocked achievements only", () => {
    const oldProgress: AchievementProgress[] = [
      {
        achievementId: "first-focus",
        currentProgress: 0,
        unlocked: false,
        unlockedAt: null,
      },
      {
        achievementId: "century",
        currentProgress: 50,
        unlocked: false,
        unlockedAt: null,
      },
    ];

    const newProgress: AchievementProgress[] = [
      {
        achievementId: "first-focus",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
      {
        achievementId: "century",
        currentProgress: 50,
        unlocked: false,
        unlockedAt: null,
      },
    ];

    const result = getNewlyUnlockedAchievements(oldProgress, newProgress);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("first-focus");
  });

  it("returns empty array when nothing new is unlocked", () => {
    const progress: AchievementProgress[] = [
      {
        achievementId: "first-focus",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
    ];

    const result = getNewlyUnlockedAchievements(progress, progress);
    expect(result).toHaveLength(0);
  });

  it("ignores achievements that were already unlocked in both", () => {
    const oldProgress: AchievementProgress[] = [
      {
        achievementId: "first-focus",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
      {
        achievementId: "marathon",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
    ];

    const newProgress: AchievementProgress[] = [
      {
        achievementId: "first-focus",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
      {
        achievementId: "marathon",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
      {
        achievementId: "century",
        currentProgress: 100,
        unlocked: true,
        unlockedAt: 1700001000000,
      },
    ];

    const result = getNewlyUnlockedAchievements(oldProgress, newProgress);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("century");
  });

  it("returns multiple newly unlocked achievements", () => {
    const oldProgress: AchievementProgress[] = [];
    const newProgress: AchievementProgress[] = [
      {
        achievementId: "first-focus",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
      {
        achievementId: "zero-temptation",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
    ];

    const result = getNewlyUnlockedAchievements(oldProgress, newProgress);
    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("first-focus");
    expect(ids).toContain("zero-temptation");
  });

  it("returns full AchievementDefinition objects", () => {
    const oldProgress: AchievementProgress[] = [];
    const newProgress: AchievementProgress[] = [
      {
        achievementId: "marathon",
        currentProgress: 1,
        unlocked: true,
        unlockedAt: 1700000000000,
      },
    ];

    const result = getNewlyUnlockedAchievements(oldProgress, newProgress);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Marathon");
    expect(result[0]!.description).toBe("Complete a 3+ hour session");
    expect(result[0]!.icon).toBe("trophy");
    expect(result[0]!.condition).toEqual({
      type: "session_duration_minutes",
      minutes: 180,
    });
  });

  it("returns empty when both old and new are empty", () => {
    const result = getNewlyUnlockedAchievements([], []);
    expect(result).toHaveLength(0);
  });
});
