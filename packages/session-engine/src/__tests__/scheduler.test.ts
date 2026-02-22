import { SessionScheduler } from "../scheduler";
import type { ScheduledSession } from "../scheduler";
import type { RepeatConfig } from "@focus-shield/shared-types";

/**
 * Helper to create a RepeatConfig for a specific pattern and time.
 */
function makeRepeatConfig(
  overrides: Partial<RepeatConfig> = {},
): RepeatConfig {
  return {
    pattern: "daily",
    time: "09:00",
    autoStart: true,
    ...overrides,
  };
}

describe("SessionScheduler", () => {
  let scheduler: SessionScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new SessionScheduler();
  });

  afterEach(() => {
    scheduler.dispose();
    vi.restoreAllMocks();
  });

  describe("addSchedule", () => {
    it("should return a string ID", () => {
      const id = scheduler.addSchedule("session-1", makeRepeatConfig());

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should return unique IDs for different schedules", () => {
      const id1 = scheduler.addSchedule("session-1", makeRepeatConfig());
      const id2 = scheduler.addSchedule("session-2", makeRepeatConfig());

      expect(id1).not.toBe(id2);
    });

    it("should add the schedule to the list", () => {
      scheduler.addSchedule("session-1", makeRepeatConfig());

      expect(scheduler.getAll()).toHaveLength(1);
    });

    it("should set the schedule as enabled by default", () => {
      scheduler.addSchedule("session-1", makeRepeatConfig());

      const all = scheduler.getAll();
      expect(all[0]!.enabled).toBe(true);
    });
  });

  describe("removeSchedule", () => {
    it("should remove the schedule from the list", () => {
      const id = scheduler.addSchedule("session-1", makeRepeatConfig());

      scheduler.removeSchedule(id);

      expect(scheduler.getAll()).toHaveLength(0);
    });

    it("should not affect other schedules", () => {
      const id1 = scheduler.addSchedule("session-1", makeRepeatConfig());
      scheduler.addSchedule("session-2", makeRepeatConfig());

      scheduler.removeSchedule(id1);

      expect(scheduler.getAll()).toHaveLength(1);
      expect(scheduler.getAll()[0]!.sessionId).toBe("session-2");
    });

    it("should be a no-op for non-existent IDs", () => {
      scheduler.addSchedule("session-1", makeRepeatConfig());

      scheduler.removeSchedule("non-existent-id");

      expect(scheduler.getAll()).toHaveLength(1);
    });
  });

  describe("setEnabled", () => {
    it("should disable a schedule", () => {
      const id = scheduler.addSchedule("session-1", makeRepeatConfig());

      scheduler.setEnabled(id, false);

      const schedule = scheduler.getAll().find((s) => s.id === id);
      expect(schedule?.enabled).toBe(false);
    });

    it("should re-enable a disabled schedule", () => {
      const id = scheduler.addSchedule("session-1", makeRepeatConfig());
      scheduler.setEnabled(id, false);

      scheduler.setEnabled(id, true);

      const schedule = scheduler.getAll().find((s) => s.id === id);
      expect(schedule?.enabled).toBe(true);
    });

    it("should be a no-op for non-existent IDs", () => {
      scheduler.addSchedule("session-1", makeRepeatConfig());

      // Should not throw
      scheduler.setEnabled("non-existent-id", false);

      expect(scheduler.getAll()).toHaveLength(1);
      expect(scheduler.getAll()[0]!.enabled).toBe(true);
    });
  });

  describe("getAll", () => {
    it("should return an empty array initially", () => {
      expect(scheduler.getAll()).toEqual([]);
    });

    it("should return all added schedules", () => {
      scheduler.addSchedule("session-1", makeRepeatConfig());
      scheduler.addSchedule("session-2", makeRepeatConfig());
      scheduler.addSchedule("session-3", makeRepeatConfig());

      expect(scheduler.getAll()).toHaveLength(3);
    });

    it("should include schedule details", () => {
      const config = makeRepeatConfig({ pattern: "weekdays", time: "10:30" });
      scheduler.addSchedule("session-1", config);

      const all = scheduler.getAll();
      expect(all[0]!.sessionId).toBe("session-1");
      expect(all[0]!.repeatConfig).toEqual(config);
      expect(all[0]!.nextRunAt).toBeInstanceOf(Date);
    });
  });

  describe("getNextRunTime", () => {
    describe("daily pattern", () => {
      it("should return tomorrow if today's time has already passed", () => {
        // Set current time to 2024-06-15 14:00 (Saturday)
        vi.setSystemTime(new Date("2024-06-15T14:00:00"));

        const config = makeRepeatConfig({ pattern: "daily", time: "09:00" });
        const nextRun = scheduler.getNextRunTime(config);

        // 09:00 has passed, so next run should be tomorrow
        expect(nextRun.getDate()).toBe(16);
        expect(nextRun.getHours()).toBe(9);
        expect(nextRun.getMinutes()).toBe(0);
      });

      it("should return today if the time has not passed yet", () => {
        // Set current time to 2024-06-15 07:00 (Saturday)
        vi.setSystemTime(new Date("2024-06-15T07:00:00"));

        const config = makeRepeatConfig({ pattern: "daily", time: "09:00" });
        const nextRun = scheduler.getNextRunTime(config);

        expect(nextRun.getDate()).toBe(15);
        expect(nextRun.getHours()).toBe(9);
        expect(nextRun.getMinutes()).toBe(0);
      });
    });

    describe("weekdays pattern", () => {
      it("should skip weekends when on a Friday evening", () => {
        // Set current time to 2024-06-14 18:00 (Friday)
        vi.setSystemTime(new Date("2024-06-14T18:00:00"));

        const config = makeRepeatConfig({ pattern: "weekdays", time: "09:00" });
        const nextRun = scheduler.getNextRunTime(config);

        // Next weekday after Friday 18:00 at 09:00 is Monday June 17
        expect(nextRun.getDay()).toBeGreaterThanOrEqual(1);
        expect(nextRun.getDay()).toBeLessThanOrEqual(5);
        expect(nextRun.getHours()).toBe(9);
      });

      it("should skip Saturday when on a Saturday", () => {
        // Set current time to 2024-06-15 10:00 (Saturday)
        vi.setSystemTime(new Date("2024-06-15T10:00:00"));

        const config = makeRepeatConfig({ pattern: "weekdays", time: "09:00" });
        const nextRun = scheduler.getNextRunTime(config);

        // Next weekday is Monday June 17
        expect(nextRun.getDay()).toBe(1); // Monday
      });

      it("should skip Sunday when on a Sunday", () => {
        // Set current time to 2024-06-16 10:00 (Sunday)
        vi.setSystemTime(new Date("2024-06-16T10:00:00"));

        const config = makeRepeatConfig({ pattern: "weekdays", time: "09:00" });
        const nextRun = scheduler.getNextRunTime(config);

        // Next weekday is Monday June 17
        expect(nextRun.getDay()).toBe(1); // Monday
      });

      it("should return today if today is a weekday and time has not passed", () => {
        // Set current time to 2024-06-17 07:00 (Monday)
        vi.setSystemTime(new Date("2024-06-17T07:00:00"));

        const config = makeRepeatConfig({ pattern: "weekdays", time: "09:00" });
        const nextRun = scheduler.getNextRunTime(config);

        expect(nextRun.getDate()).toBe(17);
        expect(nextRun.getDay()).toBe(1); // Monday
      });
    });

    describe("weekends pattern", () => {
      it("should skip weekdays when on a Monday", () => {
        // Set current time to 2024-06-17 10:00 (Monday)
        vi.setSystemTime(new Date("2024-06-17T10:00:00"));

        const config = makeRepeatConfig({ pattern: "weekends", time: "10:00" });
        const nextRun = scheduler.getNextRunTime(config);

        // Next weekend day is Saturday June 22
        const day = nextRun.getDay();
        expect(day === 0 || day === 6).toBe(true);
      });

      it("should return today if today is a weekend day and time has not passed", () => {
        // Set current time to 2024-06-15 08:00 (Saturday)
        vi.setSystemTime(new Date("2024-06-15T08:00:00"));

        const config = makeRepeatConfig({ pattern: "weekends", time: "10:00" });
        const nextRun = scheduler.getNextRunTime(config);

        expect(nextRun.getDate()).toBe(15);
        expect(nextRun.getDay()).toBe(6); // Saturday
      });

      it("should return Sunday if Saturday time has passed", () => {
        // Set current time to 2024-06-15 14:00 (Saturday afternoon)
        vi.setSystemTime(new Date("2024-06-15T14:00:00"));

        const config = makeRepeatConfig({ pattern: "weekends", time: "10:00" });
        const nextRun = scheduler.getNextRunTime(config);

        // Should be Sunday June 16
        expect(nextRun.getDay()).toBe(0); // Sunday
      });
    });

    describe("custom pattern", () => {
      it("should find the next matching day from custom days list", () => {
        // Set current time to 2024-06-17 10:00 (Monday = day 1)
        vi.setSystemTime(new Date("2024-06-17T10:00:00"));

        // Only Wednesdays (3) and Fridays (5)
        const config = makeRepeatConfig({
          pattern: "custom",
          time: "09:00",
          days: [3, 5],
        });
        const nextRun = scheduler.getNextRunTime(config);

        // Next is Tuesday at 09:00 but that's not in [3,5]
        // So next is Wednesday (day 3) = June 19
        expect(nextRun.getDay()).toBe(3); // Wednesday
      });

      it("should return today if today is in the custom days and time has not passed", () => {
        // Set current time to 2024-06-19 07:00 (Wednesday = day 3)
        vi.setSystemTime(new Date("2024-06-19T07:00:00"));

        const config = makeRepeatConfig({
          pattern: "custom",
          time: "09:00",
          days: [3, 5],
        });
        const nextRun = scheduler.getNextRunTime(config);

        expect(nextRun.getDate()).toBe(19);
        expect(nextRun.getDay()).toBe(3);
      });

      it("should fallback to candidate date if days array is empty", () => {
        vi.setSystemTime(new Date("2024-06-17T10:00:00"));

        const config = makeRepeatConfig({
          pattern: "custom",
          time: "09:00",
          days: [],
        });
        const nextRun = scheduler.getNextRunTime(config);

        // Empty days array falls back to the candidate (tomorrow since 09:00 < 10:00)
        expect(nextRun).toBeInstanceOf(Date);
      });
    });
  });

  describe("onSessionTrigger callback", () => {
    it("should fire the callback when the scheduled time is reached", () => {
      // Set current time to 2024-06-17 08:59:00 (Monday)
      vi.setSystemTime(new Date("2024-06-17T08:59:00"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.start();

      // Advance past the scheduled time (1 minute = 60_000 ms)
      vi.advanceTimersByTime(60_000);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should pass the scheduled session to the callback", () => {
      vi.setSystemTime(new Date("2024-06-17T08:59:00"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      const id = scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.start();

      vi.advanceTimersByTime(60_000);

      const calledWith = callback.mock.calls[0]![0] as ScheduledSession;
      expect(calledWith.id).toBe(id);
      expect(calledWith.sessionId).toBe("session-1");
    });

    it("should not fire the callback for a disabled schedule", () => {
      vi.setSystemTime(new Date("2024-06-17T08:59:00"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      const id = scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.setEnabled(id, false);
      scheduler.start();

      vi.advanceTimersByTime(60_000);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("start and stop", () => {
    it("should arm timers on start for enabled schedules", () => {
      vi.setSystemTime(new Date("2024-06-17T08:59:00"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));

      // Not started yet, timer should not fire
      vi.advanceTimersByTime(60_000);
      expect(callback).not.toHaveBeenCalled();

      // Go back in time and start
      vi.setSystemTime(new Date("2024-06-17T08:59:00"));
      scheduler.start();
      vi.advanceTimersByTime(60_000);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should clear timers on stop without removing schedules", () => {
      vi.setSystemTime(new Date("2024-06-17T08:58:00"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.start();

      scheduler.stop();

      // Advance past schedule time — should not fire since stopped
      vi.advanceTimersByTime(120_000);
      expect(callback).not.toHaveBeenCalled();

      // Schedules should still be present
      expect(scheduler.getAll()).toHaveLength(1);
    });
  });

  describe("dispose", () => {
    it("should clear all timers and schedules", () => {
      vi.setSystemTime(new Date("2024-06-17T08:58:00"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.start();

      scheduler.dispose();

      vi.advanceTimersByTime(120_000);
      expect(callback).not.toHaveBeenCalled();
      expect(scheduler.getAll()).toHaveLength(0);
    });

    it("should clear the onTrigger callback", () => {
      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);

      scheduler.dispose();

      // Even if we add and start a new schedule, old callback should not fire
      // (callback was cleared by dispose)
      vi.setSystemTime(new Date("2024-06-17T08:59:00"));
      scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.start();
      vi.advanceTimersByTime(60_000);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("re-enabling a schedule", () => {
    it("should rearm the timer when a disabled schedule is re-enabled while running", () => {
      vi.setSystemTime(new Date("2024-06-17T08:58:00"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      const id = scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.start();

      // Disable then re-enable
      scheduler.setEnabled(id, false);
      scheduler.setEnabled(id, true);

      // Advance past schedule time
      vi.advanceTimersByTime(120_000);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("rescheduling after trigger", () => {
    it("should recalculate the next run time after a trigger", () => {
      vi.setSystemTime(new Date("2024-06-17T08:59:50"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.start();

      // Trigger the first run
      vi.advanceTimersByTime(10_000); // at 09:00:00
      expect(callback).toHaveBeenCalledTimes(1);

      // After trigger, nextRunAt should be recalculated to tomorrow
      const schedule = scheduler.getAll()[0]!;
      const now = new Date();
      expect(schedule.nextRunAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should fire again the next day for daily schedules", () => {
      vi.setSystemTime(new Date("2024-06-17T08:59:50"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));
      scheduler.start();

      // Trigger first run
      vi.advanceTimersByTime(10_000);
      expect(callback).toHaveBeenCalledTimes(1);

      // Advance to next day's trigger time (24 hours)
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe("scheduling while running", () => {
    it("should arm a timer immediately when adding a schedule while already running", () => {
      vi.setSystemTime(new Date("2024-06-17T08:59:00"));

      const callback = vi.fn();
      scheduler.onSessionTrigger(callback);
      scheduler.start();

      // Add a schedule while running
      scheduler.addSchedule("session-1", makeRepeatConfig({ pattern: "daily", time: "09:00" }));

      vi.advanceTimersByTime(60_000);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
