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
  "shield-off": "\uD83D\uDD1E",
  heart: "\u2764\uFE0F",
  dice: "\uD83C\uDFB2",
  "trending-up": "\uD83D\uDCC8",
  clock: "\u23F0",
  robot: "\uD83E\uDD16",
  trophy: "\uD83C\uDFC6",
  utensils: "\uD83C\uDF7D\uFE0F",
  custom: "\uD83D\uDD27",
  globe: "\uD83C\uDF10",
  lock: "\uD83D\uDD12",
  list: "\uD83D\uDCCB",
};

export function getBlocklistEmoji(icon: string): string {
  return BLOCKLIST_ICON_MAP[icon] ?? "\uD83D\uDCCB";
}
