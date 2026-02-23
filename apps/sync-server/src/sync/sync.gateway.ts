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

  notifySessionSync(userId: string): void {
    this.server.to(`user:${userId}`).emit("session:updated");
  }

  notifyStatsSync(userId: string): void {
    this.server.to(`user:${userId}`).emit("stats:updated");
  }

  notifyConfigSync(userId: string): void {
    this.server.to(`user:${userId}`).emit("config:updated");
  }
}
