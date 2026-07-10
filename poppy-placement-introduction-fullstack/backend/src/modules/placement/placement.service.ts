import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LearningSkill,
  ModeType,
  PlacementTestStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async getIntroduction(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullname: true,
        avatar: true,
        placementTest: {
          where: {
            status: PlacementTestStatus.IN_PROGRESS,
          },
          orderBy: {
            startedAt: 'desc',
          },
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

    const activeTest = user.placementTest[0] ?? null;
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

  async startOrResumeTest(userId: string, mode = ModeType.ADAPTIVE) {
    const userExists = await this.prisma.user.count({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const activeTest = await this.prisma.placementTest.findFirst({
      where: {
        userId,
        status: PlacementTestStatus.IN_PROGRESS,
      },
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        id: true,
        mode: true,
        status: true,
      },
    });

    if (activeTest) {
      return {
        sessionId: activeTest.id,
        resumed: true,
        status: activeTest.status,
        mode: activeTest.mode,
        nextUrl: `/placement/test/${activeTest.id}`,
      };
    }

    const test = await this.prisma.placementTest.create({
      data: {
        userId,
        mode,
        status: PlacementTestStatus.IN_PROGRESS,
        score: 0,
        total: 0,
        correct: 0,
      },
      select: {
        id: true,
        mode: true,
        status: true,
      },
    });

    return {
      sessionId: test.id,
      resumed: false,
      status: test.status,
      mode: test.mode,
      nextUrl: `/placement/test/${test.id}`,
    };
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

    return (
      skills.find((skill) => !completedSkills.has(skill)) ??
      'RESULT'
    );
  }
}
