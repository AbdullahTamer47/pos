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
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '',
})
export class MainGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MainGateway.name);
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

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.id;
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

      this.logger.log(`Client connected: ${client.id} (user: ${userId}, tenant: ${tenantId})`);

      client.emit('connected', { userId, tenantId, socketId: client.id });
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

    client.leave(`branch:${(client as unknown as Record<string, unknown>).branchId || ''}`);
    client.leave(`dashboard:${tenantId}`);

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-branch')
  handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    if (data.branchId) {
      client.join(`branch:${data.branchId}`);
      (client as unknown as Record<string, unknown>).branchId = data.branchId;
      this.logger.log(`Socket ${client.id} joined branch room: ${data.branchId}`);
    }
    return { event: 'joined-branch', data: { branchId: data.branchId } };
  }

  @SubscribeMessage('join-dashboard')
  handleJoinDashboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    const tenantId = data.tenantId || (client as unknown as Record<string, unknown>).tenantId as string;
    if (tenantId) {
      client.join(`dashboard:${tenantId}`);
      this.logger.log(`Socket ${client.id} joined dashboard room: ${tenantId}`);
    }
    return { event: 'joined-dashboard', data: { tenantId } };
  }

  broadcastInventoryUpdate(
    tenantId: string,
    warehouseId: string,
    data: unknown,
  ) {
    this.server.to(`branch:${warehouseId}`).emit('inventory-update', {
      tenantId,
      warehouseId,
      data,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Inventory update broadcast to branch:${warehouseId}`);
  }

  broadcastNewOrder(tenantId: string, data: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('new-order', {
      tenantId,
      data,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`New order broadcast to tenant:${tenantId}`);
  }

  sendDashboardUpdate(tenantId: string, data: unknown) {
    this.server.to(`dashboard:${tenantId}`).emit('dashboard-update', {
      tenantId,
      data,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Dashboard update sent to dashboard:${tenantId}`);
  }

  broadcastNotification(userId: string, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`Notification sent to user:${userId}`);
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (authToken && typeof authToken === 'string') {
      return authToken;
    }

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
}