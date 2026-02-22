import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SyncService } from "./sync.service";
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse,
} from "../common/api-response";
import { SyncSession } from "./sync-session.entity";
import { SyncStats } from "./sync-stats.entity";

class PushSessionBody {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  clientSessionId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  blocks!: Record<string, unknown>[];

  @IsNumber()
  lockLevel!: number;

  @IsOptional()
  @IsString()
  completedAt!: string | null;

  @IsNumber()
  totalFocusMinutes!: number;

  @IsOptional()
  @IsNumber()
  focusScore!: number | null;
}

class PushSessionsBody {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushSessionBody)
  sessions!: PushSessionBody[];
}

class PushStatsItemBody {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  date!: string;

  @IsNumber()
  totalFocusMinutes!: number;

  @IsNumber()
  sessionsCompleted!: number;

  @IsNumber()
  distractionAttempts!: number;

  @IsNumber()
  averageFocusScore!: number;
}

class PushStatsBody {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushStatsItemBody)
  stats!: PushStatsItemBody[];
}

@Controller("sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("sessions")
  async pushSessions(
    @Body() body: PushSessionsBody,
  ): Promise<ApiResponse<SyncSession[]>> {
    try {
      const sessions = await this.syncService.pushSessions(body.sessions);
      return createSuccessResponse(sessions);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to push sessions";
      return createErrorResponse(message);
    }
  }

  @Get("sessions")
  async pullSessions(
    @Query("userId") userId: string,
    @Query("since") since?: string,
  ): Promise<ApiResponse<SyncSession[]>> {
    if (!userId) {
      return createErrorResponse("userId query parameter is required");
    }

    const sessions = await this.syncService.pullSessions(userId, since);
    return createSuccessResponse(sessions);
  }

  @Post("stats")
  async pushStats(
    @Body() body: PushStatsBody,
  ): Promise<ApiResponse<SyncStats[]>> {
    try {
      const stats = await this.syncService.pushStats(body.stats);
      return createSuccessResponse(stats);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to push stats";
      return createErrorResponse(message);
    }
  }

  @Get("stats")
  async pullStats(
    @Query("userId") userId: string,
    @Query("since") since?: string,
  ): Promise<ApiResponse<SyncStats[]>> {
    if (!userId) {
      return createErrorResponse("userId query parameter is required");
    }

    const stats = await this.syncService.pullStats(userId, since);
    return createSuccessResponse(stats);
  }
}
