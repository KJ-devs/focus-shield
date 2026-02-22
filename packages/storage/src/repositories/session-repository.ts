import type { Session, LockLevel } from "@focus-shield/shared-types";
import type { DatabaseAdapter } from "../database";

/** Raw row shape as stored in SQLite. */
interface SessionRow {
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

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    blocks: JSON.parse(row.blocks) as Session["blocks"],
    lockLevel: row.lock_level as LockLevel,
    blocklist: row.blocklist,
    customBlocklist: row.custom_blocklist
      ? (JSON.parse(row.custom_blocklist) as Session["customBlocklist"])
      : undefined,
    allowlist: row.allowlist
      ? (JSON.parse(row.allowlist) as string[])
      : undefined,
    repeat: row.repeat_config
      ? (JSON.parse(row.repeat_config) as Session["repeat"])
      : undefined,
    autoStart: row.auto_start === 1,
    profileId: row.profile_id,
    notifications: JSON.parse(
      row.notifications,
    ) as Session["notifications"],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SessionRepository {
  constructor(private db: DatabaseAdapter) {}

  create(session: Session): void {
    this.db.run(
      `INSERT INTO sessions (
        id, name, blocks, lock_level, blocklist,
        custom_blocklist, allowlist, repeat_config,
        auto_start, profile_id, notifications,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.name,
        JSON.stringify(session.blocks),
        session.lockLevel,
        session.blocklist,
        session.customBlocklist
          ? JSON.stringify(session.customBlocklist)
          : null,
        session.allowlist ? JSON.stringify(session.allowlist) : null,
        session.repeat ? JSON.stringify(session.repeat) : null,
        session.autoStart ? 1 : 0,
        session.profileId,
        JSON.stringify(session.notifications),
        session.createdAt.toISOString(),
        session.updatedAt.toISOString(),
      ],
    );
  }

  getById(id: string): Session | undefined {
    const row = this.db.get<SessionRow>(
      "SELECT * FROM sessions WHERE id = ?",
      [id],
    );
    return row ? rowToSession(row) : undefined;
  }

  getAll(): Session[] {
    const rows = this.db.all<SessionRow>("SELECT * FROM sessions");
    return rows.map(rowToSession);
  }

  getByProfileId(profileId: string): Session[] {
    const rows = this.db.all<SessionRow>(
      "SELECT * FROM sessions WHERE profile_id = ?",
      [profileId],
    );
    return rows.map(rowToSession);
  }

  update(
    id: string,
    updates: Partial<Omit<Session, "id" | "createdAt">>,
  ): void {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) {
      setClauses.push("name = ?");
      params.push(updates.name);
    }
    if (updates.blocks !== undefined) {
      setClauses.push("blocks = ?");
      params.push(JSON.stringify(updates.blocks));
    }
    if (updates.lockLevel !== undefined) {
      setClauses.push("lock_level = ?");
      params.push(updates.lockLevel);
    }
    if (updates.blocklist !== undefined) {
      setClauses.push("blocklist = ?");
      params.push(updates.blocklist);
    }
    if (updates.customBlocklist !== undefined) {
      setClauses.push("custom_blocklist = ?");
      params.push(JSON.stringify(updates.customBlocklist));
    }
    if (updates.allowlist !== undefined) {
      setClauses.push("allowlist = ?");
      params.push(JSON.stringify(updates.allowlist));
    }
    if (updates.repeat !== undefined) {
      setClauses.push("repeat_config = ?");
      params.push(JSON.stringify(updates.repeat));
    }
    if (updates.autoStart !== undefined) {
      setClauses.push("auto_start = ?");
      params.push(updates.autoStart ? 1 : 0);
    }
    if (updates.profileId !== undefined) {
      setClauses.push("profile_id = ?");
      params.push(updates.profileId);
    }
    if (updates.notifications !== undefined) {
      setClauses.push("notifications = ?");
      params.push(JSON.stringify(updates.notifications));
    }
    if (updates.updatedAt !== undefined) {
      setClauses.push("updated_at = ?");
      params.push(updates.updatedAt.toISOString());
    }

    if (setClauses.length === 0) {
      return;
    }

    params.push(id);
    this.db.run(
      `UPDATE sessions SET ${setClauses.join(", ")} WHERE id = ?`,
      params,
    );
  }

  delete(id: string): void {
    this.db.run("DELETE FROM sessions WHERE id = ?", [id]);
  }
}
