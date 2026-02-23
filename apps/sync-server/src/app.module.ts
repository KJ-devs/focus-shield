import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";
import { SyncModule } from "./sync/sync.module";
import { AuthModule } from "./auth/auth.module";
import { BuddyModule } from "./buddy/buddy.module";
import { User } from "./users/user.entity";
import { SyncSession } from "./sync/sync-session.entity";
import { SyncStats } from "./sync/sync-stats.entity";
import { SyncConfig } from "./sync/sync-config.entity";
import { Buddy } from "./buddy/buddy.entity";
import { BuddyNotification } from "./buddy/buddy-notification.entity";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env["DB_HOST"] ?? "localhost",
      port: parseInt(process.env["DB_PORT"] ?? "5432", 10),
      username: process.env["DB_USERNAME"] ?? "focus",
      password: process.env["DB_PASSWORD"] ?? "focus",
      database: process.env["DB_NAME"] ?? "focus_shield",
      entities: [User, SyncSession, SyncStats, SyncConfig, Buddy, BuddyNotification],
      synchronize: process.env["NODE_ENV"] !== "production",
      logging: process.env["NODE_ENV"] === "development",
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    SyncModule,
    BuddyModule,
  ],
})
export class AppModule {}
