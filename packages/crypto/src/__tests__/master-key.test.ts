import {
  generateMasterKey,
  encryptMasterKey,
  decryptMasterKey,
  verifyMasterKey,
} from "../master-key";
import type { EncryptedMasterKey } from "../master-key";

describe("generateMasterKey", () => {
  it("returns a 64-character hex string", () => {
    const key = generateMasterKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces unique values on consecutive calls", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 10; i++) {
      keys.add(generateMasterKey());
    }
    expect(keys.size).toBe(10);
  });
});

describe("encryptMasterKey / decryptMasterKey", () => {
  it("encrypt then decrypt roundtrip returns the original key", async () => {
    const masterKey = generateMasterKey();
    const password = "super-secret-password-123!";

    const encrypted = await encryptMasterKey(masterKey, password);
    const decrypted = await decryptMasterKey(encrypted, password);

    expect(decrypted).toBe(masterKey);
  });

  it("decrypt throws on wrong password", async () => {
    const masterKey = generateMasterKey();
    const encrypted = await encryptMasterKey(masterKey, "correct-password");

    await expect(
      decryptMasterKey(encrypted, "wrong-password"),
    ).rejects.toThrow("Decryption failed: wrong password or corrupted data");
  });

  it("encrypted output has all required fields (ciphertext, iv, authTag, salt)", async () => {
    const masterKey = generateMasterKey();
    const encrypted = await encryptMasterKey(masterKey, "password");

    expect(encrypted).toHaveProperty("ciphertext");
    expect(encrypted).toHaveProperty("iv");
    expect(encrypted).toHaveProperty("authTag");
    expect(encrypted).toHaveProperty("salt");

    // All fields should be non-empty hex strings
    expect(encrypted.ciphertext).toMatch(/^[0-9a-f]+$/);
    expect(encrypted.iv).toMatch(/^[0-9a-f]+$/);
    expect(encrypted.authTag).toMatch(/^[0-9a-f]+$/);
    expect(encrypted.salt).toMatch(/^[0-9a-f]+$/);

    // IV should be 12 bytes = 24 hex chars
    expect(encrypted.iv).toHaveLength(24);
    // Auth tag should be 16 bytes = 32 hex chars
    expect(encrypted.authTag).toHaveLength(32);
    // Salt should be 32 bytes = 64 hex chars
    expect(encrypted.salt).toHaveLength(64);
  });

  it("throws when masterKey is empty", async () => {
    await expect(encryptMasterKey("", "password")).rejects.toThrow(
      "Master key cannot be empty",
    );
  });

  it("throws when password is empty", async () => {
    await expect(
      encryptMasterKey(generateMasterKey(), ""),
    ).rejects.toThrow("Password cannot be empty");
  });

  it("produces different encrypted outputs for the same key and password", async () => {
    const masterKey = generateMasterKey();
    const password = "same-password";

    const encrypted1 = await encryptMasterKey(masterKey, password);
    const encrypted2 = await encryptMasterKey(masterKey, password);

    // Due to random salt and IV, ciphertext and other fields should differ
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.salt).not.toBe(encrypted2.salt);
  });

  it("decrypt fails when ciphertext is tampered with", async () => {
    const masterKey = generateMasterKey();
    const encrypted = await encryptMasterKey(masterKey, "password");

    const tampered: EncryptedMasterKey = {
      ...encrypted,
      ciphertext: "ff".repeat(encrypted.ciphertext.length / 2),
    };

    await expect(decryptMasterKey(tampered, "password")).rejects.toThrow(
      "Decryption failed",
    );
  });
});

describe("verifyMasterKey", () => {
  it("returns true for correct key", async () => {
    const masterKey = generateMasterKey();
    const password = "my-password";
    const encrypted = await encryptMasterKey(masterKey, password);

    const result = await verifyMasterKey(masterKey, encrypted, password);
    expect(result).toBe(true);
  });

  it("returns false for wrong key attempt", async () => {
    const masterKey = generateMasterKey();
    const wrongKey = generateMasterKey();
    const password = "my-password";
    const encrypted = await encryptMasterKey(masterKey, password);

    const result = await verifyMasterKey(wrongKey, encrypted, password);
    expect(result).toBe(false);
  });

  it("returns false when password is wrong (decryption fails gracefully)", async () => {
    const masterKey = generateMasterKey();
    const encrypted = await encryptMasterKey(masterKey, "correct-password");

    const result = await verifyMasterKey(
      masterKey,
      encrypted,
      "wrong-password",
    );
    expect(result).toBe(false);
  });
});
