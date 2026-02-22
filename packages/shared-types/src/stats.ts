export interface DailyStats {
  date: string; // "YYYY-MM-DD"
  profileId: string;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  sessionsCompleted: number;
  sessionsAborted: number;
  distractionAttempts: number;
  topDistractors: Distractor[];
  averageFocusScore: number;
  streakDay: number;
}

export interface Distractor {
  target: string;
  count: number;
}
