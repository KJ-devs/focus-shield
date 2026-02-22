export type SystemEventCallback = () => void;

/**
 * SmartPause detects system lock/unlock events and manages
 * automatic pause/resume of sessions.
 *
 * In production, the Tauri IPC layer calls handleSystemLock() and
 * handleSystemUnlock() when the OS reports lock/unlock events.
 * This class tracks pause durations and notifies registered callbacks
 * so the session timer can be paused and resumed accordingly.
 */
export class SmartPause {
  private lockCallback: SystemEventCallback | null = null;
  private unlockCallback: SystemEventCallback | null = null;
  private paused = false;
  private pausedAt: number | null = null;
  private totalPausedMs = 0;

  /**
   * Register a callback to be invoked when the system locks.
   * Typically used to pause the session timer.
   */
  onLock(callback: SystemEventCallback): void {
    this.lockCallback = callback;
  }

  /**
   * Register a callback to be invoked when the system unlocks.
   * Typically used to resume the session timer.
   */
  onUnlock(callback: SystemEventCallback): void {
    this.unlockCallback = callback;
  }

  /**
   * Handle a system lock event.
   * Called by the Tauri IPC layer (or simulated in tests).
   */
  handleSystemLock(): void {
    if (this.paused) {
      return;
    }

    this.paused = true;
    this.pausedAt = Date.now();

    if (this.lockCallback) {
      this.lockCallback();
    }
  }

  /**
   * Handle a system unlock event.
   * Called by the Tauri IPC layer (or simulated in tests).
   */
  handleSystemUnlock(): void {
    if (!this.paused || this.pausedAt === null) {
      return;
    }

    const pauseDuration = Date.now() - this.pausedAt;
    this.totalPausedMs += pauseDuration;
    this.pausedAt = null;
    this.paused = false;

    if (this.unlockCallback) {
      this.unlockCallback();
    }
  }

  /**
   * Manually pause. Behaves the same as a system lock.
   */
  pause(): void {
    this.handleSystemLock();
  }

  /**
   * Manually resume. Behaves the same as a system unlock.
   */
  resume(): void {
    this.handleSystemUnlock();
  }

  /**
   * Get the total time spent paused in milliseconds.
   * If currently paused, includes the ongoing pause duration.
   */
  getTotalPausedMs(): number {
    if (this.paused && this.pausedAt !== null) {
      return this.totalPausedMs + (Date.now() - this.pausedAt);
    }
    return this.totalPausedMs;
  }

  /**
   * Whether the smart pause is currently active (system is locked).
   */
  getIsPaused(): boolean {
    return this.paused;
  }

  /**
   * Reset all state: paused status, timestamps, and accumulated pause time.
   */
  reset(): void {
    this.paused = false;
    this.pausedAt = null;
    this.totalPausedMs = 0;
  }

  /**
   * Dispose all resources and reset callbacks.
   */
  dispose(): void {
    this.reset();
    this.lockCallback = null;
    this.unlockCallback = null;
  }
}
