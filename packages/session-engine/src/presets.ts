import type { SessionPreset } from "@focus-shield/shared-types";

/**
 * Built-in session presets matching the specifications in project.md F1.2.
 */
export const PRESETS: Record<string, SessionPreset> = {
  pomodoro: {
    id: "pomodoro",
    name: "Pomodoro Classic",
    icon: "pomodoro",
    description: "4 x [25min focus -> 5min break] -> 15min long break",
    blocks: [
      { type: "focus", duration: 25, blockingEnabled: true },
      { type: "break", duration: 5, blockingEnabled: false },
      { type: "focus", duration: 25, blockingEnabled: true },
      { type: "break", duration: 5, blockingEnabled: false },
      { type: "focus", duration: 25, blockingEnabled: true },
      { type: "break", duration: 5, blockingEnabled: false },
      { type: "focus", duration: 25, blockingEnabled: true },
      { type: "break", duration: 15, blockingEnabled: false },
    ],
    isBuiltIn: true,
  },
  deepWork: {
    id: "deep-work",
    name: "Deep Work",
    icon: "brain",
    description: "90min focus -> 20min break",
    blocks: [
      { type: "focus", duration: 90, blockingEnabled: true },
      { type: "break", duration: 20, blockingEnabled: false },
    ],
    isBuiltIn: true,
  },
  sprint: {
    id: "sprint",
    name: "Sprint",
    icon: "lightning",
    description: "45min focus -> 10min break",
    blocks: [
      { type: "focus", duration: 45, blockingEnabled: true },
      { type: "break", duration: 10, blockingEnabled: false },
    ],
    isBuiltIn: true,
  },
  study: {
    id: "study",
    name: "Study Session",
    icon: "book",
    description: "50min focus -> 10min break",
    blocks: [
      { type: "focus", duration: 50, blockingEnabled: true },
      { type: "break", duration: 10, blockingEnabled: false },
    ],
    isBuiltIn: true,
  },
  flow: {
    id: "flow",
    name: "Flow State",
    icon: "wave",
    description: "120min focus -> 30min break",
    blocks: [
      { type: "focus", duration: 120, blockingEnabled: true },
      { type: "break", duration: 30, blockingEnabled: false },
    ],
    isBuiltIn: true,
  },
  quickTask: {
    id: "quick-task",
    name: "Quick Task",
    icon: "target",
    description: "15min focus, no break",
    blocks: [
      { type: "focus", duration: 15, blockingEnabled: true },
    ],
    isBuiltIn: true,
  },
  marathon: {
    id: "marathon",
    name: "Marathon",
    icon: "fire",
    description: "180min focus -> 30min break",
    blocks: [
      { type: "focus", duration: 180, blockingEnabled: true },
      { type: "break", duration: 30, blockingEnabled: false },
    ],
    isBuiltIn: true,
  },
};

/**
 * Get a specific preset by its ID.
 * Searches both by the record key and the preset's `id` field.
 */
export function getPreset(id: string): SessionPreset | undefined {
  if (PRESETS[id]) {
    return PRESETS[id];
  }
  return Object.values(PRESETS).find((p) => p.id === id);
}

/**
 * Get all built-in presets as an array.
 */
export function getAllPresets(): SessionPreset[] {
  return Object.values(PRESETS);
}
