import { ResponseNotificationDto } from '@challenge/types';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from 'nestjs-pino';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: Logger
  ) { }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        throw new Error('Token não fornecido');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });

      const userId = payload.sub;

      if (!userId) {
        throw new Error('User ID inválido no token');
      }

      client.join(`user_${userId}`);

      client.data.user = payload;

      this.logger.log(`Client connected: ${client.id} -> User: ${userId}`);

    } catch (e: any) {
      this.logger.warn(`Connection rejected: ${client.id} -> ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyUser(userId: string, event: string, payload: ResponseNotificationDto) {
    this.server.to(`user_${userId}`).emit(event, payload);
  }
}