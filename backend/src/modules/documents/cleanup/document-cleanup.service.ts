import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { DOCUMENT_STORAGE_SERVICE } from '../storage/document-storage.interface';
import type { DocumentStorageService } from '../storage/document-storage.interface';
import {
  getDocumentArchivedVersionRetentionDays,
  getDocumentFailedRetentionDays,
  getDocumentTempRetentionHours,
} from '../../../config/document-storage.config';

/**
 * Scheduled cleanup (spec §33) — never deletes an active/published
 * version, a version currently processing, or anything an admin might
 * still be reviewing. Every deletion path is best-effort: one failed
 * object delete must not abort the whole sweep.
 */
@Injectable()
export class DocumentCleanupService {
  private readonly logger = new Logger(DocumentCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_STORAGE_SERVICE)
    private readonly storage: DocumentStorageService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep() {
    const result = {
      failedVersionsDeleted: 0,
      staleUploadsDeleted: 0,
      archivedVersionsDeleted: 0,
      errors: 0,
    };

    await this.cleanupFailedVersions(result);
    await this.cleanupStaleUploads(result);
    await this.cleanupExpiredArchivedVersions(result);

    this.logger.log(`Document cleanup sweep: ${JSON.stringify(result)}`);
    return result;
  }

  private async cleanupFailedVersions(result: {
    failedVersionsDeleted: number;
    errors: number;
  }) {
    const cutoff = new Date(
      Date.now() - getDocumentFailedRetentionDays() * 24 * 60 * 60 * 1000,
    );
    const failedVersions = await this.prisma.learningDocumentVersion.findMany({
      where: { status: 'FAILED', updatedAt: { lt: cutoff } },
      select: {
        id: true,
        storageKey: true,
        sourceStorageKey: true,
        contentStorageKey: true,
        previewStorageKey: true,
      },
      take: 200,
    });

    for (const version of failedVersions) {
      try {
        await this.deleteObjectsIfPresent(version);
        await this.prisma.documentGenerationSection.deleteMany({
          where: { versionId: version.id },
        });
        result.failedVersionsDeleted += 1;
      } catch (error) {
        result.errors += 1;
        this.logger.warn(
          `Failed cleanup for version ${version.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async cleanupStaleUploads(result: {
    staleUploadsDeleted: number;
    errors: number;
  }) {
    const cutoff = new Date(
      Date.now() - getDocumentTempRetentionHours() * 60 * 60 * 1000,
    );
    const staleDrafts = await this.prisma.learningDocument.findMany({
      where: {
        status: { in: ['DRAFT', 'UPLOADING'] },
        createdAt: { lt: cutoff },
      },
      select: {
        id: true,
        versions: {
          select: {
            id: true,
            storageKey: true,
            sourceStorageKey: true,
            contentStorageKey: true,
            previewStorageKey: true,
          },
        },
      },
      take: 200,
    });

    for (const document of staleDrafts) {
      try {
        for (const version of document.versions) {
          await this.deleteObjectsIfPresent(version);
        }
        result.staleUploadsDeleted += 1;
      } catch (error) {
        result.errors += 1;
        this.logger.warn(
          `Failed stale-upload cleanup for document ${document.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async cleanupExpiredArchivedVersions(result: {
    archivedVersionsDeleted: number;
    errors: number;
  }) {
    const cutoff = new Date(
      Date.now() -
        getDocumentArchivedVersionRetentionDays() * 24 * 60 * 60 * 1000,
    );
    const archived = await this.prisma.learningDocumentVersion.findMany({
      where: { status: 'ARCHIVED', updatedAt: { lt: cutoff } },
      select: {
        id: true,
        sourceStorageKey: true,
        contentStorageKey: true,
        previewStorageKey: true,
        storageKey: true,
        documentId: true,
      },
      take: 200,
    });

    for (const version of archived) {
      // Never delete the object backing the CURRENT active version, even
      // if somehow marked ARCHIVED by a bug elsewhere — belt and braces.
      const document = await this.prisma.learningDocument.findUnique({
        where: { id: version.documentId },
        select: { activeVersionId: true },
      });
      if (document?.activeVersionId === version.id) continue;

      try {
        // Retain the rendered/source file itself for rollback within the
        // retention window's grace — only prune the heavier extracted/
        // preview intermediates, keep storageKey (the actual deliverable)
        // so DocumentAdminService.rollback() can still work if called
        // right at the boundary. Full pruning of `storageKey` is left to
        // a future pass once rollback UX explicitly excludes long-expired
        // versions — documented as a known gap.
        if (version.previewStorageKey)
          await this.storage
            .deleteObject(version.previewStorageKey)
            .catch(() => undefined);
        result.archivedVersionsDeleted += 1;
      } catch (error) {
        result.errors += 1;
        this.logger.warn(
          `Failed archived-version cleanup for ${version.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async deleteObjectsIfPresent(version: {
    storageKey?: string | null;
    sourceStorageKey?: string | null;
    contentStorageKey?: string | null;
    previewStorageKey?: string | null;
  }) {
    const keys = new Set(
      [
        version.storageKey,
        version.sourceStorageKey,
        version.contentStorageKey,
        version.previewStorageKey,
      ].filter((k): k is string => Boolean(k)),
    );
    for (const key of keys) {
      await this.storage.deleteObject(key).catch((error) => {
        this.logger.warn(
          `Failed to delete storage object ${key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
  }
}
