import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AiUsageRecordInput = {
  module: string;
  success: boolean;
  timedOut?: boolean;
  durationMs: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  errorType?: string | null;
  userId?: string | null;
};

/**
 * Aggregate-only Gemini usage instrumentation (Part 9) — never stores
 * prompt/response content, only counts/timing/module attribution. Write
 * failures are swallowed (logged, never thrown) so a logging hiccup can
 * never break the actual AI call it's instrumenting — same discipline as
 * AuditLogService.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AiUsageRecordInput) {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          module: input.module,
          success: input.success,
          timedOut: input.timedOut ?? false,
          durationMs: input.durationMs,
          promptTokens: input.promptTokens ?? null,
          completionTokens: input.completionTokens ?? null,
          errorType: input.errorType ?? null,
          userId: input.userId ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record AI usage for module=${input.module}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async getSummary(params: { fromDays?: number } = {}) {
    const from = new Date(
      Date.now() - (params.fromDays ?? 30) * 24 * 60 * 60 * 1000,
    );

    const [totals, byModule, byDay] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: from } },
        _count: { _all: true },
        _avg: { durationMs: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['module'],
        where: { createdAt: { gte: from } },
        _count: { _all: true },
        _avg: { durationMs: true },
      }),
      this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
        FROM "AiUsageLog"
        WHERE "createdAt" >= ${from}
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    const [successCount, failureCount, timeoutCount] = await Promise.all([
      this.prisma.aiUsageLog.count({
        where: { createdAt: { gte: from }, success: true },
      }),
      this.prisma.aiUsageLog.count({
        where: { createdAt: { gte: from }, success: false },
      }),
      this.prisma.aiUsageLog.count({
        where: { createdAt: { gte: from }, timedOut: true },
      }),
    ]);

    return {
      windowDays: params.fromDays ?? 30,
      totalRequests: totals._count._all,
      successCount,
      failureCount,
      timeoutCount,
      averageDurationMs: Math.round(totals._avg.durationMs ?? 0),
      byModule: byModule.map((m) => ({
        module: m.module,
        requests: m._count._all,
        averageDurationMs: Math.round(m._avg.durationMs ?? 0),
      })),
      dailyTrend: byDay.map((d) => ({ day: d.day, count: Number(d.count) })),
      note: 'Aggregated counts and timing only — no prompt/response content is ever stored. Token counts are only populated for call sites that report them from the Gemini SDK response.',
    };
  }

  /** Simple per-user request count in the window — a coarse abuse indicator, not a hard limit. */
  async getTopUsers(params: { fromDays?: number; limit?: number } = {}) {
    const from = new Date(
      Date.now() - (params.fromDays ?? 7) * 24 * 60 * 60 * 1000,
    );
    const grouped = await this.prisma.aiUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: from }, userId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { userId: 'desc' } },
      take: params.limit ?? 20,
    });
    return grouped.map((g) => ({ userId: g.userId, requests: g._count._all }));
  }
}
