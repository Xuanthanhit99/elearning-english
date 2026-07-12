import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  ModeType,
  PlacementMethod,
  PlacementStatus,
  PlacementTestStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlacementMode } from './dto/placement.types';
import { PlacementTestService } from './placement-test/placement-test.service';
import { PlacementSessionService } from './placement-session/placement-session.service';

const ALL_SKILLS: LearningSkill[] = [
  LearningSkill.VOCABULARY,
  LearningSkill.GRAMMAR,
  LearningSkill.LISTENING,
  LearningSkill.READING,
  LearningSkill.SPEAKING,
  LearningSkill.WRITING,
];

const INTRO_STEPS = [
  {
    key: 'INTRODUCTION',
    order: 1,
    title: 'Giới thiệu',
    subtitle: 'Bắt đầu cuộc hành trình',
  },
  {
    key: LearningSkill.VOCABULARY,
    order: 2,
    title: 'Vocabulary',
    subtitle: 'Đánh giá từ vựng',
  },
  {
    key: LearningSkill.GRAMMAR,
    order: 3,
    title: 'Grammar',
    subtitle: 'Đánh giá ngữ pháp',
  },
  {
    key: LearningSkill.LISTENING,
    order: 4,
    title: 'Listening',
    subtitle: 'Đánh giá nghe hiểu',
  },
  {
    key: LearningSkill.READING,
    order: 5,
    title: 'Reading',
    subtitle: 'Đánh giá đọc hiểu',
  },
  {
    key: LearningSkill.SPEAKING,
    order: 6,
    title: 'Speaking',
    subtitle: 'Đánh giá kỹ năng nói',
  },
  {
    key: LearningSkill.WRITING,
    order: 7,
    title: 'Writing',
    subtitle: 'Đánh giá kỹ năng viết',
  },
  {
    key: 'RESULT',
    order: 8,
    title: 'Kết quả',
    subtitle: 'Nhận đánh giá trình độ',
  },
] as const;

@Injectable()
export class PlacementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly placementSessionService: PlacementSessionService,
  ) {}

  /**
   * Lấy dữ liệu màn hình Placement theo người dùng đăng nhập.
   */
  async getPlacementHome(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        fullname: true,
        avatar: true,
        englishLevel: true,

        placement: {
          select: {
            id: true,
            method: true,
            status: true,
            overallLevel: true,
            completedAt: true,

            skillLevels: {
              select: {
                skill: true,
                level: true,
                score: true,
                source: true,
                updatedAt: true,
              },
              orderBy: {
                skill: 'asc',
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const placement = user.placement;

    return {
      user: {
        id: user.id,

        // Frontend đang sử dụng user.name nên trả về name.
        name: user.fullname || 'Bạn',

        avatar: user.avatar ?? null,
      },

      placement: placement
        ? {
            id: placement.id,
            status: placement.status,
            method: placement.method,
            overallLevel: placement.overallLevel,
            completedAt: placement.completedAt,
            skillLevels: placement.skillLevels,
          }
        : {
            id: null,
            status: PlacementStatus.NOT_STARTED,
            method: null,
            overallLevel: this.normalizeLegacyLevel(user.englishLevel),
            completedAt: null,
            skillLevels: [],
          },

      options: {
        recommendedMethod: PlacementMethod.TEST,

        testDurationMinutes: {
          min: 10,
          max: 15,
        },

        supportedCertificates: ['IELTS', 'TOEIC', 'TOEFL', 'CAMBRIDGE'],

        cefrLevels: Object.values(CefrLevel),
      },
    };
  }

  /**
   * Người dùng tự chọn trình độ A1-C2.
   *
   * Khi chọn thủ công:
   * - Cập nhật UserPlacement.
   * - Cập nhật level của tất cả kỹ năng.
   * - Đồng bộ User.englishLevel để code cũ vẫn hoạt động.
   * - Đồng bộ UserLearningProfile nếu đã tồn tại.
   */
  async selectManualLevel(userId: string, level: CefrLevel) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      const placement = await tx.userPlacement.upsert({
        where: {
          userId,
        },

        create: {
          userId,
          method: PlacementMethod.MANUAL,
          status: PlacementStatus.COMPLETED,
          overallLevel: level,
          completedAt: now,
        },

        update: {
          method: PlacementMethod.MANUAL,
          status: PlacementStatus.COMPLETED,
          overallLevel: level,
          completedAt: now,
        },
      });

      /*
       * Tạo hoặc cập nhật trình độ cho từng kỹ năng.
       *
       * Vì người dùng chọn thủ công một level chung nên tạm thời
       * sáu kỹ năng cùng level. Sau này Placement Test hoặc kết quả
       * học tập có thể cập nhật từng kỹ năng riêng biệt.
       */
      for (const skill of ALL_SKILLS) {
        await tx.userSkillLevel.upsert({
          where: {
            userId_skill: {
              userId,
              skill,
            },
          },

          create: {
            userId,
            placementId: placement.id,
            skill,
            level,
            score: null,
            source: PlacementMethod.MANUAL,
          },

          update: {
            placementId: placement.id,
            level,
            score: null,
            source: PlacementMethod.MANUAL,
          },
        });
      }

      /*
       * Đồng bộ trường cũ để các module hiện tại vẫn chạy đúng.
       */
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          englishLevel: level,
        },
      });

      /*
       * Đồng bộ hồ sơ học tập.
       * Dùng upsert vì user có thể chưa có UserLearningProfile.
       */
      await tx.userLearningProfile.upsert({
        where: {
          userId,
        },

        create: {
          userId,
          level,
        },

        update: {
          level,
        },
      });

      const skillLevels = await tx.userSkillLevel.findMany({
        where: {
          userId,
        },
        select: {
          skill: true,
          level: true,
          score: true,
          source: true,
        },
        orderBy: {
          skill: 'asc',
        },
      });

      return {
        placementId: placement.id,
        method: placement.method,
        status: placement.status,
        overallLevel: placement.overallLevel,
        skillLevels,
        nextUrl: '/learning-path',
      };
    });
  }

  /**
   * Chuyển dữ liệu level cũ sang chuẩn CEFR.
   */
  private normalizeLegacyLevel(value?: string | null): CefrLevel | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toUpperCase();

    const cefrLevels = Object.values(CefrLevel) as string[];

    if (cefrLevels.includes(normalized)) {
      return normalized as CefrLevel;
    }

    const legacyLevelMap: Record<string, CefrLevel> = {
      BEGINNER: CefrLevel.A1,
      ELEMENTARY: CefrLevel.A2,
      INTERMEDIATE: CefrLevel.B1,
      'UPPER INTERMEDIATE': CefrLevel.B2,
      'UPPER-INTERMEDIATE': CefrLevel.B2,
      ADVANCED: CefrLevel.C1,
      PROFICIENT: CefrLevel.C2,
      PROFICIENCY: CefrLevel.C2,
    };

    return legacyLevelMap[normalized] ?? null;
  }

  async getIntroduction(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullname: true,
        avatar: true,
        placementTests: {
          where: {
            status: PlacementTestStatus.IN_PROGRESS,
          },
          orderBy: [
            {
              startedAt: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
          take: 1,
          select: {
            id: true,
            mode: true,
            status: true,
            score: true,
            total: true,
            correct: true,
            startedAt: true,
            updatedAt: true,
            questions: {
              select: {
                id: true,
                userAnswer: true,
                answeredAt: true,
                question: {
                  select: {
                    skill: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const activeTest = user.placementTests[0] ?? null;
    const completedSkills = new Set(
      activeTest?.questions
        .filter((item) => item.answeredAt || item.userAnswer)
        .map((item) => item.question.skill) ?? [],
    );

    const currentStep = activeTest
      ? this.resolveCurrentStep(completedSkills)
      : 'INTRODUCTION';

    return {
      user: {
        id: user.id,
        name: user.fullname || 'Bạn',
        avatar: user.avatar ?? null,
      },
      test: {
        hasActiveSession: Boolean(activeTest),
        sessionId: activeTest?.id ?? null,
        mode: activeTest?.mode ?? ModeType.ADAPTIVE,
        status: activeTest?.status ?? null,
        currentStep,
        answeredQuestions:
          activeTest?.questions.filter(
            (item) => item.answeredAt || item.userAnswer,
          ).length ?? 0,
      },
      content: {
        title: 'Sẵn sàng bắt đầu?',
        description:
          'Bài kiểm tra được thiết kế bởi AI giúp xác định chính xác trình độ tiếng Anh của bạn theo chuẩn CEFR.',
        adaptive: {
          title: 'Adaptive AI Assessment',
          description:
            'Độ khó sẽ tự động điều chỉnh theo câu trả lời của bạn. Bài kiểm tra sẽ dừng khi AI đã xác định đủ chính xác trình độ.',
        },
        summaryCards: [
          {
            key: 'TIME',
            value: 'Khoảng 10 phút',
            label: 'AI sẽ kết thúc khi đủ dữ liệu',
          },
          {
            key: 'QUESTIONS',
            value: 'Khoảng 25–35 câu hỏi',
            label: 'Adaptive theo năng lực',
          },
          {
            key: 'SPEAKING',
            value: '1 bài Nói',
            label: 'Đánh giá kỹ năng',
          },
          {
            key: 'WRITING',
            value: '1 bài Viết',
            label: 'Đánh giá kỹ năng',
          },
        ],
        benefits: [
          {
            key: 'ADAPTIVE',
            title: 'Adaptive Difficulty',
            description: 'Độ khó thay đổi theo năng lực của bạn.',
          },
          {
            key: 'AI',
            title: 'AI phân tích chi tiết',
            description: 'Đánh giá chính xác theo chuẩn CEFR.',
          },
          {
            key: 'RETRY',
            title: 'Làm lại bất kỳ lúc nào',
            description: 'Bạn có thể kiểm tra lại để cập nhật trình độ mới.',
          },
          {
            key: 'NO_RANK',
            title: 'Không tính xếp hạng',
            description: 'Chỉ dùng để xác định trình độ của bạn.',
          },
        ],
        skills: [
          LearningSkill.VOCABULARY,
          LearningSkill.GRAMMAR,
          LearningSkill.LISTENING,
          LearningSkill.READING,
          LearningSkill.SPEAKING,
          LearningSkill.WRITING,
        ],
        steps: INTRO_STEPS,
        estimatedMinutes: 10,
        autosaveMessage:
          'Tiến trình được tự động lưu. Bạn có thể tạm dừng và tiếp tục bất cứ lúc nào.',
      },
    };
  }

  async startOrResumeTest(
    userId: string,
    mode: ModeType = ModeType.ADAPTIVE,
    level?: CefrLevel,
  ) {
    return this.placementSessionService.startOrResume(userId, {
      mode,
      level,
    });
  }

  async startNewRetake(userId: string, mode: ModeType = ModeType.ADAPTIVE) {
    return this.placementSessionService.startRetake(userId, {
      mode,
    });
  }

  private resolveCurrentStep(completedSkills: Set<LearningSkill>) {
    const skills: LearningSkill[] = [
      LearningSkill.VOCABULARY,
      LearningSkill.GRAMMAR,
      LearningSkill.LISTENING,
      LearningSkill.READING,
      LearningSkill.SPEAKING,
      LearningSkill.WRITING,
    ];

    return skills.find((skill) => !completedSkills.has(skill)) ?? 'RESULT';
  }
}
