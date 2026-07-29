import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DOCUMENT_STORAGE_SERVICE } from './storage/document-storage.interface';
import type { DocumentStorageService } from './storage/document-storage.interface';
import { getDocumentSignedUrlTtlSeconds } from '../../config/document-storage.config';

/**
 * The ONLY place allowed to hand out a presigned download URL. Every
 * condition here mirrors spec §21 literally — do not shortcut any of
 * them, and never widen this to "file exists" as sole proof of
 * readiness (a version mid-generation can have a storageKey with a
 * half-written object).
 */
@Injectable()
export class DocumentAccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOCUMENT_STORAGE_SERVICE)
    private readonly storage: DocumentStorageService,
  ) {}

  async authorizePublicDownload(documentId: string) {
    const document = await this.prisma.learningDocument.findUnique({
      where: { id: documentId },
      include: { activeVersion: true },
    });

    if (!document) throw new NotFoundException('Không tìm thấy tài liệu.');
    if (document.status !== 'PUBLISHED') {
      throw new ForbiddenException('Tài liệu chưa được xuất bản.');
    }
    if (!document.allowDownload) {
      throw new ForbiddenException('Tài liệu này không cho phép tải xuống.');
    }
    if (!document.activeVersionId || !document.activeVersion) {
      throw new ForbiddenException('Tài liệu chưa có phiên bản khả dụng.');
    }
    const version = document.activeVersion;
    if (version.status !== 'PUBLISHED') {
      throw new ForbiddenException(
        'Phiên bản hiện tại của tài liệu chưa sẵn sàng.',
      );
    }
    if (!version.storageKey) {
      throw new ForbiddenException('Tài liệu chưa có file để tải.');
    }
    if (!version.checksum) {
      throw new ForbiddenException('Tài liệu chưa hoàn tất kiểm tra toàn vẹn.');
    }

    const exists = await this.storage.objectExists(version.storageKey);
    if (!exists) {
      throw new NotFoundException(
        'File tài liệu không tồn tại trên hệ thống lưu trữ.',
      );
    }

    const url = await this.storage.createPresignedDownloadUrl(
      version.storageKey,
      getDocumentSignedUrlTtlSeconds(),
    );

    return { document, version, url };
  }

  /** Admin-only review download — bypasses the PUBLISHED requirement
   * (admins must be able to review pending/rejected files) but still
   * requires a real, existing storageKey. Callers MUST have already
   * checked the caller is ADMIN before calling this. */
  async authorizeAdminReviewDownload(versionId: string) {
    const version = await this.prisma.learningDocumentVersion.findUnique({
      where: { id: versionId },
    });
    if (!version)
      throw new NotFoundException('Không tìm thấy phiên bản tài liệu.');
    const storageKey = version.sourceStorageKey ?? version.storageKey;
    if (!storageKey) {
      throw new ForbiddenException('Phiên bản này chưa có file nguồn.');
    }
    const exists = await this.storage.objectExists(storageKey);
    if (!exists) {
      throw new NotFoundException(
        'File nguồn không tồn tại trên hệ thống lưu trữ.',
      );
    }
    const url = await this.storage.createPresignedDownloadUrl(
      storageKey,
      getDocumentSignedUrlTtlSeconds(),
    );
    return { version, url };
  }
}
