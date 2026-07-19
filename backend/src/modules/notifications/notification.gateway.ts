import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  NotificationCookieAuthService,
  NotificationSocketUser,
} from './notification-cookie-auth.service';
import { getAllowedOrigins } from '../../config/cors.config';

type AuthenticatedNotificationSocket = Socket & {
  data: {
    user?: NotificationSocketUser;
  };
};

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: NotificationCookieAuthService) {}

  handleConnection(client: AuthenticatedNotificationSocket) {
    try {
      const user = this.auth.authenticate(client);
      client.data.user = user;
      client.join(this.userRoom(user.id));
      client.emit('notification:connected', { ok: true });
    } catch {
      client.emit('notification:unauthorized', {
        message: 'Invalid notification session.',
      });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('notification:ping')
  ping(@ConnectedSocket() client: AuthenticatedNotificationSocket) {
    return { ok: Boolean(client.data.user) };
  }

  emitCreated(userId: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('notification:created', payload);
  }

  emitUpdated(userId: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('notification:updated', payload);
  }

  emitArchived(userId: string, payload: unknown) {
    this.server
      .to(this.userRoom(userId))
      .emit('notification:archived', payload);
  }

  emitUnreadCount(userId: string, unreadCount: number) {
    this.server
      .to(this.userRoom(userId))
      .emit('notification:unread-count', { unreadCount });
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
