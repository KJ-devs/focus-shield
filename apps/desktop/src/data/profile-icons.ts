/**
 * Icon mapping for profile icons.
 * Defined locally to keep the UI self-contained.
 */

export interface ProfileIconOption {
  id: string;
  emoji: string;
  label: string;
}

export const PROFILE_ICONS: ProfileIconOption[] = [
  { id: "briefcase", emoji: "\uD83D\uDCBC", label: "Work" },
  { id: "books", emoji: "\uD83D\uDCDA", label: "Study" },
  { id: "laptop", emoji: "\uD83D\uDCBB", label: "Code" },
  { id: "palette", emoji: "\uD83C\uDFA8", label: "Creative" },
  { id: "house", emoji: "\uD83C\uDFE0", label: "Personal" },
  { id: "rocket", emoji: "\uD83D\uDE80", label: "Project" },
  { id: "brain", emoji: "\uD83E\uDDE0", label: "Deep Work" },
  { id: "star", emoji: "\u2B50", label: "Starred" },
  { id: "target", emoji: "\uD83C\uDFAF", label: "Focus" },
  { id: "fire", emoji: "\uD83D\uDD25", label: "Intense" },
  { id: "leaf", emoji: "\uD83C\uDF3F", label: "Chill" },
  { id: "moon", emoji: "\uD83C\uDF19", label: "Night" },
];

const ICON_MAP: Record<string, string> = {};
for (const icon of PROFILE_ICONS) {
  ICON_MAP[icon.id] = icon.emoji;
}

export function getProfileEmoji(icon: string): string {
  return ICON_MAP[icon] ?? "\uD83D\uDFE2";
}
