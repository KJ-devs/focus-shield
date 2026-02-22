import { PrecisionTimer } from "../index";

describe("PrecisionTimer", () => {
  let timer: PrecisionTimer;

  beforeEach(() => {
    vi.useFakeTimers();
    timer = new PrecisionTimer();
  });

  afterEach(() => {
    timer.stop();
    vi.restoreAllMocks();
  });

  describe("start", () => {
    it("should mark the timer as running after start", () => {
      timer.start(10_000);

      expect(timer.isRunning()).toBe(true);
    });

    it("should not be paused after start", () => {
      timer.start(10_000);

      expect(timer.isPaused()).toBe(false);
    });

    it("should stop the previous timer when start is called again", () => {
      const completeCb = vi.fn();
      timer.onComplete(completeCb);
      timer.start(5_000);

      timer.start(10_000);
      vi.advanceTimersByTime(5_000);

      // The first timer's 5s should not trigger completion since it was replaced
      expect(completeCb).not.toHaveBeenCalled();
    });
  });

  describe("tick callbacks", () => {
    it("should fire tick callback every second with correct remaining and elapsed", () => {
      const tickCb = vi.fn();
      timer.onTick(tickCb);

      timer.start(5_000);

      vi.advanceTimersByTime(1_000);
      expect(tickCb).toHaveBeenCalledTimes(1);
      const [remaining, elapsed] = tickCb.mock.calls[0]!;
      expect(remaining).toBe(4_000);
      expect(elapsed).toBe(1_000);

      vi.advanceTimersByTime(1_000);
      expect(tickCb).toHaveBeenCalledTimes(2);
      const [remaining2, elapsed2] = tickCb.mock.calls[1]!;
      expect(remaining2).toBe(3_000);
      expect(elapsed2).toBe(2_000);
    });

    it("should support multiple tick listeners", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      timer.onTick(cb1);
      timer.onTick(cb2);

      timer.start(5_000);
      vi.advanceTimersByTime(1_000);

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it("should unsubscribe a tick callback", () => {
      const cb = vi.fn();
      const unsub = timer.onTick(cb);

      timer.start(5_000);
      vi.advanceTimersByTime(1_000);
      expect(cb).toHaveBeenCalledTimes(1);

      unsub();
      vi.advanceTimersByTime(1_000);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("should not fire tick callbacks when paused", () => {
      const cb = vi.fn();
      timer.onTick(cb);
      timer.start(10_000);

      vi.advanceTimersByTime(1_000);
      expect(cb).toHaveBeenCalledTimes(1);

      timer.pause();
      vi.advanceTimersByTime(3_000);

      // Ticks fire but the callback is skipped because timer is paused
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe("onComplete", () => {
    it("should fire when time runs out", () => {
      const completeCb = vi.fn();
      timer.onComplete(completeCb);

      timer.start(3_000);
      vi.advanceTimersByTime(3_000);

      expect(completeCb).toHaveBeenCalledTimes(1);
    });

    it("should stop the timer when complete fires", () => {
      const completeCb = vi.fn();
      timer.onComplete(completeCb);

      timer.start(2_000);
      vi.advanceTimersByTime(2_000);

      expect(timer.isRunning()).toBe(false);
    });

    it("should support multiple complete listeners", () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      timer.onComplete(cb1);
      timer.onComplete(cb2);

      timer.start(1_000);
      vi.advanceTimersByTime(1_000);

      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it("should unsubscribe a complete callback", () => {
      const cb = vi.fn();
      const unsub = timer.onComplete(cb);
      unsub();

      timer.start(1_000);
      vi.advanceTimersByTime(1_000);

      expect(cb).not.toHaveBeenCalled();
    });

    it("should not fire more ticks after completion", () => {
      const tickCb = vi.fn();
      timer.onTick(tickCb);

      timer.start(2_000);
      vi.advanceTimersByTime(2_000);
      const callCount = tickCb.mock.calls.length;

      vi.advanceTimersByTime(3_000);

      expect(tickCb.mock.calls.length).toBe(callCount);
    });
  });

  describe("pause and resume", () => {
    it("should mark timer as paused after pause", () => {
      timer.start(10_000);

      timer.pause();

      expect(timer.isPaused()).toBe(true);
      expect(timer.isRunning()).toBe(true); // Still running, just paused
    });

    it("should resume after pause", () => {
      timer.start(10_000);
      timer.pause();

      timer.resume();

      expect(timer.isPaused()).toBe(false);
      expect(timer.isRunning()).toBe(true);
    });

    it("should freeze elapsed time while paused", () => {
      timer.start(10_000);
      vi.advanceTimersByTime(2_000);
      const elapsedBeforePause = timer.getElapsed();

      timer.pause();
      vi.advanceTimersByTime(5_000);

      expect(timer.getElapsed()).toBe(elapsedBeforePause);
    });

    it("should continue counting after resume", () => {
      timer.start(10_000);
      vi.advanceTimersByTime(2_000);
      timer.pause();
      vi.advanceTimersByTime(5_000);
      timer.resume();

      vi.advanceTimersByTime(3_000);

      expect(timer.getElapsed()).toBe(5_000);
      expect(timer.getRemaining()).toBe(5_000);
    });

    it("should complete correctly after pause and resume", () => {
      const completeCb = vi.fn();
      timer.onComplete(completeCb);
      timer.start(5_000);

      vi.advanceTimersByTime(2_000);
      timer.pause();
      vi.advanceTimersByTime(10_000);
      timer.resume();
      vi.advanceTimersByTime(3_000);

      expect(completeCb).toHaveBeenCalledTimes(1);
    });

    it("should do nothing if pause is called when not running", () => {
      timer.pause();

      expect(timer.isPaused()).toBe(false);
    });

    it("should do nothing if pause is called when already paused", () => {
      timer.start(10_000);
      timer.pause();
      vi.advanceTimersByTime(2_000);

      timer.pause(); // Should not update pauseStart
      vi.advanceTimersByTime(2_000);
      timer.resume();

      // If pause was applied twice, elapsed would be wrong
      // It should still be 0 since we paused immediately after start
      expect(timer.getElapsed()).toBe(0);
    });

    it("should do nothing if resume is called when not paused", () => {
      timer.start(10_000);
      vi.advanceTimersByTime(2_000);

      timer.resume(); // Not paused, should be a no-op

      expect(timer.getElapsed()).toBe(2_000);
    });
  });

  describe("extend", () => {
    it("should add time to the duration", () => {
      timer.start(5_000);
      vi.advanceTimersByTime(3_000);

      timer.extend(5_000);

      expect(timer.getRemaining()).toBe(7_000);
    });

    it("should delay completion by extended amount", () => {
      const completeCb = vi.fn();
      timer.onComplete(completeCb);
      timer.start(3_000);

      vi.advanceTimersByTime(2_000);
      timer.extend(5_000);
      vi.advanceTimersByTime(1_000);

      expect(completeCb).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5_000);

      expect(completeCb).toHaveBeenCalledTimes(1);
    });
  });

  describe("getRemaining and getElapsed", () => {
    it("should return 0 for remaining when timer has not started", () => {
      expect(timer.getRemaining()).toBe(0);
    });

    it("should return 0 for elapsed when timer has not started", () => {
      expect(timer.getElapsed()).toBe(0);
    });

    it("should return correct remaining time", () => {
      timer.start(10_000);
      vi.advanceTimersByTime(3_000);

      expect(timer.getRemaining()).toBe(7_000);
    });

    it("should return correct elapsed time", () => {
      timer.start(10_000);
      vi.advanceTimersByTime(4_000);

      expect(timer.getElapsed()).toBe(4_000);
    });

    it("should clamp remaining to 0 when past duration", () => {
      timer.start(3_000);
      vi.advanceTimersByTime(5_000);

      expect(timer.getRemaining()).toBe(0);
    });

    it("should clamp elapsed to duration max", () => {
      timer.start(3_000);
      vi.advanceTimersByTime(5_000);

      expect(timer.getElapsed()).toBe(3_000);
    });
  });

  describe("stop", () => {
    it("should mark timer as not running after stop", () => {
      timer.start(10_000);

      timer.stop();

      expect(timer.isRunning()).toBe(false);
    });

    it("should clear the interval and stop ticks", () => {
      const tickCb = vi.fn();
      timer.onTick(tickCb);
      timer.start(10_000);
      vi.advanceTimersByTime(1_000);
      const callCount = tickCb.mock.calls.length;

      timer.stop();
      vi.advanceTimersByTime(5_000);

      expect(tickCb.mock.calls.length).toBe(callCount);
    });

    it("should clear paused state on stop", () => {
      timer.start(10_000);
      timer.pause();
      expect(timer.isPaused()).toBe(true);

      timer.stop();

      expect(timer.isPaused()).toBe(false);
    });

    it("should be safe to call stop when not running", () => {
      expect(() => timer.stop()).not.toThrow();
    });
  });

  describe("isRunning and isPaused", () => {
    it("should not be running before start", () => {
      expect(timer.isRunning()).toBe(false);
    });

    it("should not be paused before start", () => {
      expect(timer.isPaused()).toBe(false);
    });

    it("should be running and not paused after start", () => {
      timer.start(5_000);

      expect(timer.isRunning()).toBe(true);
      expect(timer.isPaused()).toBe(false);
    });

    it("should be running and paused after pause", () => {
      timer.start(5_000);
      timer.pause();

      expect(timer.isRunning()).toBe(true);
      expect(timer.isPaused()).toBe(true);
    });
  });
});
