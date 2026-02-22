import type {
  Session,
  SessionRun,
  BlocklistPreset,
  Profile,
  DailyStats,
} from "@focus-shield/shared-types";
import { Storage } from "../storage";
import { SessionRepository } from "../repositories/session-repository";
import { SessionRunRepository } from "../repositories/session-run-repository";
import { BlocklistRepository } from "../repositories/blocklist-repository";
import { ProfileRepository } from "../repositories/profile-repository";
import { StatsRepository } from "../repositories/stats-repository";

describe("Storage facade", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(); // in-memory
  });

  afterEach(() => {
    storage.close();
  });

  describe("constructor", () => {
    it("creates without error with no path (in-memory)", () => {
      const s = new Storage();
      expect(s).toBeDefined();
      s.close();
    });

    it("creates without error with explicit :memory: path", () => {
      const s = new Storage(":memory:");
      expect(s).toBeDefined();
      s.close();
    });

    it("runs migrations automatically (tables exist)", () => {
      // Verify we can insert into tables created by migrations
      const profile: Profile = {
        id: "p1",
        name: "Test",
        icon: "test",
        defaultLockLevel: 1,
        defaultBlocklists: [],
        dailyFocusGoal: 120,
        weeklyFocusGoal: 600,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      };

      expect(() => storage.profiles.create(profile)).not.toThrow();
    });
  });

  describe("repository instances", () => {
    it("exposes sessions repository", () => {
      expect(storage.sessions).toBeInstanceOf(SessionRepository);
    });

    it("exposes sessionRuns repository", () => {
      expect(storage.sessionRuns).toBeInstanceOf(SessionRunRepository);
    });

    it("exposes blocklists repository", () => {
      expect(storage.blocklists).toBeInstanceOf(BlocklistRepository);
    });

    it("exposes profiles repository", () => {
      expect(storage.profiles).toBeInstanceOf(ProfileRepository);
    });

    it("exposes stats repository", () => {
      expect(storage.stats).toBeInstanceOf(StatsRepository);
    });
  });

  describe("integration: full workflow", () => {
    it("creates a profile, session, session run, and stats, then retrieves all", () => {
      // 1. Create a profile
      const profile: Profile = {
        id: "profile-int",
        name: "Integration Test",
        icon: "test",
        defaultLockLevel: 2,
        defaultBlocklists: ["social"],
        dailyFocusGoal: 240,
        weeklyFocusGoal: 1200,
        createdAt: new Date("2025-06-01T00:00:00.000Z"),
      };
      storage.profiles.create(profile);

      // 2. Create a session
      const session: Session = {
        id: "session-int",
        name: "Focus Morning",
        blocks: [
          { type: "focus", duration: 25, blockingEnabled: true },
          { type: "break", duration: 5, blockingEnabled: false },
        ],
        lockLevel: 2,
        blocklist: "social",
        autoStart: false,
        profileId: "profile-int",
        notifications: {
          onBlockStart: true,
          onBlockEnd: true,
          halfwayReminder: false,
          onAttemptedDistraction: true,
        },
        createdAt: new Date("2025-06-01T09:00:00.000Z"),
        updatedAt: new Date("2025-06-01T09:00:00.000Z"),
      };
      storage.sessions.create(session);

      // 3. Create a session run
      const run: SessionRun = {
        id: "run-int",
        sessionId: "session-int",
        profileId: "profile-int",
        startedAt: new Date("2025-06-01T09:00:00.000Z"),
        status: "active",
        currentBlockIndex: 0,
        tokenHash: "$argon2id$v=19$hash",
        distractionAttempts: [
          {
            timestamp: new Date("2025-06-01T09:10:00.000Z"),
            type: "domain",
            target: "reddit.com",
            blocked: true,
          },
        ],
        unlockAttempts: [],
        totalFocusMinutes: 10,
        totalBreakMinutes: 0,
      };
      storage.sessionRuns.create(run);

      // 4. Create daily stats
      const stats: DailyStats = {
        date: "2025-06-01",
        profileId: "profile-int",
        totalFocusMinutes: 180,
        totalBreakMinutes: 40,
        sessionsCompleted: 3,
        sessionsAborted: 0,
        distractionAttempts: 5,
        topDistractors: [{ target: "reddit.com", count: 3 }],
        averageFocusScore: 88,
        streakDay: 1,
      };
      storage.stats.upsert(stats);

      // 5. Retrieve everything and verify
      const retrievedProfile = storage.profiles.getById("profile-int");
      expect(retrievedProfile).toBeDefined();
      expect(retrievedProfile!.name).toBe("Integration Test");

      const retrievedSession = storage.sessions.getById("session-int");
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.name).toBe("Focus Morning");
      expect(retrievedSession!.blocks).toHaveLength(2);

      const retrievedRun = storage.sessionRuns.getById("run-int");
      expect(retrievedRun).toBeDefined();
      expect(retrievedRun!.status).toBe("active");
      expect(retrievedRun!.distractionAttempts).toHaveLength(1);
      expect(retrievedRun!.distractionAttempts[0].timestamp).toBeInstanceOf(
        Date,
      );

      const retrievedStats = storage.stats.getByDate(
        "2025-06-01",
        "profile-int",
      );
      expect(retrievedStats).toBeDefined();
      expect(retrievedStats!.totalFocusMinutes).toBe(180);
      expect(retrievedStats!.topDistractors).toHaveLength(1);

      // 6. Verify cross-repo queries
      const sessionsByProfile =
        storage.sessions.getByProfileId("profile-int");
      expect(sessionsByProfile).toHaveLength(1);

      const runsBySession =
        storage.sessionRuns.getBySessionId("session-int");
      expect(runsBySession).toHaveLength(1);
    });

    it("creates a blocklist and retrieves it via multiple methods", () => {
      const blocklist: BlocklistPreset = {
        id: "bl-int",
        name: "Social Media",
        icon: "social",
        category: "social",
        domains: [
          { pattern: "*.facebook.com", type: "block" },
          { pattern: "*.twitter.com", type: "block" },
        ],
        processes: [
          {
            name: "discord",
            aliases: ["Discord.exe"],
            action: "kill",
          },
        ],
        isBuiltIn: true,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      };
      storage.blocklists.create(blocklist);

      expect(storage.blocklists.getById("bl-int")).toBeDefined();
      expect(storage.blocklists.getAll()).toHaveLength(1);
      expect(storage.blocklists.getByCategory("social")).toHaveLength(1);
      expect(storage.blocklists.getBuiltIn()).toHaveLength(1);
    });
  });

  describe("close()", () => {
    it("closes without error", () => {
      const s = new Storage();
      expect(() => s.close()).not.toThrow();
    });

    it("prevents further operations after close", () => {
      const s = new Storage();
      s.close();

      // Operations should throw after close
      expect(() =>
        s.profiles.create({
          id: "after-close",
          name: "Fail",
          icon: "x",
          defaultLockLevel: 1,
          defaultBlocklists: [],
          dailyFocusGoal: 0,
          weeklyFocusGoal: 0,
          createdAt: new Date(),
        }),
      ).toThrow();
    });
  });
});
