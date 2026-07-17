import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditLogInput = {
  userId: string;
  action: string;
  changedFields?: string[];
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Minimal, dependency-free audit log writer.
 * Never persists passwords, tokens, secrets or OTP codes — callers must
 * ensure `metadata` does not include sensitive values.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          changedFields: input.changedFields ?? [],
          metadata: input.metadata,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (error) {
      // Audit logging must never break the primary business flow.
      this.logger.error(
        `Failed to write audit log: action=${input.action}, userId=${input.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
