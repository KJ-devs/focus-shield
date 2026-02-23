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

  @SubscribeMessage("buddy:status")
  handleBuddyStatus(
    @MessageBody() data: BuddyStatusPayload,
  ): void {
    this.notifyBuddyStatus(data);
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
}
