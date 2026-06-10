import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UserRole } from '@prisma/client';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(private prismaService: PrismaService) {}

  async createQuiz(lessonId: string, user: any, dto: CreateQuizDto) {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    if (
      user.role !== UserRole.ADMIN &&
      lesson.section.course.teacherId !== user.id
    ) {
      throw new ForbiddenException('Bạn không có quyền tạo quiz cho bài này');
    }

    return this.prismaService.quiz.create({
      data: {
        lessonId,
        question: dto.question,
        options: dto.options,
        answer: dto.answer,
      },
    });
  }

  async getLessonQuizzes(lessonId: string, userId: string) {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    const enrollment = await this.prismaService.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.section.courseId } },
    });

    if (!enrollment && !lesson.isPreview) {
      throw new ForbiddenException('Bạn cần sở hữu khóa học để làm quiz');
    }

    return this.prismaService.quiz.findMany({
      where: { lessonId },
      select: {
        id: true,
        question: true,
        options: true,
      },
    });
  }

  async submitQuiz(userId: string, dto: SubmitQuizDto) {
    const quizIds = dto.answers.map((x) => x.quizId);

    const quizzes = await this.prismaService.quiz.findMany({
      where: {
        id: {
          in: quizIds,
        },
      },
      include: {
        lesson: {
          include: {
            section: true,
          },
        },
      },
    });

    let correct = 0;

    for (const quiz of quizzes) {
      const userAnswer = dto.answers.find((x) => x.quizId === quiz.id);

      if (userAnswer?.answer === quiz.answer) {
        correct++;
      }
    }

    const total = quizzes.length;
    const score = total === 0 ? 0 : Math.round((correct / total) * 100);

    const firstQuiz = quizzes[0];

    if (!firstQuiz) {
      return {
        total: 0,
        correct: 0,
        score: 0,
      };
    }

    await this.prismaService.quizResult.create({
      data: {
        userId,
        lessonId: firstQuiz.lessonId,
        score,
        total,
        correct,
        answers: dto.answers,
      },
    });

    return {
      total,
      correct,
      score,
    };
  }
}
