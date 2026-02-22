export { matchesDomain, isDomainBlocked } from "./domain-matcher";

export { matchesProcess, findMatchingProcessRule } from "./process-matcher";

export {
  BLOCKLIST_PRESETS,
  getBlocklistPreset,
  getAllBlocklistPresets,
} from "./presets";

export { mergeBlocklists, createCustomBlocklist } from "./blocklist-manager";
