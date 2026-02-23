import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SyncSession } from "./sync-session.entity";
import { SyncStats } from "./sync-stats.entity";
import { SyncConfig } from "./sync-config.entity";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { SyncGateway } from "./sync.gateway";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncSession, SyncStats, SyncConfig]),
    AuthModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncGateway],
  exports: [SyncService, SyncGateway],
})
export class SyncModule {}
