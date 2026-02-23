import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";
import { SyncModule } from "./sync/sync.module";
import { AuthModule } from "./auth/auth.module";
import { BuddyModule } from "./buddy/buddy.module";
import { ChallengeModule } from "./challenge/challenge.module";
import { CoworkingModule } from "./coworking/coworking.module";
import { User } from "./users/user.entity";
import { SyncSession } from "./sync/sync-session.entity";
import { SyncStats } from "./sync/sync-stats.entity";
import { SyncConfig } from "./sync/sync-config.entity";
import { Buddy } from "./buddy/buddy.entity";
import { BuddyNotification } from "./buddy/buddy-notification.entity";
import { Challenge } from "./challenge/challenge.entity";
import { ChallengeParticipant } from "./challenge/challenge-participant.entity";
import { CoworkingRoom } from "./coworking/coworking-room.entity";
import { CoworkingMember } from "./coworking/coworking-member.entity";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env["DB_HOST"] ?? "localhost",
      port: parseInt(process.env["DB_PORT"] ?? "5432", 10),
      username: process.env["DB_USERNAME"] ?? "focus",
      password: process.env["DB_PASSWORD"] ?? "focus",
      database: process.env["DB_NAME"] ?? "focus_shield",
      entities: [
        User,
        SyncSession,
        SyncStats,
        SyncConfig,
        Buddy,
        BuddyNotification,
        Challenge,
        ChallengeParticipant,
        CoworkingRoom,
        CoworkingMember,
      ],
      synchronize: process.env["NODE_ENV"] !== "production",
      logging: process.env["NODE_ENV"] === "development",
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    SyncModule,
    BuddyModule,
    ChallengeModule,
    CoworkingModule,
  ],
})
export class AppModule {}
