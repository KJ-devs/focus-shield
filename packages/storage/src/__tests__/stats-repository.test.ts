import type { DailyStats, Distractor } from "@focus-shield/shared-types";
import { createDatabase } from "../database";
import type { DatabaseAdapter } from "../database";
import { runMigrations } from "../migrations";
import { allMigrations } from "../schema";
import { StatsRepository } from "../repositories/stats-repository";

function makeStats(overrides?: Partial<DailyStats>): DailyStats {
  return {
    date: "2025-06-15",
    profileId: "profile-1",
    totalFocusMinutes: 180,
    totalBreakMinutes: 45,
    sessionsCompleted: 3,
    sessionsAborted: 1,
    distractionAttempts: 12,
    topDistractors: [
      { target: "reddit.com", count: 5 },
      { target: "twitter.com", count: 4 },
      { target: "youtube.com", count: 3 },
    ] as Distractor[],
    averageFocusScore: 82.5,
    streakDay: 7,
    ...overrides,
  };
}

describe("StatsRepository", () => {
  let db: DatabaseAdapter;
  let repo: StatsRepository;

  beforeEach(() => {
    db = createDatabase();
    runMigrations(db, allMigrations);
    repo = new StatsRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("upsert()", () => {
    it("creates a new stats entry", () => {
      const stats = makeStats();
      expect(() => repo.upsert(stats)).not.toThrow();

      const result = repo.getByDate("2025-06-15", "profile-1");
      expect(result).toBeDefined();
    });

    it("creates entry with all fields correctly stored", () => {
      repo.upsert(makeStats());
      const result = repo.getByDate("2025-06-15", "profile-1")!;

      expect(result.date).toBe("2025-06-15");
      expect(result.profileId).toBe("profile-1");
      expect(result.totalFocusMinutes).toBe(180);
      expect(result.totalBreakMinutes).toBe(45);
      expect(result.sessionsCompleted).toBe(3);
      expect(result.sessionsAborted).toBe(1);
      expect(result.distractionAttempts).toBe(12);
      expect(result.averageFocusScore).toBe(82.5);
      expect(result.streakDay).toBe(7);
    });

    it("updates an existing entry when same date+profileId", () => {
      repo.upsert(makeStats());

      // Upsert with updated values
      repo.upsert(
        makeStats({
          totalFocusMinutes: 240,
          sessionsCompleted: 5,
          averageFocusScore: 90.0,
        }),
      );

      const result = repo.getByDate("2025-06-15", "profile-1")!;
      expect(result.totalFocusMinutes).toBe(240);
      expect(result.sessionsCompleted).toBe(5);
      expect(result.averageFocusScore).toBe(90.0);
    });

    it("upsert only affects the matching date+profileId combination", () => {
      repo.upsert(makeStats({ date: "2025-06-15", profileId: "profile-1" }));
      repo.upsert(makeStats({ date: "2025-06-16", profileId: "profile-1", totalFocusMinutes: 100 }));

      // Update only the first one
      repo.upsert(
        makeStats({
          date: "2025-06-15",
          profileId: "profile-1",
          totalFocusMinutes: 300,
        }),
      );

      const day15 = repo.getByDate("2025-06-15", "profile-1")!;
      const day16 = repo.getByDate("2025-06-16", "profile-1")!;

      expect(day15.totalFocusMinutes).toBe(300);
      expect(day16.totalFocusMinutes).toBe(100);
    });

    it("treats different profileIds as separate entries for the same date", () => {
      repo.upsert(
        makeStats({ date: "2025-06-15", profileId: "p1", totalFocusMinutes: 100 }),
      );
      repo.upsert(
        makeStats({ date: "2025-06-15", profileId: "p2", totalFocusMinutes: 200 }),
      );

      const p1 = repo.getByDate("2025-06-15", "p1")!;
      const p2 = repo.getByDate("2025-06-15", "p2")!;

      expect(p1.totalFocusMinutes).toBe(100);
      expect(p2.totalFocusMinutes).toBe(200);
    });
  });

  describe("topDistractors JSON serialization", () => {
    it("roundtrips topDistractors array correctly", () => {
      const distractors: Distractor[] = [
        { target: "reddit.com", count: 5 },
        { target: "twitter.com", count: 4 },
        { target: "youtube.com", count: 3 },
      ];
      repo.upsert(makeStats({ topDistractors: distractors }));
      const result = repo.getByDate("2025-06-15", "profile-1")!;

      expect(Array.isArray(result.topDistractors)).toBe(true);
      expect(result.topDistractors).toHaveLength(3);
      expect(result.topDistractors).toEqual(distractors);
    });

    it("handles empty topDistractors array", () => {
      repo.upsert(makeStats({ topDistractors: [] }));
      const result = repo.getByDate("2025-06-15", "profile-1")!;

      expect(result.topDistractors).toEqual([]);
    });

    it("handles single distractor", () => {
      const distractors: Distractor[] = [{ target: "facebook.com", count: 10 }];
      repo.upsert(makeStats({ topDistractors: distractors }));
      const result = repo.getByDate("2025-06-15", "profile-1")!;

      expect(result.topDistractors).toEqual(distractors);
    });

    it("preserves topDistractors after upsert update", () => {
      repo.upsert(
        makeStats({
          topDistractors: [{ target: "reddit.com", count: 5 }],
        }),
      );

      // Update with new distractors
      repo.upsert(
        makeStats({
          topDistractors: [
            { target: "tiktok.com", count: 8 },
            { target: "discord.com", count: 3 },
          ],
        }),
      );

      const result = repo.getByDate("2025-06-15", "profile-1")!;
      expect(result.topDistractors).toHaveLength(2);
      expect(result.topDistractors[0]).toEqual({
        target: "tiktok.com",
        count: 8,
      });
    });
  });

  describe("getByDate()", () => {
    it("returns stats for matching date and profile", () => {
      repo.upsert(makeStats());
      const result = repo.getByDate("2025-06-15", "profile-1");

      expect(result).toBeDefined();
      expect(result!.date).toBe("2025-06-15");
      expect(result!.profileId).toBe("profile-1");
    });

    it("returns undefined for non-existent date", () => {
      repo.upsert(makeStats());
      const result = repo.getByDate("2099-01-01", "profile-1");
      expect(result).toBeUndefined();
    });

    it("returns undefined for non-existent profileId", () => {
      repo.upsert(makeStats());
      const result = repo.getByDate("2025-06-15", "nonexistent");
      expect(result).toBeUndefined();
    });

    it("returns undefined when both date and profileId do not match", () => {
      repo.upsert(makeStats());
      const result = repo.getByDate("2099-01-01", "nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getRange()", () => {
    beforeEach(() => {
      repo.upsert(makeStats({ date: "2025-06-10", totalFocusMinutes: 100 }));
      repo.upsert(makeStats({ date: "2025-06-12", totalFocusMinutes: 120 }));
      repo.upsert(makeStats({ date: "2025-06-14", totalFocusMinutes: 140 }));
      repo.upsert(makeStats({ date: "2025-06-16", totalFocusMinutes: 160 }));
      repo.upsert(makeStats({ date: "2025-06-18", totalFocusMinutes: 180 }));
    });

    it("returns stats within the date range (inclusive)", () => {
      const results = repo.getRange("2025-06-12", "2025-06-16", "profile-1");
      expect(results).toHaveLength(3);
      expect(results[0]!.date).toBe("2025-06-12");
      expect(results[1]!.date).toBe("2025-06-14");
      expect(results[2]!.date).toBe("2025-06-16");
    });

    it("returns results sorted by date ascending", () => {
      const results = repo.getRange("2025-06-10", "2025-06-18", "profile-1");
      for (let i = 1; i < results.length; i++) {
        expect(results[i]!.date > results[i - 1]!.date).toBe(true);
      }
    });

    it("returns empty array when no stats in range", () => {
      const results = repo.getRange("2025-07-01", "2025-07-31", "profile-1");
      expect(results).toEqual([]);
    });

    it("returns single result when range matches exactly one date", () => {
      const results = repo.getRange("2025-06-14", "2025-06-14", "profile-1");
      expect(results).toHaveLength(1);
      expect(results[0]!.date).toBe("2025-06-14");
    });

    it("filters by profileId", () => {
      repo.upsert(
        makeStats({
          date: "2025-06-12",
          profileId: "profile-2",
          totalFocusMinutes: 999,
        }),
      );

      const results = repo.getRange("2025-06-10", "2025-06-18", "profile-1");
      expect(results.every((s) => s.profileId === "profile-1")).toBe(true);
    });
  });

  describe("getAll()", () => {
    it("returns all stats for a profile", () => {
      repo.upsert(makeStats({ date: "2025-06-10" }));
      repo.upsert(makeStats({ date: "2025-06-11" }));
      repo.upsert(makeStats({ date: "2025-06-12" }));

      const results = repo.getAll("profile-1");
      expect(results).toHaveLength(3);
    });

    it("returns results sorted by date ascending", () => {
      repo.upsert(makeStats({ date: "2025-06-15" }));
      repo.upsert(makeStats({ date: "2025-06-10" }));
      repo.upsert(makeStats({ date: "2025-06-12" }));

      const results = repo.getAll("profile-1");
      expect(results[0]!.date).toBe("2025-06-10");
      expect(results[1]!.date).toBe("2025-06-12");
      expect(results[2]!.date).toBe("2025-06-15");
    });

    it("returns empty array for profile with no stats", () => {
      repo.upsert(makeStats({ profileId: "profile-1" }));
      const results = repo.getAll("profile-other");
      expect(results).toEqual([]);
    });

    it("only returns stats for the specified profile", () => {
      repo.upsert(makeStats({ date: "2025-06-10", profileId: "p1" }));
      repo.upsert(makeStats({ date: "2025-06-11", profileId: "p2" }));
      repo.upsert(makeStats({ date: "2025-06-12", profileId: "p1" }));

      const results = repo.getAll("p1");
      expect(results).toHaveLength(2);
      expect(results.every((s) => s.profileId === "p1")).toBe(true);
    });

    it("returns all fields properly deserialized", () => {
      repo.upsert(makeStats());
      const results = repo.getAll("profile-1");

      expect(results).toHaveLength(1);
      expect(Array.isArray(results[0]!.topDistractors)).toBe(true);
      expect(typeof results[0]!.totalFocusMinutes).toBe("number");
      expect(typeof results[0]!.averageFocusScore).toBe("number");
    });
  });
});
