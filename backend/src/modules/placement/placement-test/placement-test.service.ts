import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CefrLevel, LearningSkill, PlacementQuestionType, PlacementTestStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnswerPlacementQuestionDto } from '../dto/answer-placement-question.dto';
import { FlagPlacementQuestionDto } from '../dto/flag-placement-question.dto';
import { SkipPlacementQuestionDto } from '../dto/skip-placement-question.dto';

const SECTION_PLAN: Array<{
  skill: LearningSkill;
  count: number;
}> = [
  { skill: LearningSkill.VOCABULARY, count: 10 },
  { skill: LearningSkill.GRAMMAR, count: 10 },
  { skill: LearningSkill.LISTENING, count: 8 },
  { skill: LearningSkill.READING, count: 5 },
  { skill: LearningSkill.SPEAKING, count: 1 },
  { skill: LearningSkill.WRITING, count: 1 },
];

const SKILL_ORDER: LearningSkill[] = SECTION_PLAN.map((item) => item.skill);

@Injectable()
export class PlacementTestService {
  constructor(private readonly prisma: PrismaService) {}

  async getSession(userId: string, sessionId: string) {
    await this.assertSessionOwner(userId, sessionId);
    await this.ensureSessionQuestions(sessionId);

    const session = await this.prisma.placementTest.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        mode: true,
        startedAt: true,
        updatedAt: true,
        score: true,
        total: true,
        correct: true,
        user: {
          select: {
            id: true,
            fullname: true,
            avatar: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            userAnswer: true,
            isCorrect: true,
            isFlagged: true,
            isSkipped: true,
            spentSeconds: true,
            answeredAt: true,
            question: {
              select: {
                id: true,
                skill: true,
                level: true,
                type: true,
                question: true,
                options: true,
                explanation: true,
                audioUrl: true,
                passage: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên kiểm tra.');
    }

    const currentIndex = this.resolveCurrentIndex(session.questions);
    const current = session.questions[currentIndex] ?? session.questions[0];

    if (!current) {
      throw new BadRequestException(
        'Ngân hàng câu hỏi chưa đủ dữ liệu để tạo bài kiểm tra.',
      );
    }

    const sections = SKILL_ORDER.map((skill) => {
      const questions = session.questions.filter(
        (item) => item.question.skill === skill,
      );
      const answered = questions.filter(
        (item) => item.userAnswer !== null || item.isSkipped,
      ).length;

      return {
        skill,
        total: questions.length,
        answered,
        status:
          answered === questions.length && questions.length > 0
            ? 'COMPLETED'
            : current.question.skill === skill
              ? 'IN_PROGRESS'
              : 'NOT_STARTED',
      };
    });

    const answeredTotal = session.questions.filter(
      (item) => item.userAnswer !== null || item.isSkipped,
    ).length;

    return {
      session: {
        id: session.id,
        status: session.status,
        mode: session.mode,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
        durationSeconds: 10 * 60,
        answeredTotal,
        totalQuestions: session.questions.length,
        progressPercent: Math.round(
          (answeredTotal / Math.max(session.questions.length, 1)) * 100,
        ),
      },
      user: {
        id: session.user.id,
        name: session.user.fullname,
        avatar: session.user.avatar,
      },
      currentQuestion: this.mapQuestion(
        current,
        currentIndex,
        session.questions,
      ),
      sections,
      questionNavigator: session.questions.map((item, index) => ({
        id: item.question.id,
        order: index + 1,
        skill: item.question.skill,
        answered: item.userAnswer !== null,
        skipped: item.isSkipped,
        flagged: item.isFlagged,
        active: index === currentIndex,
      })),
      autosave: {
        savedAt: session.updatedAt,
      },
    };
  }

  async answerQuestion(
    userId: string,
    sessionId: string,
    dto: AnswerPlacementQuestionDto,
  ) {
    await this.assertSessionOwner(userId, sessionId);

    const testQuestion = await this.prisma.placementTestQuestion.findFirst({
      where: {
        testId: sessionId,
        questionId: dto.questionId,
      },
      include: {
        question: {
          select: {
            correctAnswer: true,
            type: true,
          },
        },
      },
    });

    if (!testQuestion) {
      throw new NotFoundException('Không tìm thấy câu hỏi trong phiên test.');
    }

    if (
      testQuestion.question.type !== PlacementQuestionType.MULTIPLE_CHOICE &&
      testQuestion.question.type !== PlacementQuestionType.FILL_BLANK
    ) {
      throw new BadRequestException(
        'Loại câu hỏi này cần dùng API chuyên biệt.',
      );
    }

    const correctAnswer = testQuestion.question.correctAnswer;
    const isCorrect =
      correctAnswer !== null &&
      this.normalizeAnswer(dto.answer) === this.normalizeAnswer(correctAnswer);

    await this.prisma.$transaction([
      this.prisma.placementTestQuestion.update({
        where: { id: testQuestion.id },
        data: {
          userAnswer: dto.answer,
          isCorrect,
          isSkipped: false,
          spentSeconds: dto.spentSeconds ?? testQuestion.spentSeconds,
          answeredAt: new Date(),
        },
      }),
      this.prisma.placementTest.update({
        where: { id: sessionId },
        data: {
          total: { increment: testQuestion.userAnswer === null ? 1 : 0 },
          correct: {
            increment: testQuestion.userAnswer === null && isCorrect ? 1 : 0,
          },
          score: {
            increment: testQuestion.userAnswer === null && isCorrect ? 1 : 0,
          },
        },
      }),
    ]);

    return this.getSession(userId, sessionId);
  }

  async flagQuestion(
    userId: string,
    sessionId: string,
    dto: FlagPlacementQuestionDto,
  ) {
    await this.assertSessionOwner(userId, sessionId);

    const result = await this.prisma.placementTestQuestion.updateMany({
      where: {
        testId: sessionId,
        questionId: dto.questionId,
      },
      data: {
        isFlagged: dto.isFlagged,
      },
    });

    if (!result.count) {
      throw new NotFoundException('Không tìm thấy câu hỏi trong phiên test.');
    }

    return {
      questionId: dto.questionId,
      isFlagged: dto.isFlagged,
      savedAt: new Date(),
    };
  }

  async skipQuestion(
    userId: string,
    sessionId: string,
    dto: SkipPlacementQuestionDto,
  ) {
    await this.assertSessionOwner(userId, sessionId);

    const result = await this.prisma.placementTestQuestion.updateMany({
      where: {
        testId: sessionId,
        questionId: dto.questionId,
      },
      data: {
        userAnswer: null,
        isCorrect: null,
        isSkipped: true,
        spentSeconds: dto.spentSeconds ?? 0,
        answeredAt: new Date(),
      },
    });

    if (!result.count) {
      throw new NotFoundException('Không tìm thấy câu hỏi trong phiên test.');
    }

    return this.getSession(userId, sessionId);
  }

  private async assertSessionOwner(userId: string, sessionId: string) {
    const session = await this.prisma.placementTest.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên kiểm tra.');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập phiên kiểm tra này.',
      );
    }

    if (session.status !== PlacementTestStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Phiên kiểm tra không còn ở trạng thái đang làm.',
      );
    }
  }

  private async ensureSessionQuestions(sessionId: string) {
    const existingCount = await this.prisma.placementTestQuestion.count({
      where: { testId: sessionId },
    });

    if (existingCount > 0) {
      return;
    }

    const selected: Array<{ id: string; skill: LearningSkill }> = [];

    for (const plan of SECTION_PLAN) {
      const questions = await this.prisma.placementQuestion.findMany({
        where: {
          skill: plan.skill,
          isActive: true,
        },
        select: {
          id: true,
          skill: true,
        },
        orderBy: [{ level: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
        take: plan.count,
      });

      if (questions.length < plan.count) {
        throw new BadRequestException(
          `Không đủ câu hỏi ${plan.skill}. Cần ${plan.count}, hiện có ${questions.length}.`,
        );
      }

      selected.push(...questions);
    }

    await this.prisma.placementTestQuestion.createMany({
      data: selected.map((item, index) => ({
        testId: sessionId,
        questionId: item.id,
        order: index + 1,
      })),
      skipDuplicates: true,
    });
  }

  private resolveCurrentIndex(
    questions: Array<{
      userAnswer: string | null;
      isSkipped: boolean;
    }>,
  ) {
    const index = questions.findIndex(
      (item) => item.userAnswer === null && !item.isSkipped,
    );

    return index >= 0 ? index : Math.max(questions.length - 1, 0);
  }

  private mapQuestion(
    item: {
      id: string;
      order: number;
      userAnswer: string | null;
      isCorrect: boolean | null;
      isFlagged: boolean;
      isSkipped: boolean;
      spentSeconds: number;
      answeredAt: Date | null;
      question: {
        id: string;
        skill: LearningSkill;
        level: CefrLevel;
        type: PlacementQuestionType;
        question: string;
        options: Prisma.JsonValue | null;
        explanation: string | null;
        audioUrl: string | null;
        passage: string | null;
      };
    },
    index: number,
    all: Array<{
      question: { skill: LearningSkill };
    }>,
  ) {
    const skillQuestions = all.filter(
      (question) => question.question.skill === item.question.skill,
    );
    const sectionIndex =
      skillQuestions.findIndex(
        (question) =>
          'id' in question && (question as { id?: string }).id === item.id,
      ) + 1;

    return {
      id: item.question.id,
      testQuestionId: item.id,
      globalOrder: index + 1,
      sectionOrder: sectionIndex > 0 ? sectionIndex : 1,
      sectionTotal: skillQuestions.length,
      skill: item.question.skill,
      level: item.question.level,
      type: item.question.type,
      prompt: item.question.question,
      options: this.parseOptions(item.question.options),
      audioUrl: item.question.audioUrl,
      passage: item.question.passage,
      selectedAnswer: item.userAnswer,
      isFlagged: item.isFlagged,
      isSkipped: item.isSkipped,
      adaptiveMessage:
        index >= 3
          ? 'Tuyệt! AI đang điều chỉnh độ khó theo kết quả của bạn.'
          : 'AI đang đánh giá năng lực hiện tại của bạn.',
    };
  }

  private parseOptions(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item, index) => {
      if (typeof item === 'string') {
        return {
          key: String.fromCharCode(65 + index),
          text: item,
          translation: null,
        };
      }

      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const object = item as Prisma.JsonObject;

        return {
          key:
            typeof object.key === 'string'
              ? object.key
              : String.fromCharCode(65 + index),
          text:
            typeof object.text === 'string'
              ? object.text
              : String(object.value ?? ''),
          translation:
            typeof object.translation === 'string' ? object.translation : null,
        };
      }

      return {
        key: String.fromCharCode(65 + index),
        text: String(item),
        translation: null,
      };
    });
  }

  private normalizeAnswer(value: string) {
    return value.trim().toLocaleLowerCase();
  }
}
