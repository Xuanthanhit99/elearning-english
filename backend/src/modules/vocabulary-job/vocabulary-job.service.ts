import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VocabularyJobService {
  constructor(private prisma: PrismaService) {}

  @Cron('0 0 * * 1')
  async generateWeeklyTopicPools() {
    console.log('Generating weekly topic pools...');
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    for (const level of levels) {
      await this.generatePoolForLevel(level);
    }
  }
  async generatePoolForLevel(level: string) {
    const { weekStart, weekEnd } = this.getWeekRange();

    const existed = await this.prisma.weeklyTopicPool.findUnique({
      where: {
        level_weekStart: {
          level,
          weekStart,
        },
      },
    });

    if (existed) return existed;

    const topics = await this.prisma.wordTopic.findMany({
      where: {
        words: {
          some: {
            level,
          },
        },
      },
      take: 20,
    });

    const selectedTopics = this.shuffle(topics).slice(0, 7);

    const pool = await this.prisma.weeklyTopicPool.create({
      data: {
        level,
        weekStart,
        weekEnd,
      },
    });

    for (let i = 0; i < selectedTopics.length; i++) {
      await this.prisma.weeklyTopicPoolItem.create({
        data: {
          poolId: pool.id,
          topicId: selectedTopics[i].id,
          order: i + 1,
        },
      });
    }

    return pool;
  }

  getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  }

  shuffle<T>(arr: T[]) {
    return [...arr].sort(() => Math.random() - 0.5);
  }
}
