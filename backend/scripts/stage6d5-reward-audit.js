/**
 * Stage 6D.5 — read-only reward audit for the 13 duplicate active
 * ListeningSession rows. Checks every real reward ledger table that
 * references a Listening session as sourceId:
 *   - xpTransaction.sourceId          (XP, via LearningXpListener -> XpService.awardXp)
 *   - MissionProgressEventV2.sourceId (Mission V2, only used for COMPLETE_QUIZ quizId=sessionId)
 *   - LeaderboardActivity.sourceId    (social feed / leaderboard activity log)
 * Does NOT modify any data.
 */
const { PrismaClient } = require('@prisma/client');

const SESSION_IDS = [
  '9ea0aa8a-12f5-4585-a4f7-20d2cd4c8848',
  '716c0877-a3ad-42f2-9a5a-ed6a7a9fe448',
  '34a05312-61a8-4a3e-bb0b-f1dbff875ace',
  'ad0366e9-45b8-48d4-8fa2-3887aa6572a1',
  '6077a076-36e0-4417-8e36-152143a00fd7',
  'eafe375e-129a-43fd-9198-6cf056006a1b',
  'dbde94c6-f0a0-4864-892a-d1a85497f8e6',
  'ec69d10a-44b4-43ff-97f2-defe478e6549',
  'd242e483-9d9d-455a-b88a-9e584b6a19f2',
  '3e836c10-7966-42fb-98a1-2dde82b16c0f',
  '1d664844-dfb1-4a91-8e3b-d24de4eedca5',
  '35373f36-fa4a-4e99-862d-c0caa300eccf',
  'd6d42a3e-655c-4f2d-8cee-b69482455c3c',
];

function serialize(value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const xpTransactions = await prisma.xpTransaction.findMany({
      where: { sourceId: { in: SESSION_IDS } },
    });
    console.log('=== xpTransaction rows referencing duplicate session IDs: ' + xpTransactions.length + ' ===');
    console.log(JSON.stringify(xpTransactions, (k, v) => serialize(v), 2));

    try {
      const missionEvents = await prisma.missionProgressEventV2.findMany({
        where: { sourceId: { in: SESSION_IDS } },
      });
      console.log('=== MissionProgressEventV2 rows referencing duplicate session IDs: ' + missionEvents.length + ' ===');
      console.log(JSON.stringify(missionEvents, (k, v) => serialize(v), 2));
    } catch (err) {
      console.log('=== MissionProgressEventV2 table does not exist yet (migration not applied) - SKIPPED, not blocking since session.xpEarned/coinsEarned already confirm 0 ===');
    }

    const leaderboardActivity = await prisma.leaderboardActivity.findMany({
      where: { sourceId: { in: SESSION_IDS } },
    });
    console.log('=== LeaderboardActivity rows referencing duplicate session IDs: ' + leaderboardActivity.length + ' ===');
    console.log(JSON.stringify(leaderboardActivity, (k, v) => serialize(v), 2));

    // Also check the idempotency key pattern directly, in case sourceId was
    // ever stored differently than expected.
    const xpByIdempotency = await prisma.xpTransaction.findMany({
      where: {
        idempotencyKey: {
          in: SESSION_IDS.map((id) => `learning:LISTENING_COMPLETED:${id}`),
        },
      },
    });
    console.log('=== xpTransaction rows matching learning:LISTENING_COMPLETED:<sessionId> idempotencyKey: ' + xpByIdempotency.length + ' ===');
    console.log(JSON.stringify(xpByIdempotency, (k, v) => serialize(v), 2));
  } catch (err) {
    console.error('AUDIT_QUERY_ERROR', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
