import { randomBytes, createCipheriv, createDecipheriv, pbkdf2 } from "node:crypto";

/**
 * Encrypted master key storage format.
 * All binary data is encoded as hex strings for safe serialization.
 */
export interface EncryptedMasterKey {
  /** AES-256-GCM ciphertext (hex) */
  ciphertext: string;
  /** Initialization vector (hex, 12 bytes) */
  iv: string;
  /** GCM authentication tag (hex, 16 bytes) */
  authTag: string;
  /** Salt used for PBKDF2 key derivation (hex, 32 bytes) */
  salt: string;
}

/** PBKDF2 configuration */
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = "sha256";
const PBKDF2_KEY_LENGTH = 32; // 256 bits for AES-256

/** Salt length in bytes */
const SALT_LENGTH = 32;

/** AES-256-GCM IV length in bytes */
const IV_LENGTH = 12;

/** Master key length in bytes (produces 64-char hex string) */
const MASTER_KEY_LENGTH = 32;

/**
 * Promisified wrapper for Node.js `crypto.pbkdf2`.
 *
 * Derives a cryptographic key from a password and salt using PBKDF2
 * with SHA-256 and 100,000 iterations.
 */
function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey);
    });
  });
}

/**
 * Generate a new random master key.
 *
 * @returns A 64-character hex string representing 32 random bytes
 */
export function generateMasterKey(): string {
  return randomBytes(MASTER_KEY_LENGTH).toString("hex");
}

/**
 * Encrypt the master key with a user-provided password.
 *
 * Uses PBKDF2 (SHA-256, 100,000 iterations) to derive an AES-256 key
 * from the password, then encrypts the master key using AES-256-GCM
 * for authenticated encryption.
 *
 * This ensures the master key cannot be recovered without the user's password,
 * and any tampering with the ciphertext is detected via the GCM auth tag.
 *
 * @param masterKey - The plaintext master key (hex string)
 * @param password - The user's password for key derivation
 * @returns Encrypted master key with all components needed for decryption
 * @throws {Error} If masterKey or password is empty
 */
export async function encryptMasterKey(
  masterKey: string,
  password: string,
): Promise<EncryptedMasterKey> {
  if (masterKey.length === 0) {
    throw new Error("Master key cannot be empty");
  }
  if (password.length === 0) {
    throw new Error("Password cannot be empty");
  }

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const derivedKey = await deriveKey(password, salt);

  const cipher = createCipheriv("aes-256-gcm", derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(masterKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    salt: salt.toString("hex"),
  };
}

/**
 * Decrypt the master key using the user's password.
 *
 * Re-derives the AES-256 key from the password and salt, then decrypts
 * the ciphertext using AES-256-GCM with authentication tag verification.
 *
 * @param encrypted - The encrypted master key components
 * @param password - The user's password
 * @returns The plaintext master key
 * @throws {Error} If the password is wrong or data is tampered with
 */
export async function decryptMasterKey(
  encrypted: EncryptedMasterKey,
  password: string,
): Promise<string> {
  const salt = Buffer.from(encrypted.salt, "hex");
  const iv = Buffer.from(encrypted.iv, "hex");
  const authTag = Buffer.from(encrypted.authTag, "hex");
  const ciphertext = Buffer.from(encrypted.ciphertext, "hex");

  const derivedKey = await deriveKey(password, salt);

  const decipher = createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    throw new Error("Decryption failed: wrong password or corrupted data");
  }
}

/**
 * Verify a master key attempt against the encrypted version.
 *
 * Decrypts the stored master key and compares it with the attempt.
 *
 * @param attempt - The master key the user is trying to verify
 * @param encrypted - The encrypted master key storage
 * @param password - The user's password for decryption
 * @returns `true` if the attempt matches the stored master key
 */
export async function verifyMasterKey(
  attempt: string,
  encrypted: EncryptedMasterKey,
  password: string,
): Promise<boolean> {
  try {
    const decrypted = await decryptMasterKey(encrypted, password);
    return attempt === decrypted;
  } catch {
    return false;
  }
}
