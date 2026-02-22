import { randomBytes } from "node:crypto";

/**
 * Methods available for unlocking a session.
 * Extends the base UnlockMethod from shared-types with additional
 * unlock mechanisms introduced in the advanced crypto features.
 */
export type OverrideMethod = "token" | "master_key" | "emergency" | "delayed" | "task";

/**
 * A single log entry recording an unlock attempt or override.
 */
export interface OverrideLogEntry {
  /** Unique identifier for this log entry */
  id: string;
  /** The session this attempt was made against */
  sessionId: string;
  /** Timestamp (ms) when the attempt occurred */
  timestamp: number;
  /** The unlock method used */
  method: OverrideMethod;
  /** Whether the unlock attempt succeeded */
  success: boolean;
  /** Additional context about the attempt */
  metadata?: Record<string, unknown>;
}

/**
 * Input type for logging (id and timestamp are auto-generated).
 */
type LogInput = Omit<OverrideLogEntry, "id" | "timestamp">;

/**
 * Tracks all unlock attempts and emergency overrides.
 *
 * Every attempt to unlock a session is recorded, whether successful or not.
 * This provides transparency for the user's dashboard and enables the
 * accountability features (buddy notifications, streak impact).
 *
 * From project spec F2.4:
 * - Override usage is logged and visible in the dashboard
 * - Can notify accountability buddy on override
 * - Override resets streak and adds "override" tag in stats
 */
export class OverrideLogger {
  private entries: OverrideLogEntry[];

  constructor() {
    this.entries = [];
  }

  /**
   * Log an unlock attempt.
   *
   * Automatically generates a unique ID and timestamp.
   *
   * @param entry - The attempt details (without id and timestamp)
   * @returns The complete log entry with generated id and timestamp
   */
  log(entry: LogInput): OverrideLogEntry {
    const logEntry: OverrideLogEntry = {
      id: randomBytes(16).toString("hex"),
      timestamp: Date.now(),
      ...entry,
    };

    this.entries.push(logEntry);
    return { ...logEntry };
  }

  /**
   * Get all log entries.
   *
   * @returns A copy of all log entries
   */
  getAll(): OverrideLogEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  /**
   * Get log entries for a specific session.
   *
   * @param sessionId - The session ID to filter by
   * @returns Entries matching the session ID
   */
  getBySession(sessionId: string): OverrideLogEntry[] {
    return this.entries
      .filter((e) => e.sessionId === sessionId)
      .map((e) => ({ ...e }));
  }

  /**
   * Get only successful override entries.
   *
   * @returns Entries where success is true
   */
  getSuccessful(): OverrideLogEntry[] {
    return this.entries
      .filter((e) => e.success)
      .map((e) => ({ ...e }));
  }

  /**
   * Get entries within a date range.
   *
   * @param startMs - Start of range (inclusive), timestamp in ms
   * @param endMs - End of range (inclusive), timestamp in ms
   * @returns Entries within the specified range
   */
  getByDateRange(startMs: number, endMs: number): OverrideLogEntry[] {
    return this.entries
      .filter((e) => e.timestamp >= startMs && e.timestamp <= endMs)
      .map((e) => ({ ...e }));
  }

  /**
   * Get a count of attempts grouped by method.
   *
   * @returns Object mapping method names to their counts
   */
  getCountByMethod(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const entry of this.entries) {
      const current = counts[entry.method];
      counts[entry.method] = (current ?? 0) + 1;
    }

    return counts;
  }

  /**
   * Clear all log entries.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Export all entries as a JSON string.
   *
   * @returns JSON representation of all log entries
   */
  toJSON(): string {
    return JSON.stringify(this.entries);
  }

  /**
   * Import entries from a JSON string.
   *
   * Replaces all current entries with the imported ones.
   * Validates that the JSON contains an array of valid log entries.
   *
   * @param json - JSON string containing an array of OverrideLogEntry
   * @throws {Error} If the JSON is invalid or does not contain valid entries
   */
  fromJSON(json: string): void {
    const parsed: unknown = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid JSON: expected an array of log entries");
    }

    const validated: OverrideLogEntry[] = [];

    for (const item of parsed) {
      if (!isValidLogEntry(item)) {
        throw new Error("Invalid JSON: one or more entries have an invalid format");
      }
      validated.push(item);
    }

    this.entries = validated;
  }
}

/**
 * Type guard to validate a parsed JSON value is a valid OverrideLogEntry.
 */
function isValidLogEntry(value: unknown): value is OverrideLogEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj["id"] === "string" &&
    typeof obj["sessionId"] === "string" &&
    typeof obj["timestamp"] === "number" &&
    typeof obj["method"] === "string" &&
    typeof obj["success"] === "boolean" &&
    isValidMethod(obj["method"])
  );
}

/**
 * Check if a string is a valid OverrideMethod.
 */
function isValidMethod(method: string): method is OverrideMethod {
  const validMethods: readonly string[] = ["token", "master_key", "emergency", "delayed", "task"];
  return validMethods.includes(method);
}
