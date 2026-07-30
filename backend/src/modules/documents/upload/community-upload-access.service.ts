import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  getDocumentCommunityUploadAllowedEmails,
  getDocumentCommunityUploadAllowedUserIds,
  isDocumentCommunityUploadEnabled,
} from '../../../config/document-storage.config';

export interface CommunityUploadAccessUser {
  id: string;
  email?: string;
  role: string;
}

/**
 * Backend enforcement for community-upload internal beta (spec: the
 * frontend hiding a button is UX only, this is the real gate — every
 * endpoint that can introduce a new file into the community pipeline
 * calls this, not just the initial upload). ADMIN always passes so
 * staff can test regardless of the beta flag/allowlist. When the flag
 * is off, only an explicit allowlist match (by user id or, case-
 * insensitively, by email) is allowed.
 */
@Injectable()
export class CommunityDocumentUploadAccessService {
  isAllowed(user: CommunityUploadAccessUser): boolean {
    if (user.role === 'ADMIN') return true;
    if (isDocumentCommunityUploadEnabled()) return true;

    const allowedUserIds = getDocumentCommunityUploadAllowedUserIds();
    if (allowedUserIds.includes(user.id)) return true;

    const normalizedEmail = user.email?.trim().toLowerCase();
    if (normalizedEmail) {
      const allowedEmails = getDocumentCommunityUploadAllowedEmails();
      if (allowedEmails.includes(normalizedEmail)) return true;
    }

    return false;
  }

  assertAllowed(user: CommunityUploadAccessUser): void {
    if (!this.isAllowed(user)) {
      throw new ForbiddenException(
        'Tính năng đăng tải tài liệu cộng đồng hiện đang trong giai đoạn thử nghiệm nội bộ.',
      );
    }
  }
}
