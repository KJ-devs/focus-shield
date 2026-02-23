import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

interface SubscribePayload {
  userId: string;
}

interface RoomSubscribePayload {
  roomId: string;
}

interface BuddyStatusPayload {
  userId: string;
  status: "focusing" | "on_break" | "idle";
  sessionName?: string;
  startedAt?: string;
}

interface BuddyNotificationPayload {
  buddyPairId: string;
  fromUserId: string;
  fromDisplayName: string;
  type: string;
  message: string;
}

interface CoworkingStatusPayload {
  roomId: string;
  userId: string;
  displayName: string;
  status: "idle" | "focusing" | "break";
  currentSessionMinutes: number | null;
}

interface CoworkingSyncStartPayload {
  roomId: string;
  startedAt: string;
  startedBy: string;
}

interface LeaderboardUpdatePayload {
  challengeId: string;
  leaderboard: {
    userId: string;
    displayName: string;
    totalFocusMinutes: number;
    sessionsCompleted: number;
    rank: number;
  }[];
}

@WebSocketGateway({ cors: true })
export class SyncGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage("subscribe")
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribePayload,
  ): void {
    void client.join(`user:${data.userId}`);
  }

  @SubscribeMessage("coworking:join-room")
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomSubscribePayload,
  ): void {
    void client.join(`room:${data.roomId}`);
  }

  @SubscribeMessage("coworking:leave-room")
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RoomSubscribePayload,
  ): void {
    void client.leave(`room:${data.roomId}`);
  }

  @SubscribeMessage("buddy:status")
  handleBuddyStatus(
    @MessageBody() data: BuddyStatusPayload,
  ): void {
    this.notifyBuddyStatus(data);
  }

  @SubscribeMessage("coworking:status-update")
  handleCoworkingStatusUpdate(
    @MessageBody() data: CoworkingStatusPayload,
  ): void {
    this.notifyCoworkingStatusUpdate(data);
  }

  notifySessionSync(userId: string): void {
    this.server.to(`user:${userId}`).emit("session:updated");
  }

  notifyStatsSync(userId: string): void {
    this.server.to(`user:${userId}`).emit("stats:updated");
  }

  notifyConfigSync(userId: string): void {
    this.server.to(`user:${userId}`).emit("config:updated");
  }

  notifyBuddyStatus(data: BuddyStatusPayload): void {
    this.server.emit("buddy:status", data);
  }

  notifyBuddyNotification(
    targetUserId: string,
    data: BuddyNotificationPayload,
  ): void {
    this.server.to(`user:${targetUserId}`).emit("buddy:notification", data);
  }

  notifyCoworkingStatusUpdate(data: CoworkingStatusPayload): void {
    this.server.to(`room:${data.roomId}`).emit("coworking:status-update", data);
  }

  notifyCoworkingSyncStart(data: CoworkingSyncStartPayload): void {
    this.server.to(`room:${data.roomId}`).emit("coworking:sync-start", data);
  }

  notifyLeaderboardUpdate(data: LeaderboardUpdatePayload): void {
    this.server.emit("challenge:leaderboard-update", data);
  }
}
