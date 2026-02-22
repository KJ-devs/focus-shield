export interface BlockTheme {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  bgClass: string;
  accentClass: string;
  textClass: string;
}

export const BLOCK_THEMES: BlockTheme[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean blue focus colors for a calm, productive atmosphere.",
    requiredLevel: 0,
    bgClass: "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-950",
    accentClass: "text-blue-600 dark:text-blue-400",
    textClass: "text-blue-900 dark:text-blue-100",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Lush green tones inspired by nature and tranquility.",
    requiredLevel: 3,
    bgClass: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-green-950",
    accentClass: "text-emerald-600 dark:text-emerald-400",
    textClass: "text-emerald-900 dark:text-emerald-100",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep blue tones evoking the calm of the open sea.",
    requiredLevel: 6,
    bgClass: "bg-gradient-to-br from-cyan-50 to-blue-200 dark:from-gray-900 dark:to-cyan-950",
    accentClass: "text-cyan-600 dark:text-cyan-400",
    textClass: "text-cyan-900 dark:text-cyan-100",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange and purple gradients for an energizing atmosphere.",
    requiredLevel: 9,
    bgClass: "bg-gradient-to-br from-orange-50 to-purple-100 dark:from-gray-900 dark:to-orange-950",
    accentClass: "text-orange-600 dark:text-orange-400",
    textClass: "text-orange-900 dark:text-orange-100",
  },
  {
    id: "cosmos",
    name: "Cosmos",
    description: "Dark purple with starry accents for deep concentration.",
    requiredLevel: 12,
    bgClass: "bg-gradient-to-br from-purple-100 to-indigo-200 dark:from-gray-950 dark:to-purple-950",
    accentClass: "text-purple-600 dark:text-purple-400",
    textClass: "text-purple-900 dark:text-purple-100",
  },
  {
    id: "zen",
    name: "Zen",
    description: "Minimalist earth tones for a serene, distraction-free feel.",
    requiredLevel: 15,
    bgClass: "bg-gradient-to-br from-stone-50 to-amber-50 dark:from-gray-900 dark:to-stone-900",
    accentClass: "text-stone-600 dark:text-stone-400",
    textClass: "text-stone-900 dark:text-stone-100",
  },
];

/**
 * Returns the highest-level theme the user has unlocked.
 */
export function getUnlockedThemes(userLevel: number): BlockTheme[] {
  return BLOCK_THEMES.filter((theme) => theme.requiredLevel <= userLevel);
}

/**
 * Returns a theme by its ID, falling back to the default theme.
 */
export function getThemeById(id: string): BlockTheme {
  const theme = BLOCK_THEMES.find((t) => t.id === id);
  return theme ?? (BLOCK_THEMES[0] as BlockTheme);
}
