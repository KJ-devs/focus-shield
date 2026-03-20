import type {
  BlocklistCategory,
  BlocklistPreset,
} from "@focus-shield/shared-types";

/**
 * Built-in blocklist presets for the main distraction categories.
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
      { pattern: "*.threads.net", type: "block" },
      { pattern: "*.mastodon.social", type: "block" },
      { pattern: "*.bsky.app", type: "block" },
      { pattern: "*.pinterest.com", type: "block" },
      { pattern: "*.tumblr.com", type: "block" },
      { pattern: "*.weibo.com", type: "block" },
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
      {
        name: "signal",
        aliases: ["Signal.exe", "signal-desktop"],
        action: "kill",
      },
      {
        name: "messenger",
        aliases: ["Messenger.exe"],
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
      { pattern: "*.disneyplus.com", type: "block" },
      { pattern: "*.hulu.com", type: "block" },
      { pattern: "*.primevideo.com", type: "block" },
      { pattern: "*.hbomax.com", type: "block" },
      { pattern: "*.crunchyroll.com", type: "block" },
      { pattern: "*.dailymotion.com", type: "block" },
      { pattern: "*.vimeo.com", type: "block" },
      { pattern: "*.soundcloud.com", type: "block" },
      { pattern: "*.deezer.com", type: "block" },
      { pattern: "*.imgur.com", type: "block" },
      { pattern: "*.giphy.com", type: "block" },
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
      {
        name: "netflix",
        aliases: ["Netflix.exe"],
        action: "kill",
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
      { pattern: "*.blizzard.com", type: "block" },
      { pattern: "*.ea.com", type: "block" },
      { pattern: "*.ubisoft.com", type: "block" },
      { pattern: "*.gog.com", type: "block" },
      { pattern: "*.itch.io", type: "block" },
      { pattern: "*.chess.com", type: "block" },
      { pattern: "*.miniclip.com", type: "block" },
      { pattern: "*.poki.com", type: "block" },
      { pattern: "*.crazygames.com", type: "block" },
      { pattern: "*.kongregate.com", type: "block" },
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
      {
        name: "riotclient",
        aliases: ["RiotClientServices.exe", "riot-client"],
        action: "kill",
      },
      {
        name: "origin",
        aliases: ["Origin.exe", "EADesktop.exe"],
        action: "kill",
      },
      {
        name: "ubisoft",
        aliases: ["UbisoftConnect.exe", "upc.exe"],
        action: "kill",
      },
    ],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  news: {
    id: "builtin-news",
    name: "News & Forums",
    icon: "newspaper",
    category: "news",
    domains: [
      { pattern: "*.cnn.com", type: "block" },
      { pattern: "*.bbc.com", type: "block" },
      { pattern: "*.lemonde.fr", type: "block" },
      { pattern: "*.lefigaro.fr", type: "block" },
      { pattern: "news.google.com", type: "block" },
      { pattern: "news.ycombinator.com", type: "block" },
      { pattern: "*.reuters.com", type: "block" },
      { pattern: "*.theguardian.com", type: "block" },
      { pattern: "*.nytimes.com", type: "block" },
      { pattern: "*.washingtonpost.com", type: "block" },
      { pattern: "*.huffpost.com", type: "block" },
      { pattern: "*.buzzfeed.com", type: "block" },
      { pattern: "*.vice.com", type: "block" },
      { pattern: "*.20minutes.fr", type: "block" },
      { pattern: "*.liberation.fr", type: "block" },
      { pattern: "*.bfmtv.com", type: "block" },
      { pattern: "*.francetvinfo.fr", type: "block" },
      { pattern: "*.quora.com", type: "block" },
      { pattern: "*.medium.com", type: "block" },
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
      { pattern: "*.cdiscount.com", type: "block" },
      { pattern: "*.fnac.com", type: "block" },
      { pattern: "*.darty.com", type: "block" },
      { pattern: "*.wish.com", type: "block" },
      { pattern: "*.shein.com", type: "block" },
      { pattern: "*.temu.com", type: "block" },
      { pattern: "*.etsy.com", type: "block" },
      { pattern: "*.zalando.fr", type: "block" },
      { pattern: "*.asos.com", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  adult: {
    id: "builtin-adult",
    name: "Adult Content",
    icon: "shield-off",
    category: "adult",
    domains: [
      { pattern: "*.pornhub.com", type: "block" },
      { pattern: "*.xvideos.com", type: "block" },
      { pattern: "*.xhamster.com", type: "block" },
      { pattern: "*.xnxx.com", type: "block" },
      { pattern: "*.redtube.com", type: "block" },
      { pattern: "*.youporn.com", type: "block" },
      { pattern: "*.onlyfans.com", type: "block" },
      { pattern: "*.chaturbate.com", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  dating: {
    id: "builtin-dating",
    name: "Dating",
    icon: "heart",
    category: "dating",
    domains: [
      { pattern: "*.tinder.com", type: "block" },
      { pattern: "*.bumble.com", type: "block" },
      { pattern: "*.hinge.co", type: "block" },
      { pattern: "*.okcupid.com", type: "block" },
      { pattern: "*.match.com", type: "block" },
      { pattern: "*.badoo.com", type: "block" },
      { pattern: "*.happn.com", type: "block" },
      { pattern: "*.meetic.fr", type: "block" },
    ],
    processes: [
      {
        name: "tinder",
        aliases: ["Tinder.exe"],
        action: "kill",
      },
      {
        name: "bumble",
        aliases: ["Bumble.exe"],
        action: "kill",
      },
    ],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  gambling: {
    id: "builtin-gambling",
    name: "Gambling & Betting",
    icon: "dice",
    category: "gambling",
    domains: [
      { pattern: "*.bet365.com", type: "block" },
      { pattern: "*.betfair.com", type: "block" },
      { pattern: "*.williamhill.com", type: "block" },
      { pattern: "*.pokerstars.com", type: "block" },
      { pattern: "*.winamax.fr", type: "block" },
      { pattern: "*.betclic.fr", type: "block" },
      { pattern: "*.unibet.fr", type: "block" },
      { pattern: "*.parionssport.fdj.fr", type: "block" },
      { pattern: "*.stake.com", type: "block" },
      { pattern: "*.draftkings.com", type: "block" },
      { pattern: "*.fanduel.com", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  crypto: {
    id: "builtin-crypto",
    name: "Crypto & Trading",
    icon: "trending-up",
    category: "crypto",
    domains: [
      { pattern: "*.binance.com", type: "block" },
      { pattern: "*.coinbase.com", type: "block" },
      { pattern: "*.kraken.com", type: "block" },
      { pattern: "*.tradingview.com", type: "block" },
      { pattern: "*.coingecko.com", type: "block" },
      { pattern: "*.coinmarketcap.com", type: "block" },
      { pattern: "*.etoro.com", type: "block" },
      { pattern: "*.robinhood.com", type: "block" },
      { pattern: "*.degiro.fr", type: "block" },
      { pattern: "*.boursorama.com", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  timekillers: {
    id: "builtin-timekillers",
    name: "Time Killers",
    icon: "clock",
    category: "timekillers",
    domains: [
      { pattern: "*.buzzfeed.com", type: "block" },
      { pattern: "*.boredpanda.com", type: "block" },
      { pattern: "*.demilked.com", type: "block" },
      { pattern: "*.ranker.com", type: "block" },
      { pattern: "*.cracked.com", type: "block" },
      { pattern: "*.thechive.com", type: "block" },
      { pattern: "*.failblog.org", type: "block" },
      { pattern: "*.cheezburger.com", type: "block" },
      { pattern: "*.ifunny.co", type: "block" },
      { pattern: "*.fml.com", type: "block" },
      { pattern: "*.viedemerde.fr", type: "block" },
      { pattern: "*.topito.com", type: "block" },
      { pattern: "*.konbini.com", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  ai: {
    id: "builtin-ai",
    name: "AI & Chatbots",
    icon: "robot",
    category: "ai",
    domains: [
      { pattern: "*.chatgpt.com", type: "block" },
      { pattern: "chat.openai.com", type: "block" },
      { pattern: "*.claude.ai", type: "block" },
      { pattern: "*.gemini.google.com", type: "block" },
      { pattern: "*.perplexity.ai", type: "block" },
      { pattern: "*.poe.com", type: "block" },
      { pattern: "*.character.ai", type: "block" },
      { pattern: "*.midjourney.com", type: "block" },
      { pattern: "*.copilot.microsoft.com", type: "block" },
      { pattern: "*.deepseek.com", type: "block" },
      { pattern: "*.huggingface.co", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  sports: {
    id: "builtin-sports",
    name: "Sports",
    icon: "trophy",
    category: "sports",
    domains: [
      { pattern: "*.espn.com", type: "block" },
      { pattern: "*.lequipe.fr", type: "block" },
      { pattern: "*.eurosport.com", type: "block" },
      { pattern: "*.skysports.com", type: "block" },
      { pattern: "*.marca.com", type: "block" },
      { pattern: "*.flashscore.com", type: "block" },
      { pattern: "*.sofascore.com", type: "block" },
      { pattern: "*.transfermarkt.com", type: "block" },
      { pattern: "*.footmercato.net", type: "block" },
      { pattern: "*.nba.com", type: "block" },
      { pattern: "*.nfl.com", type: "block" },
      { pattern: "*.fifa.com", type: "block" },
    ],
    processes: [],
    isBuiltIn: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  },

  food: {
    id: "builtin-food",
    name: "Food & Delivery",
    icon: "utensils",
    category: "food",
    domains: [
      { pattern: "*.ubereats.com", type: "block" },
      { pattern: "*.doordash.com", type: "block" },
      { pattern: "*.deliveroo.com", type: "block" },
      { pattern: "*.deliveroo.fr", type: "block" },
      { pattern: "*.justeat.com", type: "block" },
      { pattern: "*.justeat.fr", type: "block" },
      { pattern: "*.grubhub.com", type: "block" },
      { pattern: "*.postmates.com", type: "block" },
      { pattern: "*.seamless.com", type: "block" },
      { pattern: "*.foodpanda.com", type: "block" },
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
 * @returns Array of all built-in BlocklistPreset objects
 */
export function getAllBlocklistPresets(): BlocklistPreset[] {
  return Object.values(BLOCKLIST_PRESETS);
}
