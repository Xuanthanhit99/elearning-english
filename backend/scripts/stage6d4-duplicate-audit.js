/**
 * Stage 6D.4 — read-only duplicate-active-session audit.
 * Does NOT modify any data. Safe to run against the real dev database.
 * Delete this file after the audit is done; it is not meant to be committed.
 */
const { PrismaClient } = require('@prisma/client');

function serialize(value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const duplicateGroups = await prisma.$queryRawUnsafe(`
      SELECT
        "userId",
        COALESCE("level", '__NULL_LEVEL__') AS level_key,
        COALESCE("topic", '__NULL_TOPIC__') AS topic_key,
        COUNT(*) AS active_count,
        array_agg("id") AS session_ids,
        array_agg("status") AS statuses,
        array_agg("startedAt") AS started_at_list,
        array_agg("completedAt") AS completed_at_list
      FROM "ListeningSession"
      WHERE "status" = 'IN_PROGRESS'
      GROUP BY "userId", level_key, topic_key
      HAVING COUNT(*) > 1
      ORDER BY active_count DESC;
    `);

    const totalActive = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total FROM "ListeningSession" WHERE "status" = 'IN_PROGRESS';
    `);

    const nullBreakdown = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE "level" IS NULL) AS null_level_count,
        COUNT(*) FILTER (WHERE "topic" IS NULL) AS null_topic_count,
        COUNT(*) AS total_rows
      FROM "ListeningSession";
    `);

    console.log('=== DUPLICATE_GROUPS_COUNT=' + duplicateGroups.length + ' ===');
    console.log(JSON.stringify(duplicateGroups, (k, v) => serialize(v), 2));
    console.log('=== TOTAL_ACTIVE_SESSIONS ===');
    console.log(JSON.stringify(totalActive, (k, v) => serialize(v), 2));
    console.log('=== NULL_LEVEL_TOPIC_BREAKDOWN (all rows, any status) ===');
    console.log(JSON.stringify(nullBreakdown, (k, v) => serialize(v), 2));
  } catch (err) {
    console.error('AUDIT_QUERY_ERROR', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
