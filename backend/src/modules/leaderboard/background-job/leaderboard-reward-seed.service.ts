import { Injectable } from '@nestjs/common';
import { LeaderboardReward, LeagueTier, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeaderboardRewardSeedService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultWeeklyRewards() {
    const definitions: Array<{
      league: LeagueTier | null;
      minRank: number;
      maxRank: number;
      title: string;
      value: Prisma.InputJsonValue;
    }> = [
      {
        league: null,
        minRank: 1,
        maxRank: 1,
        title: 'Hạng nhất tuần',
        value: {
          xp: 300,
          coins: 500,
          food: 20,
        },
      },
      {
        league: null,
        minRank: 2,
        maxRank: 2,
        title: 'Hạng nhì tuần',
        value: {
          xp: 200,
          coins: 350,
          food: 15,
        },
      },
      {
        league: null,
        minRank: 3,
        maxRank: 3,
        title: 'Hạng ba tuần',
        value: {
          xp: 150,
          coins: 250,
          food: 10,
        },
      },
    ];

    const created: LeaderboardReward[] = [];

    for (const definition of definitions) {
      const existing = await this.prisma.leaderboardReward.findFirst({
        where: {
          seasonId: null,
          league: definition.league,
          minRank: definition.minRank,
          maxRank: definition.maxRank,
          rewardType: 'WEEKLY_RANK_REWARD',
          isActive: true,
        },
      });

      if (existing) {
        created.push(existing);
        continue;
      }

      created.push(
        await this.prisma.leaderboardReward.create({
          data: {
            seasonId: null,
            league: definition.league,
            minRank: definition.minRank,
            maxRank: definition.maxRank,
            rewardType: 'WEEKLY_RANK_REWARD',
            rewardValue: definition.value,
            title: definition.title,
            description: 'Phần thưởng thành tích bảng xếp hạng tuần.',
            isActive: true,
          },
        }),
      );
    }

    return created;
  }
}
