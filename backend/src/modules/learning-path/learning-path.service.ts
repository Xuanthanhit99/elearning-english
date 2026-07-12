import { Injectable, NotFoundException } from '@nestjs/common';
import { PlacementResultStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LearningPathService {
  constructor(private readonly prisma: PrismaService) {}

  async getLearningPath(userId: string) {
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
      throw new NotFoundException('Chưa tìm thấy lộ trình học.');
    }

    return {
      testId: result.testId,
      overallLevel: result.overallLevel,
      overallScore: result.overallScore,
      generatedAt: result.generatedAt,
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
      skills: result.skills.map((item) => ({
        skill: item.skill,
        score: item.score,
        level: item.level,
        status: item.status,
      })),
    };
  }

  private jsonArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
