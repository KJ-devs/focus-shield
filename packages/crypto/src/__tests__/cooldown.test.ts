import type { LockLevel } from "@focus-shield/shared-types";
import { CooldownManager } from "../cooldown";

describe("CooldownManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("startCooldown", () => {
    it("returns 0 for level 1 (no cooldown)", () => {
      const manager = new CooldownManager();
      const duration = manager.startCooldown("session-1", 1);
      expect(duration).toBe(0);
    });

    it("returns 0 for level 2 (no cooldown)", () => {
      const manager = new CooldownManager();
      const duration = manager.startCooldown("session-1", 2);
      expect(duration).toBe(0);
    });

    it("returns 60000 for level 3 (60s cooldown)", () => {
      const manager = new CooldownManager();
      const duration = manager.startCooldown("session-1", 3);
      expect(duration).toBe(60_000);
    });

    it("returns 120000 for level 4 (120s cooldown)", () => {
      const manager = new CooldownManager();
      const duration = manager.startCooldown("session-1", 4);
      expect(duration).toBe(120_000);
    });

    it("returns 0 for level 5 (uninterruptible, no cooldown)", () => {
      const manager = new CooldownManager();
      const duration = manager.startCooldown("session-1", 5);
      expect(duration).toBe(0);
    });
  });

  describe("isInCooldown", () => {
    it("returns true during active cooldown for level 3", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 3);

      expect(manager.isInCooldown("session-1")).toBe(true);
    });

    it("returns false after cooldown expires for level 3", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 3);

      vi.advanceTimersByTime(60_000);

      expect(manager.isInCooldown("session-1")).toBe(false);
    });

    it("returns false for level 1 (no cooldown)", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 1);

      expect(manager.isInCooldown("session-1")).toBe(false);
    });

    it("returns false for unknown session", () => {
      const manager = new CooldownManager();
      expect(manager.isInCooldown("unknown")).toBe(false);
    });

    it("returns true during active cooldown for level 4", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 4);

      vi.advanceTimersByTime(60_000); // only 60s out of 120s
      expect(manager.isInCooldown("session-1")).toBe(true);
    });

    it("returns false after cooldown expires for level 4", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 4);

      vi.advanceTimersByTime(120_000);
      expect(manager.isInCooldown("session-1")).toBe(false);
    });
  });

  describe("getRemainingMs", () => {
    it("returns decreasing values as time passes", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 3);

      const initial = manager.getRemainingMs("session-1");
      expect(initial).toBe(60_000);

      vi.advanceTimersByTime(20_000);
      const afterTwenty = manager.getRemainingMs("session-1");
      expect(afterTwenty).toBe(40_000);

      vi.advanceTimersByTime(20_000);
      const afterForty = manager.getRemainingMs("session-1");
      expect(afterForty).toBe(20_000);
    });

    it("returns 0 after cooldown expires", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 3);

      vi.advanceTimersByTime(60_000);
      expect(manager.getRemainingMs("session-1")).toBe(0);
    });

    it("returns 0 for unknown session", () => {
      const manager = new CooldownManager();
      expect(manager.getRemainingMs("unknown")).toBe(0);
    });

    it("returns 0 for level 1 (no cooldown)", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 1);
      expect(manager.getRemainingMs("session-1")).toBe(0);
    });
  });

  describe("getCooldownMs (static)", () => {
    it("returns correct values per level", () => {
      const expected: Record<LockLevel, number> = {
        1: 0,
        2: 0,
        3: 60_000,
        4: 120_000,
        5: 0,
      };

      for (const level of [1, 2, 3, 4, 5] as LockLevel[]) {
        expect(CooldownManager.getCooldownMs(level)).toBe(expected[level]);
      }
    });
  });

  describe("requiresDoubleEntry (static)", () => {
    it("returns true for level 4 only", () => {
      expect(CooldownManager.requiresDoubleEntry(4)).toBe(true);
    });

    it("returns false for all other levels", () => {
      for (const level of [1, 2, 3, 5] as LockLevel[]) {
        expect(CooldownManager.requiresDoubleEntry(level)).toBe(false);
      }
    });
  });

  describe("clear", () => {
    it("removes a specific cooldown", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 3);
      manager.startCooldown("session-2", 4);

      expect(manager.isInCooldown("session-1")).toBe(true);
      expect(manager.isInCooldown("session-2")).toBe(true);

      manager.clear("session-1");

      expect(manager.isInCooldown("session-1")).toBe(false);
      expect(manager.isInCooldown("session-2")).toBe(true);
    });

    it("is safe to call on non-existent session", () => {
      const manager = new CooldownManager();
      expect(() => manager.clear("nonexistent")).not.toThrow();
    });
  });

  describe("clearAll", () => {
    it("removes all cooldowns", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 3);
      manager.startCooldown("session-2", 4);
      manager.startCooldown("session-3", 3);

      expect(manager.isInCooldown("session-1")).toBe(true);
      expect(manager.isInCooldown("session-2")).toBe(true);
      expect(manager.isInCooldown("session-3")).toBe(true);

      manager.clearAll();

      expect(manager.isInCooldown("session-1")).toBe(false);
      expect(manager.isInCooldown("session-2")).toBe(false);
      expect(manager.isInCooldown("session-3")).toBe(false);
    });
  });

  describe("getState", () => {
    it("returns undefined for unknown session", () => {
      const manager = new CooldownManager();
      expect(manager.getState("unknown")).toBeUndefined();
    });

    it("returns a copy of the state with updated remainingMs", () => {
      const manager = new CooldownManager();
      manager.startCooldown("session-1", 3);

      vi.advanceTimersByTime(30_000);

      const state = manager.getState("session-1");
      expect(state).toBeDefined();
      expect(state?.level).toBe(3);
      expect(state?.remainingMs).toBe(30_000);
    });
  });
});
