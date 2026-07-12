import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  PlacementQuestion,
  PlacementQuestionType,
  PlacementTestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnswerPlacementQuestionDto } from '../dto/answer-placement-question.dto';
import { FlagPlacementQuestionDto } from '../dto/flag-placement-question.dto';
import { SkipPlacementQuestionDto } from '../dto/skip-placement-question.dto';
import { PlacementQuestionPoolService } from '../placement-question-pool/placement-question-pool.service';
import { QuestionBankService } from 'src/modules/question-bank/question-bank.service';

const SECTION_PLAN: Array<{
  skill: LearningSkill;
  level: CefrLevel;
  type: PlacementQuestionType;
  count: number;
}> = [
  {
    skill: LearningSkill.VOCABULARY,
    level: CefrLevel.A2,
    type: PlacementQuestionType.MULTIPLE_CHOICE,
    count: 10,
  },
  {
    skill: LearningSkill.GRAMMAR,
    level: CefrLevel.A2,
    type: PlacementQuestionType.MULTIPLE_CHOICE,
    count: 10,
  },
  {
    skill: LearningSkill.LISTENING,
    level: CefrLevel.A2,
    type: PlacementQuestionType.LISTENING,
    count: 8,
  },
  {
    skill: LearningSkill.READING,
    level: CefrLevel.A2,
    type: PlacementQuestionType.READING,
    count: 5,
  },
  {
    skill: LearningSkill.SPEAKING,
    level: CefrLevel.A2,
    type: PlacementQuestionType.SPEAKING,
    count: 1,
  },
  {
    skill: LearningSkill.WRITING,
    level: CefrLevel.A2,
    type: PlacementQuestionType.WRITING,
    count: 1,
  },
];

type QuestionPlanItem = {
  skill: LearningSkill;
  level: CefrLevel;
  type: PlacementQuestionType;
  count: number;
};

const SKILL_ORDER: LearningSkill[] = SECTION_PLAN.map((item) => item.skill);

@Injectable()
export class PlacementTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly placementQuestionPoolService: PlacementQuestionPoolService,
    private readonly questionBankService: QuestionBankService,
  ) {}

  async getSession(userId: string, sessionId: string) {
    const sessionAccess = await this.assertSessionAccess(userId, sessionId);

    if (sessionAccess.status === PlacementTestStatus.IN_PROGRESS) {
      await this.ensureSessionQuestions(sessionId);
    }

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
                // audioScript: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên kiểm tra.');
    }

    const currentIndex = session.questions.findIndex(
      (item) =>
        item.userAnswer === null && !item.isSkipped && item.answeredAt === null,
    );

    const completed = currentIndex === -1;

    if (completed) {
      if (session.status !== PlacementTestStatus.COMPLETED) {
        await this.prisma.placementTest.update({
          where: {
            id: session.id,
          },
          data: {
            status: PlacementTestStatus.COMPLETED,

            // Chỉ thêm nếu model PlacementTest có field này.
            completedAt: new Date(),
          },
        });
      }
      return {
        session: {
          id: session.id,
          status: PlacementTestStatus.COMPLETED,
          mode: session.mode,
          startedAt: session.startedAt,
          updatedAt: session.updatedAt,
          durationSeconds: 10 * 60,
          answeredTotal: session.questions.length,
          totalQuestions: session.questions.length,
          progressPercent: 100,
          isCompleted: true,
        },

        user: {
          id: session.user.id,
          name: session.user.fullname,
          avatar: session.user.avatar,
        },

        currentQuestion: null,

        sections: SKILL_ORDER.map((skill) => {
          const questions = session.questions.filter(
            (item) => item.question.skill === skill,
          );

          return {
            skill,
            total: questions.length,
            answered: questions.length,
            status: 'COMPLETED',
          };
        }),

        questionNavigator: session.questions.map((item, index) => ({
          id: item.question.id,
          order: index + 1,
          skill: item.question.skill,
          answered:
            item.userAnswer !== null ||
            item.isSkipped ||
            item.answeredAt !== null,
          skipped: item.isSkipped,
          flagged: item.isFlagged,
          active: false,
        })),

        autosave: {
          savedAt: session.updatedAt,
        },

        nextUrl: `/placement/test/${session.id}/processing`,
      };
    }

    const current = session.questions[currentIndex];

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
        isCompleted: false,
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
        answered: item.userAnswer !== null || item.isSkipped,
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
    await this.assertSessionInProgress(userId, sessionId);

    const testQuestion = await this.prisma.placementTestQuestion.findFirst({
      where: {
        testId: sessionId,
        questionId: dto.questionId,
      },
      select: {
        id: true,
        userAnswer: true,
        isCorrect: true,
        isSkipped: true,
        spentSeconds: true,

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

    /*
     * Các loại có thể chấm bằng đáp án đúng/sai.
     *
     * LISTENING và READING vẫn dùng API answer vì chúng
     * có options và correctAnswer.
     */
    const objectiveQuestionTypes: PlacementQuestionType[] = [
      PlacementQuestionType.MULTIPLE_CHOICE,
      PlacementQuestionType.FILL_BLANK,
      PlacementQuestionType.LISTENING,
      PlacementQuestionType.READING,
    ];

    if (!objectiveQuestionTypes.includes(testQuestion.question.type)) {
      throw new BadRequestException(
        testQuestion.question.type === PlacementQuestionType.SPEAKING
          ? 'Câu Speaking cần gửi file ghi âm qua API Speaking.'
          : testQuestion.question.type === PlacementQuestionType.WRITING
            ? 'Câu Writing cần gửi nội dung qua API Writing.'
            : 'Loại câu hỏi này chưa được hỗ trợ.',
      );
    }

    const correctAnswer = testQuestion.question.correctAnswer;

    if (!correctAnswer) {
      throw new BadRequestException('Câu hỏi chưa được cấu hình đáp án đúng.');
    }

    const normalizedUserAnswer = this.normalizeAnswer(dto.answer);

    const normalizedCorrectAnswer = this.normalizeAnswer(correctAnswer);

    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

    /*
     * Xác định đây có phải lần trả lời đầu tiên không.
     *
     * Nếu user sửa đáp án:
     * - Không tăng total lần nữa.
     * - Phải điều chỉnh correct và score theo đáp án cũ/mới.
     */
    const wasAnswered =
      testQuestion.userAnswer !== null && testQuestion.userAnswer !== undefined;

    const previousCorrect = testQuestion.isCorrect === true;

    const totalDelta = wasAnswered ? 0 : 1;

    let correctDelta = 0;

    if (!wasAnswered && isCorrect) {
      correctDelta = 1;
    } else if (wasAnswered && !previousCorrect && isCorrect) {
      correctDelta = 1;
    } else if (wasAnswered && previousCorrect && !isCorrect) {
      correctDelta = -1;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.placementTestQuestion.update({
        where: {
          id: testQuestion.id,
        },
        data: {
          userAnswer: dto.answer.trim(),
          isCorrect,
          isSkipped: false,
          spentSeconds: dto.spentSeconds ?? testQuestion.spentSeconds,
          answeredAt: new Date(),
        },
      });

      /*
       * Chỉ update counter khi có thay đổi thực tế.
       */
      if (totalDelta !== 0 || correctDelta !== 0) {
        await tx.placementTest.update({
          where: {
            id: sessionId,
          },
          data: {
            ...(totalDelta !== 0
              ? {
                  total: {
                    increment: totalDelta,
                  },
                }
              : {}),

            ...(correctDelta !== 0
              ? {
                  correct: {
                    increment: correctDelta,
                  },
                  score: {
                    increment: correctDelta,
                  },
                }
              : {}),
          },
        });
      }
    });

    return this.getSession(userId, sessionId);
  }

  async flagQuestion(
    userId: string,
    sessionId: string,
    dto: FlagPlacementQuestionDto,
  ) {
    await this.assertSessionInProgress(userId, sessionId);

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
    await this.assertSessionInProgress(userId, sessionId);

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
    const existingSessionQuestions =
      await this.prisma.placementTestQuestion.count({
        where: {
          testId: sessionId,
        },
      });

    if (existingSessionQuestions > 0) {
      return;
    }

    const selectedQuestions: Array<{
      id: string;
      skill: LearningSkill;
    }> = [];

    for (const plan of SECTION_PLAN) {
      const questions = await this.questionBankService.ensurePlacementQuestions(
        {
          skill: plan.skill,
          level: plan.level,
          type: plan.type,
          requiredCount: plan.count,
        },
      );

      selectedQuestions.push(
        ...questions.map((question) => ({
          id: question.id,
          skill: question.skill,
        })),
      );
    }

    if (
      selectedQuestions.length !==
      SECTION_PLAN.reduce((total, section) => total + section.count, 0)
    ) {
      throw new BadRequestException(
        'Không thể chuẩn bị đủ câu hỏi cho bài kiểm tra.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      /*
       * Kiểm tra lại trong transaction để tránh tạo trùng
       * câu hỏi cho cùng một session.
       */
      const sessionQuestionCount = await tx.placementTestQuestion.count({
        where: {
          testId: sessionId,
        },
      });

      if (sessionQuestionCount > 0) {
        return;
      }

      await tx.placementTestQuestion.createMany({
        data: selectedQuestions.map((question, index) => ({
          testId: sessionId,
          questionId: question.id,
          order: index + 1,
        })),
        skipDuplicates: true,
      });

      await tx.placementQuestion.updateMany({
        where: {
          id: {
            in: selectedQuestions.map((question) => question.id),
          },
        },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    });
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
      id: string;
      question: {
        skill: LearningSkill;
      };
    }>,
  ) {
    const skillQuestions = all.filter(
      (testQuestion) => testQuestion.question.skill === item.question.skill,
    );

    const sectionOrder =
      skillQuestions.findIndex((testQuestion) => testQuestion.id === item.id) +
      1;

    return {
      id: item.question.id,
      testQuestionId: item.id,

      globalOrder: index + 1,

      sectionOrder: sectionOrder > 0 ? sectionOrder : 1,

      sectionTotal: skillQuestions.length,

      skill: item.question.skill,
      level: item.question.level,
      type: item.question.type,

      prompt: item.question.question,

      options: this.parseOptions(item.question.options),

      audioUrl: item.question.audioUrl,
      passage: item.question.passage,

      selectedAnswer: item.userAnswer,

      isCorrect: item.isCorrect,
      isFlagged: item.isFlagged,
      isSkipped: item.isSkipped,

      spentSeconds: item.spentSeconds,
      answeredAt: item.answeredAt,

      adaptiveMessage:
        index >= 3
          ? 'AI đang điều chỉnh độ khó theo kết quả của bạn.'
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

  private normalizeAnswer(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  private async assertSessionAccess(userId: string, sessionId: string) {
    const session = await this.prisma.placementTest.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
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

    return session;
  }

  private async assertSessionInProgress(userId: string, sessionId: string) {
    const session = await this.assertSessionAccess(userId, sessionId);

    if (session.status !== PlacementTestStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Phiên kiểm tra không còn ở trạng thái đang làm.',
      );
    }

    return session;
  }

  async prepareTestQuestions(testId: string): Promise<void> {
    const test = await this.prisma.placementTest.findUnique({
      where: {
        id: testId,
      },
      select: {
        id: true,
        status: true,
        questions: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Không tìm thấy Placement Test');
    }

    if (test.questions.length > 0) {
      return;
    }

    const questionPlan = this.getQuestionPlan();

    const preparedQuestions: PlacementQuestion[] = [];

    for (const item of questionPlan) {
      const questions = await this.questionBankService.ensurePlacementQuestions(
        {
          skill: item.skill,
          level: item.level,
          type: item.type,
          requiredCount: item.count,
        },
      );

      preparedQuestions.push(...questions);
    }

    if (preparedQuestions.length === 0) {
      throw new BadRequestException(
        'Không thể chuẩn bị câu hỏi cho bài kiểm tra',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const currentQuestionCount = await tx.placementTestQuestion.count({
        where: {
          testId,
        },
      });

      if (currentQuestionCount > 0) {
        return;
      }

      await tx.placementTestQuestion.createMany({
        data: preparedQuestions.map((question, index) => ({
          testId,
          questionId: question.id,
          order: index + 1,
        })),
        skipDuplicates: true,
      });

      await Promise.all(
        preparedQuestions.map((question) =>
          tx.placementQuestion.update({
            where: {
              id: question.id,
            },
            data: {
              usageCount: {
                increment: 1,
              },
            },
          }),
        ),
      );
    });
  }

  private getQuestionPlan(): QuestionPlanItem[] {
    return [
      {
        skill: LearningSkill.GRAMMAR,
        level: CefrLevel.A1,
        type: PlacementQuestionType.MULTIPLE_CHOICE,
        count: 3,
      },
      {
        skill: LearningSkill.VOCABULARY,
        level: CefrLevel.A1,
        type: PlacementQuestionType.MULTIPLE_CHOICE,
        count: 3,
      },
      {
        skill: LearningSkill.READING,
        level: CefrLevel.A2,
        type: PlacementQuestionType.MULTIPLE_CHOICE,
        count: 3,
      },
      {
        skill: LearningSkill.LISTENING,
        level: CefrLevel.A2,
        type: PlacementQuestionType.LISTENING,
        count: 3,
      },
    ];
  }
}
