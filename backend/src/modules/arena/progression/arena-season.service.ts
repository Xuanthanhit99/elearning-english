import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ArenaSeason, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Default season length for the F1 bootstrap season — no close/rollover job exists yet (F2 scope); this only needs to be "long enough" for F1's purposes. */
const getArenaSeasonDurationDays = () => envInt('ARENA_SEASON_DURATION_DAYS', 30);

/**
 * Arena's own season lifecycle — deliberately NOT `LeaderboardSeason`. See
 * docs/arena-phase-f-design.md Part 11 (F0.5-4) for the verified reason:
 * `XpService`'s own "find the active season" query does not filter by
 * period type, so inserting Arena rows into that table risks corrupting
 * the weekly XP league for the whole app. This service never reads from or
 * writes to `LeaderboardSeason`.
 *
 * F1 scope only: season resolution + a single bootstrap season + the
 * overlap-prevention invariant on creation. No close/rollover/reward job —
 * that's F2 (see docs/arena-progression-sequence.md §11).
 */
@Injectable()
export class ArenaSeasonService implements OnModuleInit {
  private readonly logger = new Logger(ArenaSeasonService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Explicit, code-visible bootstrap — not a silent fallback invoked from
    // the match-finish hot path. If this fails (e.g. DB not reachable yet
    // during some deployment ordering), it only logs — the rest of Arena
    // must keep working with no active season (nullable `seasonId`
    // everywhere), never crash the whole module on this.
    try {
      await this.ensureActiveSeason();
    } catch (error) {
      this.logger.error(
        `Failed to ensure an active Arena season at startup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Read-only, safe under concurrency by construction (a plain indexed
   * read — no write, no race to guard). Returns `null` if none exists;
   * callers must treat that as "no season scoping for this operation,"
   * never as an error — Arena's core match/reward flow must keep working
   * even with zero seasons configured (matches pre-F1 behavior, which had
   * no season concept at all).
   */
  async getActiveSeason(
    client: Pick<PrismaService, 'arenaSeason'> = this.prisma,
  ): Promise<ArenaSeason | null> {
    const now = new Date();
    return client.arenaSeason.findFirst({
      where: {
        isActive: true,
        status: 'ACTIVE',
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { startsAt: 'desc' },
    });
  }

  /**
   * Idempotent — a no-op if an active season already covers "now". Only
   * ever called from `onModuleInit` (or tests); never from a per-request
   * path, so it cannot race with itself under normal operation. Still
   * transaction-guarded (not a distributed lock) in case multiple app
   * instances start concurrently.
   */
  async ensureActiveSeason(): Promise<ArenaSeason> {
    const existing = await this.getActiveSeason();
    if (existing) return existing;

    const now = new Date();
    const endsAt = new Date(now.getTime() + getArenaSeasonDurationDays() * 24 * 60 * 60 * 1000);
    try {
      return await this.createSeason({
        name: `Arena Season ${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
        startsAt: now,
        endsAt,
      });
    } catch (error) {
      // Lost a startup race against another instance creating the same
      // bootstrap season — that's fine, re-read and use whatever won.
      const winner = await this.getActiveSeason();
      if (winner) return winner;
      throw error;
    }
  }

  /**
   * Prevents overlapping active seasons via a Serializable check-then-insert
   * transaction (database transaction as the correctness foundation, not a
   * distributed lock, per docs/arena-progression-sequence.md §10). This is
   * a deliberately rare, administrative operation (season creation, not
   * per-match), so — unlike the hot per-match XP path — it is not wrapped
   * in the P2034 retry helper; an occasional conflict here is acceptable
   * to surface to the caller rather than silently retry.
   */
  async createSeason(input: { name: string; startsAt: Date; endsAt: Date }): Promise<ArenaSeason> {
    return this.prisma.$transaction(
      async (tx) => {
        const overlapping = await tx.arenaSeason.findFirst({
          where: {
            isActive: true,
            startsAt: { lt: input.endsAt },
            endsAt: { gt: input.startsAt },
          },
        });
        if (overlapping) {
          throw new ConflictException(
            `An active Arena season (${overlapping.id}) already overlaps this date range.`,
          );
        }

        return tx.arenaSeason.create({
          data: {
            name: input.name,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            status: 'ACTIVE',
            isActive: true,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
