import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PetsService } from '../pets/pets.service';

@Injectable()
export class ProgressService {
  constructor(
    private prismaService: PrismaService,
    private petsService: PetsService,
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
}
