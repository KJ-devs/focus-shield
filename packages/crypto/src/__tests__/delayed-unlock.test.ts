import { DelayedUnlockManager } from "../delayed-unlock";

describe("DelayedUnlockManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("requestUnlock", () => {
    it("creates a pending request with correct fields", () => {
      const manager = new DelayedUnlockManager(60_000); // 1 minute delay
      const request = manager.requestUnlock("session-1");

      expect(request.id).toBeDefined();
      expect(request.id).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(request.sessionId).toBe("session-1");
      expect(request.status).toBe("pending");
      expect(request.delayMs).toBe(60_000);
      expect(request.availableAt).toBe(request.requestedAt + 60_000);
    });

    it("uses default delay of 10 minutes when no delay specified", () => {
      const manager = new DelayedUnlockManager();
      const request = manager.requestUnlock("session-1");

      expect(request.delayMs).toBe(600_000);
    });

    it("creates unique requests on multiple calls", () => {
      const manager = new DelayedUnlockManager(60_000);
      const req1 = manager.requestUnlock("session-1");
      const req2 = manager.requestUnlock("session-1");

      expect(req1.id).not.toBe(req2.id);
    });
  });

  describe("isAvailable", () => {
    it("returns false before delay elapses", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(30_000); // 30s out of 60s
      expect(manager.isAvailable(request.id)).toBe(false);
    });

    it("returns true after delay elapses", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      expect(manager.isAvailable(request.id)).toBe(true);
    });

    it("returns false for unknown request ID", () => {
      const manager = new DelayedUnlockManager(60_000);
      expect(manager.isAvailable("unknown-id")).toBe(false);
    });

    it("returns false for cancelled request", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");
      manager.cancel(request.id);

      vi.advanceTimersByTime(60_000);
      expect(manager.isAvailable(request.id)).toBe(false);
    });

    it("returns false for already used request", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      manager.useUnlock(request.id);

      expect(manager.isAvailable(request.id)).toBe(false);
    });
  });

  describe("useUnlock", () => {
    it("marks the request as used and returns true", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      const result = manager.useUnlock(request.id);

      expect(result).toBe(true);

      const updatedRequest = manager.getRequest(request.id);
      expect(updatedRequest?.status).toBe("used");
    });

    it("can only be used once", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      expect(manager.useUnlock(request.id)).toBe(true);
      expect(manager.useUnlock(request.id)).toBe(false);
    });

    it("returns false if delay has not elapsed", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(30_000); // only half the delay
      expect(manager.useUnlock(request.id)).toBe(false);
    });

    it("returns false for unknown request ID", () => {
      const manager = new DelayedUnlockManager(60_000);
      expect(manager.useUnlock("unknown-id")).toBe(false);
    });
  });

  describe("cancel", () => {
    it("marks a pending request as cancelled", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      manager.cancel(request.id);

      const updated = manager.getRequest(request.id);
      expect(updated?.status).toBe("cancelled");
    });

    it("marks an available request as cancelled", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      // Trigger status update to "available"
      manager.isAvailable(request.id);

      manager.cancel(request.id);

      const updated = manager.getRequest(request.id);
      expect(updated?.status).toBe("cancelled");
    });

    it("does not cancel a used request", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      manager.useUnlock(request.id);
      manager.cancel(request.id);

      const updated = manager.getRequest(request.id);
      expect(updated?.status).toBe("used");
    });

    it("is safe to call on non-existent request", () => {
      const manager = new DelayedUnlockManager(60_000);
      expect(() => manager.cancel("nonexistent")).not.toThrow();
    });
  });

  describe("getActiveRequest", () => {
    it("returns the pending request for a session", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      const active = manager.getActiveRequest("session-1");
      expect(active).toBeDefined();
      expect(active?.id).toBe(request.id);
      expect(active?.status).toBe("pending");
    });

    it("returns the available request for a session after delay", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);

      const active = manager.getActiveRequest("session-1");
      expect(active).toBeDefined();
      expect(active?.id).toBe(request.id);
      expect(active?.status).toBe("available");
    });

    it("returns undefined when no active request for the session", () => {
      const manager = new DelayedUnlockManager(60_000);
      expect(manager.getActiveRequest("session-1")).toBeUndefined();
    });

    it("returns undefined when request was used", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      manager.useUnlock(request.id);

      expect(manager.getActiveRequest("session-1")).toBeUndefined();
    });

    it("returns undefined when request was cancelled", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");
      manager.cancel(request.id);

      expect(manager.getActiveRequest("session-1")).toBeUndefined();
    });
  });

  describe("getRemainingMs", () => {
    it("returns the correct remaining time", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      expect(manager.getRemainingMs(request.id)).toBe(60_000);

      vi.advanceTimersByTime(25_000);
      expect(manager.getRemainingMs(request.id)).toBe(35_000);
    });

    it("returns 0 after delay has fully elapsed", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      expect(manager.getRemainingMs(request.id)).toBe(0);
    });

    it("returns 0 for unknown request ID", () => {
      const manager = new DelayedUnlockManager(60_000);
      expect(manager.getRemainingMs("unknown-id")).toBe(0);
    });

    it("returns 0 for used request", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);
      manager.useUnlock(request.id);

      expect(manager.getRemainingMs(request.id)).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("removes used and cancelled requests", () => {
      const manager = new DelayedUnlockManager(60_000);
      const req1 = manager.requestUnlock("session-1");
      const req2 = manager.requestUnlock("session-2");
      const req3 = manager.requestUnlock("session-3");

      vi.advanceTimersByTime(60_000);
      manager.useUnlock(req1.id);
      manager.cancel(req2.id);

      manager.cleanup();

      // req1 (used) and req2 (cancelled) should be removed
      expect(manager.getRequest(req1.id)).toBeUndefined();
      expect(manager.getRequest(req2.id)).toBeUndefined();

      // req3 should still exist (it is available, not used or cancelled)
      expect(manager.getRequest(req3.id)).toBeDefined();
    });

    it("keeps pending requests", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      manager.cleanup();

      expect(manager.getRequest(request.id)).toBeDefined();
      expect(manager.getRequest(request.id)?.status).toBe("pending");
    });
  });

  describe("getRequest", () => {
    it("returns a copy of the request", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      const fetched = manager.getRequest(request.id);
      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(request.id);
      expect(fetched?.sessionId).toBe("session-1");
    });

    it("returns undefined for non-existent request", () => {
      const manager = new DelayedUnlockManager(60_000);
      expect(manager.getRequest("nonexistent")).toBeUndefined();
    });

    it("auto-updates status from pending to available when delay elapsed", () => {
      const manager = new DelayedUnlockManager(60_000);
      const request = manager.requestUnlock("session-1");

      vi.advanceTimersByTime(60_000);

      const fetched = manager.getRequest(request.id);
      expect(fetched?.status).toBe("available");
    });
  });
});
