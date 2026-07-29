import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentReportReason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentAccessPolicyService } from './document-access-policy.service';

const DOWNLOAD_COUNT_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class DocumentInteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: DocumentAccessPolicyService,
  ) {}

  async bookmark(userId: string, documentId: string) {
    await this.assertPublished(documentId);
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.documentBookmark
        .create({ data: { userId, documentId } })
        .catch((error) => {
          if (this.isUniqueConstraintError(error)) return null;
          throw error;
        });
      if (created) {
        await tx.learningDocument.update({
          where: { id: documentId },
          data: { bookmarkCount: { increment: 1 } },
        });
      }
    });
    return { bookmarked: true };
  }

  async unbookmark(userId: string, documentId: string) {
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.documentBookmark
        .delete({ where: { userId_documentId: { userId, documentId } } })
        .catch(() => null);
      if (deleted) {
        await tx.learningDocument.update({
          where: { id: documentId },
          data: { bookmarkCount: { decrement: 1 } },
        });
      }
    });
    return { bookmarked: false };
  }

  async listMyBookmarks(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentBookmark.findMany({
        where: { userId },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverUrl: true,
              category: true,
              level: true,
              source: true,
              ratingAverage: true,
              downloadCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.documentBookmark.count({ where: { userId } }),
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

  async rate(
    userId: string,
    documentId: string,
    value: number,
    comment?: string,
  ) {
    await this.assertPublished(documentId);
    if (value < 1 || value > 5)
      throw new BadRequestException('Đánh giá phải từ 1 đến 5 sao.');

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.documentRating.findUnique({
        where: { userId_documentId: { userId, documentId } },
      });

      if (existing) {
        await tx.documentRating.update({
          where: { userId_documentId: { userId, documentId } },
          data: { value, comment },
        });
      } else {
        await tx.documentRating.create({
          data: { userId, documentId, value, comment },
        });
      }

      // Recompute the aggregate from the source-of-truth rows inside the
      // same transaction — never do `ratingAverage +/- delta` arithmetic,
      // which drifts under concurrent writes (spec §24).
      const agg = await tx.documentRating.aggregate({
        where: { documentId },
        _avg: { value: true },
        _count: { value: true },
      });
      await tx.learningDocument.update({
        where: { id: documentId },
        data: {
          ratingAverage: agg._avg.value ?? 0,
          ratingCount: agg._count.value,
        },
      });
    });

    return { rated: true };
  }

  async report(
    userId: string,
    documentId: string,
    reason: DocumentReportReason,
    description?: string,
  ) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
      select: { id: true, reportCount: true },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');

    const openExisting = await this.prisma.documentReport.findFirst({
      where: {
        documentId,
        reporterId: userId,
        status: { in: ['OPEN', 'REVIEWING'] },
      },
    });
    if (openExisting) {
      throw new BadRequestException(
        'Bạn đã báo cáo tài liệu này và báo cáo đang được xử lý.',
      );
    }

    const REPORT_ESCALATION_THRESHOLD = 5;
    await this.prisma.$transaction(async (tx) => {
      await tx.documentReport.create({
        data: { documentId, reporterId: userId, reason, description },
      });
      const updated = await tx.learningDocument.update({
        where: { id: documentId },
        data: { reportCount: { increment: 1 } },
        select: { reportCount: true, status: true },
      });

      if (
        updated.reportCount >= REPORT_ESCALATION_THRESHOLD &&
        updated.status === 'PUBLISHED'
      ) {
        await tx.learningDocument.update({
          where: { id: documentId },
          data: { status: 'HIDDEN' },
        });
        await tx.documentModerationHistory.create({
          data: {
            documentId,
            action: 'AUTO_HIDE_REPORT_THRESHOLD',
            fromStatus: 'PUBLISHED',
            toStatus: 'HIDDEN',
            isSystemActor: true,
            internalReason: `Auto-hidden after reaching ${updated.reportCount} open reports.`,
          },
        });
      }
    });

    return { reported: true };
  }

  async requestDownload(userId: string, documentId: string, ip?: string) {
    const { version, url } =
      await this.accessPolicy.authorizePublicDownload(documentId);

    const dedupeCutoff = new Date(Date.now() - DOWNLOAD_COUNT_DEDUPE_WINDOW_MS);
    const recent = await this.prisma.documentDownload.findFirst({
      where: { documentId, userId, createdAt: { gte: dedupeCutoff } },
    });

    if (!recent) {
      await this.prisma.$transaction([
        this.prisma.documentDownload.create({
          data: {
            documentId,
            versionId: version.id,
            userId,
            ipHash: ip ? createHash('sha256').update(ip).digest('hex') : null,
          },
        }),
        this.prisma.learningDocument.update({
          where: { id: documentId },
          data: { downloadCount: { increment: 1 } },
        }),
      ]);
    }

    return { url, expiresInSeconds: 300 };
  }

  private async assertPublished(documentId: string) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    if (document.status !== 'PUBLISHED') {
      throw new ForbiddenException('Tài liệu chưa được xuất bản.');
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      (error as { code?: string }).code === 'P2002',
    );
  }
}
