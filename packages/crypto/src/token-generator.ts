import { randomBytes } from "node:crypto";
import type { LockLevel } from "@focus-shield/shared-types";

/**
 * Character sets used for token generation at different friction levels.
 */
const CHARSET_ALPHANUMERIC =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const CHARSET_MIXED =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

const CHARSET_FULL_SYMBOLS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";

/**
 * Configuration for each lock level defining token generation parameters.
 */
export interface TokenLevelConfig {
  readonly level: LockLevel;
  readonly name: string;
  readonly length: number;
  readonly charset: string;
  readonly pasteAllowed: boolean;
  readonly cooldownBeforeEntry: boolean;
  readonly cooldownMs: number;
  readonly description: string;
}

/**
 * Token configuration per lock level, as defined in the project spec (F2.2).
 *
 * | Level | Name     | Length | Charset                     | Paste | Cooldown |
 * |-------|----------|--------|-----------------------------|-------|----------|
 * | 1     | Gentle   | 8      | alphanumeric                | Yes   | No       |
 * | 2     | Moderate | 16     | mixed (alpha + some symbols)| No    | No       |
 * | 3     | Strict   | 32     | mixed + symbols             | No    | 60s      |
 * | 4     | Hardcore | 48     | mixed + symbols             | No    | 120s     |
 * | 5     | Nuclear  | 0      | N/A (uninterruptible)       | N/A   | N/A      |
 */
export const TOKEN_CONFIG: Record<LockLevel, TokenLevelConfig> = {
  1: {
    level: 1,
    name: "Gentle",
    length: 8,
    charset: CHARSET_ALPHANUMERIC,
    pasteAllowed: true,
    cooldownBeforeEntry: false,
    cooldownMs: 0,
    description: "8 alphanumeric characters, paste allowed",
  },
  2: {
    level: 2,
    name: "Moderate",
    length: 16,
    charset: CHARSET_MIXED,
    pasteAllowed: false,
    cooldownBeforeEntry: false,
    cooldownMs: 0,
    description: "16 mixed characters, no paste",
  },
  3: {
    level: 3,
    name: "Strict",
    length: 32,
    charset: CHARSET_FULL_SYMBOLS,
    pasteAllowed: false,
    cooldownBeforeEntry: true,
    cooldownMs: 60_000,
    description: "32 mixed + symbols, 60s cooldown before entry",
  },
  4: {
    level: 4,
    name: "Hardcore",
    length: 48,
    charset: CHARSET_FULL_SYMBOLS,
    pasteAllowed: false,
    cooldownBeforeEntry: true,
    cooldownMs: 120_000,
    description: "48 mixed + symbols, 120s cooldown, double entry required",
  },
  5: {
    level: 5,
    name: "Nuclear",
    length: 0,
    charset: "",
    pasteAllowed: false,
    cooldownBeforeEntry: false,
    cooldownMs: 0,
    description: "No token — session is uninterruptible",
  },
} as const;

/**
 * Generate a cryptographically secure random token for the given lock level.
 *
 * Uses `crypto.randomBytes` to produce unbiased, uniformly distributed
 * characters from the level's charset. Level 5 returns an empty string
 * because the session is uninterruptible (no unlock possible).
 *
 * @param level - The lock/friction level (1-5)
 * @returns A random token string, or empty string for level 5
 */
export function generateToken(level: LockLevel): string {
  const config = TOKEN_CONFIG[level];

  if (config.length === 0 || config.charset.length === 0) {
    return "";
  }

  const charsetLength = config.charset.length;
  const chars: string[] = [];

  // Rejection sampling: only accept byte values below the largest
  // multiple of charsetLength that fits in a byte (0-255).
  // This eliminates modulo bias entirely.
  const maxAcceptable = Math.floor(256 / charsetLength) * charsetLength;

  let i = 0;
  while (i < config.length) {
    const byte = randomBytes(1)[0];
    if (byte === undefined || byte >= maxAcceptable) {
      // Reject biased values and re-draw
      continue;
    }
    const char = config.charset[byte % charsetLength];
    if (char === undefined) {
      continue;
    }
    chars.push(char);
    i++;
  }

  return chars.join("");
}
