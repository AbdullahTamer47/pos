import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected: no token for socket ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.verifyToken(token);
      const userId = (payload.sub || payload.id) as string;
      const tenantId = payload.tenantId;

      if (!userId) {
        this.logger.warn(`Connection rejected: no user id in token for socket ${client.id}`);
        client.disconnect();
        return;
      }

      (client as unknown as Record<string, unknown>).userId = userId;
      (client as unknown as Record<string, unknown>).tenantId = tenantId;

      client.join(`user:${userId}`);
      if (tenantId) {
        client.join(`tenant:${tenantId}`);
      }

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = (client as unknown as Record<string, unknown>).userId as string;
    const tenantId = (client as unknown as Record<string, unknown>).tenantId as string;

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      client.leave(`user:${userId}`);
    }

    if (tenantId) {
      client.leave(`tenant:${tenantId}`);
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-tenant')
  handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    if (data.tenantId) {
      client.join(`tenant:${data.tenantId}`);
      (client as unknown as Record<string, unknown>).tenantId = data.tenantId;
      this.logger.log(`Socket ${client.id} joined tenant room: ${data.tenantId}`);
    }
    return { event: 'joined-tenant', data: { tenantId: data.tenantId } };
  }

  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.log(`Emitted '${event}' to user:${userId}`);
  }

  sendToTenant(tenantId: string, event: string, data: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
    this.logger.log(`Emitted '${event}' to tenant:${tenantId}`);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const queryToken = client.handshake.query.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  private verifyToken(token: string): Record<string, unknown> {
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'super-secret-jwt-key';
    const decoded = this.jwtService.verify(token, { secret });
    return decoded as Record<string, unknown>;
  }
}