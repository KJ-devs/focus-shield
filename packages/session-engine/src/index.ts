export { SessionStateMachine } from "./state-machine";
export type { StateChangeCallback, StateChangeEvent } from "./state-machine";

export { PrecisionTimer } from "./timer";
export type { TimerTickCallback } from "./timer";

export { PRESETS, getPreset, getAllPresets } from "./presets";

export { calculateFocusScore } from "./score";
export type { ScoreInput } from "./score";

export { SessionRunner } from "./session-runner";
export type { SessionEventCallback } from "./session-runner";

export { SessionScheduler } from "./scheduler";
export type { ScheduledSession, SchedulerCallback } from "./scheduler";

export { SmartPause } from "./smart-pause";
export type { SystemEventCallback } from "./smart-pause";

export { ProgressiveSession } from "./progressive";
export type { ProgressionStage, ProgressiveConfig } from "./progressive";
