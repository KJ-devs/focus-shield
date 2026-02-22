import {
  BLOCKLIST_PRESETS,
  getBlocklistPreset,
  getAllBlocklistPresets,
} from "../presets";
import type { BlocklistPreset } from "@focus-shield/shared-types";

describe("BLOCKLIST_PRESETS", () => {
  const categories = [
    "social",
    "entertainment",
    "gaming",
    "news",
    "shopping",
  ] as const;

  it("has all 5 categories", () => {
    const keys = Object.keys(BLOCKLIST_PRESETS);
    expect(keys).toHaveLength(5);
    for (const cat of categories) {
      expect(BLOCKLIST_PRESETS).toHaveProperty(cat);
    }
  });

  it.each(categories)("preset '%s' has correct structure", (category) => {
    const preset: BlocklistPreset = BLOCKLIST_PRESETS[category];
    expect(preset).toHaveProperty("id");
    expect(preset).toHaveProperty("name");
    expect(preset).toHaveProperty("icon");
    expect(preset).toHaveProperty("category", category);
    expect(preset).toHaveProperty("domains");
    expect(preset).toHaveProperty("processes");
    expect(preset).toHaveProperty("isBuiltIn");
    expect(preset).toHaveProperty("createdAt");

    expect(typeof preset.id).toBe("string");
    expect(typeof preset.name).toBe("string");
    expect(typeof preset.icon).toBe("string");
    expect(Array.isArray(preset.domains)).toBe(true);
    expect(Array.isArray(preset.processes)).toBe(true);
    expect(preset.createdAt).toBeInstanceOf(Date);
  });

  it.each(categories)("preset '%s' is marked as built-in", (category) => {
    expect(BLOCKLIST_PRESETS[category].isBuiltIn).toBe(true);
  });

  describe("social preset", () => {
    it("contains expected domain patterns", () => {
      const social = BLOCKLIST_PRESETS.social;
      const patterns = social.domains.map((d) => d.pattern);
      expect(patterns).toContain("*.facebook.com");
      expect(patterns).toContain("*.instagram.com");
      expect(patterns).toContain("*.twitter.com");
      expect(patterns).toContain("*.x.com");
      expect(patterns).toContain("*.tiktok.com");
      expect(patterns).toContain("*.snapchat.com");
    });

    it("contains path-based linkedin pattern", () => {
      const social = BLOCKLIST_PRESETS.social;
      const patterns = social.domains.map((d) => d.pattern);
      expect(patterns).toContain("*.linkedin.com/feed/*");
    });

    it("contains expected processes", () => {
      const social = BLOCKLIST_PRESETS.social;
      const processNames = social.processes.map((p) => p.name);
      expect(processNames).toContain("discord");
      expect(processNames).toContain("slack");
      expect(processNames).toContain("telegram");
      expect(processNames).toContain("whatsapp");
    });

    it("all domain rules are block type", () => {
      const social = BLOCKLIST_PRESETS.social;
      for (const domain of social.domains) {
        expect(domain.type).toBe("block");
      }
    });
  });

  describe("entertainment preset", () => {
    it("contains expected domain patterns", () => {
      const ent = BLOCKLIST_PRESETS.entertainment;
      const patterns = ent.domains.map((d) => d.pattern);
      expect(patterns).toContain("*.youtube.com");
      expect(patterns).toContain("*.netflix.com");
      expect(patterns).toContain("*.twitch.tv");
      expect(patterns).toContain("*.spotify.com");
      expect(patterns).toContain("*.reddit.com");
      expect(patterns).toContain("*.9gag.com");
    });

    it("contains suspend-action processes", () => {
      const ent = BLOCKLIST_PRESETS.entertainment;
      for (const proc of ent.processes) {
        expect(proc.action).toBe("suspend");
      }
    });
  });

  describe("gaming preset", () => {
    it("contains expected domain patterns", () => {
      const gaming = BLOCKLIST_PRESETS.gaming;
      const patterns = gaming.domains.map((d) => d.pattern);
      expect(patterns).toContain("*.steampowered.com");
      expect(patterns).toContain("*.epicgames.com");
      expect(patterns).toContain("*.riotgames.com");
    });

    it("contains expected processes", () => {
      const gaming = BLOCKLIST_PRESETS.gaming;
      const processNames = gaming.processes.map((p) => p.name);
      expect(processNames).toContain("steam");
      expect(processNames).toContain("epicgameslauncher");
      expect(processNames).toContain("battle.net");
    });

    it("all process actions are kill", () => {
      const gaming = BLOCKLIST_PRESETS.gaming;
      for (const proc of gaming.processes) {
        expect(proc.action).toBe("kill");
      }
    });
  });

  describe("news preset", () => {
    it("contains expected domain patterns", () => {
      const news = BLOCKLIST_PRESETS.news;
      const patterns = news.domains.map((d) => d.pattern);
      expect(patterns).toContain("*.cnn.com");
      expect(patterns).toContain("*.bbc.com");
      expect(patterns).toContain("*.lemonde.fr");
      expect(patterns).toContain("*.lefigaro.fr");
      expect(patterns).toContain("news.google.com");
      expect(patterns).toContain("news.ycombinator.com");
    });

    it("has no processes", () => {
      expect(BLOCKLIST_PRESETS.news.processes).toHaveLength(0);
    });
  });

  describe("shopping preset", () => {
    it("contains expected domain patterns", () => {
      const shopping = BLOCKLIST_PRESETS.shopping;
      const patterns = shopping.domains.map((d) => d.pattern);
      expect(patterns).toContain("*.amazon.com");
      expect(patterns).toContain("*.amazon.fr");
      expect(patterns).toContain("*.ebay.com");
      expect(patterns).toContain("*.aliexpress.com");
      expect(patterns).toContain("*.leboncoin.fr");
      expect(patterns).toContain("*.vinted.fr");
    });

    it("has no processes", () => {
      expect(BLOCKLIST_PRESETS.shopping.processes).toHaveLength(0);
    });
  });
});

describe("getBlocklistPreset", () => {
  it("returns the social preset", () => {
    const preset = getBlocklistPreset("social");
    expect(preset.id).toBe("builtin-social");
    expect(preset.category).toBe("social");
  });

  it("returns the entertainment preset", () => {
    const preset = getBlocklistPreset("entertainment");
    expect(preset.id).toBe("builtin-entertainment");
    expect(preset.category).toBe("entertainment");
  });

  it("returns the gaming preset", () => {
    const preset = getBlocklistPreset("gaming");
    expect(preset.id).toBe("builtin-gaming");
    expect(preset.category).toBe("gaming");
  });

  it("returns the news preset", () => {
    const preset = getBlocklistPreset("news");
    expect(preset.id).toBe("builtin-news");
    expect(preset.category).toBe("news");
  });

  it("returns the shopping preset", () => {
    const preset = getBlocklistPreset("shopping");
    expect(preset.id).toBe("builtin-shopping");
    expect(preset.category).toBe("shopping");
  });

  it("returns the same object as BLOCKLIST_PRESETS", () => {
    expect(getBlocklistPreset("social")).toBe(BLOCKLIST_PRESETS.social);
  });
});

describe("getAllBlocklistPresets", () => {
  it("returns 5 presets", () => {
    const presets = getAllBlocklistPresets();
    expect(presets).toHaveLength(5);
  });

  it("returns an array of BlocklistPreset objects", () => {
    const presets = getAllBlocklistPresets();
    for (const preset of presets) {
      expect(preset).toHaveProperty("id");
      expect(preset).toHaveProperty("name");
      expect(preset).toHaveProperty("category");
      expect(preset).toHaveProperty("isBuiltIn", true);
    }
  });

  it("includes all category IDs", () => {
    const presets = getAllBlocklistPresets();
    const ids = presets.map((p) => p.id);
    expect(ids).toContain("builtin-social");
    expect(ids).toContain("builtin-entertainment");
    expect(ids).toContain("builtin-gaming");
    expect(ids).toContain("builtin-news");
    expect(ids).toContain("builtin-shopping");
  });
});
