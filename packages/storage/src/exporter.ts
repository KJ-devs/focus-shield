import type { DatabaseAdapter } from "./database";

export interface ExportOptions {
  format: "csv" | "json";
  startDate?: string;
  endDate?: string;
  profileId?: string;
}

/** Raw session run row from SQLite. */
interface SessionRunExportRow {
  id: string;
  session_id: string;
  profile_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  current_block_index: number;
  token_hash: string;
  distraction_attempts: string;
  unlock_attempts: string;
  focus_score: number | null;
  total_focus_minutes: number;
  total_break_minutes: number;
}

/** Raw daily stats row from SQLite. */
interface DailyStatsExportRow {
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

/** Raw session row from SQLite. */
interface SessionExportRow {
  id: string;
  name: string;
  blocks: string;
  lock_level: number;
  blocklist: string;
  custom_blocklist: string | null;
  allowlist: string | null;
  repeat_config: string | null;
  auto_start: number;
  profile_id: string;
  notifications: string;
  created_at: string;
  updated_at: string;
}

/** Raw blocklist row from SQLite. */
interface BlocklistExportRow {
  id: string;
  name: string;
  icon: string;
  category: string;
  domains: string;
  processes: string;
  is_built_in: number;
  created_at: string;
}

/** Raw profile row from SQLite. */
interface ProfileExportRow {
  id: string;
  name: string;
  icon: string;
  default_lock_level: number;
  default_blocklists: string;
  daily_focus_goal: number;
  weekly_focus_goal: number;
  created_at: string;
}

/**
 * Escape a single CSV value according to RFC 4180.
 * Values containing commas, double-quotes, or newlines are wrapped in quotes.
 * Existing double-quotes are escaped by doubling them.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects (with string keys) to CSV format.
 * First row is the header, subsequent rows are values.
 */
function toCsv(
  columns: string[],
  rows: Record<string, unknown>[],
): string {
  const header = columns.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCsvValue(row[col])).join(","),
  );
  return [header, ...dataLines].join("\n");
}

/**
 * Export data from the storage layer in CSV or JSON formats.
 */
export class DataExporter {
  constructor(private db: DatabaseAdapter) {}

  /**
   * Export session runs, optionally filtered by date range and profile.
   */
  exportSessionRuns(options: ExportOptions): string {
    const { rows, columns } = this.querySessionRuns(options);

    if (options.format === "json") {
      return JSON.stringify(rows, null, 2);
    }

    return toCsv(columns, rows);
  }

  /**
   * Export daily stats, optionally filtered by date range and profile.
   */
  exportDailyStats(options: ExportOptions): string {
    const { rows, columns } = this.queryDailyStats(options);

    if (options.format === "json") {
      return JSON.stringify(rows, null, 2);
    }

    return toCsv(columns, rows);
  }

  /**
   * Export all data: sessions, session_runs, daily_stats, blocklists, profiles.
   */
  exportAll(options: ExportOptions): string {
    const sessionRuns = this.querySessionRuns(options);
    const dailyStats = this.queryDailyStats(options);
    const sessions = this.querySessions(options);
    const blocklists = this.queryBlocklists();
    const profiles = this.queryProfiles(options);

    if (options.format === "json") {
      return JSON.stringify(
        {
          sessions: sessions.rows,
          sessionRuns: sessionRuns.rows,
          dailyStats: dailyStats.rows,
          blocklists: blocklists.rows,
          profiles: profiles.rows,
        },
        null,
        2,
      );
    }

    // CSV: concatenate sections with separators
    const sections: string[] = [];

    sections.push("# sessions");
    sections.push(toCsv(sessions.columns, sessions.rows));
    sections.push("");

    sections.push("# session_runs");
    sections.push(toCsv(sessionRuns.columns, sessionRuns.rows));
    sections.push("");

    sections.push("# daily_stats");
    sections.push(toCsv(dailyStats.columns, dailyStats.rows));
    sections.push("");

    sections.push("# blocklists");
    sections.push(toCsv(blocklists.columns, blocklists.rows));
    sections.push("");

    sections.push("# profiles");
    sections.push(toCsv(profiles.columns, profiles.rows));

    return sections.join("\n");
  }

  private querySessionRuns(options: ExportOptions): {
    rows: Record<string, unknown>[];
    columns: string[];
  } {
    const columns = [
      "id",
      "session_id",
      "profile_id",
      "started_at",
      "ended_at",
      "status",
      "current_block_index",
      "token_hash",
      "distraction_attempts",
      "unlock_attempts",
      "focus_score",
      "total_focus_minutes",
      "total_break_minutes",
    ];

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.startDate) {
      conditions.push("started_at >= ?");
      params.push(`${options.startDate}T00:00:00.000Z`);
    }
    if (options.endDate) {
      conditions.push("started_at <= ?");
      params.push(`${options.endDate}T23:59:59.999Z`);
    }
    if (options.profileId) {
      conditions.push("profile_id = ?");
      params.push(options.profileId);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const rawRows = this.db.all<SessionRunExportRow>(
      `SELECT * FROM session_runs${whereClause} ORDER BY started_at ASC`,
      params,
    );

    const rows: Record<string, unknown>[] = rawRows.map((row) => ({
      id: row.id,
      session_id: row.session_id,
      profile_id: row.profile_id,
      started_at: row.started_at,
      ended_at: row.ended_at ?? "",
      status: row.status,
      current_block_index: row.current_block_index,
      token_hash: row.token_hash,
      distraction_attempts: row.distraction_attempts,
      unlock_attempts: row.unlock_attempts,
      focus_score: row.focus_score ?? "",
      total_focus_minutes: row.total_focus_minutes,
      total_break_minutes: row.total_break_minutes,
    }));

    return { rows, columns };
  }

  private queryDailyStats(options: ExportOptions): {
    rows: Record<string, unknown>[];
    columns: string[];
  } {
    const columns = [
      "date",
      "profile_id",
      "total_focus_minutes",
      "total_break_minutes",
      "sessions_completed",
      "sessions_aborted",
      "distraction_attempts",
      "top_distractors",
      "average_focus_score",
      "streak_day",
    ];

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.startDate) {
      conditions.push("date >= ?");
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push("date <= ?");
      params.push(options.endDate);
    }
    if (options.profileId) {
      conditions.push("profile_id = ?");
      params.push(options.profileId);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const rawRows = this.db.all<DailyStatsExportRow>(
      `SELECT * FROM daily_stats${whereClause} ORDER BY date ASC`,
      params,
    );

    const rows: Record<string, unknown>[] = rawRows.map((row) => ({
      date: row.date,
      profile_id: row.profile_id,
      total_focus_minutes: row.total_focus_minutes,
      total_break_minutes: row.total_break_minutes,
      sessions_completed: row.sessions_completed,
      sessions_aborted: row.sessions_aborted,
      distraction_attempts: row.distraction_attempts,
      top_distractors: row.top_distractors,
      average_focus_score: row.average_focus_score,
      streak_day: row.streak_day,
    }));

    return { rows, columns };
  }

  private querySessions(options: ExportOptions): {
    rows: Record<string, unknown>[];
    columns: string[];
  } {
    const columns = [
      "id",
      "name",
      "blocks",
      "lock_level",
      "blocklist",
      "custom_blocklist",
      "allowlist",
      "repeat_config",
      "auto_start",
      "profile_id",
      "notifications",
      "created_at",
      "updated_at",
    ];

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.profileId) {
      conditions.push("profile_id = ?");
      params.push(options.profileId);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const rawRows = this.db.all<SessionExportRow>(
      `SELECT * FROM sessions${whereClause} ORDER BY created_at ASC`,
      params,
    );

    const rows: Record<string, unknown>[] = rawRows.map((row) => ({
      id: row.id,
      name: row.name,
      blocks: row.blocks,
      lock_level: row.lock_level,
      blocklist: row.blocklist,
      custom_blocklist: row.custom_blocklist ?? "",
      allowlist: row.allowlist ?? "",
      repeat_config: row.repeat_config ?? "",
      auto_start: row.auto_start,
      profile_id: row.profile_id,
      notifications: row.notifications,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { rows, columns };
  }

  private queryBlocklists(): {
    rows: Record<string, unknown>[];
    columns: string[];
  } {
    const columns = [
      "id",
      "name",
      "icon",
      "category",
      "domains",
      "processes",
      "is_built_in",
      "created_at",
    ];

    const rawRows = this.db.all<BlocklistExportRow>(
      "SELECT * FROM blocklists ORDER BY created_at ASC",
    );

    const rows: Record<string, unknown>[] = rawRows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      category: row.category,
      domains: row.domains,
      processes: row.processes,
      is_built_in: row.is_built_in,
      created_at: row.created_at,
    }));

    return { rows, columns };
  }

  private queryProfiles(options: ExportOptions): {
    rows: Record<string, unknown>[];
    columns: string[];
  } {
    const columns = [
      "id",
      "name",
      "icon",
      "default_lock_level",
      "default_blocklists",
      "daily_focus_goal",
      "weekly_focus_goal",
      "created_at",
    ];

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.profileId) {
      conditions.push("id = ?");
      params.push(options.profileId);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const rawRows = this.db.all<ProfileExportRow>(
      `SELECT * FROM profiles${whereClause} ORDER BY created_at ASC`,
      params,
    );

    const rows: Record<string, unknown>[] = rawRows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      default_lock_level: row.default_lock_level,
      default_blocklists: row.default_blocklists,
      daily_focus_goal: row.daily_focus_goal,
      weekly_focus_goal: row.weekly_focus_goal,
      created_at: row.created_at,
    }));

    return { rows, columns };
  }
}
