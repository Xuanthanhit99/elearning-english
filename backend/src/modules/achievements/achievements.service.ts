import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  Achievement,
  AchievementRuleType,
  AchievementStatus,
  AchievementVisibility,
  Prisma,
  XpSourceType,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { XpService } from '../leaderboard/xp.service';
import { NotificationEventPublisher } from '../notifications/notification-event-publisher';
import {
  NotificationEventPriority,
  NotificationEventType,
} from '../notifications/contracts/notification-event-type';
import { ACHIEVEMENT_CATALOG } from './achievement-catalog';
import { ACHIEVEMENT_DOMAIN_EVENT } from './achievements.constants';
import {
  AchievementActivityEvent,
  AchievementUnlockedEvent,
} from './achievement-event.types';
import { AchievementQueryDto } from './dto/achievement-query.dto';

type UserAchievementWithDefinition = Prisma.UserAchievementGetPayload<{
  include: { achievement: true; rewards: true };
}>;

@Injectable()
export class AchievementsService implements OnModuleInit {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
    private readonly notifications: NotificationEventPublisher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.seedCatalog();
  }

  async seedCatalog() {
    for (const item of ACHIEVEMENT_CATALOG) {
      await this.prisma.achievement.upsert({
        where: { code: item.code },
        create: item,
        update: {
          title: item.title,
          description: item.description,
          icon: item.icon,
          category: item.category,
          rarity: item.rarity,
          visibility: item.visibility,
          ruleType: item.ruleType,
          eventType: item.eventType,
          ruleConfig: item.ruleConfig ?? Prisma.JsonNull,
          targetValue: item.targetValue,
          rewardXp: item.rewardXp,
          rewardCoins: item.rewardCoins,
          displayOrder: item.displayOrder,
          isActive: true,
        },
      });
    }
  }

  async processActivityEvent(event: AchievementActivityEvent) {
    const now = new Date(event.occurredAt);
    const definitions = await this.prisma.achievement.findMany({
      where: {
        isActive: true,
        eventType: event.eventType,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });

    const unlocked: AchievementUnlockedEvent[] = [];

    for (const definition of definitions) {
      const result = await this.processDefinition(event, definition, now);
      if (result) unlocked.push(result);
    }

    for (const item of unlocked) {
      await this.publishUnlocked(item);
    }

    return { processed: definitions.length, unlocked };
  }

  async list(userId: string, query: AchievementQueryDto = {}) {
    await this.seedCatalog();

    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 50);
    const definitions = await this.prisma.achievement.findMany({
      where: {
        isActive: true,
        ...(query.category ? { category: query.category } : {}),
        ...(query.rarity ? { rarity: query.rarity } : {}),
        ...(query.cursor
          ? { displayOrder: { gt: Number(query.cursor) || 0 } }
          : {}),
      },
      include: {
        users: {
          where: { userId },
          take: 1,
          include: { rewards: true },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
      take: limit + 1,
    });

    const items = definitions.slice(0, limit).map((item) =>
      this.toCard({
        achievement: item,
        progress: item.users[0] ?? null,
      }),
    );

    const filtered =
      query.status && query.status !== AchievementStatus.LOCKED
        ? items.filter((item) => item.status === query.status)
        : query.status === AchievementStatus.LOCKED
          ? items.filter((item) => item.status === AchievementStatus.LOCKED)
          : items;

    const summary = await this.summary(userId);

    return {
      summary,
      items: filtered,
      pagination: {
        limit,
        hasMore: definitions.length > limit,
        nextCursor:
          definitions.length > limit
            ? String(definitions[limit - 1]?.displayOrder ?? '')
            : null,
      },
      filters: {
        category: query.category ?? 'ALL',
        rarity: query.rarity ?? 'ALL',
        status: query.status ?? 'ALL',
      },
    };
  }

  async overview(userId: string) {
    const list = await this.list(userId, { limit: 50 });
    const recent = await this.history(userId, 8);
    const goals = list.items
      .filter((item) => item.status !== AchievementStatus.CLAIMED)
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .slice(0, 6)
      .map((item) => ({
        key: item.code,
        title: item.title,
        subtitle: item.description,
        icon: item.icon,
        current: item.currentValue,
        target: item.targetValue,
        progressPercent: item.progressPercent,
        locked: item.status === AchievementStatus.LOCKED,
        unlocked:
          item.status === AchievementStatus.UNLOCKED ||
          item.status === AchievementStatus.CLAIMABLE,
        claimable: item.status === AchievementStatus.CLAIMABLE,
        claimed: item.status === AchievementStatus.CLAIMED,
      }));

    return {
      summary: {
        totalAchievements: list.summary.unlocked,
        xpEarned: list.summary.claimedXp,
        completedChallenges: list.summary.claimed,
        longestStreak: list.summary.longestStreak,
      },
      recent: recent.items.map((item) => ({
        key: item.code,
        title: item.title,
        description: item.description,
        tag: item.categoryLabel,
        category: this.uiCategory(item.category),
        icon: item.icon,
        tone: item.tone,
        xp: item.reward.xp,
        dateLabel: item.unlockedAt
          ? this.timeAgo(new Date(item.unlockedAt))
          : '',
      })),
      goals,
      categories: [
        { key: 'all', label: 'Tat ca' },
        { key: 'learning', label: 'Hoc tap' },
        { key: 'challenge', label: 'Thu thach' },
        { key: 'system', label: 'He thong' },
      ],
    };
  }

  async detail(userId: string, code: string) {
    const row = await this.prisma.achievement.findUnique({
      where: { code },
      include: {
        users: {
          where: { userId },
          take: 1,
          include: { rewards: true },
        },
      },
    });

    if (!row || !row.isActive) {
      throw new NotFoundException('Achievement not found.');
    }

    const card = this.toCard({
      achievement: row,
      progress: row.users[0] ?? null,
    });

    return {
      achievement: {
        key: card.code,
        code: card.code,
        title: card.title,
        description: card.description,
        tag: card.categoryLabel,
        icon: card.icon,
        tone: card.tone,
        xp: card.reward.xp,
        achievedAt: card.unlockedAt
          ? this.timeAgo(new Date(card.unlockedAt))
          : 'Chua mo khoa',
        status: card.status,
        claimable: card.status === AchievementStatus.CLAIMABLE,
        claimed: card.status === AchievementStatus.CLAIMED,
      },
      overview: {
        title: 'Tong quan thanh tich',
        description: card.condition,
        current: card.currentValue,
        target: card.targetValue,
        unit: 'moc',
        progressSteps: this.progressSteps(card.currentValue, card.targetValue),
        tip: 'Duy tri nhip hoc deu de mo khoa them thanh tich moi.',
      },
      rewards: [
        {
          label: 'Khi mo khoa',
          reward: this.rewardText(row.rewardXp, row.rewardCoins),
          required: row.targetValue,
          claimed: card.status === AchievementStatus.CLAIMED,
          locked: card.status !== AchievementStatus.CLAIMABLE,
        },
      ],
      activities: await this.relatedActivities(userId, row.eventType),
      suggestions: this.suggestions(row.category),
    };
  }

  async activityDetail(userId: string, code: string, type: string, id: string) {
    if (!type || !id) {
      throw new NotFoundException('Activity not found.');
    }

    const detail = await this.detail(userId, code);
    const activity = detail.activities.find((item) => item.id === id) ?? {
      title: detail.achievement.title,
      subtitle: detail.achievement.description,
      time: '',
      xp: 0,
      icon: detail.achievement.icon,
    };

    return {
      header: {
        title: activity.title,
        subtitle: activity.subtitle,
        tag: detail.achievement.tag,
        icon: detail.achievement.icon,
        tone: detail.achievement.tone,
        completedAt: activity.time || 'Gan day',
        xp: activity.xp || detail.achievement.xp,
      },
      stats: [
        {
          label: 'Tien do',
          value: `${detail.overview.current}/${detail.overview.target}`,
          sub: detail.overview.unit,
          icon: 'target',
          tone: 'purple',
        },
        {
          label: 'Trang thai',
          value: detail.achievement.status,
          sub: detail.achievement.claimed ? 'Da nhan' : 'Dang tien bo',
          icon: 'star',
          tone: 'emerald',
        },
        {
          label: 'XP',
          value: `+${detail.achievement.xp}`,
          sub: 'Phan thuong',
          icon: 'zap',
          tone: 'yellow',
        },
        {
          label: 'Loai',
          value: detail.achievement.tag,
          sub: type,
          icon: 'book',
          tone: 'blue',
        },
      ],
      content: {
        title: activity.title,
        description: activity.subtitle,
        level: 'Phase 1',
        topic: detail.achievement.tag,
        duration: 'Hoat dong',
        actionLabel: 'Luyen tap tiep',
        actionHref: this.suggestions('')[0].href,
      },
      timeline: [
        {
          time: activity.time || 'Gan day',
          title: activity.title,
          xp: activity.xp || 0,
          icon: activity.icon,
          done: true,
        },
        {
          time: detail.achievement.achievedAt,
          title: detail.achievement.title,
          xp: detail.achievement.xp,
          icon: detail.achievement.icon,
          done: Boolean(
            detail.achievement.claimable || detail.achievement.claimed,
          ),
        },
      ],
      rewards: detail.rewards,
      suggestions: detail.suggestions.map((item) => ({
        ...item,
        href: item.href ?? '/achievements',
      })),
    };
  }

  async history(userId: string, limit = 20) {
    const rows = await this.prisma.userAchievement.findMany({
      where: {
        userId,
        unlockedAt: { not: null },
      },
      include: { achievement: true, rewards: true },
      orderBy: [{ unlockedAt: 'desc' }, { id: 'desc' }],
      take: Math.min(Math.max(limit, 1), 50),
    });

    return {
      items: rows.map((row) =>
        this.toCard({ achievement: row.achievement, progress: row }),
      ),
    };
  }

  async claim(userId: string, code: string) {
    const row = await this.prisma.userAchievement.findFirst({
      where: {
        userId,
        achievement: { code, isActive: true },
      },
      include: { achievement: true, rewards: true },
    });

    if (!row) {
      throw new NotFoundException('Achievement not found.');
    }

    if (row.status === AchievementStatus.CLAIMED || row.claimedAt) {
      return {
        alreadyClaimed: true,
        achievement: this.toCard({
          achievement: row.achievement,
          progress: row,
        }),
        reward: this.rewardPayload(row),
      };
    }

    if (
      row.status !== AchievementStatus.CLAIMABLE &&
      row.status !== AchievementStatus.UNLOCKED
    ) {
      throw new ConflictException('Achievement reward is not claimable yet.');
    }

    const idempotencyKey = `achievement:claim:${userId}:${row.achievementId}`;

    const awarded = await this.xpService.awardXpWithSideEffects(
      {
        userId,
        sourceType: XpSourceType.ACHIEVEMENT,
        sourceId: row.achievementId,
        baseXp: row.achievement.rewardXp,
        bonusXp: 0,
        idempotencyKey,
        reason: `Claim achievement ${row.achievement.code}`,
        metadata: {
          achievementCode: row.achievement.code,
          achievementTitle: row.achievement.title,
          rewardCoins: row.achievement.rewardCoins,
        },
      },
      async (tx) => {
        const updated = await tx.userAchievement.updateMany({
          where: {
            id: row.id,
            userId,
            claimedAt: null,
            status: {
              in: [AchievementStatus.CLAIMABLE, AchievementStatus.UNLOCKED],
            },
          },
          data: {
            status: AchievementStatus.CLAIMED,
            claimedAt: new Date(),
          },
        });

        if (updated.count === 0) {
          throw new ConflictException('Achievement was already claimed.');
        }

        const reward = await tx.achievementRewardTransaction.create({
          data: {
            userId,
            achievementId: row.achievementId,
            userAchievementId: row.id,
            xp: row.achievement.rewardXp,
            coins: row.achievement.rewardCoins,
            idempotencyKey,
          },
        });

        await tx.petProfile.upsert({
          where: { userId },
          update: {
            xp: { increment: row.achievement.rewardXp },
            coins: { increment: row.achievement.rewardCoins },
          },
          create: {
            userId,
            petType: 'fox',
            petName: 'Foxy',
            isChosen: true,
            xp: row.achievement.rewardXp,
            coins: row.achievement.rewardCoins,
            energy: 70,
            happiness: 70,
          },
        });

        return reward;
      },
    );

    const refreshed = await this.prisma.userAchievement.findUniqueOrThrow({
      where: { id: row.id },
      include: { achievement: true, rewards: true },
    });

    return {
      alreadyClaimed: awarded.duplicated,
      achievement: this.toCard({
        achievement: refreshed.achievement,
        progress: refreshed,
      }),
      reward: this.rewardPayload(refreshed),
    };
  }

  private async processDefinition(
    event: AchievementActivityEvent,
    definition: Achievement,
    occurredAt: Date,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.achievementProcessedEvent.create({
            data: {
              userId: event.userId,
              achievementId: definition.id,
              eventId: event.eventId,
              eventType: event.eventType,
              sourceId: event.sourceId,
            },
          });

          const current = await tx.userAchievement.upsert({
            where: {
              userId_achievementId: {
                userId: event.userId,
                achievementId: definition.id,
              },
            },
            create: {
              userId: event.userId,
              achievementId: definition.id,
              currentValue: 0,
              targetSnapshot: definition.targetValue,
              status: AchievementStatus.LOCKED,
              lastEventAt: occurredAt,
            },
            update: {
              lastEventAt: occurredAt,
            },
          });

          if (current.status === AchievementStatus.CLAIMED) return null;

          const nextValue = this.evaluateNextValue(
            definition,
            current.currentValue,
            event,
          );

          if (nextValue === current.currentValue) return null;

          const reached = nextValue >= definition.targetValue;
          const wasUnlocked = Boolean(current.unlockedAt);
          const nextStatus = reached
            ? AchievementStatus.CLAIMABLE
            : AchievementStatus.IN_PROGRESS;

          const updated = await tx.userAchievement.update({
            where: { id: current.id },
            data: {
              currentValue: Math.max(0, nextValue),
              status: nextStatus,
              unlockedAt:
                reached && !current.unlockedAt
                  ? occurredAt
                  : current.unlockedAt,
              lastEventAt: occurredAt,
            },
          });

          if (!reached || wasUnlocked || !updated.unlockedAt) return null;

          return this.toUnlockedEvent(event, definition, updated.unlockedAt);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }

      this.logger.error(
        `Achievement processing failed: ${definition.code}, event=${event.eventId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private evaluateNextValue(
    definition: Achievement,
    currentValue: number,
    event: AchievementActivityEvent,
  ) {
    switch (definition.ruleType) {
      case AchievementRuleType.TOTAL_COUNT:
        return Math.min(definition.targetValue, currentValue + 1);
      case AchievementRuleType.MAX_VALUE:
        return Math.min(
          definition.targetValue,
          Math.max(currentValue, this.valueFromEvent(definition, event)),
        );
      case AchievementRuleType.ONE_TIME_EVENT:
        return definition.targetValue;
      default:
        throw new BadRequestException(`Unsupported achievement rule.`);
    }
  }

  private valueFromEvent(
    definition: Achievement,
    event: AchievementActivityEvent,
  ) {
    const config = this.safeRuleConfig(definition.ruleConfig);
    const field = config.valueField || 'score';
    const direct: Record<string, number | null | undefined> = {
      score: event.score,
      completionRate: event.completionRate,
      rewardXp: event.rewardXp,
    };

    if (typeof direct[field] === 'number') {
      return Math.max(0, Math.round(direct[field] || 0));
    }

    const metadataValue = event.metadata?.[field];
    return typeof metadataValue === 'number'
      ? Math.max(0, Math.round(metadataValue))
      : 0;
  }

  private safeRuleConfig(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as { valueField?: string };
    }

    const raw = value as Record<string, unknown>;
    return {
      valueField:
        typeof raw.valueField === 'string' ? raw.valueField : undefined,
    };
  }

  private async publishUnlocked(event: AchievementUnlockedEvent) {
    await this.eventEmitter.emitAsync(ACHIEVEMENT_DOMAIN_EVENT, event);

    await this.notifications.publish({
      eventType: NotificationEventType.ACHIEVEMENT_UNLOCKED,
      eventVersion: 1,
      recipientUserIds: [event.userId],
      actorUserId: null,
      entityType: 'Achievement',
      entityId: event.achievementId,
      deduplicationKey: `notification:ACHIEVEMENT_UNLOCKED:{recipientId}:${event.achievementId}:1`,
      priority: NotificationEventPriority.HIGH,
      context: {
        metadata: {
          achievementTitle: event.achievementTitle,
          rewardLabel: this.rewardText(event.rewardXp, event.rewardCoins),
          href: `/achievements?highlight=${event.achievementCode}`,
        },
      },
    });
  }

  private toUnlockedEvent(
    event: AchievementActivityEvent,
    achievement: Achievement,
    unlockedAt: Date,
  ): AchievementUnlockedEvent {
    return {
      eventId: `achievement:${achievement.id}:${event.eventId}`,
      eventType: 'achievement.unlocked',
      eventVersion: 1,
      occurredAt: unlockedAt.toISOString(),
      userId: event.userId,
      achievementId: achievement.id,
      achievementCode: achievement.code,
      achievementTitle: achievement.title,
      rewardXp: achievement.rewardXp,
      rewardCoins: achievement.rewardCoins,
    };
  }

  private async summary(userId: string) {
    const [definitions, rows, rewards, pet] = await Promise.all([
      this.prisma.achievement.count({ where: { isActive: true } }),
      this.prisma.userAchievement.findMany({
        where: { userId },
        select: { status: true, unlockedAt: true },
      }),
      this.prisma.achievementRewardTransaction.aggregate({
        where: { userId },
        _sum: { xp: true, coins: true },
        _count: { id: true },
      }),
      this.prisma.petProfile.findUnique({
        where: { userId },
        select: { bestStreak: true, streak: true },
      }),
    ]);

    const unlocked = rows.filter((row) => row.unlockedAt).length;
    const claimed = rows.filter(
      (row) => row.status === AchievementStatus.CLAIMED,
    ).length;

    return {
      total: definitions,
      unlocked,
      locked: Math.max(0, definitions - unlocked),
      claimable: rows.filter(
        (row) => row.status === AchievementStatus.CLAIMABLE,
      ).length,
      claimed,
      completionPercent: definitions
        ? Math.round((unlocked / definitions) * 100)
        : 0,
      claimedXp: rewards._sum.xp || 0,
      claimedCoins: rewards._sum.coins || 0,
      rewardClaims: rewards._count.id,
      longestStreak: Math.max(pet?.bestStreak || 0, pet?.streak || 0),
    };
  }

  private toCard(input: {
    achievement: Achievement;
    progress:
      | UserAchievementWithDefinition
      | null
      | {
          currentValue: number;
          targetSnapshot: number;
          status: AchievementStatus;
          unlockedAt: Date | null;
          claimedAt: Date | null;
          rewards?: unknown[];
        }
      | null;
  }) {
    const { achievement, progress } = input;
    const currentValue = Math.max(0, progress?.currentValue ?? 0);
    const targetValue = progress?.targetSnapshot || achievement.targetValue;
    const status = progress?.status ?? AchievementStatus.LOCKED;
    const hiddenLocked =
      achievement.visibility === AchievementVisibility.HIDDEN &&
      !progress?.unlockedAt;

    return {
      id: achievement.id,
      code: achievement.code,
      key: achievement.code,
      title: hiddenLocked ? 'Hidden Achievement' : achievement.title,
      description: hiddenLocked
        ? 'Mo khoa thanh tich nay de xem chi tiet.'
        : achievement.description,
      condition: hiddenLocked
        ? 'Dieu kien dang duoc an.'
        : this.conditionText(achievement),
      icon: hiddenLocked ? 'lock' : achievement.icon || 'star',
      imageUrl: hiddenLocked ? null : achievement.imageUrl,
      category: achievement.category,
      categoryLabel: this.categoryLabel(achievement.category),
      rarity: achievement.rarity,
      status,
      currentValue,
      targetValue,
      progressPercent: targetValue
        ? Math.min(100, Math.round((currentValue / targetValue) * 100))
        : 0,
      reward: {
        xp: achievement.rewardXp,
        coins: achievement.rewardCoins,
        label: this.rewardText(achievement.rewardXp, achievement.rewardCoins),
      },
      unlockedAt: progress?.unlockedAt?.toISOString?.() ?? null,
      claimedAt: progress?.claimedAt?.toISOString?.() ?? null,
      tone: this.tone(achievement.rarity),
    };
  }

  private rewardPayload(row: UserAchievementWithDefinition) {
    const transaction = row.rewards[0];
    return {
      xp: transaction?.xp ?? row.achievement.rewardXp,
      coins: transaction?.coins ?? row.achievement.rewardCoins,
    };
  }

  private conditionText(achievement: Achievement) {
    if (achievement.ruleType === AchievementRuleType.MAX_VALUE) {
      return `Dat gia tri toi thieu ${achievement.targetValue}.`;
    }
    if (achievement.ruleType === AchievementRuleType.ONE_TIME_EVENT) {
      return 'Hoan thanh hoat dong bat buoc mot lan.';
    }
    return `Hoan thanh ${achievement.targetValue} hoat dong lien quan.`;
  }

  private rewardText(xp: number, coins: number) {
    return [`+${xp} XP`, coins ? `+${coins} coins` : '']
      .filter(Boolean)
      .join(' va ');
  }

  private categoryLabel(category: string) {
    const labels: Record<string, string> = {
      VOCABULARY: 'Tu vung',
      GRAMMAR: 'Ngu phap',
      READING: 'Doc',
      LISTENING: 'Nghe',
      SPEAKING: 'Noi',
      WRITING: 'Viet',
      PLACEMENT: 'Placement',
      MISSION: 'Nhiem vu',
      LEARNING: 'Hoc tap',
    };
    return labels[category] || 'He thong';
  }

  private uiCategory(category: string) {
    if (['MISSION', 'ARENA', 'LEADERBOARD'].includes(category))
      return 'challenge';
    if (['STREAK', 'PLACEMENT', 'SPECIAL'].includes(category)) return 'system';
    return 'learning';
  }

  private tone(rarity: string) {
    const map: Record<string, string> = {
      COMMON: 'blue',
      UNCOMMON: 'emerald',
      RARE: 'purple',
      EPIC: 'pink',
      LEGENDARY: 'yellow',
    };
    return map[rarity] || 'blue';
  }

  private progressSteps(current: number, target: number) {
    const size = Math.max(1, Math.min(target, 7));
    return Array.from({ length: size }, (_, index) => {
      const value = Math.ceil(((index + 1) / size) * target);
      return {
        label: `${value} moc`,
        done: current >= value,
        value,
      };
    });
  }

  private async relatedActivities(userId: string, eventType: string) {
    const rows = await this.prisma.achievementProcessedEvent.findMany({
      where: { userId, eventType },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return rows.map((row) => ({
      id: row.sourceId || row.id,
      type: row.eventType.toLowerCase(),
      title: this.eventTitle(row.eventType),
      subtitle: row.sourceId ? `Nguon: ${row.sourceId}` : 'Hoat dong hoc tap',
      time: this.timeAgo(row.createdAt),
      xp: 0,
      icon: 'star',
    }));
  }

  private eventTitle(eventType: string) {
    return eventType
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, (value) => value.toUpperCase());
  }

  private suggestions(category: string) {
    const href =
      category === 'LISTENING'
        ? '/listening'
        : category === 'SPEAKING'
          ? '/speaking'
          : category === 'WRITING'
            ? '/writing'
            : category === 'READING'
              ? '/reading'
              : category === 'GRAMMAR'
                ? '/grammar'
                : '/vocabulary';

    return [
      {
        title: 'Tiep tuc hoc hom nay',
        subtitle: 'Hoan thanh them mot bai de tang tien do.',
        href,
        icon: 'sparkles',
      },
      {
        title: 'On tap lai noi dung cu',
        subtitle: 'On tap giup ghi nho lau hon.',
        href,
        icon: 'book',
      },
    ];
  }

  private timeAgo(date: Date) {
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (minutes < 60) return `${minutes} phut truoc`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} gio truoc`;
    return `${Math.floor(hours / 24)} ngay truoc`;
  }
}
