import { SmartPause } from "../smart-pause";

describe("SmartPause", () => {
  let smartPause: SmartPause;

  beforeEach(() => {
    vi.useFakeTimers();
    smartPause = new SmartPause();
  });

  afterEach(() => {
    smartPause.dispose();
    vi.restoreAllMocks();
  });

  describe("handleSystemLock", () => {
    it("should set isPaused to true", () => {
      smartPause.handleSystemLock();

      expect(smartPause.getIsPaused()).toBe(true);
    });

    it("should call the onLock callback", () => {
      const lockCallback = vi.fn();
      smartPause.onLock(lockCallback);

      smartPause.handleSystemLock();

      expect(lockCallback).toHaveBeenCalledTimes(1);
    });

    it("should be idempotent — double lock does not call callback twice", () => {
      const lockCallback = vi.fn();
      smartPause.onLock(lockCallback);

      smartPause.handleSystemLock();
      smartPause.handleSystemLock();

      expect(lockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleSystemUnlock", () => {
    it("should set isPaused to false after unlock", () => {
      smartPause.handleSystemLock();

      smartPause.handleSystemUnlock();

      expect(smartPause.getIsPaused()).toBe(false);
    });

    it("should call the onUnlock callback", () => {
      const unlockCallback = vi.fn();
      smartPause.onUnlock(unlockCallback);
      smartPause.handleSystemLock();

      smartPause.handleSystemUnlock();

      expect(unlockCallback).toHaveBeenCalledTimes(1);
    });

    it("should be idempotent — double unlock does not call callback twice", () => {
      const unlockCallback = vi.fn();
      smartPause.onUnlock(unlockCallback);
      smartPause.handleSystemLock();

      smartPause.handleSystemUnlock();
      smartPause.handleSystemUnlock();

      expect(unlockCallback).toHaveBeenCalledTimes(1);
    });

    it("should not call callback if not paused", () => {
      const unlockCallback = vi.fn();
      smartPause.onUnlock(unlockCallback);

      smartPause.handleSystemUnlock();

      expect(unlockCallback).not.toHaveBeenCalled();
    });
  });

  describe("getTotalPausedMs", () => {
    it("should return 0 initially", () => {
      expect(smartPause.getTotalPausedMs()).toBe(0);
    });

    it("should accumulate pause duration after unlock", () => {
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(5000);
      smartPause.handleSystemUnlock();

      expect(smartPause.getTotalPausedMs()).toBe(5000);
    });

    it("should include current pause duration if currently paused", () => {
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(3000);

      // Still paused, so getTotalPausedMs should include ongoing pause
      expect(smartPause.getTotalPausedMs()).toBe(3000);
    });

    it("should accumulate across multiple pause/resume cycles", () => {
      // First pause: 2 seconds
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(2000);
      smartPause.handleSystemUnlock();

      // Second pause: 3 seconds
      vi.advanceTimersByTime(1000); // 1 second gap (not paused)
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(3000);
      smartPause.handleSystemUnlock();

      // Third pause: 5 seconds
      vi.advanceTimersByTime(2000); // 2 second gap (not paused)
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(5000);
      smartPause.handleSystemUnlock();

      expect(smartPause.getTotalPausedMs()).toBe(10000); // 2 + 3 + 5
    });

    it("should accumulate properly with an ongoing pause", () => {
      // First pause: 2 seconds
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(2000);
      smartPause.handleSystemUnlock();

      // Second pause (still ongoing): 4 seconds so far
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(4000);

      expect(smartPause.getTotalPausedMs()).toBe(6000); // 2 + 4
    });
  });

  describe("pause and resume (manual equivalents)", () => {
    it("should pause manually", () => {
      smartPause.pause();

      expect(smartPause.getIsPaused()).toBe(true);
    });

    it("should resume manually", () => {
      smartPause.pause();

      smartPause.resume();

      expect(smartPause.getIsPaused()).toBe(false);
    });

    it("should track time during manual pause", () => {
      smartPause.pause();
      vi.advanceTimersByTime(7000);
      smartPause.resume();

      expect(smartPause.getTotalPausedMs()).toBe(7000);
    });

    it("should call onLock callback during manual pause", () => {
      const lockCallback = vi.fn();
      smartPause.onLock(lockCallback);

      smartPause.pause();

      expect(lockCallback).toHaveBeenCalledTimes(1);
    });

    it("should call onUnlock callback during manual resume", () => {
      const unlockCallback = vi.fn();
      smartPause.onUnlock(unlockCallback);
      smartPause.pause();

      smartPause.resume();

      expect(unlockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("getIsPaused", () => {
    it("should return false initially", () => {
      expect(smartPause.getIsPaused()).toBe(false);
    });

    it("should return true when locked", () => {
      smartPause.handleSystemLock();

      expect(smartPause.getIsPaused()).toBe(true);
    });

    it("should return false after unlock", () => {
      smartPause.handleSystemLock();
      smartPause.handleSystemUnlock();

      expect(smartPause.getIsPaused()).toBe(false);
    });
  });

  describe("reset", () => {
    it("should clear paused status", () => {
      smartPause.handleSystemLock();

      smartPause.reset();

      expect(smartPause.getIsPaused()).toBe(false);
    });

    it("should clear accumulated pause time", () => {
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(5000);
      smartPause.handleSystemUnlock();

      smartPause.reset();

      expect(smartPause.getTotalPausedMs()).toBe(0);
    });

    it("should allow new pause/resume cycles after reset", () => {
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(5000);
      smartPause.handleSystemUnlock();
      smartPause.reset();

      smartPause.handleSystemLock();
      vi.advanceTimersByTime(3000);
      smartPause.handleSystemUnlock();

      expect(smartPause.getTotalPausedMs()).toBe(3000);
    });
  });

  describe("dispose", () => {
    it("should reset all state", () => {
      smartPause.handleSystemLock();
      vi.advanceTimersByTime(5000);

      smartPause.dispose();

      expect(smartPause.getIsPaused()).toBe(false);
      expect(smartPause.getTotalPausedMs()).toBe(0);
    });

    it("should clear callbacks so they are not called after dispose", () => {
      const lockCallback = vi.fn();
      const unlockCallback = vi.fn();
      smartPause.onLock(lockCallback);
      smartPause.onUnlock(unlockCallback);

      smartPause.dispose();

      // After dispose, callbacks should be null
      smartPause.handleSystemLock();
      smartPause.handleSystemUnlock();

      expect(lockCallback).not.toHaveBeenCalled();
      expect(unlockCallback).not.toHaveBeenCalled();
    });
  });
});
