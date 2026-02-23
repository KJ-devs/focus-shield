import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { IsString, IsNotEmpty, IsIn, IsInt, IsOptional, Min } from "class-validator";
import { CoworkingService } from "./coworking.service";
import {
  type ApiResponse,
  createSuccessResponse,
  createErrorResponse,
} from "../common/api-response";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { User } from "../users/user.entity";
import type { CoworkingRoom } from "./coworking-room.entity";
import type { CoworkingMember } from "./coworking-member.entity";
import type { RoomMemberDto } from "./coworking.service";

class CreateRoomBody {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

class JoinRoomBody {
  @IsString()
  @IsNotEmpty()
  inviteCode!: string;
}

class UpdateStatusBody {
  @IsString()
  @IsIn(["idle", "focusing", "break"])
  status!: "idle" | "focusing" | "break";

  @IsOptional()
  @IsInt()
  @Min(0)
  sessionMinutes?: number;
}

@Controller("coworking")
@UseGuards(AuthGuard)
export class CoworkingController {
  constructor(private readonly coworkingService: CoworkingService) {}

  @Post("rooms")
  async createRoom(
    @CurrentUser() user: User,
    @Body() body: CreateRoomBody,
  ): Promise<ApiResponse<CoworkingRoom>> {
    try {
      const room = await this.coworkingService.createRoom(user.id, body.name);
      return createSuccessResponse(room);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create room";
      return createErrorResponse(message);
    }
  }

  @Post("rooms/join")
  async joinRoom(
    @CurrentUser() user: User,
    @Body() body: JoinRoomBody,
  ): Promise<ApiResponse<CoworkingMember>> {
    try {
      const member = await this.coworkingService.joinRoom(
        user.id,
        body.inviteCode,
      );
      return createSuccessResponse(member);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to join room";
      return createErrorResponse(message);
    }
  }

  @Delete("rooms/:id/leave")
  async leaveRoom(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<ApiResponse<{ left: boolean }>> {
    try {
      await this.coworkingService.leaveRoom(user.id, id);
      return createSuccessResponse({ left: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to leave room";
      return createErrorResponse(message);
    }
  }

  @Put("rooms/:id/status")
  async updateStatus(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() body: UpdateStatusBody,
  ): Promise<ApiResponse<CoworkingMember>> {
    try {
      const member = await this.coworkingService.updateStatus(
        user.id,
        id,
        body.status,
        body.sessionMinutes,
      );
      return createSuccessResponse(member);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update status";
      return createErrorResponse(message);
    }
  }

  @Get("rooms/:id/members")
  async getRoomMembers(
    @Param("id") id: string,
  ): Promise<ApiResponse<RoomMemberDto[]>> {
    try {
      const members = await this.coworkingService.getRoomMembers(id);
      return createSuccessResponse(members);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to get members";
      return createErrorResponse(message);
    }
  }

  @Get("rooms")
  async getMyRooms(
    @CurrentUser() user: User,
  ): Promise<ApiResponse<CoworkingRoom[]>> {
    const rooms = await this.coworkingService.getMyRooms(user.id);
    return createSuccessResponse(rooms);
  }

  @Post("rooms/:id/sync-start")
  async startSyncSession(
    @CurrentUser() user: User,
    @Param("id") id: string,
  ): Promise<ApiResponse<CoworkingMember[]>> {
    try {
      const members = await this.coworkingService.startSyncSession(
        id,
        user.id,
      );
      return createSuccessResponse(members);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to start sync session";
      return createErrorResponse(message);
    }
  }
}
