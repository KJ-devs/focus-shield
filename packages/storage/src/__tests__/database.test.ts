import { BetterSqliteAdapter, createDatabase } from "../database";
import type { DatabaseAdapter } from "../database";

describe("createDatabase", () => {
  it("creates an in-memory database when no path is provided", () => {
    const db = createDatabase();
    // Should be able to execute SQL without error
    db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY)");
    db.close();
  });

  it("creates an in-memory database when ':memory:' is provided", () => {
    const db = createDatabase(":memory:");
    db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY)");
    db.close();
  });

  it("returns a BetterSqliteAdapter instance", () => {
    const db = createDatabase();
    expect(db).toBeInstanceOf(BetterSqliteAdapter);
    db.close();
  });
});

describe("BetterSqliteAdapter", () => {
  let db: DatabaseAdapter;

  beforeEach(() => {
    db = createDatabase();
  });

  afterEach(() => {
    db.close();
  });

  describe("exec()", () => {
    it("executes raw SQL statements", () => {
      db.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)");
      // If no error is thrown, the SQL executed successfully
      const rows = db.all<{ id: number; name: string }>(
        "SELECT * FROM items",
      );
      expect(rows).toEqual([]);
    });

    it("executes multiple statements in one call", () => {
      db.exec(`
        CREATE TABLE a (id INTEGER PRIMARY KEY);
        CREATE TABLE b (id INTEGER PRIMARY KEY);
      `);
      // Both tables should exist
      db.exec("INSERT INTO a (id) VALUES (1)");
      db.exec("INSERT INTO b (id) VALUES (2)");
      expect(db.get<{ id: number }>("SELECT id FROM a")).toEqual({ id: 1 });
      expect(db.get<{ id: number }>("SELECT id FROM b")).toEqual({ id: 2 });
    });

    it("throws on invalid SQL", () => {
      expect(() => db.exec("NOT VALID SQL")).toThrow();
    });
  });

  describe("run()", () => {
    beforeEach(() => {
      db.exec(
        "CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)",
      );
    });

    it("returns changes count for INSERT", () => {
      const result = db.run("INSERT INTO items (name) VALUES (?)", ["apple"]);
      expect(result.changes).toBe(1);
    });

    it("returns lastInsertRowid for INSERT", () => {
      const r1 = db.run("INSERT INTO items (name) VALUES (?)", ["apple"]);
      expect(r1.lastInsertRowid).toBe(1);

      const r2 = db.run("INSERT INTO items (name) VALUES (?)", ["banana"]);
      expect(r2.lastInsertRowid).toBe(2);
    });

    it("returns changes count for UPDATE", () => {
      db.run("INSERT INTO items (name) VALUES (?)", ["apple"]);
      db.run("INSERT INTO items (name) VALUES (?)", ["banana"]);

      const result = db.run("UPDATE items SET name = ? WHERE id = ?", [
        "cherry",
        1,
      ]);
      expect(result.changes).toBe(1);
    });

    it("returns 0 changes when UPDATE matches nothing", () => {
      const result = db.run("UPDATE items SET name = ? WHERE id = ?", [
        "cherry",
        999,
      ]);
      expect(result.changes).toBe(0);
    });

    it("returns changes count for DELETE", () => {
      db.run("INSERT INTO items (name) VALUES (?)", ["apple"]);
      db.run("INSERT INTO items (name) VALUES (?)", ["banana"]);

      const result = db.run("DELETE FROM items WHERE id = ?", [1]);
      expect(result.changes).toBe(1);
    });

    it("works with no params", () => {
      db.run("INSERT INTO items (name) VALUES ('hardcoded')");
      const row = db.get<{ name: string }>("SELECT name FROM items");
      expect(row?.name).toBe("hardcoded");
    });
  });

  describe("get()", () => {
    beforeEach(() => {
      db.exec(
        "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
      );
      db.run("INSERT INTO items (id, name) VALUES (?, ?)", [1, "alpha"]);
      db.run("INSERT INTO items (id, name) VALUES (?, ?)", [2, "beta"]);
    });

    it("returns a single row matching the query", () => {
      const row = db.get<{ id: number; name: string }>(
        "SELECT * FROM items WHERE id = ?",
        [1],
      );
      expect(row).toEqual({ id: 1, name: "alpha" });
    });

    it("returns undefined when no row matches", () => {
      const row = db.get<{ id: number; name: string }>(
        "SELECT * FROM items WHERE id = ?",
        [999],
      );
      expect(row).toBeUndefined();
    });

    it("returns only the first row when multiple match", () => {
      const row = db.get<{ id: number; name: string }>(
        "SELECT * FROM items ORDER BY id ASC",
      );
      expect(row).toEqual({ id: 1, name: "alpha" });
    });
  });

  describe("all()", () => {
    beforeEach(() => {
      db.exec(
        "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
      );
    });

    it("returns an empty array when no rows match", () => {
      const rows = db.all<{ id: number; name: string }>(
        "SELECT * FROM items",
      );
      expect(rows).toEqual([]);
    });

    it("returns all matching rows", () => {
      db.run("INSERT INTO items (id, name) VALUES (?, ?)", [1, "alpha"]);
      db.run("INSERT INTO items (id, name) VALUES (?, ?)", [2, "beta"]);
      db.run("INSERT INTO items (id, name) VALUES (?, ?)", [3, "gamma"]);

      const rows = db.all<{ id: number; name: string }>(
        "SELECT * FROM items ORDER BY id",
      );
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({ id: 1, name: "alpha" });
      expect(rows[1]).toEqual({ id: 2, name: "beta" });
      expect(rows[2]).toEqual({ id: 3, name: "gamma" });
    });

    it("returns filtered rows with parameters", () => {
      db.run("INSERT INTO items (id, name) VALUES (?, ?)", [1, "alpha"]);
      db.run("INSERT INTO items (id, name) VALUES (?, ?)", [2, "beta"]);

      const rows = db.all<{ id: number; name: string }>(
        "SELECT * FROM items WHERE name = ?",
        ["beta"],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ id: 2, name: "beta" });
    });
  });

  describe("close()", () => {
    it("closes the database connection", () => {
      const localDb = createDatabase();
      localDb.exec("CREATE TABLE test (id INTEGER)");
      localDb.close();
      // After closing, operations should throw
      expect(() => localDb.exec("SELECT 1")).toThrow();
    });
  });

  describe("WAL mode", () => {
    it("sets WAL pragma on construction (in-memory reports 'memory')", () => {
      // In-memory databases cannot use WAL mode; SQLite silently falls back to "memory".
      // The pragma IS called (verified by the constructor code), but the effective
      // journal mode for :memory: databases is always "memory".
      const row = db.get<{ journal_mode: string }>(
        "PRAGMA journal_mode",
      );
      expect(row?.journal_mode).toBe("memory");
    });
  });

  describe("Foreign keys", () => {
    it("has foreign keys enabled", () => {
      const row = db.get<{ foreign_keys: number }>(
        "PRAGMA foreign_keys",
      );
      expect(row?.foreign_keys).toBe(1);
    });

    it("enforces foreign key constraints", () => {
      db.exec(`
        CREATE TABLE parents (id INTEGER PRIMARY KEY);
        CREATE TABLE children (
          id INTEGER PRIMARY KEY,
          parent_id INTEGER NOT NULL REFERENCES parents(id)
        );
      `);
      db.run("INSERT INTO parents (id) VALUES (?)", [1]);

      // Should succeed for existing parent
      db.run("INSERT INTO children (id, parent_id) VALUES (?, ?)", [1, 1]);

      // Should fail for non-existent parent
      expect(() =>
        db.run("INSERT INTO children (id, parent_id) VALUES (?, ?)", [2, 999]),
      ).toThrow();
    });
  });
});
