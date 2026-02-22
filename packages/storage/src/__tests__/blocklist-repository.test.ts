import type {
  BlocklistPreset,
  DomainRule,
  ProcessRule,
} from "@focus-shield/shared-types";
import { createDatabase } from "../database";
import type { DatabaseAdapter } from "../database";
import { runMigrations } from "../migrations";
import { allMigrations } from "../schema";
import { BlocklistRepository } from "../repositories/blocklist-repository";

function makeBlocklist(overrides?: Partial<BlocklistPreset>): BlocklistPreset {
  return {
    id: "bl-1",
    name: "Social Media",
    icon: "social",
    category: "social",
    domains: [
      { pattern: "*.facebook.com", type: "block" },
      { pattern: "*.instagram.com", type: "block" },
      { pattern: "*.twitter.com", type: "block" },
    ] as DomainRule[],
    processes: [
      { name: "discord", aliases: ["Discord.exe", "discord-ptb"], action: "kill" },
      { name: "slack", aliases: ["Slack.exe"], action: "suspend" },
    ] as ProcessRule[],
    isBuiltIn: true,
    createdAt: new Date("2025-01-15T08:00:00.000Z"),
    ...overrides,
  };
}

describe("BlocklistRepository", () => {
  let db: DatabaseAdapter;
  let repo: BlocklistRepository;

  beforeEach(() => {
    db = createDatabase();
    runMigrations(db, allMigrations);
    repo = new BlocklistRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("create() and getById() roundtrip", () => {
    it("creates and retrieves a blocklist", () => {
      const blocklist = makeBlocklist();
      repo.create(blocklist);

      const result = repo.getById("bl-1");
      expect(result).toBeDefined();
      expect(result!.id).toBe("bl-1");
      expect(result!.name).toBe("Social Media");
      expect(result!.icon).toBe("social");
      expect(result!.category).toBe("social");
    });

    it("returns isBuiltIn as a boolean true", () => {
      repo.create(makeBlocklist({ isBuiltIn: true }));
      const result = repo.getById("bl-1")!;

      expect(result.isBuiltIn).toBe(true);
      expect(typeof result.isBuiltIn).toBe("boolean");
    });

    it("returns isBuiltIn as a boolean false", () => {
      repo.create(makeBlocklist({ isBuiltIn: false }));
      const result = repo.getById("bl-1")!;

      expect(result.isBuiltIn).toBe(false);
      expect(typeof result.isBuiltIn).toBe("boolean");
    });

    it("returns createdAt as a Date instance", () => {
      repo.create(makeBlocklist());
      const result = repo.getById("bl-1")!;

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe("2025-01-15T08:00:00.000Z");
    });

    it("correctly deserializes domains JSON array", () => {
      repo.create(makeBlocklist());
      const result = repo.getById("bl-1")!;

      expect(Array.isArray(result.domains)).toBe(true);
      expect(result.domains).toHaveLength(3);
      expect(result.domains[0]).toEqual({
        pattern: "*.facebook.com",
        type: "block",
      });
      expect(result.domains[1]).toEqual({
        pattern: "*.instagram.com",
        type: "block",
      });
      expect(result.domains[2]).toEqual({
        pattern: "*.twitter.com",
        type: "block",
      });
    });

    it("correctly deserializes processes JSON array", () => {
      repo.create(makeBlocklist());
      const result = repo.getById("bl-1")!;

      expect(Array.isArray(result.processes)).toBe(true);
      expect(result.processes).toHaveLength(2);
      expect(result.processes[0]).toEqual({
        name: "discord",
        aliases: ["Discord.exe", "discord-ptb"],
        action: "kill",
      });
      expect(result.processes[1]).toEqual({
        name: "slack",
        aliases: ["Slack.exe"],
        action: "suspend",
      });
    });

    it("handles empty domains and processes arrays", () => {
      repo.create(makeBlocklist({ domains: [], processes: [] }));
      const result = repo.getById("bl-1")!;

      expect(result.domains).toEqual([]);
      expect(result.processes).toEqual([]);
    });

    it("returns undefined for non-existent ID", () => {
      const result = repo.getById("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getAll()", () => {
    it("returns an empty array when no blocklists exist", () => {
      const results = repo.getAll();
      expect(results).toEqual([]);
    });

    it("returns all blocklists", () => {
      repo.create(makeBlocklist({ id: "bl-1", name: "Social" }));
      repo.create(
        makeBlocklist({ id: "bl-2", name: "Gaming", category: "gaming" }),
      );
      repo.create(
        makeBlocklist({
          id: "bl-3",
          name: "Entertainment",
          category: "entertainment",
        }),
      );

      const results = repo.getAll();
      expect(results).toHaveLength(3);
    });
  });

  describe("getByCategory()", () => {
    beforeEach(() => {
      repo.create(makeBlocklist({ id: "bl-1", category: "social" }));
      repo.create(makeBlocklist({ id: "bl-2", category: "gaming" }));
      repo.create(makeBlocklist({ id: "bl-3", category: "social" }));
      repo.create(makeBlocklist({ id: "bl-4", category: "entertainment" }));
    });

    it("returns only blocklists of the specified category", () => {
      const results = repo.getByCategory("social");
      expect(results).toHaveLength(2);
      expect(results.every((bl) => bl.category === "social")).toBe(true);
    });

    it("returns empty array for category with no matches", () => {
      const results = repo.getByCategory("news");
      expect(results).toEqual([]);
    });

    it("returns single result for category with one match", () => {
      const results = repo.getByCategory("gaming");
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe("bl-2");
    });
  });

  describe("getBuiltIn()", () => {
    beforeEach(() => {
      repo.create(makeBlocklist({ id: "bl-1", isBuiltIn: true }));
      repo.create(makeBlocklist({ id: "bl-2", isBuiltIn: false }));
      repo.create(makeBlocklist({ id: "bl-3", isBuiltIn: true }));
      repo.create(makeBlocklist({ id: "bl-4", isBuiltIn: false }));
    });

    it("returns only built-in blocklists", () => {
      const results = repo.getBuiltIn();
      expect(results).toHaveLength(2);
      expect(results.every((bl) => bl.isBuiltIn === true)).toBe(true);
    });

    it("returns built-in blocklists with correct IDs", () => {
      const results = repo.getBuiltIn();
      const ids = results.map((bl) => bl.id);
      expect(ids).toContain("bl-1");
      expect(ids).toContain("bl-3");
    });
  });

  describe("update()", () => {
    beforeEach(() => {
      repo.create(makeBlocklist());
    });

    it("updates the name", () => {
      repo.update("bl-1", { name: "Updated Social" });
      const result = repo.getById("bl-1")!;
      expect(result.name).toBe("Updated Social");
    });

    it("updates the icon", () => {
      repo.update("bl-1", { icon: "new-icon" });
      const result = repo.getById("bl-1")!;
      expect(result.icon).toBe("new-icon");
    });

    it("updates the category", () => {
      repo.update("bl-1", { category: "custom" });
      const result = repo.getById("bl-1")!;
      expect(result.category).toBe("custom");
    });

    it("updates domains array", () => {
      const newDomains: DomainRule[] = [
        { pattern: "*.tiktok.com", type: "block" },
      ];
      repo.update("bl-1", { domains: newDomains });
      const result = repo.getById("bl-1")!;
      expect(result.domains).toEqual(newDomains);
    });

    it("updates processes array", () => {
      const newProcesses: ProcessRule[] = [
        { name: "telegram", aliases: ["Telegram.exe"], action: "suspend" },
      ];
      repo.update("bl-1", { processes: newProcesses });
      const result = repo.getById("bl-1")!;
      expect(result.processes).toEqual(newProcesses);
    });

    it("updates isBuiltIn", () => {
      repo.update("bl-1", { isBuiltIn: false });
      const result = repo.getById("bl-1")!;
      expect(result.isBuiltIn).toBe(false);
      expect(typeof result.isBuiltIn).toBe("boolean");
    });

    it("updates multiple fields at once", () => {
      repo.update("bl-1", {
        name: "Renamed",
        category: "gaming",
        isBuiltIn: false,
      });

      const result = repo.getById("bl-1")!;
      expect(result.name).toBe("Renamed");
      expect(result.category).toBe("gaming");
      expect(result.isBuiltIn).toBe(false);
    });

    it("does nothing when called with no fields", () => {
      repo.update("bl-1", {});
      const result = repo.getById("bl-1")!;
      expect(result.name).toBe("Social Media");
    });

    it("preserves unmodified fields", () => {
      repo.update("bl-1", { name: "Changed" });
      const result = repo.getById("bl-1")!;
      expect(result.name).toBe("Changed");
      expect(result.category).toBe("social");
      expect(result.isBuiltIn).toBe(true);
      expect(result.domains).toHaveLength(3);
    });
  });

  describe("delete()", () => {
    it("removes the blocklist", () => {
      repo.create(makeBlocklist());
      repo.delete("bl-1");
      expect(repo.getById("bl-1")).toBeUndefined();
    });

    it("does not throw when deleting non-existent blocklist", () => {
      expect(() => repo.delete("nonexistent")).not.toThrow();
    });

    it("only removes the targeted blocklist", () => {
      repo.create(makeBlocklist({ id: "bl-1" }));
      repo.create(makeBlocklist({ id: "bl-2" }));

      repo.delete("bl-1");

      expect(repo.getById("bl-1")).toBeUndefined();
      expect(repo.getById("bl-2")).toBeDefined();
    });
  });
});
