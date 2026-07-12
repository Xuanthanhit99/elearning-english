import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlacementProcessingStatus,
  PlacementResultStatus,
  PlacementTestStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlacementService } from '../placement/placement.service';

const RETAKE_COOLDOWN_DAYS = 7;

@Injectable()
export class PlacementRetakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly placementService: PlacementService,
  ) {}

  async getRetakeStatus(userId: string) {
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
        createdAt: 'desc',
      },
      select: {
        id: true,
        startedAt: true,
      },
    });

    if (activeTest) {
      return {
        state: 'IN_PROGRESS' as const,
        allowed: false,
        currentTestId: activeTest.id,
        nextUrl: `/placement/test/${activeTest.id}`,
        message: 'Bạn đang có một bài kiểm tra chưa hoàn thành.',
      };
    }

    const processingTest = await this.prisma.placementTest.findFirst({
      where: {
        userId,
        processingJob: {
          is: {
            status: {
              in: [
                PlacementProcessingStatus.WAITING,
                PlacementProcessingStatus.PROCESSING,
              ],
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        processingJob: {
          select: {
            status: true,
          },
        },
      },
    });

    if (processingTest) {
      return {
        state: 'PROCESSING' as const,
        allowed: false,
        currentTestId: processingTest.id,
        nextUrl: `/placement/test/${processingTest.id}/processing`,
        message: 'Bài kiểm tra gần nhất đang được AI xử lý.',
      };
    }

    const latestCompleted = await this.prisma.placementTest.findFirst({
      where: {
        userId,
        status: PlacementTestStatus.COMPLETED,
        result: {
          is: {
            status: PlacementResultStatus.READY,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      select: {
        id: true,
        completedAt: true,
        result: {
          select: {
            overallLevel: true,
            overallScore: true,
          },
        },
      },
    });

    if (!latestCompleted) {
      return {
        state: 'FIRST_TIME' as const,
        allowed: true,
        currentTestId: null,
        nextUrl: '/placement/test/intro',
        remainingDays: 0,
        message: 'Bạn chưa từng hoàn thành Placement Test.',
      };
    }

    const cooldown = this.calculateCooldown(latestCompleted.completedAt);

    return {
      state: cooldown.allowed ? ('CAN_RETAKE' as const) : ('COOLDOWN' as const),

      allowed: cooldown.allowed,

      canForce: true,

      currentTestId: latestCompleted.id,

      latestResult: {
        level: latestCompleted.result?.overallLevel ?? null,
        score: latestCompleted.result?.overallScore ?? null,
        completedAt: latestCompleted.completedAt,
      },

      remainingDays: cooldown.remainingDays,

      recommendedDate: cooldown.recommendedDate,

      nextUrl: null,

      message: cooldown.allowed
        ? 'Bạn có thể làm lại Placement Test.'
        : `Bạn vừa hoàn thành bài kiểm tra. Nên làm lại sau ${cooldown.remainingDays} ngày để kết quả phản ánh sự tiến bộ rõ hơn.`,
    };
  }

  async retake(userId: string, force = false) {
    const status = await this.getRetakeStatus(userId);

    if (status.state === 'IN_PROGRESS' || status.state === 'PROCESSING') {
      return {
        reused: true,
        testId: status.currentTestId,
        nextUrl: status.nextUrl,
      };
    }

    if (!status.allowed && !force) {
      throw new BadRequestException({
        code: 'PLACEMENT_RETAKE_COOLDOWN',
        message: status.message,
        remainingDays: 'remainingDays' in status ? status.remainingDays : 0,
        recommendedDate:
          'recommendedDate' in status ? status.recommendedDate : null,
        canForce: true,
      });
    }

    /*
     * Dùng service tạo test hiện tại của bạn.
     * Không nên prisma.placementTest.create() tối thiểu
     * vì sẽ thiếu mode, câu hỏi và cấu hình adaptive.
     */
    const created = await this.placementService.startNewRetake(userId);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        currentPlacementTestId: created.testId,
      },
    });

    return {
      reused: false,
      testId: created.testId,
      nextUrl: created.nextUrl ?? `/placement/test/${created.testId}`,
    };
  }

  private calculateCooldown(completedAt: Date | null) {
    if (!completedAt) {
      return {
        allowed: true,
        remainingDays: 0,
        recommendedDate: null,
      };
    }

    const oneDay = 24 * 60 * 60 * 1000;

    const passedDays = Math.floor(
      (Date.now() - completedAt.getTime()) / oneDay,
    );

    const remainingDays = Math.max(RETAKE_COOLDOWN_DAYS - passedDays, 0);

    return {
      allowed: remainingDays === 0,
      remainingDays,
      recommendedDate:
        remainingDays > 0
          ? new Date(completedAt.getTime() + RETAKE_COOLDOWN_DAYS * oneDay)
          : null,
    };
  }
}
