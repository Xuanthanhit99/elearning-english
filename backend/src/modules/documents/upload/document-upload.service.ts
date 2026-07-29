import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { DOCUMENT_STORAGE_SERVICE } from '../storage/document-storage.interface';
import type { DocumentStorageService } from '../storage/document-storage.interface';
import { DocumentStorageKeys } from '../storage/storage-key.util';
import { FileValidationService } from './file-validation.service';
import { CreateDocumentUploadDto } from '../dto/document-upload.dto';
import { generateUniqueSlug } from '../utils/slug.util';
import { DocumentsService } from '../documents.service';
import { DocumentProgressService } from '../realtime/document-progress.service';
import { DocumentNotificationsService } from '../notifications/document-notifications.service';
import { NotificationEventType } from '../../notifications/contracts/notification-event-type';
import {
  DEFAULT_JOB_OPTIONS,
  DOCUMENT_PROCESSING_QUEUE,
  DocumentJobId,
  CommunityDocumentJobName,
  COMMUNITY_PROGRESS,
} from '../documents.constants';
import {
  getDocumentUserDailyUploadLimit,
  getDocumentUserMaxActiveUploads,
} from '../../../config/document-storage.config';

import type { LearningDocumentStatus } from '@prisma/client';

const ACTIVE_STATUSES: LearningDocumentStatus[] = [
  'UPLOADING',
  'PROCESSING',
  'AI_REVIEWING',
  'PENDING_ADMIN_REVIEW',
  'CHANGES_REQUESTED',
];

@Injectable()
export class DocumentUploadService {
  private readonly logger = new Logger(DocumentUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_STORAGE_SERVICE)
    private readonly storage: DocumentStorageService,
    private readonly fileValidation: FileValidationService,
    private readonly documentsService: DocumentsService,
    private readonly progress: DocumentProgressService,
    private readonly notifications: DocumentNotificationsService,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE) private readonly queue: Queue,
  ) {}

  async uploadNew(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    dto: CreateDocumentUploadDto,
  ) {
    await this.assertUploadQuota(userId);
    const validated = await this.fileValidation.validate({
      buffer: file.buffer,
      originalName: file.originalname,
      declaredMimeType: file.mimetype,
    });

    const slug = await generateUniqueSlug(dto.title, (candidate) =>
      this.documentsService.slugExists(candidate),
    );

    const { document, version } = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.learningDocument.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          source: 'COMMUNITY',
          creationType: 'USER_UPLOAD',
          status: 'UPLOADING',
          category: dto.category,
          level: dto.level,
          explanationLanguage: dto.explanationLanguage,
          skills: dto.skills ?? [],
          tags: dto.tags ?? [],
          hasAnswerKey: dto.hasAnswerKey ?? false,
          hasAudio: dto.hasAudio ?? false,
          allowDownload: dto.allowDownload ?? true,
          authorId: userId,
        },
      });
      const ver = await tx.learningDocumentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          status: 'PROCESSING',
          originalFileName: sanitizeOriginalName(file.originalname),
          mimeType: validated.mimeType,
          fileSize: validated.size,
          checksum: validated.checksum,
        },
      });
      return { document: doc, version: ver };
    });

    await this.persistAndEnqueue(
      document.id,
      version.id,
      version.versionNumber,
      file.buffer,
      validated.extension,
    );

    return {
      documentId: document.id,
      versionId: version.id,
      status: 'PROCESSING' as const,
    };
  }

  async createNewVersion(
    userId: string,
    documentId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    mode: 'resubmit' | 'revision',
  ) {
    const document = await this.prisma.learningDocument.findFirst({
      where: { id: documentId, authorId: userId },
      orderBy: undefined,
    });
    if (!document)
      throw new BadRequestException('Không tìm thấy tài liệu của bạn.');

    if (
      mode === 'resubmit' &&
      !['CHANGES_REQUESTED', 'REJECTED', 'FAILED'].includes(document.status)
    ) {
      throw new ForbiddenException(
        'Tài liệu hiện không ở trạng thái có thể gửi lại.',
      );
    }
    if (mode === 'revision' && document.status !== 'PUBLISHED') {
      throw new ForbiddenException(
        'Chỉ có thể tạo phiên bản mới cho tài liệu đã xuất bản.',
      );
    }

    await this.assertUploadQuota(userId);
    const validated = await this.fileValidation.validate({
      buffer: file.buffer,
      originalName: file.originalname,
      declaredMimeType: file.mimetype,
    });

    const version = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.learningDocumentVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

      const ver = await tx.learningDocumentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNumber,
          status: 'PROCESSING',
          originalFileName: sanitizeOriginalName(file.originalname),
          mimeType: validated.mimeType,
          fileSize: validated.size,
          checksum: validated.checksum,
        },
      });

      // Crucial for spec §18: a published document keeps serving its
      // current activeVersionId untouched while the new version
      // processes. Only a non-published document's top-level status
      // moves to PROCESSING.
      if (document.status !== 'PUBLISHED') {
        await tx.learningDocument.update({
          where: { id: documentId },
          data: { status: 'PROCESSING' },
        });
      }

      return ver;
    });

    await this.persistAndEnqueue(
      documentId,
      version.id,
      version.versionNumber,
      file.buffer,
      validated.extension,
    );

    return { documentId, versionId: version.id, status: 'PROCESSING' as const };
  }

  private async persistAndEnqueue(
    documentId: string,
    versionId: string,
    versionNumber: number,
    buffer: Buffer,
    extension: string,
  ) {
    const storageKey = DocumentStorageKeys.communitySource(
      documentId,
      versionNumber,
      extension,
    );
    const checksum = (
      await this.prisma.learningDocumentVersion.findUnique({
        where: { id: versionId },
        select: { checksum: true },
      })
    )?.checksum as string;

    await this.storage.uploadPrivateFile({
      storageKey,
      body: buffer,
      contentType: extensionToMime(extension),
      checksum,
    });

    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: { storageKey, sourceStorageKey: storageKey },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'UPLOAD_RECEIVED',
      status: 'PROCESSING',
      progress: COMMUNITY_PROGRESS.UPLOAD,
      message: 'Đã nhận tài liệu, chuẩn bị kiểm tra file',
    });

    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
      select: { authorId: true },
    });
    if (document?.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_UPLOAD_RECEIVED,
        recipientUserIds: [document.authorId],
        documentId,
        versionId,
        metadata: { message: 'Tài liệu của bạn đang được xử lý.' },
      });
    }

    await this.queue.add(
      CommunityDocumentJobName.SCAN_FILE,
      { documentId, versionId },
      { ...DEFAULT_JOB_OPTIONS, jobId: DocumentJobId.scan(documentId) },
    );
  }

  private async assertUploadQuota(userId: string) {
    const dailyLimit = getDocumentUserDailyUploadLimit();
    const maxActive = getDocumentUserMaxActiveUploads();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [todayCount, activeCount] = await Promise.all([
      this.prisma.learningDocument.count({
        where: {
          authorId: userId,
          creationType: 'USER_UPLOAD',
          createdAt: { gte: startOfDay },
        },
      }),
      this.prisma.learningDocument.count({
        where: {
          authorId: userId,
          creationType: 'USER_UPLOAD',
          status: { in: ACTIVE_STATUSES },
        },
      }),
    ]);

    if (todayCount >= dailyLimit) {
      throw new ForbiddenException(
        `Bạn đã đạt giới hạn ${dailyLimit} lượt tải lên trong hôm nay.`,
      );
    }
    if (activeCount >= maxActive) {
      throw new ForbiddenException(
        `Bạn đang có ${activeCount} tài liệu đang chờ xử lý (giới hạn ${maxActive}). Vui lòng đợi hoàn tất trước khi tải thêm.`,
      );
    }
  }
}

function sanitizeOriginalName(name: string): string {
  const base = name.replace(/^.*[\\/]/, '').replace(/[\0<>:"|?*]/g, '');
  return base.slice(0, 200) || `document-${randomUUID()}`;
}

function extensionToMime(extension: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
  };
  return map[extension] ?? 'application/octet-stream';
}
