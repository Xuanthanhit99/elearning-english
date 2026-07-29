import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { DOCUMENT_STORAGE_SERVICE } from '../storage/document-storage.interface';
import type { DocumentStorageService } from '../storage/document-storage.interface';
import { DocumentStorageKeys } from '../storage/storage-key.util';
import { ContentExtractionService } from './content-extraction.service';
import { DuplicateCheckService } from './duplicate-check.service';
import { DocumentModerationService } from '../moderation/document-moderation.service';
import { MODERATION_PROMPT_VERSION } from '../moderation/document-moderation.types';
import { DocumentProgressService } from '../realtime/document-progress.service';
import { DocumentNotificationsService } from '../notifications/document-notifications.service';
import { NotificationEventType } from '../../notifications/contracts/notification-event-type';
import { DocumentPublishService } from '../document-publish.service';
import {
  COMMUNITY_PROGRESS,
  CommunityDocumentJobName,
  DEFAULT_JOB_OPTIONS,
  DOCUMENT_PROCESSING_QUEUE,
  DocumentJobId,
} from '../documents.constants';
import {
  getDocumentAutoApproveConfidence,
  getDocumentMaxPageCount,
  getDocumentMinQualityScore,
  isDocumentAutoPublishEnabled,
} from '../../../config/document-storage.config';

interface JobPayload {
  documentId: string;
  versionId: string;
}

@Injectable()
@Processor(DOCUMENT_PROCESSING_QUEUE)
export class CommunityDocumentProcessor extends WorkerHost {
  private readonly logger = new Logger(CommunityDocumentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_STORAGE_SERVICE)
    private readonly storage: DocumentStorageService,
    private readonly extraction: ContentExtractionService,
    private readonly duplicateCheck: DuplicateCheckService,
    private readonly moderation: DocumentModerationService,
    private readonly progress: DocumentProgressService,
    private readonly notifications: DocumentNotificationsService,
    private readonly publishService: DocumentPublishService,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<JobPayload>) {
    switch (job.name as CommunityDocumentJobName) {
      case CommunityDocumentJobName.SCAN_FILE:
        return this.scanFile(job.data);
      case CommunityDocumentJobName.EXTRACT_CONTENT:
        return this.extractContent(job.data);
      case CommunityDocumentJobName.CHECK_DUPLICATE:
        return this.checkDuplicate(job.data);
      case CommunityDocumentJobName.AI_MODERATE:
        return this.aiModerate(job.data);
      case CommunityDocumentJobName.GENERATE_PREVIEW:
        return this.generatePreview(job.data);
      case CommunityDocumentJobName.PREPARE_ADMIN_REVIEW:
        return this.prepareAdminReview(job.data);
      default:
        throw new Error(`Unsupported community document job: ${job.name}`);
    }
  }

  private async loadVersion(versionId: string) {
    const version = await this.prisma.learningDocumentVersion.findUniqueOrThrow(
      {
        where: { id: versionId },
      },
    );
    return version;
  }

  private async scanFile({ documentId, versionId }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (!version.sourceStorageKey)
      throw new Error('Version has no sourceStorageKey.');

    const exists = await this.storage.objectExists(version.sourceStorageKey);
    if (!exists) throw new Error('Uploaded file object not found in storage.');

    // Real malware scanning would run here (e.g. ClamAV) if the hosting
    // infrastructure provided a scanner — none is available in this
    // environment. We deliberately do NOT treat Gemini's later content
    // moderation pass as an antivirus substitute (spec §7). This is a
    // known gap — see final report.
    this.logger.warn(
      `No malware scanner configured — SCAN_FILE only verifies object existence for version ${versionId}.`,
    );

    await this.progress.report({
      documentId,
      versionId,
      step: 'FILE_SCANNING',
      status: 'PROCESSING',
      progress: COMMUNITY_PROGRESS.SCAN,
      message: 'Đang kiểm tra file',
    });

    await this.queue.add(
      CommunityDocumentJobName.EXTRACT_CONTENT,
      { documentId, versionId },
      { ...DEFAULT_JOB_OPTIONS, jobId: DocumentJobId.extract(documentId) },
    );
  }

  private async extractContent({ documentId, versionId }: JobPayload) {
    const version = await this.loadVersion(versionId);
    const buffer = await this.storage.getObjectBuffer(
      version.sourceStorageKey!,
    );
    const extension = (
      version.originalFileName?.split('.').pop() ?? ''
    ).toLowerCase();

    const extracted = await this.extraction.extract(buffer, extension);

    if (
      extracted.pageCount &&
      extracted.pageCount > getDocumentMaxPageCount()
    ) {
      await this.fail(
        documentId,
        versionId,
        'EXTRACT_CONTENT',
        'PAGE_LIMIT_EXCEEDED',
        `Tài liệu có ${extracted.pageCount} trang, vượt quá giới hạn ${getDocumentMaxPageCount()} trang.`,
      );
      return;
    }

    const contentHash = this.duplicateCheck.computeContentHash(extracted.text);
    const extractedKey = DocumentStorageKeys.communityExtracted(
      documentId,
      version.versionNumber,
    );
    const extractedPayload = Buffer.from(
      JSON.stringify({ text: extracted.text, truncated: extracted.truncated }),
    );
    await this.storage.uploadPrivateFile({
      storageKey: extractedKey,
      body: extractedPayload,
      contentType: 'application/json',
      checksum: contentHash,
    });

    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: {
        contentStorageKey: extractedKey,
        pageCount: extracted.pageCount,
        contentHash,
      },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'CONTENT_EXTRACTING',
      status: 'PROCESSING',
      progress: COMMUNITY_PROGRESS.EXTRACT,
      message: 'Đang trích xuất nội dung',
    });

    await this.queue.add(
      CommunityDocumentJobName.CHECK_DUPLICATE,
      { documentId, versionId },
      { ...DEFAULT_JOB_OPTIONS, jobId: DocumentJobId.duplicate(documentId) },
    );
  }

  private async checkDuplicate({ documentId, versionId }: JobPayload) {
    const version = await this.loadVersion(versionId);

    const [byChecksum, byContent] = await Promise.all([
      version.checksum
        ? this.duplicateCheck.findDuplicateByChecksum(
            version.checksum,
            documentId,
          )
        : null,
      version.contentHash
        ? this.duplicateCheck.findDuplicateByContentHash(
            version.contentHash,
            documentId,
          )
        : null,
    ]);
    const duplicate = byChecksum ?? byContent;

    if (duplicate) {
      await this.reject(documentId, versionId, {
        internalReason: `Duplicate of document ${duplicate.documentId} version ${duplicate.versionNumber}`,
        userFacingReason:
          'Tài liệu này trùng với một tài liệu đã có trong Thư viện tài liệu.',
        allowResubmission: false,
      });
      return;
    }

    await this.progress.report({
      documentId,
      versionId,
      step: 'DUPLICATE_CHECKING',
      status: 'PROCESSING',
      progress: COMMUNITY_PROGRESS.DUPLICATE,
      message: 'Đang kiểm tra trùng lặp',
    });

    await this.queue.add(
      CommunityDocumentJobName.AI_MODERATE,
      { documentId, versionId },
      { ...DEFAULT_JOB_OPTIONS, jobId: DocumentJobId.moderate(documentId) },
    );
  }

  private async aiModerate({ documentId, versionId }: JobPayload) {
    const [document, version] = await Promise.all([
      this.prisma.learningDocument.findUniqueOrThrow({
        where: { id: documentId },
      }),
      this.loadVersion(versionId),
    ]);

    await this.prisma.learningDocument.update({
      where: { id: documentId },
      data: { status: 'AI_REVIEWING' },
    });

    const extractedRaw = version.contentStorageKey
      ? await this.storage.getObjectBuffer(version.contentStorageKey)
      : Buffer.from('');
    const extractedText = extractedRaw.length
      ? (JSON.parse(extractedRaw.toString('utf-8')) as { text: string }).text
      : '';

    const { result, modelName, durationMs } = await this.moderation.moderate({
      title: document.title,
      description: document.description,
      category: document.category,
      level: document.level,
      extractedText,
      userId: document.authorId ?? undefined,
    });

    await this.prisma.documentModeration.upsert({
      where: { versionId },
      create: {
        documentId,
        versionId,
        decision: result.decision,
        confidence: result.confidence,
        qualityScore: result.qualityScore,
        completenessScore: result.completenessScore,
        languageAccuracyScore: result.languageAccuracyScore,
        levelSuitabilityScore: result.levelSuitabilityScore,
        detectedLanguage: result.detectedLanguage,
        detectedLevel: result.detectedLevel,
        suggestedCategory: result.suggestedCategory,
        suggestedSkills: result.suggestedSkills,
        summary: result.summary,
        suggestedTitle: result.suggestedTitle,
        suggestedDescription: result.suggestedDescription,
        copyrightRisk: result.copyrightRisk,
        personalDataRisk: result.personalDataRisk,
        unsafeContentRisk: result.unsafeContentRisk,
        spamRisk: result.spamRisk,
        promptInjectionRisk: result.promptInjectionRisk,
        warnings: result.warnings,
        rejectionReasons: result.rejectionReasons,
        requiredChanges: result.requiredChanges,
        modelName,
        promptVersion: MODERATION_PROMPT_VERSION,
        durationMs,
      },
      update: {
        decision: result.decision,
        confidence: result.confidence,
        qualityScore: result.qualityScore,
        completenessScore: result.completenessScore,
        languageAccuracyScore: result.languageAccuracyScore,
        levelSuitabilityScore: result.levelSuitabilityScore,
        detectedLanguage: result.detectedLanguage,
        detectedLevel: result.detectedLevel,
        suggestedCategory: result.suggestedCategory,
        suggestedSkills: result.suggestedSkills,
        summary: result.summary,
        suggestedTitle: result.suggestedTitle,
        suggestedDescription: result.suggestedDescription,
        copyrightRisk: result.copyrightRisk,
        personalDataRisk: result.personalDataRisk,
        unsafeContentRisk: result.unsafeContentRisk,
        spamRisk: result.spamRisk,
        promptInjectionRisk: result.promptInjectionRisk,
        warnings: result.warnings,
        rejectionReasons: result.rejectionReasons,
        requiredChanges: result.requiredChanges,
        modelName,
        promptVersion: MODERATION_PROMPT_VERSION,
        durationMs,
      },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'AI_MODERATING',
      status: 'PROCESSING',
      progress: COMMUNITY_PROGRESS.MODERATE,
      message: 'AI đang kiểm duyệt nội dung',
    });

    if (result.decision === 'REJECT') {
      await this.reject(documentId, versionId, {
        internalReason: `AI rejected: ${result.rejectionReasons.join('; ')}`,
        userFacingReason:
          result.rejectionReasons[0] ??
          'Tài liệu không đáp ứng tiêu chuẩn nội dung của BeaconVie.',
        allowResubmission:
          result.copyrightRisk !== 'HIGH' &&
          result.unsafeContentRisk !== 'HIGH',
      });
      return;
    }

    await this.queue.add(
      CommunityDocumentJobName.GENERATE_PREVIEW,
      { documentId, versionId },
      { ...DEFAULT_JOB_OPTIONS, jobId: DocumentJobId.preview(documentId) },
    );
  }

  private async generatePreview({ documentId, versionId }: JobPayload) {
    const version = await this.loadVersion(versionId);

    // A DOCX/PPTX/TXT->PDF preview render pipeline needs a document
    // conversion engine (e.g. LibreOffice headless) not available in
    // this environment. For a source that is ALREADY a PDF, the private
    // source object itself doubles as the preview (still gated by the
    // same signed-URL access policy — never made public); for other
    // formats, previewStorageKey stays null and the frontend falls back
    // to metadata-only preview. This is a known scope gap — see final
    // report.
    if (version.mimeType === 'application/pdf' && version.sourceStorageKey) {
      await this.prisma.learningDocumentVersion.update({
        where: { id: versionId },
        data: { previewStorageKey: version.sourceStorageKey },
      });
    }

    await this.progress.report({
      documentId,
      versionId,
      step: 'PREVIEW_GENERATING',
      status: 'PROCESSING',
      progress: COMMUNITY_PROGRESS.PREVIEW,
      message: 'Đang tạo bản xem trước',
    });

    await this.queue.add(
      CommunityDocumentJobName.PREPARE_ADMIN_REVIEW,
      { documentId, versionId },
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId: DocumentJobId.prepareReview(documentId),
      },
    );
  }

  private async prepareAdminReview({ documentId, versionId }: JobPayload) {
    // loadVersion is called for its existence check (findUniqueOrThrow)
    // even though the version row itself isn't needed below.
    const [document, , moderation] = await Promise.all([
      this.prisma.learningDocument.findUniqueOrThrow({
        where: { id: documentId },
      }),
      this.loadVersion(versionId),
      this.prisma.documentModeration.findUnique({ where: { versionId } }),
    ]);

    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: { status: 'READY_FOR_REVIEW' },
    });

    const canAutoPublish =
      isDocumentAutoPublishEnabled() &&
      moderation?.decision === 'APPROVE' &&
      moderation.confidence >= getDocumentAutoApproveConfidence() &&
      moderation.qualityScore >= getDocumentMinQualityScore();

    if (canAutoPublish) {
      await this.prisma.learningDocumentVersion.update({
        where: { id: versionId },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
      await this.publishService.publishVersion({
        documentId,
        versionId,
        approvedById: null,
      });
      await this.progress.report({
        documentId,
        versionId,
        step: 'PUBLISHED',
        status: 'PUBLISHED',
        progress: COMMUNITY_PROGRESS.PUBLISHED,
        message: 'Đã xuất bản tự động',
      });
      return;
    }

    await this.prisma.learningDocument.update({
      where: { id: documentId },
      data: { status: 'PENDING_ADMIN_REVIEW' },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'PENDING_ADMIN_REVIEW',
      status: 'PENDING_ADMIN_REVIEW',
      progress: COMMUNITY_PROGRESS.READY_FOR_REVIEW,
      message: 'Đang chờ Admin duyệt',
    });

    if (document.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_PENDING_REVIEW,
        recipientUserIds: [document.authorId],
        documentId,
        versionId,
        metadata: { message: 'Tài liệu của bạn đang chờ Admin xem xét.' },
      });
    }
  }

  private async reject(
    documentId: string,
    versionId: string,
    input: {
      internalReason: string;
      userFacingReason: string;
      allowResubmission: boolean;
    },
  ) {
    const document = await this.prisma.learningDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    await this.prisma.$transaction([
      this.prisma.learningDocumentVersion.update({
        where: { id: versionId },
        data: { status: 'REJECTED' },
      }),
      this.prisma.learningDocument.update({
        where: { id: documentId },
        data: { status: 'REJECTED' },
      }),
      this.prisma.documentModerationHistory.create({
        data: {
          documentId,
          action: 'AUTO_REJECT',
          fromStatus: document.status,
          toStatus: 'REJECTED',
          isSystemActor: true,
          internalReason: input.internalReason,
          userFacingReason: input.userFacingReason,
          allowResubmission: input.allowResubmission,
        },
      }),
    ]);

    await this.progress.report({
      documentId,
      versionId,
      step: 'REJECTED',
      status: 'REJECTED',
      progress: 100,
      message: input.userFacingReason,
    });

    if (document.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_REJECTED,
        recipientUserIds: [document.authorId],
        documentId,
        versionId,
        metadata: { message: input.userFacingReason },
      });
    }
  }

  private async fail(
    documentId: string,
    versionId: string,
    step: string,
    code: string,
    message: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.learningDocumentVersion.update({
        where: { id: versionId },
        data: { status: 'FAILED', failureCode: code, failureMessage: message },
      }),
      this.prisma.learningDocument.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      }),
    ]);
    await this.progress.reportFailure({ documentId, versionId, step, message });

    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
    });
    if (document?.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_PROCESSING_FAILED,
        recipientUserIds: [document.authorId],
        documentId,
        versionId,
        metadata: { message },
      });
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<JobPayload> | undefined, error: Error) {
    this.logger.error(
      `Community document job failed: name=${job?.name}, id=${job?.id}, documentId=${job?.data?.documentId}`,
      error.stack,
    );

    if (!job) return;
    const exhaustedRetries = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!exhaustedRetries) return;

    // Final attempt failed — the document must not stay stuck showing
    // "processing" forever with no visible outcome. Best-effort: a
    // failure writing THIS failure state must never throw again.
    try {
      await this.fail(
        job.data.documentId,
        job.data.versionId,
        job.name,
        'PROCESSING_JOB_EXHAUSTED_RETRIES',
        `Xử lý thất bại ở bước ${job.name} sau ${job.attemptsMade} lần thử: ${error.message}`,
      );
    } catch (innerError) {
      this.logger.error(
        `Failed to record terminal failure for document ${job.data.documentId}`,
        innerError instanceof Error ? innerError.stack : String(innerError),
      );
    }
  }
}
