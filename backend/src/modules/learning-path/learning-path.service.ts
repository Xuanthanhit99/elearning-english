import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseStatus,
  MissionV2Action,
  MissionV2Status,
  PlacementResultStatus,
  Prisma,
  XpSourceType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { XpService } from '../leaderboard/xp.service';

const LESSON_REWARD = {
  userXp: 20,
  petXp: 30,
  coins: 12,
  food: 1,
};

type PathLessonStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

type PathLesson = {
  id: string;
  title: string;
  duration: number | null;
  order: number;
  sectionId: string;
  sectionTitle: string;
  courseId: string;
  courseSlug: string;
  status: PathLessonStatus;
  progressId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  href: string;
};

@Injectable()
export class LearningPathService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
  ) {}

  async getLearningPath(userId: string) {
    const result = await this.getReadyPlacementResult(userId);
    const courseDetails = await this.getRecommendedCourseDetails(
      userId,
      result.courses,
    );
    const lessons = courseDetails.flatMap((course) => course.lessons);
    const completedLessons = lessons.filter(
      (lesson) => lesson.status === 'COMPLETED',
    ).length;
    const totalLessons = lessons.length;
    const progressPercent =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : this.average(result.phases.map((phase) => phase.progress));
    const currentLesson =
      lessons.find((lesson) => lesson.status === 'IN_PROGRESS') ??
      lessons.find((lesson) => lesson.status === 'AVAILABLE') ??
      null;
    const nextLesson = currentLesson
      ? (lessons.find(
          (lesson) =>
            lesson.status !== 'COMPLETED' && lesson.id !== currentLesson.id,
        ) ?? null)
      : null;

    return {
      id: result.id,
      testId: result.testId,
      title: `Learning Path ${result.overallLevel}`,
      overallLevel: result.overallLevel,
      overallScore: result.overallScore,
      generatedAt: result.generatedAt,
      progressPercent,
      completedLessons,
      totalLessons,
      currentLesson,
      nextLesson,
      phases: result.phases.map((item) => ({
        id: item.id,
        phase: item.phase,
        title: item.title,
        targetLevel: item.targetLevel,
        weeksMin: item.weeksMin,
        weeksMax: item.weeksMax,
        description: item.description,
        objectives: this.jsonArray(item.objectives),
        progress: item.progress,
      })),
      priorities: result.priorities,
      recommendedCourses: result.courses,
      courses: courseDetails,
      skills: result.skills.map((item) => ({
        skill: item.skill,
        score: item.score,
        level: item.level,
        status: item.status,
      })),
    };
  }

  async startLesson(userId: string, lessonId: string) {
    const lesson = await this.resolvePathLesson(userId, lessonId);

    if (lesson.status === 'LOCKED') {
      throw new ForbiddenException(
        'Bai hoc nay chua duoc mo khoa trong lo trinh cua ban.',
      );
    }

    await this.prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      create: {
        userId,
        lessonId,
        courseId: lesson.courseId,
        completed: false,
      },
      update: {},
    });

    return this.getLessonActionResult(userId, lessonId);
  }

  async resumeLesson(userId: string, lessonId: string) {
    const lesson = await this.resolvePathLesson(userId, lessonId);

    if (lesson.status === 'LOCKED') {
      throw new ForbiddenException(
        'Bai hoc nay chua duoc mo khoa trong lo trinh cua ban.',
      );
    }

    return this.getLessonActionResult(userId, lessonId);
  }

  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.resolvePathLesson(userId, lessonId);

    if (lesson.status === 'LOCKED') {
      throw new ForbiddenException(
        'Bai hoc nay chua duoc mo khoa trong lo trinh cua ban.',
      );
    }

    if (lesson.status === 'COMPLETED') {
      const current = await this.getLessonActionResult(userId, lessonId);
      return {
        ...current,
        alreadyCompleted: true,
        rewards: this.emptyRewardSummary(false, true),
      };
    }

    const idempotencyKey = `learning:LESSON_COMPLETED:${lesson.id}`;
    const completedAt = new Date();

    const rewardResult = await this.xpService.awardXpWithSideEffects(
      {
        userId,
        sourceType: XpSourceType.LESSON,
        sourceId: lesson.id,
        baseXp: LESSON_REWARD.userXp,
        bonusXp: 0,
        idempotencyKey,
        reason: 'Hoan thanh bai hoc trong Learning Path',
        metadata: {
          pathLessonId: lesson.id,
          courseId: lesson.courseId,
          courseSlug: lesson.courseSlug,
          sectionId: lesson.sectionId,
          sectionTitle: lesson.sectionTitle,
          completedAt: completedAt.toISOString(),
        },
      },
      async (tx) => {
        await tx.lessonProgress.upsert({
          where: {
            userId_lessonId: {
              userId,
              lessonId,
            },
          },
          create: {
            userId,
            lessonId,
            courseId: lesson.courseId,
            completed: true,
            completedAt,
          },
          update: {
            completed: true,
            completedAt,
          },
        });

        const missionUpdates = await this.applyLessonMissionProgress(
          tx,
          userId,
          lesson,
          completedAt,
        );
        const pet = await this.applyPetLessonReward(
          tx,
          userId,
          lesson.id,
          completedAt,
        );

        return {
          missionUpdates,
          pet,
        };
      },
    );

    const current = await this.getLessonActionResult(userId, lessonId);
    const sideEffect = rewardResult.sideEffectResult;
    const leaderboardSynced =
      'entry' in rewardResult && Boolean(rewardResult.entry);

    return {
      ...current,
      alreadyCompleted: rewardResult.duplicated,
      rewards: rewardResult.duplicated
        ? this.emptyRewardSummary(false, true)
        : {
            applied: true,
            xp: rewardResult.transaction.finalXp,
            coins: sideEffect?.pet.coins ?? 0,
            streak: sideEffect?.pet.streak ?? {
              current: null,
              best: null,
              changed: false,
            },
            missionUpdates: sideEffect?.missionUpdates ?? [],
            pet: {
              changed: Boolean(sideEffect?.pet.changed),
            },
            leaderboard: {
              queued: leaderboardSynced,
              synced: leaderboardSynced,
            },
          },
    };
  }

  private async applyLessonMissionProgress(
    tx: Prisma.TransactionClient,
    userId: string,
    lesson: PathLesson,
    completedAt: Date,
  ) {
    const missions = await tx.userMissionV2.findMany({
      where: {
        userId,
        action: MissionV2Action.COMPLETE_LESSON,
        status: MissionV2Status.ACTIVE,
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: completedAt,
            },
          },
        ],
      },
    });

    const updates: Array<{
      missionId: string;
      progress: number;
      target: number;
      status: MissionV2Status;
    }> = [];

    for (const mission of missions) {
      if (mission.lessonId && mission.lessonId !== lesson.id) {
        continue;
      }

      if (mission.courseId && mission.courseId !== lesson.courseId) {
        continue;
      }

      const progress = Math.min(mission.progress + 1, mission.target);
      const completed = progress >= mission.target;

      const updated = await tx.userMissionV2.update({
        where: { id: mission.id },
        data: {
          progress,
          status: completed
            ? MissionV2Status.COMPLETED
            : MissionV2Status.ACTIVE,
          completedAt: completed ? completedAt : null,
        },
      });

      updates.push({
        missionId: updated.id,
        progress: updated.progress,
        target: updated.target,
        status: updated.status,
      });
    }

    return updates;
  }

  private async applyPetLessonReward(
    tx: Prisma.TransactionClient,
    userId: string,
    lessonId: string,
    completedAt: Date,
  ) {
    const existingReward = await tx.petReward.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });
    const pet = await this.getOrCreatePetInTransaction(tx, userId, completedAt);

    if (existingReward) {
      return {
        changed: false,
        coins: 0,
        streak: {
          current: pet.streak,
          best: pet.bestStreak,
          changed: false,
        },
      };
    }

    const nextStreak = this.nextStreak(
      pet.lastStudyDate,
      pet.streak,
      completedAt,
    );
    const streakChanged = nextStreak !== pet.streak;

    await tx.petReward.create({
      data: {
        userId,
        lessonId,
        xp: LESSON_REWARD.petXp,
        coins: LESSON_REWARD.coins,
        food: LESSON_REWARD.food,
      },
    });

    const updatedPet = await tx.petProfile.update({
      where: { userId },
      data: {
        xp: { increment: LESSON_REWARD.petXp },
        coins: { increment: LESSON_REWARD.coins },
        food: { increment: LESSON_REWARD.food },
        hp: this.clamp(pet.hp + 4),
        energy: this.clamp(pet.energy - 8),
        happiness: this.clamp(pet.happiness + 6),
        hunger: this.clamp(pet.hunger - 5),
        streak: nextStreak,
        bestStreak: Math.max(pet.bestStreak, nextStreak),
        completedLessons: { increment: 1 },
        lastStudyDate: completedAt,
      },
    });

    await tx.userXpProfile.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: nextStreak,
        longestStreak: nextStreak,
      },
      update: {
        currentStreak: nextStreak,
        longestStreak: Math.max(pet.bestStreak, nextStreak),
      },
    });

    return {
      changed: true,
      coins: LESSON_REWARD.coins,
      streak: {
        current: updatedPet.streak,
        best: updatedPet.bestStreak,
        changed: streakChanged,
      },
    };
  }

  private async getOrCreatePetInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    now: Date,
  ) {
    const existing = await tx.petProfile.findUnique({ where: { userId } });

    if (existing) {
      return existing;
    }

    const chooseDeadline = new Date(now);
    chooseDeadline.setDate(chooseDeadline.getDate() + 7);

    return tx.petProfile.create({
      data: {
        userId,
        petType: 'pending',
        petName: 'Chua chon',
        chooseDeadline,
      },
    });
  }

  private emptyRewardSummary(applied: boolean, alreadyProcessed: boolean) {
    return {
      applied,
      alreadyProcessed,
      xp: 0,
      coins: 0,
      streak: {
        current: null,
        best: null,
        changed: false,
      },
      missionUpdates: [],
      pet: {
        changed: false,
      },
      leaderboard: {
        queued: false,
        synced: false,
      },
    };
  }

  private clamp(value: number) {
    return Math.min(100, Math.max(0, value));
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private isSameDay(left: Date | null, right: Date) {
    if (!left) return false;

    return this.startOfDay(left).getTime() === this.startOfDay(right).getTime();
  }

  private isYesterday(left: Date | null, right: Date) {
    if (!left) return false;

    const yesterday = this.startOfDay(right);
    yesterday.setDate(yesterday.getDate() - 1);

    return this.startOfDay(left).getTime() === yesterday.getTime();
  }

  private nextStreak(
    lastStudyDate: Date | null,
    currentStreak: number,
    now: Date,
  ) {
    if (this.isSameDay(lastStudyDate, now)) {
      return currentStreak;
    }

    if (this.isYesterday(lastStudyDate, now)) {
      return currentStreak + 1;
    }

    return 1;
  }

  private async getReadyPlacementResult(userId: string) {
    const result = await this.prisma.placementResult.findFirst({
      where: {
        userId,
        status: PlacementResultStatus.READY,
        phases: {
          some: {},
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
      include: {
        phases: {
          orderBy: {
            phase: 'asc',
          },
        },
        priorities: {
          orderBy: {
            priority: 'asc',
          },
        },
        courses: {
          orderBy: {
            order: 'asc',
          },
        },
        skills: true,
        test: {
          select: {
            id: true,
            completedAt: true,
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Chua tim thay lo trinh hoc.');
    }

    return result;
  }

  private async getRecommendedCourseDetails(
    userId: string,
    recommendations: Array<{
      id: string;
      courseId: string | null;
      title: string;
      slug: string | null;
      thumbnail: string | null;
      rating: number | null;
      reviews: number | null;
      lessonCount: number | null;
      reason: string;
      order: number;
    }>,
  ) {
    const ids = recommendations
      .map((item) => item.courseId)
      .filter((item): item is string => Boolean(item));
    const slugs = recommendations
      .map((item) => item.slug)
      .filter((item): item is string => Boolean(item));
    const or = [
      ...ids.map((id) => ({ id })),
      ...slugs.map((slug) => ({ slug })),
    ];

    const courses = or.length
      ? await this.prisma.course.findMany({
          where: {
            status: CourseStatus.APPROVED,
            OR: or,
          },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                lessons: {
                  orderBy: { order: 'asc' },
                  include: {
                    lessonProgress: {
                      where: { userId },
                      select: {
                        id: true,
                        completed: true,
                        completedAt: true,
                        createdAt: true,
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        })
      : [];

    const courseById = new Map(courses.map((course) => [course.id, course]));
    const courseBySlug = new Map(
      courses.map((course) => [course.slug, course]),
    );
    let unlocked = true;

    return recommendations.map((recommendation) => {
      const course =
        (recommendation.courseId
          ? courseById.get(recommendation.courseId)
          : undefined) ??
        (recommendation.slug
          ? courseBySlug.get(recommendation.slug)
          : undefined);

      if (!course) {
        return {
          id: recommendation.id,
          courseId: recommendation.courseId,
          title: recommendation.title,
          slug: recommendation.slug,
          thumbnail: recommendation.thumbnail,
          rating: recommendation.rating,
          reviews: recommendation.reviews,
          lessonCount: recommendation.lessonCount ?? 0,
          reason: recommendation.reason,
          progressPercent: 0,
          completedLessons: 0,
          totalLessons: 0,
          available: false,
          lessons: [] as PathLesson[],
        };
      }

      const lessons: PathLesson[] = [];

      for (const section of course.sections) {
        for (const rawLesson of section.lessons) {
          const progress = rawLesson.lessonProgress[0] ?? null;
          const completed = Boolean(progress?.completed);
          const status: PathLessonStatus = completed
            ? 'COMPLETED'
            : progress
              ? 'IN_PROGRESS'
              : unlocked
                ? 'AVAILABLE'
                : 'LOCKED';

          lessons.push({
            id: rawLesson.id,
            title: rawLesson.title,
            duration: rawLesson.duration,
            order: rawLesson.order,
            sectionId: section.id,
            sectionTitle: section.title,
            courseId: course.id,
            courseSlug: course.slug,
            status,
            progressId: progress?.id ?? null,
            startedAt: progress?.createdAt ?? null,
            completedAt: progress?.completedAt ?? null,
            href: `/learning-path/lessons/${rawLesson.id}`,
          });

          if (!completed) {
            unlocked = false;
          }
        }
      }

      const completedLessons = lessons.filter(
        (lesson) => lesson.status === 'COMPLETED',
      ).length;
      const totalLessons = lessons.length;

      return {
        id: recommendation.id,
        courseId: course.id,
        title: course.title,
        slug: course.slug,
        thumbnail: course.thumbnail,
        rating: recommendation.rating,
        reviews: recommendation.reviews,
        lessonCount: totalLessons,
        reason: recommendation.reason,
        progressPercent:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
        completedLessons,
        totalLessons,
        available: true,
        lessons,
      };
    });
  }

  private async resolvePathLesson(userId: string, lessonId: string) {
    const path = await this.getLearningPath(userId);
    const lesson = path.courses
      .flatMap((course) => course.lessons)
      .find((item) => item.id === lessonId);

    if (!lesson) {
      throw new NotFoundException(
        'Bai hoc khong thuoc lo trinh hien tai cua ban.',
      );
    }

    return lesson;
  }

  private async getLessonActionResult(userId: string, lessonId: string) {
    const path = await this.getLearningPath(userId);
    const lesson = path.courses
      .flatMap((course) => course.lessons)
      .find((item) => item.id === lessonId);

    if (!lesson) {
      throw new BadRequestException('Khong the cap nhat trang thai bai hoc.');
    }

    return {
      lesson,
      learningPath: {
        id: path.id,
        progressPercent: path.progressPercent,
        completedLessons: path.completedLessons,
        totalLessons: path.totalLessons,
        currentLesson: path.currentLesson,
        nextLesson: path.nextLesson,
      },
    };
  }

  private jsonArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private average(values: number[]) {
    const validValues = values.filter((value) => Number.isFinite(value));

    if (!validValues.length) {
      return 0;
    }

    return Math.round(
      validValues.reduce((sum, value) => sum + value, 0) / validValues.length,
    );
  }
}
