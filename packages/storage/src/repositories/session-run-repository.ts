import type {
  SessionRun,
  SessionRunStatus,
  DistractionAttempt,
  UnlockAttempt,
} from "@focus-shield/shared-types";
import type { DatabaseAdapter } from "../database";

/** Raw row shape as stored in SQLite. */
interface SessionRunRow {
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

function parseDistractionAttempts(json: string): DistractionAttempt[] {
  const raw = JSON.parse(json) as Array<{
    timestamp: string;
    type: DistractionAttempt["type"];
    target: string;
    blocked: boolean;
  }>;
  return raw.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));
}

function parseUnlockAttempts(json: string): UnlockAttempt[] {
  const raw = JSON.parse(json) as Array<{
    timestamp: string;
    method: UnlockAttempt["method"];
    success: boolean;
  }>;
  return raw.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp),
  }));
}

function rowToSessionRun(row: SessionRunRow): SessionRun {
  return {
    id: row.id,
    sessionId: row.session_id,
    profileId: row.profile_id,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
    status: row.status as SessionRunStatus,
    currentBlockIndex: row.current_block_index,
    tokenHash: row.token_hash,
    distractionAttempts: parseDistractionAttempts(row.distraction_attempts),
    unlockAttempts: parseUnlockAttempts(row.unlock_attempts),
    focusScore: row.focus_score ?? undefined,
    totalFocusMinutes: row.total_focus_minutes,
    totalBreakMinutes: row.total_break_minutes,
  };
}

export class SessionRunRepository {
  constructor(private db: DatabaseAdapter) {}

  create(run: SessionRun): void {
    this.db.run(
      `INSERT INTO session_runs (
        id, session_id, profile_id, started_at, ended_at,
        status, current_block_index, token_hash,
        distraction_attempts, unlock_attempts,
        focus_score, total_focus_minutes, total_break_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.sessionId,
        run.profileId,
        run.startedAt.toISOString(),
        run.endedAt ? run.endedAt.toISOString() : null,
        run.status,
        run.currentBlockIndex,
        run.tokenHash,
        JSON.stringify(run.distractionAttempts),
        JSON.stringify(run.unlockAttempts),
        run.focusScore ?? null,
        run.totalFocusMinutes,
        run.totalBreakMinutes,
      ],
    );
  }

  getById(id: string): SessionRun | undefined {
    const row = this.db.get<SessionRunRow>(
      "SELECT * FROM session_runs WHERE id = ?",
      [id],
    );
    return row ? rowToSessionRun(row) : undefined;
  }

  getBySessionId(sessionId: string): SessionRun[] {
    const rows = this.db.all<SessionRunRow>(
      "SELECT * FROM session_runs WHERE session_id = ?",
      [sessionId],
    );
    return rows.map(rowToSessionRun);
  }

  getActive(): SessionRun[] {
    const rows = this.db.all<SessionRunRow>(
      "SELECT * FROM session_runs WHERE status = 'active'",
    );
    return rows.map(rowToSessionRun);
  }

  update(
    id: string,
    updates: Partial<Omit<SessionRun, "id" | "sessionId">>,
  ): void {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (updates.profileId !== undefined) {
      setClauses.push("profile_id = ?");
      params.push(updates.profileId);
    }
    if (updates.startedAt !== undefined) {
      setClauses.push("started_at = ?");
      params.push(updates.startedAt.toISOString());
    }
    if (updates.endedAt !== undefined) {
      setClauses.push("ended_at = ?");
      params.push(updates.endedAt.toISOString());
    }
    if (updates.status !== undefined) {
      setClauses.push("status = ?");
      params.push(updates.status);
    }
    if (updates.currentBlockIndex !== undefined) {
      setClauses.push("current_block_index = ?");
      params.push(updates.currentBlockIndex);
    }
    if (updates.tokenHash !== undefined) {
      setClauses.push("token_hash = ?");
      params.push(updates.tokenHash);
    }
    if (updates.distractionAttempts !== undefined) {
      setClauses.push("distraction_attempts = ?");
      params.push(JSON.stringify(updates.distractionAttempts));
    }
    if (updates.unlockAttempts !== undefined) {
      setClauses.push("unlock_attempts = ?");
      params.push(JSON.stringify(updates.unlockAttempts));
    }
    if (updates.focusScore !== undefined) {
      setClauses.push("focus_score = ?");
      params.push(updates.focusScore);
    }
    if (updates.totalFocusMinutes !== undefined) {
      setClauses.push("total_focus_minutes = ?");
      params.push(updates.totalFocusMinutes);
    }
    if (updates.totalBreakMinutes !== undefined) {
      setClauses.push("total_break_minutes = ?");
      params.push(updates.totalBreakMinutes);
    }

    if (setClauses.length === 0) {
      return;
    }

    params.push(id);
    this.db.run(
      `UPDATE session_runs SET ${setClauses.join(", ")} WHERE id = ?`,
      params,
    );
  }

  delete(id: string): void {
    this.db.run("DELETE FROM session_runs WHERE id = ?", [id]);
  }
}
