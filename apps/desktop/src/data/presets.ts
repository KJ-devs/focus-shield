import type { SessionBlock } from "@focus-shield/shared-types";

export interface PresetData {
  id: string;
  name: string;
  icon: string;
  description: string;
  blocks: SessionBlock[];
}

/**
 * Built-in session presets (mirrors @focus-shield/session-engine PRESETS).
 * Defined locally to avoid pulling Node.js dependencies into the browser bundle.
 */
export const PRESETS: PresetData[] = [
  {
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
  },
  {
    id: "deep-work",
    name: "Deep Work",
    icon: "brain",
    description: "90min focus -> 20min break",
    blocks: [
      { type: "focus", duration: 90, blockingEnabled: true },
      { type: "break", duration: 20, blockingEnabled: false },
    ],
  },
  {
    id: "sprint",
    name: "Sprint",
    icon: "lightning",
    description: "45min focus -> 10min break",
    blocks: [
      { type: "focus", duration: 45, blockingEnabled: true },
      { type: "break", duration: 10, blockingEnabled: false },
    ],
  },
  {
    id: "study",
    name: "Study Session",
    icon: "book",
    description: "50min focus -> 10min break",
    blocks: [
      { type: "focus", duration: 50, blockingEnabled: true },
      { type: "break", duration: 10, blockingEnabled: false },
    ],
  },
  {
    id: "flow",
    name: "Flow State",
    icon: "wave",
    description: "120min focus -> 30min break",
    blocks: [
      { type: "focus", duration: 120, blockingEnabled: true },
      { type: "break", duration: 30, blockingEnabled: false },
    ],
  },
  {
    id: "quick-task",
    name: "Quick Task",
    icon: "target",
    description: "15min focus, no break",
    blocks: [
      { type: "focus", duration: 15, blockingEnabled: true },
    ],
  },
  {
    id: "marathon",
    name: "Marathon",
    icon: "fire",
    description: "180min focus -> 30min break",
    blocks: [
      { type: "focus", duration: 180, blockingEnabled: true },
      { type: "break", duration: 30, blockingEnabled: false },
    ],
  },
  {
    id: "study-session",
    name: "Study Session (Flashcards)",
    icon: "study",
    description: "Review your flashcards with timed focus",
    blocks: [
      { type: "focus", duration: 25, blockingEnabled: true },
      { type: "break", duration: 5, blockingEnabled: false },
      { type: "focus", duration: 25, blockingEnabled: true },
      { type: "break", duration: 5, blockingEnabled: false },
    ],
  },
];

const ICON_MAP: Record<string, string> = {
  pomodoro: "\uD83C\uDF45",
  brain: "\uD83E\uDDE0",
  lightning: "\u26A1",
  book: "\uD83D\uDCDA",
  wave: "\uD83C\uDF0A",
  target: "\uD83C\uDFAF",
  fire: "\uD83D\uDD25",
  study: "\uD83D\uDDD2\uFE0F",
};

export function getPresetEmoji(icon: string): string {
  return ICON_MAP[icon] ?? "\uD83D\uDFE2";
}

export function getTotalDurationMinutes(blocks: SessionBlock[]): number {
  return blocks.reduce((sum, b) => sum + b.duration, 0);
}
