import Database from "better-sqlite3";

/**
 * Result of an INSERT/UPDATE/DELETE operation.
 */
export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

/**
 * Abstract database adapter interface.
 * Allows swapping the underlying SQL engine (better-sqlite3, Tauri SQL plugin, etc.)
 */
export interface DatabaseAdapter {
  /** Execute raw SQL (e.g. multi-statement DDL). */
  exec(sql: string): void;

  /** Execute a parameterized statement, returning mutation info. */
  run(sql: string, params?: unknown[]): RunResult;

  /** Get a single row. Returns undefined if no match. */
  get<T>(sql: string, params?: unknown[]): T | undefined;

  /** Get all matching rows. */
  all<T>(sql: string, params?: unknown[]): T[];

  /** Close the database connection. */
  close(): void;
}

/**
 * DatabaseAdapter backed by better-sqlite3.
 * Suitable for desktop (Node/Electron/Tauri dev) and testing.
 */
export class BetterSqliteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, params: unknown[] = []): RunResult {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  get<T>(sql: string, params: unknown[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  all<T>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Factory function to create a DatabaseAdapter.
 * If no path is provided, creates an in-memory database.
 */
export function createDatabase(path?: string): DatabaseAdapter {
  return new BetterSqliteAdapter(path ?? ":memory:");
}
