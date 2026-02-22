import { randomBytes } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Argon2id parameters for token hashing.
 *
 * These follow OWASP recommendations for password hashing:
 * - memoryCost: 65536 KiB (64 MB)
 * - timeCost: 3 iterations
 * - parallelism: 1 thread
 * - hashLength: 32 bytes (256 bits)
 * - salt: 16 bytes (128 bits), randomly generated per hash
 */
const ARGON2_PARAMS = {
  memoryCost: 65536, // 64 MB in KiB
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
  saltLength: 16,
} as const;

/**
 * Hash a token using Argon2id.
 *
 * Generates a random salt and produces a self-contained encoded hash string
 * that includes the algorithm, parameters, salt, and hash. This encoded format
 * allows verification without needing to store the salt separately.
 *
 * @param token - The plaintext token to hash (must be non-empty)
 * @returns Encoded Argon2id hash string (includes salt and parameters)
 * @throws {Error} If the token is empty
 *
 * @example
 * ```ts
 * const hash = await hashToken("mySecretToken");
 * // Returns something like: "$argon2id$v=19$m=65536,t=3,p=1$..."
 * ```
 */
export async function hashToken(token: string): Promise<string> {
  if (token.length === 0) {
    throw new Error("Cannot hash an empty token");
  }
  const salt = randomBytes(ARGON2_PARAMS.saltLength);

  const hash = await argon2id({
    password: token,
    salt,
    iterations: ARGON2_PARAMS.timeCost,
    parallelism: ARGON2_PARAMS.parallelism,
    memorySize: ARGON2_PARAMS.memoryCost,
    hashLength: ARGON2_PARAMS.hashLength,
    outputType: "encoded",
  });

  return hash;
}

/**
 * Verify a token against an Argon2id encoded hash.
 *
 * Uses hash-wasm's built-in verification which extracts the parameters
 * and salt from the encoded hash string, re-hashes the token, and
 * performs a constant-time comparison internally at the WASM level.
 *
 * Note: Timing-safe comparison is delegated to hash-wasm's WASM
 * implementation. The `timingSafeEqual` utility exported by this
 * package is available for direct string comparisons outside of
 * Argon2 verification.
 *
 * @param token - The plaintext token to verify
 * @param hash - The encoded Argon2id hash string to verify against
 * @returns `true` if the token matches the hash, `false` otherwise
 *
 * @example
 * ```ts
 * const hash = await hashToken("mySecretToken");
 * const isValid = await verifyToken("mySecretToken", hash); // true
 * const isInvalid = await verifyToken("wrongToken", hash);  // false
 * ```
 */
export async function verifyToken(
  token: string,
  hash: string,
): Promise<boolean> {
  if (hash.length === 0) {
    return false;
  }

  try {
    return await argon2Verify({ password: token, hash });
  } catch {
    // Invalid or corrupted hash format — verification fails.
    // Unexpected system errors (OOM, WASM failure) are also caught here
    // since they should not propagate as verification success.
    return false;
  }
}
