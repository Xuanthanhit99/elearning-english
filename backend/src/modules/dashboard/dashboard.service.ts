import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AchievementStatus,
  LearningSkill,
  MissionV2Status,
  MissionV2Type,
  PlacementResultStatus,
  type PlacementProcessingItemStatus,
  type CefrLevel,
} from '@prisma/client';
import {
  addUserDays,
  dateKeyInTimezone,
  endOfUserWeek,
  getUserDaySeries,
  normalizeUserTimezone,
  startOfUserDay,
  startOfUserWeek,
} from 'src/common/time/user-timezone.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { LearningPathService } from '../learning-path/learning-path.service';
import { SettingsQueryService } from '../settings/settings-query.service';

const SKILLS: Array<{ key: LearningSkill; label: string; href: string }> = [
  { key: LearningSkill.VOCABULARY, label: 'Từ vựng', href: '/vocabulary' },
  { key: LearningSkill.GRAMMAR, label: 'Ngữ pháp', href: '/grammar' },
  { key: LearningSkill.LISTENING, label: 'Nghe', href: '/listening' },
  { key: LearningSkill.SPEAKING, label: 'Nói', href: '/speaking' },
  { key: LearningSkill.READING, label: 'Đọc', href: '/reading' },
  { key: LearningSkill.WRITING, label: 'Viết', href: '/writing' },
];

type RecentSession = {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  score?: number | null;
  status: string;
  completedAt: Date;
  href: string;
};

type DashboardPlacementResult = {
  skills: Array<{
    skill: LearningSkill;
    score: number;
    level: CefrLevel | null;
    status: PlacementProcessingItemStatus;
  }>;
} | null;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learningPathService: LearningPathService,
    private readonly settingsQuery: SettingsQueryService,
  ) {}

  async getDashboard(userId: string) {
    const settings = await this.settingsQuery.getSettings(userId);
    const timezone = normalizeUserTimezone(settings.timezone);

    const now = new Date();
    const startOfToday = startOfUserDay(now, timezone);
    const endOfToday = addUserDays(startOfToday, 1, timezone);
    const weekStart = startOfUserWeek(now, timezone);
    const weekEnd = endOfUserWeek(now, timezone);
    const weekDays = getUserDaySeries(weekStart, 7, timezone);

    const [
      user,
      xpProfile,
      xpTransactions,
      pet,
      missions,
      notifications,
      notificationUnreadCount,
      achievementSummary,
      recentAchievementRows,
      lessonProgress,
      vocabularyProgress,
      grammarProgress,
      listeningSessions,
      speakingSessions,
      readingSessions,
      writingSessions,
      listeningInProgress,
      speakingInProgress,
      readingInProgress,
      writingDrafts,
      placementResult,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullname: true,
          email: true,
          avatar: true,
          username: true,
          level: true,
          xp: true,
          englishLevel: true,
          learningGoal: true,
        },
      }),
      this.prisma.userXpProfile.findUnique({ where: { userId } }),
      this.prisma.xpTransaction.findMany({
        where: {
          userId,
          reversedAt: null,
          earnedAt: { gte: weekStart, lt: weekEnd },
        },
        select: {
          id: true,
          finalXp: true,
          skill: true,
          sourceType: true,
          sourceId: true,
          reason: true,
          earnedAt: true,
        },
        orderBy: { earnedAt: 'asc' },
      }),
      this.prisma.petProfile.findUnique({ where: { userId } }),
      this.prisma.userMissionV2.findMany({
        where: {
          userId,
          status: { notIn: [MissionV2Status.CANCELLED] },
          OR: [
            {
              type: MissionV2Type.DAILY,
              startsAt: { gte: startOfToday, lt: endOfToday },
            },
            { status: MissionV2Status.COMPLETED },
          ],
        },
        orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
      this.buildAchievementSummary(userId),
      this.prisma.userAchievement.findMany({
        where: {
          userId,
          status: {
            in: [
              AchievementStatus.UNLOCKED,
              AchievementStatus.CLAIMABLE,
              AchievementStatus.CLAIMED,
            ],
          },
        },
        include: {
          achievement: {
            select: {
              code: true,
              title: true,
              description: true,
              category: true,
              rewardXp: true,
              rewardCoins: true,
            },
          },
        },
        orderBy: [{ unlockedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 6,
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId, createdAt: { gte: weekStart, lt: weekEnd } },
        include: { lesson: { select: { title: true, duration: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.userWordProgress.findMany({
        where: { userId },
        select: {
          status: true,
          learnedAt: true,
          masteredAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.grammarLessonProgress.findMany({
        where: { userId },
        include: {
          lesson: {
            select: {
              title: true,
              slug: true,
              duration: true,
              topic: { select: { title: true, slug: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.listeningSession.findMany({
        where: {
          userId,
          OR: [{ completedAt: { not: null } }, { status: 'COMPLETED' }],
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
      this.prisma.speakingSession.findMany({
        where: { userId, finishedAt: { not: null } },
        include: {
          lesson: { select: { title: true, slug: true } },
          topic: { select: { title: true, slug: true } },
        },
        orderBy: { finishedAt: 'desc' },
        take: 10,
      }),
      this.prisma.readingSession.findMany({
        where: { userId, isCompleted: true, completedAt: { not: null } },
        include: {
          article: { select: { title: true, slug: true, readTime: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
      this.prisma.writingSession.findMany({
        where: { userId, isSubmitted: true, submittedAt: { not: null } },
        include: {
          lesson: {
            select: {
              title: true,
              slug: true,
              duration: true,
              topic: { select: { title: true, slug: true } },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        take: 10,
      }),
      this.prisma.listeningSession.findMany({
        where: { userId, status: 'IN_PROGRESS' },
        orderBy: { startedAt: 'desc' },
        take: 3,
      }),
      this.prisma.speakingSession.findMany({
        where: { userId, status: 'IN_PROGRESS' },
        include: {
          lesson: { select: { title: true, slug: true } },
          topic: { select: { title: true, slug: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      this.prisma.readingSession.findMany({
        where: { userId, isCompleted: false },
        include: {
          article: { select: { title: true, slug: true, readTime: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 3,
      }),
      this.prisma.writingSession.findMany({
        where: {
          userId,
          isSubmitted: false,
          content: { not: null },
        },
        include: {
          lesson: {
            select: {
              title: true,
              slug: true,
              duration: true,
              topic: { select: { title: true, slug: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      this.prisma.placementResult.findFirst({
        where: { userId, status: PlacementResultStatus.READY },
        include: {
          phases: { orderBy: { phase: 'asc' } },
          skills: true,
          courses: { orderBy: { order: 'asc' } },
        },
        orderBy: { generatedAt: 'desc' },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const recentSessions = this.buildRecentSessions({
      listeningSessions,
      speakingSessions,
      readingSessions,
      writingSessions,
      grammarProgress,
      lessonProgress,
    });

    const recommendedLesson = await this.getRecommendedLesson(userId);
    const continueLearning = this.buildContinueLearning({
      listeningInProgress,
      speakingInProgress,
      readingInProgress,
      writingDrafts,
    });
    const skillProgress = await this.buildSkillProgress(
      userId,
      placementResult,
      {
        vocabularyProgress,
        grammarProgress,
        listeningSessions,
        speakingSessions,
        readingSessions,
        writingSessions,
      },
    );
    const weeklyActivity = this.buildWeeklyActivity(weekDays, {
      xpTransactions,
      lessonProgress,
      listeningSessions,
      readingSessions,
      writingSessions,
      speakingSessions,
      timezone,
    });
    const todayKey = this.dateKey(now, timezone);
    const todayActivity = weeklyActivity.find((item) => item.date === todayKey);
    const todayStudyMinutes = todayActivity?.minutes ?? 0;
    const mappedMissions = this.mapMissions(missions);
    const learningPathDetail = await this.getLearningPathDetail(userId);
    const learningPathCurrentLesson = learningPathDetail?.currentLesson
      ? this.mapLearningPathLesson(learningPathDetail.currentLesson)
      : null;
    const mergedContinueLearning = [
      ...continueLearning,
      ...(learningPathCurrentLesson ? [learningPathCurrentLesson] : []),
    ].slice(0, 5);

    return {
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        englishLevel: user.englishLevel,
        learningGoal: user.learningGoal,
      },
      // Real settings-driven flags — the frontend must use these instead of
      // re-deriving them, so behavior stays consistent everywhere the
      // dashboard is rendered.
      preferences: {
        focusMode: settings.focusMode,
        adaptiveDashboard: settings.adaptiveDashboard,
        energyMode: settings.energyMode,
        learningGoal: settings.learningGoal,
        currentLevel: settings.currentLevel,
      },
      widgetVisibility: {
        community: !settings.focusMode,
        leaderboard: !settings.focusMode,
      },
      currentStreak: pet?.streak ?? 0,
      xp: {
        total: xpProfile?.totalXp ?? user.xp,
        today: xpTransactions
          .filter(
            (item) =>
              item.earnedAt >= startOfToday && item.earnedAt < endOfToday,
          )
          .reduce((sum, item) => sum + item.finalXp, 0),
        week: xpTransactions.reduce((sum, item) => sum + item.finalXp, 0),
        level: xpProfile?.currentLevel ?? user.level,
      },
      coins: pet?.coins ?? 0,
      energy: pet?.energy ?? 0,
      pet: pet
        ? {
            id: pet.id,
            petType: pet.petType,
            petName: pet.petName,
            level: Math.floor(pet.xp / 100) + 1,
            xp: pet.xp,
            hp: pet.hp,
            energy: pet.energy,
            happiness: pet.happiness,
            hunger: pet.hunger,
            isChosen: pet.isChosen,
          }
        : null,
      todayMissions: mappedMissions,
      missions: mappedMissions,
      today: {
        date: todayKey,
        studyMinutes: todayStudyMinutes,
        targetStudyMinutes: settings.dailyStudyMinutes,
        completedActivities: todayActivity?.lessons ?? 0,
        completedLessons: todayActivity?.lessons ?? 0,
        wordsLearned: vocabularyProgress.filter(
          (item) => item.learnedAt && item.learnedAt >= startOfToday,
        ).length,
        wordsReviewed: vocabularyProgress.filter(
          (item) => item.updatedAt >= startOfToday && !item.learnedAt,
        ).length,
        xpEarned: xpTransactions
          .filter(
            (item) =>
              item.earnedAt >= startOfToday && item.earnedAt < endOfToday,
          )
          .reduce((sum, item) => sum + item.finalXp, 0),
        missionsCompleted: mappedMissions.summary.completed,
        dailyGoalProgress:
          settings.dailyStudyMinutes > 0
            ? Math.min(
                100,
                Math.round(
                  (todayStudyMinutes / settings.dailyStudyMinutes) * 100,
                ),
              )
            : 0,
        isGoalCompleted:
          settings.dailyStudyMinutes > 0 &&
          todayStudyMinutes >= settings.dailyStudyMinutes,
      },
      week: {
        weekStart: this.dateKey(weekStart, timezone),
        weekEnd: this.dateKey(addUserDays(weekEnd, -1, timezone), timezone),
        studyMinutes: weeklyActivity.reduce(
          (sum, item) => sum + item.minutes,
          0,
        ),
        activeDays: weeklyActivity.filter(
          (item) => item.minutes > 0 || item.xp > 0 || item.lessons > 0,
        ).length,
        targetDays: settings.weeklyTargetDays,
        completedActivities: weeklyActivity.reduce(
          (sum, item) => sum + item.lessons,
          0,
        ),
        xpEarned: weeklyActivity.reduce((sum, item) => sum + item.xp, 0),
        dailySeries: weeklyActivity,
      },
      achievements: achievementSummary,
      // `learningPathDetail` now always resolves to something for every
      // user (see LearningPathService.buildDefaultFoundationPath) — a user
      // with no completed Placement gets a DEFAULT_FOUNDATION shape with
      // per-skill starting lessons instead of an AI-generated
      // phases/priorities structure, so this must never fall through to a
      // bare "empty" state when foundation content actually exists.
      learningPath: learningPathDetail
        ? learningPathDetail.source === 'PLACEMENT'
          ? {
              source: 'PLACEMENT' as const,
              id: learningPathDetail.id,
              title: learningPathDetail.title,
              overallLevel: learningPathDetail.overallLevel,
              overallScore:
                learningPathDetail.overallScore !== null
                  ? Math.round(learningPathDetail.overallScore)
                  : null,
              progressPercent: learningPathDetail.progressPercent,
              completedLessons: learningPathDetail.completedLessons,
              totalLessons: learningPathDetail.totalLessons,
              currentLesson: learningPathDetail.currentLesson,
              nextLesson: learningPathDetail.nextLesson,
              currentPhase:
                learningPathDetail.phases.find((phase) => phase.progress < 100) ??
                learningPathDetail.phases.at(-1) ??
                null,
              phases: learningPathDetail.phases.map((phase) => ({
                id: phase.id,
                title: phase.title,
                phase: phase.phase,
                targetLevel: phase.targetLevel,
                progress: phase.progress,
              })),
              recommendedCourses: learningPathDetail.courses
                .slice(0, 3)
                .map((course) => ({
                  id: course.id,
                  title: course.title,
                  slug: course.slug,
                  lessonCount: course.lessonCount,
                  reason: course.reason,
                })),
              skillLevels: learningPathDetail.skills,
            }
          : {
              source: 'DEFAULT_FOUNDATION' as const,
              id: null,
              title: learningPathDetail.title,
              overallLevel: null,
              overallScore: null,
              progressPercent: 0,
              completedLessons: 0,
              totalLessons: 0,
              currentLesson: learningPathDetail.currentLesson,
              nextLesson: learningPathDetail.nextLesson,
              currentPhase: null,
              phases: [],
              recommendedCourses: [],
              skillLevels: learningPathDetail.skills,
            }
        : placementResult
          ? {
              source: 'PLACEMENT' as const,
              overallLevel: placementResult.overallLevel,
              overallScore: Math.round(placementResult.overallScore),
              progressPercent: this.average(
                placementResult.phases.map((phase) => phase.progress),
              ),
              currentPhase:
                placementResult.phases.find((phase) => phase.progress < 100) ??
                placementResult.phases.at(-1) ??
                null,
              phases: placementResult.phases.map((phase) => ({
                id: phase.id,
                title: phase.title,
                phase: phase.phase,
                targetLevel: phase.targetLevel,
                progress: phase.progress,
              })),
              recommendedCourses: placementResult.courses
                .slice(0, 3)
                .map((course) => ({
                  id: course.id,
                  title: course.title,
                  slug: course.slug,
                  lessonCount: course.lessonCount,
                  reason: course.reason,
                })),
            }
          : null,
      currentLesson: mergedContinueLearning[0] ?? recommendedLesson,
      continueLearning: {
        items: mergedContinueLearning,
      },
      recommendedLesson,
      recommendations: this.buildRecommendations(
        recommendedLesson,
        placementResult,
      ),
      quickActions: [
        {
          id: 'daily-learn',
          title: 'Học hôm nay',
          description: 'Mở bài học phù hợp với mục tiêu hiện tại.',
          href: '/learn',
          icon: 'play',
        },
        {
          id: 'review',
          title: 'Ôn tập',
          description: 'Ôn lại kiến thức cần củng cố.',
          href: '/vocabulary/review',
          icon: 'refresh',
        },
        {
          id: 'placement',
          title: 'Cập nhật trình độ',
          description: 'Làm placement để cá nhân hóa lộ trình.',
          href: '/placement',
          icon: 'target',
        },
      ],
      weeklyActivity,
      skillProgress,
      analytics: this.buildAnalytics({
        weeklyActivity,
        skillProgress,
        currentStreak: pet?.streak ?? 0,
        missions,
        placementResult,
        vocabularyProgress,
        grammarProgress,
        listeningSessions,
        speakingSessions,
        readingSessions,
        writingSessions,
      }),
      recentSessions,
      recentAchievements: recentAchievementRows.map((item) => ({
        id: item.id,
        code: item.achievement.code,
        title: item.achievement.title,
        description: item.achievement.description,
        type: item.achievement.category,
        xp: item.achievement.rewardXp,
        coins: item.achievement.rewardCoins,
        earnedAt: item.unlockedAt ?? item.updatedAt,
        href: `/achievements?code=${item.achievement.code}`,
      })),
      notificationsPreview: notifications.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        read: item.isRead,
        createdAt: item.createdAt,
        href: '/notifications',
      })),
      notificationUnreadCount,
      generatedAt: now,
      timezone,
    };
  }

  private async getLearningPathDetail(userId: string) {
    try {
      return await this.learningPathService.getLearningPath(userId);
    } catch {
      return null;
    }
  }

  private async buildAchievementSummary(userId: string) {
    const [total, grouped, recentUnlocks, closest] = await Promise.all([
      this.prisma.achievement.count({ where: { isActive: true } }),
      this.prisma.userAchievement.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.userAchievement.findMany({
        where: {
          userId,
          status: {
            in: [
              AchievementStatus.UNLOCKED,
              AchievementStatus.CLAIMABLE,
              AchievementStatus.CLAIMED,
            ],
          },
        },
        include: {
          achievement: {
            select: {
              code: true,
              title: true,
              description: true,
              category: true,
              rewardXp: true,
              rewardCoins: true,
            },
          },
        },
        orderBy: [{ unlockedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 5,
      }),
      this.prisma.userAchievement.findMany({
        where: {
          userId,
          status: {
            in: [AchievementStatus.IN_PROGRESS, AchievementStatus.LOCKED],
          },
        },
        include: {
          achievement: {
            select: {
              code: true,
              title: true,
              description: true,
              targetValue: true,
              rewardXp: true,
              rewardCoins: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 20,
      }),
    ]);

    const count = (status: AchievementStatus) =>
      grouped.find((item) => item.status === status)?._count._all ?? 0;
    const unlocked =
      count(AchievementStatus.UNLOCKED) +
      count(AchievementStatus.CLAIMABLE) +
      count(AchievementStatus.CLAIMED);

    return {
      total,
      unlocked,
      inProgress: count(AchievementStatus.IN_PROGRESS),
      claimable: count(AchievementStatus.CLAIMABLE),
      claimed: count(AchievementStatus.CLAIMED),
      completionPercentage:
        total > 0 ? Math.round((unlocked / Math.max(total, 1)) * 100) : 0,
      recentUnlocks: recentUnlocks.map((item) => ({
        id: item.id,
        code: item.achievement.code,
        title: item.achievement.title,
        description: item.achievement.description,
        category: item.achievement.category,
        xp: item.achievement.rewardXp,
        coins: item.achievement.rewardCoins,
        unlockedAt: item.unlockedAt ?? item.updatedAt,
      })),
      nextClosestAchievements: closest
        .map((item) => ({
          id: item.id,
          code: item.achievement.code,
          title: item.achievement.title,
          description: item.achievement.description,
          currentValue: item.currentValue,
          targetValue: item.targetSnapshot || item.achievement.targetValue,
          progressPercent: Math.min(
            100,
            Math.round(
              (item.currentValue /
                Math.max(
                  item.targetSnapshot || item.achievement.targetValue,
                  1,
                )) *
                100,
            ),
          ),
          xp: item.achievement.rewardXp,
          coins: item.achievement.rewardCoins,
        }))
        .sort((left, right) => right.progressPercent - left.progressPercent)
        .slice(0, 5),
    };
  }

  private mapLearningPathLesson(lesson: {
    id: string;
    title: string;
    sectionTitle: string;
    status: string;
    duration: number | null;
    href: string;
  }) {
    return {
      id: lesson.id,
      type: 'LEARNING_PATH',
      title: lesson.title,
      subtitle: lesson.sectionTitle,
      progressPercent: lesson.status === 'COMPLETED' ? 100 : 0,
      updatedAt: new Date(),
      href: lesson.href,
      level: null,
      estimatedMinutes: lesson.duration,
    };
  }

  private async getRecommendedLesson(userId: string) {
    const grammar = await this.prisma.grammarLesson.findFirst({
      where: {
        isActive: true,
        progress: { none: { userId, completed: true } },
      },
      include: { topic: { select: { title: true, slug: true, level: true } } },
      orderBy: [{ topic: { order: 'asc' } }, { order: 'asc' }],
    });

    if (grammar) {
      return {
        id: grammar.id,
        type: 'GRAMMAR',
        title: grammar.title,
        subtitle: grammar.topic.title,
        level: grammar.topic.level,
        estimatedMinutes: grammar.duration,
        href: `/grammar/lesson/${grammar.id}`,
      };
    }

    const writing = await this.prisma.writingLesson.findFirst({
      where: {
        isActive: true,
        sessions: { none: { userId, isSubmitted: true } },
      },
      include: { topic: { select: { title: true, slug: true } } },
      orderBy: [{ topic: { order: 'asc' } }, { order: 'asc' }],
    });

    if (writing) {
      return {
        id: writing.id,
        type: 'WRITING',
        title: writing.title,
        subtitle: writing.topic.title,
        level: writing.level,
        estimatedMinutes: writing.duration,
        href: `/writing/topics/${writing.topic.slug}`,
      };
    }

    const reading = await this.prisma.readingArticle.findFirst({
      where: {
        isPublished: true,
        sessions: { none: { userId, isCompleted: true } },
      },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    if (reading) {
      return {
        id: reading.id,
        type: 'READING',
        title: reading.title,
        subtitle: reading.category.name,
        level: reading.level,
        estimatedMinutes: reading.readTime,
        href: `/reading/articles/${reading.slug}`,
      };
    }

    return null;
  }

  private mapMissions(
    missions: Awaited<ReturnType<typeof this.prisma.userMissionV2.findMany>>,
  ) {
    const today = missions.filter(
      (mission) => mission.type === MissionV2Type.DAILY,
    );
    const isCompleted = (status: MissionV2Status) =>
      status === MissionV2Status.COMPLETED ||
      status === MissionV2Status.CLAIMED;

    return {
      summary: {
        completed: today.filter((mission) => isCompleted(mission.status))
          .length,
        total: today.length,
        claimable: today.filter(
          (mission) => mission.status === MissionV2Status.COMPLETED,
        ).length,
      },
      items: today.map((mission) => ({
        id: mission.id,
        title: mission.title,
        description: mission.description,
        type: mission.type,
        action: mission.action,
        skill: mission.skill,
        progress: mission.progress,
        target: mission.target,
        progressPercent: Math.min(
          100,
          Math.round((mission.progress / Math.max(mission.target, 1)) * 100),
        ),
        status: mission.status,
        completed: isCompleted(mission.status),
        reward: {
          xp: mission.rewardXp,
          coins: mission.rewardCoins,
          food: mission.rewardFood,
          energy: mission.rewardEnergy,
          happiness: mission.rewardHappiness,
        },
      })),
    };
  }

  private buildContinueLearning(data: {
    listeningInProgress: Array<{
      id: string;
      topic: string | null;
      level: string | null;
      startedAt: Date;
      total: number;
      correct: number;
      wrong: number;
      skipped: number;
    }>;
    speakingInProgress: Array<{
      id: string;
      updatedAt: Date;
      lesson: { title: string; slug: string } | null;
      topic: { title: string; slug: string } | null;
    }>;
    readingInProgress: Array<{
      id: string;
      startedAt: Date;
      article: { title: string; slug: string; readTime: number };
    }>;
    writingDrafts: Array<{
      id: string;
      updatedAt: Date;
      wordCount: number;
      lesson: {
        title: string;
        duration: number;
        topic: { title: string; slug: string };
      };
    }>;
  }) {
    return [
      ...data.listeningInProgress.map((item) => {
        const answered = item.correct + item.wrong + item.skipped;
        return {
          id: item.id,
          type: 'LISTENING',
          title: item.topic ? `Luyện nghe: ${item.topic}` : 'Luyện nghe',
          subtitle: item.level,
          progressPercent:
            item.total > 0 ? Math.round((answered / item.total) * 100) : 0,
          updatedAt: item.startedAt,
          href: `/listening/practice/${item.id}`,
        };
      }),
      ...data.speakingInProgress.map((item) => ({
        id: item.id,
        type: 'SPEAKING',
        title: item.lesson?.title ?? item.topic?.title ?? 'Luyện nói',
        subtitle: item.topic?.title ?? null,
        progressPercent: 0,
        updatedAt: item.updatedAt,
        href: `/speaking/practice/${item.id}`,
      })),
      ...data.readingInProgress.map((item) => ({
        id: item.id,
        type: 'READING',
        title: item.article.title,
        subtitle: `${item.article.readTime} phút`,
        progressPercent: 0,
        updatedAt: item.startedAt,
        href: `/reading/articles/${item.article.slug}`,
      })),
      ...data.writingDrafts.map((item) => ({
        id: item.id,
        type: 'WRITING',
        title: item.lesson.title,
        subtitle: item.lesson.topic.title,
        progressPercent:
          item.wordCount > 0 ? Math.min(90, Math.max(20, item.wordCount)) : 15,
        updatedAt: item.updatedAt,
        href: `/writing/sessions/${item.id}`,
      })),
    ]
      .sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      )
      .slice(0, 5)
      .map((item) => ({
        ...item,
        updatedAt: item.updatedAt,
      }));
  }

  private buildRecommendations(
    recommendedLesson: Awaited<ReturnType<typeof this.getRecommendedLesson>>,
    placementResult: {
      courses?: Array<{
        id: string;
        title: string;
        slug: string | null;
        lessonCount: number | null;
        reason: string;
      }>;
    } | null,
  ) {
    const courseItems =
      placementResult?.courses?.slice(0, 3).map((course) => ({
        id: course.id,
        type: 'COURSE',
        title: course.title,
        subtitle: course.reason,
        href: course.slug ? `/courses/${course.slug}` : '/learning-path',
        meta: course.lessonCount ? `${course.lessonCount} bài học` : null,
      })) ?? [];

    return [
      ...(recommendedLesson
        ? [
            {
              id: recommendedLesson.id,
              type: recommendedLesson.type,
              title: recommendedLesson.title,
              subtitle: recommendedLesson.subtitle,
              href: recommendedLesson.href,
              meta: recommendedLesson.estimatedMinutes
                ? `${recommendedLesson.estimatedMinutes} phút`
                : (recommendedLesson.level ?? null),
            },
          ]
        : []),
      ...courseItems,
    ].slice(0, 4);
  }

  private async buildSkillProgress(
    userId: string,
    placementResult: DashboardPlacementResult,
    data: {
      vocabularyProgress: Array<{
        status: string;
        learnedAt: Date | null;
        masteredAt: Date | null;
        updatedAt: Date;
      }>;
      grammarProgress: Array<{ completed: boolean; score: number }>;
      listeningSessions: Array<{ score: number; completedAt: Date | null }>;
      speakingSessions: Array<{
        overallScore: number;
        finishedAt: Date | null;
      }>;
      readingSessions: Array<{ accuracy: number; completedAt: Date | null }>;
      writingSessions: Array<{
        overallScore: number | null;
        submittedAt: Date | null;
      }>;
    },
  ) {
    const placementScores = new Map(
      (placementResult?.skills ?? []).map((item) => [
        item.skill,
        {
          percent: Math.round(item.score),
          level: item.level,
          status: item.status,
        },
      ]),
    );

    const totals = {
      [LearningSkill.VOCABULARY]: this.vocabularyPercent(
        data.vocabularyProgress,
      ),
      [LearningSkill.GRAMMAR]: this.average(
        data.grammarProgress.map((item) => item.score),
      ),
      [LearningSkill.LISTENING]: this.average(
        data.listeningSessions.map((item) => item.score),
      ),
      [LearningSkill.SPEAKING]: this.average(
        data.speakingSessions.map((item) => item.overallScore),
      ),
      [LearningSkill.READING]: this.average(
        data.readingSessions.map((item) => item.accuracy),
      ),
      [LearningSkill.WRITING]: this.average(
        data.writingSessions.map((item) => item.overallScore ?? 0),
      ),
    };

    const userSkillLevels = await this.prisma.userSkillLevel.findMany({
      where: { userId },
    });
    const levels = new Map(
      userSkillLevels.map((item) => [item.skill, item.level]),
    );

    return SKILLS.map((skill) => {
      const placement = placementScores.get(skill.key);
      const percent = placement?.percent ?? totals[skill.key] ?? 0;

      return {
        key: skill.key,
        label: skill.label,
        percent,
        level: placement?.level ?? levels.get(skill.key) ?? null,
        status: placement?.status ?? null,
        href: skill.href,
      };
    });
  }

  private buildRecentSessions(data: {
    listeningSessions: Array<{
      id: string;
      topic: string | null;
      level: string | null;
      score: number;
      completedAt: Date | null;
    }>;
    speakingSessions: Array<{
      id: string;
      overallScore: number;
      finishedAt: Date | null;
      lesson: { title: string; slug: string } | null;
      topic: { title: string; slug: string } | null;
    }>;
    readingSessions: Array<{
      id: string;
      score: number;
      accuracy: number;
      completedAt: Date | null;
      article: { title: string; slug: string; readTime: number };
    }>;
    writingSessions: Array<{
      id: string;
      overallScore: number | null;
      submittedAt: Date | null;
      lesson: {
        title: string;
        slug: string;
        topic: { title: string; slug: string };
      };
    }>;
    grammarProgress: Array<{
      id: string;
      score: number;
      completedAt: Date | null;
      lesson: {
        title: string;
        slug: string;
        topic: { title: string; slug: string };
      };
    }>;
    lessonProgress: Array<{
      id: string;
      completed: boolean;
      completedAt: Date | null;
      updatedAt: Date;
      lesson: { title: string; duration: number | null };
    }>;
  }): RecentSession[] {
    const sessions: RecentSession[] = [
      ...data.listeningSessions
        .filter((item) => item.completedAt)
        .map((item) => ({
          id: item.id,
          type: 'LISTENING',
          title: item.topic ? `Luyện nghe: ${item.topic}` : 'Luyện nghe',
          subtitle: item.level,
          score: item.score,
          status: 'COMPLETED',
          completedAt: item.completedAt as Date,
          href: `/listening/sessions/${item.id}/result`,
        })),
      ...data.speakingSessions
        .filter((item) => item.finishedAt)
        .map((item) => ({
          id: item.id,
          type: 'SPEAKING',
          title: item.lesson?.title ?? item.topic?.title ?? 'Luyện nói',
          subtitle: item.topic?.title,
          score: item.overallScore,
          status: 'COMPLETED',
          completedAt: item.finishedAt as Date,
          href: `/speaking/sessions/${item.id}/result`,
        })),
      ...data.readingSessions
        .filter((item) => item.completedAt)
        .map((item) => ({
          id: item.id,
          type: 'READING',
          title: item.article.title,
          subtitle: `${item.article.readTime} phút`,
          score: item.accuracy || item.score,
          status: 'COMPLETED',
          completedAt: item.completedAt as Date,
          href: `/reading/sessions/${item.id}/result`,
        })),
      ...data.writingSessions
        .filter((item) => item.submittedAt)
        .map((item) => ({
          id: item.id,
          type: 'WRITING',
          title: item.lesson.title,
          subtitle: item.lesson.topic.title,
          score: item.overallScore,
          status: 'COMPLETED',
          completedAt: item.submittedAt as Date,
          href: `/writing/sessions/${item.id}/result`,
        })),
      ...data.grammarProgress
        .filter((item) => item.completedAt)
        .map((item) => ({
          id: item.id,
          type: 'GRAMMAR',
          title: item.lesson.title,
          subtitle: item.lesson.topic.title,
          score: item.score,
          status: 'COMPLETED',
          completedAt: item.completedAt as Date,
          href: `/grammar/lesson/${item.lesson.slug}`,
        })),
      ...data.lessonProgress
        .filter((item) => item.completedAt)
        .map((item) => ({
          id: item.id,
          type: 'LESSON',
          title: item.lesson.title,
          subtitle: item.lesson.duration
            ? `${item.lesson.duration} phút`
            : null,
          score: null,
          status: item.completed ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: item.completedAt as Date,
          href: '/learning-path',
        })),
    ];

    return sessions
      .sort(
        (left, right) =>
          right.completedAt.getTime() - left.completedAt.getTime(),
      )
      .slice(0, 8);
  }

  private buildWeeklyActivity(
    days: Date[],
    data: {
      xpTransactions: Array<{ earnedAt: Date; finalXp: number }>;
      lessonProgress: Array<{
        createdAt: Date;
        completedAt: Date | null;
        lesson: { duration: number | null };
      }>;
      listeningSessions: Array<{ completedAt: Date | null }>;
      readingSessions: Array<{
        completedAt: Date | null;
        article: { readTime: number };
      }>;
      writingSessions: Array<{
        submittedAt: Date | null;
        timeSpentSeconds: number;
      }>;
      speakingSessions: Array<{ finishedAt: Date | null; duration: number }>;
      timezone: string;
    },
  ) {
    return days.map((day) => {
      const key = this.dateKey(day, data.timezone);
      const xp = data.xpTransactions
        .filter((item) => this.dateKey(item.earnedAt, data.timezone) === key)
        .reduce((sum, item) => sum + item.finalXp, 0);
      const genericLessons = data.lessonProgress.filter(
        (item) =>
          item.completedAt &&
          this.dateKey(item.completedAt, data.timezone) === key,
      );
      const listening = data.listeningSessions.filter(
        (item) =>
          item.completedAt &&
          this.dateKey(item.completedAt, data.timezone) === key,
      );
      const reading = data.readingSessions.filter(
        (item) =>
          item.completedAt &&
          this.dateKey(item.completedAt, data.timezone) === key,
      );
      const writing = data.writingSessions.filter(
        (item) =>
          item.submittedAt &&
          this.dateKey(item.submittedAt, data.timezone) === key,
      );
      const speaking = data.speakingSessions.filter(
        (item) =>
          item.finishedAt &&
          this.dateKey(item.finishedAt, data.timezone) === key,
      );

      const minutes =
        genericLessons.reduce(
          (sum, item) => sum + (item.lesson.duration ?? 0),
          0,
        ) +
        reading.reduce((sum, item) => sum + item.article.readTime, 0) +
        writing.reduce(
          (sum, item) => sum + Math.round(item.timeSpentSeconds / 60),
          0,
        ) +
        speaking.reduce((sum, item) => sum + Math.round(item.duration / 60), 0);

      return {
        date: key,
        label: day.toLocaleDateString('vi-VN', { weekday: 'short' }),
        xp,
        lessons:
          genericLessons.length +
          listening.length +
          reading.length +
          writing.length +
          speaking.length,
        minutes,
      };
    });
  }

  private buildAnalytics(data: {
    weeklyActivity: Array<{
      date: string;
      label: string;
      xp: number;
      lessons: number;
      minutes: number;
    }>;
    skillProgress: Array<{
      key: LearningSkill;
      label: string;
      percent: number;
      level?: CefrLevel | null;
      href: string;
    }>;
    currentStreak: number;
    missions: Array<{
      status: MissionV2Status;
      type: MissionV2Type;
      progress: number;
      target: number;
      rewardXp: number;
    }>;
    placementResult: {
      progressPercent?: number;
      phases?: Array<{ progress: number }>;
    } | null;
    vocabularyProgress: Array<{
      status: string;
      learnedAt: Date | null;
      masteredAt: Date | null;
      updatedAt: Date;
    }>;
    grammarProgress: Array<{
      completed: boolean;
      score: number;
      updatedAt: Date;
    }>;
    listeningSessions: Array<{ score: number; completedAt: Date | null }>;
    speakingSessions: Array<{ overallScore: number; finishedAt: Date | null }>;
    readingSessions: Array<{ accuracy: number; completedAt: Date | null }>;
    writingSessions: Array<{
      overallScore: number | null;
      submittedAt: Date | null;
      timeSpentSeconds: number;
    }>;
  }) {
    const completedMissionCount = data.missions.filter(
      (mission) =>
        mission.status === MissionV2Status.COMPLETED ||
        mission.status === MissionV2Status.CLAIMED,
    ).length;
    const totalStudyMinutes = data.weeklyActivity.reduce(
      (sum, item) => sum + item.minutes,
      0,
    );
    const totalXp = data.weeklyActivity.reduce((sum, item) => sum + item.xp, 0);
    const totalLessons = data.weeklyActivity.reduce(
      (sum, item) => sum + item.lessons,
      0,
    );
    const strongestSkill =
      [...data.skillProgress].sort(
        (left, right) => right.percent - left.percent,
      )[0] ?? null;
    const weakestSkill =
      [...data.skillProgress].sort(
        (left, right) => left.percent - right.percent,
      )[0] ?? null;
    const learningPathPercent = data.placementResult?.phases
      ? this.average(data.placementResult.phases.map((phase) => phase.progress))
      : 0;

    return {
      summary: {
        xp: totalXp,
        studyTimeMinutes: totalStudyMinutes,
        streak: data.currentStreak,
        completedMissions: completedMissionCount,
        completedLessons: totalLessons,
        learningPathPercent,
      },
      skillBreakdown: {
        vocabulary: {
          percent: this.vocabularyPercent(data.vocabularyProgress),
          learned: data.vocabularyProgress.filter(
            (item) =>
              item.learnedAt || item.masteredAt || item.status !== 'NEW',
          ).length,
          mastered: data.vocabularyProgress.filter(
            (item) => item.masteredAt || item.status === 'MASTERED',
          ).length,
        },
        grammar: {
          percent: this.average(data.grammarProgress.map((item) => item.score)),
          completed: data.grammarProgress.filter((item) => item.completed)
            .length,
        },
        reading: {
          percent: this.average(
            data.readingSessions.map((item) => item.accuracy),
          ),
          completed: data.readingSessions.filter((item) => item.completedAt)
            .length,
        },
        listening: {
          percent: this.average(
            data.listeningSessions.map((item) => item.score),
          ),
          completed: data.listeningSessions.filter((item) => item.completedAt)
            .length,
        },
        speaking: {
          percent: this.average(
            data.speakingSessions.map((item) => item.overallScore),
          ),
          completed: data.speakingSessions.filter((item) => item.finishedAt)
            .length,
        },
        writing: {
          percent: this.average(
            data.writingSessions.map((item) => item.overallScore ?? 0),
          ),
          completed: data.writingSessions.filter((item) => item.submittedAt)
            .length,
        },
      },
      charts: {
        weeklyXp: data.weeklyActivity.map((item) => ({
          date: item.date,
          label: item.label,
          value: item.xp,
        })),
        weeklyStudyTime: data.weeklyActivity.map((item) => ({
          date: item.date,
          label: item.label,
          value: item.minutes,
        })),
        weeklyLessons: data.weeklyActivity.map((item) => ({
          date: item.date,
          label: item.label,
          value: item.lessons,
        })),
        skills: data.skillProgress.map((skill) => ({
          key: skill.key,
          label: skill.label,
          value: skill.percent,
          level: skill.level ?? null,
        })),
      },
      aiReport: {
        title: this.buildAiReportTitle(strongestSkill, weakestSkill),
        strongestSkill: strongestSkill
          ? {
              key: strongestSkill.key,
              label: strongestSkill.label,
              percent: strongestSkill.percent,
            }
          : null,
        focusSkill: weakestSkill
          ? {
              key: weakestSkill.key,
              label: weakestSkill.label,
              percent: weakestSkill.percent,
              href: weakestSkill.href,
            }
          : null,
        insights: [
          totalStudyMinutes > 0
            ? `Bạn đã học ${totalStudyMinutes} phút trong 7 ngày gần nhất.`
            : 'Bạn chưa có thời gian học trong 7 ngày gần nhất.',
          completedMissionCount > 0
            ? `Bạn đã hoàn thành ${completedMissionCount} nhiệm vụ.`
            : 'Hãy hoàn thành nhiệm vụ đầu tiên để mở khóa thêm phần thưởng.',
          learningPathPercent > 0
            ? `Lộ trình học hiện đạt ${learningPathPercent}%.`
            : 'Làm placement để hệ thống cá nhân hóa lộ trình học.',
        ],
        nextAction: weakestSkill
          ? {
              title: `Cải thiện ${weakestSkill.label}`,
              href: weakestSkill.href,
              reason: `${weakestSkill.label} đang ở mức ${weakestSkill.percent}%, nên ưu tiên luyện kỹ năng này tiếp theo.`,
            }
          : {
              title: 'Bắt đầu bài học đầu tiên',
              href: '/learn',
              reason:
                'Chưa đủ dữ liệu để phân tích, hãy hoàn thành một bài học để AI đưa ra gợi ý chính xác hơn.',
            },
      },
    };
  }

  private buildAiReportTitle(
    strongestSkill: { label: string; percent: number } | null,
    weakestSkill: { label: string; percent: number } | null,
  ) {
    if (!strongestSkill && !weakestSkill) {
      return 'Chưa đủ dữ liệu để phân tích';
    }
    if (strongestSkill && strongestSkill.percent >= 80) {
      return `${strongestSkill.label} đang là điểm mạnh của bạn`;
    }
    if (weakestSkill && weakestSkill.percent <= 30) {
      return `Nên ưu tiên luyện ${weakestSkill.label}`;
    }
    return 'Bạn đang tiến bộ ổn định';
  }

  private vocabularyPercent(
    items: Array<{
      status: string;
      learnedAt: Date | null;
      masteredAt: Date | null;
    }>,
  ) {
    if (!items.length) return 0;
    const learned = items.filter(
      (item) => item.learnedAt || item.masteredAt || item.status !== 'NEW',
    ).length;
    return Math.round((learned / items.length) * 100);
  }

  private average(values: number[]) {
    const usable = values.filter(
      (value) => Number.isFinite(value) && value > 0,
    );
    if (!usable.length) return 0;
    return Math.round(
      usable.reduce((sum, value) => sum + value, 0) / usable.length,
    );
  }

  private dateKey(date: Date, timezone = 'Asia/Ho_Chi_Minh') {
    return dateKeyInTimezone(date, timezone);
  }
}
