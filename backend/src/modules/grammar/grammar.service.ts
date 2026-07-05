import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GrammarLevel } from '@prisma/client';

@Injectable()
export class GrammarService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string, level?: string) {
    const whereTopic: any = {
      isActive: true,
    };

    if (level && level !== 'ALL') {
      whereTopic.level = level as GrammarLevel;
    }

    const [
      totalTopics,
      totalLessons,
      completedLessons,
      progressList,
      categories,
      recentLessons,
      roadmapTopics,
    ] = await Promise.all([
      this.prisma.grammarTopic.count({
        where: whereTopic,
      }),

      this.prisma.grammarLesson.count({
        where: {
          isActive: true,
          topic: whereTopic,
        },
      }),

      this.prisma.grammarLessonProgress.count({
        where: {
          userId,
          completed: true,
          lesson: {
            topic: whereTopic,
          },
        },
      }),

      this.prisma.grammarLessonProgress.findMany({
        where: {
          userId,
          completed: true,
          lesson: {
            topic: whereTopic,
          },
        },
        select: {
          score: true,
        },
      }),

      this.getCategoryCards(userId, level),

      this.getRecentLessons(userId),

      this.getRoadmap(userId, level || 'B1'),
    ]);

    const averageScore =
      progressList.length > 0
        ? Math.round(
            progressList.reduce((sum, item) => sum + item.score, 0) /
              progressList.length,
          )
        : 0;

    return {
      stats: {
        totalTopics,
        totalLessons,
        completedLessons,
        averageScore,
      },
      categories,
      topics: await this.getTopics(userId, level),
      roadmap: {
        currentLevel: level || 'B1',
        progress:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
        items: roadmapTopics,
      },
      recentLessons,
      recommend: {
        title: 'Gợi ý hôm nay',
        description:
          'Học 15 phút ngữ pháp mỗi ngày sẽ giúp bạn tiến bộ nhanh hơn!',
      },
    };
  }

  async getCategories(userId: string) {
    return this.getCategoryCards(userId);
  }

  async getCategoryCards(userId: string, level?: string) {
    const categories = await this.prisma.grammarCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        topics: {
          where: {
            isActive: true,
            ...(level && level !== 'ALL'
              ? { level: level as GrammarLevel }
              : {}),
          },
          include: {
            lessons: {
              where: {
                isActive: true,
              },
              include: {
                progress: {
                  where: {
                    userId,
                    completed: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return categories.map((category) => {
      const lessons = category.topics.flatMap((topic) => topic.lessons);
      const completed = lessons.filter((lesson) => lesson.progress.length > 0);

      return {
        id: category.id,
        title: category.title,
        icon: category.icon,
        color: category.color,
        totalTopics: category.topics.length,
        totalLessons: lessons.length,
        completedLessons: completed.length,
        progress:
          lessons.length > 0
            ? Math.round((completed.length / lessons.length) * 100)
            : 0,
      };
    });
  }

  async getTopics(userId: string, level?: string) {
    const topics = await this.prisma.grammarTopic.findMany({
      where: {
        isActive: true,
        ...(level && level !== 'ALL' ? { level: level as GrammarLevel } : {}),
      },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
      include: {
        category: true,
        lessons: {
          where: {
            isActive: true,
          },
          include: {
            progress: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    return topics.map((topic) => {
      const totalLessons = topic.lessons.length;
      const completedLessons = topic.lessons.filter(
        (lesson) => lesson.progress[0]?.completed,
      ).length;

      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        level: topic.level,
        category: topic.category.title,
        totalLessons,
        completedLessons,
        progress:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
      };
    });
  }
  async getLessonsByTopic(userId: string, topicId: string) {
    const topic = await this.prisma.grammarTopic.findUnique({
      where: {
        id: topicId,
      },
      include: {
        lessons: {
          where: {
            isActive: true,
          },
          orderBy: {
            order: 'asc',
          },
          include: {
            progress: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Không tìm thấy chủ điểm ngữ pháp');
    }

    return topic.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      duration: lesson.duration,
      order: lesson.order,
      completed: lesson.progress[0]?.completed || false,
      score: lesson.progress[0]?.score || 0,
    }));
  }

  async getLessonDetail(userId: string, lessonId: string) {
    const lesson = await this.prisma.grammarLesson.findUnique({
      where: {
        id: lessonId,
      },
      include: {
        topic: {
          include: {
            category: true,
          },
        },
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        progress: {
          where: {
            userId,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    return {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      duration: lesson.duration,
      topic: {
        id: lesson.topic.id,
        title: lesson.topic.title,
        level: lesson.topic.level,
        category: lesson.topic.category.title,
      },
      completed: lesson.progress[0]?.completed || false,
      score: lesson.progress[0]?.score || 0,
      questions: lesson.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
      })),
    };
  }

  async submitLesson(
    userId: string,
    lessonId: string,
    answers: { questionId: string; answer: string }[],
  ) {
    const questions = await this.prisma.grammarQuestion.findMany({
      where: {
        lessonId,
      },
    });

    if (!questions.length) {
      throw new NotFoundException('Bài học chưa có câu hỏi');
    }

    let correct = 0;

    const results = questions.map((question) => {
      const userAnswer = answers.find((a) => a.questionId === question.id);

      const isCorrect = userAnswer?.answer === question.correctAnswer;

      if (isCorrect) correct++;

      return {
        questionId: question.id,
        question: question.question,
        userAnswer: userAnswer?.answer || null,
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const score = Math.round((correct / questions.length) * 100);

    await this.prisma.grammarLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        completed: true,
        score,
        completedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        completed: true,
        score,
        completedAt: new Date(),
      },
    });

    return {
      score,
      correct,
      total: questions.length,
      results,
    };
  }

  private async getRecentLessons(userId: string) {
    const recent = await this.prisma.grammarLessonProgress.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 4,
      include: {
        lesson: {
          include: {
            topic: true,
          },
        },
      },
    });

    return recent.map((item) => ({
      id: item.lesson.id,
      title: item.lesson.title,
      topic: item.lesson.topic.title,
      status: item.completed ? 'Tiếp tục' : 'Bắt đầu',
      score: item.score,
    }));
  }

  private async getRoadmap(userId: string, level: string) {
    const topics = await this.prisma.grammarTopic.findMany({
      where: {
        level: level as GrammarLevel,
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        lessons: {
          where: {
            isActive: true,
          },
          include: {
            progress: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    return topics.map((topic) => {
      const total = topic.lessons.length;
      const completed = topic.lessons.filter(
        (lesson) => lesson.progress[0]?.completed,
      ).length;

      return {
        id: topic.id,
        title: topic.title,
        total,
        completed,
        done: total > 0 && completed === total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }
}
