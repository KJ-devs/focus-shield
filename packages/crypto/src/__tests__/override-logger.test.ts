import { OverrideLogger } from "../override-logger";
import type { OverrideMethod } from "../override-logger";

describe("OverrideLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("log", () => {
    it("creates entry with auto-generated id and timestamp", () => {
      const logger = new OverrideLogger();
      vi.setSystemTime(new Date("2026-02-22T10:00:00Z"));

      const entry = logger.log({
        sessionId: "session-1",
        method: "token",
        success: true,
      });

      expect(entry.id).toBeDefined();
      expect(entry.id).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(entry.timestamp).toBe(Date.now());
      expect(entry.sessionId).toBe("session-1");
      expect(entry.method).toBe("token");
      expect(entry.success).toBe(true);
    });

    it("supports metadata", () => {
      const logger = new OverrideLogger();

      const entry = logger.log({
        sessionId: "session-1",
        method: "emergency",
        success: true,
        metadata: { reason: "urgent meeting" },
      });

      expect(entry.metadata).toEqual({ reason: "urgent meeting" });
    });

    it("generates unique IDs for each entry", () => {
      const logger = new OverrideLogger();
      const entry1 = logger.log({
        sessionId: "s1",
        method: "token",
        success: true,
      });
      const entry2 = logger.log({
        sessionId: "s2",
        method: "token",
        success: false,
      });

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe("getAll", () => {
    it("returns all entries", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "s1", method: "token", success: true });
      logger.log({ sessionId: "s2", method: "master_key", success: false });
      logger.log({ sessionId: "s3", method: "emergency", success: true });

      const all = logger.getAll();
      expect(all).toHaveLength(3);
    });

    it("returns empty array when no entries", () => {
      const logger = new OverrideLogger();
      expect(logger.getAll()).toEqual([]);
    });

    it("returns copies of entries (not references)", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "s1", method: "token", success: true });

      const all1 = logger.getAll();
      const all2 = logger.getAll();

      expect(all1[0]).not.toBe(all2[0]);
      expect(all1[0]).toEqual(all2[0]);
    });
  });

  describe("getBySession", () => {
    it("filters correctly by session ID", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "session-A", method: "token", success: true });
      logger.log({ sessionId: "session-B", method: "token", success: false });
      logger.log({
        sessionId: "session-A",
        method: "master_key",
        success: true,
      });
      logger.log({ sessionId: "session-C", method: "emergency", success: true });

      const sessionA = logger.getBySession("session-A");
      expect(sessionA).toHaveLength(2);
      for (const entry of sessionA) {
        expect(entry.sessionId).toBe("session-A");
      }

      const sessionB = logger.getBySession("session-B");
      expect(sessionB).toHaveLength(1);
      expect(sessionB[0]?.sessionId).toBe("session-B");
    });

    it("returns empty array for unknown session", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "s1", method: "token", success: true });

      expect(logger.getBySession("unknown")).toEqual([]);
    });
  });

  describe("getSuccessful", () => {
    it("returns only entries where success is true", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "s1", method: "token", success: true });
      logger.log({ sessionId: "s2", method: "token", success: false });
      logger.log({ sessionId: "s3", method: "master_key", success: true });
      logger.log({ sessionId: "s4", method: "emergency", success: false });

      const successful = logger.getSuccessful();
      expect(successful).toHaveLength(2);
      for (const entry of successful) {
        expect(entry.success).toBe(true);
      }
    });

    it("returns empty array when no successful entries", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "s1", method: "token", success: false });

      expect(logger.getSuccessful()).toEqual([]);
    });
  });

  describe("getByDateRange", () => {
    it("filters entries by timestamp range correctly", () => {
      const logger = new OverrideLogger();

      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      logger.log({ sessionId: "s1", method: "token", success: true });

      vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));
      logger.log({ sessionId: "s2", method: "token", success: true });

      vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
      logger.log({ sessionId: "s3", method: "token", success: true });

      vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));
      logger.log({ sessionId: "s4", method: "token", success: true });

      const startMs = new Date("2026-01-10T00:00:00Z").getTime();
      const endMs = new Date("2026-02-15T00:00:00Z").getTime();

      const filtered = logger.getByDateRange(startMs, endMs);
      expect(filtered).toHaveLength(2);
      expect(filtered[0]?.sessionId).toBe("s2");
      expect(filtered[1]?.sessionId).toBe("s3");
    });

    it("returns empty array when no entries in range", () => {
      const logger = new OverrideLogger();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      logger.log({ sessionId: "s1", method: "token", success: true });

      const startMs = new Date("2026-06-01T00:00:00Z").getTime();
      const endMs = new Date("2026-12-31T00:00:00Z").getTime();

      expect(logger.getByDateRange(startMs, endMs)).toEqual([]);
    });

    it("includes entries exactly at range boundaries (inclusive)", () => {
      const logger = new OverrideLogger();
      const exactTime = new Date("2026-05-01T12:00:00Z").getTime();
      vi.setSystemTime(exactTime);
      logger.log({ sessionId: "s1", method: "token", success: true });

      const result = logger.getByDateRange(exactTime, exactTime);
      expect(result).toHaveLength(1);
    });
  });

  describe("getCountByMethod", () => {
    it("aggregates counts by method correctly", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "s1", method: "token", success: true });
      logger.log({ sessionId: "s2", method: "token", success: false });
      logger.log({ sessionId: "s3", method: "token", success: true });
      logger.log({ sessionId: "s4", method: "master_key", success: true });
      logger.log({ sessionId: "s5", method: "emergency", success: true });
      logger.log({ sessionId: "s6", method: "delayed", success: false });
      logger.log({ sessionId: "s7", method: "task", success: true });
      logger.log({ sessionId: "s8", method: "task", success: false });

      const counts = logger.getCountByMethod();
      expect(counts["token"]).toBe(3);
      expect(counts["master_key"]).toBe(1);
      expect(counts["emergency"]).toBe(1);
      expect(counts["delayed"]).toBe(1);
      expect(counts["task"]).toBe(2);
    });

    it("returns empty object when no entries", () => {
      const logger = new OverrideLogger();
      expect(logger.getCountByMethod()).toEqual({});
    });
  });

  describe("toJSON / fromJSON", () => {
    it("roundtrip preserves all entries", () => {
      const logger = new OverrideLogger();
      vi.setSystemTime(new Date("2026-02-22T10:00:00Z"));
      logger.log({
        sessionId: "s1",
        method: "token",
        success: true,
        metadata: { note: "test" },
      });
      vi.setSystemTime(new Date("2026-02-22T11:00:00Z"));
      logger.log({
        sessionId: "s2",
        method: "emergency",
        success: false,
      });

      const json = logger.toJSON();
      const originalEntries = logger.getAll();

      // Create a new logger and import
      const newLogger = new OverrideLogger();
      newLogger.fromJSON(json);

      const importedEntries = newLogger.getAll();
      expect(importedEntries).toHaveLength(2);
      expect(importedEntries).toEqual(originalEntries);
    });

    it("fromJSON replaces existing entries", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "s1", method: "token", success: true });
      logger.log({ sessionId: "s2", method: "token", success: false });

      const json = logger.toJSON();

      // Add more entries
      logger.log({ sessionId: "s3", method: "emergency", success: true });
      expect(logger.getAll()).toHaveLength(3);

      // Import should replace all 3 entries with the original 2
      logger.fromJSON(json);
      expect(logger.getAll()).toHaveLength(2);
    });

    it("fromJSON throws on invalid JSON (not an array)", () => {
      const logger = new OverrideLogger();
      expect(() => logger.fromJSON('{"key": "value"}')).toThrow(
        "Invalid JSON: expected an array of log entries",
      );
    });

    it("fromJSON throws on invalid entry format", () => {
      const logger = new OverrideLogger();
      const invalidJson = JSON.stringify([
        { id: "abc", sessionId: "s1" }, // missing required fields
      ]);
      expect(() => logger.fromJSON(invalidJson)).toThrow(
        "Invalid JSON: one or more entries have an invalid format",
      );
    });

    it("fromJSON throws on invalid method", () => {
      const logger = new OverrideLogger();
      const invalidJson = JSON.stringify([
        {
          id: "abc",
          sessionId: "s1",
          timestamp: 123,
          method: "invalid_method",
          success: true,
        },
      ]);
      expect(() => logger.fromJSON(invalidJson)).toThrow(
        "Invalid JSON: one or more entries have an invalid format",
      );
    });

    it("fromJSON accepts valid methods: token, master_key, emergency, delayed, task", () => {
      const logger = new OverrideLogger();
      const validMethods: OverrideMethod[] = [
        "token",
        "master_key",
        "emergency",
        "delayed",
        "task",
      ];
      const entries = validMethods.map((method, i) => ({
        id: `id-${i}`,
        sessionId: `s-${i}`,
        timestamp: 1000 + i,
        method,
        success: true,
      }));

      const json = JSON.stringify(entries);
      expect(() => logger.fromJSON(json)).not.toThrow();
      expect(logger.getAll()).toHaveLength(5);
    });
  });

  describe("clear", () => {
    it("empties all entries", () => {
      const logger = new OverrideLogger();
      logger.log({ sessionId: "s1", method: "token", success: true });
      logger.log({ sessionId: "s2", method: "master_key", success: false });
      logger.log({ sessionId: "s3", method: "emergency", success: true });

      expect(logger.getAll()).toHaveLength(3);

      logger.clear();

      expect(logger.getAll()).toHaveLength(0);
      expect(logger.getAll()).toEqual([]);
    });

    it("is safe to call on an already empty logger", () => {
      const logger = new OverrideLogger();
      expect(() => logger.clear()).not.toThrow();
      expect(logger.getAll()).toEqual([]);
    });
  });
});
