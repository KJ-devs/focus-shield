import type { Profile } from "@focus-shield/shared-types";
import { createDatabase } from "../database";
import type { DatabaseAdapter } from "../database";
import { runMigrations } from "../migrations";
import { allMigrations } from "../schema";
import { ProfileRepository } from "../repositories/profile-repository";

function makeProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: "profile-1",
    name: "Work",
    icon: "briefcase",
    defaultLockLevel: 3,
    defaultBlocklists: ["social-media", "entertainment"],
    dailyFocusGoal: 240,
    weeklyFocusGoal: 1200,
    createdAt: new Date("2025-03-01T12:00:00.000Z"),
    ...overrides,
  };
}

describe("ProfileRepository", () => {
  let db: DatabaseAdapter;
  let repo: ProfileRepository;

  beforeEach(() => {
    db = createDatabase();
    runMigrations(db, allMigrations);
    repo = new ProfileRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("create() and getById() roundtrip", () => {
    it("creates and retrieves a profile", () => {
      const profile = makeProfile();
      repo.create(profile);

      const result = repo.getById("profile-1");
      expect(result).toBeDefined();
      expect(result!.id).toBe("profile-1");
      expect(result!.name).toBe("Work");
      expect(result!.icon).toBe("briefcase");
      expect(result!.defaultLockLevel).toBe(3);
      expect(result!.dailyFocusGoal).toBe(240);
      expect(result!.weeklyFocusGoal).toBe(1200);
    });

    it("returns createdAt as a Date instance", () => {
      repo.create(makeProfile());
      const result = repo.getById("profile-1")!;

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe("2025-03-01T12:00:00.000Z");
    });

    it("correctly deserializes defaultBlocklists JSON array", () => {
      repo.create(makeProfile());
      const result = repo.getById("profile-1")!;

      expect(Array.isArray(result.defaultBlocklists)).toBe(true);
      expect(result.defaultBlocklists).toEqual([
        "social-media",
        "entertainment",
      ]);
    });

    it("handles empty defaultBlocklists array", () => {
      repo.create(makeProfile({ defaultBlocklists: [] }));
      const result = repo.getById("profile-1")!;

      expect(result.defaultBlocklists).toEqual([]);
    });

    it("handles single item in defaultBlocklists", () => {
      repo.create(makeProfile({ defaultBlocklists: ["gaming"] }));
      const result = repo.getById("profile-1")!;

      expect(result.defaultBlocklists).toEqual(["gaming"]);
    });

    it("returns undefined for non-existent ID", () => {
      const result = repo.getById("nonexistent");
      expect(result).toBeUndefined();
    });

    it("handles all lock levels", () => {
      const levels = [1, 2, 3, 4, 5] as const;
      for (const level of levels) {
        const id = `profile-level-${level}`;
        repo.create(makeProfile({ id, defaultLockLevel: level }));
        const result = repo.getById(id)!;
        expect(result.defaultLockLevel).toBe(level);
      }
    });
  });

  describe("getAll()", () => {
    it("returns an empty array when no profiles exist", () => {
      const results = repo.getAll();
      expect(results).toEqual([]);
    });

    it("returns all profiles", () => {
      repo.create(makeProfile({ id: "p1", name: "Work" }));
      repo.create(makeProfile({ id: "p2", name: "Study" }));
      repo.create(makeProfile({ id: "p3", name: "Personal" }));

      const results = repo.getAll();
      expect(results).toHaveLength(3);
      const names = results.map((p) => p.name);
      expect(names).toContain("Work");
      expect(names).toContain("Study");
      expect(names).toContain("Personal");
    });

    it("returns profiles with all fields properly deserialized", () => {
      repo.create(makeProfile());
      const results = repo.getAll();

      expect(results).toHaveLength(1);
      expect(results[0].createdAt).toBeInstanceOf(Date);
      expect(Array.isArray(results[0].defaultBlocklists)).toBe(true);
    });
  });

  describe("update()", () => {
    beforeEach(() => {
      repo.create(makeProfile());
    });

    it("updates the name", () => {
      repo.update("profile-1", { name: "Study Mode" });
      const result = repo.getById("profile-1")!;
      expect(result.name).toBe("Study Mode");
    });

    it("updates the icon", () => {
      repo.update("profile-1", { icon: "book" });
      const result = repo.getById("profile-1")!;
      expect(result.icon).toBe("book");
    });

    it("updates defaultLockLevel", () => {
      repo.update("profile-1", { defaultLockLevel: 5 });
      const result = repo.getById("profile-1")!;
      expect(result.defaultLockLevel).toBe(5);
    });

    it("updates defaultBlocklists", () => {
      repo.update("profile-1", {
        defaultBlocklists: ["gaming", "shopping", "news"],
      });
      const result = repo.getById("profile-1")!;
      expect(result.defaultBlocklists).toEqual(["gaming", "shopping", "news"]);
    });

    it("updates dailyFocusGoal", () => {
      repo.update("profile-1", { dailyFocusGoal: 480 });
      const result = repo.getById("profile-1")!;
      expect(result.dailyFocusGoal).toBe(480);
    });

    it("updates weeklyFocusGoal", () => {
      repo.update("profile-1", { weeklyFocusGoal: 2400 });
      const result = repo.getById("profile-1")!;
      expect(result.weeklyFocusGoal).toBe(2400);
    });

    it("updates multiple fields at once", () => {
      repo.update("profile-1", {
        name: "Deep Work",
        defaultLockLevel: 4,
        dailyFocusGoal: 360,
      });

      const result = repo.getById("profile-1")!;
      expect(result.name).toBe("Deep Work");
      expect(result.defaultLockLevel).toBe(4);
      expect(result.dailyFocusGoal).toBe(360);
    });

    it("does nothing when called with no fields", () => {
      repo.update("profile-1", {});
      const result = repo.getById("profile-1")!;
      expect(result.name).toBe("Work");
    });

    it("preserves unmodified fields", () => {
      repo.update("profile-1", { name: "Changed" });
      const result = repo.getById("profile-1")!;
      expect(result.name).toBe("Changed");
      expect(result.icon).toBe("briefcase");
      expect(result.defaultLockLevel).toBe(3);
      expect(result.dailyFocusGoal).toBe(240);
      expect(result.weeklyFocusGoal).toBe(1200);
      expect(result.defaultBlocklists).toEqual([
        "social-media",
        "entertainment",
      ]);
    });
  });

  describe("delete()", () => {
    it("removes the profile", () => {
      repo.create(makeProfile());
      repo.delete("profile-1");
      expect(repo.getById("profile-1")).toBeUndefined();
    });

    it("does not throw when deleting non-existent profile", () => {
      expect(() => repo.delete("nonexistent")).not.toThrow();
    });

    it("only removes the targeted profile", () => {
      repo.create(makeProfile({ id: "p1" }));
      repo.create(makeProfile({ id: "p2" }));

      repo.delete("p1");

      expect(repo.getById("p1")).toBeUndefined();
      expect(repo.getById("p2")).toBeDefined();
    });

    it("after deletion, getAll reflects the change", () => {
      repo.create(makeProfile({ id: "p1" }));
      repo.create(makeProfile({ id: "p2" }));

      expect(repo.getAll()).toHaveLength(2);
      repo.delete("p1");
      expect(repo.getAll()).toHaveLength(1);
    });
  });
});
