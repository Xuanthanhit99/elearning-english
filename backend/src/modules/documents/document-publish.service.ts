import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertDocumentTransition,
  assertVersionTransition,
} from './state/document-status.state-machine';
import { DocumentNotificationsService } from './notifications/document-notifications.service';
import { NotificationEventType } from '../notifications/contracts/notification-event-type';
import { DocumentProgressGateway } from './realtime/document-progress.gateway';

/**
 * The ONLY place that flips LearningDocument.activeVersionId. Spec §18
 * ("atomic publish"): the previous active version is archived and the
 * new one becomes active inside a single Prisma transaction, so a reader
 * never observes a document with either zero or two active versions.
 * Both AdminDocumentsService.approve() and the community auto-publish
 * path in the processing pipeline call this instead of writing status
 * fields directly.
 */
@Injectable()
export class DocumentPublishService {
  private readonly logger = new Logger(DocumentPublishService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: DocumentNotificationsService,
    private readonly gateway: DocumentProgressGateway,
  ) {}

  async publishVersion(input: {
    documentId: string;
    versionId: string;
    approvedById?: string | null;
  }) {
    const { documentId, versionId } = input;

    const result = await this.prisma.$transaction(async (tx) => {
      const document = await tx.learningDocument.findUniqueOrThrow({
        where: { id: documentId },
      });
      const version = await tx.learningDocumentVersion.findUniqueOrThrow({
        where: { id: versionId },
      });

      if (version.documentId !== documentId) {
        throw new Error('Version does not belong to document.');
      }

      assertVersionTransition(version.status, 'APPROVED');
      assertVersionTransition('APPROVED', 'PUBLISHED');
      assertDocumentTransition(document.status, 'PUBLISHED');

      const previousActiveVersionId = document.activeVersionId;

      if (previousActiveVersionId && previousActiveVersionId !== versionId) {
        assertVersionTransition('PUBLISHED', 'ARCHIVED');
        await tx.learningDocumentVersion.update({
          where: { id: previousActiveVersionId },
          data: { status: 'ARCHIVED' },
        });
      }

      await tx.learningDocumentVersion.update({
        where: { id: versionId },
        data: {
          status: 'PUBLISHED',
          approvedById: input.approvedById,
          approvedAt: new Date(),
          publishedAt: new Date(),
        },
      });

      const updatedDocument = await tx.learningDocument.update({
        where: { id: documentId },
        data: {
          status: 'PUBLISHED',
          activeVersionId: versionId,
          publishedAt: document.publishedAt ?? new Date(),
        },
      });

      await tx.documentModerationHistory.create({
        data: {
          documentId,
          action: 'PUBLISH',
          fromStatus: document.status,
          toStatus: 'PUBLISHED',
          actorId: input.approvedById,
          isSystemActor: !input.approvedById,
        },
      });

      return updatedDocument;
    });

    if (result.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_PUBLISHED,
        recipientUserIds: [result.authorId],
        documentId,
        versionId,
        actorUserId: input.approvedById,
        metadata: {
          slug: result.slug,
          message: 'Tài liệu của bạn đã xuất bản trên Thư viện tài liệu.',
        },
      });
    }
    this.gateway.emitPublished(documentId, { versionId, slug: result.slug });

    return result;
  }
}
