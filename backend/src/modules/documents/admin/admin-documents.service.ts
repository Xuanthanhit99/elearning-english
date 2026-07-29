import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { DocumentPublishService } from '../document-publish.service';
import { DocumentAccessPolicyService } from '../document-access-policy.service';
import { DocumentNotificationsService } from '../notifications/document-notifications.service';
import { NotificationEventType } from '../../notifications/contracts/notification-event-type';
import {
  assertDocumentTransition,
  assertVersionTransition,
} from '../state/document-status.state-machine';
import {
  AdminRejectDocumentDto,
  AdminRequestChangesDto,
  AdminResolveReportDto,
  AdminUpdateDocumentDto,
} from './admin-documents.dto';
import {
  CommunityDocumentJobName,
  DEFAULT_JOB_OPTIONS,
  DOCUMENT_PROCESSING_QUEUE,
  DocumentJobId,
} from '../documents.constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FileValidationService } from '../upload/file-validation.service';
import { DocumentsService } from '../documents.service';
import { generateUniqueSlug } from '../utils/slug.util';
import { DocumentStorageKeys } from '../storage/storage-key.util';
import { DOCUMENT_STORAGE_SERVICE } from '../storage/document-storage.interface';
import type { DocumentStorageService } from '../storage/document-storage.interface';
import { AdminCreateOfficialDocumentDto } from './admin-documents.dto';

@Injectable()
export class AdminDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly publishService: DocumentPublishService,
    private readonly accessPolicy: DocumentAccessPolicyService,
    private readonly notifications: DocumentNotificationsService,
    private readonly fileValidation: FileValidationService,
    private readonly documentsService: DocumentsService,
    @Inject(DOCUMENT_STORAGE_SERVICE)
    private readonly storage: DocumentStorageService,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE) private readonly queue: Queue,
  ) {}

  /** Admin/staff upload of an official BeaconVie document. Trusted
   * content — skips the community AI-moderation pipeline entirely, but
   * still runs through the same file-validation gate (magic bytes, size,
   * zip-bomb checks) as any other upload, and still requires an explicit
   * approve/publish action before it's servable. */
  async uploadOfficial(
    adminId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    dto: AdminCreateOfficialDocumentDto,
  ) {
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
          source: 'BEACONVIE',
          creationType: 'ADMIN_UPLOAD',
          status: 'PROCESSING',
          category: dto.category,
          level: dto.level,
          skills: dto.skills ?? [],
          hasAnswerKey: dto.hasAnswerKey ?? false,
          hasAudio: dto.hasAudio ?? false,
          allowDownload: dto.allowDownload ?? true,
          authorId: adminId,
        },
      });
      const ver = await tx.learningDocumentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          status: 'READY_FOR_REVIEW',
          originalFileName: file.originalname.slice(0, 200),
          mimeType: validated.mimeType,
          fileSize: validated.size,
          checksum: validated.checksum,
        },
      });
      return { document: doc, version: ver };
    });

    const storageKey = DocumentStorageKeys.beaconvieSource(
      document.id,
      version.versionNumber,
    ).replace(
      'source/content.json',
      `source/${validated.extension ? `document.${validated.extension}` : 'document'}`,
    );
    await this.storage.uploadPrivateFile({
      storageKey,
      body: file.buffer,
      contentType: validated.mimeType,
      checksum: validated.checksum,
    });
    await this.prisma.learningDocumentVersion.update({
      where: { id: version.id },
      data: { storageKey, sourceStorageKey: storageKey },
    });
    await this.prisma.learningDocument.update({
      where: { id: document.id },
      data: { status: 'PENDING_ADMIN_REVIEW' },
    });

    await this.auditLog.record({
      userId: adminId,
      action: 'document.upload_official',
      metadata: { documentId: document.id },
    });

    return { documentId: document.id, versionId: version.id, slug };
  }

  async list(query: {
    status?: string;
    source?: string;
    creationType?: string;
    authorId?: string;
    category?: string;
    keyword?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const where: Prisma.LearningDocumentWhereInput = {};
    if (query.status) where.status = query.status as never;
    if (query.source) where.source = query.source as never;
    if (query.creationType) where.creationType = query.creationType as never;
    if (query.authorId) where.authorId = query.authorId;
    if (query.category) where.category = query.category;
    if (query.keyword?.trim()) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.learningDocument.findMany({
        where,
        include: {
          author: { select: { id: true, fullname: true, email: true } },
          activeVersion: { select: { versionNumber: true, status: true } },
          moderation: { select: { decision: true, qualityScore: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learningDocument.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getOne(documentId: string) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
      include: {
        author: {
          select: { id: true, fullname: true, email: true, createAt: true },
        },
        versions: { orderBy: { versionNumber: 'desc' } },
        moderation: true,
        moderationHistory: { orderBy: { createdAt: 'desc' } },
        processingEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
        reports: {
          orderBy: { createdAt: 'desc' },
          include: { reporter: { select: { id: true, fullname: true } } },
        },
      },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    return document;
  }

  /** Admin-only signed URL to review the private source file — separate
   * from the public download policy (bypasses the PUBLISHED gate). */
  async getReviewDownloadUrl(versionId: string) {
    return this.accessPolicy.authorizeAdminReviewDownload(versionId);
  }

  async update(
    adminId: string,
    documentId: string,
    dto: AdminUpdateDocumentDto,
  ) {
    const document = await this.prisma.learningDocument.update({
      where: { id: documentId },
      data: dto,
    });
    await this.auditLog.record({
      userId: adminId,
      action: 'document.update_metadata',
      metadata: { documentId, fields: Object.keys(dto) },
    });
    return document;
  }

  async approve(
    adminId: string,
    documentId: string,
    publishImmediately: boolean,
  ) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');

    const version = await this.prisma.learningDocumentVersion.findFirst({
      where: { documentId, status: 'READY_FOR_REVIEW' },
      orderBy: { versionNumber: 'desc' },
    });
    if (!version) {
      throw new BadRequestException(
        'Không có phiên bản nào đang chờ duyệt cho tài liệu này.',
      );
    }

    assertVersionTransition(version.status, 'APPROVED');
    await this.prisma.learningDocumentVersion.update({
      where: { id: version.id },
      data: {
        status: 'APPROVED',
        approvedById: adminId,
        approvedAt: new Date(),
      },
    });
    await this.prisma.documentModerationHistory.create({
      data: {
        documentId,
        action: 'ADMIN_APPROVE',
        fromStatus: document.status,
        toStatus: 'APPROVED',
        actorId: adminId,
      },
    });

    if (publishImmediately) {
      await this.publishService.publishVersion({
        documentId,
        versionId: version.id,
        approvedById: adminId,
      });
    } else if (document.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_APPROVED,
        recipientUserIds: [document.authorId],
        documentId,
        versionId: version.id,
        actorUserId: adminId,
        metadata: {
          message: 'Tài liệu của bạn đã được duyệt và sẽ sớm xuất bản.',
        },
      });
    }

    await this.auditLog.record({
      userId: adminId,
      action: 'document.approve',
      metadata: { documentId, versionId: version.id, publishImmediately },
    });

    return { approved: true, published: publishImmediately };
  }

  async reject(
    adminId: string,
    documentId: string,
    dto: AdminRejectDocumentDto,
  ) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    assertDocumentTransition(document.status, 'REJECTED');

    const version = await this.prisma.learningDocumentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });

    await this.prisma.$transaction([
      this.prisma.learningDocument.update({
        where: { id: documentId },
        data: { status: 'REJECTED' },
      }),
      ...(version
        ? [
            this.prisma.learningDocumentVersion.update({
              where: { id: version.id },
              data: { status: 'REJECTED' },
            }),
          ]
        : []),
      this.prisma.documentModerationHistory.create({
        data: {
          documentId,
          action: 'ADMIN_REJECT',
          fromStatus: document.status,
          toStatus: 'REJECTED',
          actorId: adminId,
          internalReason: dto.internalReason,
          userFacingReason: dto.userFacingReason,
          allowResubmission: dto.allowResubmission ?? true,
        },
      }),
    ]);

    if (document.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_REJECTED,
        recipientUserIds: [document.authorId],
        documentId,
        actorUserId: adminId,
        metadata: { message: dto.userFacingReason },
      });
    }

    await this.auditLog.record({
      userId: adminId,
      action: 'document.reject',
      metadata: { documentId, userFacingReason: dto.userFacingReason },
    });

    return { rejected: true };
  }

  async requestChanges(
    adminId: string,
    documentId: string,
    dto: AdminRequestChangesDto,
  ) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    assertDocumentTransition(document.status, 'CHANGES_REQUESTED');

    await this.prisma.$transaction([
      this.prisma.learningDocument.update({
        where: { id: documentId },
        data: { status: 'CHANGES_REQUESTED' },
      }),
      this.prisma.documentModerationHistory.create({
        data: {
          documentId,
          action: 'ADMIN_REQUEST_CHANGES',
          fromStatus: document.status,
          toStatus: 'CHANGES_REQUESTED',
          actorId: adminId,
          userFacingReason: dto.userFacingReason,
          requiredChanges: dto.requiredChanges,
          allowResubmission: true,
        },
      }),
    ]);

    if (document.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_CHANGES_REQUESTED,
        recipientUserIds: [document.authorId],
        documentId,
        actorUserId: adminId,
        metadata: {
          message:
            dto.userFacingReason ?? 'Vui lòng chỉnh sửa tài liệu theo yêu cầu.',
        },
      });
    }

    await this.auditLog.record({
      userId: adminId,
      action: 'document.request_changes',
      metadata: { documentId },
    });
    return { changesRequested: true };
  }

  async publish(adminId: string, documentId: string) {
    const version = await this.prisma.learningDocumentVersion.findFirst({
      where: { documentId, status: 'APPROVED' },
      orderBy: { versionNumber: 'desc' },
    });
    if (!version)
      throw new BadRequestException('Không có phiên bản đã duyệt để xuất bản.');
    await this.publishService.publishVersion({
      documentId,
      versionId: version.id,
      approvedById: adminId,
    });
    await this.auditLog.record({
      userId: adminId,
      action: 'document.publish',
      metadata: { documentId, versionId: version.id },
    });
    return { published: true };
  }

  async unpublish(adminId: string, documentId: string) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    assertDocumentTransition(document.status, 'HIDDEN');
    await this.prisma.learningDocument.update({
      where: { id: documentId },
      data: { status: 'HIDDEN' },
    });
    await this.auditLog.record({
      userId: adminId,
      action: 'document.unpublish',
      metadata: { documentId },
    });
    return { hidden: true };
  }

  async hide(adminId: string, documentId: string) {
    return this.setHiddenState(
      adminId,
      documentId,
      'HIDDEN',
      NotificationEventType.DOCUMENT_HIDDEN,
      'document.hide',
    );
  }

  async remove(adminId: string, documentId: string) {
    return this.setHiddenState(
      adminId,
      documentId,
      'REMOVED',
      NotificationEventType.DOCUMENT_REMOVED,
      'document.remove',
    );
  }

  private async setHiddenState(
    adminId: string,
    documentId: string,
    status: 'HIDDEN' | 'REMOVED',
    eventType: NotificationEventType,
    auditAction: string,
  ) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    assertDocumentTransition(document.status, status);
    await this.prisma.learningDocument.update({
      where: { id: documentId },
      data: { status },
    });
    await this.prisma.documentModerationHistory.create({
      data: {
        documentId,
        action: auditAction.toUpperCase(),
        fromStatus: document.status,
        toStatus: status,
        actorId: adminId,
      },
    });
    if (document.authorId) {
      this.notifications.notify({
        eventType,
        recipientUserIds: [document.authorId],
        documentId,
        actorUserId: adminId,
        metadata: {},
      });
    }
    await this.auditLog.record({
      userId: adminId,
      action: auditAction,
      metadata: { documentId },
    });
    return { status };
  }

  async restore(adminId: string, documentId: string) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    if (!['HIDDEN', 'REMOVED'].includes(document.status)) {
      throw new BadRequestException(
        'Chỉ có thể khôi phục tài liệu đang ẩn hoặc đã gỡ.',
      );
    }
    const target = document.activeVersionId ? 'PUBLISHED' : 'DRAFT';
    assertDocumentTransition(document.status, target);
    await this.prisma.learningDocument.update({
      where: { id: documentId },
      data: { status: target as never },
    });
    await this.auditLog.record({
      userId: adminId,
      action: 'document.restore',
      metadata: { documentId, target },
    });
    return { status: target };
  }

  async retry(adminId: string, documentId: string) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    if (document.status !== 'FAILED')
      throw new BadRequestException(
        'Chỉ có thể retry tài liệu ở trạng thái FAILED.',
      );

    const version = await this.prisma.learningDocumentVersion.findFirst({
      where: { documentId, status: 'FAILED' },
      orderBy: { versionNumber: 'desc' },
    });
    if (!version)
      throw new BadRequestException(
        'Không tìm thấy phiên bản thất bại để retry.',
      );

    await this.prisma.$transaction([
      this.prisma.learningDocumentVersion.update({
        where: { id: version.id },
        data: { status: 'PROCESSING', failureCode: null, failureMessage: null },
      }),
      this.prisma.learningDocument.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      }),
    ]);

    if (document.source === 'COMMUNITY') {
      await this.queue.add(
        CommunityDocumentJobName.SCAN_FILE,
        { documentId, versionId: version.id },
        {
          ...DEFAULT_JOB_OPTIONS,
          jobId: `${DocumentJobId.scan(documentId)}:retry:${Date.now()}`,
        },
      );
    }

    await this.auditLog.record({
      userId: adminId,
      action: 'document.retry',
      metadata: { documentId, versionId: version.id },
    });
    return { retried: true };
  }

  async rollback(adminId: string, documentId: string, versionId: string) {
    const version = await this.prisma.learningDocumentVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.documentId !== documentId) {
      throw new NotFoundException('Không tìm thấy phiên bản.');
    }
    if (version.status !== 'ARCHIVED' && version.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Chỉ có thể rollback về phiên bản đã từng xuất bản.',
      );
    }
    await this.publishService.publishVersion({
      documentId,
      versionId,
      approvedById: adminId,
    });
    await this.auditLog.record({
      userId: adminId,
      action: 'document.rollback',
      metadata: { documentId, versionId },
    });
    return { rolledBackTo: versionId };
  }

  async resolveReport(
    adminId: string,
    reportId: string,
    dto: AdminResolveReportDto,
  ) {
    const report = await this.prisma.documentReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo.');
    if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
      throw new ForbiddenException('Báo cáo này đã được xử lý.');
    }

    await this.prisma.documentReport.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });

    this.notifications.notify({
      eventType: NotificationEventType.DOCUMENT_REPORT_RESOLVED,
      recipientUserIds: [report.reporterId],
      documentId: report.documentId,
      actorUserId: adminId,
      metadata: { message: dto.resolution ?? 'Báo cáo của bạn đã được xử lý.' },
    });

    await this.auditLog.record({
      userId: adminId,
      action: 'document.resolve_report',
      metadata: { reportId, status: dto.status },
    });
    return { resolved: true };
  }
}
