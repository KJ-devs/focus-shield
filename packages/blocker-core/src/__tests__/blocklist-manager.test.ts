import { mergeBlocklists, createCustomBlocklist } from "../blocklist-manager";
import type { BlocklistPreset, DomainRule, ProcessRule } from "@focus-shield/shared-types";

function makePreset(overrides: Partial<BlocklistPreset> = {}): BlocklistPreset {
  return {
    id: "test-preset",
    name: "Test",
    icon: "test",
    category: "custom",
    domains: [],
    processes: [],
    isBuiltIn: false,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("mergeBlocklists", () => {
  describe("domain merging", () => {
    it("merges domains from two blocklists", () => {
      const list1 = makePreset({
        domains: [{ pattern: "*.reddit.com", type: "block" }],
      });
      const list2 = makePreset({
        domains: [{ pattern: "*.facebook.com", type: "block" }],
      });

      const result = mergeBlocklists(list1, list2);
      expect(result.domains).toHaveLength(2);
      const patterns = result.domains.map((d) => d.pattern);
      expect(patterns).toContain("*.reddit.com");
      expect(patterns).toContain("*.facebook.com");
    });

    it("deduplicates same domain patterns (case-insensitive)", () => {
      const list1 = makePreset({
        domains: [{ pattern: "*.Reddit.com", type: "block" }],
      });
      const list2 = makePreset({
        domains: [{ pattern: "*.reddit.com", type: "block" }],
      });

      const result = mergeBlocklists(list1, list2);
      expect(result.domains).toHaveLength(1);
    });

    it("keeps the first occurrence when deduplicating domains", () => {
      const list1 = makePreset({
        domains: [{ pattern: "*.Reddit.COM", type: "block" }],
      });
      const list2 = makePreset({
        domains: [{ pattern: "*.reddit.com", type: "allow" }],
      });

      const result = mergeBlocklists(list1, list2);
      expect(result.domains).toHaveLength(1);
      expect(result.domains[0]!.pattern).toBe("*.Reddit.COM");
      expect(result.domains[0]!.type).toBe("block");
    });

    it("handles empty domain lists", () => {
      const list1 = makePreset({ domains: [] });
      const list2 = makePreset({ domains: [] });

      const result = mergeBlocklists(list1, list2);
      expect(result.domains).toHaveLength(0);
    });

    it("handles merging with one empty domain list", () => {
      const list1 = makePreset({
        domains: [{ pattern: "*.reddit.com", type: "block" }],
      });
      const list2 = makePreset({ domains: [] });

      const result = mergeBlocklists(list1, list2);
      expect(result.domains).toHaveLength(1);
    });
  });

  describe("process merging", () => {
    it("merges processes from two blocklists", () => {
      const list1 = makePreset({
        processes: [
          { name: "discord", aliases: ["Discord.exe"], action: "kill" },
        ],
      });
      const list2 = makePreset({
        processes: [
          { name: "slack", aliases: ["Slack.exe"], action: "kill" },
        ],
      });

      const result = mergeBlocklists(list1, list2);
      expect(result.processes).toHaveLength(2);
      const names = result.processes.map((p) => p.name);
      expect(names).toContain("discord");
      expect(names).toContain("slack");
    });

    it("deduplicates same process names (case-insensitive)", () => {
      const list1 = makePreset({
        processes: [
          { name: "Discord", aliases: ["Discord.exe"], action: "kill" },
        ],
      });
      const list2 = makePreset({
        processes: [
          { name: "discord", aliases: ["discord-ptb"], action: "suspend" },
        ],
      });

      const result = mergeBlocklists(list1, list2);
      expect(result.processes).toHaveLength(1);
    });

    it("merges aliases when process names collide", () => {
      const list1 = makePreset({
        processes: [
          { name: "discord", aliases: ["Discord.exe"], action: "kill" },
        ],
      });
      const list2 = makePreset({
        processes: [
          {
            name: "discord",
            aliases: ["discord-ptb", "discord-canary"],
            action: "suspend",
          },
        ],
      });

      const result = mergeBlocklists(list1, list2);
      expect(result.processes).toHaveLength(1);
      const discordProc = result.processes[0]!;
      expect(discordProc.aliases).toContain("Discord.exe");
      expect(discordProc.aliases).toContain("discord-ptb");
      expect(discordProc.aliases).toContain("discord-canary");
    });

    it("keeps the action from the first occurrence", () => {
      const list1 = makePreset({
        processes: [
          { name: "discord", aliases: ["Discord.exe"], action: "kill" },
        ],
      });
      const list2 = makePreset({
        processes: [
          { name: "discord", aliases: ["discord-ptb"], action: "suspend" },
        ],
      });

      const result = mergeBlocklists(list1, list2);
      expect(result.processes[0]!.action).toBe("kill");
    });

    it("deduplicates aliases by lowercase when merging", () => {
      const list1 = makePreset({
        processes: [
          { name: "discord", aliases: ["Discord.exe"], action: "kill" },
        ],
      });
      const list2 = makePreset({
        processes: [
          {
            name: "discord",
            aliases: ["discord.exe", "discord-ptb"],
            action: "kill",
          },
        ],
      });

      const result = mergeBlocklists(list1, list2);
      const discordProc = result.processes[0]!;
      // "Discord.exe" from list1, "discord-ptb" from list2 (discord.exe is deduped)
      expect(discordProc.aliases).toHaveLength(2);
      expect(discordProc.aliases).toContain("Discord.exe");
      expect(discordProc.aliases).toContain("discord-ptb");
    });

    it("handles empty process lists", () => {
      const list1 = makePreset({ processes: [] });
      const list2 = makePreset({ processes: [] });

      const result = mergeBlocklists(list1, list2);
      expect(result.processes).toHaveLength(0);
    });
  });

  describe("multiple blocklists", () => {
    it("merges more than two blocklists", () => {
      const list1 = makePreset({
        domains: [{ pattern: "*.reddit.com", type: "block" }],
        processes: [
          { name: "discord", aliases: ["Discord.exe"], action: "kill" },
        ],
      });
      const list2 = makePreset({
        domains: [{ pattern: "*.facebook.com", type: "block" }],
        processes: [
          { name: "slack", aliases: ["Slack.exe"], action: "kill" },
        ],
      });
      const list3 = makePreset({
        domains: [{ pattern: "*.twitter.com", type: "block" }],
        processes: [
          { name: "telegram", aliases: ["Telegram.exe"], action: "kill" },
        ],
      });

      const result = mergeBlocklists(list1, list2, list3);
      expect(result.domains).toHaveLength(3);
      expect(result.processes).toHaveLength(3);
    });

    it("handles a single blocklist", () => {
      const list1 = makePreset({
        domains: [{ pattern: "*.reddit.com", type: "block" }],
        processes: [
          { name: "discord", aliases: ["Discord.exe"], action: "kill" },
        ],
      });

      const result = mergeBlocklists(list1);
      expect(result.domains).toHaveLength(1);
      expect(result.processes).toHaveLength(1);
    });

    it("handles no blocklists", () => {
      const result = mergeBlocklists();
      expect(result.domains).toHaveLength(0);
      expect(result.processes).toHaveLength(0);
    });
  });
});

describe("createCustomBlocklist", () => {
  it("creates a blocklist with custom category", () => {
    const blocklist = createCustomBlocklist({
      name: "My Custom List",
      domains: [{ pattern: "*.example.com", type: "block" }],
      processes: [],
    });

    expect(blocklist.category).toBe("custom");
  });

  it("creates a blocklist that is NOT built-in", () => {
    const blocklist = createCustomBlocklist({
      name: "My Custom List",
      domains: [],
      processes: [],
    });

    expect(blocklist.isBuiltIn).toBe(false);
  });

  it("uses the provided name", () => {
    const blocklist = createCustomBlocklist({
      name: "Work Distractions",
      domains: [],
      processes: [],
    });

    expect(blocklist.name).toBe("Work Distractions");
  });

  it("includes the provided domains", () => {
    const domains: DomainRule[] = [
      { pattern: "*.reddit.com", type: "block" },
      { pattern: "*.twitter.com", type: "block" },
    ];
    const blocklist = createCustomBlocklist({
      name: "Test",
      domains,
      processes: [],
    });

    expect(blocklist.domains).toEqual(domains);
  });

  it("includes the provided processes", () => {
    const processes: ProcessRule[] = [
      { name: "discord", aliases: ["Discord.exe"], action: "kill" },
    ];
    const blocklist = createCustomBlocklist({
      name: "Test",
      domains: [],
      processes,
    });

    expect(blocklist.processes).toEqual(processes);
  });

  it("generates an ID prefixed with 'custom-'", () => {
    const blocklist = createCustomBlocklist({
      name: "Test",
      domains: [],
      processes: [],
    });

    expect(blocklist.id).toMatch(/^custom-\d+$/);
  });

  it("generates unique IDs for different calls", () => {
    const blocklist1 = createCustomBlocklist({
      name: "Test 1",
      domains: [],
      processes: [],
    });

    // Ensure at least 1ms passes for a unique timestamp
    const now = Date.now();
    while (Date.now() === now) {
      // spin until timestamp changes
    }

    const blocklist2 = createCustomBlocklist({
      name: "Test 2",
      domains: [],
      processes: [],
    });

    expect(blocklist1.id).not.toBe(blocklist2.id);
  });

  it("sets icon to 'list'", () => {
    const blocklist = createCustomBlocklist({
      name: "Test",
      domains: [],
      processes: [],
    });

    expect(blocklist.icon).toBe("list");
  });

  it("sets createdAt to a Date instance", () => {
    const before = new Date();
    const blocklist = createCustomBlocklist({
      name: "Test",
      domains: [],
      processes: [],
    });
    const after = new Date();

    expect(blocklist.createdAt).toBeInstanceOf(Date);
    expect(blocklist.createdAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(blocklist.createdAt.getTime()).toBeLessThanOrEqual(
      after.getTime(),
    );
  });
});
