import type { DatabaseAdapter } from "./database";

/**
 * A single migration with up/down SQL.
 */
export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

interface MigrationRow {
  version: number;
  name: string;
  applied_at: string;
}

const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`;

/**
 * Returns the current schema version (highest applied migration).
 * Returns 0 if no migrations have been applied.
 */
export function getCurrentVersion(db: DatabaseAdapter): number {
  db.exec(MIGRATIONS_TABLE_SQL);

  const row = db.get<MigrationRow>(
    "SELECT version FROM _migrations ORDER BY version DESC LIMIT 1",
  );

  return row?.version ?? 0;
}

/**
 * Run all unapplied migrations in ascending version order.
 * Each migration runs inside a transaction for atomicity.
 */
export function runMigrations(
  db: DatabaseAdapter,
  migrations: Migration[],
): void {
  db.exec(MIGRATIONS_TABLE_SQL);

  const currentVersion = getCurrentVersion(db);

  const sorted = [...migrations].sort((a, b) => a.version - b.version);

  for (const migration of sorted) {
    if (migration.version <= currentVersion) {
      continue;
    }

    db.exec("BEGIN TRANSACTION;");
    try {
      db.exec(migration.up);

      db.run(
        "INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)",
        [migration.version, migration.name, new Date().toISOString()],
      );

      db.exec("COMMIT;");
    } catch (error: unknown) {
      db.exec("ROLLBACK;");
      const message =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Migration ${migration.version} (${migration.name}) failed: ${message}`,
        { cause: error },
      );
    }
  }
}
