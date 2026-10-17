import { LeaderboardSeasonStatus, Prisma, XpSourceType } from '@prisma/client';

/** Call only after successful claim CAS, inside the same Serializable transaction. */
export async function creditRewardXp(tx: Prisma.TransactionClient, args: {
  userId: string; assignmentId: string; xp: number; reason: string;
  rewardId: string; seasonId: string | null;
}) {
  if (!Number.isSafeInteger(args.xp) || args.xp < 0) throw new Error('Invalid reward XP');
  if (args.xp === 0) return;
  const key = `leaderboard-reward:${args.assignmentId}`;
  const prior = await tx.xpTransaction.findUnique({ where: { idempotencyKey: key } });
  if (prior) throw new Error(`Duplicate reward XP ledger: ${key}`);
  const profile = await tx.userXpProfile.upsert({
    where: { userId: args.userId }, create: { userId: args.userId, totalXp: 0 }, update: {},
  });
  const nextTotal = profile.totalXp + args.xp;
  if (!Number.isSafeInteger(nextTotal)) throw new Error('XP overflow');
  const level = Math.max(1, Math.floor(Math.sqrt(nextTotal / 100)) + 1);
  await tx.userXpProfile.update({
    where: { id: profile.id },
    data: { totalXp: { increment: args.xp }, currentLevel: level, lastXpEarnedAt: new Date() },
  });
  await tx.user.update({ where: { id: args.userId }, data: { xp: nextTotal, level } });
  await tx.xpTransaction.create({ data: {
    userId: args.userId, xpProfileId: profile.id,
    sourceType: XpSourceType.ADMIN_ADJUSTMENT, sourceId: args.assignmentId,
    baseXp: args.xp, finalXp: args.xp, reason: args.reason, idempotencyKey: key,
    metadata: { source: 'LEADERBOARD_REWARD', rewardId: args.rewardId, seasonId: args.seasonId },
  } });
  const season = await tx.leaderboardSeason.findFirst({ where: {
    isActive: true, status: LeaderboardSeasonStatus.ACTIVE,
    startsAt: { lte: new Date() }, endsAt: { gt: new Date() },
  } });
  if (!season || profile.optedOut) return;
  let entry = await tx.leaderboardEntry.findFirst({
    where: { userId: args.userId, group: { seasonId: season.id, scope: 'GLOBAL' } },
  });
  if (!entry) {
    const groups = await tx.leaderboardGroup.findMany({
      where: { seasonId: season.id, scope: 'GLOBAL', league: profile.currentLeague },
      include: { _count: { select: { entries: true } } }, orderBy: { groupNumber: 'asc' },
    });
    let group = groups.find((g) => g._count.entries < g.maxMembers);
    if (!group) {
      const created = await tx.leaderboardGroup.create({ data: {
        seasonId: season.id, scope: 'GLOBAL', league: profile.currentLeague,
        groupNumber: Math.max(0, ...groups.map((g) => g.groupNumber)) + 1,
      } });
      entry = await tx.leaderboardEntry.create({ data: {
        userId: args.userId, xpProfileId: profile.id, groupId: created.id,
      } });
    } else {
      entry = await tx.leaderboardEntry.create({ data: {
        userId: args.userId, xpProfileId: profile.id, groupId: group.id,
      } });
    }
  }
  await tx.leaderboardEntry.update({
    where: { id: entry.id }, data: { periodXp: { increment: args.xp }, lastXpAt: new Date() },
  });
}
