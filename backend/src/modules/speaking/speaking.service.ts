import { Injectable } from '@nestjs/common';
import { SpeakingHomeResponse } from './dto/speaking-home.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SpeakingService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome(userId: string): Promise<SpeakingHomeResponse> {
    const categories = await this.prisma.speakingCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            topics: true,
          },
        },
      },
    });

    const recommendedTopics = await this.prisma.speakingTopic.findMany({
      where: { isActive: true },
      orderBy: [{ difficulty: 'asc' }, { order: 'asc' }],
      take: 4,
      include: {
        category: true,
      },
    });

    const completedCount = await this.prisma.speakingSession.count({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    const inProgressCount = await this.prisma.speakingSession.count({
      where: {
        userId,
        status: 'IN_PROGRESS',
      },
    });

    const totalLessonCount = await this.prisma.speakingLesson.count({
      where: {
        isActive: true,
      },
    });

    const notStarted = Math.max(
      totalLessonCount - completedCount - inProgressCount,
      0,
    );

    const recentSessions = await this.prisma.speakingSession.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 4,
      include: {
        topic: {
          include: {
            category: true,
          },
        },
        lesson: true,
      },
    });

    return {
      hero: {
        title: 'Ready to speak?',
        description: 'Choose a topic and start your speaking journey today!',
      },

      streak: {
        days: 12,
        week: [
          { label: 'S', day: 10, completed: true },
          { label: 'M', day: 11, completed: true },
          { label: 'T', day: 12, completed: true, active: true },
          { label: 'W', day: 13, completed: true },
          { label: 'T', day: 14, completed: true },
          { label: 'F', day: 15, completed: true },
          { label: 'S', day: 16, completed: false },
        ],
      },

      progress: {
        currentLevel: 18,
        nextLevel: 19,
        percent: 68,
        completed: completedCount,
        inProgress: inProgressCount,
        notStarted,
      },

      categories: categories.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        icon: item.icon,
        color: item.color,
        topicCount: item._count.topics,
      })),

      practiceTypes: [
        {
          key: 'READ_ALOUD',
          title: 'Read Aloud',
          description: 'Improve pronunciation and fluency',
          icon: '📋',
          color: 'purple',
        },
        {
          key: 'REPEAT_AFTER_ME',
          title: 'Repeat After Me',
          description: 'Listen and repeat for better speaking',
          icon: '🎧',
          color: 'green',
        },
        {
          key: 'ANSWER_QUESTIONS',
          title: 'Answer Questions',
          description: 'Answer questions on various topics',
          icon: '❓',
          color: 'orange',
        },
        {
          key: 'FREE_TALK',
          title: 'Free Talk',
          description: 'Speak freely about interesting topics',
          icon: '🎙️',
          color: 'blue',
        },
      ],

      recommendedTopics: recommendedTopics.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        imageUrl: item.imageUrl,
        difficulty: item.difficulty,
        estimatedMinutes: item.estimatedMinutes,
      })),

      recentHistory: recentSessions.map((item) => ({
        id: item.id,
        title: item.lesson?.title || item.topic?.title || 'Speaking Practice',
        category: item.topic?.category?.title || 'General',
        type: item.lesson?.type || 'FREE_TALK',
        score: item.overallScore,
        level: item.overallScore >= 85 ? 'Very Good' : 'Good',
        date: item.createdAt.toISOString(),
      })),
    };
  }
}
