import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentsService } from '../documents.service';
import { generateUniqueSlug } from '../utils/slug.util';
import { CreateDocumentGenerationDto } from './document-generation.dto';
import { DocumentGenerationConfig } from './document-generation.types';
import {
  DEFAULT_JOB_OPTIONS,
  DOCUMENT_GENERATION_QUEUE,
  DocumentGenerationJobName,
  DocumentJobId,
} from '../documents.constants';
import { getDocumentGenerationJobAttempts } from '../../../config/document-storage.config';

@Injectable()
export class DocumentGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    @InjectQueue(DOCUMENT_GENERATION_QUEUE) private readonly queue: Queue,
  ) {}

  async startGeneration(adminId: string, dto: CreateDocumentGenerationDto) {
    const slug = await generateUniqueSlug(dto.title, (candidate) =>
      this.documentsService.slugExists(candidate),
    );

    const config: DocumentGenerationConfig = {
      title: dto.title,
      englishTitle: dto.englishTitle,
      topic: dto.topic,
      description: dto.description,
      category: dto.category,
      level: dto.level,
      skills: dto.skills ?? [],
      targetAudience: dto.targetAudience,
      explanationLanguage: dto.explanationLanguage ?? 'vi',
      lessonCount: dto.lessonCount,
      vocabularyPerLesson: dto.vocabularyPerLesson,
      estimatedPageCount: dto.estimatedPageCount,
      includeIpa: dto.includeIpa ?? true,
      includeTranslation: dto.includeTranslation ?? true,
      includeDialogues: dto.includeDialogues ?? true,
      includeGrammar: dto.includeGrammar ?? true,
      includeExercises: dto.includeExercises ?? true,
      includeAnswerKey: dto.includeAnswerKey ?? true,
      includeFinalTest: dto.includeFinalTest ?? true,
      includeStudyPlan: dto.includeStudyPlan ?? false,
      allowDownload: dto.allowDownload ?? true,
      featured: dto.featured ?? false,
      publishMode: dto.publishMode,
    };

    const { document, version } = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.learningDocument.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          source: 'BEACONVIE',
          creationType: 'GEMINI_GENERATED',
          status: 'PROCESSING',
          category: dto.category,
          level: dto.level,
          skills: dto.skills ?? [],
          allowDownload: dto.allowDownload ?? true,
          isFeatured: dto.featured ?? false,
          aiAssisted: true,
          authorId: adminId,
        },
      });
      const ver = await tx.learningDocumentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          status: 'GENERATING',
          generationConfig: config as never,
        },
      });
      return { document: doc, version: ver };
    });

    await this.queue.add(
      DocumentGenerationJobName.GENERATE_OUTLINE,
      {
        documentId: document.id,
        versionId: version.id,
        versionNumber: version.versionNumber,
      },
      {
        jobId: DocumentJobId.outline(document.id, version.versionNumber),
        attempts: getDocumentGenerationJobAttempts(),
        backoff: DEFAULT_JOB_OPTIONS.backoff,
        removeOnComplete: DEFAULT_JOB_OPTIONS.removeOnComplete,
        removeOnFail: DEFAULT_JOB_OPTIONS.removeOnFail,
      },
    );

    return {
      documentId: document.id,
      versionId: version.id,
      slug,
      status: 'GENERATING' as const,
    };
  }

  async list(page = 1, limit = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.learningDocument.findMany({
        where: { creationType: 'GEMINI_GENERATED' },
        include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learningDocument.count({
        where: { creationType: 'GEMINI_GENERATED' },
      }),
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
    const document = await this.prisma.learningDocument.findFirst({
      where: { id: documentId, creationType: 'GEMINI_GENERATED' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { sections: { orderBy: { orderIndex: 'asc' } } },
        },
        processingEvents: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!document)
      throw new NotFoundException('Không tìm thấy tài liệu được tạo bởi AI.');
    return document;
  }

  async cancel(documentId: string) {
    const version = await this.prisma.learningDocumentVersion.findFirst({
      where: {
        documentId,
        status: { in: ['GENERATING', 'PROCESSING', 'VALIDATING'] },
      },
      orderBy: { versionNumber: 'desc' },
    });
    if (!version)
      throw new BadRequestException('Không có phiên bản đang tạo để hủy.');
    await this.prisma.learningDocumentVersion.update({
      where: { id: version.id },
      data: {
        status: 'FAILED',
        failureCode: 'CANCELLED_BY_ADMIN',
        failureMessage: 'Đã hủy bởi Admin.',
      },
    });
    return { cancelled: true };
  }

  async retry(documentId: string) {
    const version = await this.prisma.learningDocumentVersion.findFirst({
      where: { documentId, status: 'FAILED' },
      orderBy: { versionNumber: 'desc' },
    });
    if (!version)
      throw new BadRequestException('Không có phiên bản thất bại để retry.');
    await this.prisma.learningDocumentVersion.update({
      where: { id: version.id },
      data: { status: 'GENERATING', failureCode: null, failureMessage: null },
    });
    await this.queue.add(
      DocumentGenerationJobName.GENERATE_OUTLINE,
      {
        documentId,
        versionId: version.id,
        versionNumber: version.versionNumber,
      },
      {
        jobId: `${DocumentJobId.outline(documentId, version.versionNumber)}:retry:${Date.now()}`,
        ...DEFAULT_JOB_OPTIONS,
      },
    );
    return { retried: true };
  }

  async retrySection(documentId: string, sectionKey: string) {
    const section = await this.prisma.documentGenerationSection.findFirst({
      where: { sectionKey, version: { documentId } },
      include: { version: true },
    });
    if (!section) throw new NotFoundException('Không tìm thấy section.');
    await this.prisma.documentGenerationSection.update({
      where: { id: section.id },
      data: { status: 'PENDING', failureCode: null, failureMessage: null },
    });
    await this.queue.add(
      DocumentGenerationJobName.GENERATE_SECTION,
      {
        documentId,
        versionId: section.versionId,
        versionNumber: section.version.versionNumber,
        sectionKey,
      },
      {
        jobId:
          DocumentJobId.section(
            documentId,
            section.version.versionNumber,
            sectionKey,
          ) + `:retry:${Date.now()}`,
        attempts: getDocumentGenerationJobAttempts(),
        backoff: DEFAULT_JOB_OPTIONS.backoff,
      },
    );
    return { retried: true };
  }
}
