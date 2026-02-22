import type {
  BlocklistPreset,
  BlocklistCategory,
} from "@focus-shield/shared-types";
import type { DatabaseAdapter } from "../database";

/** Raw row shape as stored in SQLite. */
interface BlocklistRow {
  id: string;
  name: string;
  icon: string;
  category: string;
  domains: string;
  processes: string;
  is_built_in: number;
  created_at: string;
}

function rowToBlocklist(row: BlocklistRow): BlocklistPreset {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    category: row.category as BlocklistCategory,
    domains: JSON.parse(row.domains) as BlocklistPreset["domains"],
    processes: JSON.parse(row.processes) as BlocklistPreset["processes"],
    isBuiltIn: row.is_built_in === 1,
    createdAt: new Date(row.created_at),
  };
}

export class BlocklistRepository {
  constructor(private db: DatabaseAdapter) {}

  create(blocklist: BlocklistPreset): void {
    this.db.run(
      `INSERT INTO blocklists (
        id, name, icon, category, domains, processes,
        is_built_in, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        blocklist.id,
        blocklist.name,
        blocklist.icon,
        blocklist.category,
        JSON.stringify(blocklist.domains),
        JSON.stringify(blocklist.processes),
        blocklist.isBuiltIn ? 1 : 0,
        blocklist.createdAt.toISOString(),
      ],
    );
  }

  getById(id: string): BlocklistPreset | undefined {
    const row = this.db.get<BlocklistRow>(
      "SELECT * FROM blocklists WHERE id = ?",
      [id],
    );
    return row ? rowToBlocklist(row) : undefined;
  }

  getAll(): BlocklistPreset[] {
    const rows = this.db.all<BlocklistRow>("SELECT * FROM blocklists");
    return rows.map(rowToBlocklist);
  }

  getByCategory(category: BlocklistCategory): BlocklistPreset[] {
    const rows = this.db.all<BlocklistRow>(
      "SELECT * FROM blocklists WHERE category = ?",
      [category],
    );
    return rows.map(rowToBlocklist);
  }

  getBuiltIn(): BlocklistPreset[] {
    const rows = this.db.all<BlocklistRow>(
      "SELECT * FROM blocklists WHERE is_built_in = 1",
    );
    return rows.map(rowToBlocklist);
  }

  update(
    id: string,
    updates: Partial<Omit<BlocklistPreset, "id" | "createdAt">>,
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
    if (updates.category !== undefined) {
      setClauses.push("category = ?");
      params.push(updates.category);
    }
    if (updates.domains !== undefined) {
      setClauses.push("domains = ?");
      params.push(JSON.stringify(updates.domains));
    }
    if (updates.processes !== undefined) {
      setClauses.push("processes = ?");
      params.push(JSON.stringify(updates.processes));
    }
    if (updates.isBuiltIn !== undefined) {
      setClauses.push("is_built_in = ?");
      params.push(updates.isBuiltIn ? 1 : 0);
    }

    if (setClauses.length === 0) {
      return;
    }

    params.push(id);
    this.db.run(
      `UPDATE blocklists SET ${setClauses.join(", ")} WHERE id = ?`,
      params,
    );
  }

  delete(id: string): void {
    this.db.run("DELETE FROM blocklists WHERE id = ?", [id]);
  }
}
