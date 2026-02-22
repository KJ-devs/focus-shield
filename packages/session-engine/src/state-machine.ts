import type { SessionState, SessionBlock } from "@focus-shield/shared-types";

export interface StateChangeEvent {
  from: SessionState;
  to: SessionState;
  blockIndex: number;
  timestamp: Date;
}

export type StateChangeCallback = (event: StateChangeEvent) => void;

/**
 * Valid transitions map: each key maps to the set of states it can transition to.
 */
const VALID_TRANSITIONS: Record<SessionState, readonly SessionState[]> = {
  idle: ["starting", "scheduled"],
  scheduled: ["starting", "idle"],
  starting: ["focus_active"],
  focus_active: ["break_transition", "paused", "unlock_requested", "completed"],
  break_transition: ["break_active"],
  break_active: ["focus_transition"],
  focus_transition: ["focus_active"],
  paused: ["focus_active"],
  unlock_requested: ["cooldown_waiting", "password_entry", "focus_active"],
  cooldown_waiting: ["password_entry"],
  password_entry: ["unlock_failed", "unlocked"],
  unlock_failed: ["focus_active"],
  unlocked: ["completed", "review"],
  completed: ["review"],
  review: ["idle"],
};

/**
 * SessionStateMachine manages session lifecycle state transitions.
 *
 * It validates that each transition is legal according to the state machine
 * diagram defined in project.md F1.5, tracks the current block index,
 * and notifies listeners on every state change.
 */
export class SessionStateMachine {
  private state: SessionState = "idle";
  private blockIndex = 0;
  private totalBlocks: number;
  private listeners: StateChangeCallback[] = [];

  constructor(blocks?: SessionBlock[]) {
    this.totalBlocks = blocks?.length ?? 0;
  }

  getState(): SessionState {
    return this.state;
  }

  getBlockIndex(): number {
    return this.blockIndex;
  }

  getTotalBlocks(): number {
    return this.totalBlocks;
  }

  /**
   * Update the total block count (e.g. when blocks are appended via hot extension).
   */
  setTotalBlocks(count: number): void {
    this.totalBlocks = count;
  }

  /**
   * Check whether a transition from the current state to `to` is valid.
   */
  canTransition(to: SessionState): boolean {
    const allowed = VALID_TRANSITIONS[this.state];
    return allowed.includes(to);
  }

  /**
   * Perform a state transition.
   * Throws an error if the transition is not valid from the current state.
   */
  transition(to: SessionState): void {
    if (!this.canTransition(to)) {
      throw new Error(
        `Invalid transition: cannot go from "${this.state}" to "${to}"`,
      );
    }

    const from = this.state;
    this.state = to;

    this.advanceBlockIndex(from, to);

    const event: StateChangeEvent = {
      from,
      to,
      blockIndex: this.blockIndex,
      timestamp: new Date(),
    };

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Subscribe to state change events. Returns an unsubscribe function.
   */
  onStateChange(cb: StateChangeCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  /**
   * Reset the state machine to idle with block index 0.
   */
  reset(): void {
    this.state = "idle";
    this.blockIndex = 0;
  }

  /**
   * Advance the block index when transitioning into a new focus or break block.
   * The index increments when we move from focus_transition -> focus_active
   * or from break_transition -> break_active, indicating the next block has begun.
   */
  private advanceBlockIndex(from: SessionState, to: SessionState): void {
    const isNextFocusBlock = from === "focus_transition" && to === "focus_active";
    const isNextBreakBlock = from === "break_transition" && to === "break_active";

    if (isNextFocusBlock || isNextBreakBlock) {
      if (this.blockIndex < this.totalBlocks - 1) {
        this.blockIndex++;
      }
    }
  }
}
