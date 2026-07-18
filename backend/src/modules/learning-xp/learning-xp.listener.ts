import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { XpService } from '../leaderboard/xp.service';
import { LearningActivityCompletedEvent } from './events/learning-activity-completed.event';
import {
  LEARNING_XP_RULES,
  type LearningActivityCode,
} from './learning-xp.constants';

@Injectable()
export class LearningXpListener {
  private readonly logger = new Logger(LearningXpListener.name);

  constructor(private readonly xpService: XpService) {}

  @OnEvent('learning.activity.completed', { async: true })
  async handle(event: LearningActivityCompletedEvent) {
    const rule = LEARNING_XP_RULES[event.activity];

    const bonusXp =
      event.activity === 'MISSION_CLAIMED'
        ? Math.max(0, Math.min(event.rewardXp ?? 0, rule.maxBonusXp))
        : this.calculateBonusXp(
            event.score,
            event.completionRate,
            rule.maxBonusXp,
          );

    try {
      await this.xpService.awardXp({
        userId: event.userId,
        sourceType: rule.sourceType,
        sourceId: event.sourceId,
        skill: rule.skill,
        baseXp: rule.baseXp,
        bonusXp,
        idempotencyKey: this.idempotencyKey(event.activity, event.sourceId),
        reason: this.reason(event.activity),
        metadata: {
          ...event.metadata,
          score: event.score ?? undefined,
          completionRate: event.completionRate ?? undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Award XP failed: activity=${event.activity}, userId=${event.userId}, sourceId=${event.sourceId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private calculateBonusXp(
    score: number | null | undefined,
    completionRate: number | null | undefined,
    maxBonusXp: number,
  ) {
    if (maxBonusXp <= 0) return 0;

    const safeScore = Math.max(0, Math.min(score ?? 0, 100));
    const safeCompletion = Math.max(0, Math.min(completionRate ?? 100, 100));

    const scoreFactor =
      safeScore >= 95 ? 1 : safeScore >= 85 ? 0.7 : safeScore >= 75 ? 0.4 : 0;

    const completionFactor = safeCompletion / 100;

    return Math.round(maxBonusXp * scoreFactor * completionFactor);
  }

  private idempotencyKey(activity: LearningActivityCode, sourceId: string) {
    return `learning:${activity}:${sourceId}`;
  }

  private reason(activity: LearningActivityCode) {
    const labels: Record<LearningActivityCode, string> = {
      SPEAKING_COMPLETED: 'Hoàn thành bài Speaking',
      WRITING_COMPLETED: 'Hoàn thành bài Writing',
      VOCABULARY_COMPLETED: 'Hoàn thành bài Vocabulary',
      LISTENING_COMPLETED: 'Hoàn thành bài Listening',
      READING_COMPLETED: 'Hoàn thành bài Reading',
      GRAMMAR_COMPLETED: 'Hoàn thành bài Grammar',
      LESSON_COMPLETED: 'Hoàn thành bài học',
      QUIZ_COMPLETED: 'Hoàn thành bài kiểm tra',
      MISSION_CLAIMED: 'Nhận thưởng nhiệm vụ',
      PLACEMENT_COMPLETED: 'Hoàn thành Placement Test',
    };

    return labels[activity];
  }
}
