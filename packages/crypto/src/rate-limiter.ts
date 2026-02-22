/**
 * Configuration for the rate limiter.
 */
export interface RateLimiterConfig {
  /** Maximum number of failed attempts before cooldown triggers */
  readonly maxAttempts: number;
  /** Duration of the cooldown period in milliseconds */
  readonly cooldownMs: number;
}

/**
 * Result of an attempt check.
 */
export interface AttemptResult {
  /** Whether the attempt is allowed (not in cooldown) */
  readonly allowed: boolean;
  /** Number of attempts remaining before cooldown triggers */
  readonly remainingAttempts: number;
  /** Milliseconds remaining in cooldown (0 if not in cooldown) */
  readonly cooldownRemainingMs: number;
}

/**
 * Internal tracking state for a single key.
 */
interface KeyState {
  /** Number of failed attempts recorded */
  attempts: number;
  /** Timestamp (ms) when cooldown was triggered, or null if not in cooldown */
  cooldownStartedAt: number | null;
}

/** Default: 3 attempts before lockout */
const DEFAULT_MAX_ATTEMPTS = 3;

/** Default: 5 minutes (300,000 ms) cooldown */
const DEFAULT_COOLDOWN_MS = 300_000;

/**
 * In-memory rate limiter for controlling unlock attempt frequency.
 *
 * Tracks failed attempts per key (typically a session or user ID) and
 * enforces a cooldown period after the maximum number of attempts is
 * exceeded. Cooldowns auto-expire based on timestamps checked at access time.
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({ maxAttempts: 3, cooldownMs: 300_000 });
 *
 * const result = limiter.attempt("session-123");
 * if (!result.allowed) {
 *   console.warn(`Locked out. Try again in ${result.cooldownRemainingMs}ms`);
 * }
 * ```
 */
export class RateLimiter {
  private readonly maxAttempts: number;
  private readonly cooldownMs: number;
  private readonly entries: Map<string, KeyState> = new Map();

  constructor(config?: Partial<RateLimiterConfig>) {
    this.maxAttempts = config?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.cooldownMs = config?.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  }

  /**
   * Record an attempt for a key and check if it is allowed.
   *
   * If the key is currently in cooldown, the attempt is rejected.
   * If the key has exhausted all attempts, cooldown is triggered.
   * If the cooldown has expired since last check, the state is auto-reset.
   *
   * @param key - Unique identifier (e.g. session ID, user ID)
   * @returns Result indicating whether the attempt is allowed
   */
  attempt(key: string): AttemptResult {
    const now = Date.now();
    const state = this.getOrCreateState(key);

    // Check if currently in cooldown
    if (state.cooldownStartedAt !== null) {
      const elapsed = now - state.cooldownStartedAt;

      if (elapsed < this.cooldownMs) {
        // Still in cooldown — reject
        return {
          allowed: false,
          remainingAttempts: 0,
          cooldownRemainingMs: this.cooldownMs - elapsed,
        };
      }

      // Cooldown has expired — auto-reset
      state.attempts = 0;
      state.cooldownStartedAt = null;
    }

    // Record the attempt
    state.attempts += 1;

    // Check if max attempts reached
    if (state.attempts >= this.maxAttempts) {
      state.cooldownStartedAt = now;

      return {
        allowed: false,
        remainingAttempts: 0,
        cooldownRemainingMs: this.cooldownMs,
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - state.attempts,
      cooldownRemainingMs: 0,
    };
  }

  /**
   * Reset all attempt tracking for a key.
   * Call this after a successful token verification.
   *
   * @param key - Unique identifier to reset
   */
  reset(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Check if a key is currently in cooldown (locked out).
   *
   * @param key - Unique identifier to check
   * @returns `true` if the key is in an active cooldown period
   */
  isLocked(key: string): boolean {
    return this.getRemainingCooldownMs(key) > 0;
  }

  /**
   * Get the remaining cooldown time for a key in milliseconds.
   *
   * Returns 0 if the key is not in cooldown or if the cooldown has expired.
   * Expired cooldowns are automatically cleaned up during this check.
   *
   * @param key - Unique identifier to check
   * @returns Milliseconds remaining in cooldown, or 0 if not locked
   */
  getRemainingCooldownMs(key: string): number {
    const state = this.entries.get(key);

    if (state === undefined || state.cooldownStartedAt === null) {
      return 0;
    }

    const elapsed = Date.now() - state.cooldownStartedAt;

    if (elapsed >= this.cooldownMs) {
      // Cooldown expired — clean up
      state.attempts = 0;
      state.cooldownStartedAt = null;
      return 0;
    }

    return this.cooldownMs - elapsed;
  }

  /**
   * Get or create the internal state for a key.
   */
  private getOrCreateState(key: string): KeyState {
    const existing = this.entries.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const state: KeyState = {
      attempts: 0,
      cooldownStartedAt: null,
    };

    this.entries.set(key, state);
    return state;
  }
}
