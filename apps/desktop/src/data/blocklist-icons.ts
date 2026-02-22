/**
 * Icon mapping for blocklist categories.
 * Defined locally to keep the UI self-contained.
 */

const BLOCKLIST_ICON_MAP: Record<string, string> = {
  users: "\uD83D\uDC65",
  film: "\uD83C\uDFAC",
  gamepad: "\uD83C\uDFAE",
  newspaper: "\uD83D\uDCF0",
  "shopping-cart": "\uD83D\uDED2",
  shield: "\uD83D\uDEE1\uFE0F",
  custom: "\uD83D\uDD27",
  globe: "\uD83C\uDF10",
  lock: "\uD83D\uDD12",
  list: "\uD83D\uDCCB",
};

export function getBlocklistEmoji(icon: string): string {
  return BLOCKLIST_ICON_MAP[icon] ?? "\uD83D\uDCCB";
}
