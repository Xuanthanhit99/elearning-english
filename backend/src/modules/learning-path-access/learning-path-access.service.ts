import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PlacementProcessingStatus,
  PlacementResultStatus,
  PlacementTestStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  LearningPathAccessResponse,
  LearningPathAccessState,
} from './learning-path-access.types';

@Injectable()
export class LearningPathAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<LearningPathAccessResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        currentPlacementTestId: true,
        currentPlacementTest: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            processingJob: {
              select: {
                status: true,
              },
            },
            result: {
              select: {
                id: true,
                status: true,
                phases: {
                  select: {
                    id: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
        placementTests: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            createdAt: true,
            processingJob: {
              select: {
                status: true,
              },
            },
            result: {
              select: {
                id: true,
                status: true,
                phases: {
                  select: {
                    id: true,
                  },
                  take: 1,
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

    const latestReadyResult = await this.prisma.placementResult.findFirst({
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
      select: {
        id: true,
        testId: true,
      },
    });

    if (latestReadyResult) {
      return {
        state: 'READY',
        allowed: true,
        currentTestId: latestReadyResult.testId,
        hasResult: true,
        hasLearningPath: true,
        nextUrl: '/learning-path',
        message: 'Bạn có thể tiếp tục lộ trình hiện tại.',
      };
    }

    const test = user.currentPlacementTest ?? user.placementTests[0] ?? null;

    if (!test) {
      return this.response(
        'NOT_STARTED',
        null,
        false,
        false,
        '/placement',
        'Bạn cần hoàn thành Placement Test trước khi mở lộ trình học.',
      );
    }

    if (test.status === PlacementTestStatus.IN_PROGRESS) {
      return this.response(
        'IN_PROGRESS',
        test.id,
        false,
        false,
        `/placement/test/${test.id}`,
        'Bạn đang có bài kiểm tra chưa hoàn thành.',
      );
    }

    if (
      test.processingJob?.status === PlacementProcessingStatus.WAITING ||
      test.processingJob?.status === PlacementProcessingStatus.PROCESSING
    ) {
      return this.response(
        'PROCESSING',
        test.id,
        false,
        false,
        `/placement/test/${test.id}/processing`,
        'AI đang xử lý bài kiểm tra của bạn.',
      );
    }

    if (test.processingJob?.status === PlacementProcessingStatus.FAILED) {
      return this.response(
        'RESULT_PENDING',
        test.id,
        false,
        false,
        `/placement/test/${test.id}/processing`,
        'Quá trình xử lý trước đó thất bại. Vui lòng mở lại màn Processing.',
      );
    }

    if (!test.result || test.result.status !== PlacementResultStatus.READY) {
      return this.response(
        'RESULT_PENDING',
        test.id,
        false,
        false,
        `/placement/test/${test.id}/result`,
        'Kết quả Placement Test chưa sẵn sàng.',
      );
    }

    if (test.result.phases.length === 0) {
      return this.response(
        'LEARNING_PATH_PENDING',
        test.id,
        true,
        false,
        `/placement/test/${test.id}/result`,
        'Kết quả đã có nhưng lộ trình học chưa được tạo.',
      );
    }

    return this.response(
      'READY',
      test.id,
      true,
      true,
      '/learning-path',
      'Bạn có thể truy cập lộ trình học.',
    );
  }

  private response(
    state: LearningPathAccessState,
    currentTestId: string | null,
    hasResult: boolean,
    hasLearningPath: boolean,
    nextUrl: string,
    message: string,
  ): LearningPathAccessResponse {
    return {
      state,
      allowed: state === 'READY',
      currentTestId,
      hasResult,
      hasLearningPath,
      nextUrl,
      message,
    };
  }
}
