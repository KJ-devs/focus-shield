import type { ProcessRule } from "@focus-shield/shared-types";

/**
 * Check if a running process name matches a process rule.
 *
 * Matching is case-insensitive and checks both the rule's primary name
 * and all of its aliases.
 *
 * @param processName - The name of the running process (e.g., "Discord.exe")
 * @param rule - The process rule to match against
 * @returns true if the process matches the rule's name or any of its aliases
 */
export function matchesProcess(
  processName: string,
  rule: ProcessRule,
): boolean {
  const normalizedInput = processName.toLowerCase();
  const normalizedName = rule.name.toLowerCase();

  if (normalizedInput === normalizedName) {
    return true;
  }

  return rule.aliases.some(
    (alias) => alias.toLowerCase() === normalizedInput,
  );
}

/**
 * Find the first process rule that matches a given process name.
 *
 * Iterates through the rules array in order and returns the first match.
 * Matching is case-insensitive against both name and aliases.
 *
 * @param processName - The name of the running process (e.g., "Discord.exe")
 * @param rules - Array of process rules to search through
 * @returns The first matching ProcessRule, or undefined if no match is found
 */
export function findMatchingProcessRule(
  processName: string,
  rules: ProcessRule[],
): ProcessRule | undefined {
  return rules.find((rule) => matchesProcess(processName, rule));
}
