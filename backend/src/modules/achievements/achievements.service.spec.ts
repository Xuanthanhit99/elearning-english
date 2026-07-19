import {
  AchievementCategory,
  AchievementRarity,
  AchievementRuleType,
  AchievementStatus,
  AchievementVisibility,
} from '@prisma/client';
import { AchievementsService } from './achievements.service';

describe('AchievementsService', () => {
  const definition = {
    id: 'achievement-1',
    code: 'listening_first_10',
    title: 'Nghe cham chi',
    description: 'Hoan thanh 10 bai nghe.',
    icon: 'headphones',
    imageUrl: null,
    category: AchievementCategory.LISTENING,
    rarity: AchievementRarity.COMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'LISTENING_COMPLETED',
    ruleConfig: null,
    targetValue: 1,
    rewardXp: 60,
    rewardCoins: 12,
    displayOrder: 1,
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function createService() {
    const tx = {
      achievementProcessedEvent: {
        create: jest.fn().mockResolvedValue({ id: 'processed-1' }),
      },
      userAchievement: {
        upsert: jest.fn().mockResolvedValue({
          id: 'user-achievement-1',
          userId: 'user-1',
          achievementId: 'achievement-1',
          currentValue: 0,
          targetSnapshot: 1,
          status: AchievementStatus.LOCKED,
          unlockedAt: null,
          claimedAt: null,
        }),
        update: jest.fn().mockResolvedValue({
          id: 'user-achievement-1',
          currentValue: 1,
          status: AchievementStatus.CLAIMABLE,
          unlockedAt: new Date('2026-07-19T00:00:00.000Z'),
        }),
      },
    };
    const prisma = {
      achievement: {
        findMany: jest.fn().mockResolvedValue([definition]),
        upsert: jest.fn(),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const xpService = { awardXpWithSideEffects: jest.fn() };
    const notifications = { publish: jest.fn().mockResolvedValue(undefined) };
    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };

    return {
      service: new AchievementsService(
        prisma as never,
        xpService as never,
        notifications as never,
        eventEmitter as never,
      ),
      prisma,
      tx,
      notifications,
      eventEmitter,
    };
  }

  it('unlocks an achievement idempotently through the event pipeline', async () => {
    const { service, tx, notifications, eventEmitter } = createService();

    const result = await service.processActivityEvent({
      eventId: 'learning:LISTENING_COMPLETED:user-1:session-1',
      eventType: 'LISTENING_COMPLETED',
      eventVersion: 1,
      occurredAt: '2026-07-19T00:00:00.000Z',
      userId: 'user-1',
      sourceId: 'session-1',
      score: 90,
      completionRate: 100,
    });

    expect(result.unlocked).toHaveLength(1);
    expect(tx.achievementProcessedEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: 'learning:LISTENING_COMPLETED:user-1:session-1',
          userId: 'user-1',
          achievementId: 'achievement-1',
        }),
      }),
    );
    expect(tx.userAchievement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentValue: 1,
          status: AchievementStatus.CLAIMABLE,
        }),
      }),
    );
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      'achievement.unlocked',
      expect.objectContaining({ achievementCode: 'listening_first_10' }),
    );
    expect(notifications.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ACHIEVEMENT_UNLOCKED',
        recipientUserIds: ['user-1'],
      }),
    );
  });
});
