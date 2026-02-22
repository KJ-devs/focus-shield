import { matchesProcess, findMatchingProcessRule } from "../process-matcher";
import type { ProcessRule } from "@focus-shield/shared-types";

describe("matchesProcess", () => {
  const discordRule: ProcessRule = {
    name: "discord",
    aliases: ["Discord.exe", "discord-ptb", "discord-canary"],
    action: "kill",
  };

  const steamRule: ProcessRule = {
    name: "steam",
    aliases: ["Steam.exe", "steam_osx", "steamwebhelper"],
    action: "kill",
  };

  describe("exact name match", () => {
    it("matches exact name", () => {
      expect(matchesProcess("discord", discordRule)).toBe(true);
    });

    it("matches name case-insensitively (input uppercase)", () => {
      expect(matchesProcess("DISCORD", discordRule)).toBe(true);
    });

    it("matches name case-insensitively (input mixed case)", () => {
      expect(matchesProcess("Discord", discordRule)).toBe(true);
    });

    it("matches steam exact name", () => {
      expect(matchesProcess("steam", steamRule)).toBe(true);
    });
  });

  describe("alias match", () => {
    it("matches an alias exactly", () => {
      expect(matchesProcess("Discord.exe", discordRule)).toBe(true);
    });

    it("matches another alias", () => {
      expect(matchesProcess("discord-ptb", discordRule)).toBe(true);
    });

    it("matches alias case-insensitively", () => {
      expect(matchesProcess("DISCORD.EXE", discordRule)).toBe(true);
    });

    it("matches alias with different casing", () => {
      expect(matchesProcess("discord-CANARY", discordRule)).toBe(true);
    });

    it("matches Steam.exe alias", () => {
      expect(matchesProcess("Steam.exe", steamRule)).toBe(true);
    });

    it("matches steamwebhelper alias", () => {
      expect(matchesProcess("steamwebhelper", steamRule)).toBe(true);
    });

    it("matches alias case-insensitively (steam_osx)", () => {
      expect(matchesProcess("STEAM_OSX", steamRule)).toBe(true);
    });
  });

  describe("no match", () => {
    it("returns false for unrelated process", () => {
      expect(matchesProcess("chrome", discordRule)).toBe(false);
    });

    it("returns false for partial name match", () => {
      expect(matchesProcess("disc", discordRule)).toBe(false);
    });

    it("returns false for substring of alias", () => {
      expect(matchesProcess("Discord", steamRule)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(matchesProcess("", discordRule)).toBe(false);
    });
  });
});

describe("findMatchingProcessRule", () => {
  const rules: ProcessRule[] = [
    {
      name: "discord",
      aliases: ["Discord.exe", "discord-ptb", "discord-canary"],
      action: "kill",
    },
    {
      name: "slack",
      aliases: ["Slack.exe", "slack-desktop"],
      action: "kill",
    },
    {
      name: "spotify",
      aliases: ["Spotify.exe", "spotify-client"],
      action: "suspend",
    },
  ];

  it("returns the matching rule by name", () => {
    const result = findMatchingProcessRule("discord", rules);
    expect(result).toBeDefined();
    expect(result!.name).toBe("discord");
  });

  it("returns the matching rule by alias", () => {
    const result = findMatchingProcessRule("Slack.exe", rules);
    expect(result).toBeDefined();
    expect(result!.name).toBe("slack");
  });

  it("returns the matching rule case-insensitively", () => {
    const result = findMatchingProcessRule("SPOTIFY", rules);
    expect(result).toBeDefined();
    expect(result!.name).toBe("spotify");
    expect(result!.action).toBe("suspend");
  });

  it("returns undefined when no rule matches", () => {
    const result = findMatchingProcessRule("chrome", rules);
    expect(result).toBeUndefined();
  });

  it("returns undefined for an empty rules array", () => {
    const result = findMatchingProcessRule("discord", []);
    expect(result).toBeUndefined();
  });

  it("returns the first matching rule when multiple could match", () => {
    const duplicateRules: ProcessRule[] = [
      {
        name: "app",
        aliases: ["myapp"],
        action: "kill",
      },
      {
        name: "other",
        aliases: ["myapp"],
        action: "suspend",
      },
    ];
    const result = findMatchingProcessRule("myapp", duplicateRules);
    expect(result).toBeDefined();
    expect(result!.name).toBe("app");
    expect(result!.action).toBe("kill");
  });

  it("matches by alias case-insensitively", () => {
    const result = findMatchingProcessRule("discord-PTB", rules);
    expect(result).toBeDefined();
    expect(result!.name).toBe("discord");
  });
});
