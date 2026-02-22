import type {
  Session,
  SessionRun,
  DailyStats,
} from "@focus-shield/shared-types";
import { Storage } from "../storage";
import type { StatsAggregator } from "../aggregator";

/**
 * Helper: create a minimal parent session to satisfy foreign key constraints.
 */
function makeSession(
  id: string,
  profileId: string = "profile-1",
): Session {
  return {
    id,
    name: `Session ${id}`,
    blocks: [{ type: "focus", duration: 25, blockingEnabled: true }],
    lockLevel: 1,
    blocklist: "custom",
    autoStart: false,
    profileId,
    notifications: {
      onBlockStart: true,
      onBlockEnd: true,
      halfwayReminder: false,
      onAttemptedDistraction: false,
    },
    createdAt: new Date("2025-06-01T09:00:00.000Z"),
    updatedAt: new Date("2025-06-01T09:00:00.000Z"),
  };
}

/**
 * Helper: create a session run with sensible defaults and easy overrides.
 */
function makeRun(overrides: Partial<SessionRun> & { id: string }): SessionRun {
  return {
    sessionId: "session-1",
    profileId: "profile-1",
    startedAt: new Date("2025-06-15T10:00:00.000Z"),
    status: "completed",
    currentBlockIndex: 0,
    tokenHash: "$argon2id$hash",
    distractionAttempts: [],
    unlockAttempts: [],
    totalFocusMinutes: 0,
    totalBreakMinutes: 0,
    ...overrides,
  };
}

describe("StatsAggregator", () => {
  let storage: Storage;
  let aggregator: StatsAggregator;

  beforeEach(() => {
    storage = new Storage(); // in-memory
    aggregator = storage.aggregator;

    // Insert a parent session for foreign key
    storage.sessions.create(makeSession("session-1", "profile-1"));
  });

  afterEach(() => {
    storage.close();
  });

  // ─── aggregateDay ───────────────────────────────────────────────────

  describe("aggregateDay()", () => {
    it("returns correct sums and counts from session runs", () => {
      // Two completed runs and one aborted run on the same day
      storage.sessionRuns.create(
        makeRun({
          id: "run-1",
          startedAt: new Date("2025-06-15T09:00:00.000Z"),
          status: "completed",
          totalFocusMinutes: 25,
          totalBreakMinutes: 5,
          focusScore: 80,
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-2",
          startedAt: new Date("2025-06-15T14:00:00.000Z"),
          status: "completed",
          totalFocusMinutes: 50,
          totalBreakMinutes: 10,
          focusScore: 90,
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-3",
          startedAt: new Date("2025-06-15T18:00:00.000Z"),
          status: "aborted",
          totalFocusMinutes: 10,
          totalBreakMinutes: 0,
        }),
      );

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");

      expect(result.date).toBe("2025-06-15");
      expect(result.profileId).toBe("profile-1");
      expect(result.totalFocusMinutes).toBe(85); // 25 + 50 + 10
      expect(result.totalBreakMinutes).toBe(15); // 5 + 10 + 0
      expect(result.sessionsCompleted).toBe(2);
      expect(result.sessionsAborted).toBe(1);
      expect(result.averageFocusScore).toBe(85); // (80 + 90) / 2
    });

    it("finds top distractors sorted by count descending", () => {
      storage.sessionRuns.create(
        makeRun({
          id: "run-1",
          startedAt: new Date("2025-06-15T09:00:00.000Z"),
          distractionAttempts: [
            {
              timestamp: new Date("2025-06-15T09:05:00.000Z"),
              type: "domain",
              target: "reddit.com",
              blocked: true,
            },
            {
              timestamp: new Date("2025-06-15T09:10:00.000Z"),
              type: "domain",
              target: "youtube.com",
              blocked: true,
            },
            {
              timestamp: new Date("2025-06-15T09:15:00.000Z"),
              type: "domain",
              target: "reddit.com",
              blocked: true,
            },
          ],
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-2",
          startedAt: new Date("2025-06-15T14:00:00.000Z"),
          distractionAttempts: [
            {
              timestamp: new Date("2025-06-15T14:05:00.000Z"),
              type: "domain",
              target: "twitter.com",
              blocked: true,
            },
            {
              timestamp: new Date("2025-06-15T14:10:00.000Z"),
              type: "domain",
              target: "reddit.com",
              blocked: true,
            },
          ],
        }),
      );

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");

      expect(result.distractionAttempts).toBe(5);
      expect(result.topDistractors).toHaveLength(3);
      // reddit.com: 3, youtube.com: 1, twitter.com: 1
      expect(result.topDistractors[0]).toEqual({
        target: "reddit.com",
        count: 3,
      });
      // The remaining two have count 1 each (order between them is secondary)
      const otherTargets = result.topDistractors.slice(1).map((d) => d.target);
      expect(otherTargets).toContain("youtube.com");
      expect(otherTargets).toContain("twitter.com");
    });

    it("limits topDistractors to 5 entries", () => {
      const attempts = Array.from({ length: 7 }, (_, i) => ({
        timestamp: new Date(`2025-06-15T09:${String(i).padStart(2, "0")}:00.000Z`),
        type: "domain" as const,
        target: `site${i}.com`,
        blocked: true,
      }));

      storage.sessionRuns.create(
        makeRun({
          id: "run-1",
          startedAt: new Date("2025-06-15T09:00:00.000Z"),
          distractionAttempts: attempts,
        }),
      );

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");
      expect(result.topDistractors.length).toBeLessThanOrEqual(5);
    });

    it("calculates streak correctly when previous days have completed sessions", () => {
      // Insert runs for 3 consecutive days
      for (let day = 13; day <= 15; day++) {
        const dateStr = `2025-06-${day}`;
        storage.sessionRuns.create(
          makeRun({
            id: `run-day-${day}`,
            startedAt: new Date(`${dateStr}T10:00:00.000Z`),
            status: "completed",
            totalFocusMinutes: 25,
          }),
        );
      }

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");
      // Day 15 with 14 and 13 also having completed runs = streak of 3
      expect(result.streakDay).toBe(3);
    });

    it("calculates streak using daily_stats fallback for earlier days", () => {
      // Insert daily_stats for earlier days (already aggregated)
      storage.stats.upsert({
        date: "2025-06-13",
        profileId: "profile-1",
        totalFocusMinutes: 50,
        totalBreakMinutes: 10,
        sessionsCompleted: 2,
        sessionsAborted: 0,
        distractionAttempts: 0,
        topDistractors: [],
        averageFocusScore: 80,
        streakDay: 1,
      });
      storage.stats.upsert({
        date: "2025-06-14",
        profileId: "profile-1",
        totalFocusMinutes: 30,
        totalBreakMinutes: 5,
        sessionsCompleted: 1,
        sessionsAborted: 0,
        distractionAttempts: 0,
        topDistractors: [],
        averageFocusScore: 85,
        streakDay: 2,
      });

      // Current day run
      storage.sessionRuns.create(
        makeRun({
          id: "run-today",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          status: "completed",
          totalFocusMinutes: 25,
        }),
      );

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");
      expect(result.streakDay).toBe(3);
    });

    it("returns streak 0 when current day has no completed sessions", () => {
      storage.sessionRuns.create(
        makeRun({
          id: "run-aborted",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          status: "aborted",
          totalFocusMinutes: 5,
        }),
      );

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");
      expect(result.streakDay).toBe(0);
    });

    it("handles no data gracefully (zeroed stats)", () => {
      const result = aggregator.aggregateDay("2025-06-15", "profile-1");

      expect(result.date).toBe("2025-06-15");
      expect(result.profileId).toBe("profile-1");
      expect(result.totalFocusMinutes).toBe(0);
      expect(result.totalBreakMinutes).toBe(0);
      expect(result.sessionsCompleted).toBe(0);
      expect(result.sessionsAborted).toBe(0);
      expect(result.distractionAttempts).toBe(0);
      expect(result.topDistractors).toEqual([]);
      expect(result.averageFocusScore).toBe(0);
      expect(result.streakDay).toBe(0);
    });

    it("ignores runs from other profiles", () => {
      storage.sessions.create(makeSession("session-2", "profile-2"));

      storage.sessionRuns.create(
        makeRun({
          id: "run-p1",
          sessionId: "session-1",
          profileId: "profile-1",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          totalFocusMinutes: 25,
          status: "completed",
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-p2",
          sessionId: "session-2",
          profileId: "profile-2",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          totalFocusMinutes: 50,
          status: "completed",
        }),
      );

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");
      expect(result.totalFocusMinutes).toBe(25);
      expect(result.sessionsCompleted).toBe(1);
    });

    it("ignores runs from other dates", () => {
      storage.sessionRuns.create(
        makeRun({
          id: "run-today",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          totalFocusMinutes: 25,
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-yesterday",
          startedAt: new Date("2025-06-14T10:00:00.000Z"),
          totalFocusMinutes: 50,
        }),
      );

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");
      expect(result.totalFocusMinutes).toBe(25);
    });

    it("rounds averageFocusScore to 2 decimal places", () => {
      storage.sessionRuns.create(
        makeRun({
          id: "run-1",
          startedAt: new Date("2025-06-15T09:00:00.000Z"),
          focusScore: 77,
          status: "completed",
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-2",
          startedAt: new Date("2025-06-15T14:00:00.000Z"),
          focusScore: 88,
          status: "completed",
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-3",
          startedAt: new Date("2025-06-15T18:00:00.000Z"),
          focusScore: 92,
          status: "completed",
        }),
      );

      const result = aggregator.aggregateDay("2025-06-15", "profile-1");
      // (77 + 88 + 92) / 3 = 85.6666...
      expect(result.averageFocusScore).toBe(85.67);
    });
  });

  // ─── aggregateWeek ──────────────────────────────────────────────────

  describe("aggregateWeek()", () => {
    beforeEach(() => {
      // Insert daily_stats for a week (Monday 2025-06-09 to Sunday 2025-06-15)
      const days: DailyStats[] = [
        {
          date: "2025-06-09",
          profileId: "profile-1",
          totalFocusMinutes: 120,
          totalBreakMinutes: 30,
          sessionsCompleted: 4,
          sessionsAborted: 1,
          distractionAttempts: 10,
          topDistractors: [{ target: "reddit.com", count: 5 }],
          averageFocusScore: 80,
          streakDay: 1,
        },
        {
          date: "2025-06-10",
          profileId: "profile-1",
          totalFocusMinutes: 90,
          totalBreakMinutes: 20,
          sessionsCompleted: 3,
          sessionsAborted: 0,
          distractionAttempts: 5,
          topDistractors: [],
          averageFocusScore: 85,
          streakDay: 2,
        },
        {
          date: "2025-06-11",
          profileId: "profile-1",
          totalFocusMinutes: 0,
          totalBreakMinutes: 0,
          sessionsCompleted: 0,
          sessionsAborted: 0,
          distractionAttempts: 0,
          topDistractors: [],
          averageFocusScore: 0,
          streakDay: 0,
        },
        {
          date: "2025-06-12",
          profileId: "profile-1",
          totalFocusMinutes: 60,
          totalBreakMinutes: 15,
          sessionsCompleted: 2,
          sessionsAborted: 0,
          distractionAttempts: 3,
          topDistractors: [],
          averageFocusScore: 90,
          streakDay: 1,
        },
      ];

      for (const day of days) {
        storage.stats.upsert(day);
      }
    });

    it("sums daily stats correctly", () => {
      const result = aggregator.aggregateWeek("2025-06-09", "profile-1");

      expect(result.weekStart).toBe("2025-06-09");
      expect(result.weekEnd).toBe("2025-06-15");
      expect(result.profileId).toBe("profile-1");
      expect(result.totalFocusMinutes).toBe(270); // 120 + 90 + 0 + 60
      expect(result.totalBreakMinutes).toBe(65); // 30 + 20 + 0 + 15
      expect(result.sessionsCompleted).toBe(9); // 4 + 3 + 0 + 2
      expect(result.sessionsAborted).toBe(1);
      expect(result.distractionAttempts).toBe(18); // 10 + 5 + 0 + 3
    });

    it("counts active days correctly", () => {
      const result = aggregator.aggregateWeek("2025-06-09", "profile-1");
      // Days with sessions: 06-09 (4+1), 06-10 (3+0), 06-12 (2+0) = 3 active days
      // 06-11 has no sessions (0 completed + 0 aborted)
      expect(result.activeDays).toBe(3);
    });

    it("calculates average focus score (ignoring zero-score days)", () => {
      const result = aggregator.aggregateWeek("2025-06-09", "profile-1");
      // Scores: 80, 85, 90 (day 06-11 has score 0 so excluded)
      // Average = (80 + 85 + 90) / 3 = 85
      expect(result.averageFocusScore).toBe(85);
    });

    it("calculates averageDailyFocusMinutes based on active days", () => {
      const result = aggregator.aggregateWeek("2025-06-09", "profile-1");
      // 270 total focus / 3 active days = 90
      expect(result.averageDailyFocusMinutes).toBe(90);
    });

    it("handles empty week with zeroed values", () => {
      const result = aggregator.aggregateWeek("2025-07-07", "profile-1");

      expect(result.totalFocusMinutes).toBe(0);
      expect(result.totalBreakMinutes).toBe(0);
      expect(result.sessionsCompleted).toBe(0);
      expect(result.sessionsAborted).toBe(0);
      expect(result.activeDays).toBe(0);
      expect(result.averageFocusScore).toBe(0);
      expect(result.averageDailyFocusMinutes).toBe(0);
    });
  });

  // ─── aggregateMonth ─────────────────────────────────────────────────

  describe("aggregateMonth()", () => {
    beforeEach(() => {
      // Insert daily_stats for parts of June 2025
      const days: DailyStats[] = [
        {
          date: "2025-06-01",
          profileId: "profile-1",
          totalFocusMinutes: 100,
          totalBreakMinutes: 20,
          sessionsCompleted: 3,
          sessionsAborted: 0,
          distractionAttempts: 8,
          topDistractors: [],
          averageFocusScore: 82,
          streakDay: 1,
        },
        {
          date: "2025-06-02",
          profileId: "profile-1",
          totalFocusMinutes: 80,
          totalBreakMinutes: 15,
          sessionsCompleted: 2,
          sessionsAborted: 1,
          distractionAttempts: 4,
          topDistractors: [],
          averageFocusScore: 75,
          streakDay: 2,
        },
        {
          date: "2025-06-03",
          profileId: "profile-1",
          totalFocusMinutes: 0,
          totalBreakMinutes: 0,
          sessionsCompleted: 0,
          sessionsAborted: 0,
          distractionAttempts: 0,
          topDistractors: [],
          averageFocusScore: 0,
          streakDay: 0,
        },
        {
          date: "2025-06-04",
          profileId: "profile-1",
          totalFocusMinutes: 120,
          totalBreakMinutes: 25,
          sessionsCompleted: 4,
          sessionsAborted: 0,
          distractionAttempts: 6,
          topDistractors: [],
          averageFocusScore: 91,
          streakDay: 1,
        },
        {
          date: "2025-06-05",
          profileId: "profile-1",
          totalFocusMinutes: 60,
          totalBreakMinutes: 10,
          sessionsCompleted: 2,
          sessionsAborted: 0,
          distractionAttempts: 2,
          topDistractors: [],
          averageFocusScore: 88,
          streakDay: 2,
        },
      ];

      for (const day of days) {
        storage.stats.upsert(day);
      }
    });

    it("sums monthly stats", () => {
      const result = aggregator.aggregateMonth("2025-06", "profile-1");

      expect(result.month).toBe("2025-06");
      expect(result.profileId).toBe("profile-1");
      expect(result.totalFocusMinutes).toBe(360); // 100 + 80 + 0 + 120 + 60
      expect(result.totalBreakMinutes).toBe(70); // 20 + 15 + 0 + 25 + 10
      expect(result.sessionsCompleted).toBe(11); // 3 + 2 + 0 + 4 + 2
      expect(result.sessionsAborted).toBe(1);
      expect(result.distractionAttempts).toBe(20); // 8 + 4 + 0 + 6 + 2
    });

    it("finds longest streak in month", () => {
      const result = aggregator.aggregateMonth("2025-06", "profile-1");
      // Day sequence: active, active, inactive, active, active
      // Streaks: [2], break, [2] — longest is 2
      expect(result.streakDays).toBe(2);
    });

    it("counts active days", () => {
      const result = aggregator.aggregateMonth("2025-06", "profile-1");
      // 4 active days (06-01, 06-02, 06-04, 06-05)
      expect(result.activeDays).toBe(4);
    });

    it("calculates average score excluding zero-score days", () => {
      const result = aggregator.aggregateMonth("2025-06", "profile-1");
      // Scores: 82, 75, 91, 88 (score 0 excluded)
      // Average = (82 + 75 + 91 + 88) / 4 = 84
      expect(result.averageFocusScore).toBe(84);
    });

    it("handles empty month with zeroed values", () => {
      const result = aggregator.aggregateMonth("2025-07", "profile-1");

      expect(result.totalFocusMinutes).toBe(0);
      expect(result.sessionsCompleted).toBe(0);
      expect(result.activeDays).toBe(0);
      expect(result.streakDays).toBe(0);
      expect(result.averageFocusScore).toBe(0);
    });

    it("finds longer streak when all days are active", () => {
      // Insert 5 more consecutive active days (10-14)
      for (let day = 10; day <= 14; day++) {
        storage.stats.upsert({
          date: `2025-06-${day}`,
          profileId: "profile-1",
          totalFocusMinutes: 30,
          totalBreakMinutes: 5,
          sessionsCompleted: 1,
          sessionsAborted: 0,
          distractionAttempts: 0,
          topDistractors: [],
          averageFocusScore: 80,
          streakDay: 1,
        });
      }

      const result = aggregator.aggregateMonth("2025-06", "profile-1");
      // Rows returned sorted by date (only rows that exist in daily_stats):
      //   06-01 active, 06-02 active, 06-03 inactive => streak breaks at 2
      //   06-04 active, 06-05 active, 06-10 active, 06-11 active, 06-12 active, 06-13 active, 06-14 active
      //   => 7 consecutive active rows (algorithm iterates over returned rows, not calendar days)
      // Longest streak = 7
      expect(result.streakDays).toBe(7);
    });
  });

  // ─── getPeakHours ───────────────────────────────────────────────────

  describe("getPeakHours()", () => {
    /**
     * getPeakHours uses new Date() internally with a lookback window,
     * so test data must use recent dates to fall within the window.
     */
    function recentDate(daysAgo: number, hour: number): Date {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setUTCHours(hour, 0, 0, 0);
      return d;
    }

    it("returns hours ranked by focus time", () => {
      // Create runs at different hours within the last 30 days
      storage.sessionRuns.create(
        makeRun({
          id: "run-morning",
          startedAt: recentDate(2, 9),
          totalFocusMinutes: 50,
          status: "completed",
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-afternoon",
          startedAt: recentDate(2, 14),
          totalFocusMinutes: 30,
          status: "completed",
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-morning-2",
          startedAt: recentDate(3, 9),
          totalFocusMinutes: 40,
          status: "completed",
        }),
      );

      const result = aggregator.getPeakHours("profile-1", 30);

      expect(result.length).toBeGreaterThanOrEqual(2);

      const hour9 = result.find((h) => h.hour === 9);
      const hour14 = result.find((h) => h.hour === 14);

      expect(hour9).toBeDefined();
      expect(hour14).toBeDefined();

      // Hour 9: (50 + 40) / 2 = 45 avg
      expect(hour9!.averageFocusMinutes).toBe(45);
      // Hour 14: 30 / 1 = 30 avg
      expect(hour14!.averageFocusMinutes).toBe(30);
    });

    it("returns empty array when no data exists", () => {
      const result = aggregator.getPeakHours("profile-1", 30);
      expect(result).toEqual([]);
    });

    it("filters by profile", () => {
      storage.sessions.create(makeSession("session-2", "profile-2"));

      storage.sessionRuns.create(
        makeRun({
          id: "run-p1",
          sessionId: "session-1",
          profileId: "profile-1",
          startedAt: recentDate(1, 9),
          totalFocusMinutes: 50,
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-p2",
          sessionId: "session-2",
          profileId: "profile-2",
          startedAt: recentDate(1, 9),
          totalFocusMinutes: 100,
        }),
      );

      const result = aggregator.getPeakHours("profile-1", 30);
      const hour9 = result.find((h) => h.hour === 9);

      expect(hour9).toBeDefined();
      expect(hour9!.averageFocusMinutes).toBe(50); // only profile-1's run
    });
  });

  // ─── recalculateRange ───────────────────────────────────────────────

  describe("recalculateRange()", () => {
    it("upserts daily stats for each day in range", () => {
      // Insert runs across multiple days
      storage.sessionRuns.create(
        makeRun({
          id: "run-day1",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          status: "completed",
          totalFocusMinutes: 25,
          totalBreakMinutes: 5,
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-day2",
          startedAt: new Date("2025-06-16T10:00:00.000Z"),
          status: "completed",
          totalFocusMinutes: 50,
          totalBreakMinutes: 10,
        }),
      );

      aggregator.recalculateRange("2025-06-15", "2025-06-17", "profile-1");

      const day1 = storage.stats.getByDate("2025-06-15", "profile-1");
      const day2 = storage.stats.getByDate("2025-06-16", "profile-1");
      const day3 = storage.stats.getByDate("2025-06-17", "profile-1");

      expect(day1).toBeDefined();
      expect(day1!.totalFocusMinutes).toBe(25);
      expect(day1!.sessionsCompleted).toBe(1);

      expect(day2).toBeDefined();
      expect(day2!.totalFocusMinutes).toBe(50);

      // Day 3 has no runs, should have zeroed stats
      expect(day3).toBeDefined();
      expect(day3!.totalFocusMinutes).toBe(0);
      expect(day3!.sessionsCompleted).toBe(0);
    });

    it("overwrites existing daily stats on re-calculation", () => {
      // Insert initial stats
      storage.stats.upsert({
        date: "2025-06-15",
        profileId: "profile-1",
        totalFocusMinutes: 999,
        totalBreakMinutes: 999,
        sessionsCompleted: 99,
        sessionsAborted: 0,
        distractionAttempts: 0,
        topDistractors: [],
        averageFocusScore: 0,
        streakDay: 0,
      });

      // Insert actual run data
      storage.sessionRuns.create(
        makeRun({
          id: "run-1",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          status: "completed",
          totalFocusMinutes: 25,
          totalBreakMinutes: 5,
        }),
      );

      aggregator.recalculateRange("2025-06-15", "2025-06-15", "profile-1");

      const stats = storage.stats.getByDate("2025-06-15", "profile-1");
      expect(stats).toBeDefined();
      expect(stats!.totalFocusMinutes).toBe(25);
      expect(stats!.sessionsCompleted).toBe(1);
    });

    it("handles single day range", () => {
      storage.sessionRuns.create(
        makeRun({
          id: "run-1",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          status: "completed",
          totalFocusMinutes: 25,
        }),
      );

      aggregator.recalculateRange("2025-06-15", "2025-06-15", "profile-1");

      const stats = storage.stats.getByDate("2025-06-15", "profile-1");
      expect(stats).toBeDefined();
      expect(stats!.totalFocusMinutes).toBe(25);
    });
  });
});
