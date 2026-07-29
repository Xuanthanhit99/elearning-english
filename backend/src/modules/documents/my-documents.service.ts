import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMyDocumentDto } from './dto/document-interaction.dto';
import { assertDocumentTransition } from './state/document-status.state-machine';

@Injectable()
export class MyDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.learningDocument.findMany({
        where: { authorId: userId, creationType: 'USER_UPLOAD' },
        include: {
          activeVersion: {
            select: { versionNumber: true, status: true, pageCount: true },
          },
          moderation: {
            select: {
              decision: true,
              rejectionReasons: true,
              requiredChanges: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learningDocument.count({
        where: { authorId: userId, creationType: 'USER_UPLOAD' },
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

  async getOne(userId: string, documentId: string) {
    const document = await this.prisma.learningDocument.findFirst({
      where: { id: documentId, authorId: userId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        moderation: true,
        moderationHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
        processingEvents: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    if (!document)
      throw new NotFoundException('Không tìm thấy tài liệu của bạn.');
    return this.stripStorageKeys(document);
  }

  async update(userId: string, documentId: string, dto: UpdateMyDocumentDto) {
    const document = await this.assertOwnedEditable(userId, documentId);
    return this.prisma.learningDocument.update({
      where: { id: document.id },
      data: dto,
    });
  }

  async remove(userId: string, documentId: string) {
    const document = await this.prisma.learningDocument.findFirst({
      where: { id: documentId, authorId: userId },
      select: { id: true, status: true },
    });
    if (!document)
      throw new NotFoundException('Không tìm thấy tài liệu của bạn.');
    if (!['DRAFT', 'FAILED', 'REJECTED'].includes(document.status)) {
      throw new ForbiddenException(
        'Chỉ có thể xoá tài liệu ở trạng thái nháp, thất bại hoặc bị từ chối.',
      );
    }
    await this.prisma.learningDocument.update({
      where: { id: document.id },
      data: { status: 'REMOVED' },
    });
    return { removed: true };
  }

  async assertOwnedEditable(userId: string, documentId: string) {
    const document = await this.prisma.learningDocument.findFirst({
      where: { id: documentId, authorId: userId },
    });
    if (!document)
      throw new NotFoundException('Không tìm thấy tài liệu của bạn.');
    if (
      !['DRAFT', 'CHANGES_REQUESTED', 'REJECTED', 'FAILED'].includes(
        document.status,
      )
    ) {
      throw new ForbiddenException(
        'Chỉ có thể chỉnh sửa tài liệu ở trạng thái nháp, cần sửa, bị từ chối hoặc thất bại.',
      );
    }
    return document;
  }

  async assertResubmittable(userId: string, documentId: string) {
    const document = await this.prisma.learningDocument.findFirst({
      where: { id: documentId, authorId: userId },
      include: {
        moderationHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!document)
      throw new NotFoundException('Không tìm thấy tài liệu của bạn.');
    if (
      !['CHANGES_REQUESTED', 'REJECTED', 'FAILED'].includes(document.status)
    ) {
      throw new BadRequestException(
        'Tài liệu hiện không ở trạng thái có thể gửi lại.',
      );
    }
    const lastDecision = document.moderationHistory[0];
    if (lastDecision && lastDecision.allowResubmission === false) {
      throw new ForbiddenException('Tài liệu này không được phép gửi lại.');
    }
    assertDocumentTransition(document.status, 'UPLOADING');
    return document;
  }

  private stripStorageKeys<
    T extends { versions: Array<Record<string, unknown>> },
  >(document: T) {
    const hiddenKeys = ['storageKey', 'sourceStorageKey', 'contentStorageKey'];
    return {
      ...document,
      versions: document.versions.map((v) => {
        const rest: Record<string, unknown> = { ...v };
        for (const key of hiddenKeys) delete rest[key];
        return rest;
      }),
    };
  }
}
