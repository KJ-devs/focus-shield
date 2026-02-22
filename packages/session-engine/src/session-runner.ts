import type {
  Session,
  SessionBlock,
  SessionEvent,
  SessionEventType,
  SessionState,
} from "@focus-shield/shared-types";
import { SessionStateMachine } from "./state-machine";
import { PrecisionTimer } from "./timer";
import { calculateFocusScore } from "./score";

export type SessionEventCallback = (event: SessionEvent) => void;

const MINUTES_TO_MS = 60_000;

/**
 * SessionRunner is the main orchestrator that ties together
 * the state machine, timer, and event system.
 *
 * It manages the full lifecycle of a session: starting, advancing
 * through blocks, pausing/resuming, unlock requests, and completion.
 */
export class SessionRunner {
  private stateMachine: SessionStateMachine;
  private timer: PrecisionTimer;
  private session: Session;
  private eventListeners: SessionEventCallback[] = [];
  private distractionCount = 0;
  private startedAt: Date | null = null;
  private totalFocusMs = 0;
  private totalBreakMs = 0;
  private blockStartTime = 0;

  constructor(session: Session) {
    this.session = session;
    this.stateMachine = new SessionStateMachine(session.blocks);
    this.timer = new PrecisionTimer();
    this.setupTimerCallbacks();
  }

  /**
   * Start the session. Transitions from idle -> starting -> focus_active
   * and begins the timer for the first block.
   */
  start(): void {
    this.stateMachine.transition("starting");
    this.startedAt = new Date();
    this.emitEvent("session:started");

    this.stateMachine.transition("focus_active");
    this.startCurrentBlock();
  }

  /**
   * Pause the current session. Only valid during focus_active.
   */
  pause(): void {
    this.stateMachine.transition("paused");
    this.timer.pause();
    this.emitEvent("session:paused");
  }

  /**
   * Resume a paused session. Returns to focus_active.
   */
  resume(): void {
    this.stateMachine.transition("focus_active");
    this.timer.resume();
    this.emitEvent("session:resumed");
  }

  /**
   * Request to unlock (exit) the session early.
   * Transitions to unlock_requested state.
   */
  requestUnlock(): void {
    this.stateMachine.transition("unlock_requested");
    this.emitEvent("state:changed", { state: "unlock_requested" });
  }

  /**
   * Cancel an unlock request and return to focus.
   */
  cancelUnlock(): void {
    this.stateMachine.transition("focus_active");
    this.emitEvent("state:changed", { state: "focus_active" });
  }

  /**
   * Mark the session as completed normally.
   */
  complete(): void {
    this.accumulateBlockTime();
    this.timer.stop();
    this.transitionToCompleted();
    this.emitEvent("session:completed", {
      focusScore: this.getFocusScore(),
      totalFocusMinutes: this.totalFocusMs / MINUTES_TO_MS,
      totalBreakMinutes: this.totalBreakMs / MINUTES_TO_MS,
    });
  }

  /**
   * Abort the session early.
   */
  abort(): void {
    this.accumulateBlockTime();
    this.timer.stop();
    this.transitionToCompleted();
    this.emitEvent("session:aborted", {
      focusScore: this.getFocusScore(),
    });
  }

  /**
   * Extend the current block by additional minutes.
   */
  extend(minutes: number): void {
    this.timer.extend(minutes * MINUTES_TO_MS);
    this.emitEvent("session:extended", { additionalMinutes: minutes });
  }

  /**
   * Record a distraction attempt (blocked site/app access).
   */
  recordDistraction(): void {
    this.distractionCount++;
  }

  getState(): SessionState {
    return this.stateMachine.getState();
  }

  getCurrentBlock(): SessionBlock | null {
    const index = this.stateMachine.getBlockIndex();
    return this.session.blocks[index] ?? null;
  }

  getElapsedMinutes(): number {
    return this.timer.getElapsed() / MINUTES_TO_MS;
  }

  getRemainingMinutes(): number {
    return this.timer.getRemaining() / MINUTES_TO_MS;
  }

  getStartedAt(): Date | null {
    return this.startedAt;
  }

  getDistractionCount(): number {
    return this.distractionCount;
  }

  /**
   * Calculate the current focus score based on session progress.
   */
  getFocusScore(): number {
    const plannedFocusMinutes = this.getPlannedFocusMinutes();
    const actualFocusMinutes = this.totalFocusMs / MINUTES_TO_MS;
    const state = this.stateMachine.getState();
    const isCompleted = state === "completed" || state === "review";

    return calculateFocusScore({
      plannedFocusMinutes,
      actualFocusMinutes,
      distractionAttempts: this.distractionCount,
      sessionCompleted: isCompleted,
    });
  }

  /**
   * Subscribe to session events. Returns an unsubscribe function.
   */
  onEvent(cb: SessionEventCallback): () => void {
    this.eventListeners.push(cb);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== cb);
    };
  }

  /**
   * Set up timer callbacks for tick and block completion.
   */
  private setupTimerCallbacks(): void {
    this.timer.onTick((remaining, elapsed) => {
      this.emitEvent("timer:tick", {
        remaining,
        elapsed,
      });
    });

    this.timer.onComplete(() => {
      this.onBlockComplete();
    });
  }

  /**
   * Called when the current block's timer expires.
   * Advances to the next block or completes the session.
   */
  private onBlockComplete(): void {
    this.accumulateBlockTime();
    this.emitEvent("block:ended", {
      blockIndex: this.stateMachine.getBlockIndex(),
    });

    const nextIndex = this.stateMachine.getBlockIndex() + 1;
    if (nextIndex >= this.session.blocks.length) {
      this.transitionToCompleted();
      this.emitEvent("session:completed", {
        focusScore: this.getFocusScore(),
      });
      return;
    }

    this.advanceToNextBlock();
  }

  /**
   * Transition through the intermediate states to reach the next block.
   */
  private advanceToNextBlock(): void {
    const currentBlock = this.getCurrentBlock();
    const currentType = currentBlock?.type ?? "focus";

    if (currentType === "focus" || currentType === "deep_focus") {
      this.stateMachine.transition("break_transition");
      this.stateMachine.transition("break_active");
    } else {
      this.stateMachine.transition("focus_transition");
      this.stateMachine.transition("focus_active");
    }

    this.emitEvent("block:started", {
      blockIndex: this.stateMachine.getBlockIndex(),
    });

    this.startCurrentBlock();
  }

  /**
   * Start the timer for the current block.
   */
  private startCurrentBlock(): void {
    const block = this.getCurrentBlock();
    if (!block) {
      return;
    }

    this.blockStartTime = Date.now();
    this.timer.start(block.duration * MINUTES_TO_MS);

    this.emitEvent("block:started", {
      blockIndex: this.stateMachine.getBlockIndex(),
      blockType: block.type,
      duration: block.duration,
    });
  }

  /**
   * Accumulate the elapsed time of the current block into
   * focus or break totals.
   */
  private accumulateBlockTime(): void {
    const block = this.getCurrentBlock();
    if (!block || this.blockStartTime === 0) {
      return;
    }

    const elapsedMs = Date.now() - this.blockStartTime;
    if (block.type === "focus" || block.type === "deep_focus") {
      this.totalFocusMs += elapsedMs;
    } else {
      this.totalBreakMs += elapsedMs;
    }
    this.blockStartTime = 0;
  }

  /**
   * Calculate total planned focus minutes from session blocks.
   */
  private getPlannedFocusMinutes(): number {
    return this.session.blocks
      .filter((b) => b.type === "focus" || b.type === "deep_focus")
      .reduce((sum, b) => sum + b.duration, 0);
  }

  /**
   * Safely transition to the completed state from the current state.
   */
  private transitionToCompleted(): void {
    const state = this.stateMachine.getState();
    if (state === "completed" || state === "review" || state === "idle") {
      return;
    }

    if (this.stateMachine.canTransition("completed")) {
      this.stateMachine.transition("completed");
    }
  }

  private emitEvent(
    type: SessionEventType,
    data?: Record<string, unknown>,
  ): void {
    const event: SessionEvent = {
      type,
      sessionId: this.session.id,
      timestamp: new Date(),
      data,
    };

    for (const listener of this.eventListeners) {
      listener(event);
    }
  }
}
