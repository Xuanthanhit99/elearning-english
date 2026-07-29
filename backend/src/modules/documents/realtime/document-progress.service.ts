import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentProgressGateway } from './document-progress.gateway';

/**
 * Single writer for processing/generation progress — every pipeline step
 * (community upload processor, Gemini generation processor) reports
 * through here so the DB timeline (DocumentProcessingEvent + the
 * denormalized LearningDocumentVersion.currentStep/generationProgress
 * columns used for fast reads) and the realtime gateway push never drift
 * apart. Never marks 100% unless `progress` says so explicitly — no
 * caller should invent its own "done" shortcut (spec §28).
 */
@Injectable()
export class DocumentProgressService {
  private readonly logger = new Logger(DocumentProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: DocumentProgressGateway,
  ) {}

  async report(input: {
    documentId: string;
    versionId?: string | null;
    step: string;
    status: string;
    progress: number;
    message?: string;
    metadata?: Record<string, unknown>;
  }) {
    const progress = Math.max(0, Math.min(100, Math.round(input.progress)));

    await this.prisma.documentProcessingEvent.create({
      data: {
        documentId: input.documentId,
        versionId: input.versionId ?? null,
        step: input.step,
        status: input.status,
        progress,
        message: input.message,
        metadata: input.metadata as never,
      },
    });

    if (input.versionId) {
      await this.prisma.learningDocumentVersion
        .update({
          where: { id: input.versionId },
          data: { currentStep: input.step, generationProgress: progress },
        })
        .catch((error) => {
          // A version row might not exist yet for the very first
          // UPLOAD_RECEIVED event on some pipelines — never let a
          // progress-report failure break the underlying pipeline.
          this.logger.warn(
            `Failed to update version progress ${input.versionId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
    }

    this.gateway.emitProgress({
      documentId: input.documentId,
      versionId: input.versionId ?? null,
      status: input.status,
      progress,
      currentStep: input.message ?? input.step,
    });
  }

  async reportFailure(input: {
    documentId: string;
    versionId?: string | null;
    step: string;
    message: string;
  }) {
    await this.prisma.documentProcessingEvent.create({
      data: {
        documentId: input.documentId,
        versionId: input.versionId ?? null,
        step: input.step,
        status: 'FAILED',
        progress: 0,
        message: input.message,
      },
    });
    this.gateway.emitFailed(input.documentId, {
      versionId: input.versionId ?? null,
      message: input.message,
    });
  }
}
