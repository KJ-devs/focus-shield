import type {
  Session,
  SessionBlock,
  NotificationConfig,
  RepeatConfig,
  DomainRule,
} from "@focus-shield/shared-types";
import { createDatabase } from "../database";
import type { DatabaseAdapter } from "../database";
import { runMigrations } from "../migrations";
import { allMigrations } from "../schema";
import { SessionRepository } from "../repositories/session-repository";

function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: "session-1",
    name: "Deep Work Morning",
    blocks: [
      { type: "focus", duration: 90, blockingEnabled: true },
      { type: "break", duration: 20, blockingEnabled: false, allowedDuringBreak: ["spotify.com"] },
    ] as SessionBlock[],
    lockLevel: 3,
    blocklist: "social-media",
    autoStart: false,
    profileId: "profile-1",
    notifications: {
      onBlockStart: true,
      onBlockEnd: true,
      halfwayReminder: false,
      onAttemptedDistraction: true,
    } as NotificationConfig,
    createdAt: new Date("2025-06-01T09:00:00.000Z"),
    updatedAt: new Date("2025-06-01T09:00:00.000Z"),
    ...overrides,
  };
}

describe("SessionRepository", () => {
  let db: DatabaseAdapter;
  let repo: SessionRepository;

  beforeEach(() => {
    db = createDatabase();
    runMigrations(db, allMigrations);
    repo = new SessionRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("create()", () => {
    it("inserts a session without error", () => {
      const session = makeSession();
      expect(() => repo.create(session)).not.toThrow();
    });

    it("inserts a session that can be retrieved", () => {
      const session = makeSession();
      repo.create(session);
      const result = repo.getById("session-1");
      expect(result).toBeDefined();
      expect(result?.id).toBe("session-1");
    });
  });

  describe("getById()", () => {
    it("returns the session with correct scalar fields", () => {
      repo.create(makeSession());
      const result = repo.getById("session-1")!;

      expect(result.id).toBe("session-1");
      expect(result.name).toBe("Deep Work Morning");
      expect(result.lockLevel).toBe(3);
      expect(result.blocklist).toBe("social-media");
      expect(result.profileId).toBe("profile-1");
    });

    it("returns proper Date objects for createdAt and updatedAt", () => {
      repo.create(makeSession());
      const result = repo.getById("session-1")!;

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe("2025-06-01T09:00:00.000Z");
      expect(result.updatedAt.toISOString()).toBe("2025-06-01T09:00:00.000Z");
    });

    it("returns autoStart as a boolean", () => {
      repo.create(makeSession({ autoStart: true }));
      const result = repo.getById("session-1")!;

      expect(result.autoStart).toBe(true);
      expect(typeof result.autoStart).toBe("boolean");
    });

    it("returns autoStart=false as a boolean false", () => {
      repo.create(makeSession({ autoStart: false }));
      const result = repo.getById("session-1")!;

      expect(result.autoStart).toBe(false);
      expect(typeof result.autoStart).toBe("boolean");
    });

    it("correctly deserializes blocks JSON array", () => {
      repo.create(makeSession());
      const result = repo.getById("session-1")!;

      expect(Array.isArray(result.blocks)).toBe(true);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0]).toEqual({
        type: "focus",
        duration: 90,
        blockingEnabled: true,
      });
      expect(result.blocks[1]).toEqual({
        type: "break",
        duration: 20,
        blockingEnabled: false,
        allowedDuringBreak: ["spotify.com"],
      });
    });

    it("correctly deserializes notifications JSON", () => {
      repo.create(makeSession());
      const result = repo.getById("session-1")!;

      expect(result.notifications).toEqual({
        onBlockStart: true,
        onBlockEnd: true,
        halfwayReminder: false,
        onAttemptedDistraction: true,
      });
    });

    it("returns undefined for customBlocklist when not set", () => {
      repo.create(makeSession());
      const result = repo.getById("session-1")!;
      expect(result.customBlocklist).toBeUndefined();
    });

    it("correctly deserializes customBlocklist when set", () => {
      const customBlocklist: DomainRule[] = [
        { pattern: "*.reddit.com", type: "block" },
        { pattern: "news.ycombinator.com", type: "block" },
      ];
      repo.create(makeSession({ customBlocklist }));
      const result = repo.getById("session-1")!;

      expect(result.customBlocklist).toEqual(customBlocklist);
    });

    it("returns undefined for allowlist when not set", () => {
      repo.create(makeSession());
      const result = repo.getById("session-1")!;
      expect(result.allowlist).toBeUndefined();
    });

    it("correctly deserializes allowlist when set", () => {
      const allowlist = ["docs.google.com", "github.com"];
      repo.create(makeSession({ allowlist }));
      const result = repo.getById("session-1")!;

      expect(result.allowlist).toEqual(allowlist);
    });

    it("returns undefined for repeat when not set", () => {
      repo.create(makeSession());
      const result = repo.getById("session-1")!;
      expect(result.repeat).toBeUndefined();
    });

    it("correctly deserializes repeat config when set", () => {
      const repeat: RepeatConfig = {
        pattern: "weekdays",
        days: [1, 2, 3, 4, 5],
        time: "09:00",
        autoStart: true,
      };
      repo.create(makeSession({ repeat }));
      const result = repo.getById("session-1")!;

      expect(result.repeat).toEqual(repeat);
    });

    it("returns undefined for a non-existent ID", () => {
      const result = repo.getById("nonexistent-id");
      expect(result).toBeUndefined();
    });
  });

  describe("getAll()", () => {
    it("returns an empty array when no sessions exist", () => {
      const results = repo.getAll();
      expect(results).toEqual([]);
    });

    it("returns all sessions", () => {
      repo.create(makeSession({ id: "s1", name: "Session 1" }));
      repo.create(makeSession({ id: "s2", name: "Session 2" }));
      repo.create(makeSession({ id: "s3", name: "Session 3" }));

      const results = repo.getAll();
      expect(results).toHaveLength(3);
      const ids = results.map((s) => s.id);
      expect(ids).toContain("s1");
      expect(ids).toContain("s2");
      expect(ids).toContain("s3");
    });
  });

  describe("getByProfileId()", () => {
    it("returns only sessions matching the profile ID", () => {
      repo.create(makeSession({ id: "s1", profileId: "profile-a" }));
      repo.create(makeSession({ id: "s2", profileId: "profile-b" }));
      repo.create(makeSession({ id: "s3", profileId: "profile-a" }));

      const results = repo.getByProfileId("profile-a");
      expect(results).toHaveLength(2);
      expect(results.every((s) => s.profileId === "profile-a")).toBe(true);
    });

    it("returns an empty array when no sessions match", () => {
      repo.create(makeSession({ id: "s1", profileId: "profile-a" }));

      const results = repo.getByProfileId("profile-nonexistent");
      expect(results).toEqual([]);
    });
  });

  describe("update()", () => {
    it("updates the name field", () => {
      repo.create(makeSession());
      repo.update("session-1", { name: "Updated Session Name" });

      const result = repo.getById("session-1")!;
      expect(result.name).toBe("Updated Session Name");
    });

    it("updates the lockLevel", () => {
      repo.create(makeSession());
      repo.update("session-1", { lockLevel: 5 });

      const result = repo.getById("session-1")!;
      expect(result.lockLevel).toBe(5);
    });

    it("updates autoStart boolean", () => {
      repo.create(makeSession({ autoStart: false }));
      repo.update("session-1", { autoStart: true });

      const result = repo.getById("session-1")!;
      expect(result.autoStart).toBe(true);
      expect(typeof result.autoStart).toBe("boolean");
    });

    it("updates blocks array", () => {
      repo.create(makeSession());
      const newBlocks: SessionBlock[] = [
        { type: "deep_focus", duration: 120, blockingEnabled: true },
      ];
      repo.update("session-1", { blocks: newBlocks });

      const result = repo.getById("session-1")!;
      expect(result.blocks).toEqual(newBlocks);
    });

    it("updates notifications config", () => {
      repo.create(makeSession());
      const newNotifications: NotificationConfig = {
        onBlockStart: false,
        onBlockEnd: false,
        halfwayReminder: true,
        onAttemptedDistraction: false,
      };
      repo.update("session-1", { notifications: newNotifications });

      const result = repo.getById("session-1")!;
      expect(result.notifications).toEqual(newNotifications);
    });

    it("updates updatedAt to a new date", () => {
      repo.create(makeSession());
      const newDate = new Date("2025-12-25T12:00:00.000Z");
      repo.update("session-1", { updatedAt: newDate });

      const result = repo.getById("session-1")!;
      expect(result.updatedAt.toISOString()).toBe("2025-12-25T12:00:00.000Z");
    });

    it("updates multiple fields at once", () => {
      repo.create(makeSession());
      repo.update("session-1", {
        name: "Renamed",
        lockLevel: 4,
        autoStart: true,
      });

      const result = repo.getById("session-1")!;
      expect(result.name).toBe("Renamed");
      expect(result.lockLevel).toBe(4);
      expect(result.autoStart).toBe(true);
    });

    it("does nothing when called with no fields", () => {
      repo.create(makeSession());
      repo.update("session-1", {});

      const result = repo.getById("session-1")!;
      expect(result.name).toBe("Deep Work Morning");
    });

    it("preserves unmodified fields", () => {
      repo.create(makeSession());
      repo.update("session-1", { name: "Changed" });

      const result = repo.getById("session-1")!;
      expect(result.name).toBe("Changed");
      // Other fields should remain the same
      expect(result.lockLevel).toBe(3);
      expect(result.blocklist).toBe("social-media");
      expect(result.profileId).toBe("profile-1");
    });

    it("updates allowlist to a new value", () => {
      repo.create(makeSession({ allowlist: ["old.com"] }));
      repo.update("session-1", { allowlist: ["new.com", "other.com"] });

      const result = repo.getById("session-1")!;
      expect(result.allowlist).toEqual(["new.com", "other.com"]);
    });

    it("updates repeat config", () => {
      repo.create(makeSession());
      const repeat: RepeatConfig = {
        pattern: "daily",
        time: "08:00",
        autoStart: false,
      };
      repo.update("session-1", { repeat });

      const result = repo.getById("session-1")!;
      expect(result.repeat).toEqual(repeat);
    });

    it("updates customBlocklist", () => {
      repo.create(makeSession());
      const customBlocklist: DomainRule[] = [
        { pattern: "*.tiktok.com", type: "block" },
      ];
      repo.update("session-1", { customBlocklist });

      const result = repo.getById("session-1")!;
      expect(result.customBlocklist).toEqual(customBlocklist);
    });
  });

  describe("delete()", () => {
    it("removes the session", () => {
      repo.create(makeSession());
      repo.delete("session-1");

      const result = repo.getById("session-1");
      expect(result).toBeUndefined();
    });

    it("does not throw when deleting a non-existent session", () => {
      expect(() => repo.delete("nonexistent")).not.toThrow();
    });

    it("only removes the targeted session", () => {
      repo.create(makeSession({ id: "s1" }));
      repo.create(makeSession({ id: "s2" }));

      repo.delete("s1");

      expect(repo.getById("s1")).toBeUndefined();
      expect(repo.getById("s2")).toBeDefined();
    });
  });
});
