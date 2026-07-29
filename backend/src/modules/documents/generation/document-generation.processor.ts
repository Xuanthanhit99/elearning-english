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
import { GenerationContentService } from './generation-content.service';
import { GenerationValidatorService } from './generation-validator.service';
import { DocumentProgressService } from '../realtime/document-progress.service';
import { DocumentNotificationsService } from '../notifications/document-notifications.service';
import { NotificationEventType } from '../../notifications/contracts/notification-event-type';
import { PdfRenderService } from '../pdf/pdf-render.service';
import { PdfValidationService } from '../pdf/pdf-validate.service';
import {
  DocumentGenerationConfig,
  GeneratedLesson,
  GeneratedOutline,
  GENERATION_PROMPT_VERSION,
} from './document-generation.types';
import {
  DEFAULT_JOB_OPTIONS,
  DOCUMENT_GENERATION_QUEUE,
  DocumentGenerationJobName,
  GENERATION_PROGRESS,
} from '../documents.constants';
import {
  getDocumentGenerationJobAttempts,
  getDocumentGenerationMaxRepairRounds,
} from '../../../config/document-storage.config';

interface JobPayload {
  documentId: string;
  versionId: string;
  versionNumber: number;
  sectionKey?: string;
}

@Injectable()
@Processor(DOCUMENT_GENERATION_QUEUE)
export class DocumentGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_STORAGE_SERVICE)
    private readonly storage: DocumentStorageService,
    private readonly content: GenerationContentService,
    private readonly validator: GenerationValidatorService,
    private readonly progress: DocumentProgressService,
    private readonly notifications: DocumentNotificationsService,
    private readonly pdfRender: PdfRenderService,
    private readonly pdfValidate: PdfValidationService,
    @InjectQueue(DOCUMENT_GENERATION_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<JobPayload>) {
    switch (job.name as DocumentGenerationJobName) {
      case DocumentGenerationJobName.GENERATE_OUTLINE:
        return this.generateOutline(job.data);
      case DocumentGenerationJobName.GENERATE_SECTION:
        return this.generateSection(job.data);
      case DocumentGenerationJobName.GENERATE_FINAL_TEST:
        return this.generateFinalTest(job.data);
      case DocumentGenerationJobName.GENERATE_SUMMARY:
        return this.generateSummary(job.data);
      case DocumentGenerationJobName.GENERATE_STUDY_PLAN:
        return this.generateStudyPlan(job.data);
      case DocumentGenerationJobName.ASSEMBLE_DOCUMENT:
        return this.assemble(job.data);
      case DocumentGenerationJobName.VALIDATE_CONTENT:
        return this.validateContent(job.data);
      case DocumentGenerationJobName.RENDER_PDF:
        return this.renderPdf(job.data);
      case DocumentGenerationJobName.VALIDATE_PDF:
        return this.validatePdf(job.data);
      case DocumentGenerationJobName.FINALIZE_VERSION:
        return this.finalize(job.data);
      default:
        throw new Error(`Unsupported generation job: ${job.name}`);
    }
  }

  private async loadVersion(versionId: string) {
    return this.prisma.learningDocumentVersion.findUniqueOrThrow({
      where: { id: versionId },
    });
  }

  private config(version: {
    generationConfig: unknown;
  }): DocumentGenerationConfig {
    return version.generationConfig as DocumentGenerationConfig;
  }

  private async enqueueNext(
    name: DocumentGenerationJobName,
    payload: JobPayload,
    jobIdSuffix: string,
  ) {
    await this.queue.add(name, payload, {
      jobId: `generated-document:${payload.documentId}:version:${payload.versionNumber}:${jobIdSuffix}`,
      attempts: getDocumentGenerationJobAttempts(),
      backoff: DEFAULT_JOB_OPTIONS.backoff,
      removeOnComplete: DEFAULT_JOB_OPTIONS.removeOnComplete,
      removeOnFail: DEFAULT_JOB_OPTIONS.removeOnFail,
    });
  }

  // ---- GENERATE_OUTLINE ----
  private async generateOutline({
    documentId,
    versionId,
    versionNumber,
  }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return; // cancelled
    const config = this.config(version);
    const document = await this.prisma.learningDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    const outline = await this.content.generateOutline(
      config,
      document.authorId ?? '',
    );
    const report = this.validator.validateOutline(outline, config);
    if (!report.valid) {
      await this.failVersion(
        documentId,
        versionId,
        'GENERATE_OUTLINE',
        'OUTLINE_INVALID',
        report.issues.map((i) => i.message).join('; '),
      );
      return;
    }

    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: {
        outline: outline as never,
        generatedByModel: undefined,
        promptVersion: GENERATION_PROMPT_VERSION,
      },
    });

    // Pre-create a PENDING section row per planned lesson so admins can
    // see/retry each one individually before it's ever generated.
    await this.prisma.documentGenerationSection.createMany({
      data: outline.lessons.map((lesson, index) => ({
        versionId,
        sectionKey: `lesson-${lesson.lessonNumber}`,
        sectionType: 'LESSON',
        orderIndex: index,
        title: lesson.title,
        status: 'PENDING' as const,
      })),
      skipDuplicates: true,
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'GENERATE_OUTLINE',
      status: 'GENERATING',
      progress: GENERATION_PROGRESS.OUTLINE,
      message: 'Đã tạo dàn ý, bắt đầu tạo nội dung từng bài',
    });

    await this.enqueueNext(
      DocumentGenerationJobName.GENERATE_SECTION,
      {
        documentId,
        versionId,
        versionNumber,
        sectionKey: `lesson-${outline.lessons[0].lessonNumber}`,
      },
      `section:lesson-${outline.lessons[0].lessonNumber}`,
    );
  }

  // ---- GENERATE_SECTION (one lesson at a time) ----
  private async generateSection({
    documentId,
    versionId,
    versionNumber,
    sectionKey,
  }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;
    const config = this.config(version);
    const outline = version.outline as unknown as GeneratedOutline;
    const document = await this.prisma.learningDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    const lessonNumber = Number(sectionKey!.replace('lesson-', ''));
    const outlineLesson = outline.lessons.find(
      (l) => l.lessonNumber === lessonNumber,
    );
    if (!outlineLesson)
      throw new Error(`Outline has no lesson ${lessonNumber}`);

    const section =
      await this.prisma.documentGenerationSection.findUniqueOrThrow({
        where: { versionId_sectionKey: { versionId, sectionKey: sectionKey! } },
      });
    await this.prisma.documentGenerationSection.update({
      where: { id: section.id },
      data: {
        status: 'GENERATING',
        startedAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    let lesson: GeneratedLesson;
    try {
      lesson = await this.content.generateLessonSection(
        config,
        lessonNumber,
        outlineLesson.title,
        outlineLesson.objectives,
        document.authorId ?? '',
      );
    } catch (error) {
      await this.markSectionFailed(
        section.id,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    let report = this.validator.validateLesson(lesson, config);
    let repairRounds = 0;
    const maxRepairRounds = getDocumentGenerationMaxRepairRounds();

    while (!report.valid && repairRounds < maxRepairRounds) {
      repairRounds += 1;
      this.logger.warn(
        `Repairing lesson ${lessonNumber} (round ${repairRounds}): ${report.issues.map((i) => i.code).join(', ')}`,
      );
      try {
        lesson = await this.content.repairLesson(
          config,
          lesson,
          report.issues.map((i) => i.message),
          document.authorId ?? '',
        );
      } catch (error) {
        this.logger.error(
          `Repair call failed for lesson ${lessonNumber}: ${error instanceof Error ? error.message : String(error)}`,
        );
        break;
      }
      report = this.validator.validateLesson(lesson, config);
    }

    if (!report.valid) {
      await this.prisma.documentGenerationSection.update({
        where: { id: section.id },
        data: {
          status: 'NEEDS_ADMIN_ACTION',
          validationReport: report as never,
          content: lesson as never,
        },
      });
      await this.failVersion(
        documentId,
        versionId,
        'GENERATE_SECTION',
        'SECTION_NEEDS_ADMIN_ACTION',
        `Bài ${lessonNumber} cần Admin can thiệp sau ${repairRounds} lần tự sửa: ${report.issues.map((i) => i.message).join('; ')}`,
      );
      return;
    }

    await this.prisma.documentGenerationSection.update({
      where: { id: section.id },
      data: {
        status: 'COMPLETED',
        content: lesson as never,
        completedAt: new Date(),
        validationReport: report as never,
      },
    });

    const totalLessons = outline.lessons.length;
    const completedLessons = await this.prisma.documentGenerationSection.count({
      where: { versionId, sectionType: 'LESSON', status: 'COMPLETED' },
    });
    const lessonsProgress =
      GENERATION_PROGRESS.OUTLINE +
      ((GENERATION_PROGRESS.LESSONS - GENERATION_PROGRESS.OUTLINE) *
        completedLessons) /
        totalLessons;

    await this.progress.report({
      documentId,
      versionId,
      step: `GENERATE_SECTION:lesson-${lessonNumber}`,
      status: 'GENERATING',
      progress: lessonsProgress,
      message: `Đã tạo xong bài ${lessonNumber}/${totalLessons}`,
    });

    const nextLesson = outline.lessons.find(
      (l) => l.lessonNumber === lessonNumber + 1,
    );
    if (nextLesson) {
      await this.enqueueNext(
        DocumentGenerationJobName.GENERATE_SECTION,
        {
          documentId,
          versionId,
          versionNumber,
          sectionKey: `lesson-${nextLesson.lessonNumber}`,
        },
        `section:lesson-${nextLesson.lessonNumber}`,
      );
      return;
    }

    // All lessons done — move to final test / summary / study plan.
    if (config.includeFinalTest) {
      await this.enqueueNext(
        DocumentGenerationJobName.GENERATE_FINAL_TEST,
        { documentId, versionId, versionNumber },
        'final-test',
      );
    } else {
      await this.enqueueNext(
        DocumentGenerationJobName.GENERATE_SUMMARY,
        { documentId, versionId, versionNumber },
        'summary',
      );
    }
  }

  private async markSectionFailed(sectionId: string, message: string) {
    await this.prisma.documentGenerationSection.update({
      where: { id: sectionId },
      data: { status: 'FAILED', failureMessage: message },
    });
  }

  // ---- GENERATE_FINAL_TEST ----
  private async generateFinalTest({
    documentId,
    versionId,
    versionNumber,
  }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;
    const config = this.config(version);
    const document = await this.prisma.learningDocument.findUniqueOrThrow({
      where: { id: documentId },
    });
    const lessons = await this.completedLessons(versionId);

    const finalTest = await this.content.generateFinalTest(
      config,
      lessons.map((l) => l.title),
      document.authorId ?? '',
    );
    const report = this.validator.validateFinalTest(finalTest, config);
    if (!report.valid) {
      await this.failVersion(
        documentId,
        versionId,
        'GENERATE_FINAL_TEST',
        'FINAL_TEST_INVALID',
        report.issues.map((i) => i.message).join('; '),
      );
      return;
    }

    await this.prisma.documentGenerationSection.upsert({
      where: { versionId_sectionKey: { versionId, sectionKey: 'final-test' } },
      create: {
        versionId,
        sectionKey: 'final-test',
        sectionType: 'FINAL_TEST',
        orderIndex: 9000,
        status: 'COMPLETED',
        content: finalTest as never,
        completedAt: new Date(),
      },
      update: {
        status: 'COMPLETED',
        content: finalTest as never,
        completedAt: new Date(),
      },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'GENERATE_FINAL_TEST',
      status: 'GENERATING',
      progress: GENERATION_PROGRESS.FINAL_TEST,
      message: 'Đã tạo bài kiểm tra cuối khoá',
    });
    await this.enqueueNext(
      DocumentGenerationJobName.GENERATE_SUMMARY,
      { documentId, versionId, versionNumber },
      'summary',
    );
  }

  // ---- GENERATE_SUMMARY ----
  private async generateSummary({
    documentId,
    versionId,
    versionNumber,
  }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;
    const config = this.config(version);
    const document = await this.prisma.learningDocument.findUniqueOrThrow({
      where: { id: documentId },
    });
    const lessons = await this.completedLessons(versionId);

    const summary = await this.content.generateSummary(
      config,
      lessons.map((l) => l.title),
      document.authorId ?? '',
    );
    await this.prisma.learningDocument.update({
      where: { id: documentId },
      data: { summary },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'GENERATE_SUMMARY',
      status: 'GENERATING',
      progress: GENERATION_PROGRESS.SUMMARY_STUDY_PLAN,
      message: 'Đã tạo tóm tắt',
    });

    if (config.includeStudyPlan) {
      await this.enqueueNext(
        DocumentGenerationJobName.GENERATE_STUDY_PLAN,
        { documentId, versionId, versionNumber },
        'study-plan',
      );
    } else {
      await this.enqueueNext(
        DocumentGenerationJobName.ASSEMBLE_DOCUMENT,
        { documentId, versionId, versionNumber },
        'assemble',
      );
    }
  }

  // ---- GENERATE_STUDY_PLAN ----
  private async generateStudyPlan({
    documentId,
    versionId,
    versionNumber,
  }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;
    const config = this.config(version);
    const document = await this.prisma.learningDocument.findUniqueOrThrow({
      where: { id: documentId },
    });
    const lessons = await this.completedLessons(versionId);

    const studyPlan = await this.content.generateStudyPlan(
      config,
      lessons.map((l) => l.title),
      document.authorId ?? '',
    );
    await this.prisma.documentGenerationSection.upsert({
      where: { versionId_sectionKey: { versionId, sectionKey: 'study-plan' } },
      create: {
        versionId,
        sectionKey: 'study-plan',
        sectionType: 'STUDY_PLAN',
        orderIndex: 9100,
        status: 'COMPLETED',
        content: studyPlan as never,
        completedAt: new Date(),
      },
      update: {
        status: 'COMPLETED',
        content: studyPlan as never,
        completedAt: new Date(),
      },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'GENERATE_STUDY_PLAN',
      status: 'GENERATING',
      progress: GENERATION_PROGRESS.SUMMARY_STUDY_PLAN,
      message: 'Đã tạo lộ trình học',
    });
    await this.enqueueNext(
      DocumentGenerationJobName.ASSEMBLE_DOCUMENT,
      { documentId, versionId, versionNumber },
      'assemble',
    );
  }

  private async completedLessons(versionId: string) {
    const sections = await this.prisma.documentGenerationSection.findMany({
      where: { versionId, sectionType: 'LESSON', status: 'COMPLETED' },
      orderBy: { orderIndex: 'asc' },
    });
    return sections.map((s) => s.content as unknown as GeneratedLesson);
  }

  // ---- ASSEMBLE_DOCUMENT ----
  private async assemble({ documentId, versionId, versionNumber }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;

    const allSections = await this.prisma.documentGenerationSection.findMany({
      where: { versionId },
    });
    const incomplete = allSections.filter(
      (s) => s.required && s.status !== 'COMPLETED',
    );
    if (incomplete.length > 0) {
      await this.failVersion(
        documentId,
        versionId,
        'ASSEMBLE_DOCUMENT',
        'INCOMPLETE_SECTIONS',
        `Không thể assemble — còn section chưa hoàn tất: ${incomplete.map((s) => s.sectionKey).join(', ')}`,
      );
      return;
    }

    const lessons = allSections
      .filter((s) => s.sectionType === 'LESSON')
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => s.content);
    const finalTest =
      allSections.find((s) => s.sectionKey === 'final-test')?.content ?? null;
    const studyPlan =
      allSections.find((s) => s.sectionKey === 'study-plan')?.content ?? null;
    const outline = version.outline;

    const assembled = { outline, lessons, finalTest, studyPlan };
    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: { assembledContent: assembled as never },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'ASSEMBLE_DOCUMENT',
      status: 'PROCESSING',
      progress: GENERATION_PROGRESS.ASSEMBLE,
      message: 'Đang tổng hợp tài liệu',
    });
    await this.enqueueNext(
      DocumentGenerationJobName.VALIDATE_CONTENT,
      { documentId, versionId, versionNumber },
      'validate-content',
    );
  }

  // ---- VALIDATE_CONTENT (programmatic, not AI) ----
  private async validateContent({
    documentId,
    versionId,
    versionNumber,
  }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;
    const assembled = version.assembledContent as {
      lessons: GeneratedLesson[];
      finalTest: unknown;
    } | null;
    const config = this.config(version);

    const issues: string[] = [];
    if (
      !assembled ||
      !Array.isArray(assembled.lessons) ||
      assembled.lessons.length !== config.lessonCount
    ) {
      issues.push('Số bài học trong nội dung tổng hợp không khớp cấu hình.');
    }
    for (const lesson of assembled?.lessons ?? []) {
      const report = this.validator.validateLesson(lesson, config);
      issues.push(
        ...report.issues.map(
          (i) => `[Bài ${lesson.lessonNumber}] ${i.message}`,
        ),
      );
    }

    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: { validationReport: { issues } as never, status: 'VALIDATING' },
    });

    if (issues.length > 0) {
      await this.failVersion(
        documentId,
        versionId,
        'VALIDATE_CONTENT',
        'CONTENT_VALIDATION_FAILED',
        issues.slice(0, 10).join('; '),
      );
      return;
    }

    await this.progress.report({
      documentId,
      versionId,
      step: 'VALIDATE_CONTENT',
      status: 'VALIDATING',
      progress: GENERATION_PROGRESS.VALIDATE_CONTENT,
      message: 'Nội dung hợp lệ',
    });
    await this.enqueueNext(
      DocumentGenerationJobName.RENDER_PDF,
      { documentId, versionId, versionNumber },
      'render',
    );
  }

  // ---- RENDER_PDF ----
  private async renderPdf({
    documentId,
    versionId,
    versionNumber,
  }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;
    const document = await this.prisma.learningDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    const pdfBuffer = await this.pdfRender.renderDocument({
      title: document.title,
      category: document.category,
      level: document.level,
      assembledContent: version.assembledContent,
    });

    const storageKey = DocumentStorageKeys.beaconvieRender(
      documentId,
      versionNumber,
    );
    const checksum = await this.pdfRender.checksum(pdfBuffer);
    await this.storage.uploadPrivateFile({
      storageKey,
      body: pdfBuffer,
      contentType: 'application/pdf',
      checksum,
    });

    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: {
        storageKey,
        contentStorageKey: storageKey,
        checksum,
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf',
      },
    });

    await this.progress.report({
      documentId,
      versionId,
      step: 'RENDER_PDF',
      status: 'PROCESSING',
      progress: GENERATION_PROGRESS.RENDER_PDF,
      message: 'Đã tạo file PDF',
    });
    await this.enqueueNext(
      DocumentGenerationJobName.VALIDATE_PDF,
      { documentId, versionId, versionNumber },
      'validate-pdf',
    );
  }

  // ---- VALIDATE_PDF ----
  private async validatePdf({
    documentId,
    versionId,
    versionNumber,
  }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;
    if (!version.storageKey)
      throw new Error('Version has no rendered PDF storageKey.');

    const buffer = await this.storage.getObjectBuffer(version.storageKey);
    const document = await this.prisma.learningDocument.findUniqueOrThrow({
      where: { id: documentId },
    });
    const config = this.config(version);
    const result = await this.pdfValidate.validate(buffer, {
      expectedTitle: document.title,
      requireAnswerKey: config.includeAnswerKey,
    });

    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: { qualityReport: result as never, pageCount: result.pageCount },
    });

    if (!result.valid) {
      await this.failVersion(
        documentId,
        versionId,
        'VALIDATE_PDF',
        'PDF_VALIDATION_FAILED',
        result.issues.join('; '),
      );
      return;
    }

    await this.progress.report({
      documentId,
      versionId,
      step: 'VALIDATE_PDF',
      status: 'VALIDATING',
      progress: GENERATION_PROGRESS.VALIDATE_PDF,
      message: 'PDF hợp lệ',
    });
    await this.enqueueNext(
      DocumentGenerationJobName.FINALIZE_VERSION,
      { documentId, versionId, versionNumber },
      'finalize',
    );
  }

  // ---- FINALIZE_VERSION ----
  private async finalize({ documentId, versionId }: JobPayload) {
    const version = await this.loadVersion(versionId);
    if (version.status === 'FAILED') return;
    const config = this.config(version);

    await this.prisma.learningDocumentVersion.update({
      where: { id: versionId },
      data: { status: 'READY_FOR_REVIEW' },
    });

    if (config.publishMode === 'SAVE_AS_DRAFT') {
      await this.prisma.learningDocument.update({
        where: { id: documentId },
        data: { status: 'DRAFT' },
      });
    } else {
      await this.prisma.learningDocument.update({
        where: { id: documentId },
        data: { status: 'PENDING_ADMIN_REVIEW' },
      });
    }

    await this.progress.report({
      documentId,
      versionId,
      step: 'READY_FOR_ADMIN_REVIEW',
      status: 'READY_FOR_REVIEW',
      progress: GENERATION_PROGRESS.READY,
      message: 'Sẵn sàng để Admin duyệt',
    });

    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
      select: { authorId: true },
    });
    if (document?.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_GENERATION_COMPLETED,
        recipientUserIds: [document.authorId],
        documentId,
        versionId,
        metadata: { message: 'Tài liệu do Gemini tạo đã sẵn sàng để duyệt.' },
      });
    }
    // Note: publishMode === 'PUBLISH_AFTER_APPROVAL' still stops here at
    // READY_FOR_REVIEW/PENDING_ADMIN_REVIEW rather than auto-publishing —
    // spec §11 explicitly forbids Gemini self-publishing without an
    // explicit admin approve action even under this mode; the mode only
    // pre-selects the admin's intended next action in the moderation UI.
  }

  private async failVersion(
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
      select: { authorId: true },
    });
    if (document?.authorId) {
      this.notifications.notify({
        eventType: NotificationEventType.DOCUMENT_GENERATION_FAILED,
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
      `Generation job failed: name=${job?.name}, id=${job?.id}, documentId=${job?.data?.documentId}`,
      error.stack,
    );
    if (!job) return;
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!exhausted) return;
    try {
      await this.failVersion(
        job.data.documentId,
        job.data.versionId,
        job.name,
        'GENERATION_JOB_EXHAUSTED_RETRIES',
        error.message,
      );
    } catch (innerError) {
      this.logger.error(
        'Failed to record terminal generation failure',
        innerError instanceof Error ? innerError.stack : String(innerError),
      );
    }
  }
}
