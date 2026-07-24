import { Injectable, Logger } from '@nestjs/common';

export type CacheMetricEvent =
  | 'HIT'
  | 'MISS'
  | 'DB_HIT'
  | 'GEMINI_FALLBACK'
  | 'CACHE_REFRESH'
  | 'GENERATION_PREVENTED_BY_LOCK'
  | 'REDIS_UNAVAILABLE'
  | 'NEGATIVE_HIT';

type Counters = Record<CacheMetricEvent, number>;

const emptyCounters = (): Counters => ({
  HIT: 0,
  MISS: 0,
  DB_HIT: 0,
  GEMINI_FALLBACK: 0,
  CACHE_REFRESH: 0,
  GENERATION_PREVENTED_BY_LOCK: 0,
  REDIS_UNAVAILABLE: 0,
  NEGATIVE_HIT: 0,
});

/**
 * Lightweight in-process counters for the production content cache, backed
 * by NestJS's own Logger (no Prometheus/metrics stack exists in this
 * codebase yet — see docs/production-cache-polish-report.md). Per-request
 * hit/miss counters are aggregated silently; only the rarer, actionable
 * events (Gemini fallback, Redis outage, lock contention) log immediately
 * so production logs aren't spammed with a line per request.
 */
@Injectable()
export class CacheMetricsService {
  private readonly logger = new Logger('CacheMetrics');
  private readonly countersByModule = new Map<string, Counters>();

  record(module: string, event: CacheMetricEvent, detail?: string) {
    const counters = this.countersByModule.get(module) ?? emptyCounters();
    counters[event] += 1;
    this.countersByModule.set(module, counters);

    if (
      event === 'GEMINI_FALLBACK' ||
      event === 'REDIS_UNAVAILABLE' ||
      event === 'GENERATION_PREVENTED_BY_LOCK'
    ) {
      this.logger.log(
        `[${module}] ${event}${detail ? ` — ${detail}` : ''}`,
      );
    } else {
      this.logger.debug(`[${module}] ${event}${detail ? ` — ${detail}` : ''}`);
    }
  }

  recordDuration(module: string, operation: string, durationMs: number) {
    this.logger.log(
      `[${module}] ${operation} took ${durationMs.toFixed(0)}ms`,
    );
  }

  snapshot(): Record<string, Counters> {
    return Object.fromEntries(this.countersByModule.entries());
  }
}
