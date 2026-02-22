import type {
  BlocklistCategory,
  BlocklistPreset,
} from "@focus-shield/shared-types";

/**
 * Built-in blocklist presets for the 5 main distraction categories.
 *
 * Each preset contains domain rules (for browser/DNS blocking) and
 * process rules (for OS-level blocking) with common aliases for
 * cross-platform support.
 */
export const BLOCKLIST_PRESETS: Record<
  Exclude<BlocklistCategory, "custom">,
  BlocklistPreset
> = {
  social: {
    id: "builtin-social",
    name: "Social Media",
    icon: "users",
    category: "social",
    domains: [
      { pattern: "*.facebook.com", type: "block" },
      { pattern: "*.instagram.com", type: "block" },
      { pattern: "*.twitter.com", type: "block" },
      { pattern: "*.x.com", type: "block" },
      { pattern: "*.tiktok.com", type: "block" },
      { pattern: "*.snapchat.com", type: "block" },
      { pattern: "*.linkedin.com/feed/*", type: "block" },
    ],
    processes: [
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
        name: "telegram",
        aliases: ["Telegram.exe", "telegram-desktop"],
        action: "kill",
      },
      {
        name: "whatsapp",
        aliases: ["WhatsApp.exe", "whatsapp-desktop"],
        action: "kill",
      },
    ],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  entertainment: {
    id: "builtin-entertainment",
    name: "Entertainment",
    icon: "film",
    category: "entertainment",
    domains: [
      { pattern: "*.youtube.com", type: "block" },
      { pattern: "*.netflix.com", type: "block" },
      { pattern: "*.twitch.tv", type: "block" },
      { pattern: "*.spotify.com", type: "block" },
      { pattern: "*.reddit.com", type: "block" },
      { pattern: "*.9gag.com", type: "block" },
    ],
    processes: [
      {
        name: "spotify",
        aliases: ["Spotify.exe", "spotify-client"],
        action: "suspend",
      },
      {
        name: "vlc",
        aliases: ["VLC.exe", "vlc-media-player"],
        action: "suspend",
      },
    ],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  gaming: {
    id: "builtin-gaming",
    name: "Gaming",
    icon: "gamepad",
    category: "gaming",
    domains: [
      { pattern: "*.steampowered.com", type: "block" },
      { pattern: "*.epicgames.com", type: "block" },
      { pattern: "*.riotgames.com", type: "block" },
    ],
    processes: [
      {
        name: "steam",
        aliases: ["Steam.exe", "steam_osx", "steamwebhelper"],
        action: "kill",
      },
      {
        name: "epicgameslauncher",
        aliases: [
          "EpicGamesLauncher.exe",
          "EpicWebHelper.exe",
          "epic-games-launcher",
        ],
        action: "kill",
      },
      {
        name: "battle.net",
        aliases: ["Battle.net.exe", "battle-net"],
        action: "kill",
      },
    ],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  news: {
    id: "builtin-news",
    name: "News",
    icon: "newspaper",
    category: "news",
    domains: [
      { pattern: "*.cnn.com", type: "block" },
      { pattern: "*.bbc.com", type: "block" },
      { pattern: "*.lemonde.fr", type: "block" },
      { pattern: "*.lefigaro.fr", type: "block" },
      { pattern: "news.google.com", type: "block" },
      { pattern: "news.ycombinator.com", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  shopping: {
    id: "builtin-shopping",
    name: "Shopping",
    icon: "shopping-cart",
    category: "shopping",
    domains: [
      { pattern: "*.amazon.com", type: "block" },
      { pattern: "*.amazon.fr", type: "block" },
      { pattern: "*.ebay.com", type: "block" },
      { pattern: "*.aliexpress.com", type: "block" },
      { pattern: "*.leboncoin.fr", type: "block" },
      { pattern: "*.vinted.fr", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },
};

/**
 * Get a specific blocklist preset by category.
 *
 * @param category - The blocklist category (excluding "custom")
 * @returns The BlocklistPreset for the given category
 */
export function getBlocklistPreset(
  category: Exclude<BlocklistCategory, "custom">,
): BlocklistPreset {
  return BLOCKLIST_PRESETS[category];
}

/**
 * Get all built-in blocklist presets as an array.
 *
 * @returns Array of all 5 built-in BlocklistPreset objects
 */
export function getAllBlocklistPresets(): BlocklistPreset[] {
  return Object.values(BLOCKLIST_PRESETS);
}
