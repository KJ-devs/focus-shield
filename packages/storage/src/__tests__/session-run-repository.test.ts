import type {
  Session,
  SessionRun,
  DistractionAttempt,
  UnlockAttempt,
} from "@focus-shield/shared-types";
import { createDatabase } from "../database";
import type { DatabaseAdapter } from "../database";
import { runMigrations } from "../migrations";
import { allMigrations } from "../schema";
import { SessionRepository } from "../repositories/session-repository";
import { SessionRunRepository } from "../repositories/session-run-repository";

/** Minimal session needed to satisfy foreign key on session_runs. */
function makeParentSession(id: string = "session-1"): Session {
  return {
    id,
    name: "Test Session",
    blocks: [{ type: "focus", duration: 25, blockingEnabled: true }],
    lockLevel: 1,
    blocklist: "custom",
    autoStart: false,
    profileId: "profile-1",
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

function makeSessionRun(overrides?: Partial<SessionRun>): SessionRun {
  return {
    id: "run-1",
    sessionId: "session-1",
    profileId: "profile-1",
    startedAt: new Date("2025-06-15T10:00:00.000Z"),
    status: "active",
    currentBlockIndex: 0,
    tokenHash: "$argon2id$hash_example_abc123",
    distractionAttempts: [],
    unlockAttempts: [],
    totalFocusMinutes: 0,
    totalBreakMinutes: 0,
    ...overrides,
  };
}

describe("SessionRunRepository", () => {
  let db: DatabaseAdapter;
  let repo: SessionRunRepository;
  let sessionRepo: SessionRepository;

  beforeEach(() => {
    db = createDatabase();
    runMigrations(db, allMigrations);
    sessionRepo = new SessionRepository(db);
    repo = new SessionRunRepository(db);

    // Insert parent session to satisfy foreign key
    sessionRepo.create(makeParentSession("session-1"));
  });

  afterEach(() => {
    db.close();
  });

  describe("create() and getById() roundtrip", () => {
    it("creates and retrieves a basic session run", () => {
      const run = makeSessionRun();
      repo.create(run);

      const result = repo.getById("run-1");
      expect(result).toBeDefined();
      expect(result!.id).toBe("run-1");
      expect(result!.sessionId).toBe("session-1");
      expect(result!.profileId).toBe("profile-1");
      expect(result!.status).toBe("active");
      expect(result!.currentBlockIndex).toBe(0);
      expect(result!.tokenHash).toBe("$argon2id$hash_example_abc123");
      expect(result!.totalFocusMinutes).toBe(0);
      expect(result!.totalBreakMinutes).toBe(0);
    });

    it("returns startedAt as a Date instance", () => {
      repo.create(makeSessionRun());
      const result = repo.getById("run-1")!;

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.startedAt.toISOString()).toBe("2025-06-15T10:00:00.000Z");
    });

    it("returns undefined for endedAt when not set", () => {
      repo.create(makeSessionRun());
      const result = repo.getById("run-1")!;

      expect(result.endedAt).toBeUndefined();
    });

    it("returns endedAt as a Date when set", () => {
      const endedAt = new Date("2025-06-15T11:30:00.000Z");
      repo.create(makeSessionRun({ endedAt }));
      const result = repo.getById("run-1")!;

      expect(result.endedAt).toBeInstanceOf(Date);
      expect(result.endedAt!.toISOString()).toBe("2025-06-15T11:30:00.000Z");
    });

    it("returns undefined for focusScore when not set", () => {
      repo.create(makeSessionRun());
      const result = repo.getById("run-1")!;

      expect(result.focusScore).toBeUndefined();
    });

    it("returns focusScore as a number when set", () => {
      repo.create(makeSessionRun({ focusScore: 87.5 }));
      const result = repo.getById("run-1")!;

      expect(result.focusScore).toBe(87.5);
    });

    it("returns undefined for non-existent ID", () => {
      const result = repo.getById("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("DistractionAttempts JSON serialization", () => {
    it("roundtrips empty distraction attempts", () => {
      repo.create(makeSessionRun({ distractionAttempts: [] }));
      const result = repo.getById("run-1")!;

      expect(result.distractionAttempts).toEqual([]);
      expect(Array.isArray(result.distractionAttempts)).toBe(true);
    });

    it("roundtrips distraction attempts with Date deserialization", () => {
      const attempts: DistractionAttempt[] = [
        {
          timestamp: new Date("2025-06-15T10:05:00.000Z"),
          type: "domain",
          target: "reddit.com",
          blocked: true,
        },
        {
          timestamp: new Date("2025-06-15T10:12:00.000Z"),
          type: "process",
          target: "discord",
          blocked: true,
        },
        {
          timestamp: new Date("2025-06-15T10:20:00.000Z"),
          type: "domain",
          target: "youtube.com",
          blocked: false,
        },
      ];

      repo.create(makeSessionRun({ distractionAttempts: attempts }));
      const result = repo.getById("run-1")!;

      expect(result.distractionAttempts).toHaveLength(3);

      // Verify each attempt's timestamp is a Date
      for (const attempt of result.distractionAttempts) {
        expect(attempt.timestamp).toBeInstanceOf(Date);
      }

      expect(result.distractionAttempts[0]!.timestamp.toISOString()).toBe(
        "2025-06-15T10:05:00.000Z",
      );
      expect(result.distractionAttempts[0]!.type).toBe("domain");
      expect(result.distractionAttempts[0]!.target).toBe("reddit.com");
      expect(result.distractionAttempts[0]!.blocked).toBe(true);

      expect(result.distractionAttempts[1]!.type).toBe("process");
      expect(result.distractionAttempts[1]!.target).toBe("discord");

      expect(result.distractionAttempts[2]!.blocked).toBe(false);
    });
  });

  describe("UnlockAttempts JSON serialization", () => {
    it("roundtrips empty unlock attempts", () => {
      repo.create(makeSessionRun({ unlockAttempts: [] }));
      const result = repo.getById("run-1")!;

      expect(result.unlockAttempts).toEqual([]);
      expect(Array.isArray(result.unlockAttempts)).toBe(true);
    });

    it("roundtrips unlock attempts with Date deserialization", () => {
      const attempts: UnlockAttempt[] = [
        {
          timestamp: new Date("2025-06-15T10:30:00.000Z"),
          method: "token",
          success: false,
        },
        {
          timestamp: new Date("2025-06-15T10:35:00.000Z"),
          method: "token",
          success: false,
        },
        {
          timestamp: new Date("2025-06-15T10:40:00.000Z"),
          method: "master_key",
          success: true,
        },
      ];

      repo.create(makeSessionRun({ unlockAttempts: attempts }));
      const result = repo.getById("run-1")!;

      expect(result.unlockAttempts).toHaveLength(3);

      for (const attempt of result.unlockAttempts) {
        expect(attempt.timestamp).toBeInstanceOf(Date);
      }

      expect(result.unlockAttempts[0]!.method).toBe("token");
      expect(result.unlockAttempts[0]!.success).toBe(false);
      expect(result.unlockAttempts[2]!.method).toBe("master_key");
      expect(result.unlockAttempts[2]!.success).toBe(true);
    });
  });

  describe("getBySessionId()", () => {
    it("returns only runs for the specified session", () => {
      sessionRepo.create(makeParentSession("session-2"));

      repo.create(makeSessionRun({ id: "run-1", sessionId: "session-1" }));
      repo.create(makeSessionRun({ id: "run-2", sessionId: "session-2" }));
      repo.create(makeSessionRun({ id: "run-3", sessionId: "session-1" }));

      const results = repo.getBySessionId("session-1");
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.sessionId === "session-1")).toBe(true);
    });

    it("returns an empty array when no runs match", () => {
      const results = repo.getBySessionId("nonexistent");
      expect(results).toEqual([]);
    });
  });

  describe("getActive()", () => {
    it("returns only active runs", () => {
      repo.create(makeSessionRun({ id: "run-1", status: "active" }));
      repo.create(makeSessionRun({ id: "run-2", status: "completed" }));
      repo.create(makeSessionRun({ id: "run-3", status: "active" }));
      repo.create(makeSessionRun({ id: "run-4", status: "aborted" }));

      const results = repo.getActive();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === "active")).toBe(true);
    });

    it("returns an empty array when no active runs exist", () => {
      repo.create(makeSessionRun({ id: "run-1", status: "completed" }));
      const results = repo.getActive();
      expect(results).toEqual([]);
    });
  });

  describe("update()", () => {
    beforeEach(() => {
      repo.create(makeSessionRun());
    });

    it("updates status", () => {
      repo.update("run-1", { status: "completed" });
      const result = repo.getById("run-1")!;
      expect(result.status).toBe("completed");
    });

    it("updates endedAt", () => {
      const endedAt = new Date("2025-06-15T11:00:00.000Z");
      repo.update("run-1", { endedAt });
      const result = repo.getById("run-1")!;
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(result.endedAt!.toISOString()).toBe("2025-06-15T11:00:00.000Z");
    });

    it("updates currentBlockIndex", () => {
      repo.update("run-1", { currentBlockIndex: 3 });
      const result = repo.getById("run-1")!;
      expect(result.currentBlockIndex).toBe(3);
    });

    it("updates focusScore", () => {
      repo.update("run-1", { focusScore: 92.3 });
      const result = repo.getById("run-1")!;
      expect(result.focusScore).toBe(92.3);
    });

    it("updates totalFocusMinutes and totalBreakMinutes", () => {
      repo.update("run-1", {
        totalFocusMinutes: 45.5,
        totalBreakMinutes: 10.2,
      });
      const result = repo.getById("run-1")!;
      expect(result.totalFocusMinutes).toBe(45.5);
      expect(result.totalBreakMinutes).toBe(10.2);
    });

    it("updates distractionAttempts", () => {
      const attempts: DistractionAttempt[] = [
        {
          timestamp: new Date("2025-06-15T10:10:00.000Z"),
          type: "domain",
          target: "twitter.com",
          blocked: true,
        },
      ];
      repo.update("run-1", { distractionAttempts: attempts });
      const result = repo.getById("run-1")!;
      expect(result.distractionAttempts).toHaveLength(1);
      expect(result.distractionAttempts[0]!.target).toBe("twitter.com");
    });

    it("updates unlockAttempts", () => {
      const attempts: UnlockAttempt[] = [
        {
          timestamp: new Date("2025-06-15T10:30:00.000Z"),
          method: "emergency",
          success: true,
        },
      ];
      repo.update("run-1", { unlockAttempts: attempts });
      const result = repo.getById("run-1")!;
      expect(result.unlockAttempts).toHaveLength(1);
      expect(result.unlockAttempts[0]!.method).toBe("emergency");
    });

    it("updates multiple fields at once", () => {
      repo.update("run-1", {
        status: "completed",
        focusScore: 85,
        totalFocusMinutes: 25,
        endedAt: new Date("2025-06-15T10:25:00.000Z"),
      });

      const result = repo.getById("run-1")!;
      expect(result.status).toBe("completed");
      expect(result.focusScore).toBe(85);
      expect(result.totalFocusMinutes).toBe(25);
      expect(result.endedAt).toBeDefined();
    });

    it("does nothing when called with no fields", () => {
      repo.update("run-1", {});
      const result = repo.getById("run-1")!;
      expect(result.status).toBe("active");
    });

    it("preserves unmodified fields", () => {
      repo.update("run-1", { status: "completed" });
      const result = repo.getById("run-1")!;
      expect(result.status).toBe("completed");
      expect(result.tokenHash).toBe("$argon2id$hash_example_abc123");
      expect(result.sessionId).toBe("session-1");
    });
  });

  describe("delete()", () => {
    it("removes the session run", () => {
      repo.create(makeSessionRun());
      repo.delete("run-1");
      expect(repo.getById("run-1")).toBeUndefined();
    });

    it("does not throw when deleting non-existent run", () => {
      expect(() => repo.delete("nonexistent")).not.toThrow();
    });

    it("only removes the targeted run", () => {
      repo.create(makeSessionRun({ id: "run-1" }));
      repo.create(makeSessionRun({ id: "run-2" }));

      repo.delete("run-1");

      expect(repo.getById("run-1")).toBeUndefined();
      expect(repo.getById("run-2")).toBeDefined();
    });
  });
});
