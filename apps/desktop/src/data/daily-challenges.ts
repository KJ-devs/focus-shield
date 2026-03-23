export interface DailyChallengeDefinition {
  id: string;
  title: string;
  description: string;
  xpBonus: number;
  icon: string;
  check: (session: ChallengeSessionData) => boolean;
}

export interface ChallengeSessionData {
  durationMinutes: number;
  completedNormally: boolean;
  distractionCount: number;
  startHour: number;
  lockLevel: number;
}

const CHALLENGE_POOL: DailyChallengeDefinition[] = [
  {
    id: "long-session",
    title: "Deep Focus",
    description: "Complete a 45+ minute session",
    xpBonus: 50,
    icon: "\uD83E\uDDE0",
    check: (s) => s.durationMinutes >= 45 && s.completedNormally,
  },
  {
    id: "zero-distraction",
    title: "Zen Mode",
    description: "Complete a session with 0 distractions",
    xpBonus: 30,
    icon: "\uD83E\uDDD8",
    check: (s) => s.distractionCount === 0 && s.completedNormally,
  },
  {
    id: "early-start",
    title: "Early Riser",
    description: "Start a session before 9am",
    xpBonus: 20,
    icon: "\uD83C\uDF05",
    check: (s) => s.startHour < 9,
  },
  {
    id: "marathon-mini",
    title: "Mini Marathon",
    description: "Complete a 60+ minute session",
    xpBonus: 40,
    icon: "\uD83C\uDFC3",
    check: (s) => s.durationMinutes >= 60 && s.completedNormally,
  },
  {
    id: "high-lock",
    title: "Challenge Accepted",
    description: "Complete a session at lock level 3+",
    xpBonus: 35,
    icon: "\uD83D\uDD12",
    check: (s) => s.lockLevel >= 3 && s.completedNormally,
  },
  {
    id: "quick-focus",
    title: "Quick Win",
    description: "Complete any session under 20 minutes",
    xpBonus: 15,
    icon: "\u26A1",
    check: (s) => s.durationMinutes > 0 && s.durationMinutes <= 20 && s.completedNormally,
  },
  {
    id: "two-sessions",
    title: "Double Down",
    description: "Complete 2 sessions today",
    xpBonus: 40,
    icon: "\u270C\uFE0F",
    check: () => false, // Checked via daily count, not single session
  },
  {
    id: "perfect-score",
    title: "Flawless",
    description: "Get a 100% focus score",
    xpBonus: 50,
    icon: "\uD83D\uDCAF",
    check: (s) => s.distractionCount === 0 && s.completedNormally && s.durationMinutes >= 15,
  },
  {
    id: "afternoon-focus",
    title: "Afternoon Warrior",
    description: "Start a session between 2-4pm",
    xpBonus: 20,
    icon: "\u2600\uFE0F",
    check: (s) => s.startHour >= 14 && s.startHour < 16,
  },
  {
    id: "evening-grind",
    title: "Night Shift",
    description: "Complete a session after 8pm",
    xpBonus: 25,
    icon: "\uD83C\uDF19",
    check: (s) => s.startHour >= 20 && s.completedNormally,
  },
  {
    id: "hardcore-mode",
    title: "Iron Discipline",
    description: "Complete a session at lock level 4+",
    xpBonus: 45,
    icon: "\uD83D\uDCAA",
    check: (s) => s.lockLevel >= 4 && s.completedNormally,
  },
  {
    id: "moderate-session",
    title: "Steady Pace",
    description: "Complete a 25-35 minute session",
    xpBonus: 20,
    icon: "\u23F0",
    check: (s) => s.durationMinutes >= 25 && s.durationMinutes <= 35 && s.completedNormally,
  },
];

/**
 * Pick 3 daily challenges based on the current date.
 * The selection is deterministic — same day always gives the same 3 challenges.
 */
export function getDailyChallenges(date: Date = new Date()): DailyChallengeDefinition[] {
  const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const shuffled = [...CHALLENGE_POOL].sort((a, b) => {
    const ha = hashCode(a.id + dateKey);
    const hb = hashCode(b.id + dateKey);
    return ha - hb;
  });

  // Always pick first 3 from deterministic shuffle, skip "two-sessions" for simplicity
  const filtered = shuffled.filter((c) => c.id !== "two-sessions");
  return filtered.slice(0, 3);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}
