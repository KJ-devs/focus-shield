export type TimerTickCallback = (remaining: number, elapsed: number) => void;

const TICK_INTERVAL_MS = 1000;

/**
 * PrecisionTimer provides a countdown timer with drift compensation.
 *
 * Instead of counting interval ticks, it uses Date.now() to calculate
 * the real elapsed time, ensuring accuracy even when intervals are late
 * (e.g. due to CPU load or event loop delays).
 */
export class PrecisionTimer {
  private startTime = 0;
  private duration = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private tickCallbacks: TimerTickCallback[] = [];
  private completeCallbacks: (() => void)[] = [];
  private paused = false;
  private pauseStart = 0;
  private totalPausedTime = 0;

  /**
   * Start the timer for the given duration in milliseconds.
   */
  start(durationMs: number): void {
    this.stop();
    this.duration = durationMs;
    this.startTime = Date.now();
    this.totalPausedTime = 0;
    this.paused = false;
    this.pauseStart = 0;

    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  /**
   * Pause the timer. Elapsed time stops accumulating while paused.
   */
  pause(): void {
    if (!this.isRunning() || this.paused) {
      return;
    }
    this.paused = true;
    this.pauseStart = Date.now();
  }

  /**
   * Resume the timer after a pause.
   */
  resume(): void {
    if (!this.paused || this.pauseStart === 0) {
      return;
    }
    this.totalPausedTime += Date.now() - this.pauseStart;
    this.pauseStart = 0;
    this.paused = false;
  }

  /**
   * Stop the timer and clear all internal state.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.paused = false;
    this.pauseStart = 0;
  }

  /**
   * Extend the timer by additional milliseconds.
   */
  extend(additionalMs: number): void {
    this.duration += additionalMs;
  }

  /**
   * Get the remaining time in milliseconds.
   */
  getRemaining(): number {
    if (!this.isRunning() && this.startTime === 0) {
      return 0;
    }
    const remaining = this.duration - this.getElapsed();
    return Math.max(0, remaining);
  }

  /**
   * Get the elapsed time in milliseconds, accounting for pauses.
   * Uses Date.now() for drift compensation.
   */
  getElapsed(): number {
    if (this.startTime === 0) {
      return 0;
    }

    const now = this.paused ? this.pauseStart : Date.now();
    const rawElapsed = now - this.startTime - this.totalPausedTime;
    return Math.max(0, Math.min(rawElapsed, this.duration));
  }

  /**
   * Whether the timer is running (started and not stopped).
   * A paused timer is still considered running.
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Whether the timer is currently paused.
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Subscribe to tick events (fired approximately every second).
   * Returns an unsubscribe function.
   */
  onTick(cb: TimerTickCallback): () => void {
    this.tickCallbacks.push(cb);
    return () => {
      this.tickCallbacks = this.tickCallbacks.filter((c) => c !== cb);
    };
  }

  /**
   * Subscribe to the completion event. Returns an unsubscribe function.
   */
  onComplete(cb: () => void): () => void {
    this.completeCallbacks.push(cb);
    return () => {
      this.completeCallbacks = this.completeCallbacks.filter((c) => c !== cb);
    };
  }

  /**
   * Internal tick handler. Recalculates elapsed from Date.now()
   * for drift compensation.
   */
  private tick(): void {
    if (this.paused) {
      return;
    }

    const elapsed = this.getElapsed();
    const remaining = this.duration - elapsed;

    for (const cb of this.tickCallbacks) {
      cb(Math.max(0, remaining), elapsed);
    }

    if (remaining <= 0) {
      this.stop();
      for (const cb of this.completeCallbacks) {
        cb();
      }
    }
  }
}
