import {
  timingSafeEqual as nodeTimingSafeEqual,
  createHash,
} from "node:crypto";

/**
 * Perform a timing-safe comparison of two strings.
 *
 * Uses Node.js `crypto.timingSafeEqual` to prevent timing attacks during
 * token verification. Since `timingSafeEqual` requires buffers of equal
 * length, both strings are first hashed with SHA-256 to produce
 * fixed-length digests before comparison.
 *
 * This approach handles:
 * - Strings of different lengths (the hash normalizes length)
 * - Constant-time comparison regardless of where strings differ
 * - No information leakage about which characters match
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns `true` if the strings are equal, `false` otherwise
 */
export function timingSafeEqual(a: string, b: string): boolean {
  // Hash both strings to SHA-256 to ensure equal buffer lengths.
  // This prevents length-based timing leaks and handles arbitrary
  // string lengths uniformly.
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();

  return nodeTimingSafeEqual(hashA, hashB);
}
