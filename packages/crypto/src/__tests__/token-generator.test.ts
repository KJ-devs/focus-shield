import type { LockLevel } from "@focus-shield/shared-types";
import { generateToken, TOKEN_CONFIG } from "../token-generator";

const CHARSET_ALPHANUMERIC =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const CHARSET_MIXED =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

const CHARSET_FULL_SYMBOLS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";

describe("TOKEN_CONFIG", () => {
  it("has entries for all 5 lock levels", () => {
    const levels: LockLevel[] = [1, 2, 3, 4, 5];
    for (const level of levels) {
      expect(TOKEN_CONFIG[level]).toBeDefined();
    }
  });

  it("level 1 is Gentle with 8 alphanumeric chars and paste allowed", () => {
    const config = TOKEN_CONFIG[1];
    expect(config.level).toBe(1);
    expect(config.name).toBe("Gentle");
    expect(config.length).toBe(8);
    expect(config.charset).toBe(CHARSET_ALPHANUMERIC);
    expect(config.pasteAllowed).toBe(true);
    expect(config.cooldownBeforeEntry).toBe(false);
    expect(config.cooldownMs).toBe(0);
  });

  it("level 2 is Moderate with 16 mixed chars and no paste", () => {
    const config = TOKEN_CONFIG[2];
    expect(config.level).toBe(2);
    expect(config.name).toBe("Moderate");
    expect(config.length).toBe(16);
    expect(config.charset).toBe(CHARSET_MIXED);
    expect(config.pasteAllowed).toBe(false);
    expect(config.cooldownBeforeEntry).toBe(false);
    expect(config.cooldownMs).toBe(0);
  });

  it("level 3 is Strict with 32 full-symbol chars and 60s cooldown", () => {
    const config = TOKEN_CONFIG[3];
    expect(config.level).toBe(3);
    expect(config.name).toBe("Strict");
    expect(config.length).toBe(32);
    expect(config.charset).toBe(CHARSET_FULL_SYMBOLS);
    expect(config.pasteAllowed).toBe(false);
    expect(config.cooldownBeforeEntry).toBe(true);
    expect(config.cooldownMs).toBe(60_000);
  });

  it("level 4 is Hardcore with 48 full-symbol chars and 120s cooldown", () => {
    const config = TOKEN_CONFIG[4];
    expect(config.level).toBe(4);
    expect(config.name).toBe("Hardcore");
    expect(config.length).toBe(48);
    expect(config.charset).toBe(CHARSET_FULL_SYMBOLS);
    expect(config.pasteAllowed).toBe(false);
    expect(config.cooldownBeforeEntry).toBe(true);
    expect(config.cooldownMs).toBe(120_000);
  });

  it("level 5 is Nuclear with 0 length and empty charset", () => {
    const config = TOKEN_CONFIG[5];
    expect(config.level).toBe(5);
    expect(config.name).toBe("Nuclear");
    expect(config.length).toBe(0);
    expect(config.charset).toBe("");
    expect(config.pasteAllowed).toBe(false);
    expect(config.cooldownBeforeEntry).toBe(false);
    expect(config.cooldownMs).toBe(0);
  });
});

describe("generateToken", () => {
  it("generates a token of length 8 for level 1", () => {
    const token = generateToken(1);
    expect(token).toHaveLength(8);
  });

  it("generates a token of length 16 for level 2", () => {
    const token = generateToken(2);
    expect(token).toHaveLength(16);
  });

  it("generates a token of length 32 for level 3", () => {
    const token = generateToken(3);
    expect(token).toHaveLength(32);
  });

  it("generates a token of length 48 for level 4", () => {
    const token = generateToken(4);
    expect(token).toHaveLength(48);
  });

  it("returns an empty string for level 5 (uninterruptible)", () => {
    const token = generateToken(5);
    expect(token).toBe("");
  });

  it("uses only alphanumeric characters for level 1", () => {
    const token = generateToken(1);
    for (const char of token) {
      expect(CHARSET_ALPHANUMERIC).toContain(char);
    }
  });

  it("uses only mixed charset characters for level 2", () => {
    const token = generateToken(2);
    for (const char of token) {
      expect(CHARSET_MIXED).toContain(char);
    }
  });

  it("uses only full-symbol charset characters for level 3", () => {
    const token = generateToken(3);
    for (const char of token) {
      expect(CHARSET_FULL_SYMBOLS).toContain(char);
    }
  });

  it("uses only full-symbol charset characters for level 4", () => {
    const token = generateToken(4);
    for (const char of token) {
      expect(CHARSET_FULL_SYMBOLS).toContain(char);
    }
  });

  it("produces different tokens on consecutive calls (randomness)", () => {
    const tokens = new Set<string>();
    // Generate 10 tokens at level 2 (16 chars) — extremely unlikely to collide
    for (let i = 0; i < 10; i++) {
      tokens.add(generateToken(2));
    }
    // All 10 should be unique
    expect(tokens.size).toBe(10);
  });

  it("produces different tokens for level 1 as well", () => {
    const tokenA = generateToken(1);
    const tokenB = generateToken(1);
    expect(tokenA).not.toBe(tokenB);
  });
});
