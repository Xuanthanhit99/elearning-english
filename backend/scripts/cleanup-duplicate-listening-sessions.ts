/**
 * Stage 6D.5 — Cleanup duplicate active ListeningSession rows before
 * applying migration 20260719120000_add_listening_active_session_unique.
 *
 * Business key (matches the migration's partial unique index exactly):
 *   ("userId", COALESCE("level", '__NULL_LEVEL__'), COALESCE("topic", '__NULL_TOPIC__'))
 *   WHERE "status" = 'IN_PROGRESS'
 *
 * Tie-break rule for which session to KEEP within a duplicate group
 * (per Stage 6D.5 spec):
 *   1. Most "attempted" answers (selectedAnswer IS NOT NULL OR isSkipped = true)
 *   2. Most recent updatedAt
 *   3. Most recent createdAt
 *
 * NOTE: `ListeningSession` has no separate createdAt/updatedAt column in the
 * real schema (verified in Stage 6D.4/6D.5 audits) — the only real
 * timestamp field is `startedAt` (plus `completedAt`, which is always null
 * for IN_PROGRESS rows). So tie-break rules #2 and #3 both resolve to
 * `startedAt` here; this is documented, not guessed.
 *
 * Sessions NOT kept are NOT deleted and NOT marked COMPLETED. They are
 * marked status = 'ABANDONED' (a new literal value; `status` is a free
 * String column, not a Prisma enum, so this requires no schema migration).
 * This decision was explicitly confirmed by the project owner on
 * 2026-07-18 (Stage 6D.5) after reviewing the pros/cons of ABANDONED vs.
 * hard-delete.
 *
 * KNOWN ISSUE (out of scope for this script, flagged for a future stage):
 * `assertSessionEditable()` and `finishSession()` in listening.service.ts
 * currently only special-case `status === 'COMPLETED'`. They do not yet
 * special-case 'ABANDONED'. This means an abandoned session could in
 * theory still be edited/finished (and rewarded) if a user has its
 * sessionId. This script does not fix that — it is a Listening-logic
 * change, not a cleanup change, and is explicitly out of scope here.
 *
 * Safety:
 *   - Read-only by default (dry run). Only `--apply` performs writes.
 *   - Every write happens inside a single Prisma interactive transaction;
 *     any error rolls back the entire batch (no partial cleanup).
 *   - Before abandoning any session, re-checks xpEarned/coinsEarned/rating
 *     are all zero/null (reward audit safety net) and REFUSES to touch a
 *     session that shows any reward signal, even if that means leaving a
 *     duplicate in place (safety over completeness).
 *   - Idempotent: sessions already not in status IN_PROGRESS are never
 *     selected again by the grouping query, so re-running this script
 *     after a successful apply is a safe no-op (0 groups found).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NULL_LEVEL_SENTINEL = '__NULL_LEVEL__';
const NULL_TOPIC_SENTINEL = '__NULL_TOPIC__';
const ABANDONED_STATUS = 'ABANDONED';

type ActiveSessionRow = {
  id: string;
  userId: string;
  level: string | null;
  topic: string | null;
  startedAt: Date;
  completedAt: Date | null;
  xpEarned: number;
  coinsEarned: number;
  rating: number | null;
  attemptedAnswers: bigint;
};

type Group = {
  userId: string;
  levelKey: string;
  topicKey: string;
  sessions: ActiveSessionRow[];
};

async function loadDuplicateGroups(): Promise<Group[]> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      userId: string;
      level: string | null;
      topic: string | null;
      startedAt: Date;
      completedAt: Date | null;
      xpEarned: number;
      coinsEarned: number;
      rating: number | null;
      attemptedAnswers: bigint;
    }>
  >(`
    SELECT
      s."id",
      s."userId",
      s."level",
      s."topic",
      s."startedAt",
      s."completedAt",
      s."xpEarned",
      s."coinsEarned",
      s."rating",
      (
        SELECT COUNT(*) FROM "ListeningSessionAnswer" a
        WHERE a."sessionId" = s."id"
          AND (a."selectedAnswer" IS NOT NULL OR a."isSkipped" = true)
      ) AS "attemptedAnswers"
    FROM "ListeningSession" s
    WHERE s."status" = 'IN_PROGRESS'
    ORDER BY s."userId", s."level", s."topic", s."startedAt";
  `);

  const groups = new Map<string, Group>();

  for (const row of rows) {
    const levelKey = row.level ?? NULL_LEVEL_SENTINEL;
    const topicKey = row.topic ?? NULL_TOPIC_SENTINEL;
    const groupKey = `${row.userId}::${levelKey}::${topicKey}`;

    const existing = groups.get(groupKey);
    if (existing) {
      existing.sessions.push(row);
    } else {
      groups.set(groupKey, {
        userId: row.userId,
        levelKey,
        topicKey,
        sessions: [row],
      });
    }
  }

  return Array.from(groups.values()).filter((g) => g.sessions.length > 1);
}

function pickSessionToKeep(sessions: ActiveSessionRow[]): ActiveSessionRow {
  return [...sessions].sort((a, b) => {
    // 1. Most attempted answers wins.
    if (a.attemptedAnswers !== b.attemptedAnswers) {
      return a.attemptedAnswers > b.attemptedAnswers ? -1 : 1;
    }
    // 2/3. startedAt is the only real timestamp available (see file header);
    // most recent wins.
    return b.startedAt.getTime() - a.startedAt.getTime();
  })[0];
}

function hasAnyRewardSignal(session: ActiveSessionRow): boolean {
  return (
    session.xpEarned !== 0 ||
    session.coinsEarned !== 0 ||
    session.rating !== null ||
    session.completedAt !== null
  );
}

async function main() {
  const apply = process.argv.includes('--apply');

  console.log(
    `=== Stage 6D.5 duplicate Listening session cleanup — mode: ${
      apply ? 'APPLY (will write)' : 'DRY RUN (no writes)'
    } ===`,
  );

  const groups = await loadDuplicateGroups();

  if (groups.length === 0) {
    console.log(
      'No duplicate active ListeningSession groups found. Nothing to do (idempotent no-op).',
    );
    await prisma.$disconnect();
    return;
  }

  let totalKept = 0;
  let totalAbandoned = 0;
  let totalSkippedForSafety = 0;
  const abandonPlan: { sessionId: string; groupKey: string }[] = [];
  const skippedForSafety: { sessionId: string; groupKey: string; reason: string }[] = [];

  for (const group of groups) {
    const groupKey = `userId=${group.userId} level=${group.levelKey} topic=${group.topicKey}`;
    const keep = pickSessionToKeep(group.sessions);
    totalKept += 1;

    console.log(`\n--- Group: ${groupKey} (${group.sessions.length} active sessions) ---`);
    console.log(
      `  KEEP    -> ${keep.id} (attemptedAnswers=${keep.attemptedAnswers}, startedAt=${keep.startedAt.toISOString()})`,
    );

    for (const session of group.sessions) {
      if (session.id === keep.id) continue;

      if (hasAnyRewardSignal(session)) {
        totalSkippedForSafety += 1;
        skippedForSafety.push({
          sessionId: session.id,
          groupKey,
          reason: `reward signal detected (xpEarned=${session.xpEarned}, coinsEarned=${session.coinsEarned}, rating=${session.rating}, completedAt=${session.completedAt}) — REFUSING to abandon, manual review required`,
        });
        console.log(
          `  SKIP!!  -> ${session.id} has a reward signal — NOT touching this session. Manual review required.`,
        );
        continue;
      }

      totalAbandoned += 1;
      abandonPlan.push({ sessionId: session.id, groupKey });
      console.log(
        `  ABANDON -> ${session.id} (attemptedAnswers=${session.attemptedAnswers}, startedAt=${session.startedAt.toISOString()})`,
      );
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Duplicate groups found: ${groups.length}`);
  console.log(`Sessions kept (unchanged): ${totalKept}`);
  console.log(`Sessions to mark ABANDONED: ${totalAbandoned}`);
  console.log(`Sessions skipped for safety (reward signal): ${totalSkippedForSafety}`);

  if (skippedForSafety.length > 0) {
    console.log('\n!!! Sessions requiring manual review before any cleanup:');
    for (const s of skippedForSafety) {
      console.log(`  - ${s.sessionId} (${s.groupKey}): ${s.reason}`);
    }
  }

  if (!apply) {
    console.log(
      '\nDry run complete. No data was changed. Re-run with --apply to perform the update.',
    );
    await prisma.$disconnect();
    return;
  }

  if (abandonPlan.length === 0) {
    console.log('\nNothing to apply (all candidates were skipped for safety, or none found).');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nApplying: marking ${abandonPlan.length} session(s) as '${ABANDONED_STATUS}' inside a single transaction...`);

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of abandonPlan) {
        const result = await tx.listeningSession.updateMany({
          where: {
            id: item.sessionId,
            status: 'IN_PROGRESS', // idempotency guard: only touch rows still IN_PROGRESS
          },
          data: {
            status: ABANDONED_STATUS,
          },
        });

        if (result.count !== 1) {
          throw new Error(
            `Expected to update exactly 1 row for session ${item.sessionId}, updated ${result.count}. Rolling back entire batch.`,
          );
        }
      }
    });

    console.log(`\nAPPLY SUCCESS: ${abandonPlan.length} session(s) marked '${ABANDONED_STATUS}'.`);
  } catch (error) {
    console.error(
      '\nAPPLY FAILED — transaction rolled back, NO data was changed.',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error('FATAL ERROR', error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
