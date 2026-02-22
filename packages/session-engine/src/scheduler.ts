import type { RepeatConfig } from "@focus-shield/shared-types";

export interface ScheduledSession {
  id: string;
  sessionId: string;
  repeatConfig: RepeatConfig;
  nextRunAt: Date;
  enabled: boolean;
}

export type SchedulerCallback = (scheduledSession: ScheduledSession) => void;

const MS_PER_DAY = 86_400_000;

/**
 * SessionScheduler manages recurring sessions based on RepeatConfig.
 *
 * It calculates the next run time for each schedule and uses setTimeout
 * to trigger a callback when the time arrives. After triggering, it
 * automatically reschedules for the next occurrence.
 */
export class SessionScheduler {
  private schedules: Map<string, ScheduledSession> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private onTrigger: SchedulerCallback | null = null;
  private running = false;

  /**
   * Register a callback for when a scheduled session triggers.
   */
  onSessionTrigger(callback: SchedulerCallback): void {
    this.onTrigger = callback;
  }

  /**
   * Add a new scheduled session. Returns the generated schedule ID.
   */
  addSchedule(sessionId: string, repeatConfig: RepeatConfig): string {
    const id = crypto.randomUUID();
    const nextRunAt = this.calculateNextRun(repeatConfig);

    const scheduled: ScheduledSession = {
      id,
      sessionId,
      repeatConfig,
      nextRunAt,
      enabled: true,
    };

    this.schedules.set(id, scheduled);

    if (this.running) {
      this.scheduleTimer(scheduled);
    }

    return id;
  }

  /**
   * Remove a scheduled session and clear its timer.
   */
  removeSchedule(id: string): void {
    this.clearTimer(id);
    this.schedules.delete(id);
  }

  /**
   * Enable or disable a schedule without removing it.
   * When disabled, the timer is cleared. When re-enabled, it is rescheduled.
   */
  setEnabled(id: string, enabled: boolean): void {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return;
    }

    schedule.enabled = enabled;

    if (!enabled) {
      this.clearTimer(id);
    } else if (this.running) {
      schedule.nextRunAt = this.calculateNextRun(schedule.repeatConfig);
      this.scheduleTimer(schedule);
    }
  }

  /**
   * Get all scheduled sessions.
   */
  getAll(): ScheduledSession[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get the next run time for a given RepeatConfig.
   */
  getNextRunTime(repeatConfig: RepeatConfig): Date {
    return this.calculateNextRun(repeatConfig);
  }

  /**
   * Start the scheduler. Arms timers for all enabled schedules.
   */
  start(): void {
    this.running = true;

    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        schedule.nextRunAt = this.calculateNextRun(schedule.repeatConfig);
        this.scheduleTimer(schedule);
      }
    }
  }

  /**
   * Stop all timers without removing schedules.
   */
  stop(): void {
    this.running = false;

    for (const id of this.timers.keys()) {
      this.clearTimer(id);
    }
  }

  /**
   * Dispose all resources: clear timers and remove all schedules.
   */
  dispose(): void {
    this.stop();
    this.schedules.clear();
    this.onTrigger = null;
  }

  /**
   * Calculate the next run Date from a RepeatConfig.
   *
   * Logic:
   * - `daily`: next occurrence of config.time (today if not passed, tomorrow if passed)
   * - `weekdays`: next Mon-Fri occurrence of config.time
   * - `weekends`: next Sat-Sun occurrence of config.time
   * - `custom`: next day in config.days array at config.time
   */
  private calculateNextRun(config: RepeatConfig): Date {
    const now = new Date();
    const [hours, minutes] = parseTime(config.time);

    const candidate = new Date(now);
    candidate.setHours(hours, minutes, 0, 0);

    // If today's time has already passed, start searching from tomorrow
    if (candidate.getTime() <= now.getTime()) {
      candidate.setTime(candidate.getTime() + MS_PER_DAY);
    }

    switch (config.pattern) {
      case "daily":
        return candidate;

      case "weekdays":
        return findNextMatchingDay(candidate, isWeekday);

      case "weekends":
        return findNextMatchingDay(candidate, isWeekend);

      case "custom": {
        const days = config.days ?? [];
        if (days.length === 0) {
          return candidate;
        }
        return findNextMatchingDay(candidate, (date) =>
          days.includes(date.getDay()),
        );
      }
    }
  }

  /**
   * Arm a setTimeout for the given schedule. When it fires, trigger the
   * callback and reschedule for the next occurrence.
   */
  private scheduleTimer(schedule: ScheduledSession): void {
    this.clearTimer(schedule.id);

    const delay = Math.max(0, schedule.nextRunAt.getTime() - Date.now());

    const timerId = setTimeout(() => {
      this.timers.delete(schedule.id);

      if (this.onTrigger && schedule.enabled) {
        this.onTrigger(schedule);
      }

      // Reschedule for the next occurrence
      if (schedule.enabled && this.running) {
        schedule.nextRunAt = this.calculateNextRun(schedule.repeatConfig);
        this.scheduleTimer(schedule);
      }
    }, delay);

    this.timers.set(schedule.id, timerId);
  }

  /**
   * Clear a single timer by schedule ID.
   */
  private clearTimer(id: string): void {
    const timerId = this.timers.get(id);
    if (timerId !== undefined) {
      clearTimeout(timerId);
      this.timers.delete(id);
    }
  }
}

/**
 * Parse a "HH:mm" time string into [hours, minutes].
 */
function parseTime(time: string): [number, number] {
  const parts = time.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  return [hours, minutes];
}

/**
 * Starting from `candidate`, advance day-by-day until `predicate` returns true.
 * Searches up to 7 days to avoid infinite loops.
 */
function findNextMatchingDay(
  candidate: Date,
  predicate: (date: Date) => boolean,
): Date {
  const result = new Date(candidate);
  for (let i = 0; i < 7; i++) {
    if (predicate(result)) {
      return result;
    }
    result.setTime(result.getTime() + MS_PER_DAY);
  }
  // Fallback: return the candidate as-is (should not happen with valid configs)
  return candidate;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
