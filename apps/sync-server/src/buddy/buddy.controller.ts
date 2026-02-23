import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsString, IsNotEmpty } from "class-validator";
import { BuddyService } from "./buddy.service";
import {
  type ApiResponse,
  createSuccessResponse,
  createErrorResponse,
} from "../common/api-response";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { User } from "../users/user.entity";
import type { Buddy } from "./buddy.entity";
import type { BuddyNotification } from "./buddy-notification.entity";
import type {
  BuddyWithUser,
  BuddyNotificationDto,
} from "./buddy.service";

class AcceptInviteBody {
  @IsString()
  @IsNotEmpty()
  inviteCode!: string;
}

class DeclineInviteBody {
  @IsString()
  @IsNotEmpty()
  inviteCode!: string;
}

class SendNotificationBody {
  @IsString()
  @IsNotEmpty()
  buddyPairId!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}

@Controller("buddy")
@UseGuards(AuthGuard)
export class BuddyController {
  constructor(private readonly buddyService: BuddyService) {}

  @Post("invite")
  async createInvite(
    @CurrentUser() user: User,
  ): Promise<ApiResponse<Buddy>> {
    try {
      const buddy = await this.buddyService.createInvite(user.id);
      return createSuccessResponse(buddy);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create invite";
      return createErrorResponse(message);
    }
  }

  @Post("accept")
  async acceptInvite(
    @CurrentUser() user: User,
    @Body() body: AcceptInviteBody,
  ): Promise<ApiResponse<Buddy>> {
    try {
      const buddy = await this.buddyService.acceptInvite(
        body.inviteCode,
        user.id,
      );
      return createSuccessResponse(buddy);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to accept invite";
      return createErrorResponse(message);
    }
  }

  @Post("decline")
  async declineInvite(
    @CurrentUser() user: User,
    @Body() body: DeclineInviteBody,
  ): Promise<ApiResponse<Buddy>> {
    try {
      const buddy = await this.buddyService.declineInvite(
        body.inviteCode,
        user.id,
      );
      return createSuccessResponse(buddy);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to decline invite";
      return createErrorResponse(message);
    }
  }

  @Get("list")
  async listBuddies(
    @CurrentUser() user: User,
  ): Promise<ApiResponse<BuddyWithUser[]>> {
    const buddies = await this.buddyService.getBuddies(user.id);
    return createSuccessResponse(buddies);
  }

  @Delete(":id")
  async removeBuddy(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<ApiResponse<{ removed: boolean }>> {
    try {
      await this.buddyService.removeBuddy(id, user.id);
      return createSuccessResponse({ removed: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to remove buddy";
      return createErrorResponse(message);
    }
  }

  @Get("notifications")
  async getNotifications(
    @CurrentUser() user: User,
    @Query("unreadOnly") unreadOnly?: string,
  ): Promise<ApiResponse<BuddyNotificationDto[]>> {
    const onlyUnread = unreadOnly === "true";
    const notifications = await this.buddyService.getNotifications(
      user.id,
      onlyUnread,
    );
    return createSuccessResponse(notifications);
  }

  @Patch("notifications/:id/read")
  async markNotificationRead(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<ApiResponse<BuddyNotification>> {
    try {
      const notification = await this.buddyService.markNotificationRead(
        id,
        user.id,
      );
      return createSuccessResponse(notification);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mark notification as read";
      return createErrorResponse(message);
    }
  }

  @Post("notify")
  async sendNotification(
    @CurrentUser() user: User,
    @Body() body: SendNotificationBody,
  ): Promise<ApiResponse<BuddyNotification>> {
    try {
      const notification = await this.buddyService.sendNotification(
        body.buddyPairId,
        user.id,
        body.type as "override_used" | "streak_broken" | "session_completed" | "achievement_unlocked",
        body.message,
      );
      return createSuccessResponse(notification);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send notification";
      return createErrorResponse(message);
    }
  }
}
