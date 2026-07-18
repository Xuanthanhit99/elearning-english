import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  ModeType,
  PlacementQuestion,
  PlacementQuestionType,
  PlacementTestStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuestionBankService } from '../../question-bank/question-bank.service';

type StartInput = {
  mode?: ModeType;
  level?: CefrLevel;
  forceNew?: boolean;
};

type PlanItem = {
  skill: LearningSkill;
  level: CefrLevel;
  type: PlacementQuestionType;
  count: number;
};

@Injectable()
export class PlacementSessionService {
  private readonly logger = new Logger(PlacementSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly questionBankService: QuestionBankService,
  ) {}

  async startOrResume(userId: string, input: StartInput = {}) {
    await this.assertUserExists(userId);

    if (!input.forceNew) {
      const active = await this.findActiveSession(userId);

      if (active) {
        const count = await this.prisma.placementTestQuestion.count({
          where: { testId: active.id },
        });

        if (count === 0) {
          await this.prepareSessionQuestions(active.id);
        }

        await this.prisma.user.update({
          where: { id: userId },
          data: { currentPlacementTestId: active.id },
        });

        return {
          testId: active.id,
          sessionId: active.id,
          resumed: true,
          mode: active.mode,
          level: active.level,
          status: active.status,
          totalQuestions: await this.prisma.placementTestQuestion.count({
            where: { testId: active.id },
          }),
          nextUrl: `/placement/test/${active.id}`,
        };
      }
    }

    if (input.forceNew) {
      await this.abandonActiveSessions(userId);
    }

    return this.createNewSession(userId, {
      mode: input.mode ?? ModeType.ADAPTIVE,
      level:
        input.mode === ModeType.LEVEL_BASED
          ? (input.level ?? CefrLevel.A1)
          : null,
    });
  }

  async startRetake(userId: string, input: Omit<StartInput, 'forceNew'> = {}) {
    await this.assertUserExists(userId);
    await this.abandonActiveSessions(userId);

    return this.createNewSession(userId, {
      mode: input.mode ?? ModeType.ADAPTIVE,
      level:
        input.mode === ModeType.LEVEL_BASED
          ? (input.level ?? CefrLevel.A1)
          : null,
    });
  }

  async prepareSessionQuestions(testId: string): Promise<void> {
    const test = await this.prisma.placementTest.findUnique({
      where: { id: testId },
      select: {
        id: true,
        mode: true,
        level: true,
        status: true,
        questions: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Không tìm thấy phiên Placement Test.');
    }

    if (test.status !== PlacementTestStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Chỉ có thể chuẩn bị câu hỏi cho phiên đang làm.',
      );
    }

    if (test.questions.length > 0) return;

    const selected: PlacementQuestion[] = [];

    for (const item of this.buildQuestionPlan(test.mode, test.level)) {
      const questions = await this.questionBankService.ensurePlacementQuestions(
        {
          skill: item.skill,
          level: item.level,
          type: item.type,
          requiredCount: item.count,
        },
      );

      selected.push(...questions);
    }

    const unique = Array.from(
      new Map(selected.map((item) => [item.id, item])).values(),
    );

    if (unique.length === 0) {
      throw new BadRequestException(
        'Không thể chuẩn bị câu hỏi cho bài kiểm tra.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.placementTestQuestion.count({
        where: { testId },
      });

      if (existing > 0) return;

      await tx.placementTestQuestion.createMany({
        data: unique.map((question, index) => ({
          testId,
          questionId: question.id,
          order: index + 1,
        })),
        skipDuplicates: true,
      });

      await tx.placementQuestion.updateMany({
        where: { id: { in: unique.map((item) => item.id) } },
        data: { usageCount: { increment: 1 } },
      });
    });
  }

  async getActiveSession(userId: string) {
    await this.assertUserExists(userId);
    const active = await this.findActiveSession(userId);

    if (!active) {
      return { hasActiveSession: false, session: null };
    }

    return {
      hasActiveSession: true,
      session: {
        ...active,
        totalQuestions: await this.prisma.placementTestQuestion.count({
          where: { testId: active.id },
        }),
        nextUrl: `/placement/test/${active.id}`,
      },
    };
  }

  async abandonSession(userId: string, testId: string) {
    const test = await this.prisma.placementTest.findUnique({
      where: { id: testId },
      select: { id: true, userId: true, status: true },
    });

    if (!test) {
      throw new NotFoundException('Không tìm thấy phiên Placement Test.');
    }

    if (test.userId !== userId) {
      throw new BadRequestException('Bạn không có quyền thay đổi phiên này.');
    }

    if (test.status === PlacementTestStatus.IN_PROGRESS) {
      await this.prisma.placementTest.update({
        where: { id: testId },
        data: { status: PlacementTestStatus.ABANDONED },
      });

      await this.prisma.user.updateMany({
        where: { id: userId, currentPlacementTestId: testId },
        data: { currentPlacementTestId: null },
      });
    }

    return { testId, status: PlacementTestStatus.ABANDONED };
  }

  private async createNewSession(
    userId: string,
    input: { mode: ModeType; level: CefrLevel | null },
  ) {
    if (input.mode === ModeType.LEVEL_BASED && !input.level) {
      throw new BadRequestException('LEVEL_BASED yêu cầu level A1-C2.');
    }

    const test = await this.prisma.placementTest.create({
      data: {
        userId,
        mode: input.mode,
        level: input.level,
        status: PlacementTestStatus.IN_PROGRESS,
        score: 0,
        total: 0,
        correct: 0,
        startedAt: new Date(),
      },
      select: {
        id: true,
        mode: true,
        level: true,
        status: true,
      },
    });

    try {
      await this.prepareSessionQuestions(test.id);

      await this.prisma.user.update({
        where: { id: userId },
        data: { currentPlacementTestId: test.id },
      });

      return {
        testId: test.id,
        sessionId: test.id,
        resumed: false,
        mode: test.mode,
        level: test.level,
        status: test.status,
        totalQuestions: await this.prisma.placementTestQuestion.count({
          where: { testId: test.id },
        }),
        nextUrl: `/placement/test/${test.id}`,
      };
    } catch (error) {
      this.logger.error(
        `Prepare placement session ${test.id} failed`,
        error instanceof Error ? error.stack : String(error),
      );

      await this.prisma.placementTest.update({
        where: { id: test.id },
        data: { status: PlacementTestStatus.ABANDONED },
      });

      throw error;
    }
  }

  private findActiveSession(userId: string) {
    return this.prisma.placementTest.findFirst({
      where: {
        userId,
        status: PlacementTestStatus.IN_PROGRESS,
      },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        mode: true,
        level: true,
        status: true,
        startedAt: true,
      },
    });
  }

  private async abandonActiveSessions(userId: string) {
    const active = await this.prisma.placementTest.findMany({
      where: {
        userId,
        status: PlacementTestStatus.IN_PROGRESS,
      },
      select: { id: true },
    });

    if (active.length === 0) return;

    const ids = active.map((item) => item.id);

    await this.prisma.placementTest.updateMany({
      where: { id: { in: ids } },
      data: { status: PlacementTestStatus.ABANDONED },
    });

    await this.prisma.user.updateMany({
      where: {
        id: userId,
        currentPlacementTestId: { in: ids },
      },
      data: { currentPlacementTestId: null },
    });
  }

  private buildQuestionPlan(
    mode: ModeType,
    selectedLevel: CefrLevel | null,
  ): PlanItem[] {
    if (mode === ModeType.LEVEL_BASED) {
      const level = selectedLevel ?? CefrLevel.A1;

      return [
        this.plan(
          LearningSkill.VOCABULARY,
          level,
          PlacementQuestionType.MULTIPLE_CHOICE,
          6,
        ),
        this.plan(
          LearningSkill.GRAMMAR,
          level,
          PlacementQuestionType.MULTIPLE_CHOICE,
          6,
        ),
        this.plan(
          LearningSkill.LISTENING,
          level,
          PlacementQuestionType.LISTENING,
          5,
        ),
        this.plan(
          LearningSkill.READING,
          level,
          PlacementQuestionType.READING,
          5,
        ),
        this.plan(
          LearningSkill.SPEAKING,
          level,
          PlacementQuestionType.SPEAKING,
          1,
        ),
        this.plan(
          LearningSkill.WRITING,
          level,
          PlacementQuestionType.WRITING,
          1,
        ),
      ];
    }

    return [
      ...this.multiLevelPlan(
        LearningSkill.VOCABULARY,
        PlacementQuestionType.MULTIPLE_CHOICE,
        [2, 2, 1, 1],
      ),
      ...this.multiLevelPlan(
        LearningSkill.GRAMMAR,
        PlacementQuestionType.MULTIPLE_CHOICE,
        [2, 2, 1, 1],
      ),
      ...this.multiLevelPlan(
        LearningSkill.LISTENING,
        PlacementQuestionType.LISTENING,
        [1, 2, 1, 1],
      ),
      ...this.multiLevelPlan(
        LearningSkill.READING,
        PlacementQuestionType.READING,
        [1, 2, 1, 1],
      ),
      this.plan(
        LearningSkill.SPEAKING,
        CefrLevel.A2,
        PlacementQuestionType.SPEAKING,
        1,
      ),
      this.plan(
        LearningSkill.WRITING,
        CefrLevel.A2,
        PlacementQuestionType.WRITING,
        1,
      ),
    ];
  }

  private multiLevelPlan(
    skill: LearningSkill,
    type: PlacementQuestionType,
    counts: [number, number, number, number],
  ): PlanItem[] {
    const levels = [CefrLevel.A1, CefrLevel.A2, CefrLevel.B1, CefrLevel.B2];

    return levels
      .map((level, index) => this.plan(skill, level, type, counts[index]))
      .filter((item) => item.count > 0);
  }

  private plan(
    skill: LearningSkill,
    level: CefrLevel,
    type: PlacementQuestionType,
    count: number,
  ): PlanItem {
    return { skill, level, type, count };
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }
  }
}
