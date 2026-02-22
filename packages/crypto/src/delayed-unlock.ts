import { randomBytes } from "node:crypto";

/**
 * Represents a time-delayed unlock request.
 *
 * After requesting an unlock, the user must wait for the delay period
 * to elapse before the unlock becomes available. This gives time for
 * the impulsive urge to pass.
 */
export interface DelayedUnlockRequest {
  /** Unique identifier for this request */
  id: string;
  /** The session this unlock request is for */
  sessionId: string;
  /** Timestamp (ms) when the request was made */
  requestedAt: number;
  /** Timestamp (ms) when the unlock becomes available */
  availableAt: number;
  /** Delay duration in milliseconds */
  delayMs: number;
  /** Current status of the request */
  status: "pending" | "available" | "used" | "expired" | "cancelled";
}

/** Default delay of 10 minutes */
const DEFAULT_DELAY_MS = 600_000;

/**
 * Manages time-delayed unlock requests.
 *
 * When a user requests to unlock a session, this manager creates a
 * pending request with a configurable delay (default: 10 minutes).
 * The unlock only becomes available after the delay has elapsed,
 * giving the user time to reconsider their decision.
 *
 * This is one of the alternative unlock mechanisms described in F2.5
 * of the project specification.
 */
export class DelayedUnlockManager {
  private requests: Map<string, DelayedUnlockRequest>;
  private defaultDelayMs: number;

  /**
   * @param delayMs - Default delay in milliseconds (defaults to 600,000 = 10 minutes)
   */
  constructor(delayMs?: number) {
    this.requests = new Map();
    this.defaultDelayMs = delayMs ?? DEFAULT_DELAY_MS;
  }

  /**
   * Request an unlock for a session.
   *
   * Creates a new pending request with the configured delay.
   * If there is already an active (pending) request for this session,
   * it is replaced by the new one.
   *
   * @param sessionId - The session to unlock
   * @returns The created unlock request
   */
  requestUnlock(sessionId: string): DelayedUnlockRequest {
    const now = Date.now();
    const id = randomBytes(16).toString("hex");

    const request: DelayedUnlockRequest = {
      id,
      sessionId,
      requestedAt: now,
      availableAt: now + this.defaultDelayMs,
      delayMs: this.defaultDelayMs,
      status: "pending",
    };

    this.requests.set(id, request);
    return { ...request };
  }

  /**
   * Check if an unlock request is available (delay has passed).
   *
   * Also updates the status from 'pending' to 'available' if the
   * delay has elapsed.
   *
   * @param requestId - The request to check
   * @returns `true` if the unlock is available for use
   */
  isAvailable(requestId: string): boolean {
    const request = this.requests.get(requestId);

    if (request === undefined) {
      return false;
    }

    if (request.status === "used" || request.status === "expired" || request.status === "cancelled") {
      return false;
    }

    const now = Date.now();

    if (now >= request.availableAt) {
      request.status = "available";
      return true;
    }

    return false;
  }

  /**
   * Use an available unlock request.
   *
   * Marks the request as 'used' so it cannot be used again.
   * The unlock must be in 'available' status (delay elapsed).
   *
   * @param requestId - The request to use
   * @returns `true` if the unlock was successfully used
   */
  useUnlock(requestId: string): boolean {
    if (!this.isAvailable(requestId)) {
      return false;
    }

    const request = this.requests.get(requestId);

    if (request === undefined) {
      return false;
    }

    request.status = "used";
    return true;
  }

  /**
   * Cancel a pending unlock request.
   *
   * Only pending or available requests can be cancelled.
   *
   * @param requestId - The request to cancel
   */
  cancel(requestId: string): void {
    const request = this.requests.get(requestId);

    if (request === undefined) {
      return;
    }

    if (request.status === "pending" || request.status === "available") {
      request.status = "cancelled";
    }
  }

  /**
   * Get a request by its ID.
   *
   * @param requestId - The request ID
   * @returns A copy of the request, or undefined if not found
   */
  getRequest(requestId: string): DelayedUnlockRequest | undefined {
    const request = this.requests.get(requestId);

    if (request === undefined) {
      return undefined;
    }

    // Auto-update status if delay has passed
    if (request.status === "pending" && Date.now() >= request.availableAt) {
      request.status = "available";
    }

    return { ...request };
  }

  /**
   * Get the active (pending or available) request for a session.
   *
   * @param sessionId - The session ID
   * @returns The active request, or undefined if none exists
   */
  getActiveRequest(sessionId: string): DelayedUnlockRequest | undefined {
    for (const request of this.requests.values()) {
      if (request.sessionId === sessionId) {
        // Auto-update status if delay has passed
        if (request.status === "pending" && Date.now() >= request.availableAt) {
          request.status = "available";
        }

        if (request.status === "pending" || request.status === "available") {
          return { ...request };
        }
      }
    }

    return undefined;
  }

  /**
   * Get the remaining delay time for a request in milliseconds.
   *
   * @param requestId - The request ID
   * @returns Remaining time in ms, or 0 if available/expired/not found
   */
  getRemainingMs(requestId: string): number {
    const request = this.requests.get(requestId);

    if (request === undefined) {
      return 0;
    }

    if (request.status !== "pending") {
      return 0;
    }

    const remaining = request.availableAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Clean up expired, used, and cancelled requests.
   *
   * Removes requests that are no longer active to free memory.
   */
  cleanup(): void {
    const toDelete: string[] = [];

    for (const [id, request] of this.requests) {
      if (
        request.status === "used" ||
        request.status === "expired" ||
        request.status === "cancelled"
      ) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.requests.delete(id);
    }
  }
}
