import { hashToken, verifyToken } from "../hasher";

describe("hashToken", () => {
  it("returns an encoded Argon2id string", async () => {
    const hash = await hashToken("test-token-123");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("produces different hashes for the same input (random salt)", async () => {
    const hash1 = await hashToken("same-input");
    const hash2 = await hashToken("same-input");
    expect(hash1).not.toBe(hash2);
  });

  it("throws when hashing an empty token", async () => {
    await expect(hashToken("")).rejects.toThrow("Cannot hash an empty token");
  });
});

describe("verifyToken", () => {
  it("returns true for a correct token", async () => {
    const token = "correct-token-abc";
    const hash = await hashToken(token);
    const result = await verifyToken(token, hash);
    expect(result).toBe(true);
  });

  it("returns false for a wrong token", async () => {
    const hash = await hashToken("original-token");
    const result = await verifyToken("wrong-token", hash);
    expect(result).toBe(false);
  });

  it("returns false for an invalid/corrupted hash", async () => {
    const result = await verifyToken("some-token", "not-a-valid-hash");
    expect(result).toBe(false);
  });

  it("returns false for an empty hash string", async () => {
    const result = await verifyToken("some-token", "");
    expect(result).toBe(false);
  });
});
