import type { DailyStats } from "@focus-shield/shared-types";
import { Storage } from "../storage";
import type { AchievementProgress } from "../gamification/achievements";
import type { XPGain } from "../gamification/xp-system";

/** Helper to build a DailyStats with sensible defaults. */
function makeStats(overrides?: Partial<DailyStats>): DailyStats {
  return {
    date: "2025-06-15",
    profileId: "profile-1",
    totalFocusMinutes: 60,
    totalBreakMinutes: 10,
    sessionsCompleted: 1,
    sessionsAborted: 0,
    distractionAttempts: 0,
    topDistractors: [],
    averageFocusScore: 80,
    streakDay: 1,
    ...overrides,
  };
}

// ──────────────────── GamificationRepository ────────────────────

describe("GamificationRepository", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
  });

  afterEach(() => {
    storage.close();
  });

  describe("saveProgress + getProgress", () => {
    it("roundtrips progress data correctly", () => {
      const achievements: AchievementProgress[] = [
        {
          achievementId: "first-focus",
          currentProgress: 1,
          unlocked: true,
          unlockedAt: 1700000000000,
        },
        {
          achievementId: "century",
          currentProgress: 42,
          unlocked: false,
          unlockedAt: null,
        },
      ];

      storage.gamification.saveProgress("profile-1", 500, achievements);
      const result = storage.gamification.getProgress("profile-1");

      expect(result).toBeDefined();
      expect(result!.totalXP).toBe(500);
      expect(result!.achievements).toHaveLength(2);
      expect(result!.achievements[0]!.achievementId).toBe("first-focus");
      expect(result!.achievements[0]!.unlocked).toBe(true);
      expect(result!.achievements[0]!.unlockedAt).toBe(1700000000000);
      expect(result!.achievements[1]!.achievementId).toBe("century");
      expect(result!.achievements[1]!.currentProgress).toBe(42);
      expect(result!.achievements[1]!.unlocked).toBe(false);
    });

    it("returns undefined for unknown profile", () => {
      const result = storage.gamification.getProgress("nonexistent");
      expect(result).toBeUndefined();
    });

    it("upserts on conflict (updates existing record)", () => {
      const achievementsV1: AchievementProgress[] = [
        {
          achievementId: "first-focus",
          currentProgress: 1,
          unlocked: true,
          unlockedAt: 1700000000000,
        },
      ];

      const achievementsV2: AchievementProgress[] = [
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
          unlockedAt: 1700001000000,
        },
      ];

      storage.gamification.saveProgress("profile-1", 100, achievementsV1);
      storage.gamification.saveProgress("profile-1", 500, achievementsV2);

      const result = storage.gamification.getProgress("profile-1");
      expect(result!.totalXP).toBe(500);
      expect(result!.achievements).toHaveLength(2);
    });
  });

  describe("recordXPGain + getXPHistory", () => {
    it("records XP gain and retrieves it", () => {
      const gain: XPGain = {
        sessionId: "session-1",
        amount: 75,
        reason: "Session completed",
        timestamp: 1700000000000,
      };

      storage.gamification.recordXPGain("profile-1", gain);
      const history = storage.gamification.getXPHistory("profile-1");

      expect(history).toHaveLength(1);
      expect(history[0]!.sessionId).toBe("session-1");
      expect(history[0]!.amount).toBe(75);
      expect(history[0]!.reason).toBe("Session completed");
      expect(history[0]!.timestamp).toBe(1700000000000);
    });

    it("returns records ordered by timestamp descending", () => {
      const gains: XPGain[] = [
        {
          sessionId: "s1",
          amount: 50,
          reason: "First",
          timestamp: 1700000000000,
        },
        {
          sessionId: "s2",
          amount: 75,
          reason: "Second",
          timestamp: 1700001000000,
        },
        {
          sessionId: "s3",
          amount: 100,
          reason: "Third",
          timestamp: 1700002000000,
        },
      ];

      for (const gain of gains) {
        storage.gamification.recordXPGain("profile-1", gain);
      }

      const history = storage.gamification.getXPHistory("profile-1");
      expect(history).toHaveLength(3);
      expect(history[0]!.timestamp).toBe(1700002000000);
      expect(history[1]!.timestamp).toBe(1700001000000);
      expect(history[2]!.timestamp).toBe(1700000000000);
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        storage.gamification.recordXPGain("profile-1", {
          sessionId: `s${String(i)}`,
          amount: 10,
          reason: "test",
          timestamp: 1700000000000 + i * 1000,
        });
      }

      const history = storage.gamification.getXPHistory("profile-1", 3);
      expect(history).toHaveLength(3);
      // Most recent first
      expect(history[0]!.sessionId).toBe("s9");
    });

    it("returns empty array for profile with no history", () => {
      const history = storage.gamification.getXPHistory("profile-1");
      expect(history).toEqual([]);
    });
  });

  describe("recordFreeze + getAllFreezes", () => {
    it("records and retrieves a freeze", () => {
      storage.gamification.recordFreeze("profile-1", "2025-06-15");
      const freezes = storage.gamification.getAllFreezes("profile-1");

      expect(freezes).toHaveLength(1);
      expect(freezes[0]!.date).toBe("2025-06-15");
      expect(freezes[0]!.id).toBe("freeze-profile-1-2025-06-15");
    });

    it("is idempotent (INSERT OR IGNORE for duplicate)", () => {
      storage.gamification.recordFreeze("profile-1", "2025-06-15");
      storage.gamification.recordFreeze("profile-1", "2025-06-15");

      const freezes = storage.gamification.getAllFreezes("profile-1");
      expect(freezes).toHaveLength(1);
    });

    it("records multiple freezes for different dates", () => {
      storage.gamification.recordFreeze("profile-1", "2025-06-15");
      storage.gamification.recordFreeze("profile-1", "2025-06-16");
      storage.gamification.recordFreeze("profile-1", "2025-06-17");

      const freezes = storage.gamification.getAllFreezes("profile-1");
      expect(freezes).toHaveLength(3);
    });

    it("returns freezes ordered by date descending", () => {
      storage.gamification.recordFreeze("profile-1", "2025-06-10");
      storage.gamification.recordFreeze("profile-1", "2025-06-20");
      storage.gamification.recordFreeze("profile-1", "2025-06-15");

      const freezes = storage.gamification.getAllFreezes("profile-1");
      expect(freezes[0]!.date).toBe("2025-06-20");
      expect(freezes[1]!.date).toBe("2025-06-15");
      expect(freezes[2]!.date).toBe("2025-06-10");
    });

    it("returns empty array for profile with no freezes", () => {
      const freezes = storage.gamification.getAllFreezes("profile-1");
      expect(freezes).toEqual([]);
    });
  });

  describe("getFreezesThisWeek", () => {
    it("counts freezes within the ISO week", () => {
      // 2025-06-16 is a Monday
      storage.gamification.recordFreeze("profile-1", "2025-06-16");
      storage.gamification.recordFreeze("profile-1", "2025-06-18");

      const count = storage.gamification.getFreezesThisWeek(
        "profile-1",
        "2025-06-17",
      );
      expect(count).toBe(2);
    });

    it("does not count freezes from previous weeks", () => {
      // 2025-06-09 is a Monday (previous week)
      storage.gamification.recordFreeze("profile-1", "2025-06-09");
      // 2025-06-16 is the next Monday
      storage.gamification.recordFreeze("profile-1", "2025-06-16");

      const count = storage.gamification.getFreezesThisWeek(
        "profile-1",
        "2025-06-17", // Tuesday of the week starting 2025-06-16
      );
      expect(count).toBe(1);
    });

    it("returns 0 when no freezes exist", () => {
      const count = storage.gamification.getFreezesThisWeek(
        "profile-1",
        "2025-06-17",
      );
      expect(count).toBe(0);
    });

    it("counts Sunday freeze as part of the ISO week (Mon-Sun)", () => {
      // 2025-06-16 is Monday, 2025-06-22 is Sunday of the same week
      storage.gamification.recordFreeze("profile-1", "2025-06-22");

      const count = storage.gamification.getFreezesThisWeek(
        "profile-1",
        "2025-06-16",
      );
      expect(count).toBe(1);
    });
  });
});

// ──────────────────── StreakCalculator ────────────────────

describe("StreakCalculator", () => {
  let storage: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    storage = new Storage();
  });

  afterEach(() => {
    storage.close();
    vi.useRealTimers();
  });

  describe("calculate()", () => {
    it("returns 0 streak with no data", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      const info = storage.streaks.calculate("profile-1");
      expect(info.currentStreak).toBe(0);
      expect(info.longestStreak).toBe(0);
      expect(info.lastActiveDate).toBeNull();
    });

    it("counts consecutive days from today", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      // Insert stats for 3 consecutive days ending today
      storage.stats.upsert(
        makeStats({ date: "2025-06-13", sessionsCompleted: 1 }),
      );
      storage.stats.upsert(
        makeStats({ date: "2025-06-14", sessionsCompleted: 2 }),
      );
      storage.stats.upsert(
        makeStats({ date: "2025-06-15", sessionsCompleted: 1 }),
      );

      const info = storage.streaks.calculate("profile-1");
      expect(info.currentStreak).toBe(3);
      expect(info.longestStreak).toBe(3);
    });

    it("streak is 0 when most recent day is not today", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      // Only yesterday and day before
      storage.stats.upsert(
        makeStats({ date: "2025-06-13", sessionsCompleted: 1 }),
      );

      const info = storage.streaks.calculate("profile-1");
      // 2025-06-15 (today) has no activity, streak breaks immediately
      expect(info.currentStreak).toBe(0);
    });

    it("freeze days count toward streak", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.stats.upsert(
        makeStats({ date: "2025-06-13", sessionsCompleted: 1 }),
      );
      // 2025-06-14 is a freeze day (no session, but frozen)
      storage.gamification.recordFreeze("profile-1", "2025-06-14");
      storage.stats.upsert(
        makeStats({ date: "2025-06-15", sessionsCompleted: 1 }),
      );

      const info = storage.streaks.calculate("profile-1");
      expect(info.currentStreak).toBe(3);
    });

    it("streak breaks on gap day (neither active nor frozen)", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.stats.upsert(
        makeStats({ date: "2025-06-12", sessionsCompleted: 1 }),
      );
      storage.stats.upsert(
        makeStats({ date: "2025-06-13", sessionsCompleted: 1 }),
      );
      // 2025-06-14 is a gap (no session, no freeze)
      storage.stats.upsert(
        makeStats({ date: "2025-06-15", sessionsCompleted: 1 }),
      );

      const info = storage.streaks.calculate("profile-1");
      // Current streak is just today (2025-06-15)
      expect(info.currentStreak).toBe(1);
      // Longest streak is the earlier run (2025-06-12 + 2025-06-13 = 2)
      expect(info.longestStreak).toBe(2);
    });

    it("tracks longest streak separately from current", () => {
      vi.setSystemTime(new Date("2025-06-20T12:00:00"));

      // First run: 5 consecutive days
      for (let d = 1; d <= 5; d++) {
        storage.stats.upsert(
          makeStats({
            date: `2025-06-0${String(d)}`,
            sessionsCompleted: 1,
          }),
        );
      }
      // Gap on 2025-06-06 through 2025-06-18
      // Second run: 2 days ending today
      storage.stats.upsert(
        makeStats({ date: "2025-06-19", sessionsCompleted: 1 }),
      );
      storage.stats.upsert(
        makeStats({ date: "2025-06-20", sessionsCompleted: 1 }),
      );

      const info = storage.streaks.calculate("profile-1");
      expect(info.currentStreak).toBe(2);
      expect(info.longestStreak).toBe(5);
    });

    it("returns correct lastActiveDate", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.stats.upsert(
        makeStats({ date: "2025-06-10", sessionsCompleted: 1 }),
      );
      storage.stats.upsert(
        makeStats({ date: "2025-06-14", sessionsCompleted: 2 }),
      );

      const info = storage.streaks.calculate("profile-1");
      expect(info.lastActiveDate).toBe("2025-06-14");
    });

    it("returns freezeAvailable based on weekly freeze count", () => {
      vi.setSystemTime(new Date("2025-06-18T12:00:00")); // Wednesday

      const info = storage.streaks.calculate("profile-1");
      expect(info.freezeAvailable).toBe(true);
      expect(info.freezesUsedThisWeek).toBe(0);
    });

    it("freezeAvailable is false when weekly limit reached", () => {
      // 2025-06-16 is a Monday
      vi.setSystemTime(new Date("2025-06-18T12:00:00")); // Wednesday

      storage.gamification.recordFreeze("profile-1", "2025-06-17");

      const info = storage.streaks.calculate("profile-1");
      expect(info.freezeAvailable).toBe(false);
      expect(info.freezesUsedThisWeek).toBe(1);
    });

    it("ignores sessions with sessionsCompleted = 0", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.stats.upsert(
        makeStats({ date: "2025-06-14", sessionsCompleted: 1 }),
      );
      storage.stats.upsert(
        makeStats({ date: "2025-06-15", sessionsCompleted: 0 }),
      );

      const info = storage.streaks.calculate("profile-1");
      // Today has 0 completions, so streak doesn't include today
      expect(info.currentStreak).toBe(0);
    });
  });

  describe("useFreeze()", () => {
    it("returns true on first use", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      const result = storage.streaks.useFreeze("profile-1");
      expect(result).toBe(true);
    });

    it("returns false on duplicate use (same day)", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.streaks.useFreeze("profile-1");
      const result = storage.streaks.useFreeze("profile-1");
      expect(result).toBe(false);
    });

    it("respects weekly limit (max 1 per week)", () => {
      // 2025-06-16 is a Monday
      vi.setSystemTime(new Date("2025-06-16T12:00:00"));
      storage.streaks.useFreeze("profile-1"); // Monday → true

      // Move to Tuesday same week
      vi.setSystemTime(new Date("2025-06-17T12:00:00"));
      const result = storage.streaks.useFreeze("profile-1");
      expect(result).toBe(false); // weekly limit reached
    });

    it("allows freeze in a new week after limit was reached", () => {
      // 2025-06-16 is a Monday
      vi.setSystemTime(new Date("2025-06-16T12:00:00"));
      storage.streaks.useFreeze("profile-1"); // Monday → true

      // Move to next Monday (2025-06-23)
      vi.setSystemTime(new Date("2025-06-23T12:00:00"));
      const result = storage.streaks.useFreeze("profile-1");
      expect(result).toBe(true); // new week, new budget
    });

    it("creates a freeze record in the database", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.streaks.useFreeze("profile-1");
      const freezes = storage.gamification.getAllFreezes("profile-1");
      expect(freezes).toHaveLength(1);
      expect(freezes[0]!.date).toBe("2025-06-15");
    });
  });

  describe("isTodayActive()", () => {
    it("returns true if sessions_completed > 0 today", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.stats.upsert(
        makeStats({ date: "2025-06-15", sessionsCompleted: 2 }),
      );

      expect(storage.streaks.isTodayActive("profile-1")).toBe(true);
    });

    it("returns false if no stats for today", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      expect(storage.streaks.isTodayActive("profile-1")).toBe(false);
    });

    it("returns false if sessions_completed is 0 today", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.stats.upsert(
        makeStats({ date: "2025-06-15", sessionsCompleted: 0 }),
      );

      expect(storage.streaks.isTodayActive("profile-1")).toBe(false);
    });

    it("only checks the current day, not other days", () => {
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));

      storage.stats.upsert(
        makeStats({ date: "2025-06-14", sessionsCompleted: 5 }),
      );

      expect(storage.streaks.isTodayActive("profile-1")).toBe(false);
    });
  });

  describe("getMilestones()", () => {
    it("returns no milestones reached for streak of 0", () => {
      const milestones = storage.streaks.getMilestones(0);
      expect(milestones).toEqual([
        { milestone: 7, reached: false },
        { milestone: 30, reached: false },
        { milestone: 100, reached: false },
        { milestone: 365, reached: false },
      ]);
    });

    it("returns first milestone reached for streak of 7", () => {
      const milestones = storage.streaks.getMilestones(7);
      expect(milestones[0]).toEqual({ milestone: 7, reached: true });
      expect(milestones[1]).toEqual({ milestone: 30, reached: false });
      expect(milestones[2]).toEqual({ milestone: 100, reached: false });
      expect(milestones[3]).toEqual({ milestone: 365, reached: false });
    });

    it("returns first two milestones reached for streak of 30", () => {
      const milestones = storage.streaks.getMilestones(30);
      expect(milestones[0]!.reached).toBe(true);
      expect(milestones[1]!.reached).toBe(true);
      expect(milestones[2]!.reached).toBe(false);
      expect(milestones[3]!.reached).toBe(false);
    });

    it("returns all milestones reached for streak of 365", () => {
      const milestones = storage.streaks.getMilestones(365);
      expect(milestones.every((m) => m.reached)).toBe(true);
    });

    it("returns all milestones reached for streak exceeding 365", () => {
      const milestones = storage.streaks.getMilestones(500);
      expect(milestones.every((m) => m.reached)).toBe(true);
    });

    it("returns correct structure with 4 milestone entries", () => {
      const milestones = storage.streaks.getMilestones(50);
      expect(milestones).toHaveLength(4);
      expect(milestones.map((m) => m.milestone)).toEqual([7, 30, 100, 365]);
    });
  });
});
