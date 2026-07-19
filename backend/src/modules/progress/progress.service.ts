import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LearningSkill, XpSourceType } from '@prisma/client';
import {
  addUserDays,
  dateKeyInTimezone,
  normalizeUserTimezone,
  startOfUserDay,
} from 'src/common/time/user-timezone.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { PetsService } from '../pets/pets.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { SettingsQueryService } from '../settings/settings-query.service';
import {
  ProgressHistoryQueryDto,
  ProgressRange,
  UnifiedProgressStatus,
} from './dto/progress-query.dto';

type LearningActivityAction = {
  type: 'RESUME' | 'VIEW_RESULT' | 'VIEW_LESSON' | 'RETRY' | 'NONE';
  label: string;
  href: string | null;
};

type UnifiedLearningActivity = {
  id: string;
  activityKey: string;
  type: string;
  skill: LearningSkill | null;
  title: string;
  description?: string | null;
  status: Exclude<UnifiedProgressStatus, UnifiedProgressStatus.ALL>;
  entityType: string;
  entityId: string;
  sessionId?: string | null;
  score?: number | null;
  accuracy?: number | null;
  xpEarned?: number | null;
  durationSeconds?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  occurredAt: Date;
  action: LearningActivityAction;
  metadata?: Record<string, string | number | boolean | null>;
};

const RANGE_DAYS: Record<ProgressRange, number> = {
  [ProgressRange.SEVEN_DAYS]: 7,
  [ProgressRange.THIRTY_DAYS]: 30,
  [ProgressRange.NINETY_DAYS]: 90,
};

@Injectable()
export class ProgressService {
  constructor(
    private prismaService: PrismaService,
    private petsService: PetsService,
    private dashboardService: DashboardService,
    private settingsQuery: SettingsQueryService,
  ) {}

  async completeLesson(userId, lessonId) {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
    const courseId = lesson.section.courseId;

    const enrollment = await this.prismaService.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) {
      throw new ForbiddenException('Bạn chưa sở hữu khóa học này');
    }

    const quizzes = await this.prismaService.quiz.findMany({
      where: {
        lessonId,
      },
    });

    if (quizzes.length > 0) {
      const latestQuizResult = await this.prismaService.quizResult.findFirst({
        where: {
          userId,
          lessonId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!latestQuizResult) {
        throw new ForbiddenException(
          'Bạn cần làm quiz trước khi hoàn thành bài học',
        );
      }

      if (latestQuizResult.score < 80) {
        throw new ForbiddenException(
          'Bạn cần đạt ít nhất 80 điểm để hoàn thành bài học',
        );
      }
    }

    const progress = await this.prismaService.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        courseId,
        completed: true,
        completedAt: new Date(),
      },
    });

    const petReward = await this.petsService.rewardLesson(userId, lessonId);

    return {
      progress,
      petReward,
    };
  }

  async getCourseProgress(userId: string, courseId: string) {
    const totalLessons = await this.prismaService.lesson.count({
      where: { section: { courseId } },
    });

    const completedLessons = await this.prismaService.lessonProgress.count({
      where: {
        userId,
        courseId,
        completed: true,
      },
    });

    const percent =
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100);

    return {
      totalLessons,
      completedLessons,
      percent,
    };
  }

  async getProgressOverview(userId: string) {
    const dashboard = await this.dashboardService.getDashboard(userId);
    const [history, inProgress] = await Promise.all([
      this.getUnifiedHistory(userId, { limit: 8, range: ProgressRange.THIRTY_DAYS }),
      this.getInProgressItems(userId),
    ]);

    return {
      overview: {
        overallCompletion: dashboard.learningPath?.progressPercent ?? null,
        overallProgressMode: dashboard.learningPath
          ? 'PATH_BASED'
          : 'INSUFFICIENT_DATA',
        currentLevel:
          dashboard.learningPath?.overallLevel ??
          dashboard.preferences?.currentLevel ??
          null,
        totalStudyMinutes:
          dashboard.week?.studyMinutes ??
          dashboard.analytics?.summary?.studyTimeMinutes ??
          0,
        totalCompletedActivities:
          dashboard.week?.completedActivities ??
          dashboard.analytics?.summary?.completedLessons ??
          0,
        totalXp: dashboard.xp?.total ?? 0,
        currentStreak: dashboard.currentStreak ?? 0,
        activeSkills: dashboard.skillProgress.filter((skill) => skill.percent > 0)
          .length,
      },
      learningPath: dashboard.learningPath
        ? {
            pathId: dashboard.learningPath.id ?? null,
            title: dashboard.learningPath.title ?? 'Learning path',
            currentLevel: dashboard.learningPath.overallLevel,
            currentUnit: dashboard.learningPath.currentPhase?.title ?? null,
            currentLesson: dashboard.learningPath.currentLesson ?? null,
            completedSteps: dashboard.learningPath.completedLessons ?? 0,
            totalSteps: dashboard.learningPath.totalLessons ?? 0,
            progressPercent: dashboard.learningPath.progressPercent ?? 0,
            nextStep: dashboard.learningPath.nextLesson ?? null,
            isCompleted: (dashboard.learningPath.progressPercent ?? 0) >= 100,
            isBlocked: false,
            blockedReason: null,
          }
        : {
            state: 'NOT_CREATED',
            action: { type: 'VIEW_LESSON', label: 'Take placement test', href: '/placement' },
          },
      skills: await this.getSkillProgress(userId),
      inProgress: inProgress.items.slice(0, 5),
      recentlyCompleted: history.items.slice(0, 8),
      recommendation: dashboard.currentLesson ?? dashboard.recommendedLesson,
      generatedAt: new Date(),
      timezone: dashboard.timezone,
    };
  }

  async getSkillProgress(userId: string, skill?: LearningSkill) {
    const dashboard = await this.dashboardService.getDashboard(userId);
    const activities = await this.collectActivities(userId, {
      limit: 50,
      range: ProgressRange.NINETY_DAYS,
      ...(skill ? { skill } : {}),
    });

    const skills = dashboard.skillProgress
      .filter((item) => !skill || item.key === skill)
      .map((item) => {
        const skillActivities = activities.filter((activity) => activity.skill === item.key);
        const completed = skillActivities.filter(
          (activity) => activity.status === UnifiedProgressStatus.COMPLETED,
        );
        const inProgress = skillActivities.filter(
          (activity) => activity.status === UnifiedProgressStatus.IN_PROGRESS,
        );
        const scores = completed
          .map((activity) => activity.score ?? activity.accuracy ?? null)
          .filter((value): value is number => typeof value === 'number');
        const last = skillActivities[0] ?? null;

        return {
          skill: item.key,
          currentLevel: item.level ?? null,
          status:
            item.percent <= 0
              ? 'INSUFFICIENT_DATA'
              : item.percent < 40
                ? 'NEEDS_PRACTICE'
                : inProgress.length
                  ? 'IN_PROGRESS'
                  : 'ON_TRACK',
          completedActivities: completed.length,
          inProgressActivities: inProgress.length,
          studyMinutes: Math.round(
            completed.reduce((sum, activity) => sum + (activity.durationSeconds ?? 0), 0) /
              60,
          ),
          recentScore: scores.at(0) ?? null,
          averageScore: this.average(scores),
          accuracy: this.average(
            completed
              .map((activity) => activity.accuracy ?? null)
              .filter((value): value is number => typeof value === 'number'),
          ),
          lastPracticedAt: last?.occurredAt ?? null,
          currentProgress: item.percent,
          targetProgress: 100,
          progressPercent: item.percent,
          nextAction: {
            type: 'VIEW_LESSON',
            label: item.percent > 0 ? 'Continue practice' : 'Start practice',
            href: item.href,
          },
        };
      });

    return skill ? (skills[0] ?? null) : skills;
  }

  async getInProgressItems(userId: string) {
    const items = (await this.collectActivities(userId, {
      status: UnifiedProgressStatus.IN_PROGRESS,
      range: ProgressRange.NINETY_DAYS,
      limit: 20,
    }))
      .filter((item) => item.action.type === 'RESUME' && item.action.href)
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        activityKey: item.activityKey,
        skill: item.skill,
        title: item.title,
        status: item.status,
        progress: item.metadata?.progressPercent ?? null,
        lastActivityAt: item.occurredAt,
        estimatedRemainingMinutes: null,
        resumeAction: item.action,
        expiresAt: null,
      }));

    return { items };
  }

  async getUnifiedHistory(userId: string, query: ProgressHistoryQueryDto) {
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
    const cursor = this.decodeCursor(query.cursor);
    const { timezone } = await this.resolveRange(userId, query);
    const collected = await this.collectActivities(userId, { ...query, limit: 80 });
    const filtered = collected
      .filter((item) => {
        if (!cursor) return true;
        if (item.occurredAt.getTime() < cursor.occurredAt.getTime()) return true;
        return (
          item.occurredAt.getTime() === cursor.occurredAt.getTime() &&
          item.activityKey < cursor.activityKey
        );
      })
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          right.activityKey.localeCompare(left.activityKey),
      );

    const items = filtered.slice(0, limit);
    const last = items.at(-1);

    return {
      items,
      groups: this.groupActivities(items, timezone),
      pagination: {
        limit,
        hasMore: filtered.length > limit,
        nextCursor:
          filtered.length > limit && last
            ? this.encodeCursor(last.occurredAt, last.activityKey)
            : null,
      },
    };
  }

  async getActivityDetail(userId: string, activityId: string) {
    const parsed = this.parseActivityKey(activityId);
    if (!parsed) {
      throw new NotFoundException('Activity not found.');
    }

    const activity = await this.findActivityByKey(userId, parsed.type, parsed.id);
    if (!activity) {
      throw new NotFoundException('Activity not found.');
    }

    return {
      summary: activity,
      result: {
        score: activity.score ?? null,
        accuracy: activity.accuracy ?? null,
        durationSeconds: activity.durationSeconds ?? null,
        xpEarned: activity.xpEarned ?? null,
        startedAt: activity.startedAt ?? null,
        completedAt: activity.completedAt ?? null,
      },
      skillSpecific: activity.metadata ?? {},
      action: activity.action,
    };
  }

  private async collectActivities(
    userId: string,
    query: ProgressHistoryQueryDto,
  ): Promise<UnifiedLearningActivity[]> {
    const range = await this.resolveRange(userId, query);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    const status = query.status ?? UnifiedProgressStatus.ALL;
    const skill = query.skill;

    const [
      vocabulary,
      grammar,
      reading,
      listening,
      speaking,
      writing,
      lessonProgress,
      xpRows,
    ] = await Promise.all([
      !skill || skill === LearningSkill.VOCABULARY
        ? this.prismaService.userWordProgress.findMany({
            where: {
              userId,
              OR: [
                { learnedAt: { gte: range.start, lt: range.end } },
                { masteredAt: { gte: range.start, lt: range.end } },
                { updatedAt: { gte: range.start, lt: range.end } },
              ],
            },
            include: { word: { select: { word: true, meaningVi: true, meaningEn: true } } },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      !skill || skill === LearningSkill.GRAMMAR
        ? this.prismaService.grammarLessonProgress.findMany({
            where: { userId, updatedAt: { gte: range.start, lt: range.end } },
            include: { lesson: { select: { id: true, title: true, duration: true, topic: { select: { title: true } } } } },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      !skill || skill === LearningSkill.READING
        ? this.prismaService.readingSession.findMany({
            where: {
              userId,
              OR: [
                { startedAt: { gte: range.start, lt: range.end } },
                { completedAt: { gte: range.start, lt: range.end } },
              ],
            },
            include: { article: { select: { title: true, slug: true, readTime: true } } },
            orderBy: { startedAt: 'desc' },
            take: limit,
          })
        : [],
      !skill || skill === LearningSkill.LISTENING
        ? this.prismaService.listeningSession.findMany({
            where: {
              userId,
              OR: [
                { startedAt: { gte: range.start, lt: range.end } },
                { completedAt: { gte: range.start, lt: range.end } },
              ],
            },
            orderBy: { startedAt: 'desc' },
            take: limit,
          })
        : [],
      !skill || skill === LearningSkill.SPEAKING
        ? this.prismaService.speakingSession.findMany({
            where: {
              userId,
              OR: [
                { startedAt: { gte: range.start, lt: range.end } },
                { finishedAt: { gte: range.start, lt: range.end } },
              ],
            },
            include: {
              lesson: { select: { title: true, slug: true } },
              topic: { select: { title: true, slug: true } },
            },
            orderBy: { startedAt: 'desc' },
            take: limit,
          })
        : [],
      !skill || skill === LearningSkill.WRITING
        ? this.prismaService.writingSession.findMany({
            where: {
              userId,
              OR: [
                { startedAt: { gte: range.start, lt: range.end } },
                { submittedAt: { gte: range.start, lt: range.end } },
                { updatedAt: { gte: range.start, lt: range.end } },
              ],
            },
            include: { lesson: { select: { title: true, duration: true, topic: { select: { title: true } } } } },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      this.prismaService.lessonProgress.findMany({
        where: {
          userId,
          OR: [
            { createdAt: { gte: range.start, lt: range.end } },
            { completedAt: { gte: range.start, lt: range.end } },
          ],
        },
        include: { lesson: { select: { title: true, duration: true } } },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      this.prismaService.xpTransaction.findMany({
        where: { userId, reversedAt: null, earnedAt: { gte: range.start, lt: range.end } },
        select: { sourceType: true, sourceId: true, finalXp: true },
      }),
    ]);

    const xp = this.buildXpMap(xpRows);
    const activities: UnifiedLearningActivity[] = [
      ...vocabulary.map((item) => this.mapVocabularyActivity(item, xp)),
      ...grammar.map((item) => this.mapGrammarActivity(item, xp)),
      ...reading.map((item) => this.mapReadingActivity(item, xp)),
      ...listening.map((item) => this.mapListeningActivity(item, xp)),
      ...speaking.map((item) => this.mapSpeakingActivity(item, xp)),
      ...writing.map((item) => this.mapWritingActivity(item, xp)),
      ...lessonProgress.map((item) => this.mapLessonActivity(item, xp)),
    ];

    return activities
      .filter((item) => !skill || item.skill === skill || item.skill === null)
      .filter((item) => status === UnifiedProgressStatus.ALL || item.status === status)
      .filter((item) => !query.activityType || item.type === query.activityType)
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          right.activityKey.localeCompare(left.activityKey),
      );
  }

  private async findActivityByKey(userId: string, type: string, id: string) {
    const activities = await this.collectActivities(userId, {
      limit: 100,
      range: ProgressRange.NINETY_DAYS,
    });
    return activities.find((item) => item.type === type && item.id === id) ?? null;
  }

  private mapVocabularyActivity(
    item: {
      id: string;
      wordId: string;
      status: string;
      seenCount: number;
      correctCount: number;
      wrongCount: number;
      learnedAt: Date | null;
      masteredAt: Date | null;
      updatedAt: Date;
      createdAt: Date;
      word: { word: string; meaningVi: string | null; meaningEn: string | null };
    },
    xp: Map<string, number>,
  ): UnifiedLearningActivity {
    const completedAt = item.masteredAt ?? item.learnedAt ?? null;
    const status = completedAt
      ? UnifiedProgressStatus.COMPLETED
      : item.status === 'NEW'
        ? UnifiedProgressStatus.STARTED
        : UnifiedProgressStatus.IN_PROGRESS;
    return {
      id: item.id,
      activityKey: this.activityKey('VOCABULARY_WORD_PROGRESS', item.id),
      type: 'VOCABULARY_WORD_PROGRESS',
      skill: LearningSkill.VOCABULARY,
      title: item.word.word,
      description: item.word.meaningVi ?? item.word.meaningEn,
      status,
      entityType: 'WORD',
      entityId: item.wordId,
      score: null,
      accuracy:
        item.correctCount + item.wrongCount > 0
          ? Math.round((item.correctCount / (item.correctCount + item.wrongCount)) * 100)
          : null,
      xpEarned: xp.get(this.xpKey(XpSourceType.VOCABULARY, item.wordId)) ?? null,
      durationSeconds: null,
      startedAt: item.createdAt,
      completedAt,
      occurredAt: completedAt ?? item.updatedAt,
      action: { type: 'VIEW_LESSON', label: 'Review vocabulary', href: '/vocabulary' },
      metadata: { seenCount: item.seenCount, correctCount: item.correctCount, wrongCount: item.wrongCount },
    };
  }

  private mapGrammarActivity(item: any, xp: Map<string, number>): UnifiedLearningActivity {
    const status = item.completed ? UnifiedProgressStatus.COMPLETED : UnifiedProgressStatus.IN_PROGRESS;
    return {
      id: item.id,
      activityKey: this.activityKey('GRAMMAR_LESSON_PROGRESS', item.id),
      type: 'GRAMMAR_LESSON_PROGRESS',
      skill: LearningSkill.GRAMMAR,
      title: item.lesson.title,
      description: item.lesson.topic?.title ?? null,
      status,
      entityType: 'GRAMMAR_LESSON',
      entityId: item.lessonId,
      score: item.score || null,
      accuracy: item.score || null,
      xpEarned: xp.get(this.xpKey(XpSourceType.GRAMMAR, item.lessonId)) ?? null,
      durationSeconds: item.lesson.duration ? item.lesson.duration * 60 : null,
      startedAt: item.createdAt,
      completedAt: item.completedAt,
      occurredAt: item.completedAt ?? item.updatedAt,
      action: {
        type: status === UnifiedProgressStatus.COMPLETED ? 'VIEW_RESULT' : 'RESUME',
        label: status === UnifiedProgressStatus.COMPLETED ? 'View lesson' : 'Resume grammar',
        href: `/grammar/lesson/${item.lessonId}`,
      },
    };
  }

  private mapReadingActivity(item: any, xp: Map<string, number>): UnifiedLearningActivity {
    const status = item.isCompleted ? UnifiedProgressStatus.COMPLETED : UnifiedProgressStatus.IN_PROGRESS;
    return {
      id: item.id,
      activityKey: this.activityKey('READING_SESSION', item.id),
      type: 'READING_SESSION',
      skill: LearningSkill.READING,
      title: item.article.title,
      description: `${item.article.readTime} minutes`,
      status,
      entityType: 'READING_SESSION',
      entityId: item.id,
      sessionId: item.id,
      score: item.score || null,
      accuracy: item.accuracy || null,
      xpEarned: xp.get(this.xpKey(XpSourceType.READING, item.id)) ?? item.earnedXp ?? null,
      durationSeconds: item.spentTime || null,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
      occurredAt: item.completedAt ?? item.startedAt,
      action: {
        type: status === UnifiedProgressStatus.COMPLETED ? 'VIEW_RESULT' : 'RESUME',
        label: status === UnifiedProgressStatus.COMPLETED ? 'View result' : 'Resume reading',
        href:
          status === UnifiedProgressStatus.COMPLETED
            ? `/reading/sessions/${item.id}/result`
            : `/reading/articles/${item.article.slug}`,
      },
    };
  }

  private mapListeningActivity(item: any, xp: Map<string, number>): UnifiedLearningActivity {
    const completed = Boolean(item.completedAt) || item.status === 'COMPLETED';
    const answered = item.correct + item.wrong + item.skipped;
    return {
      id: item.id,
      activityKey: this.activityKey('LISTENING_SESSION', item.id),
      type: 'LISTENING_SESSION',
      skill: LearningSkill.LISTENING,
      title: item.topic ? `Listening: ${item.topic}` : 'Listening practice',
      description: item.level,
      status: completed ? UnifiedProgressStatus.COMPLETED : UnifiedProgressStatus.IN_PROGRESS,
      entityType: 'LISTENING_SESSION',
      entityId: item.id,
      sessionId: item.id,
      score: item.score || null,
      accuracy: item.total > 0 ? Math.round((item.correct / item.total) * 100) : null,
      xpEarned: xp.get(this.xpKey(XpSourceType.LISTENING, item.id)) ?? item.xpEarned ?? null,
      durationSeconds: null,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
      occurredAt: item.completedAt ?? item.startedAt,
      action: {
        type: completed ? 'VIEW_RESULT' : 'RESUME',
        label: completed ? 'View result' : 'Resume listening',
        href: completed
          ? `/listening/sessions/${item.id}/result`
          : `/listening/practice/${item.id}`,
      },
      metadata: {
        correct: item.correct,
        wrong: item.wrong,
        skipped: item.skipped,
        progressPercent: item.total > 0 ? Math.round((answered / item.total) * 100) : 0,
      },
    };
  }

  private mapSpeakingActivity(item: any, xp: Map<string, number>): UnifiedLearningActivity {
    const completed = Boolean(item.finishedAt) || item.status === 'COMPLETED';
    return {
      id: item.id,
      activityKey: this.activityKey('SPEAKING_SESSION', item.id),
      type: 'SPEAKING_SESSION',
      skill: LearningSkill.SPEAKING,
      title: item.lesson?.title ?? item.topic?.title ?? 'Speaking practice',
      description: item.topic?.title ?? null,
      status: completed ? UnifiedProgressStatus.COMPLETED : UnifiedProgressStatus.IN_PROGRESS,
      entityType: 'SPEAKING_SESSION',
      entityId: item.id,
      sessionId: item.id,
      score: item.overallScore || null,
      accuracy: null,
      xpEarned: xp.get(this.xpKey(XpSourceType.SPEAKING, item.id)) ?? null,
      durationSeconds: item.duration || null,
      startedAt: item.startedAt,
      completedAt: item.finishedAt,
      occurredAt: item.finishedAt ?? item.updatedAt ?? item.startedAt,
      action: {
        type: completed ? 'VIEW_RESULT' : 'RESUME',
        label: completed ? 'View result' : 'Resume speaking',
        href: completed
          ? `/speaking/sessions/${item.id}/result`
          : `/speaking/practice/${item.id}`,
      },
      metadata: {
        pronunciation: item.pronunciation,
        fluency: item.fluency,
        grammar: item.grammar,
        vocabulary: item.vocabulary,
      },
    };
  }

  private mapWritingActivity(item: any, xp: Map<string, number>): UnifiedLearningActivity {
    const completed = Boolean(item.submittedAt) || item.isSubmitted;
    return {
      id: item.id,
      activityKey: this.activityKey('WRITING_SESSION', item.id),
      type: 'WRITING_SESSION',
      skill: LearningSkill.WRITING,
      title: item.lesson.title,
      description: item.lesson.topic?.title ?? null,
      status: completed ? UnifiedProgressStatus.COMPLETED : UnifiedProgressStatus.IN_PROGRESS,
      entityType: 'WRITING_SESSION',
      entityId: item.id,
      sessionId: item.id,
      score: item.overallScore ?? null,
      accuracy: null,
      xpEarned: xp.get(this.xpKey(XpSourceType.WRITING, item.id)) ?? null,
      durationSeconds: item.timeSpentSeconds || null,
      startedAt: item.startedAt,
      completedAt: item.submittedAt,
      occurredAt: item.submittedAt ?? item.updatedAt ?? item.startedAt,
      action: {
        type: completed ? 'VIEW_RESULT' : 'RESUME',
        label: completed ? 'View result' : 'Resume writing',
        href: completed
          ? `/writing/sessions/${item.id}/result`
          : `/writing/sessions/${item.id}`,
      },
      metadata: {
        wordCount: item.wordCount,
        grammarScore: item.grammarScore,
        vocabularyScore: item.vocabularyScore,
        coherenceScore: item.coherenceScore,
        taskScore: item.taskScore,
      },
    };
  }

  private mapLessonActivity(item: any, xp: Map<string, number>): UnifiedLearningActivity {
    const completed = Boolean(item.completedAt) || item.completed;
    return {
      id: item.id,
      activityKey: this.activityKey('LEARNING_PATH_LESSON', item.id),
      type: 'LEARNING_PATH_LESSON',
      skill: null,
      title: item.lesson.title,
      description: item.lesson.duration ? `${item.lesson.duration} minutes` : null,
      status: completed ? UnifiedProgressStatus.COMPLETED : UnifiedProgressStatus.IN_PROGRESS,
      entityType: 'LESSON',
      entityId: item.lessonId,
      score: null,
      accuracy: null,
      xpEarned: xp.get(this.xpKey(XpSourceType.LESSON, item.lessonId)) ?? null,
      durationSeconds: item.lesson.duration ? item.lesson.duration * 60 : null,
      startedAt: item.createdAt,
      completedAt: item.completedAt,
      occurredAt: item.completedAt ?? item.updatedAt,
      action: {
        type: completed ? 'VIEW_LESSON' : 'RESUME',
        label: completed ? 'View lesson' : 'Resume lesson',
        href: '/learning-path',
      },
    };
  }

  private async resolveRange(userId: string, query: ProgressHistoryQueryDto) {
    const settings = await this.settingsQuery.getSettings(userId);
    const timezone = normalizeUserTimezone(settings.timezone);
    const now = new Date();
    const todayStart = startOfUserDay(now, timezone);

    if (query.from || query.to) {
      const start = query.from ? new Date(query.from) : addUserDays(todayStart, -29, timezone);
      const end = query.to ? addUserDays(startOfUserDay(new Date(query.to), timezone), 1, timezone) : addUserDays(todayStart, 1, timezone);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw new BadRequestException('Invalid date range.');
      }
      const maxEnd = addUserDays(start, 91, timezone);
      if (end > maxEnd) throw new BadRequestException('Date range is too large.');
      return { start, end, timezone };
    }

    const days = RANGE_DAYS[query.range ?? ProgressRange.THIRTY_DAYS] ?? 30;
    return {
      start: addUserDays(todayStart, -(days - 1), timezone),
      end: addUserDays(todayStart, 1, timezone),
      timezone,
    };
  }

  private buildXpMap(
    rows: Array<{ sourceType: XpSourceType; sourceId: string | null; finalXp: number }>,
  ) {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (!row.sourceId) continue;
      const key = this.xpKey(row.sourceType, row.sourceId);
      map.set(key, (map.get(key) ?? 0) + row.finalXp);
    }
    return map;
  }

  private groupActivities(items: UnifiedLearningActivity[], timezone: string) {
    return items.reduce<Array<{ date: string; items: UnifiedLearningActivity[] }>>(
      (groups, item) => {
        const date = this.formatUserDateKey(item.occurredAt, timezone);
        const existing = groups.find((group) => group.date === date);
        if (existing) existing.items.push(item);
        else groups.push({ date, items: [item] });
        return groups;
      },
      [],
    );
  }

  private formatUserDateKey(date: Date, timezone: string) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private average(values: number[]) {
    if (!values.length) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private activityKey(type: string, id: string) {
    return `${type}:${id}`;
  }

  private parseActivityKey(value: string) {
    const decoded = decodeURIComponent(value);
    const [type, ...rest] = decoded.split(':');
    const id = rest.join(':');
    return type && id ? { type, id } : null;
  }

  private encodeCursor(occurredAt: Date, activityKey: string) {
    return Buffer.from(`${occurredAt.toISOString()}|${activityKey}`).toString('base64url');
  }

  private decodeCursor(cursor?: string) {
    if (!cursor) return null;
    try {
      const [date, activityKey] = Buffer.from(cursor, 'base64url').toString().split('|');
      if (!date || !activityKey) return null;
      return { occurredAt: new Date(date), activityKey };
    } catch {
      throw new BadRequestException('Invalid cursor.');
    }
  }

  private xpKey(sourceType: XpSourceType, sourceId: string) {
    return `${sourceType}:${sourceId}`;
  }
}
