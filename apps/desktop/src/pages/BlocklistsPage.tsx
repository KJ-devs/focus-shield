import { useState } from "react";
import { useBlocklistStore } from "@/stores/blocklist-store";
import type { BlocklistData } from "@/stores/blocklist-store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { getBlocklistEmoji } from "@/data/blocklist-icons";

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
// Built-in blocklist card (compact grid card)
// ---------------------------------------------------------------------------

function BuiltInBlocklistCard({ blocklist }: { blocklist: BlocklistData }) {
  const toggleBlocklist = useBlocklistStore((s) => s.toggleBlocklist);

  return (
    <Card className="flex flex-col gap-3">
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
                <span>{blocklist.processes.length} processes</span>
              )}
            </div>
          </div>
        </div>
        <Toggle
          checked={blocklist.enabled}
          onChange={() => toggleBlocklist(blocklist.id)}
        />
      </div>

      {/* Preview of domains */}
      <div className="flex flex-wrap gap-1">
        {blocklist.domains.slice(0, 4).map((domain) => (
          <span
            key={domain}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
          >
            {domain}
          </span>
        ))}
        {blocklist.domains.length > 4 && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
            +{blocklist.domains.length - 4} more
          </span>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom blocklist expandable card
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

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleExpand}
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
            onClick={() => deleteBlocklist(blocklist.id)}
            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </Button>
        </div>
      </div>

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

  const builtInLists = blocklists.filter((b) => b.isBuiltIn);
  const customLists = blocklists.filter((b) => !b.isBuiltIn);

  const enabledCount = blocklists.filter((b) => b.enabled).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Blocklists
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage domains and processes to block during focus sessions.
          </p>
        </div>
        <Badge variant="info">{enabledCount} active</Badge>
      </div>

      {/* Built-in blocklists */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Built-in Lists
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builtInLists.map((blocklist) => (
            <BuiltInBlocklistCard key={blocklist.id} blocklist={blocklist} />
          ))}
        </div>
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
  );
}
