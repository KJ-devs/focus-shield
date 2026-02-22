import type { DatabaseAdapter } from "../database";
import type { AchievementProgress } from "../gamification/achievements";
import type { XPGain } from "../gamification/xp-system";

/** Raw row shape for user_progress. */
interface ProgressRow {
  profile_id: string;
  total_xp: number;
  achievement_progress: string;
  updated_at: string;
}

/** Raw row shape for xp_history. */
interface XPHistoryRow {
  id: string;
  profile_id: string;
  session_id: string;
  amount: number;
  reason: string;
  timestamp: number;
}

/** Raw row shape for streak_freezes. */
interface FreezeRow {
  id: string;
  profile_id: string;
  date: string;
}

/** Result returned from getProgress(). */
export interface GamificationProgress {
  totalXP: number;
  achievements: AchievementProgress[];
}

/**
 * Persist and query gamification data (XP, achievements, streak freezes).
 */
export class GamificationRepository {
  constructor(private db: DatabaseAdapter) {}

  // ──────────────────── Progress (XP + achievements) ────────────────────

  /**
   * Save (insert or update) the aggregated progress for a profile.
   */
  saveProgress(
    profileId: string,
    totalXP: number,
    achievementProgress: AchievementProgress[],
  ): void {
    const now = new Date().toISOString();
    const progressJson = JSON.stringify(achievementProgress);

    this.db.run(
      `INSERT INTO user_progress (profile_id, total_xp, achievement_progress, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (profile_id) DO UPDATE SET
         total_xp = excluded.total_xp,
         achievement_progress = excluded.achievement_progress,
         updated_at = excluded.updated_at`,
      [profileId, totalXP, progressJson, now],
    );
  }

  /**
   * Retrieve the aggregated progress for a profile.
   * Returns undefined if no record exists yet.
   */
  getProgress(profileId: string): GamificationProgress | undefined {
    const row = this.db.get<ProgressRow>(
      "SELECT * FROM user_progress WHERE profile_id = ?",
      [profileId],
    );

    if (!row) {
      return undefined;
    }

    return {
      totalXP: row.total_xp,
      achievements: JSON.parse(
        row.achievement_progress,
      ) as AchievementProgress[],
    };
  }

  // ──────────────────── XP History ────────────────────

  /**
   * Record a single XP gain event.
   */
  recordXPGain(profileId: string, gain: XPGain): void {
    const id = `xp-${profileId}-${gain.sessionId}-${String(gain.timestamp)}`;
    this.db.run(
      `INSERT INTO xp_history (id, profile_id, session_id, amount, reason, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, profileId, gain.sessionId, gain.amount, gain.reason, gain.timestamp],
    );
  }

  /**
   * Retrieve the XP history for a profile, ordered by most recent first.
   *
   * @param limit - maximum number of records (default: 50)
   */
  getXPHistory(profileId: string, limit = 50): XPGain[] {
    const rows = this.db.all<XPHistoryRow>(
      `SELECT * FROM xp_history
       WHERE profile_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [profileId, limit],
    );

    return rows.map((r) => ({
      sessionId: r.session_id,
      amount: r.amount,
      reason: r.reason,
      timestamp: r.timestamp,
    }));
  }

  // ──────────────────── Streak Freezes ────────────────────

  /**
   * Record a streak freeze for a specific date.
   * Silently ignored if a freeze already exists for that profile + date.
   */
  recordFreeze(profileId: string, date: string): void {
    const id = `freeze-${profileId}-${date}`;
    this.db.run(
      `INSERT OR IGNORE INTO streak_freezes (id, profile_id, date)
       VALUES (?, ?, ?)`,
      [id, profileId, date],
    );
  }

  /**
   * Count the number of streak freezes used during the ISO week
   * that contains `referenceDate`.
   */
  getFreezesThisWeek(profileId: string, referenceDate?: string): number {
    const refDate = referenceDate ?? todayISO();
    const weekStart = isoWeekMonday(refDate);
    const weekEnd = addDays(weekStart, 6);

    const row = this.db.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM streak_freezes
       WHERE profile_id = ? AND date >= ? AND date <= ?`,
      [profileId, weekStart, weekEnd],
    );

    return row?.cnt ?? 0;
  }

  /**
   * Get all freeze records for a profile.
   */
  getAllFreezes(profileId: string): { id: string; date: string }[] {
    const rows = this.db.all<FreezeRow>(
      `SELECT id, date FROM streak_freezes
       WHERE profile_id = ?
       ORDER BY date DESC`,
      [profileId],
    );

    return rows.map((r) => ({ id: r.id, date: r.date }));
  }
}

// ──────────────────── Date helpers (module-private) ────────────────────

function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoWeekMonday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
