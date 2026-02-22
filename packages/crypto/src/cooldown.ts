import type { LockLevel } from "@focus-shield/shared-types";

/**
 * State of a cooldown timer for a specific session.
 */
export interface CooldownState {
  /** Whether the cooldown is currently active */
  isActive: boolean;
  /** Remaining cooldown time in milliseconds */
  remainingMs: number;
  /** The lock level that triggered this cooldown */
  level: LockLevel;
  /** Timestamp (ms) when the cooldown started, or null if not started */
  startedAt: number | null;
}

/**
 * Cooldown durations per lock level (in milliseconds).
 *
 * From project spec F2.2:
 * - Levels 1-2: No cooldown (0ms)
 * - Level 3 (Strict): 60 seconds before password entry
 * - Level 4 (Hardcore): 120 seconds before password entry
 * - Level 5 (Nuclear): No cooldown (session is uninterruptible)
 */
const COOLDOWN_BY_LEVEL: Record<LockLevel, number> = {
  1: 0,
  2: 0,
  3: 60_000,
  4: 120_000,
  5: 0,
};

/**
 * Lock levels that require double entry of the token.
 *
 * From project spec F2.2: Level 4 (Hardcore) requires double entry.
 */
const DOUBLE_ENTRY_LEVELS: ReadonlySet<LockLevel> = new Set<LockLevel>([4]);

/**
 * Manages cooldown timers for session unlock attempts.
 *
 * Lock levels 3 and 4 require a mandatory waiting period (cooldown) before
 * the user can attempt to enter their unlock token. This creates additional
 * friction to discourage impulsive unlocking.
 *
 * Cooldowns are tracked in-memory per session ID and auto-expire based on
 * timestamp checks.
 */
export class CooldownManager {
  private cooldowns: Map<string, CooldownState>;

  constructor() {
    this.cooldowns = new Map();
  }

  /**
   * Start a cooldown for a session.
   *
   * If the lock level does not require a cooldown (levels 1, 2, 5),
   * the cooldown duration is 0 and the state reflects that.
   *
   * @param sessionId - Unique session identifier
   * @param level - The lock/friction level
   * @returns The cooldown duration in milliseconds
   */
  startCooldown(sessionId: string, level: LockLevel): number {
    const cooldownMs = CooldownManager.getCooldownMs(level);
    const now = Date.now();

    const state: CooldownState = {
      isActive: cooldownMs > 0,
      remainingMs: cooldownMs,
      level,
      startedAt: cooldownMs > 0 ? now : null,
    };

    this.cooldowns.set(sessionId, state);
    return cooldownMs;
  }

  /**
   * Check if cooldown is still active for a session.
   *
   * @param sessionId - Unique session identifier
   * @returns `true` if the cooldown period has not yet elapsed
   */
  isInCooldown(sessionId: string): boolean {
    return this.getRemainingMs(sessionId) > 0;
  }

  /**
   * Get remaining cooldown time in milliseconds.
   *
   * Returns 0 if:
   * - No cooldown exists for this session
   * - The cooldown has expired
   * - The lock level does not require a cooldown
   *
   * @param sessionId - Unique session identifier
   * @returns Remaining cooldown time in milliseconds
   */
  getRemainingMs(sessionId: string): number {
    const state = this.cooldowns.get(sessionId);

    if (state === undefined || state.startedAt === null) {
      return 0;
    }

    const cooldownMs = CooldownManager.getCooldownMs(state.level);
    const elapsed = Date.now() - state.startedAt;
    const remaining = cooldownMs - elapsed;

    if (remaining <= 0) {
      // Cooldown has expired — update state
      state.isActive = false;
      state.remainingMs = 0;
      return 0;
    }

    state.remainingMs = remaining;
    return remaining;
  }

  /**
   * Get the full cooldown state for a session.
   *
   * @param sessionId - Unique session identifier
   * @returns The cooldown state, or undefined if no cooldown exists
   */
  getState(sessionId: string): CooldownState | undefined {
    const state = this.cooldowns.get(sessionId);

    if (state === undefined) {
      return undefined;
    }

    // Refresh the remaining time before returning
    this.getRemainingMs(sessionId);
    return { ...state };
  }

  /**
   * Clear a cooldown for a specific session.
   *
   * @param sessionId - Unique session identifier
   */
  clear(sessionId: string): void {
    this.cooldowns.delete(sessionId);
  }

  /**
   * Clear all tracked cooldowns.
   */
  clearAll(): void {
    this.cooldowns.clear();
  }

  /**
   * Get the required cooldown duration for a lock level.
   *
   * @param level - The lock/friction level (1-5)
   * @returns Cooldown duration in milliseconds
   */
  static getCooldownMs(level: LockLevel): number {
    return COOLDOWN_BY_LEVEL[level];
  }

  /**
   * Check if a lock level requires double entry of the token.
   *
   * Level 4 (Hardcore) requires the user to enter the token twice
   * to confirm accuracy under pressure.
   *
   * @param level - The lock/friction level (1-5)
   * @returns `true` if double entry is required
   */
  static requiresDoubleEntry(level: LockLevel): boolean {
    return DOUBLE_ENTRY_LEVELS.has(level);
  }
}
