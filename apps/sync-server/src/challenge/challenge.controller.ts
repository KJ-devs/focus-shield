import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { IsString, IsNotEmpty, IsInt, Min } from "class-validator";
import { ChallengeService } from "./challenge.service";
import {
  type ApiResponse,
  createSuccessResponse,
  createErrorResponse,
} from "../common/api-response";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { User } from "../users/user.entity";
import type { Challenge } from "./challenge.entity";
import type { ChallengeParticipant } from "./challenge-participant.entity";
import type { LeaderboardEntry, WeeklyReport } from "./challenge.service";

class CreateChallengeBody {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

class UpdateStatsBody {
  @IsInt()
  @Min(0)
  focusMinutes!: number;

  @IsInt()
  @Min(0)
  sessionsCompleted!: number;
}

@Controller("challenges")
@UseGuards(AuthGuard)
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Post()
  async createChallenge(
    @CurrentUser() user: User,
    @Body() body: CreateChallengeBody,
  ): Promise<ApiResponse<Challenge>> {
    try {
      const challenge = await this.challengeService.createChallenge(
        user.id,
        body.title,
      );
      return createSuccessResponse(challenge);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create challenge";
      return createErrorResponse(message);
    }
  }

  @Post(":id/join")
  async joinChallenge(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<ApiResponse<ChallengeParticipant>> {
    try {
      const participant = await this.challengeService.joinChallenge(
        user.id,
        id,
      );
      return createSuccessResponse(participant);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to join challenge";
      return createErrorResponse(message);
    }
  }

  @Get(":id/leaderboard")
  async getLeaderboard(
    @Param("id") id: string,
  ): Promise<ApiResponse<LeaderboardEntry[]>> {
    try {
      const leaderboard = await this.challengeService.getLeaderboard(id);
      return createSuccessResponse(leaderboard);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to get leaderboard";
      return createErrorResponse(message);
    }
  }

  @Get("active")
  async getActiveChallenges(
    @CurrentUser() user: User,
  ): Promise<ApiResponse<Challenge[]>> {
    const challenges = await this.challengeService.getActiveChallenges(user.id);
    return createSuccessResponse(challenges);
  }

  @Put(":id/stats")
  async updateStats(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() body: UpdateStatsBody,
  ): Promise<ApiResponse<ChallengeParticipant>> {
    try {
      const participant = await this.challengeService.updateParticipantStats(
        user.id,
        id,
        body.focusMinutes,
        body.sessionsCompleted,
      );
      return createSuccessResponse(participant);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update stats";
      return createErrorResponse(message);
    }
  }

  @Get("weekly-report")
  async getWeeklyReport(
    @CurrentUser() user: User,
  ): Promise<ApiResponse<WeeklyReport[]>> {
    const reports = await this.challengeService.getWeeklyReport(user.id);
    return createSuccessResponse(reports);
  }
}
