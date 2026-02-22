// @focus-shield/crypto
// Token generation, Argon2 hashing, timing-safe verification, rate limiting,
// master key management, cooldown, anti-paste, delayed unlock, task unlock, override logging

// Token generator
export { generateToken, TOKEN_CONFIG } from "./token-generator";
export type { TokenLevelConfig } from "./token-generator";

// Argon2id hasher
export { hashToken, verifyToken } from "./hasher";

// Timing-safe comparison
export { timingSafeEqual } from "./verifier";

// Rate limiter
export { RateLimiter } from "./rate-limiter";
export type { RateLimiterConfig, AttemptResult } from "./rate-limiter";

// Master key management (AES-256-GCM encryption)
export {
  generateMasterKey,
  encryptMasterKey,
  decryptMasterKey,
  verifyMasterKey,
} from "./master-key";
export type { EncryptedMasterKey } from "./master-key";

// Cooldown manager (lock levels 3-4)
export { CooldownManager } from "./cooldown";
export type { CooldownState } from "./cooldown";

// Anti-paste validator (paste/injection detection)
export { AntiPasteValidator } from "./anti-paste";
export type { InputEvent, ValidationResult } from "./anti-paste";

// Time-delayed unlock (10-minute delay)
export { DelayedUnlockManager } from "./delayed-unlock";
export type { DelayedUnlockRequest } from "./delayed-unlock";

// Task-based unlock (math/typing challenges)
export { generateMathTask, generateTypingTask, verifyTaskAnswer } from "./task-unlock";
export type { TaskType, TaskDifficulty, UnlockTask } from "./task-unlock";

// Override logger (unlock attempt tracking)
export { OverrideLogger } from "./override-logger";
export type { OverrideMethod, OverrideLogEntry } from "./override-logger";
