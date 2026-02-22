import type {
  Session,
  SessionRun,
  DailyStats,
  BlocklistPreset,
  Profile,
} from "@focus-shield/shared-types";
import { Storage } from "../storage";
import type { DataExporter, ExportOptions } from "../exporter";

/**
 * Helper: create a profile for test data.
 */
function makeProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: "profile-1",
    name: "Work",
    icon: "briefcase",
    defaultLockLevel: 2,
    defaultBlocklists: ["social"],
    dailyFocusGoal: 240,
    weeklyFocusGoal: 1200,
    createdAt: new Date("2025-06-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Helper: create a session for test data.
 */
function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: "session-1",
    name: "Morning Focus",
    blocks: [{ type: "focus", duration: 25, blockingEnabled: true }],
    lockLevel: 2,
    blocklist: "social",
    autoStart: false,
    profileId: "profile-1",
    notifications: {
      onBlockStart: true,
      onBlockEnd: true,
      halfwayReminder: false,
      onAttemptedDistraction: true,
    },
    createdAt: new Date("2025-06-01T09:00:00.000Z"),
    updatedAt: new Date("2025-06-01T09:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Helper: create a session run for test data.
 */
function makeRun(overrides?: Partial<SessionRun>): SessionRun {
  return {
    id: "run-1",
    sessionId: "session-1",
    profileId: "profile-1",
    startedAt: new Date("2025-06-15T10:00:00.000Z"),
    endedAt: new Date("2025-06-15T10:25:00.000Z"),
    status: "completed",
    currentBlockIndex: 0,
    tokenHash: "$argon2id$hash",
    distractionAttempts: [
      {
        timestamp: new Date("2025-06-15T10:05:00.000Z"),
        type: "domain",
        target: "reddit.com",
        blocked: true,
      },
    ],
    unlockAttempts: [],
    focusScore: 85,
    totalFocusMinutes: 25,
    totalBreakMinutes: 0,
    ...overrides,
  };
}

/**
 * Helper: create a blocklist for test data.
 */
function makeBlocklist(overrides?: Partial<BlocklistPreset>): BlocklistPreset {
  return {
    id: "bl-1",
    name: "Social Media",
    icon: "social",
    category: "social",
    domains: [{ pattern: "*.reddit.com", type: "block" }],
    processes: [{ name: "discord", aliases: ["Discord.exe"], action: "kill" }],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Helper: create daily stats for test data.
 */
function makeDailyStats(overrides?: Partial<DailyStats>): DailyStats {
  return {
    date: "2025-06-15",
    profileId: "profile-1",
    totalFocusMinutes: 120,
    totalBreakMinutes: 30,
    sessionsCompleted: 4,
    sessionsAborted: 1,
    distractionAttempts: 10,
    topDistractors: [{ target: "reddit.com", count: 5 }],
    averageFocusScore: 82,
    streakDay: 3,
    ...overrides,
  };
}

describe("DataExporter", () => {
  let storage: Storage;
  let exporter: DataExporter;

  beforeEach(() => {
    storage = new Storage();
    exporter = storage.exporter;
  });

  afterEach(() => {
    storage.close();
  });

  /**
   * Seed the database with a profile, session, session run, daily stats, and blocklist.
   */
  function seedData(): void {
    storage.profiles.create(makeProfile());
    storage.sessions.create(makeSession());
    storage.sessionRuns.create(makeRun());
    storage.stats.upsert(makeDailyStats());
    storage.blocklists.create(makeBlocklist());
  }

  // ─── exportSessionRuns ──────────────────────────────────────────────

  describe("exportSessionRuns()", () => {
    describe("JSON format", () => {
      it("produces valid JSON with correct fields", () => {
        seedData();
        const options: ExportOptions = { format: "json" };
        const output = exporter.exportSessionRuns(options);

        const parsed = JSON.parse(output) as Record<string, unknown>[];
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(1);

        const run = parsed[0]!;
        expect(run).toHaveProperty("id", "run-1");
        expect(run).toHaveProperty("session_id", "session-1");
        expect(run).toHaveProperty("profile_id", "profile-1");
        expect(run).toHaveProperty("status", "completed");
        expect(run).toHaveProperty("total_focus_minutes", 25);
        expect(run).toHaveProperty("total_break_minutes", 0);
        expect(run).toHaveProperty("focus_score", 85);
      });

      it("returns empty array JSON for no data", () => {
        const options: ExportOptions = { format: "json" };
        const output = exporter.exportSessionRuns(options);
        const parsed = JSON.parse(output) as unknown[];
        expect(parsed).toEqual([]);
      });
    });

    describe("CSV format", () => {
      it("has header row and correct data rows", () => {
        seedData();
        const options: ExportOptions = { format: "csv" };
        const output = exporter.exportSessionRuns(options);

        const lines = output.split("\n");
        expect(lines.length).toBeGreaterThanOrEqual(2);

        // Header
        const header = lines[0]!;
        expect(header).toContain("id");
        expect(header).toContain("session_id");
        expect(header).toContain("profile_id");
        expect(header).toContain("status");
        expect(header).toContain("total_focus_minutes");

        // Data row
        const dataLine = lines[1]!;
        expect(dataLine).toContain("run-1");
        expect(dataLine).toContain("session-1");
        expect(dataLine).toContain("completed");
      });

      it("returns header-only CSV when no data", () => {
        const options: ExportOptions = { format: "csv" };
        const output = exporter.exportSessionRuns(options);

        const lines = output.split("\n");
        expect(lines).toHaveLength(1); // header only
        expect(lines[0]).toContain("id");
      });
    });
  });

  // ─── exportDailyStats ──────────────────────────────────────────────

  describe("exportDailyStats()", () => {
    it("exports daily stats in JSON format", () => {
      seedData();
      const options: ExportOptions = { format: "json" };
      const output = exporter.exportDailyStats(options);

      const parsed = JSON.parse(output) as Record<string, unknown>[];
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty("date", "2025-06-15");
      expect(parsed[0]).toHaveProperty("total_focus_minutes", 120);
      expect(parsed[0]).toHaveProperty("sessions_completed", 4);
    });

    it("exports daily stats in CSV format", () => {
      seedData();
      const options: ExportOptions = { format: "csv" };
      const output = exporter.exportDailyStats(options);

      const lines = output.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain("date");
      expect(lines[0]).toContain("total_focus_minutes");
      expect(lines[1]).toContain("2025-06-15");
    });
  });

  // ─── exportAll ──────────────────────────────────────────────────────

  describe("exportAll()", () => {
    it("contains all tables in JSON format", () => {
      seedData();
      const options: ExportOptions = { format: "json" };
      const output = exporter.exportAll(options);

      const parsed = JSON.parse(output) as Record<string, unknown[]>;
      expect(parsed).toHaveProperty("sessions");
      expect(parsed).toHaveProperty("sessionRuns");
      expect(parsed).toHaveProperty("dailyStats");
      expect(parsed).toHaveProperty("blocklists");
      expect(parsed).toHaveProperty("profiles");

      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessionRuns).toHaveLength(1);
      expect(parsed.dailyStats).toHaveLength(1);
      expect(parsed.blocklists).toHaveLength(1);
      expect(parsed.profiles).toHaveLength(1);
    });

    it("has section headers in CSV format", () => {
      seedData();
      const options: ExportOptions = { format: "csv" };
      const output = exporter.exportAll(options);

      expect(output).toContain("# sessions");
      expect(output).toContain("# session_runs");
      expect(output).toContain("# daily_stats");
      expect(output).toContain("# blocklists");
      expect(output).toContain("# profiles");
    });

    it("returns empty sections for no data in JSON", () => {
      const options: ExportOptions = { format: "json" };
      const output = exporter.exportAll(options);

      const parsed = JSON.parse(output) as Record<string, unknown[]>;
      expect(parsed.sessions).toEqual([]);
      expect(parsed.sessionRuns).toEqual([]);
      expect(parsed.dailyStats).toEqual([]);
      expect(parsed.blocklists).toEqual([]);
      expect(parsed.profiles).toEqual([]);
    });
  });

  // ─── CSV escaping ──────────────────────────────────────────────────

  describe("CSV escaping", () => {
    it("handles commas in values", () => {
      storage.profiles.create(makeProfile());
      storage.sessions.create(
        makeSession({ name: "Work, Deep Focus" }),
      );

      const options: ExportOptions = { format: "csv" };
      const output = exporter.exportAll(options);

      // The name with a comma should be wrapped in quotes
      expect(output).toContain('"Work, Deep Focus"');
    });

    it("handles double quotes in values", () => {
      storage.profiles.create(makeProfile());
      storage.sessions.create(
        makeSession({ name: 'Say "Hello"' }),
      );

      const options: ExportOptions = { format: "csv" };
      const output = exporter.exportAll(options);

      // Double quotes should be escaped by doubling them
      expect(output).toContain('"Say ""Hello"""');
    });

    it("handles newlines in values", () => {
      storage.profiles.create(makeProfile());
      storage.sessions.create(
        makeSession({ name: "Line1\nLine2" }),
      );

      const options: ExportOptions = { format: "csv" };
      const output = exporter.exportAll(options);

      // Value with newline should be wrapped in quotes
      expect(output).toContain('"Line1\nLine2"');
    });
  });

  // ─── Date range filtering ──────────────────────────────────────────

  describe("date range filtering", () => {
    beforeEach(() => {
      storage.profiles.create(makeProfile());
      storage.sessions.create(makeSession());

      // Insert runs on different dates
      storage.sessionRuns.create(
        makeRun({
          id: "run-early",
          startedAt: new Date("2025-06-10T10:00:00.000Z"),
          endedAt: new Date("2025-06-10T10:25:00.000Z"),
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-mid",
          startedAt: new Date("2025-06-15T10:00:00.000Z"),
          endedAt: new Date("2025-06-15T10:25:00.000Z"),
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-late",
          startedAt: new Date("2025-06-20T10:00:00.000Z"),
          endedAt: new Date("2025-06-20T10:25:00.000Z"),
        }),
      );

      // Insert daily stats on different dates
      storage.stats.upsert(makeDailyStats({ date: "2025-06-10" }));
      storage.stats.upsert(makeDailyStats({ date: "2025-06-15" }));
      storage.stats.upsert(makeDailyStats({ date: "2025-06-20" }));
    });

    it("filters session runs by startDate and endDate", () => {
      const options: ExportOptions = {
        format: "json",
        startDate: "2025-06-12",
        endDate: "2025-06-18",
      };
      const output = exporter.exportSessionRuns(options);
      const parsed = JSON.parse(output) as Record<string, unknown>[];

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty("id", "run-mid");
    });

    it("filters daily stats by startDate and endDate", () => {
      const options: ExportOptions = {
        format: "json",
        startDate: "2025-06-12",
        endDate: "2025-06-18",
      };
      const output = exporter.exportDailyStats(options);
      const parsed = JSON.parse(output) as Record<string, unknown>[];

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty("date", "2025-06-15");
    });

    it("returns all data when no date range specified", () => {
      const options: ExportOptions = { format: "json" };
      const output = exporter.exportSessionRuns(options);
      const parsed = JSON.parse(output) as unknown[];

      expect(parsed).toHaveLength(3);
    });
  });

  // ─── Profile filtering ─────────────────────────────────────────────

  describe("profile filtering", () => {
    beforeEach(() => {
      storage.profiles.create(makeProfile({ id: "profile-1", name: "Work" }));
      storage.profiles.create(
        makeProfile({ id: "profile-2", name: "Study" }),
      );

      storage.sessions.create(
        makeSession({ id: "session-1", profileId: "profile-1" }),
      );
      storage.sessions.create(
        makeSession({ id: "session-2", profileId: "profile-2" }),
      );

      storage.sessionRuns.create(
        makeRun({
          id: "run-p1",
          sessionId: "session-1",
          profileId: "profile-1",
        }),
      );
      storage.sessionRuns.create(
        makeRun({
          id: "run-p2",
          sessionId: "session-2",
          profileId: "profile-2",
        }),
      );

      storage.stats.upsert(
        makeDailyStats({ profileId: "profile-1" }),
      );
      storage.stats.upsert(
        makeDailyStats({ profileId: "profile-2" }),
      );
    });

    it("filters session runs by profileId", () => {
      const options: ExportOptions = {
        format: "json",
        profileId: "profile-1",
      };
      const output = exporter.exportSessionRuns(options);
      const parsed = JSON.parse(output) as Record<string, unknown>[];

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty("profile_id", "profile-1");
    });

    it("filters daily stats by profileId", () => {
      const options: ExportOptions = {
        format: "json",
        profileId: "profile-2",
      };
      const output = exporter.exportDailyStats(options);
      const parsed = JSON.parse(output) as Record<string, unknown>[];

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty("profile_id", "profile-2");
    });

    it("filters sessions by profileId in exportAll", () => {
      const options: ExportOptions = {
        format: "json",
        profileId: "profile-1",
      };
      const output = exporter.exportAll(options);
      const parsed = JSON.parse(output) as Record<string, Record<string, unknown>[]>;

      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessionRuns).toHaveLength(1);
      expect(parsed.profiles).toHaveLength(1);
      expect(parsed.profiles![0]).toHaveProperty("id", "profile-1");
    });
  });

  // ─── Empty data ─────────────────────────────────────────────────────

  describe("empty data produces valid output", () => {
    it("exportSessionRuns JSON returns empty array", () => {
      const output = exporter.exportSessionRuns({ format: "json" });
      expect(JSON.parse(output)).toEqual([]);
    });

    it("exportSessionRuns CSV returns header only", () => {
      const output = exporter.exportSessionRuns({ format: "csv" });
      const lines = output.split("\n");
      expect(lines).toHaveLength(1);
      expect(lines[0]!.length).toBeGreaterThan(0);
    });

    it("exportDailyStats JSON returns empty array", () => {
      const output = exporter.exportDailyStats({ format: "json" });
      expect(JSON.parse(output)).toEqual([]);
    });

    it("exportDailyStats CSV returns header only", () => {
      const output = exporter.exportDailyStats({ format: "csv" });
      const lines = output.split("\n");
      expect(lines).toHaveLength(1);
    });

    it("exportAll JSON returns empty arrays for all sections", () => {
      const output = exporter.exportAll({ format: "json" });
      const parsed = JSON.parse(output) as Record<string, unknown[]>;

      for (const key of Object.keys(parsed)) {
        expect(parsed[key]).toEqual([]);
      }
    });

    it("exportAll CSV has section headers even with no data", () => {
      const output = exporter.exportAll({ format: "csv" });

      expect(output).toContain("# sessions");
      expect(output).toContain("# session_runs");
      expect(output).toContain("# daily_stats");
      expect(output).toContain("# blocklists");
      expect(output).toContain("# profiles");
    });
  });
});
