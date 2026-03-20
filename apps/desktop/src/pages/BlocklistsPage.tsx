import { useState, useCallback, createContext, useContext } from "react";
import { useBlocklistStore } from "@/stores/blocklist-store";
import type { BlocklistData } from "@/stores/blocklist-store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { getBlocklistEmoji } from "@/data/blocklist-icons";

// ---------------------------------------------------------------------------
// Drag & drop data
// ---------------------------------------------------------------------------

interface DragItem {
  type: "domain" | "process";
  value: string;
  display: string;
}

function encodeDragItem(item: DragItem): string {
  return JSON.stringify(item);
}

function decodeDragItem(data: string): DragItem | null {
  try {
    const parsed = JSON.parse(data);
    if (
      parsed &&
      (parsed.type === "domain" || parsed.type === "process") &&
      typeof parsed.value === "string"
    ) {
      return parsed as DragItem;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Selected item context (click-to-add flow)
// ---------------------------------------------------------------------------

interface SelectedItemCtx {
  selected: DragItem | null;
  setSelected: (item: DragItem | null) => void;
}

const SelectedItemContext = createContext<SelectedItemCtx>({
  selected: null,
  setSelected: () => {},
});

function useSelectedItem() {
  return useContext(SelectedItemContext);
}

// ---------------------------------------------------------------------------
// Suggestions catalog
// ---------------------------------------------------------------------------

interface SuggestionEntry {
  type: "domain" | "process";
  value: string;
  display: string;
}

interface SuggestionGroup {
  label: string;
  items: SuggestionEntry[];
}

const SUGGESTION_GROUPS: SuggestionGroup[] = [
  {
    label: "Apps populaires",
    items: [
      { type: "process", value: "discord", display: "Discord" },
      { type: "process", value: "slack", display: "Slack" },
      { type: "process", value: "telegram", display: "Telegram" },
      { type: "process", value: "whatsapp", display: "WhatsApp" },
      { type: "process", value: "signal", display: "Signal" },
      { type: "process", value: "spotify", display: "Spotify" },
      { type: "process", value: "steam", display: "Steam" },
      { type: "process", value: "vlc", display: "VLC" },
      { type: "process", value: "obs", display: "OBS Studio" },
      { type: "process", value: "firefox", display: "Firefox" },
      { type: "process", value: "chrome", display: "Chrome" },
      { type: "process", value: "brave", display: "Brave" },
      { type: "process", value: "figma", display: "Figma" },
      { type: "process", value: "notion", display: "Notion" },
      { type: "process", value: "zoom", display: "Zoom" },
      { type: "process", value: "teams", display: "Teams" },
      { type: "process", value: "skype", display: "Skype" },
    ],
  },
  {
    label: "Jeux & Launchers",
    items: [
      { type: "process", value: "epicgameslauncher", display: "Epic Games" },
      { type: "process", value: "battle.net", display: "Battle.net" },
      { type: "process", value: "riotclient", display: "Riot Client" },
      { type: "process", value: "origin", display: "EA / Origin" },
      { type: "process", value: "ubisoft", display: "Ubisoft Connect" },
      { type: "process", value: "gog", display: "GOG Galaxy" },
      { type: "process", value: "minecraft", display: "Minecraft" },
      { type: "process", value: "roblox", display: "Roblox" },
    ],
  },
  {
    label: "Reseaux sociaux",
    items: [
      { type: "domain", value: "*.facebook.com", display: "Facebook" },
      { type: "domain", value: "*.instagram.com", display: "Instagram" },
      { type: "domain", value: "*.twitter.com", display: "Twitter/X" },
      { type: "domain", value: "*.tiktok.com", display: "TikTok" },
      { type: "domain", value: "*.reddit.com", display: "Reddit" },
      { type: "domain", value: "*.snapchat.com", display: "Snapchat" },
      { type: "domain", value: "*.threads.net", display: "Threads" },
      { type: "domain", value: "*.bsky.app", display: "Bluesky" },
      { type: "domain", value: "*.pinterest.com", display: "Pinterest" },
      { type: "domain", value: "*.tumblr.com", display: "Tumblr" },
      { type: "domain", value: "*.linkedin.com", display: "LinkedIn" },
    ],
  },
  {
    label: "Video & Streaming",
    items: [
      { type: "domain", value: "*.youtube.com", display: "YouTube" },
      { type: "domain", value: "*.netflix.com", display: "Netflix" },
      { type: "domain", value: "*.twitch.tv", display: "Twitch" },
      { type: "domain", value: "*.disneyplus.com", display: "Disney+" },
      { type: "domain", value: "*.primevideo.com", display: "Prime Video" },
      { type: "domain", value: "*.hbomax.com", display: "HBO Max" },
      { type: "domain", value: "*.crunchyroll.com", display: "Crunchyroll" },
      { type: "domain", value: "*.dailymotion.com", display: "Dailymotion" },
      { type: "domain", value: "*.vimeo.com", display: "Vimeo" },
    ],
  },
  {
    label: "Shopping",
    items: [
      { type: "domain", value: "*.amazon.com", display: "Amazon US" },
      { type: "domain", value: "*.amazon.fr", display: "Amazon FR" },
      { type: "domain", value: "*.ebay.com", display: "eBay" },
      { type: "domain", value: "*.aliexpress.com", display: "AliExpress" },
      { type: "domain", value: "*.temu.com", display: "Temu" },
      { type: "domain", value: "*.shein.com", display: "Shein" },
      { type: "domain", value: "*.etsy.com", display: "Etsy" },
      { type: "domain", value: "*.leboncoin.fr", display: "Leboncoin" },
      { type: "domain", value: "*.vinted.fr", display: "Vinted" },
    ],
  },
  {
    label: "AI & Outils",
    items: [
      { type: "domain", value: "*.chatgpt.com", display: "ChatGPT" },
      { type: "domain", value: "*.claude.ai", display: "Claude" },
      { type: "domain", value: "*.gemini.google.com", display: "Gemini" },
      { type: "domain", value: "*.perplexity.ai", display: "Perplexity" },
      { type: "domain", value: "*.midjourney.com", display: "Midjourney" },
      { type: "domain", value: "*.character.ai", display: "Character.AI" },
      { type: "domain", value: "*.deepseek.com", display: "DeepSeek" },
    ],
  },
  {
    label: "News & Forums",
    items: [
      { type: "domain", value: "news.ycombinator.com", display: "Hacker News" },
      { type: "domain", value: "*.quora.com", display: "Quora" },
      { type: "domain", value: "*.medium.com", display: "Medium" },
      { type: "domain", value: "*.bbc.com", display: "BBC" },
      { type: "domain", value: "*.cnn.com", display: "CNN" },
      { type: "domain", value: "*.lemonde.fr", display: "Le Monde" },
      { type: "domain", value: "*.bfmtv.com", display: "BFM TV" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Domain / process entry input
// ---------------------------------------------------------------------------

function EntryInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
      />
      <Button variant="secondary" size="sm" onClick={handleAdd}>
        Add
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tag-like removable entry
// ---------------------------------------------------------------------------

function RemovableTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-sm text-gray-400 hover:text-red-500 dark:hover:text-red-400"
        title={`Remove ${label}`}
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Suggestion chip (draggable + clickable)
// ---------------------------------------------------------------------------

function SuggestionChip({ item }: { item: SuggestionEntry }) {
  const { selected, setSelected } = useSelectedItem();

  const isActive =
    selected !== null &&
    selected.type === item.type &&
    selected.value === item.value;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/focus-shield-item",
      encodeDragItem(item),
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleClick = () => {
    if (isActive) {
      setSelected(null);
    } else {
      setSelected({ type: item.type, value: item.value, display: item.display });
    }
  };

  const isProcess = item.type === "process";

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`inline-flex cursor-grab items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium select-none transition-all active:cursor-grabbing ${
        isActive
          ? "ring-2 ring-focus-500 ring-offset-1 dark:ring-offset-gray-800"
          : ""
      } ${
        isProcess
          ? "border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:border-orange-700"
          : "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:border-blue-700"
      }`}
      title={isActive ? "Cliquer une carte pour ajouter, ou re-cliquer pour deselectionner" : `Cliquer pour selectionner "${item.display}", puis cliquer une carte`}
    >
      <span className="text-[10px] opacity-60">{isProcess ? "APP" : "WEB"}</span>
      {item.display}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Suggestions sidebar
// ---------------------------------------------------------------------------

function SuggestionsSidebar() {
  const { selected } = useSelectedItem();
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const lowerSearch = search.toLowerCase();

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
        Ajouter a une liste
      </h3>
      <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
        {selected
          ? <>
              <span className="font-semibold text-focus-500">{selected.display}</span> selectionne — cliquer une carte
            </>
          : "Cliquer un element, puis cliquer une carte"}
      </p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher..."
        className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
      />

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {SUGGESTION_GROUPS.map((group) => {
          const filteredItems = lowerSearch
            ? group.items.filter(
                (i) =>
                  i.display.toLowerCase().includes(lowerSearch) ||
                  i.value.toLowerCase().includes(lowerSearch),
              )
            : group.items;

          if (filteredItems.length === 0) return null;

          const isCollapsed = collapsedGroups.has(group.label) && !lowerSearch;

          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="mb-1.5 flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <svg
                  className={`h-3 w-3 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
                {group.label}
                <span className="text-gray-300 dark:text-gray-600">({filteredItems.length})</span>
              </button>
              {!isCollapsed && (
                <div className="flex flex-wrap gap-1.5">
                  {filteredItems.map((item) => (
                    <SuggestionChip key={`${item.type}-${item.value}`} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Built-in blocklist card — drop target + click target
// ---------------------------------------------------------------------------

function BuiltInBlocklistCard({ blocklist }: { blocklist: BlocklistData }) {
  const toggleBlocklist = useBlocklistStore((s) => s.toggleBlocklist);
  const addDomain = useBlocklistStore((s) => s.addDomain);
  const removeDomain = useBlocklistStore((s) => s.removeDomain);
  const addProcess = useBlocklistStore((s) => s.addProcess);
  const removeProcess = useBlocklistStore((s) => s.removeProcess);
  const { selected, setSelected } = useSelectedItem();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const previewCount = 4;
  const hasMore = blocklist.domains.length > previewCount;
  const visibleDomains = expanded || editing
    ? blocklist.domains
    : blocklist.domains.slice(0, previewCount);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/focus-shield-item")) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const raw = e.dataTransfer.getData("application/focus-shield-item");
      const item = decodeDragItem(raw);
      if (!item) return;
      addItem(item);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blocklist.id],
  );

  const addItem = useCallback(
    (item: DragItem) => {
      if (item.type === "domain") {
        addDomain(blocklist.id, item.value);
      } else {
        addProcess(blocklist.id, item.value);
      }
      setJustAdded(item.display || item.value);
      setTimeout(() => setJustAdded(null), 1500);
    },
    [blocklist.id, addDomain, addProcess],
  );

  // Click on card when an item is selected → add it
  const handleCardClick = useCallback(() => {
    if (!selected) return;
    addItem(selected);
    setSelected(null);
  }, [selected, addItem, setSelected]);

  const isClickTarget = selected !== null;

  return (
    <Card
      className={`flex flex-col gap-3 transition-all ${
        dragOver
          ? "ring-2 ring-focus-500 ring-offset-2 dark:ring-offset-gray-900"
          : isClickTarget
            ? "cursor-pointer ring-1 ring-focus-300 hover:ring-2 hover:ring-focus-500 dark:ring-focus-700 dark:hover:ring-focus-500"
            : ""
      } ${justAdded ? "ring-2 ring-green-500 dark:ring-green-400" : ""}`}
      onClick={isClickTarget ? handleCardClick : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getBlocklistEmoji(blocklist.icon)}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {blocklist.name}
            </h3>
            <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{blocklist.domains.length} domains</span>
              {blocklist.processes.length > 0 && (
                <span>{blocklist.processes.length} apps</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isClickTarget && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditing(!editing); }}
              className={`rounded p-1 text-gray-400 hover:text-focus-500 dark:hover:text-focus-400 ${editing ? "text-focus-500 dark:text-focus-400" : ""}`}
              title={editing ? "Fermer" : "Modifier"}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {editing ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                )}
              </svg>
            </button>
          )}
          <Toggle
            checked={blocklist.enabled}
            onChange={() => toggleBlocklist(blocklist.id)}
          />
        </div>
      </div>

      {/* Feedback banners */}
      {dragOver && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-focus-400 bg-focus-50 py-2 text-xs font-medium text-focus-600 dark:border-focus-500 dark:bg-focus-900/20 dark:text-focus-400">
          Deposer ici
        </div>
      )}
      {isClickTarget && !dragOver && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-focus-300 bg-focus-50/50 py-1.5 text-xs font-medium text-focus-500 dark:border-focus-600 dark:bg-focus-900/10 dark:text-focus-400">
          Cliquer pour ajouter "{selected.display}"
        </div>
      )}
      {justAdded && !isClickTarget && !dragOver && (
        <div className="flex items-center justify-center rounded-lg border border-green-300 bg-green-50 py-1.5 text-xs font-medium text-green-600 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400">
          {justAdded} ajoute !
        </div>
      )}

      {/* Domains list */}
      <div>
        {editing && (
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Sites bloques
          </span>
        )}
        <div className="flex flex-wrap gap-1">
          {visibleDomains.map((domain) =>
            editing ? (
              <RemovableTag
                key={domain}
                label={domain}
                onRemove={() => removeDomain(blocklist.id, domain)}
              />
            ) : (
              <span
                key={domain}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              >
                {domain}
              </span>
            ),
          )}
          {hasMore && !editing && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-focus-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-focus-400 dark:hover:bg-gray-600"
            >
              {expanded
                ? "show less"
                : `+${blocklist.domains.length - previewCount} more`}
            </button>
          )}
        </div>
        {editing && (
          <div className="mt-2">
            <EntryInput
              placeholder="ex: *.example.com"
              onAdd={(domain) => addDomain(blocklist.id, domain)}
            />
          </div>
        )}
      </div>

      {/* Processes / Apps */}
      {(blocklist.processes.length > 0 || editing) && (
        <div>
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Apps bloquees
          </span>
          <div className="flex flex-wrap gap-1">
            {blocklist.processes.map((proc) =>
              editing ? (
                <RemovableTag
                  key={proc.name}
                  label={`${proc.name} (${proc.action === "kill" ? "ferme" : "suspend"})`}
                  onRemove={() => removeProcess(blocklist.id, proc.name)}
                />
              ) : (
                <span
                  key={proc.name}
                  className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {proc.name}
                  <span className="text-orange-400 dark:text-orange-500">
                    ({proc.action === "kill" ? "ferme" : "suspend"})
                  </span>
                </span>
              ),
            )}
            {editing && blocklist.processes.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Aucune app ajoutee.
              </p>
            )}
          </div>
          {editing && (
            <div className="mt-2">
              <EntryInput
                placeholder="ex: discord, steam, spotify"
                onAdd={(proc) => addProcess(blocklist.id, proc)}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom blocklist expandable card — also a drop/click target
// ---------------------------------------------------------------------------

function CustomBlocklistCard({
  blocklist,
  isExpanded,
  onToggleExpand,
}: {
  blocklist: BlocklistData;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const toggleBlocklist = useBlocklistStore((s) => s.toggleBlocklist);
  const deleteBlocklist = useBlocklistStore((s) => s.deleteBlocklist);
  const addDomain = useBlocklistStore((s) => s.addDomain);
  const removeDomain = useBlocklistStore((s) => s.removeDomain);
  const addProcess = useBlocklistStore((s) => s.addProcess);
  const removeProcess = useBlocklistStore((s) => s.removeProcess);
  const { selected, setSelected } = useSelectedItem();
  const [dragOver, setDragOver] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/focus-shield-item")) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const addItem = useCallback(
    (item: DragItem) => {
      if (item.type === "domain") {
        addDomain(blocklist.id, item.value);
      } else {
        addProcess(blocklist.id, item.value);
      }
      setJustAdded(item.display || item.value);
      setTimeout(() => setJustAdded(null), 1500);
    },
    [blocklist.id, addDomain, addProcess],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const raw = e.dataTransfer.getData("application/focus-shield-item");
      const item = decodeDragItem(raw);
      if (!item) return;
      addItem(item);
    },
    [addItem],
  );

  const handleCardClick = useCallback(() => {
    if (!selected) return;
    addItem(selected);
    setSelected(null);
  }, [selected, addItem, setSelected]);

  const isClickTarget = selected !== null;

  return (
    <Card
      className={`transition-all ${
        dragOver
          ? "ring-2 ring-focus-500 ring-offset-2 dark:ring-offset-gray-900"
          : isClickTarget
            ? "cursor-pointer ring-1 ring-focus-300 hover:ring-2 hover:ring-focus-500 dark:ring-focus-700 dark:hover:ring-focus-500"
            : ""
      } ${justAdded ? "ring-2 ring-green-500 dark:ring-green-400" : ""}`}
      onClick={isClickTarget ? handleCardClick : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isClickTarget ? undefined : onToggleExpand}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <svg
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xl">{getBlocklistEmoji(blocklist.icon)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">
              {blocklist.name}
            </h3>
            <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{blocklist.domains.length} domains</span>
              <span>{blocklist.processes.length} processes</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <Toggle
            checked={blocklist.enabled}
            onChange={() => toggleBlocklist(blocklist.id)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteBlocklist(blocklist.id); }}
            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Feedback banners */}
      {isClickTarget && (
        <div className="mt-2 flex items-center justify-center rounded-lg border-2 border-dashed border-focus-300 bg-focus-50/50 py-1.5 text-xs font-medium text-focus-500 dark:border-focus-600 dark:bg-focus-900/10 dark:text-focus-400">
          Cliquer pour ajouter "{selected.display}"
        </div>
      )}
      {justAdded && !isClickTarget && (
        <div className="mt-2 flex items-center justify-center rounded-lg border border-green-300 bg-green-50 py-1.5 text-xs font-medium text-green-600 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400">
          {justAdded} ajoute !
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          {/* Domains */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Blocked Domains
            </h4>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {blocklist.domains.map((domain) => (
                <RemovableTag
                  key={domain}
                  label={domain}
                  onRemove={() => removeDomain(blocklist.id, domain)}
                />
              ))}
              {blocklist.domains.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No domains added yet.
                </p>
              )}
            </div>
            <EntryInput
              placeholder="e.g. *.example.com"
              onAdd={(domain) => addDomain(blocklist.id, domain)}
            />
          </div>

          {/* Processes */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Blocked Processes
            </h4>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {blocklist.processes.map((proc) => (
                <RemovableTag
                  key={proc.name}
                  label={proc.name}
                  onRemove={() => removeProcess(blocklist.id, proc.name)}
                />
              ))}
              {blocklist.processes.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No processes added yet.
                </p>
              )}
            </div>
            <EntryInput
              placeholder="e.g. discord"
              onAdd={(proc) => addProcess(blocklist.id, proc)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create custom blocklist form
// ---------------------------------------------------------------------------

function CreateBlocklistForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const addBlocklist = useBlocklistStore((s) => s.addBlocklist);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    addBlocklist({
      name: trimmed,
      icon: "custom",
      category: "custom",
      domains: [],
      processes: [],
      isBuiltIn: false,
      enabled: true,
    });

    onClose();
  };

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Create Custom Blocklist
      </h3>
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Blocklist name"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-focus-500 focus:outline-none focus:ring-1 focus:ring-focus-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          autoFocus
        />
        <Button variant="primary" size="sm" onClick={handleCreate} disabled={!name.trim()}>
          Create
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function BlocklistsPage() {
  const blocklists = useBlocklistStore((s) => s.blocklists);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DragItem | null>(null);

  const [showHidden, setShowHidden] = useState(false);
  const builtInLists = blocklists.filter((b) => b.isBuiltIn && !b.hidden);
  const hiddenLists = blocklists.filter((b) => b.isBuiltIn && b.hidden);
  const customLists = blocklists.filter((b) => !b.isBuiltIn);

  const enabledCount = blocklists.filter((b) => b.enabled).length;

  return (
    <SelectedItemContext.Provider value={{ selected, setSelected }}>
      <div className="flex gap-6">
        {/* Left: blocklists */}
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Blocklists
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selected
                  ? <><span className="font-semibold text-focus-500">{selected.display}</span> selectionne — cliquer une carte pour l'ajouter</>
                  : "Selectionnez un element a droite, puis cliquez sur une carte."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(null)}
                  className="text-red-500"
                >
                  Annuler
                </Button>
              )}
              <Badge variant="info">{enabledCount} active</Badge>
            </div>
          </div>

          {/* Built-in blocklists */}
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Built-in Lists
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {builtInLists.map((blocklist) => (
                <BuiltInBlocklistCard key={blocklist.id} blocklist={blocklist} />
              ))}
            </div>

            {hiddenLists.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowHidden(!showHidden)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${showHidden ? "rotate-90" : ""}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {showHidden ? "Hide" : "Show"} sensitive lists ({hiddenLists.length})
                </button>
                {showHidden && (
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {hiddenLists.map((blocklist) => (
                      <BuiltInBlocklistCard key={blocklist.id} blocklist={blocklist} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Custom blocklists */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Custom Lists
              </h2>
              {!showCreateForm && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateForm(true)}
                >
                  + Create Custom List
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {showCreateForm && (
                <CreateBlocklistForm onClose={() => setShowCreateForm(false)} />
              )}

              {customLists.map((blocklist) => (
                <CustomBlocklistCard
                  key={blocklist.id}
                  blocklist={blocklist}
                  isExpanded={expandedId === blocklist.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === blocklist.id ? null : blocklist.id)
                  }
                />
              ))}

              {customLists.length === 0 && !showCreateForm && (
                <Card className="flex flex-col items-center gap-3 py-8">
                  <span className="text-3xl">{"\uD83D\uDD27"}</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No custom blocklists yet. Create one to tailor your blocking rules.
                  </p>
                </Card>
              )}
            </div>
          </section>
        </div>

        {/* Right: suggestions sidebar */}
        <aside className="sticky top-4 hidden h-[calc(100vh-6rem)] w-72 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:block dark:border-gray-700 dark:bg-gray-800">
          <SuggestionsSidebar />
        </aside>
      </div>
    </SelectedItemContext.Provider>
  );
}
