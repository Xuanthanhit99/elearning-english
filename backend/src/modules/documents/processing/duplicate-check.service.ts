import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DuplicateCheckService {
  constructor(private readonly prisma: PrismaService) {}

  /** Normalizes whitespace/case before hashing so trivial re-formatting
   * (extra spaces, line breaks) doesn't defeat duplicate detection. */
  computeContentHash(extractedText: string): string {
    const normalized = extractedText.toLowerCase().replace(/\s+/g, ' ').trim();
    return createHash('sha256').update(normalized).digest('hex');
  }

  async findDuplicateByChecksum(checksum: string, excludeDocumentId: string) {
    return this.prisma.learningDocumentVersion.findFirst({
      where: {
        checksum,
        documentId: { not: excludeDocumentId },
        status: { in: ['PUBLISHED', 'READY_FOR_REVIEW', 'APPROVED'] },
      },
      select: { id: true, documentId: true, versionNumber: true },
    });
  }

  async findDuplicateByContentHash(
    contentHash: string,
    excludeDocumentId: string,
  ) {
    return this.prisma.learningDocumentVersion.findFirst({
      where: {
        contentHash,
        documentId: { not: excludeDocumentId },
        status: { in: ['PUBLISHED', 'READY_FOR_REVIEW', 'APPROVED'] },
      },
      select: { id: true, documentId: true, versionNumber: true },
    });
  }
}
