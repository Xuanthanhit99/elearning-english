import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentListQueryDto } from './dto/document-query.dto';

const CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  source: true,
  creationType: true,
  category: true,
  level: true,
  skills: true,
  documentType: true,
  coverUrl: true,
  hasAnswerKey: true,
  hasAudio: true,
  allowDownload: true,
  isFeatured: true,
  aiAssisted: true,
  viewCount: true,
  downloadCount: true,
  ratingAverage: true,
  ratingCount: true,
  publishedAt: true,
  author: { select: { id: true, fullname: true, avatar: true } },
  activeVersion: {
    select: {
      mimeType: true,
      pageCount: true,
      fileSize: true,
      versionNumber: true,
    },
  },
} satisfies Prisma.LearningDocumentSelect;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async slugExists(slug: string): Promise<boolean> {
    const existing = await this.prisma.learningDocument.findUnique({
      where: { slug },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async list(query: DocumentListQueryDto, userId?: string | null) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);

    const where: Prisma.LearningDocumentWhereInput = {
      status: 'PUBLISHED',
      activeVersionId: { not: null },
    };

    if (query.source)
      where.source = query.source === 'beaconvie' ? 'BEACONVIE' : 'COMMUNITY';
    if (query.category) where.category = query.category;
    if (query.level) where.level = query.level;
    if (query.documentType) where.documentType = query.documentType;
    if (query.explanationLanguage)
      where.explanationLanguage = query.explanationLanguage;
    if (query.hasAnswerKey !== undefined)
      where.hasAnswerKey = query.hasAnswerKey;
    if (query.hasAudio !== undefined) where.hasAudio = query.hasAudio;
    if (query.allowDownload !== undefined)
      where.allowDownload = query.allowDownload;
    if (query.skill) {
      where.skills = { array_contains: query.skill };
    }
    if (query.format) {
      where.activeVersion = {
        is: { mimeType: { contains: query.format, mode: 'insensitive' } },
      };
    }
    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { summary: { contains: keyword, mode: 'insensitive' } },
        { category: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.LearningDocumentOrderByWithRelationInput =
      query.sort === 'popular'
        ? { viewCount: 'desc' }
        : query.sort === 'most_downloaded'
          ? { downloadCount: 'desc' }
          : query.sort === 'top_rated'
            ? { ratingAverage: 'desc' }
            : query.sort === 'featured'
              ? { isFeatured: 'desc' }
              : { publishedAt: 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.learningDocument.findMany({
        where,
        select: CARD_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learningDocument.count({ where }),
    ]);

    const bookmarkedIds = await this.getBookmarkedIds(
      userId,
      items.map((i) => i.id),
    );

    return {
      items: items.map((item) => ({
        ...item,
        isBookmarked: bookmarkedIds.has(item.id),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private async getBookmarkedIds(
    userId: string | null | undefined,
    documentIds: string[],
  ) {
    if (!userId || documentIds.length === 0) return new Set<string>();
    const bookmarks = await this.prisma.documentBookmark.findMany({
      where: { userId, documentId: { in: documentIds } },
      select: { documentId: true },
    });
    return new Set(bookmarks.map((b) => b.documentId));
  }

  async getBySlug(slug: string, userId?: string | null) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, fullname: true, avatar: true } },
        activeVersion: true,
      },
    });

    if (
      !document ||
      document.status !== 'PUBLISHED' ||
      !document.activeVersion
    ) {
      throw new NotFoundException('Không tìm thấy tài liệu.');
    }

    const [isBookmarked, myRating] = userId
      ? await Promise.all([
          this.prisma.documentBookmark
            .findUnique({
              where: { userId_documentId: { userId, documentId: document.id } },
            })
            .then(Boolean),
          this.prisma.documentRating.findUnique({
            where: { userId_documentId: { userId, documentId: document.id } },
            select: { value: true, comment: true },
          }),
        ])
      : [false, null];

    const hiddenVersionKeys = ['sourceStorageKey', 'contentStorageKey', 'storageKey', 'previewStorageKey'];
    const safeVersion: Record<string, unknown> = { ...document.activeVersion };
    for (const key of hiddenVersionKeys) delete safeVersion[key];

    return {
      ...document,
      activeVersion: safeVersion,
      isBookmarked,
      myRating,
    };
  }

  async getRelated(documentId: string, limit = 6) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
      select: { category: true, level: true },
    });
    if (!document) return [];

    return this.prisma.learningDocument.findMany({
      where: {
        id: { not: documentId },
        status: 'PUBLISHED',
        category: document.category,
        ...(document.level ? { level: document.level } : {}),
      },
      select: CARD_SELECT,
      orderBy: { viewCount: 'desc' },
      take: limit,
    });
  }

  /** Dedupe window for view counting — one increment per user (or
   * anonymous session id) per document per window, so a page refresh
   * loop can't inflate viewCount (spec §25). */
  private readonly VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;
  private readonly recentViewCache = new Map<string, number>();

  async recordView(documentId: string, dedupeKey: string) {
    const cacheKey = `${documentId}:${dedupeKey}`;
    const lastSeen = this.recentViewCache.get(cacheKey);
    const now = Date.now();
    if (lastSeen && now - lastSeen < this.VIEW_DEDUPE_WINDOW_MS) {
      return { counted: false };
    }
    this.recentViewCache.set(cacheKey, now);
    // Bound the in-memory cache so long-running processes don't leak —
    // simple periodic sweep is enough given this is a soft/best-effort
    // dedupe, not a security control.
    if (this.recentViewCache.size > 50_000) {
      const cutoff = now - this.VIEW_DEDUPE_WINDOW_MS;
      for (const [key, seenAt] of this.recentViewCache) {
        if (seenAt < cutoff) this.recentViewCache.delete(key);
      }
    }

    await this.prisma.learningDocument.updateMany({
      where: { id: documentId, status: 'PUBLISHED' },
      data: { viewCount: { increment: 1 } },
    });
    return { counted: true };
  }
}
