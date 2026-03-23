import { create } from "zustand";
import type { ProcessRule } from "@focus-shield/shared-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlocklistData {
  id: string;
  name: string;
  icon: string;
  category: string;
  domains: string[];
  processes: ProcessRule[];
  isBuiltIn: boolean;
  enabled: boolean;
  hidden?: boolean;
}

export interface BlocklistState {
  blocklists: BlocklistData[];

  addBlocklist: (blocklist: Omit<BlocklistData, "id">) => void;
  updateBlocklist: (id: string, updates: Partial<Omit<BlocklistData, "id">>) => void;
  deleteBlocklist: (id: string) => void;
  toggleBlocklist: (id: string) => void;
  addDomain: (blocklistId: string, domain: string) => void;
  removeDomain: (blocklistId: string, domain: string) => void;
  addProcess: (blocklistId: string, processName: string) => void;
  removeProcess: (blocklistId: string, processName: string) => void;
}

// ---------------------------------------------------------------------------
// Built-in presets (replicated from blocker-core to avoid Node API imports)
// ---------------------------------------------------------------------------

const BUILTIN_BLOCKLISTS: BlocklistData[] = [
  {
    id: "builtin-social",
    name: "Social Media",
    icon: "users",
    category: "social",
    domains: [
      "*.facebook.com",
      "*.instagram.com",
      "*.twitter.com",
      "*.x.com",
      "*.tiktok.com",
      "*.snapchat.com",
      "*.linkedin.com/feed/*",
      "*.threads.net",
      "*.mastodon.social",
      "*.bsky.app",
      "*.pinterest.com",
      "*.tumblr.com",
      "*.weibo.com",
    ],
    processes: [
      { name: "discord", aliases: ["Discord.exe", "discord-ptb", "discord-canary", "DiscordPTB.exe", "DiscordCanary.exe"], action: "kill" },
      { name: "slack", aliases: ["Slack.exe", "slack-desktop"], action: "kill" },
      { name: "telegram", aliases: ["Telegram.exe", "telegram-desktop"], action: "kill" },
      { name: "whatsapp", aliases: ["WhatsApp.exe", "whatsapp-desktop"], action: "kill" },
      { name: "signal", aliases: ["Signal.exe", "signal-desktop"], action: "kill" },
      { name: "messenger", aliases: ["Messenger.exe"], action: "kill" },
    ],
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "builtin-entertainment",
    name: "Entertainment",
    icon: "film",
    category: "entertainment",
    domains: [
      "*.youtube.com",
      "*.netflix.com",
      "*.twitch.tv",
      "*.spotify.com",
      "*.reddit.com",
      "*.9gag.com",
      "*.disneyplus.com",
      "*.hulu.com",
      "*.primevideo.com",
      "*.hbomax.com",
      "*.crunchyroll.com",
      "*.dailymotion.com",
      "*.vimeo.com",
      "*.soundcloud.com",
      "*.deezer.com",
      "*.imgur.com",
      "*.giphy.com",
    ],
    processes: [
      { name: "spotify", aliases: ["Spotify.exe", "spotify-client"], action: "suspend" },
      { name: "vlc", aliases: ["VLC.exe", "vlc-media-player"], action: "suspend" },
      { name: "netflix", aliases: ["Netflix.exe"], action: "kill" },
    ],
    isBuiltIn: true,
    enabled: true,
  },
  {
    id: "builtin-gaming",
    name: "Gaming",
    icon: "gamepad",
    category: "gaming",
    domains: [
      "*.steampowered.com",
      "*.epicgames.com",
      "*.riotgames.com",
      "*.blizzard.com",
      "*.ea.com",
      "*.ubisoft.com",
      "*.gog.com",
      "*.itch.io",
      "*.chess.com",
      "*.miniclip.com",
      "*.poki.com",
      "*.crazygames.com",
      "*.kongregate.com",
    ],
    processes: [
      { name: "steam", aliases: ["Steam.exe", "steam_osx", "steamwebhelper"], action: "kill" },
      { name: "epicgameslauncher", aliases: ["EpicGamesLauncher.exe", "EpicWebHelper.exe", "epic-games-launcher"], action: "kill" },
      { name: "battle.net", aliases: ["Battle.net.exe", "battle-net"], action: "kill" },
      { name: "riotclient", aliases: ["RiotClientServices.exe", "riot-client"], action: "kill" },
      { name: "origin", aliases: ["Origin.exe", "EADesktop.exe"], action: "kill" },
      { name: "ubisoft", aliases: ["UbisoftConnect.exe", "upc.exe"], action: "kill" },
    ],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-news",
    name: "News & Forums",
    icon: "newspaper",
    category: "news",
    domains: [
      "*.cnn.com",
      "*.bbc.com",
      "*.lemonde.fr",
      "*.lefigaro.fr",
      "news.google.com",
      "news.ycombinator.com",
      "*.reuters.com",
      "*.theguardian.com",
      "*.nytimes.com",
      "*.washingtonpost.com",
      "*.huffpost.com",
      "*.buzzfeed.com",
      "*.vice.com",
      "*.20minutes.fr",
      "*.liberation.fr",
      "*.bfmtv.com",
      "*.francetvinfo.fr",
      "*.quora.com",
      "*.medium.com",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-shopping",
    name: "Shopping",
    icon: "shopping-cart",
    category: "shopping",
    domains: [
      "*.amazon.com",
      "*.amazon.fr",
      "*.ebay.com",
      "*.aliexpress.com",
      "*.leboncoin.fr",
      "*.vinted.fr",
      "*.cdiscount.com",
      "*.fnac.com",
      "*.darty.com",
      "*.wish.com",
      "*.shein.com",
      "*.temu.com",
      "*.etsy.com",
      "*.zalando.fr",
      "*.asos.com",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-adult",
    name: "Adult Content",
    icon: "shield-off",
    category: "adult",
    domains: [
      "*.pornhub.com",
      "*.xvideos.com",
      "*.xhamster.com",
      "*.xnxx.com",
      "*.redtube.com",
      "*.youporn.com",
      "*.onlyfans.com",
      "*.chaturbate.com",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
    hidden: true,
  },
  {
    id: "builtin-dating",
    name: "Dating",
    icon: "heart",
    category: "dating",
    domains: [
      "*.tinder.com",
      "*.bumble.com",
      "*.hinge.co",
      "*.okcupid.com",
      "*.match.com",
      "*.badoo.com",
      "*.happn.com",
      "*.meetic.fr",
    ],
    processes: [
      { name: "tinder", aliases: ["Tinder.exe"], action: "kill" },
      { name: "bumble", aliases: ["Bumble.exe"], action: "kill" },
    ],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-gambling",
    name: "Gambling & Betting",
    icon: "dice",
    category: "gambling",
    domains: [
      "*.bet365.com",
      "*.betfair.com",
      "*.williamhill.com",
      "*.pokerstars.com",
      "*.winamax.fr",
      "*.betclic.fr",
      "*.unibet.fr",
      "*.parionssport.fdj.fr",
      "*.stake.com",
      "*.draftkings.com",
      "*.fanduel.com",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-crypto",
    name: "Crypto & Trading",
    icon: "trending-up",
    category: "crypto",
    domains: [
      "*.binance.com",
      "*.coinbase.com",
      "*.kraken.com",
      "*.tradingview.com",
      "*.coingecko.com",
      "*.coinmarketcap.com",
      "*.etoro.com",
      "*.robinhood.com",
      "*.degiro.fr",
      "*.boursorama.com",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-timekillers",
    name: "Time Killers",
    icon: "clock",
    category: "timekillers",
    domains: [
      "*.buzzfeed.com",
      "*.boredpanda.com",
      "*.demilked.com",
      "*.ranker.com",
      "*.cracked.com",
      "*.thechive.com",
      "*.failblog.org",
      "*.cheezburger.com",
      "*.ifunny.co",
      "*.fml.com",
      "*.viedemerde.fr",
      "*.topito.com",
      "*.konbini.com",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-ai",
    name: "AI & Chatbots",
    icon: "robot",
    category: "ai",
    domains: [
      "*.chatgpt.com",
      "chat.openai.com",
      "*.claude.ai",
      "*.gemini.google.com",
      "*.perplexity.ai",
      "*.poe.com",
      "*.character.ai",
      "*.midjourney.com",
      "*.copilot.microsoft.com",
      "*.deepseek.com",
      "*.huggingface.co",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-sports",
    name: "Sports",
    icon: "trophy",
    category: "sports",
    domains: [
      "*.espn.com",
      "*.lequipe.fr",
      "*.eurosport.com",
      "*.skysports.com",
      "*.marca.com",
      "*.flashscore.com",
      "*.sofascore.com",
      "*.transfermarkt.com",
      "*.footmercato.net",
      "*.nba.com",
      "*.nfl.com",
      "*.fifa.com",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
  },
  {
    id: "builtin-food",
    name: "Food & Delivery",
    icon: "utensils",
    category: "food",
    domains: [
      "*.ubereats.com",
      "*.doordash.com",
      "*.deliveroo.com",
      "*.deliveroo.fr",
      "*.justeat.com",
      "*.justeat.fr",
      "*.grubhub.com",
      "*.postmates.com",
      "*.seamless.com",
      "*.foodpanda.com",
    ],
    processes: [],
    isBuiltIn: true,
    enabled: false,
  },
];

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "focus-shield-blocklists";

function isValidBlocklist(obj: unknown): obj is BlocklistData {
  if (typeof obj !== "object" || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.icon === "string" &&
    typeof record.category === "string" &&
    Array.isArray(record.domains) &&
    Array.isArray(record.processes) &&
    typeof record.isBuiltIn === "boolean" &&
    typeof record.enabled === "boolean"
  );
}

function loadPersistedBlocklists(): BlocklistData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return BUILTIN_BLOCKLISTS.map((b) => ({ ...b }));

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return BUILTIN_BLOCKLISTS.map((b) => ({ ...b }));
    }

    const loaded: BlocklistData[] = [];
    for (const item of parsed) {
      if (isValidBlocklist(item)) {
        loaded.push({
          ...item,
          domains: (item.domains as unknown[]).filter(
            (d): d is string => typeof d === "string",
          ),
          processes: (item.processes as unknown[]).map((p) => {
            if (typeof p === "string") {
              return { name: p, aliases: [], action: "kill" as const };
            }
            const rule = p as Record<string, unknown>;
            return {
              name: typeof rule.name === "string" ? rule.name : String(rule.name),
              aliases: Array.isArray(rule.aliases) ? (rule.aliases as string[]) : [],
              action: rule.action === "suspend" ? ("suspend" as const) : ("kill" as const),
            };
          }),
        });
      }
    }

    // Ensure all built-in lists are present (even if user cleared storage)
    for (const builtin of BUILTIN_BLOCKLISTS) {
      if (!loaded.some((b) => b.id === builtin.id)) {
        loaded.unshift({ ...builtin });
      }
    }

    return loaded;
  } catch {
    return BUILTIN_BLOCKLISTS.map((b) => ({ ...b }));
  }
}

function persistBlocklists(blocklists: BlocklistData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocklists));
}

function generateId(): string {
  return `blocklist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialBlocklists = loadPersistedBlocklists();

export const useBlocklistStore = create<BlocklistState>((set, get) => ({
  blocklists: initialBlocklists,

  addBlocklist: (blocklist) => {
    const newBlocklist: BlocklistData = { ...blocklist, id: generateId() };
    const updated = [...get().blocklists, newBlocklist];
    set({ blocklists: updated });
    persistBlocklists(updated);
  },

  updateBlocklist: (id, updates) => {
    const updated = get().blocklists.map((b) =>
      b.id === id ? { ...b, ...updates } : b,
    );
    set({ blocklists: updated });
    persistBlocklists(updated);
  },

  deleteBlocklist: (id) => {
    const target = get().blocklists.find((b) => b.id === id);
    // Cannot delete built-in blocklists
    if (target?.isBuiltIn) return;

    const updated = get().blocklists.filter((b) => b.id !== id);
    set({ blocklists: updated });
    persistBlocklists(updated);
  },

  toggleBlocklist: (id) => {
    const updated = get().blocklists.map((b) =>
      b.id === id ? { ...b, enabled: !b.enabled } : b,
    );
    set({ blocklists: updated });
    persistBlocklists(updated);
  },

  addDomain: (blocklistId, domain) => {
    const trimmed = domain.trim();
    if (!trimmed) return;

    const updated = get().blocklists.map((b) => {
      if (b.id !== blocklistId) return b;
      if (b.domains.includes(trimmed)) return b;
      return { ...b, domains: [...b.domains, trimmed] };
    });
    set({ blocklists: updated });
    persistBlocklists(updated);
  },

  removeDomain: (blocklistId, domain) => {
    const updated = get().blocklists.map((b) => {
      if (b.id !== blocklistId) return b;
      return { ...b, domains: b.domains.filter((d) => d !== domain) };
    });
    set({ blocklists: updated });
    persistBlocklists(updated);
  },

  addProcess: (blocklistId, processName) => {
    const trimmed = processName.trim();
    if (!trimmed) return;

    const updated = get().blocklists.map((b) => {
      if (b.id !== blocklistId) return b;
      if (b.processes.some((p) => p.name === trimmed)) return b;
      const newRule: ProcessRule = { name: trimmed, aliases: [], action: "kill" };
      return { ...b, processes: [...b.processes, newRule] };
    });
    set({ blocklists: updated });
    persistBlocklists(updated);
  },

  removeProcess: (blocklistId, processName) => {
    const updated = get().blocklists.map((b) => {
      if (b.id !== blocklistId) return b;
      return { ...b, processes: b.processes.filter((p) => p.name !== processName) };
    });
    set({ blocklists: updated });
    persistBlocklists(updated);
  },
}));
