import {
  BadRequestException,
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

  async getTopicDetail(userId: string, topicId: string) {
    const topic = await this.prisma.grammarTopic.findUnique({
      where: { id: topicId },
      include: {
        category: true,
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
            questions: true,
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Không tìm thấy chủ đề ngữ pháp');
    }

    const totalLessons = topic.lessons.length;

    const completedLessons = topic.lessons.filter(
      (lesson) => lesson.progress[0]?.completed,
    ).length;

    const totalQuestions = topic.lessons.reduce(
      (sum, lesson) => sum + lesson.questions.length,
      0,
    );

    const completedQuestions = topic.lessons
      .filter((lesson) => lesson.progress[0]?.completed)
      .reduce((sum, lesson) => sum + lesson.questions.length, 0);

    const progress =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    const currentLesson =
      topic.lessons.find((lesson) => !lesson.progress[0]?.completed) ||
      topic.lessons[0];

    const averageScore =
      topic.lessons.length > 0
        ? Math.round(
            topic.lessons.reduce(
              (sum, lesson) => sum + (lesson.progress[0]?.score || 0),
              0,
            ) / topic.lessons.length,
          )
        : 0;

    return {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      level: topic.level,

      category: {
        id: topic.category.id,
        title: topic.category.title,
        icon: topic.category.icon,
        color: topic.category.color,
      },

      overview: {
        image: null,
        estimatedTime: `${totalLessons * 4}-${totalLessons * 5} phút`,
        rewardXp: 100,
        rewardCoin: 50,
        progress,
        completedLessons,
        totalLessons,
        completedQuestions,
        totalQuestions,
        averageScore,
        currentLessonId: currentLesson?.id || null,
      },

      mainUsages: this.getMainUsages(topic.title),

      lessons: topic.lessons.map((lesson, index) => {
        const lessonProgress = lesson.progress[0];

        const previousLessonsCompleted =
          index === 0 ||
          topic.lessons
            .slice(0, index)
            .every((item) => item.progress[0]?.completed);

        const isLocked = !previousLessonsCompleted;

        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          duration: `${lesson.duration || 5} phút`,
          type: lesson.questions.length > 0 ? 'Bài tập' : 'Lý thuyết',
          completed: lessonProgress?.completed || false,
          score: lessonProgress?.score || 0,
          locked: isLocked,
          status: lessonProgress?.completed
            ? 'COMPLETED'
            : isLocked
              ? 'LOCKED'
              : 'IN_PROGRESS',
        };
      }),

      roadmap: await this.getTopicRoadmap(
        userId,
        topic.id,
        topic.level as GrammarLevel,
      ),

      relatedTopics: await this.getRelatedTopics(
        userId,
        topic.id,
        topic.categoryId,
      ),
    };
  }

  private async getTopicRoadmap(
    userId: string,
    currentTopicId: string,
    level: GrammarLevel,
  ) {
    const topics = await this.prisma.grammarTopic.findMany({
      where: {
        level,
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
        current: topic.id === currentTopicId,
        completed: total > 0 && completed === total,
        locked: false,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }

  private async getRelatedTopics(
    userId: string,
    currentTopicId: string,
    categoryId: string,
  ) {
    const topics = await this.prisma.grammarTopic.findMany({
      where: {
        id: {
          not: currentTopicId,
        },
        categoryId,
        isActive: true,
      },
      take: 4,
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
        level: topic.level,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }

  private getMainUsages(topicTitle: string) {
    if (topicTitle.toLowerCase().includes('present simple')) {
      return [
        {
          title: 'Thói quen & hành động lặp lại',
          example: 'I go to school every day.',
          meaning: 'Tôi đi học mỗi ngày.',
          color: 'green',
        },
        {
          title: 'Sự thật hiển nhiên',
          example: 'The sun rises in the east.',
          meaning: 'Mặt trời mọc ở hướng đông.',
          color: 'blue',
        },
        {
          title: 'Lịch trình & thời gian biểu',
          example: 'The train leaves at 8 a.m.',
          meaning: 'Tàu khởi hành lúc 8 giờ sáng.',
          color: 'orange',
        },
        {
          title: 'Cảm xúc, trạng thái',
          example: 'I love coffee.',
          meaning: 'Tôi thích cà phê.',
          color: 'pink',
        },
      ];
    }

    return [];
  }

  async getLessonLearning(userId: string, lessonId: string) {
    const lesson = await this.prisma.grammarLesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: {
          include: {
            category: true,
            lessons: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
              include: {
                progress: {
                  where: { userId },
                },
              },
            },
          },
        },
        questions: {
          orderBy: { order: 'asc' },
        },
        progress: {
          where: { userId },
        },
        notes: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    const allLessons = lesson.topic.lessons;
    const currentIndex = allLessons.findIndex((x) => x.id === lesson.id);

    const completedLessons = allLessons.filter(
      (item) => item.progress[0]?.completed,
    ).length;

    const totalLessons = allLessons.length;

    const progress =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    const content = lesson.content as any;

    return {
      id: lesson.id,
      title: `${lesson.topic.title} – Bài học ${lesson.order}`,
      subtitle: lesson.title,
      topic: {
        id: lesson.topic.id,
        title: lesson.topic.title,
        level: lesson.topic.level,
        category: {
          id: lesson.topic.category.id,
          title: lesson.topic.category.title,
        },
      },
      level: this.formatLevel(lesson.topic.level),
      duration: `${lesson.duration || 5} phút`,
      rewardXp: 20,
      rewardCoin: 10,
      currentIndex: currentIndex + 1,
      totalLessons,
      progress,
      completedLessons,
      completedExercises:
        lesson.questions.length > 0 && lesson.progress[0]?.completed
          ? lesson.questions.length
          : 0,
      totalExercises: lesson.questions.length,
      earnedXp: completedLessons * 20,
      completed: lesson.progress[0]?.completed || false,
      note: lesson.notes[0]?.note || '',
      content: {
        structure: content?.structure ? Object.values(content.structure) : [],
        notes: content?.commonMistakes || [],
        examples: content?.examples || [],
        tips: content?.tips || content?.commonMistakes || [],
        overview: content?.overview || '',
        summary: content?.summary || '',
      },
      lessons: allLessons.map((item, index) => {
        const itemProgress = item.progress[0];

        const previousCompleted =
          index === 0 ||
          allLessons.slice(0, index).every((x) => x.progress[0]?.completed);

        const locked = !previousCompleted;

        return {
          id: item.id,
          order: item.order,
          title: item.title,
          duration: `${item.duration || 5} phút`,
          type: 'Lý thuyết',
          completed: itemProgress?.completed || false,
          locked,
          status: itemProgress?.completed
            ? 'COMPLETED'
            : item.id === lesson.id
              ? 'IN_PROGRESS'
              : locked
                ? 'LOCKED'
                : 'NOT_STARTED',
        };
      }),
      attachments: [],
      prevLessonId: allLessons[currentIndex - 1]?.id || null,
      nextLessonId: allLessons[currentIndex + 1]?.id || null,
    };
  }

  async startLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.grammarLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    const progress = await this.prisma.grammarLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {},
      create: {
        userId,
        lessonId,
        completed: false,
        score: 0,
      },
    });

    return {
      message: 'Bắt đầu bài học thành công',
      progress,
    };
  }

  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.grammarLesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: {
          include: {
            lessons: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    const progress = await this.prisma.grammarLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        completed: true,
        score: 100,
        completedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        completed: true,
        score: 100,
        completedAt: new Date(),
      },
    });

    const lessons = lesson.topic.lessons;
    const currentIndex = lessons.findIndex((x) => x.id === lessonId);
    const nextLessonId = lessons[currentIndex + 1]?.id || null;

    return {
      message: 'Hoàn thành bài học',
      progress,
      nextLessonId,
    };
  }

  async saveLessonNote(userId: string, lessonId: string, note: string) {
    if (!note || note.length > 500) {
      throw new BadRequestException('Ghi chú không hợp lệ');
    }

    const lesson = await this.prisma.grammarLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    const saved = await this.prisma.grammarLessonNote.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        note,
      },
      create: {
        userId,
        lessonId,
        note,
      },
    });

    return {
      message: 'Đã lưu ghi chú',
      note: saved.note,
    };
  }

  private formatLevel(level: string | null) {
    if (!level) return 'Chưa xác định';

    const map: Record<string, string> = {
      A1: 'Cơ bản (A1)',
      A2: 'Sơ cấp (A2)',
      B1: 'Trung cấp (B1)',
      B2: 'Trung cao (B2)',
      C1: 'Cao cấp (C1)',
      C2: 'Thành thạo (C2)',
    };

    return map[level] || level;
  }
}
