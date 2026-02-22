import { createDatabase } from "../database";
import type { DatabaseAdapter } from "../database";
import { runMigrations, getCurrentVersion } from "../migrations";
import type { Migration } from "../migrations";

describe("Migration system", () => {
  let db: DatabaseAdapter;

  beforeEach(() => {
    db = createDatabase();
  });

  afterEach(() => {
    db.close();
  });

  const migration1: Migration = {
    version: 1,
    name: "create_users",
    up: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
    down: "DROP TABLE IF EXISTS users;",
  };

  const migration2: Migration = {
    version: 2,
    name: "create_posts",
    up: "CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL, user_id INTEGER REFERENCES users(id));",
    down: "DROP TABLE IF EXISTS posts;",
  };

  const migration3: Migration = {
    version: 3,
    name: "add_email_to_users",
    up: "ALTER TABLE users ADD COLUMN email TEXT;",
    down: "-- SQLite does not support DROP COLUMN easily",
  };

  describe("getCurrentVersion()", () => {
    it("returns 0 for a fresh database with no migrations", () => {
      const version = getCurrentVersion(db);
      expect(version).toBe(0);
    });

    it("creates the _migrations table when called on fresh DB", () => {
      getCurrentVersion(db);
      // Verify _migrations table exists by querying it
      const rows = db.all<{ version: number }>(
        "SELECT * FROM _migrations",
      );
      expect(rows).toEqual([]);
    });

    it("returns the latest version after migrations are applied", () => {
      runMigrations(db, [migration1, migration2]);
      const version = getCurrentVersion(db);
      expect(version).toBe(2);
    });

    it("returns the highest version even if migrations were run out of order in the array", () => {
      // Pass migrations in reverse order — they should still be sorted internally
      runMigrations(db, [migration2, migration1]);
      const version = getCurrentVersion(db);
      expect(version).toBe(2);
    });
  });

  describe("runMigrations()", () => {
    it("creates the _migrations table", () => {
      runMigrations(db, []);
      // Table should exist
      const row = db.get<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'",
      );
      expect(row).toBeDefined();
      expect(row?.name).toBe("_migrations");
    });

    it("applies migrations in version order", () => {
      // Pass in reverse order to test sorting
      runMigrations(db, [migration2, migration1]);

      // Both tables should exist
      db.run("INSERT INTO users (id, name) VALUES (?, ?)", [1, "Alice"]);
      db.run(
        "INSERT INTO posts (id, title, user_id) VALUES (?, ?, ?)",
        [1, "Hello", 1],
      );

      const user = db.get<{ name: string }>(
        "SELECT name FROM users WHERE id = 1",
      );
      expect(user?.name).toBe("Alice");

      const post = db.get<{ title: string }>(
        "SELECT title FROM posts WHERE id = 1",
      );
      expect(post?.title).toBe("Hello");
    });

    it("records each migration in _migrations table", () => {
      runMigrations(db, [migration1, migration2]);

      const rows = db.all<{ version: number; name: string }>(
        "SELECT version, name FROM _migrations ORDER BY version",
      );
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ version: 1, name: "create_users" });
      expect(rows[1]).toEqual({ version: 2, name: "create_posts" });
    });

    it("records applied_at timestamp for each migration", () => {
      runMigrations(db, [migration1]);

      const row = db.get<{ applied_at: string }>(
        "SELECT applied_at FROM _migrations WHERE version = 1",
      );
      expect(row).toBeDefined();
      // Should be a valid ISO date string
      const date = new Date(row!.applied_at);
      expect(date.getTime()).not.toBeNaN();
    });

    it("skips already-applied migrations", () => {
      // First run: apply migration 1
      runMigrations(db, [migration1]);
      expect(getCurrentVersion(db)).toBe(1);

      // Second run: pass migrations 1 and 2, only 2 should be applied
      runMigrations(db, [migration1, migration2]);
      expect(getCurrentVersion(db)).toBe(2);

      // Verify only 2 rows in _migrations (not 3)
      const rows = db.all<{ version: number }>(
        "SELECT version FROM _migrations ORDER BY version",
      );
      expect(rows).toHaveLength(2);
    });

    it("applies migrations incrementally across multiple calls", () => {
      runMigrations(db, [migration1]);
      expect(getCurrentVersion(db)).toBe(1);

      runMigrations(db, [migration1, migration2]);
      expect(getCurrentVersion(db)).toBe(2);

      runMigrations(db, [migration1, migration2, migration3]);
      expect(getCurrentVersion(db)).toBe(3);

      // Verify email column was added
      db.run("INSERT INTO users (id, name, email) VALUES (?, ?, ?)", [
        1,
        "Alice",
        "alice@example.com",
      ]);
      const user = db.get<{ email: string }>(
        "SELECT email FROM users WHERE id = 1",
      );
      expect(user?.email).toBe("alice@example.com");
    });

    it("rolls back on migration failure", () => {
      const badMigration: Migration = {
        version: 2,
        name: "bad_migration",
        up: "CREATE TABLE nonexistent_ref (id INTEGER REFERENCES nonexistent_table_xyz(id)); INSERT INTO nonexistent_ref VALUES (1);",
        down: "DROP TABLE IF EXISTS nonexistent_ref;",
      };

      // Apply migration 1 successfully
      runMigrations(db, [migration1]);
      expect(getCurrentVersion(db)).toBe(1);

      // Migration 2 should fail
      expect(() => runMigrations(db, [migration1, badMigration])).toThrow(
        /Migration 2.*failed/,
      );

      // Version should still be 1 (migration 2 was rolled back)
      expect(getCurrentVersion(db)).toBe(1);
    });

    it("wraps each migration in a transaction", () => {
      const failingMigration: Migration = {
        version: 2,
        name: "partial_failure",
        up: `
          CREATE TABLE temp_table (id INTEGER PRIMARY KEY);
          INSERT INTO temp_table VALUES (1);
          INSERT INTO completely_invalid_table VALUES (1);
        `,
        down: "DROP TABLE IF EXISTS temp_table;",
      };

      runMigrations(db, [migration1]);

      expect(() =>
        runMigrations(db, [migration1, failingMigration]),
      ).toThrow();

      // The temp_table should NOT exist because the transaction was rolled back
      const table = db.get<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='temp_table'",
      );
      expect(table).toBeUndefined();
    });

    it("does nothing when passed an empty array", () => {
      runMigrations(db, []);
      expect(getCurrentVersion(db)).toBe(0);
    });

    it("throws with a descriptive error message on failure", () => {
      const badMigration: Migration = {
        version: 1,
        name: "will_fail",
        up: "INVALID SQL STATEMENT HERE",
        down: "",
      };

      expect(() => runMigrations(db, [badMigration])).toThrow(
        /Migration 1 \(will_fail\) failed/,
      );
    });
  });
});
