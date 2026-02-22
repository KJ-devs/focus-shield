import type { Profile, LockLevel } from "@focus-shield/shared-types";
import type { DatabaseAdapter } from "../database";

/** Raw row shape as stored in SQLite. */
interface ProfileRow {
  id: string;
  name: string;
  icon: string;
  default_lock_level: number;
  default_blocklists: string;
  daily_focus_goal: number;
  weekly_focus_goal: number;
  created_at: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    defaultLockLevel: row.default_lock_level as LockLevel,
    defaultBlocklists: JSON.parse(row.default_blocklists) as string[],
    dailyFocusGoal: row.daily_focus_goal,
    weeklyFocusGoal: row.weekly_focus_goal,
    createdAt: new Date(row.created_at),
  };
}

export class ProfileRepository {
  constructor(private db: DatabaseAdapter) {}

  create(profile: Profile): void {
    this.db.run(
      `INSERT INTO profiles (
        id, name, icon, default_lock_level, default_blocklists,
        daily_focus_goal, weekly_focus_goal, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.name,
        profile.icon,
        profile.defaultLockLevel,
        JSON.stringify(profile.defaultBlocklists),
        profile.dailyFocusGoal,
        profile.weeklyFocusGoal,
        profile.createdAt.toISOString(),
      ],
    );
  }

  getById(id: string): Profile | undefined {
    const row = this.db.get<ProfileRow>(
      "SELECT * FROM profiles WHERE id = ?",
      [id],
    );
    return row ? rowToProfile(row) : undefined;
  }

  getAll(): Profile[] {
    const rows = this.db.all<ProfileRow>("SELECT * FROM profiles");
    return rows.map(rowToProfile);
  }

  update(
    id: string,
    updates: Partial<Omit<Profile, "id" | "createdAt">>,
  ): void {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) {
      setClauses.push("name = ?");
      params.push(updates.name);
    }
    if (updates.icon !== undefined) {
      setClauses.push("icon = ?");
      params.push(updates.icon);
    }
    if (updates.defaultLockLevel !== undefined) {
      setClauses.push("default_lock_level = ?");
      params.push(updates.defaultLockLevel);
    }
    if (updates.defaultBlocklists !== undefined) {
      setClauses.push("default_blocklists = ?");
      params.push(JSON.stringify(updates.defaultBlocklists));
    }
    if (updates.dailyFocusGoal !== undefined) {
      setClauses.push("daily_focus_goal = ?");
      params.push(updates.dailyFocusGoal);
    }
    if (updates.weeklyFocusGoal !== undefined) {
      setClauses.push("weekly_focus_goal = ?");
      params.push(updates.weeklyFocusGoal);
    }

    if (setClauses.length === 0) {
      return;
    }

    params.push(id);
    this.db.run(
      `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = ?`,
      params,
    );
  }

  delete(id: string): void {
    this.db.run("DELETE FROM profiles WHERE id = ?", [id]);
  }
}
