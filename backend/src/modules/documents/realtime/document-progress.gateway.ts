import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getAllowedOrigins } from '../../../config/cors.config';
import {
  NotificationCookieAuthService,
  NotificationSocketUser,
} from '../../notifications/notification-cookie-auth.service';
import { AuthSessionService } from '../../auth/auth-session.service';

// `Omit<Socket, 'data'>` (not a plain `&`) is required here — Socket.io's
// `Socket.data` is typed `any`, and intersecting `any` with a stricter
// type collapses back to `any`, which would make `client.data.user`
// resolve as unsafe/untyped access.
type AuthenticatedDocumentSocket = Omit<Socket, 'data'> & {
  data: { user?: NotificationSocketUser };
};

export interface DocumentProgressPayload {
  documentId: string;
  versionId: string | null;
  status: string;
  progress: number;
  currentStep: string | null;
}

/**
 * Realtime processing/generation progress for the Document Library —
 * mirrors NotificationGateway's cookie-auth + per-user-room pattern.
 * Progress is pushed to a document-scoped room so /my-documents (owner)
 * and /admin/documents/moderation (any admin) can both subscribe without
 * a private per-user channel.
 */
@WebSocketGateway({
  namespace: '/documents',
  cors: { origin: getAllowedOrigins(), credentials: true },
})
export class DocumentProgressGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: NotificationCookieAuthService,
    private readonly authSession: AuthSessionService,
  ) {}

  async handleConnection(client: AuthenticatedDocumentSocket) {
    try {
      const user = this.auth.authenticate(client);
      if (await this.authSession.isBanned(user.id)) {
        client.emit('document:unauthorized', { message: 'Invalid session.' });
        client.disconnect(true);
        return;
      }
      client.data.user = user;
      client.emit('document:connected', { ok: true });
    } catch {
      client.emit('document:unauthorized', { message: 'Invalid session.' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('document:subscribe')
  async subscribe(
    @ConnectedSocket() client: AuthenticatedDocumentSocket,
    @MessageBody() body: { documentId?: string },
  ) {
    if (!client.data.user || !body?.documentId) return { ok: false };
    // join/leave return a Promise under the Redis adapter (cross-instance
    // room membership needs an async publish) — must be awaited.
    await client.join(this.documentRoom(body.documentId));
    return { ok: true };
  }

  @SubscribeMessage('document:unsubscribe')
  async unsubscribe(
    @ConnectedSocket() client: AuthenticatedDocumentSocket,
    @MessageBody() body: { documentId?: string },
  ) {
    if (body?.documentId) await client.leave(this.documentRoom(body.documentId));
    return { ok: true };
  }

  emitProgress(payload: DocumentProgressPayload) {
    this.server
      .to(this.documentRoom(payload.documentId))
      .emit('document.processing.progress', payload);
  }

  emitFailed(
    documentId: string,
    payload: { versionId: string | null; message: string },
  ) {
    this.server
      .to(this.documentRoom(documentId))
      .emit('document.processing.failed', { documentId, ...payload });
  }

  emitPublished(
    documentId: string,
    payload: { versionId: string; slug: string },
  ) {
    this.server
      .to(this.documentRoom(documentId))
      .emit('document.published', { documentId, ...payload });
  }

  emitModerationUpdated(documentId: string, payload: Record<string, unknown>) {
    this.server
      .to(this.documentRoom(documentId))
      .emit('document.moderation.updated', { documentId, ...payload });
  }

  private documentRoom(documentId: string) {
    return `document:${documentId}`;
  }
}
