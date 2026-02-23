import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
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
import { SyncConfig } from "./sync-config.entity";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { User } from "../users/user.entity";

class PushSessionBody {
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
  date!: string;

  @IsNumber()
  totalFocusMinutes!: number;

  @IsNumber()
  sessionsCompleted!: number;

  @IsNumber()
  distractionAttempts!: number;

  @IsNumber()
  averageFocusScore!: number;

  @IsOptional()
  @IsString()
  syncedAt?: string;
}

class PushStatsBody {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushStatsItemBody)
  stats!: PushStatsItemBody[];
}

class PushConfigBody {
  @IsObject()
  configData!: Record<string, unknown>;
}

@Controller("sync")
@UseGuards(AuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("sessions")
  async pushSessions(
    @CurrentUser() user: User,
    @Body() body: PushSessionsBody,
  ): Promise<ApiResponse<SyncSession[]>> {
    try {
      const sessionsWithUser = body.sessions.map((s) => ({
        ...s,
        userId: user.id,
      }));
      const sessions = await this.syncService.pushSessions(sessionsWithUser);
      return createSuccessResponse(sessions);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to push sessions";
      return createErrorResponse(message);
    }
  }

  @Get("sessions")
  async pullSessions(
    @CurrentUser() user: User,
    @Query("since") since?: string,
  ): Promise<ApiResponse<SyncSession[]>> {
    const sessions = await this.syncService.pullSessions(user.id, since);
    return createSuccessResponse(sessions);
  }

  @Post("stats")
  async pushStats(
    @CurrentUser() user: User,
    @Body() body: PushStatsBody,
  ): Promise<ApiResponse<SyncStats[]>> {
    try {
      const statsWithUser = body.stats.map((s) => ({
        ...s,
        userId: user.id,
      }));
      const stats = await this.syncService.pushStats(statsWithUser);
      return createSuccessResponse(stats);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to push stats";
      return createErrorResponse(message);
    }
  }

  @Get("stats")
  async pullStats(
    @CurrentUser() user: User,
    @Query("since") since?: string,
  ): Promise<ApiResponse<SyncStats[]>> {
    const stats = await this.syncService.pullStats(user.id, since);
    return createSuccessResponse(stats);
  }

  @Post("config")
  async pushConfig(
    @CurrentUser() user: User,
    @Body() body: PushConfigBody,
  ): Promise<ApiResponse<SyncConfig>> {
    try {
      const config = await this.syncService.pushConfig(
        user.id,
        body.configData,
      );
      return createSuccessResponse(config);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to push config";
      return createErrorResponse(message);
    }
  }

  @Get("config")
  async pullConfig(
    @CurrentUser() user: User,
  ): Promise<ApiResponse<SyncConfig | null>> {
    const config = await this.syncService.pullConfig(user.id);
    return createSuccessResponse(config);
  }
}
