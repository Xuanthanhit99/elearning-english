import { Injectable } from '@nestjs/common';
import { LearningSkill, SpeakingSessionStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { AnalyticsCacheKeys, AnalyticsCacheTtl } from './analytics-cache.constants';

/** Below this many attempts, a topic's accuracy is treated as noise, not signal. */
const MIN_ATTEMPTS = 2;
const MAX_OVERALL_WEAKNESSES = 5;

const SKILL_LABELS: Record<LearningSkill, string> = {
  VOCABULARY: 'Vocabulary',
  GRAMMAR: 'Grammar',
  READING: 'Reading',
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
  WRITING: 'Writing',
};

export type RecommendedLessonRef = {
  id: string;
  title: string;
  href: string;
} | null;

export type SkillWeakness = {
  skill: LearningSkill;
  skillLabel: string;
  topic: string;
  topicSlug: string | null;
  accuracy: number;
  attempts: number;
  recommendedLesson: RecommendedLessonRef;
  reason: string;
};

export type WeaknessReport = {
  generatedAt: Date;
  overallWeakest: SkillWeakness[];
  bySkill: Record<LearningSkill, SkillWeakness | null>;
};

type TopicAccumulator = {
  topic: string;
  topicSlug: string | null;
  topicId: string | null;
  correctSum: number;
  totalSum: number;
  attempts: number;
};

/**
 * Finds the weakest sub-topic per skill (not just the weakest skill), with a
 * human-readable reason and a concrete "next lesson" pointer — the raw
 * material for both the Weakness Detection API and the AI Coach prompt.
 * Deliberately reads session/progress tables directly (not the per-skill
 * *TopicProgress aggregate tables) so results reflect this exact accuracy
 * definition consistently across all 6 skills, several of which have no
 * aggregate table at all (Listening, Vocabulary).
 */
@Injectable()
export class WeaknessDetectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCache: RedisCacheService,
  ) {}

  async getWeaknesses(userId: string): Promise<WeaknessReport> {
    const cacheKey = AnalyticsCacheKeys.weaknesses(userId);
    const cached = await this.redisCache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as WeaknessReport;
      } catch {
        // corrupted entry — fall through and recompute
      }
    }

    const result = await this.computeWeaknesses(userId);
    await this.redisCache.set(
      cacheKey,
      JSON.stringify(result),
      AnalyticsCacheTtl.WEAKNESSES_SECONDS,
    );
    return result;
  }

  private async computeWeaknesses(userId: string): Promise<WeaknessReport> {
    const [vocabulary, grammar, reading, listening, speaking, writing] =
      await Promise.all([
        this.vocabularyWeakness(userId),
        this.grammarWeakness(userId),
        this.readingWeakness(userId),
        this.listeningWeakness(userId),
        this.speakingWeakness(userId),
        this.writingWeakness(userId),
      ]);

    const bySkill: Record<LearningSkill, SkillWeakness | null> = {
      VOCABULARY: vocabulary,
      GRAMMAR: grammar,
      READING: reading,
      LISTENING: listening,
      SPEAKING: speaking,
      WRITING: writing,
    };

    const overallWeakest = Object.values(bySkill)
      .filter((item): item is SkillWeakness => item !== null)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, MAX_OVERALL_WEAKNESSES);

    return { generatedAt: new Date(), overallWeakest, bySkill };
  }

  private pickWeakest(
    skill: LearningSkill,
    accumulators: TopicAccumulator[],
    buildRecommendedLesson: (
      topicId: string | null,
    ) => Promise<RecommendedLessonRef>,
  ): Promise<SkillWeakness | null> {
    const eligible = accumulators.filter(
      (item) => item.attempts >= MIN_ATTEMPTS && item.totalSum > 0,
    );
    if (eligible.length === 0) return Promise.resolve(null);

    const ranked = eligible
      .map((item) => ({
        ...item,
        accuracy: Math.round((item.correctSum / item.totalSum) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const weakest = ranked[0];
    return buildRecommendedLesson(weakest.topicId).then((recommendedLesson) => {
      const skillLabel = SKILL_LABELS[skill];
      const reason = `${skillLabel} → ${weakest.topic} → Accuracy ${weakest.accuracy}% → ${
        recommendedLesson
          ? `Recommend Lesson: ${recommendedLesson.title}`
          : `Recommend more practice in ${weakest.topic}`
      }`;

      return {
        skill,
        skillLabel,
        topic: weakest.topic,
        topicSlug: weakest.topicSlug,
        accuracy: weakest.accuracy,
        attempts: weakest.attempts,
        recommendedLesson,
        reason,
      };
    });
  }

  private async vocabularyWeakness(userId: string): Promise<SkillWeakness | null> {
    const rows = await this.prisma.userWordProgress.findMany({
      where: { userId },
      select: {
        correctCount: true,
        wrongCount: true,
        word: {
          select: {
            topicId: true,
            topic: { select: { name: true, slug: true } },
          },
        },
      },
    });

    const byTopic = new Map<string, TopicAccumulator>();
    for (const row of rows) {
      const attempts = row.correctCount + row.wrongCount;
      if (attempts === 0) continue;
      const topicId = row.word.topicId;
      const key = topicId ?? 'uncategorized';
      const existing = byTopic.get(key) ?? {
        topic: row.word.topic?.name ?? 'Uncategorized',
        topicSlug: row.word.topic?.slug ?? null,
        topicId,
        correctSum: 0,
        totalSum: 0,
        attempts: 0,
      };
      existing.correctSum += row.correctCount;
      existing.totalSum += attempts;
      existing.attempts += 1;
      byTopic.set(key, existing);
    }

    return this.pickWeakest(
      LearningSkill.VOCABULARY,
      [...byTopic.values()],
      async (topicId) => {
        if (!topicId) return null;
        const topic = await this.prisma.wordTopic.findUnique({
          where: { id: topicId },
          select: { name: true, slug: true },
        });
        if (!topic) return null;
        return {
          id: topicId,
          title: `Review ${topic.name} vocabulary`,
          href: `/vocabulary?topic=${topic.slug}`,
        };
      },
    );
  }

  private async grammarWeakness(userId: string): Promise<SkillWeakness | null> {
    const rows = await this.prisma.grammarLessonProgress.findMany({
      where: { userId, completed: true },
      select: {
        score: true,
        lesson: {
          select: {
            topicId: true,
            topic: { select: { title: true, slug: true } },
          },
        },
      },
    });

    const byTopic = new Map<string, TopicAccumulator>();
    for (const row of rows) {
      const topicId = row.lesson.topicId;
      const existing = byTopic.get(topicId) ?? {
        topic: row.lesson.topic.title,
        topicSlug: row.lesson.topic.slug,
        topicId,
        correctSum: 0,
        totalSum: 0,
        attempts: 0,
      };
      existing.correctSum += Math.max(0, Math.min(100, row.score));
      existing.totalSum += 100;
      existing.attempts += 1;
      byTopic.set(topicId, existing);
    }

    return this.pickWeakest(
      LearningSkill.GRAMMAR,
      [...byTopic.values()],
      async (topicId) => {
        if (!topicId) return null;
        const lesson = await this.prisma.grammarLesson.findFirst({
          where: {
            topicId,
            isActive: true,
            progress: { none: { userId, completed: true } },
          },
          orderBy: { order: 'asc' },
          select: { id: true, title: true },
        });
        if (!lesson) return null;
        return {
          id: lesson.id,
          title: lesson.title,
          href: `/grammar/lesson/${lesson.id}`,
        };
      },
    );
  }

  private async readingWeakness(userId: string): Promise<SkillWeakness | null> {
    const rows = await this.prisma.readingSession.findMany({
      where: { userId, isCompleted: true },
      select: {
        accuracy: true,
        article: {
          select: {
            categoryId: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
    });

    const byTopic = new Map<string, TopicAccumulator>();
    for (const row of rows) {
      const topicId = row.article.categoryId;
      const existing = byTopic.get(topicId) ?? {
        topic: row.article.category.name,
        topicSlug: row.article.category.slug,
        topicId,
        correctSum: 0,
        totalSum: 0,
        attempts: 0,
      };
      existing.correctSum += Math.max(0, Math.min(100, row.accuracy));
      existing.totalSum += 100;
      existing.attempts += 1;
      byTopic.set(topicId, existing);
    }

    return this.pickWeakest(
      LearningSkill.READING,
      [...byTopic.values()],
      async (topicId) => {
        if (!topicId) return null;
        const article = await this.prisma.readingArticle.findFirst({
          where: {
            categoryId: topicId,
            isPublished: true,
            sessions: { none: { userId, isCompleted: true } },
          },
          orderBy: { order: 'asc' },
          select: { id: true, title: true, slug: true },
        });
        if (!article) return null;
        return {
          id: article.id,
          title: article.title,
          href: `/reading/articles/${article.slug}`,
        };
      },
    );
  }

  private async listeningWeakness(userId: string): Promise<SkillWeakness | null> {
    const rows = await this.prisma.listeningSession.findMany({
      where: { userId, completedAt: { not: null } },
      select: { topic: true, total: true, correct: true },
    });

    const byTopic = new Map<string, TopicAccumulator>();
    for (const row of rows) {
      if (row.total <= 0) continue;
      const topic = row.topic ?? 'General';
      const existing = byTopic.get(topic) ?? {
        topic,
        topicSlug: null,
        // Listening topics have no relational ID — the topic string itself
        // is the identifier, passed through to the recommendation builder.
        topicId: topic,
        correctSum: 0,
        totalSum: 0,
        attempts: 0,
      };
      existing.correctSum += row.correct;
      existing.totalSum += row.total;
      existing.attempts += 1;
      byTopic.set(topic, existing);
    }

    return this.pickWeakest(LearningSkill.LISTENING, [...byTopic.values()], async (topicId) => {
      if (!topicId) return null;
      return {
        id: topicId,
        title: `Practice "${topicId}" listening`,
        href: `/listening?topic=${encodeURIComponent(topicId)}`,
      };
    });
  }

  private async speakingWeakness(userId: string): Promise<SkillWeakness | null> {
    const rows = await this.prisma.speakingSession.findMany({
      where: { userId, finishedAt: { not: null } },
      select: {
        overallScore: true,
        topicId: true,
        topic: { select: { title: true, slug: true } },
      },
    });

    const byTopic = new Map<string, TopicAccumulator>();
    for (const row of rows) {
      const topicId = row.topicId;
      const key = topicId ?? 'uncategorized';
      const existing = byTopic.get(key) ?? {
        topic: row.topic?.title ?? 'General speaking',
        topicSlug: row.topic?.slug ?? null,
        topicId,
        correctSum: 0,
        totalSum: 0,
        attempts: 0,
      };
      existing.correctSum += Math.max(0, Math.min(100, row.overallScore));
      existing.totalSum += 100;
      existing.attempts += 1;
      byTopic.set(key, existing);
    }

    return this.pickWeakest(
      LearningSkill.SPEAKING,
      [...byTopic.values()],
      async (topicId) => {
        if (!topicId) return null;
        const lesson = await this.prisma.speakingLesson.findFirst({
          where: {
            topicId,
            isActive: true,
            sessions: {
              none: { userId, status: SpeakingSessionStatus.COMPLETED },
            },
          },
          orderBy: { order: 'asc' },
          select: { id: true, title: true, slug: true },
        });
        if (!lesson) return null;
        return {
          id: lesson.id,
          title: lesson.title,
          href: `/speaking/lesson/${lesson.slug}`,
        };
      },
    );
  }

  private async writingWeakness(userId: string): Promise<SkillWeakness | null> {
    const rows = await this.prisma.writingSession.findMany({
      where: { userId, isSubmitted: true },
      select: {
        overallScore: true,
        lesson: {
          select: {
            topicId: true,
            topic: { select: { title: true, slug: true } },
          },
        },
      },
    });

    const byTopic = new Map<string, TopicAccumulator>();
    for (const row of rows) {
      if (row.overallScore === null) continue;
      const topicId = row.lesson.topicId;
      const existing = byTopic.get(topicId) ?? {
        topic: row.lesson.topic.title,
        topicSlug: row.lesson.topic.slug,
        topicId,
        correctSum: 0,
        totalSum: 0,
        attempts: 0,
      };
      existing.correctSum += Math.max(0, Math.min(100, row.overallScore));
      existing.totalSum += 100;
      existing.attempts += 1;
      byTopic.set(topicId, existing);
    }

    return this.pickWeakest(
      LearningSkill.WRITING,
      [...byTopic.values()],
      async (topicId) => {
        if (!topicId) return null;
        const lesson = await this.prisma.writingLesson.findFirst({
          where: {
            topicId,
            isActive: true,
            sessions: { none: { userId, isSubmitted: true } },
          },
          orderBy: { order: 'asc' },
          select: { id: true, title: true, slug: true },
        });
        if (!lesson) return null;
        return {
          id: lesson.id,
          title: lesson.title,
          href: `/writing/topics/${lesson.slug}`,
        };
      },
    );
  }
}
