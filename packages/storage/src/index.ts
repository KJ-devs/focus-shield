// @focus-shield/storage
// SQLite persistence layer, migrations, repositories

// Database adapter
export type { DatabaseAdapter, RunResult } from "./database";
export { BetterSqliteAdapter, createDatabase } from "./database";

// Migration system
export type { Migration } from "./migrations";
export { runMigrations, getCurrentVersion } from "./migrations";

// Schema
export { initialMigration, allMigrations } from "./schema";

// Repositories
export { SessionRepository } from "./repositories/session-repository";
export { SessionRunRepository } from "./repositories/session-run-repository";
export { BlocklistRepository } from "./repositories/blocklist-repository";
export { ProfileRepository } from "./repositories/profile-repository";
export { StatsRepository } from "./repositories/stats-repository";

// Storage facade
export { Storage } from "./storage";
