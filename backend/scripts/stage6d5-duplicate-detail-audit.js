/**
 * Stage 6D.5 — read-only detailed audit of duplicate active ListeningSession
 * rows, including answer counts and reward fields already stored on the
 * session itself (xpEarned/coinsEarned). Does NOT modify any data.
 *
 * Note: ListeningSession has no separate createdAt/updatedAt column — the
 * only real timestamp fields are startedAt and completedAt (schema.prisma
 * confirmed in Stage 6D.4). So "updatedAt" and "createdAt" tie-breakers
 * required by the cleanup spec both resolve to startedAt in this schema.
 */
const { PrismaClient } = require('@prisma/client');

function serialize(value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        s."id",
        s."userId",
        s."level",
        s."topic",
        s."status",
        s."startedAt",
        s."completedAt",
        s."total",
        s."correct",
        s."wrong",
        s."skipped",
        s."score",
        s."xpEarned",
        s."coinsEarned",
        s."rating",
        (
          SELECT COUNT(*) FROM "ListeningSessionAnswer" a
          WHERE a."sessionId" = s."id"
            AND (a."selectedAnswer" IS NOT NULL OR a."isSkipped" = true)
        ) AS attempted_answers,
        (
          SELECT COUNT(*) FROM "ListeningSessionAnswer" a
          WHERE a."sessionId" = s."id"
        ) AS total_answer_rows
      FROM "ListeningSession" s
      WHERE s."status" = 'IN_PROGRESS'
      ORDER BY
        s."userId",
        COALESCE(s."level", '__NULL_LEVEL__'),
        COALESCE(s."topic", '__NULL_TOPIC__'),
        s."startedAt";
    `);

    console.log('=== DETAILED_ACTIVE_SESSIONS (count=' + rows.length + ') ===');
    console.log(JSON.stringify(rows, (k, v) => serialize(v), 2));
  } catch (err) {
    console.error('AUDIT_QUERY_ERROR', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
