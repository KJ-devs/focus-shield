/**
 * Types of input events that can be recorded for anti-paste validation.
 */
export interface InputEvent {
  /** The type of DOM event */
  type: "keydown" | "paste" | "input" | "drop";
  /** Timestamp of the event in milliseconds */
  timestamp: number;
  /** The key pressed (for keydown events) */
  key?: string;
  /** The input type from InputEvent (e.g., 'insertFromPaste', 'insertText') */
  inputType?: string;
}

/**
 * Result of validating the recorded input sequence.
 */
export interface ValidationResult {
  /** Whether the input sequence is considered valid (no cheating detected) */
  isValid: boolean;
  /** Human-readable reason explaining why validation failed */
  reason?: string;
}

/**
 * Minimum number of consecutive keystrokes to analyze for auto-type detection.
 */
const AUTO_TYPE_MIN_KEYSTROKES = 10;

/**
 * Maximum variance (in milliseconds) between keystroke intervals
 * that triggers auto-type detection. Real human typing has much more
 * variation than automated input.
 */
const AUTO_TYPE_MAX_VARIANCE_MS = 20;

/**
 * Validates input sequences to detect paste, drag-and-drop, and auto-typing.
 *
 * This validator records DOM input events and analyzes them to detect
 * attempts to bypass the manual token entry requirement. It enforces:
 *
 * - No paste events (when paste is not allowed for the lock level)
 * - No drag-and-drop input
 * - No auto-typing tools (detected via suspiciously consistent keystroke timing)
 *
 * The validation logic is pure TypeScript and does not depend on browser APIs.
 * The consuming UI component is responsible for capturing DOM events and
 * converting them to the `InputEvent` format.
 */
export class AntiPasteValidator {
  private events: InputEvent[];
  private pasteAllowed: boolean;

  /**
   * @param pasteAllowed - Whether paste is allowed for this lock level.
   *   Level 1 (Gentle) allows paste; levels 2-4 do not.
   */
  constructor(pasteAllowed: boolean) {
    this.events = [];
    this.pasteAllowed = pasteAllowed;
  }

  /**
   * Record an input event for later validation.
   *
   * @param event - The input event to record
   */
  recordEvent(event: InputEvent): void {
    this.events.push(event);
  }

  /**
   * Validate the entire recorded input sequence.
   *
   * Checks all recorded events for:
   * 1. Paste events (if paste is not allowed)
   * 2. Drop events (always suspicious)
   * 3. Input events with 'insertFromPaste' type
   * 4. Auto-typing patterns (suspiciously consistent keystroke intervals)
   *
   * @returns Validation result with reason if invalid
   */
  validate(): ValidationResult {
    // Check each event for suspicious behavior
    for (const event of this.events) {
      if (this.isEventSuspicious(event)) {
        return {
          isValid: false,
          reason: this.getSuspiciousReason(event),
        };
      }
    }

    // Check for auto-typing patterns across all keydown events
    if (this.detectAutoType()) {
      return {
        isValid: false,
        reason: "Auto-typing detected: keystroke intervals are suspiciously consistent",
      };
    }

    return { isValid: true };
  }

  /**
   * Check if a specific event is suspicious.
   *
   * @param event - The event to check
   * @returns `true` if the event indicates paste, drop, or injection
   */
  isEventSuspicious(event: InputEvent): boolean {
    // Paste events are suspicious when paste is not allowed
    if (!this.pasteAllowed && event.type === "paste") {
      return true;
    }

    // Drop events are always suspicious (drag-and-drop text)
    if (event.type === "drop") {
      return true;
    }

    // Input events with paste-like inputType
    if (!this.pasteAllowed && event.type === "input" && event.inputType === "insertFromPaste") {
      return true;
    }

    // Input events from drop
    if (event.type === "input" && event.inputType === "insertFromDrop") {
      return true;
    }

    return false;
  }

  /**
   * Detect auto-typing by analyzing keystroke interval consistency.
   *
   * Human typing naturally has significant variation in the time between
   * keystrokes. Auto-typing tools produce suspiciously consistent intervals.
   *
   * Detection criteria:
   * - At least 10 consecutive keystrokes
   * - Variance of intervals is less than 20ms
   *
   * @returns `true` if auto-typing is detected
   */
  detectAutoType(): boolean {
    const keydownEvents = this.events.filter((e) => e.type === "keydown");

    if (keydownEvents.length < AUTO_TYPE_MIN_KEYSTROKES) {
      return false;
    }

    // Calculate intervals between consecutive keystrokes
    const intervals: number[] = [];
    for (let i = 1; i < keydownEvents.length; i++) {
      const prev = keydownEvents[i - 1];
      const curr = keydownEvents[i];
      if (prev !== undefined && curr !== undefined) {
        intervals.push(curr.timestamp - prev.timestamp);
      }
    }

    if (intervals.length < AUTO_TYPE_MIN_KEYSTROKES - 1) {
      return false;
    }

    // Calculate variance of intervals
    const sum = intervals.reduce((acc, val) => acc + val, 0);
    const mean = sum / intervals.length;

    const squaredDiffs = intervals.map((val) => (val - mean) ** 2);
    const squaredDiffSum = squaredDiffs.reduce((acc, val) => acc + val, 0);
    const variance = squaredDiffSum / intervals.length;

    return variance < AUTO_TYPE_MAX_VARIANCE_MS;
  }

  /**
   * Reset all recorded events.
   */
  reset(): void {
    this.events = [];
  }

  /**
   * Get a copy of all recorded events.
   *
   * @returns Array of recorded input events
   */
  getEvents(): InputEvent[] {
    return [...this.events];
  }

  /**
   * Get a human-readable reason for why an event is suspicious.
   */
  private getSuspiciousReason(event: InputEvent): string {
    if (!this.pasteAllowed && event.type === "paste") {
      return "Paste detected: clipboard paste is not allowed at this lock level";
    }

    if (event.type === "drop") {
      return "Drop detected: drag-and-drop input is not allowed";
    }

    if (!this.pasteAllowed && event.type === "input" && event.inputType === "insertFromPaste") {
      return "Paste detected: insertFromPaste input event is not allowed at this lock level";
    }

    if (event.type === "input" && event.inputType === "insertFromDrop") {
      return "Drop detected: insertFromDrop input event is not allowed";
    }

    return "Suspicious input event detected";
  }
}
