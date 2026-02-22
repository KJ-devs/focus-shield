import { type DatabaseAdapter, createDatabase } from "./database";
import { runMigrations } from "./migrations";
import { allMigrations } from "./schema";
import { SessionRepository } from "./repositories/session-repository";
import { SessionRunRepository } from "./repositories/session-run-repository";
import { BlocklistRepository } from "./repositories/blocklist-repository";
import { ProfileRepository } from "./repositories/profile-repository";
import { StatsRepository } from "./repositories/stats-repository";

/**
 * Main entry point for the storage layer.
 * Creates the database, runs migrations, and exposes all repositories.
 */
export class Storage {
  readonly sessions: SessionRepository;
  readonly sessionRuns: SessionRunRepository;
  readonly blocklists: BlocklistRepository;
  readonly profiles: ProfileRepository;
  readonly stats: StatsRepository;

  private db: DatabaseAdapter;

  /**
   * Create a new Storage instance.
   * @param dbPath - Path to the SQLite database file. If omitted, uses an in-memory database.
   */
  constructor(dbPath?: string) {
    this.db = createDatabase(dbPath);
    runMigrations(this.db, allMigrations);

    this.sessions = new SessionRepository(this.db);
    this.sessionRuns = new SessionRunRepository(this.db);
    this.blocklists = new BlocklistRepository(this.db);
    this.profiles = new ProfileRepository(this.db);
    this.stats = new StatsRepository(this.db);
  }

  /** Close the underlying database connection. */
  close(): void {
    this.db.close();
  }
}
