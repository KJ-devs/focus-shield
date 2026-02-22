import type { LockLevel } from "@focus-shield/shared-types";

export interface ProgressionStage {
  /** When this stage begins, in minutes from session start. */
  startMinute: number;
  /** Lock level at this stage. */
  lockLevel: LockLevel;
  /** What level of blocking is applied. */
  blockingLevel: "light" | "moderate" | "full";
  /** Human-readable description of the stage. */
  description: string;
}

export interface ProgressiveConfig {
  totalDurationMinutes: number;
  stages: ProgressionStage[];
}

/**
 * ProgressiveSession manages sessions that start with light blocking
 * and escalate over time.
 *
 * As elapsed time increases, the session advances through stages with
 * progressively stricter blocking. Listeners are notified on each
 * stage transition.
 */
export class ProgressiveSession {
  private config: ProgressiveConfig;
  private currentStageIndex: number;
  private elapsedMinutes: number;
  private stageChangeCallback: ((stage: ProgressionStage) => void) | null;

  constructor(config: ProgressiveConfig) {
    this.config = config;
    this.currentStageIndex = 0;
    this.elapsedMinutes = 0;
    this.stageChangeCallback = null;
  }

  /**
   * Register a callback that fires when the session transitions to a new stage.
   */
  onStageChanged(callback: (stage: ProgressionStage) => void): void {
    this.stageChangeCallback = callback;
  }

  /**
   * Get the current stage based on the last update.
   */
  getCurrentStage(): ProgressionStage {
    const stage = this.config.stages[this.currentStageIndex];
    if (stage) return stage;
    const fallback = this.config.stages[0];
    if (fallback) return fallback;
    throw new Error("No stages configured");

  }

  /**
   * Update elapsed time and check for stage transitions.
   * Returns the current stage after the update.
   */
  update(elapsedMinutes: number): ProgressionStage {
    this.elapsedMinutes = elapsedMinutes;

    const newIndex = this.findStageIndex(elapsedMinutes);

    if (newIndex !== this.currentStageIndex) {
      this.currentStageIndex = newIndex;
      const newStage = this.getCurrentStage();

      if (this.stageChangeCallback) {
        this.stageChangeCallback(newStage);
      }
    }

    return this.getCurrentStage();
  }

  /**
   * Get all stages in the progression.
   */
  getStages(): ProgressionStage[] {
    return [...this.config.stages];
  }

  /**
   * Get stages that have not yet been reached.
   */
  getRemainingStages(): ProgressionStage[] {
    return this.config.stages.filter(
      (stage) => stage.startMinute > this.elapsedMinutes,
    );
  }

  /**
   * Reset the progressive session to its initial state.
   */
  reset(): void {
    this.currentStageIndex = 0;
    this.elapsedMinutes = 0;
  }

  /**
   * Create a default progressive config that scales proportionally
   * to the total duration.
   *
   * Default stages for a 90-minute session:
   * - 0-15 min (first ~17%): level 1, light blocking (notifications only)
   * - 15-45 min (next ~33%): level 2, moderate blocking (social media)
   * - 45-90 min (final ~50%): level 3, full blocking (everything)
   *
   * For other durations, the boundaries are scaled proportionally.
   */
  static createDefault(totalMinutes: number): ProgressiveConfig {
    // Proportions based on the 90-minute reference:
    // Stage 1: 0% to ~17% (0-15 of 90)
    // Stage 2: ~17% to ~50% (15-45 of 90)
    // Stage 3: ~50% to 100% (45-90 of 90)
    const stage1End = Math.round(totalMinutes * (15 / 90));
    const stage2End = Math.round(totalMinutes * (45 / 90));

    const stages: ProgressionStage[] = [
      {
        startMinute: 0,
        lockLevel: 1,
        blockingLevel: "light",
        description: "Light blocking: notifications muted",
      },
      {
        startMinute: stage1End,
        lockLevel: 2,
        blockingLevel: "moderate",
        description: "Moderate blocking: social media blocked",
      },
      {
        startMinute: stage2End,
        lockLevel: 3,
        blockingLevel: "full",
        description: "Full blocking: all distractions blocked",
      },
    ];

    return {
      totalDurationMinutes: totalMinutes,
      stages,
    };
  }

  /**
   * Find the stage index for a given elapsed time.
   * The active stage is the last one whose startMinute <= elapsedMinutes.
   */
  private findStageIndex(elapsedMinutes: number): number {
    let index = 0;
    for (let i = 1; i < this.config.stages.length; i++) {
      const stage = this.config.stages[i];
      if (stage && stage.startMinute <= elapsedMinutes) {
        index = i;
      }
    }
    return index;
  }
}
