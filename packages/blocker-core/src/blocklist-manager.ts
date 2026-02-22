import type {
  BlocklistPreset,
  DomainRule,
  ProcessRule,
} from "@focus-shield/shared-types";

/**
 * Merge multiple blocklists into a single set of deduplicated rules.
 *
 * Domain rules are deduplicated by their pattern (case-insensitive).
 * When duplicates are found, the first occurrence is kept.
 *
 * Process rules are deduplicated by their name (case-insensitive).
 * When duplicates are found, aliases are merged from all occurrences
 * and the action from the first occurrence is kept.
 *
 * @param lists - One or more BlocklistPreset objects to merge
 * @returns An object with deduplicated domain and process rules
 */
export function mergeBlocklists(
  ...lists: BlocklistPreset[]
): { domains: DomainRule[]; processes: ProcessRule[] } {
  const domainMap = new Map<string, DomainRule>();
  const processMap = new Map<string, ProcessRule>();

  for (const list of lists) {
    for (const domain of list.domains) {
      const key = domain.pattern.toLowerCase();
      if (!domainMap.has(key)) {
        domainMap.set(key, domain);
      }
    }

    for (const process of list.processes) {
      const key = process.name.toLowerCase();
      const existing = processMap.get(key);
      if (existing) {
        // Merge aliases, deduplicating by lowercase
        const existingAliasSet = new Set(
          existing.aliases.map((a) => a.toLowerCase()),
        );
        const newAliases = process.aliases.filter(
          (a) => !existingAliasSet.has(a.toLowerCase()),
        );
        processMap.set(key, {
          ...existing,
          aliases: [...existing.aliases, ...newAliases],
        });
      } else {
        processMap.set(key, process);
      }
    }
  }

  return {
    domains: Array.from(domainMap.values()),
    processes: Array.from(processMap.values()),
  };
}

/**
 * Create a custom blocklist preset with a generated ID.
 *
 * The generated ID is prefixed with "custom-" followed by a timestamp
 * to ensure uniqueness within a session.
 *
 * @param config - The configuration for the custom blocklist
 * @param config.name - Display name for the blocklist
 * @param config.domains - Array of domain rules
 * @param config.processes - Array of process rules
 * @returns A new BlocklistPreset with category "custom" and isBuiltIn false
 */
export function createCustomBlocklist(config: {
  name: string;
  domains: DomainRule[];
  processes: ProcessRule[];
}): BlocklistPreset {
  return {
    id: `custom-${Date.now()}`,
    name: config.name,
    icon: "list",
    category: "custom",
    domains: config.domains,
    processes: config.processes,
    isBuiltIn: false,
    createdAt: new Date(),
  };
}
