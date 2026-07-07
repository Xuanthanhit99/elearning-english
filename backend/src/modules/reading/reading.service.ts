// src/modules/reading/reading.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { ReadingDifficulty, ReadingLevel } from '@prisma/client';
import { ReadingHomeResponse } from './dto/reading-home.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  getCategoryAchievements,
  getFeaturedVocabularyByCategory,
} from 'src/common/helpers/reading.hepler';

@Injectable()
export class ReadingService {
  constructor(private readonly prisma: PrismaService) {}

  async getReadingHome(userId: string): Promise<ReadingHomeResponse> {
    const progress = await this.getOrCreateProgress(userId);

    const totalArticles = await this.prisma.readingArticle.count({
      where: { isPublished: true },
    });

    const completedSessions = await this.prisma.readingSession.findMany({
      where: {
        userId,
        isCompleted: true,
      },
    });

    const learningSessions = await this.prisma.readingSession.findMany({
      where: {
        userId,
        isCompleted: false,
      },
    });

    const categories = await this.prisma.readingCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            articles: {
              where: { isPublished: true },
            },
          },
        },
      },
    });

    const featuredArticles = await this.prisma.readingArticle.findMany({
      where: { isPublished: true },
      orderBy: [{ createdAt: 'desc' }],
      take: 3,
      include: {
        category: true,
        sessions: {
          where: { userId },
          take: 1,
        },
      },
    });

    const suggestions = await this.prisma.readingArticle.findMany({
      where: { isPublished: true },
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      take: 3,
      include: {
        category: true,
      },
    });

    const completedArticleIds = new Set(
      completedSessions.map((item) => item.articleId),
    );

    const learningArticleIds = new Set(
      learningSessions
        .filter((item) => !completedArticleIds.has(item.articleId))
        .map((item) => item.articleId),
    );

    const completedCount = completedArticleIds.size;
    const learningCount = learningArticleIds.size;

    const notStartedCount = Math.max(
      totalArticles - completedCount - learningCount,
      0,
    );

    const totalReadingTime = completedSessions.reduce(
      (sum, item) => sum + (item.spentTime ?? 0),
      0,
    );

    const totalXp = completedSessions.reduce(
      (sum, item) => sum + (item.earnedXp ?? 0),
      0,
    );

    const averageAccuracy =
      completedSessions.length > 0
        ? Math.round(
            completedSessions.reduce(
              (sum, item) => sum + (item.accuracy ?? 0),
              0,
            ) / completedSessions.length,
          )
        : 0;

    const completedPercent =
      totalArticles > 0
        ? Math.round((completedCount / totalArticles) * 100)
        : 0;

    const nextLevelXp = this.getNextLevelXp(progress.currentLevel);

    return {
      stats: {
        completedArticles: completedCount,
        averageAccuracy,
        totalReadingTime,
        totalReadingTimeText: this.formatMinutes(totalReadingTime),
        totalXp,
        completedChangeText: '+ 5 bài tuần trước',
        accuracyChangeText: '+ 8% tuần trước',
        timeChangeText: '+ 35m tuần trước',
        xpChangeText: '+ 120 XP tuần trước',
      },

      categories: categories.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        icon: item.icon,
        color: item.color,
        articleCount: item._count.articles,
        difficultyText: this.getCategoryDifficultyText(item._count.articles),
      })),

      featuredArticles: featuredArticles.map((article) => {
        const session = article.sessions[0];

        return {
          id: article.id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          thumbnail: article.thumbnail,
          categoryName: article.category.name,
          categorySlug: article.category.slug,
          level: article.level,
          difficulty: article.difficulty,
          difficultyText: this.formatDifficulty(article.difficulty),
          readTime: article.readTime,
          readTimeText: `${article.readTime} phút đọc`,
          questionCount: article.questionCount,
          xpReward: article.xpReward,
          isStarted: !!session,
          isCompleted: session?.isCompleted ?? false,
        };
      }),

      progress: {
        percent: completedPercent,
        totalArticles,
        completedArticles: completedCount,
        learningArticles: learningCount,
        notStartedArticles: notStartedCount,
      },

      currentLevel: {
        level: progress.currentLevel,
        title: this.formatLevel(progress.currentLevel),
        currentXp: totalXp,
        nextLevelXp,
        percent: this.getLevelPercent(totalXp, nextLevelXp),
      },

      streak: {
        currentStreak: progress.currentStreak,
        week: this.buildWeekStreak(progress.lastStudyDate),
      },

      suggestions: suggestions.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        thumbnail: article.thumbnail,
        readTimeText: `${article.readTime} phút đọc`,
        difficultyText: this.formatDifficulty(article.difficulty),
        xpReward: article.xpReward,
      })),
    };
  }

  private async getOrCreateProgress(userId: string) {
    const existed = await this.prisma.userReadingProgress.findFirst({
      where: { userId },
    });

    if (existed) return existed;

    return this.prisma.userReadingProgress.create({
      data: {
        userId,
        currentLevel: ReadingLevel.A1,
        totalXp: 0,
        currentStreak: 0,
      },
    });
  }

  private formatMinutes(minutes: number) {
    if (!minutes || minutes <= 0) return '0m';

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;

    return `${h}h ${m}m`;
  }

  private formatDifficulty(difficulty: ReadingDifficulty) {
    const map: Record<ReadingDifficulty, string> = {
      EASY: 'Dễ',
      MEDIUM: 'Trung bình',
      HARD: 'Khó',
    };

    return map[difficulty];
  }

  private formatLevel(level: ReadingLevel) {
    const map: Record<ReadingLevel, string> = {
      A1: 'Sơ cấp A1',
      A2: 'Sơ cấp A2',
      B1: 'Trung cấp B1',
      B2: 'Trung cấp B2',
      C1: 'Cao cấp C1',
      C2: 'Thành thạo C2',
    };

    return map[level];
  }

  private getNextLevelXpCategories(level: ReadingLevel) {
    const map: Record<ReadingLevel, number> = {
      A1: 200,
      A2: 400,
      B1: 600,
      B2: 1000,
      C1: 1500,
      C2: 2500,
    };

    return map[level];
  }

  private getLevelPercent(currentXp: number, nextLevelXp: number) {
    if (nextLevelXp <= 0) return 0;

    return Math.min(Math.round((currentXp / nextLevelXp) * 100), 100);
  }

  private getCategoryDifficultyText(articleCount: number) {
    if (articleCount <= 12) return 'Dễ';
    if (articleCount <= 16) return 'Trung bình';

    return 'Khó';
  }

  private buildWeekStreak(lastStudyDate: Date | null) {
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    if (!lastStudyDate) {
      return labels.map((label) => ({
        label,
        completed: false,
      }));
    }

    const today = new Date();
    const last = new Date(lastStudyDate);
    const isSameWeek = this.isSameWeek(today, last);
    const lastIndex = this.getMondayBasedDayIndex(last);

    return labels.map((label, index) => ({
      label,
      completed: isSameWeek && index <= lastIndex,
    }));
  }

  private getMondayBasedDayIndex(date: Date) {
    const day = date.getDay();

    if (day === 0) return 6;

    return day - 1;
  }

  private isSameWeek(a: Date, b: Date) {
    const startA = this.getStartOfWeek(a);
    const startB = this.getStartOfWeek(b);

    return startA.getTime() === startB.getTime();
  }

  private getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);

    return d;
  }

  async getReadingCategories(
    userId: string,
    query: {
      difficulty?: ReadingDifficulty;
      sort?: 'recommended' | 'newest' | 'progress' | 'name';
    },
  ) {
    const progress = await this.getOrCreateProgressCategories(userId);

    const categories = await this.prisma.readingCategory.findMany({
      where: {
        isActive: true,
        articles: query.difficulty
          ? {
              some: {
                isPublished: true,
                difficulty: query.difficulty,
              },
            }
          : undefined,
      },
      include: {
        articles: {
          where: {
            isPublished: true,
            ...(query.difficulty ? { difficulty: query.difficulty } : {}),
          },
          select: {
            id: true,
            difficulty: true,
            sessions: {
              where: { userId },
              select: {
                isCompleted: true,
              },
            },
          },
        },
      },
      orderBy: this.getCategoryOrderBy(query.sort),
    });

    const totalArticles = await this.prisma.readingArticle.count({
      where: { isPublished: true },
    });

    const completedSessions = await this.prisma.readingSession.findMany({
      where: {
        userId,
        isCompleted: true,
      },
      select: {
        articleId: true,
      },
    });

    const learningSessions = await this.prisma.readingSession.findMany({
      where: {
        userId,
        isCompleted: false,
      },
      select: {
        articleId: true,
      },
    });

    const completedCount = completedSessions.length;
    const learningCount = learningSessions.length;
    const notStartedCount = Math.max(
      totalArticles - completedCount - learningCount,
      0,
    );

    const categoryItems = categories.map((category) => {
      const articleCount = category.articles.length;

      const completedArticleCount = category.articles.filter((article) =>
        article.sessions.some((session) => session.isCompleted),
      ).length;

      const progressPercent =
        articleCount > 0
          ? Math.round((completedArticleCount / articleCount) * 100)
          : 0;

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        thumbnail: category.thumbnail,
        icon: category.icon,
        color: category.color,
        articleCount,
        difficulty: this.getCategoryDifficulty(category.articles),
        difficultyText: this.getCategoryDifficultyTextCategories(
          category.articles,
        ),
        completedArticleCount,
        progressPercent,
      };
    });

    return {
      summary: {
        totalCategories: categoryItems.length,
        totalArticles,
      },

      categories: this.sortCategoryResult(categoryItems, query.sort),

      progress: {
        percent:
          totalArticles > 0
            ? Math.round((completedCount / totalArticles) * 100)
            : 0,
        totalArticles,
        completedArticles: completedCount,
        learningArticles: learningCount,
        notStartedArticles: notStartedCount,
      },

      currentLevel: {
        level: progress.currentLevel,
        title: this.formatLevelCategories(progress.currentLevel),
        currentXp: progress.totalXp,
        nextLevelXp: this.getNextLevelXpCategories(progress.currentLevel),
        percent: this.getLevelPercentCategories(
          progress.totalXp,
          this.getNextLevelXpCategories(progress.currentLevel),
        ),
      },

      streak: {
        currentStreak: progress.currentStreak,
        week: this.buildWeekStreakCategories(),
      },

      suggestedCategories: categoryItems
        .sort((a, b) => a.progressPercent - b.progressPercent)
        .slice(0, 2)
        .map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          thumbnail: item.thumbnail,
          reason:
            item.progressPercent <= 30
              ? 'Chủ đề bạn ít luyện tập'
              : 'Dựa trên bài đọc bạn đã hoàn thành',
        })),
    };
  }

  private getCategoryOrderBy(sort?: string) {
    if (sort === 'newest') return { createdAt: 'desc' as const };
    if (sort === 'name') return { name: 'asc' as const };
    return { order: 'asc' as const };
  }

  private sortCategoryResult<
    T extends { progressPercent: number; name: string },
  >(items: T[], sort?: string) {
    if (sort === 'progress') {
      return [...items].sort((a, b) => b.progressPercent - a.progressPercent);
    }

    if (sort === 'name') {
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }

  private getCategoryDifficulty(articles: { difficulty: ReadingDifficulty }[]) {
    const hard = articles.filter((x) => x.difficulty === 'HARD').length;
    const medium = articles.filter((x) => x.difficulty === 'MEDIUM').length;

    if (hard >= medium && hard > 0) return ReadingDifficulty.HARD;
    if (medium > 0) return ReadingDifficulty.MEDIUM;

    return ReadingDifficulty.EASY;
  }

  private getCategoryDifficultyTextCategories(
    articles: { difficulty: ReadingDifficulty }[],
  ) {
    const difficulty = this.getCategoryDifficulty(articles);

    const map: Record<ReadingDifficulty, string> = {
      EASY: 'Dễ',
      MEDIUM: 'Trung bình',
      HARD: 'Khó',
    };

    return map[difficulty];
  }

  private async getOrCreateProgressCategories(userId: string) {
    const existed = await this.prisma.userReadingProgress.findFirst({
      where: { userId },
    });

    if (existed) return existed;

    return this.prisma.userReadingProgress.create({
      data: {
        userId,
        currentLevel: ReadingLevel.A1,
      },
    });
  }

  private formatLevelCategories(level: ReadingLevel) {
    const map: Record<ReadingLevel, string> = {
      A1: 'Sơ cấp (A1)',
      A2: 'Sơ cấp (A2)',
      B1: 'Trung cấp (B1)',
      B2: 'Trung cấp (B2)',
      C1: 'Cao cấp (C1)',
      C2: 'Thành thạo (C2)',
    };

    return map[level];
  }

  private getNextLevelXp(level: ReadingLevel) {
    const map: Record<ReadingLevel, number> = {
      A1: 200,
      A2: 400,
      B1: 600,
      B2: 1000,
      C1: 1500,
      C2: 2000,
    };

    return map[level];
  }

  private getLevelPercentCategories(currentXp: number, nextLevelXp: number) {
    if (nextLevelXp <= 0) return 0;
    return Math.min(Math.round((currentXp / nextLevelXp) * 100), 100);
  }

  private buildWeekStreakCategories() {
    return ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label, index) => ({
      label,
      completed: index < 6,
    }));
  }

  async getReadingCategoryDetail(userId: string, slug: string) {
    const category = await this.prisma.readingCategory.findUnique({
      where: { slug },
      include: {
        articles: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            sessions: {
              where: { userId },
              take: 1,
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy chủ đề đọc hiểu');
    }

    const totalArticles = category.articles.length;

    const completedArticles = category.articles.filter((article) =>
      article.sessions.some((s) => s.isCompleted),
    ).length;

    const learningArticles = category.articles.filter((article) =>
      article.sessions.some((s) => !s.isCompleted),
    ).length;

    const notStartedArticles = Math.max(
      totalArticles - completedArticles - learningArticles,
      0,
    );

    const totalReadTime = category.articles.reduce(
      (sum, article) => sum + article.readTime,
      0,
    );

    const totalXp = category.articles.reduce(
      (sum, article) => sum + article.xpReward,
      0,
    );

    const articles = category.articles.map((article, index) => {
      const session = article.sessions[0];

      let status: 'completed' | 'learning' | 'new' = 'new';

      if (session?.isCompleted) {
        status = 'completed';
      } else if (session) {
        status = 'learning';
      }

      return {
        id: article.id,
        index: index + 1,
        title: article.title,
        slug: article.slug,
        description: article.description,
        thumbnail: article.thumbnail,
        difficulty: article.difficulty,
        difficultyText: this.formatDifficultyArticleDetail(article.difficulty),
        readTime: article.readTime,
        readTimeText: `~ ${article.readTime} phút`,
        wordCount: article.wordCount ?? 0,
        wordCountText: `${article.wordCount ?? 0} từ`,
        xpReward: article.xpReward,
        progressPercent: session?.isCompleted ? 100 : session ? 60 : 0,
        status,
        buttonText:
          status === 'completed'
            ? 'Ôn lại'
            : status === 'learning'
              ? 'Tiếp tục'
              : 'Bắt đầu',
      };
    });

    return {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        thumbnail: category.thumbnail ?? null,
        articleCount: totalArticles,
        difficulty: this.getCategoryDifficulty(category.articles),
        difficultyText: this.formatDifficulty(
          this.getCategoryDifficulty(category.articles),
        ),
        totalReadTime,
        totalReadTimeText: this.formatMinutes(totalReadTime),
        totalXp,
      },

      progress: {
        percent:
          totalArticles > 0
            ? Math.round((completedArticles / totalArticles) * 100)
            : 0,
        totalArticles,
        completedArticles,
        learningArticles,
        notStartedArticles,
      },

      articles,

      featuredVocabulary: await getFeaturedVocabularyByCategory(
        this.prisma,
        category.id,
      ),

      achievements: getCategoryAchievements(completedArticles, totalArticles),

      suggestions: articles
        .filter((item) => item.status !== 'completed')
        .slice(0, 1)
        .map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          thumbnail: item.thumbnail,
          difficultyText: item.difficultyText,
          readTimeText: item.readTimeText,
          wordCountText: item.wordCountText,
        })),
    };
  }

  async getReadingArticleDetail(userId: string, slug: string) {
    const article = await this.prisma.readingArticle.findUnique({
      where: { slug },
      include: {
        category: true,
        questions: {
          orderBy: { order: 'asc' },
        },
        sessions: {
          where: { userId },
          take: 1,
          include: {
            answers: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Không tìm thấy bài đọc');
    }

    const session = article.sessions[0];

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        description: article.description,
        thumbnail: article.thumbnail,
        content: article.content,
        categoryName: article.category.name,
        categorySlug: article.category.slug,
        difficulty: article.difficulty,
        difficultyText: this.formatDifficulty(article.difficulty),
        readTimeText: `${article.readTime} phút đọc`,
        wordCountText: `${article.wordCount ?? 0} từ`,
        xpReward: article.xpReward,
      },

      session: session
        ? {
            id: session.id,
            isCompleted: session.isCompleted,
            score: session.score,
            accuracy: session.accuracy,
            answeredCount: session.answers.length,
            totalQuestions: article.questions.length,
            progressPercent:
              article.questions.length > 0
                ? Math.round((session.answers.length / article.questions.length) * 100)
                : 0,
          }
        : null,

      questions: article.questions.map((q, index) => {
        const answer = session?.answers.find((a) => a.questionId === q.id);

        return {
          id: q.id,
          index: index + 1,
          question: q.question,
          options: q.options,
          selected: answer?.selected ?? null,
        };
      }),

      vocabulary: await this.getVocabularyByArticle(article.id),

      tip: {
        title: 'Mẹo nhỏ',
        content:
          'Đọc lướt toàn bài trước để nắm ý chính, sau đó trả lời câu hỏi sẽ giúp bạn hiểu sâu và nhớ lâu hơn.',
      },
    };
  }

  async startReadingArticle(userId: string, articleId: string) {
    const article = await this.prisma.readingArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Không tìm thấy bài đọc');
    }

    const session = await this.prisma.readingSession.upsert({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
      update: {},
      create: {
        userId,
        articleId,
      },
    });

    return {
      sessionId: session.id,
      articleId,
      startedAt: session.startedAt,
    };
  }

  async answerReadingQuestion(
    sessionId: string,
    body: {
      questionId: string;
      selected: string;
    },
  ) {
    const question = await this.prisma.readingQuestion.findUnique({
      where: { id: body.questionId },
    });

    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    const isCorrect = question.correctAnswer === body.selected;

    const answer = await this.prisma.readingAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: body.questionId,
        },
      },
      update: {
        selected: body.selected,
        isCorrect,
      },
      create: {
        sessionId,
        questionId: body.questionId,
        selected: body.selected,
        isCorrect,
      },
    });

    return {
      id: answer.id,
      questionId: answer.questionId,
      selected: answer.selected,
      isCorrect: answer.isCorrect,
    };
  }

  async submitReadingSession(sessionId: string) {
    const session = await this.prisma.readingSession.findUnique({
      where: { id: sessionId },
      include: {
        article: {
          include: {
            questions: true,
          },
        },
        answers: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên làm bài');
    }

    const totalQuestions = session.article.questions.length;
    const correctCount = session.answers.filter((a) => a.isCorrect).length;

    const accuracy =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const score = accuracy;
    const earnedXp = Math.round((session.article.xpReward * accuracy) / 100);

    const completed = await this.prisma.readingSession.update({
      where: { id: sessionId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        score,
        accuracy,
        earnedXp,
      },
    });

    return {
      sessionId: completed.id,
      score,
      accuracy,
      correctCount,
      totalQuestions,
      earnedXp,
      isCompleted: true,
    };
  }

  private async getVocabularyByArticle(articleId: string) {
    const words = await this.prisma.readingVocabulary.findMany({
      where: { articleId },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    return words.map((item) => ({
      id: item.id,
      word: item.word,
      partOfSpeech: item.partOfSpeech,
      meaning: item.meaning,
      audioUrl: item.audioUrl,
    }));
  }

  private formatDifficultyArticleDetail(difficulty: 'EASY' | 'MEDIUM' | 'HARD') {
    const map = {
      EASY: 'Dễ',
      MEDIUM: 'Trung bình',
      HARD: 'Khó',
    };

    return map[difficulty];
  }
}
