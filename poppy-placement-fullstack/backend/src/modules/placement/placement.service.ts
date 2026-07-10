import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  PlacementMethod,
  PlacementStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ALL_SKILLS: LearningSkill[] = [
  LearningSkill.VOCABULARY,
  LearningSkill.GRAMMAR,
  LearningSkill.LISTENING,
  LearningSkill.READING,
  LearningSkill.SPEAKING,
  LearningSkill.WRITING,
];

@Injectable()
export class PlacementService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlacementHome(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
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
        name: user.name ?? 'Bạn',
        avatar: user.avatar ?? null,
      },
      placement: placement
        ? {
            status: placement.status,
            method: placement.method,
            overallLevel: placement.overallLevel,
            completedAt: placement.completedAt,
            skillLevels: placement.skillLevels,
          }
        : {
            status: PlacementStatus.NOT_STARTED,
            method: null,
            overallLevel: null,
            completedAt: null,
            skillLevels: [],
          },
      options: {
        recommendedMethod: PlacementMethod.TEST,
        testDurationMinutes: {
          min: 10,
          max: 15,
        },
        supportedCertificates: [
          'IELTS',
          'TOEIC',
          'TOEFL',
          'CAMBRIDGE',
        ],
        cefrLevels: Object.values(CefrLevel),
      },
    };
  }

  async selectManualLevel(userId: string, level: CefrLevel) {
    const userExists = await this.prisma.user.count({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    return this.prisma.$transaction(async (tx) => {
      const placement = await tx.userPlacement.upsert({
        where: { userId },
        create: {
          userId,
          method: PlacementMethod.MANUAL,
          status: PlacementStatus.COMPLETED,
          overallLevel: level,
          completedAt: new Date(),
        },
        update: {
          method: PlacementMethod.MANUAL,
          status: PlacementStatus.COMPLETED,
          overallLevel: level,
          completedAt: new Date(),
        },
      });

      await Promise.all(
        ALL_SKILLS.map((skill) =>
          tx.userSkillLevel.upsert({
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
              source: PlacementMethod.MANUAL,
            },
            update: {
              placementId: placement.id,
              level,
              score: null,
              source: PlacementMethod.MANUAL,
            },
          }),
        ),
      );

      return {
        placementId: placement.id,
        method: placement.method,
        status: placement.status,
        overallLevel: placement.overallLevel,
        nextUrl: '/learning-path',
      };
    });
  }
}
