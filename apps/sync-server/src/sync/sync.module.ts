import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SyncSession } from "./sync-session.entity";
import { SyncStats } from "./sync-stats.entity";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SyncSession, SyncStats])],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
