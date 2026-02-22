import type { DatabaseAdapter } from "../database";

/**
 * Snapshot of streak-related data for a profile.
 */
export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezesUsedThisWeek: number;
  freezeAvailable: boolean;
}

/** Streak milestones that the UI can highlight. */
const MILESTONES = [7, 30, 100, 365] as const;

/** Maximum number of streak freezes allowed per ISO week. */
const MAX_FREEZES_PER_WEEK = 1;

/** Shape of a row returned from daily_stats for streak logic. */
interface StatsDayRow {
  date: string;
  sessions_completed: number;
}

/** Shape of a freeze row. */
interface FreezeRow {
  date: string;
}

/**
 * Add one calendar day to an ISO date string ("YYYY-MM-DD").
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Return today's date in ISO format (local timezone).
 */
function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Return the ISO Monday (start of week) for a given date string.
 */
function isoWeekMonday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates streaks by walking daily_stats and streak_freezes tables.
 *
 * A day counts as "active" when either:
 *   - daily_stats.sessions_completed > 0 for that date, OR
 *   - a streak freeze exists for that date.
 *
 * The streak is broken when a calendar day is found that is neither active
 * nor frozen.
 */
export class StreakCalculator {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Calculate the current and longest streaks for a profile.
   */
  calculate(profileId: string): StreakInfo {
    const today = todayISO();

    // Fetch all active days (sessions_completed > 0), ordered descending.
    const activeDays = this.db.all<StatsDayRow>(
      `SELECT date, sessions_completed FROM daily_stats
       WHERE profile_id = ? AND sessions_completed > 0
       ORDER BY date DESC`,
      [profileId],
    );

    // Fetch all freeze dates for this profile.
    const freezeRows = this.db.all<FreezeRow>(
      `SELECT date FROM streak_freezes
       WHERE profile_id = ?
       ORDER BY date DESC`,
      [profileId],
    );

    const activeSet = new Set(activeDays.map((r) => r.date));
    const freezeSet = new Set(freezeRows.map((r) => r.date));

    // Determine last active date.
    const lastActiveDate =
      activeDays.length > 0 ? (activeDays[0]?.date ?? null) : null;

    // Walk backwards from today to compute currentStreak.
    let currentStreak = 0;
    let cursor = today;

    while (true) {
      if (activeSet.has(cursor) || freezeSet.has(cursor)) {
        currentStreak++;
        cursor = addDays(cursor, -1);
      } else {
        break;
      }
    }

    // Compute longestStreak by scanning all known dates.
    // Collect unique dates from both sets, sorted ascending.
    const allDates = Array.from(
      new Set([...activeSet, ...freezeSet]),
    ).sort();

    let longestStreak = 0;
    let runLength = 0;
    let expectedDate: string | null = null;

    for (const date of allDates) {
      if (expectedDate === null || date === expectedDate) {
        runLength++;
      } else {
        runLength = 1;
      }
      if (runLength > longestStreak) {
        longestStreak = runLength;
      }
      expectedDate = addDays(date, 1);
    }

    // Ensure longestStreak is at least as large as currentStreak.
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    const freezesUsedThisWeek = this.getFreezesThisWeek(profileId);

    return {
      currentStreak,
      longestStreak,
      lastActiveDate,
      freezesUsedThisWeek,
      freezeAvailable: freezesUsedThisWeek < MAX_FREEZES_PER_WEEK,
    };
  }

  /**
   * Attempt to use a streak freeze for today.
   *
   * @returns true if the freeze was successfully recorded, false if
   *          the weekly limit has been reached or a freeze already
   *          exists for today.
   */
  useFreeze(profileId: string): boolean {
    const today = todayISO();

    // Check weekly limit.
    if (this.getFreezesThisWeek(profileId) >= MAX_FREEZES_PER_WEEK) {
      return false;
    }

    // Check duplicate.
    const existing = this.db.get<{ date: string }>(
      "SELECT date FROM streak_freezes WHERE profile_id = ? AND date = ?",
      [profileId, today],
    );
    if (existing) {
      return false;
    }

    const id = `freeze-${profileId}-${today}`;
    this.db.run(
      "INSERT INTO streak_freezes (id, profile_id, date) VALUES (?, ?, ?)",
      [id, profileId, today],
    );

    return true;
  }

  /**
   * Check whether the profile has a completed session today.
   */
  isTodayActive(profileId: string): boolean {
    const today = todayISO();
    const row = this.db.get<StatsDayRow>(
      `SELECT sessions_completed FROM daily_stats
       WHERE date = ? AND profile_id = ?`,
      [today, profileId],
    );
    return row !== undefined && row.sessions_completed > 0;
  }

  /**
   * Return which milestone thresholds have been reached by the
   * given current streak value.
   */
  getMilestones(
    currentStreak: number,
  ): { milestone: number; reached: boolean }[] {
    return MILESTONES.map((m) => ({
      milestone: m,
      reached: currentStreak >= m,
    }));
  }

  // ────────────────────── private helpers ──────────────────────

  private getFreezesThisWeek(profileId: string): number {
    const today = todayISO();
    const weekStart = isoWeekMonday(today);
    const weekEnd = addDays(weekStart, 6);

    const row = this.db.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM streak_freezes
       WHERE profile_id = ? AND date >= ? AND date <= ?`,
      [profileId, weekStart, weekEnd],
    );

    return row?.cnt ?? 0;
  }
}
