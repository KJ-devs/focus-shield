import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual } from "typeorm";
import { SyncSession } from "./sync-session.entity";
import { SyncStats } from "./sync-stats.entity";
import { SyncConfig } from "./sync-config.entity";

export interface PushSessionDto {
  userId: string;
  clientSessionId: string;
  name: string;
  blocks: Record<string, unknown>[];
  lockLevel: number;
  completedAt: string | null;
  totalFocusMinutes: number;
  focusScore: number | null;
}

export interface PushStatsDto {
  userId: string;
  date: string;
  totalFocusMinutes: number;
  sessionsCompleted: number;
  distractionAttempts: number;
  averageFocusScore: number;
  syncedAt?: string;
}

export interface PushConfigDto {
  userId: string;
  configData: Record<string, unknown>;
}

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SyncSession)
    private readonly sessionRepository: Repository<SyncSession>,
    @InjectRepository(SyncStats)
    private readonly statsRepository: Repository<SyncStats>,
    @InjectRepository(SyncConfig)
    private readonly configRepository: Repository<SyncConfig>,
  ) {}

  async pushSessions(sessions: PushSessionDto[]): Promise<SyncSession[]> {
    const entities = sessions.map((dto) => {
      return this.sessionRepository.create({
        userId: dto.userId,
        clientSessionId: dto.clientSessionId,
        name: dto.name,
        blocks: dto.blocks,
        lockLevel: dto.lockLevel,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        totalFocusMinutes: dto.totalFocusMinutes,
        focusScore: dto.focusScore,
      });
    });

    return this.sessionRepository.save(entities);
  }

  async pullSessions(userId: string, since?: string): Promise<SyncSession[]> {
    const where: Record<string, unknown> = { userId };

    if (since) {
      where["syncedAt"] = MoreThanOrEqual(new Date(since));
    }

    return this.sessionRepository.find({
      where,
      order: { syncedAt: "ASC" },
    });
  }

  async pushStats(stats: PushStatsDto[]): Promise<SyncStats[]> {
    const results: SyncStats[] = [];

    for (const dto of stats) {
      const existing = await this.statsRepository.findOne({
        where: { userId: dto.userId, date: dto.date },
      });

      if (existing) {
        if (dto.syncedAt) {
          const incomingDate = new Date(dto.syncedAt);
          if (incomingDate <= existing.syncedAt) {
            results.push(existing);
            continue;
          }
        }

        existing.totalFocusMinutes = dto.totalFocusMinutes;
        existing.sessionsCompleted = dto.sessionsCompleted;
        existing.distractionAttempts = dto.distractionAttempts;
        existing.averageFocusScore = dto.averageFocusScore;
        results.push(await this.statsRepository.save(existing));
      } else {
        const entity = this.statsRepository.create({
          userId: dto.userId,
          date: dto.date,
          totalFocusMinutes: dto.totalFocusMinutes,
          sessionsCompleted: dto.sessionsCompleted,
          distractionAttempts: dto.distractionAttempts,
          averageFocusScore: dto.averageFocusScore,
        });
        results.push(await this.statsRepository.save(entity));
      }
    }

    return results;
  }

  async pullStats(userId: string, since?: string): Promise<SyncStats[]> {
    const where: Record<string, unknown> = { userId };

    if (since) {
      where["syncedAt"] = MoreThanOrEqual(new Date(since));
    }

    return this.statsRepository.find({
      where,
      order: { date: "ASC" },
    });
  }

  async pushConfig(
    userId: string,
    configData: Record<string, unknown>,
  ): Promise<SyncConfig> {
    const existing = await this.configRepository.findOne({
      where: { userId },
    });

    if (existing) {
      existing.configData = configData;
      return this.configRepository.save(existing);
    }

    const entity = this.configRepository.create({
      userId,
      configData,
    });
    return this.configRepository.save(entity);
  }

  async pullConfig(userId: string): Promise<SyncConfig | null> {
    return this.configRepository.findOne({
      where: { userId },
    });
  }
}
