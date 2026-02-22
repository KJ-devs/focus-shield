import type { DailyStats, Distractor } from "@focus-shield/shared-types";
import type { DatabaseAdapter } from "../database";

/** Raw row shape as stored in SQLite. */
interface StatsRow {
  date: string;
  profile_id: string;
  total_focus_minutes: number;
  total_break_minutes: number;
  sessions_completed: number;
  sessions_aborted: number;
  distraction_attempts: number;
  top_distractors: string;
  average_focus_score: number;
  streak_day: number;
}

function rowToStats(row: StatsRow): DailyStats {
  return {
    date: row.date,
    profileId: row.profile_id,
    totalFocusMinutes: row.total_focus_minutes,
    totalBreakMinutes: row.total_break_minutes,
    sessionsCompleted: row.sessions_completed,
    sessionsAborted: row.sessions_aborted,
    distractionAttempts: row.distraction_attempts,
    topDistractors: JSON.parse(row.top_distractors) as Distractor[],
    averageFocusScore: row.average_focus_score,
    streakDay: row.streak_day,
  };
}

export class StatsRepository {
  constructor(private db: DatabaseAdapter) {}

  upsert(stats: DailyStats): void {
    this.db.run(
      `INSERT INTO daily_stats (
        date, profile_id, total_focus_minutes, total_break_minutes,
        sessions_completed, sessions_aborted, distraction_attempts,
        top_distractors, average_focus_score, streak_day
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (date, profile_id) DO UPDATE SET
        total_focus_minutes = excluded.total_focus_minutes,
        total_break_minutes = excluded.total_break_minutes,
        sessions_completed = excluded.sessions_completed,
        sessions_aborted = excluded.sessions_aborted,
        distraction_attempts = excluded.distraction_attempts,
        top_distractors = excluded.top_distractors,
        average_focus_score = excluded.average_focus_score,
        streak_day = excluded.streak_day`,
      [
        stats.date,
        stats.profileId,
        stats.totalFocusMinutes,
        stats.totalBreakMinutes,
        stats.sessionsCompleted,
        stats.sessionsAborted,
        stats.distractionAttempts,
        JSON.stringify(stats.topDistractors),
        stats.averageFocusScore,
        stats.streakDay,
      ],
    );
  }

  getByDate(date: string, profileId: string): DailyStats | undefined {
    const row = this.db.get<StatsRow>(
      "SELECT * FROM daily_stats WHERE date = ? AND profile_id = ?",
      [date, profileId],
    );
    return row ? rowToStats(row) : undefined;
  }

  getRange(
    startDate: string,
    endDate: string,
    profileId: string,
  ): DailyStats[] {
    const rows = this.db.all<StatsRow>(
      "SELECT * FROM daily_stats WHERE date >= ? AND date <= ? AND profile_id = ? ORDER BY date ASC",
      [startDate, endDate, profileId],
    );
    return rows.map(rowToStats);
  }

  getAll(profileId: string): DailyStats[] {
    const rows = this.db.all<StatsRow>(
      "SELECT * FROM daily_stats WHERE profile_id = ? ORDER BY date ASC",
      [profileId],
    );
    return rows.map(rowToStats);
  }
}
