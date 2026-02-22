// @focus-shield/storage
// SQLite persistence layer, migrations, repositories

// Database adapter
export type { DatabaseAdapter, RunResult } from "./database";
export { BetterSqliteAdapter, createDatabase } from "./database";

// Migration system
export type { Migration } from "./migrations";
export { runMigrations, getCurrentVersion } from "./migrations";

// Schema
export { initialMigration, indexesMigration, allMigrations } from "./schema";

// Repositories
export { SessionRepository } from "./repositories/session-repository";
export { SessionRunRepository } from "./repositories/session-run-repository";
export { BlocklistRepository } from "./repositories/blocklist-repository";
export { ProfileRepository } from "./repositories/profile-repository";
export { StatsRepository } from "./repositories/stats-repository";

// Aggregator
export type { WeeklyStats, MonthlyStats, PeakHours } from "./aggregator";
export { StatsAggregator } from "./aggregator";

// Exporter
export type { ExportOptions } from "./exporter";
export { DataExporter } from "./exporter";

// Storage facade
export { Storage } from "./storage";
