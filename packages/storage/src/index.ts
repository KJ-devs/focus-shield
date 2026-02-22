// @focus-shield/storage
// SQLite persistence layer, migrations, repositories

// Database adapter
export type { DatabaseAdapter, RunResult } from "./database";
export { BetterSqliteAdapter, createDatabase } from "./database";

// Migration system
export type { Migration } from "./migrations";
export { runMigrations, getCurrentVersion } from "./migrations";

// Schema
export {
  initialMigration,
  indexesMigration,
  gamificationMigration,
  allMigrations,
} from "./schema";

// Repositories
export { SessionRepository } from "./repositories/session-repository";
export { SessionRunRepository } from "./repositories/session-run-repository";
export { BlocklistRepository } from "./repositories/blocklist-repository";
export { ProfileRepository } from "./repositories/profile-repository";
export { StatsRepository } from "./repositories/stats-repository";
export { GamificationRepository } from "./repositories/gamification-repository";
export type { GamificationProgress } from "./repositories/gamification-repository";

// Aggregator
export type { WeeklyStats, MonthlyStats, PeakHours } from "./aggregator";
export { StatsAggregator } from "./aggregator";

// Exporter
export type { ExportOptions } from "./exporter";
export { DataExporter } from "./exporter";

// Gamification — XP system
export {
  calculateSessionXP,
  getLevelInfo,
  getXPThreshold,
} from "./gamification/xp-system";
export type { XPGain, LevelInfo } from "./gamification/xp-system";

// Gamification — achievements
export {
  checkAchievementProgress,
  isAchievementConditionMet,
  getNewlyUnlockedAchievements,
  ACHIEVEMENT_CATALOG,
} from "./gamification/achievements";
export type {
  AchievementCondition,
  AchievementDefinition,
  AchievementProgress,
  UserGameStats,
} from "./gamification/achievements";

// Gamification — streaks
export { StreakCalculator } from "./gamification/streaks";
export type { StreakInfo } from "./gamification/streaks";

// Storage facade
export { Storage } from "./storage";
