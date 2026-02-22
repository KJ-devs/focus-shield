import type { DailyStats, Distractor } from "@focus-shield/shared-types";
import type { DatabaseAdapter } from "./database";

export interface WeeklyStats {
  weekStart: string; // "YYYY-MM-DD" (Monday)
  weekEnd: string; // "YYYY-MM-DD" (Sunday)
  profileId: string;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  sessionsCompleted: number;
  sessionsAborted: number;
  distractionAttempts: number;
  averageFocusScore: number;
  averageDailyFocusMinutes: number;
  activeDays: number;
}

export interface MonthlyStats {
  month: string; // "YYYY-MM"
  profileId: string;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  sessionsCompleted: number;
  sessionsAborted: number;
  distractionAttempts: number;
  averageFocusScore: number;
  averageDailyFocusMinutes: number;
  activeDays: number;
  streakDays: number; // longest streak in the month
}

export interface PeakHours {
  hour: number; // 0-23
  averageFocusMinutes: number;
}

/** Raw row for aggregation queries on session_runs. */
interface RunAggRow {
  total_focus: number;
  total_break: number;
  completed_count: number;
  aborted_count: number;
  all_distractions: string; // concatenated JSON arrays, pipe-separated
  score_sum: number;
  score_count: number;
}

/** Raw row for a single session run's distraction data. */
interface DistractionRow {
  distraction_attempts: string;
}

/** Raw row for daily stats aggregation. */
interface DailyStatsRow {
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

/** Raw row for peak hours query. */
interface HourFocusRow {
  hour_of_day: string;
  total_focus: number;
  run_count: number;
}

/**
 * Service that computes aggregated statistics from raw session run data.
 */
export class StatsAggregator {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Aggregate daily stats from session runs for a given date and profile.
   * Computes totals, counts, top distractors, and streak from raw run data.
   */
  aggregateDay(date: string, profileId: string): DailyStats {
    // Query aggregate numbers from session_runs for the given date
    const aggRow = this.db.get<RunAggRow>(
      `SELECT
        COALESCE(SUM(total_focus_minutes), 0) AS total_focus,
        COALESCE(SUM(total_break_minutes), 0) AS total_break,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_count,
        COALESCE(SUM(CASE WHEN status = 'aborted' THEN 1 ELSE 0 END), 0) AS aborted_count,
        COALESCE(SUM(CASE WHEN focus_score IS NOT NULL THEN focus_score ELSE 0 END), 0) AS score_sum,
        COALESCE(SUM(CASE WHEN focus_score IS NOT NULL THEN 1 ELSE 0 END), 0) AS score_count
      FROM session_runs
      WHERE started_at >= ? AND started_at < ?
        AND profile_id = ?`,
      [`${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`, profileId],
    );

    const totalFocusMinutes = aggRow?.total_focus ?? 0;
    const totalBreakMinutes = aggRow?.total_break ?? 0;
    const sessionsCompleted = aggRow?.completed_count ?? 0;
    const sessionsAborted = aggRow?.aborted_count ?? 0;
    const scoreSum = aggRow?.score_sum ?? 0;
    const scoreCount = aggRow?.score_count ?? 0;
    const averageFocusScore = scoreCount > 0 ? scoreSum / scoreCount : 0;

    // Gather distraction attempts from all runs for this day
    const distractionRows = this.db.all<DistractionRow>(
      `SELECT distraction_attempts
       FROM session_runs
       WHERE started_at >= ? AND started_at < ?
         AND profile_id = ?`,
      [`${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`, profileId],
    );

    const distractionCounts = new Map<string, number>();
    let totalDistractions = 0;

    for (const row of distractionRows) {
      const attempts = JSON.parse(row.distraction_attempts) as Array<{
        target: string;
      }>;
      totalDistractions += attempts.length;
      for (const attempt of attempts) {
        const current = distractionCounts.get(attempt.target) ?? 0;
        distractionCounts.set(attempt.target, current + 1);
      }
    }

    // Top 5 distractors sorted by count descending
    const topDistractors: Distractor[] = [...distractionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([target, count]) => ({ target, count }));

    // Calculate streak: check if the previous day has stats
    const streakDay = this.calculateStreakForDay(date, profileId);

    return {
      date,
      profileId,
      totalFocusMinutes,
      totalBreakMinutes,
      sessionsCompleted,
      sessionsAborted,
      distractionAttempts: totalDistractions,
      topDistractors,
      averageFocusScore: Math.round(averageFocusScore * 100) / 100,
      streakDay,
    };
  }

  /**
   * Aggregate weekly stats from daily_stats table.
   * @param weekStart - Monday date in "YYYY-MM-DD" format
   */
  aggregateWeek(weekStart: string, profileId: string): WeeklyStats {
    const weekEnd = this.addDays(weekStart, 6);

    const rows = this.db.all<DailyStatsRow>(
      `SELECT * FROM daily_stats
       WHERE date >= ? AND date <= ?
         AND profile_id = ?
       ORDER BY date ASC`,
      [weekStart, weekEnd, profileId],
    );

    let totalFocusMinutes = 0;
    let totalBreakMinutes = 0;
    let sessionsCompleted = 0;
    let sessionsAborted = 0;
    let distractionAttempts = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let activeDays = 0;

    for (const row of rows) {
      totalFocusMinutes += row.total_focus_minutes;
      totalBreakMinutes += row.total_break_minutes;
      sessionsCompleted += row.sessions_completed;
      sessionsAborted += row.sessions_aborted;
      distractionAttempts += row.distraction_attempts;
      if (row.average_focus_score > 0) {
        scoreSum += row.average_focus_score;
        scoreCount += 1;
      }
      if (row.sessions_completed > 0 || row.sessions_aborted > 0) {
        activeDays += 1;
      }
    }

    const averageFocusScore =
      scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : 0;
    const averageDailyFocusMinutes =
      activeDays > 0
        ? Math.round((totalFocusMinutes / activeDays) * 100) / 100
        : 0;

    return {
      weekStart,
      weekEnd,
      profileId,
      totalFocusMinutes,
      totalBreakMinutes,
      sessionsCompleted,
      sessionsAborted,
      distractionAttempts,
      averageFocusScore,
      averageDailyFocusMinutes,
      activeDays,
    };
  }

  /**
   * Aggregate monthly stats from daily_stats table.
   * @param month - "YYYY-MM" format
   */
  aggregateMonth(month: string, profileId: string): MonthlyStats {
    const startDate = `${month}-01`;
    const endDate = this.getLastDayOfMonth(month);

    const rows = this.db.all<DailyStatsRow>(
      `SELECT * FROM daily_stats
       WHERE date >= ? AND date <= ?
         AND profile_id = ?
       ORDER BY date ASC`,
      [startDate, endDate, profileId],
    );

    let totalFocusMinutes = 0;
    let totalBreakMinutes = 0;
    let sessionsCompleted = 0;
    let sessionsAborted = 0;
    let distractionAttempts = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let activeDays = 0;

    // Track longest streak within the month
    let longestStreak = 0;
    let currentStreak = 0;

    for (const row of rows) {
      totalFocusMinutes += row.total_focus_minutes;
      totalBreakMinutes += row.total_break_minutes;
      sessionsCompleted += row.sessions_completed;
      sessionsAborted += row.sessions_aborted;
      distractionAttempts += row.distraction_attempts;
      if (row.average_focus_score > 0) {
        scoreSum += row.average_focus_score;
        scoreCount += 1;
      }

      const isActive =
        row.sessions_completed > 0 || row.sessions_aborted > 0;
      if (isActive) {
        activeDays += 1;
        currentStreak += 1;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }

    const averageFocusScore =
      scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : 0;
    const averageDailyFocusMinutes =
      activeDays > 0
        ? Math.round((totalFocusMinutes / activeDays) * 100) / 100
        : 0;

    return {
      month,
      profileId,
      totalFocusMinutes,
      totalBreakMinutes,
      sessionsCompleted,
      sessionsAborted,
      distractionAttempts,
      averageFocusScore,
      averageDailyFocusMinutes,
      activeDays,
      streakDays: longestStreak,
    };
  }

  /**
   * Find peak focus hours (which hours of the day have the most focus time).
   * @param profileId - profile to query
   * @param days - number of past days to consider (default 30)
   */
  getPeakHours(profileId: string, days = 30): PeakHours[] {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Group session runs by the hour they started in
    // SQLite substr extracts the hour portion from ISO datetime "YYYY-MM-DDTHH:..."
    const rows = this.db.all<HourFocusRow>(
      `SELECT
        substr(started_at, 12, 2) AS hour_of_day,
        SUM(total_focus_minutes) AS total_focus,
        COUNT(*) AS run_count
      FROM session_runs
      WHERE started_at >= ? AND started_at <= ?
        AND profile_id = ?
      GROUP BY hour_of_day
      ORDER BY hour_of_day ASC`,
      [startIso, endIso, profileId],
    );

    return rows.map((row) => ({
      hour: parseInt(row.hour_of_day, 10),
      averageFocusMinutes:
        row.run_count > 0
          ? Math.round((row.total_focus / row.run_count) * 100) / 100
          : 0,
    }));
  }

  /**
   * Recalculate and store daily stats for a date range.
   * Iterates each day, aggregates from session_runs, and upserts into daily_stats.
   */
  recalculateRange(
    startDate: string,
    endDate: string,
    profileId: string,
  ): void {
    let current = startDate;
    while (current <= endDate) {
      const stats = this.aggregateDay(current, profileId);

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

      current = this.addDays(current, 1);
    }
  }

  /**
   * Calculate the streak day count for a specific date.
   * Checks consecutive previous days that have at least one completed session.
   */
  private calculateStreakForDay(date: string, profileId: string): number {
    // Check if the current day has any completed sessions
    const currentDayRow = this.db.get<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM session_runs
       WHERE started_at >= ? AND started_at < ?
         AND profile_id = ?
         AND status = 'completed'`,
      [`${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`, profileId],
    );

    if (!currentDayRow || currentDayRow.cnt === 0) {
      return 0;
    }

    // Walk backwards from the previous day
    let streak = 1;
    let checkDate = this.addDays(date, -1);

    // Look back at daily_stats for previous days (already aggregated)
    // Fall back to session_runs if daily_stats not yet computed
    for (let i = 0; i < 365; i++) {
      const statsRow = this.db.get<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM daily_stats
         WHERE date = ? AND profile_id = ? AND sessions_completed > 0`,
        [checkDate, profileId],
      );

      if (statsRow && statsRow.cnt > 0) {
        streak += 1;
        checkDate = this.addDays(checkDate, -1);
        continue;
      }

      // If no daily_stats entry, check session_runs directly
      const runRow = this.db.get<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM session_runs
         WHERE started_at >= ? AND started_at < ?
           AND profile_id = ?
           AND status = 'completed'`,
        [
          `${checkDate}T00:00:00.000Z`,
          `${checkDate}T23:59:59.999Z`,
          profileId,
        ],
      );

      if (runRow && runRow.cnt > 0) {
        streak += 1;
        checkDate = this.addDays(checkDate, -1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Add days to a "YYYY-MM-DD" date string.
   * Returns a new "YYYY-MM-DD" string.
   */
  private addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Get the last day of a month from "YYYY-MM" format.
   * Returns "YYYY-MM-DD".
   */
  private getLastDayOfMonth(month: string): string {
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr ?? "2000", 10);
    const mon = parseInt(monthStr ?? "1", 10);
    // Day 0 of next month = last day of current month
    const lastDay = new Date(Date.UTC(year, mon, 0));
    return lastDay.toISOString().slice(0, 10);
  }
}
