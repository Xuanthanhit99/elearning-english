import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';

// A runaway/slow query was previously invisible in production until it
// manifested as a timeout or a user complaint — no query logging or slow-query
// threshold existed at all. `PRISMA_SLOW_QUERY_MS` keeps the threshold an env
// var rather than a hardcoded constant (0 disables the check entirely).
const SLOW_QUERY_THRESHOLD_MS = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 500);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });

    super({
      adapter,
      log: SLOW_QUERY_THRESHOLD_MS > 0
        ? [{ emit: 'event', level: 'query' }]
        : [],
    });

    if (SLOW_QUERY_THRESHOLD_MS > 0) {
      (this as unknown as { $on(event: 'query', cb: (e: Prisma.QueryEvent) => void) }).$on(
        'query',
        (event) => {
          if (event.duration >= SLOW_QUERY_THRESHOLD_MS) {
            this.logger.warn(
              `Slow query (${event.duration}ms): ${event.query}`,
            );
          }
        },
      );
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
