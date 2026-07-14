import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Prisma,
  SpeakingDifficulty,
  SpeakingLevel,
  SpeakingSessionStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SpeakingHomeResponse } from './dto/speaking-home.dto';
import { GetSpeakingTopicsDto } from './dto/get-speaking-topics.dto';
import { GetTopicLessonsDto } from './dto/get-topic-lessons.dto';
import { GetSpeakingCategoriesDto } from './dto/get-speaking-categories.dto';
import { SubmitSpeakingAnswerDto } from './dto/submit-speaking-answer.dto';
import { GetSpeakingHistoryDto } from './dto/get-speaking-history.dto';
import {
  EvaluateSpeakingDto,
  TranscribeSpeakingDto,
} from '../speaking-practice/dto/speaking-practice.dto';

@Injectable()
export class SpeakingService {
  private readonly model;

  constructor(private readonly prisma: PrismaService) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  async generateSpeakingQuestion(params: {
    topicTitle: string;
    lessonTitle: string;
    level: string;
  }) {
    const prompt = `
Bạn là AI tạo bài luyện nói tiếng Anh.

Hãy tạo 1 câu hỏi speaking cho user.

Topic: ${params.topicTitle}
Lesson: ${params.lessonTitle}
Level: ${params.level}

Chỉ trả về JSON hợp lệ, không markdown, không giải thích.
Format:
{
  "question": "string",
  "expectedText": "string",
  "tips": ["string"]
}
`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();

    return this.parseJson(text);
  }

  async evaluateSpeakingAnswer(params: {
    question: string;
    expectedText?: string | null;
    transcript: string;
    level: string;
  }) {
    const transcript = String(params.transcript || '').trim();
    const meaningfulWords = transcript
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    if (!transcript || meaningfulWords.length < 3) {
      return this.emptySpeakingEvaluation(
        !transcript
          ? 'No speech detected. Please speak into the microphone and try again.'
          : 'Your answer is too short to evaluate. Please speak at least one complete sentence.',
      );
    }

    const prompt = `
Bạn là AI chấm bài speaking tiếng Anh.

Question:
${params.question}

Expected answer:
${params.expectedText || 'Không có câu trả lời mẫu'}

User transcript:
${transcript}

Level: ${params.level}

Quy tắc bắt buộc:
- Chấm dựa trên User transcript, không được tự giả định người dùng đã nói đúng.
- Nếu User transcript rỗng, quá ngắn, hoặc không liên quan Expected answer, điểm phải rất thấp.
- Không bao giờ cho điểm cao khi transcript không đủ nội dung.
- Điểm phải nằm trong khoảng 0 đến 100.

Nếu User transcript rỗng hoặc dưới 3 từ có nghĩa, trả về đúng JSON này:
{
  "overallScore": 0,
  "pronunciation": 0,
  "fluency": 0,
  "grammar": 0,
  "vocabulary": 0,
  "confidence": 0,
  "correctedText": "",
  "feedback": "No speech detected.",
  "suggestions": ["Please speak clearly into the microphone."]
}

Hãy chấm điểm từ 0 đến 100.

Chỉ trả về JSON hợp lệ, không markdown, không giải thích.
Format:
{
  "overallScore": 0,
  "pronunciation": 0,
  "fluency": 0,
  "grammar": 0,
  "vocabulary": 0,
  "confidence": 0,
  "correctedText": "string",
  "feedback": "string",
  "suggestions": ["string"]
}
`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const parsed = this.parseJson(text);

    return this.normalizeEvaluation(parsed);
  }

  private parseJson(text: string) {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new InternalServerErrorException(
        'Gemini response is not valid JSON',
      );
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      throw new InternalServerErrorException(
        'Cannot parse Gemini JSON response',
      );
    }
  }

  private emptySpeakingEvaluation(feedback: string) {
    return {
      overallScore: 0,
      pronunciation: 0,
      fluency: 0,
      grammar: 0,
      vocabulary: 0,
      confidence: 0,
      correctedText: '',
      feedback,
      suggestions: ['Please speak clearly into the microphone.'],
    };
  }

  private normalizeScore(value: unknown) {
    const score = Number(value ?? 0);

    if (!Number.isFinite(score)) return 0;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private normalizeEvaluation(evaluation: any) {
    return {
      overallScore: this.normalizeScore(evaluation?.overallScore),
      pronunciation: this.normalizeScore(evaluation?.pronunciation),
      fluency: this.normalizeScore(evaluation?.fluency),
      grammar: this.normalizeScore(evaluation?.grammar),
      vocabulary: this.normalizeScore(evaluation?.vocabulary),
      confidence: this.normalizeScore(evaluation?.confidence),
      correctedText: String(evaluation?.correctedText ?? ''),
      feedback: String(evaluation?.feedback ?? ''),
      suggestions: Array.isArray(evaluation?.suggestions)
        ? evaluation.suggestions.map((item: unknown) => String(item))
        : [],
    };
  }

  private normalizeTextForCompare(value: string) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getMeaningfulWordCount(value: string) {
    return this.normalizeTextForCompare(value)
      .split(' ')
      .map((word) => word.trim())
      .filter(Boolean).length;
  }

  private shouldRejectPracticeTranscript(params: {
    transcript: string;
    expectedText: string;
    audioUrl?: string | null;
  }) {
    const transcript = String(params.transcript || '').trim();

    if (!transcript) {
      return 'No speech detected. Please speak into the microphone and try again.';
    }

    if (this.getMeaningfulWordCount(transcript) < 3) {
      return 'Your answer is too short to evaluate. Please speak at least one complete sentence.';
    }

    // Chặn lỗi phổ biến: frontend hoặc API transcribe gửi nguyên passage/expectedText làm transcript mock.
    // Nếu chưa có audioUrl thật mà transcript giống hệt expectedText thì coi là dữ liệu giả.
    const normalizedTranscript = this.normalizeTextForCompare(transcript);
    const normalizedExpected = this.normalizeTextForCompare(
      params.expectedText,
    );

    if (
      normalizedExpected &&
      normalizedTranscript === normalizedExpected &&
      !params.audioUrl
    ) {
      return 'No valid recording was detected. Please record your voice before submitting.';
    }

    return null;
  }

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

    const [completedCount, inProgressCount, totalLessonCount, recentSessions] =
      await Promise.all([
        this.prisma.speakingSession.count({
          where: {
            userId,
            status: SpeakingSessionStatus.COMPLETED,
          },
        }),
        this.prisma.speakingSession.count({
          where: {
            userId,
            status: SpeakingSessionStatus.IN_PROGRESS,
          },
        }),
        this.prisma.speakingLesson.count({
          where: {
            isActive: true,
          },
        }),
        this.prisma.speakingSession.findMany({
          where: {
            userId,
            status: SpeakingSessionStatus.COMPLETED,
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
        }),
      ]);

    const notStarted = Math.max(
      totalLessonCount - completedCount - inProgressCount,
      0,
    );

    const percent =
      totalLessonCount > 0
        ? Math.round((completedCount / totalLessonCount) * 100)
        : 0;

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
        percent,
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

  async getTopics(userId: string, query: GetSpeakingTopicsDto) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.max(Number(query.limit || 10), 1);
    const skip = (page - 1) * limit;

    const where: Prisma.SpeakingTopicWhereInput = {
      isActive: true,
    };

    const andFilters: Prisma.SpeakingTopicWhereInput[] = [];

    if (query.search) {
      andFilters.push({
        OR: [
          {
            title: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (query.category && query.category !== 'all') {
      andFilters.push({
        category: {
          slug: query.category,
        },
      });
    }

    if (query.level && query.level !== 'all') {
      const level = query.level as SpeakingLevel;

      andFilters.push({
        OR: [{ minLevel: level }, { maxLevel: level }],
      });
    }

    if (query.difficulty && query.difficulty !== 'all') {
      andFilters.push({
        difficulty: query.difficulty as SpeakingDifficulty,
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const orderBy = this.buildTopicOrderBy(query.sort);

    const [topics, total, categories, totalCompleted, totalInProgress] =
      await Promise.all([
        this.prisma.speakingTopic.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            category: true,
            _count: {
              select: {
                lessons: true,
              },
            },
          },
        }),

        this.prisma.speakingTopic.count({
          where,
        }),

        this.prisma.speakingCategory.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            order: 'asc',
          },
          include: {
            _count: {
              select: {
                topics: true,
              },
            },
          },
        }),

        this.prisma.speakingSession.count({
          where: {
            userId,
            status: SpeakingSessionStatus.COMPLETED,
          },
        }),

        this.prisma.speakingSession.count({
          where: {
            userId,
            status: SpeakingSessionStatus.IN_PROGRESS,
          },
        }),
      ]);

    const totalTopics = await this.prisma.speakingTopic.count({
      where: {
        isActive: true,
      },
    });

    const notStarted = Math.max(
      totalTopics - totalCompleted - totalInProgress,
      0,
    );

    const overallPercent =
      totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

    return {
      topics: topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        imageUrl: topic.imageUrl,
        minLevel: topic.minLevel,
        maxLevel: topic.maxLevel,
        levelRange: `${topic.minLevel}-${topic.maxLevel}`,
        levelText: this.getLevelText(topic.minLevel, topic.maxLevel),
        difficulty: topic.difficulty,
        lessonCount: topic.lessonCount || topic._count.lessons,
        progressPercent: topic.progressPercent,
        category: {
          id: topic.category.id,
          title: topic.category.title,
          slug: topic.category.slug,
          icon: topic.category.icon,
        },
      })),

      filters: {
        categories: [
          {
            title: 'All Topics',
            slug: 'all',
            icon: '📚',
            count: totalTopics,
          },
          ...categories.map((item) => ({
            title: item.title,
            slug: item.slug,
            icon: item.icon || '🎙️',
            count: item._count.topics,
          })),
        ],

        levels: [
          { label: 'All Levels', value: 'all' },
          { label: 'A1', value: 'A1' },
          { label: 'A2', value: 'A2' },
          { label: 'B1', value: 'B1' },
          { label: 'B2', value: 'B2' },
          { label: 'C1', value: 'C1' },
          { label: 'C2', value: 'C2' },
        ],

        difficulties: [
          { label: 'All Difficulty', value: 'all' },
          { label: 'Beginner', value: 'BEGINNER' },
          { label: 'Pre-intermediate', value: 'PRE_INTERMEDIATE' },
          { label: 'Intermediate', value: 'INTERMEDIATE' },
          { label: 'Advanced', value: 'ADVANCED' },
        ],
      },

      progress: {
        overallPercent,
        completed: totalCompleted,
        inProgress: totalInProgress,
        notStarted,
      },

      difficultyGuide: [
        { title: 'Beginner', range: 'A1 - A2', color: 'green' },
        { title: 'Pre-intermediate', range: 'A2 - B1', color: 'blue' },
        { title: 'Intermediate', range: 'B1 - B2', color: 'yellow' },
        { title: 'Advanced', range: 'C1 - C2', color: 'purple' },
      ],

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildTopicOrderBy(
    sort?: string,
  ): Prisma.SpeakingTopicOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return [{ createdAt: 'asc' }];
      case 'progress':
        return [{ progressPercent: 'desc' }];
      case 'lessons':
        return [{ lessonCount: 'desc' }];
      case 'popular':
        return [{ progressPercent: 'desc' }, { lessonCount: 'desc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }];
    }
  }

  async getTopicDetail(slug: string, userId: string) {
    const topic = await this.prisma.speakingTopic.findUnique({
      where: { slug },
      include: {
        category: true,
        lessons: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Không tìm thấy speaking topic');
    }

    const lessonIds = topic.lessons.map((x) => x.id);

    const progresses = await this.prisma.speakingLessonProgress.findMany({
      where: {
        userId,
        lessonId: {
          in: lessonIds,
        },
      },
    });

    const sessions = await this.prisma.speakingSession.findMany({
      where: {
        userId,
        lessonId: {
          in: lessonIds,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const completedLessonIds = new Set(
      progresses.filter((x) => x.completed).map((x) => x.lessonId),
    );

    const inProgressLessonIds = new Set(
      sessions
        .filter((x) => x.status === SpeakingSessionStatus.IN_PROGRESS)
        .map((x) => x.lessonId),
    );

    const completed = completedLessonIds.size;
    const inProgress = [...inProgressLessonIds].filter(
      (lessonId) => !completedLessonIds.has(lessonId as string),
    ).length;
    const notStarted = Math.max(
      topic.lessons.length - completed - inProgress,
      0,
    );

    const progressPercent =
      topic.lessons.length > 0
        ? Math.round((completed / topic.lessons.length) * 100)
        : 0;

    const relatedTopics = await this.prisma.speakingTopic.findMany({
      where: {
        isActive: true,
        id: {
          not: topic.id,
        },
      },
      orderBy: {
        order: 'asc',
      },
      take: 4,
      include: {
        category: true,
      },
    });

    return {
      topic: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        imageUrl: topic.imageUrl,
        minLevel: topic.minLevel,
        maxLevel: topic.maxLevel,
        levelRange: `${topic.minLevel}-${topic.maxLevel}`,
        levelText: this.getLevelText(topic.minLevel, topic.maxLevel),
        lessonCount: topic.lessons.length,
        progressPercent,
        category: {
          id: topic.category.id,
          title: topic.category.title,
          slug: topic.category.slug,
          icon: topic.category.icon,
        },
      },

      progress: {
        percent: progressPercent,
        completed,
        inProgress,
        notStarted,
      },

      improveSkills: [
        { title: 'Fluency', description: 'Speak more smoothly', icon: '🧩' },
        { title: 'Vocabulary', description: 'Learn useful words', icon: '🎁' },
        {
          title: 'Confidence',
          description: 'Speak with confidence',
          icon: '💜',
        },
      ],

      relatedTopics: relatedTopics.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        icon: item.category.icon || '🎙️',
        lessonCount: item.lessonCount,
      })),

      practiceTip: {
        title: 'Practice Tip 💡',
        description:
          'Speak at least once a day to build confidence and fluency!',
      },
    };
  }

  async getTopicLessons(
    slug: string,
    userId: string,
    query: GetTopicLessonsDto,
  ) {
    const topic = await this.prisma.speakingTopic.findUnique({
      where: { slug },
    });

    if (!topic) {
      throw new NotFoundException('Không tìm thấy speaking topic');
    }

    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.max(Number(query.limit || 8), 1);
    const skip = (page - 1) * limit;

    const orderBy = this.buildLessonOrderBy(query.sort);

    const [lessons, total] = await Promise.all([
      this.prisma.speakingLesson.findMany({
        where: {
          topicId: topic.id,
          isActive: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.speakingLesson.count({
        where: {
          topicId: topic.id,
          isActive: true,
        },
      }),
    ]);

    const [sessions, progresses] = await Promise.all([
      this.prisma.speakingSession.findMany({
        where: {
          userId,
          lessonId: {
            in: lessons.map((x) => x.id),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.speakingLessonProgress.findMany({
        where: {
          userId,
          lessonId: {
            in: lessons.map((x) => x.id),
          },
        },
      }),
    ]);

    return {
      lessons: lessons.map((lesson, index) => {
        const progress = progresses.find((x) => x.lessonId === lesson.id);
        const latestSession = sessions.find((x) => x.lessonId === lesson.id);

        let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED' =
          'NOT_STARTED';

        if (lesson.isLocked) {
          status = 'LOCKED';
        } else if (progress?.completed) {
          status = 'COMPLETED';
        } else if (
          latestSession?.status === SpeakingSessionStatus.IN_PROGRESS
        ) {
          status = 'IN_PROGRESS';
        }

        return {
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          icon: lesson.icon || '🎙️',
          level: lesson.level,
          estimatedMinutes: lesson.estimatedMinutes,
          order: skip + index + 1,
          status,
          sessionId: latestSession?.id || null,
          bestScore: progress?.bestScore || 0,
          lastScore: progress?.lastScore || 0,
          attempts: progress?.attempts || 0,
        };
      }),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async generateQuestion(userId: string, sessionId: string) {
    const session = await this.prisma.speakingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        lesson: true,
        topic: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy session');
    }

    const question = await this.generateSpeakingQuestion({
      topicTitle: session
        ? session.topic
          ? (session.topic.title as string)
          : ''
        : '',
      lessonTitle: session
        ? session.lesson
          ? (session.lesson.title as string)
          : ''
        : '',
      level: session
        ? session.lesson
          ? (session.lesson.level as string)
          : ''
        : '',
    });

    return {
      question: question.question,
      expectedText: question.expectedText,
      tips: question.tips || [],
    };
  }

  async startLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.speakingLesson.findUnique({
      where: { id: lessonId },
      include: { topic: true },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy lesson');
    }

    if (lesson.isLocked) {
      throw new BadRequestException('Lesson đang bị khóa');
    }

    const oldInProgress = await this.prisma.speakingSession.findFirst({
      where: {
        userId,
        lessonId: lesson.id,
        status: SpeakingSessionStatus.IN_PROGRESS,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (oldInProgress) {
      return {
        sessionId: oldInProgress.id,
        redirectUrl: `/speaking/practice/${oldInProgress.id}`,
      };
    }

    const session = await this.prisma.speakingSession.create({
      data: {
        userId,
        lessonId: lesson.id,
        topicId: lesson.topicId,
        status: SpeakingSessionStatus.IN_PROGRESS,
      },
    });

    return {
      sessionId: session.id,
      redirectUrl: `/speaking/practice/${session.id}`,
    };
  }

  private buildLessonOrderBy(
    sort?: string,
  ): Prisma.SpeakingLessonOrderByWithRelationInput[] {
    switch (sort) {
      case 'newest':
        return [{ createdAt: 'desc' }];
      case 'oldest':
        return [{ createdAt: 'asc' }];
      case 'level':
        return [{ level: 'asc' }, { order: 'asc' }];
      case 'default':
      default:
        return [{ order: 'asc' }];
    }
  }

  private getLevelText(min: string, max: string) {
    if (min === 'A1' && max === 'B1') return 'Beginner - Intermediate';
    if (min === 'A2' && max === 'B2') {
      return 'Pre-intermediate - Upper-Intermediate';
    }
    if (min === 'A2' && max === 'C1') return 'Pre-intermediate - Advanced';

    return `${min} - ${max}`;
  }

  async getCategories(userId: string, query: GetSpeakingCategoriesDto) {
    const topicWhere: Prisma.SpeakingTopicWhereInput = {
      isActive: true,
    };

    if (query.level && query.level !== 'all') {
      const level = query.level as SpeakingLevel;
      topicWhere.OR = [{ minLevel: level }, { maxLevel: level }];
    }

    const categories = await this.prisma.speakingCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        topics: {
          where: topicWhere,
          orderBy: {
            order: 'asc',
          },
          include: {
            lessons: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const lessonIds = categories.flatMap((category) =>
      category.topics.flatMap((topic) =>
        topic.lessons.map((lesson) => lesson.id),
      ),
    );

    const [completedProgress, inProgressSessions] = await Promise.all([
      this.prisma.speakingLessonProgress.findMany({
        where: {
          userId,
          lessonId: {
            in: lessonIds,
          },
          completed: true,
        },
      }),
      this.prisma.speakingSession.findMany({
        where: {
          userId,
          lessonId: {
            in: lessonIds,
          },
          status: SpeakingSessionStatus.IN_PROGRESS,
        },
      }),
    ]);

    const completedLessonIds = new Set(
      completedProgress.map((x) => x.lessonId),
    );
    const inProgressLessonIds = new Set(
      inProgressSessions
        .filter((x) => !completedLessonIds.has(x.lessonId as string))
        .map((x) => x.lessonId),
    );

    const completed = completedLessonIds.size;
    const inProgress = inProgressLessonIds.size;
    const notStarted = Math.max(lessonIds.length - completed - inProgress, 0);
    const overallPercent =
      lessonIds.length > 0
        ? Math.round((completed / lessonIds.length) * 100)
        : 0;

    return {
      filters: [
        { label: 'All Categories', value: 'all' },
        { label: 'A1 - Beginner', value: 'A1' },
        { label: 'A2 - Elementary', value: 'A2' },
        { label: 'B1 - Intermediate', value: 'B1' },
        { label: 'B2 - Upper-Intermediate', value: 'B2' },
        { label: 'C1 - Advanced', value: 'C1' },
      ],

      categories: categories.map((category) => {
        const topics = category.topics;
        const topic = topics[0];
        const categoryLessonIds = topics.flatMap((x) =>
          x.lessons.map((lesson) => lesson.id),
        );
        const categoryCompleted = categoryLessonIds.filter((lessonId) =>
          completedLessonIds.has(lessonId),
        ).length;
        const progressPercent =
          categoryLessonIds.length > 0
            ? Math.round((categoryCompleted / categoryLessonIds.length) * 100)
            : topic?.progressPercent || 0;

        return {
          id: category.id,
          title: category.title,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          imageUrl: category.imageUrl || topic?.imageUrl || null,
          lessonCount:
            categoryLessonIds.length ||
            topics.reduce((sum, item) => sum + (item.lessonCount || 0), 0),
          levelRange: topic ? `${topic.minLevel}-${topic.maxLevel}` : 'A1-B1',
          progressPercent,
        };
      }),

      progress: {
        overallPercent,
        completed,
        inProgress,
        notStarted,
      },

      topSkills: [
        { title: 'Fluency', description: 'Practice more speaking', icon: '🧩' },
        {
          title: 'Pronunciation',
          description: 'Focus on pronunciation',
          icon: '🎙️',
        },
        { title: 'Confidence', description: 'Build confidence', icon: '💜' },
      ],

      dailyGoal: {
        currentMinutes: 10,
        targetMinutes: 15,
        percent: 67,
        description: 'Practice speaking for at least 15 minutes every day.',
      },
    };
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    dto: SubmitSpeakingAnswerDto,
  ) {
    const session = await this.prisma.speakingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        lesson: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy session');
    }

    const transcript = String(dto.transcript || '').trim();

    const invalidReason = this.shouldRejectPracticeTranscript({
      transcript,
      expectedText: dto.expectedText || '',
      audioUrl: dto.audioUrl,
    });

    const evaluation = invalidReason
      ? this.emptySpeakingEvaluation(invalidReason)
      : await this.evaluateSpeakingAnswer({
          question: dto.question,
          expectedText: dto.expectedText,
          transcript,
          level:
            session && session.lesson ? (session.lesson.level as string) : '',
        });

    const normalizedEvaluation = this.normalizeEvaluation(evaluation);

    const answer = await this.prisma.speakingAnswer.create({
      data: {
        sessionId,
        question: dto.question,
        expectedText: dto.expectedText,
        transcript,
        audioUrl: dto.audioUrl,
        overallScore: normalizedEvaluation.overallScore,
        pronunciation: normalizedEvaluation.pronunciation,
        fluency: normalizedEvaluation.fluency,
        grammar: normalizedEvaluation.grammar,
        vocabulary: normalizedEvaluation.vocabulary,
        confidence: normalizedEvaluation.confidence,
        correctedText: normalizedEvaluation.correctedText,
        feedback: normalizedEvaluation.feedback,
        suggestions: normalizedEvaluation.suggestions,
      },
    });

    return {
      answerId: answer.id,
      evaluation: normalizedEvaluation,
    };
  }

  async finishSession(userId: string, sessionId: string) {
    const session = await this.prisma.speakingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        answers: true,
        lesson: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy session');
    }

    if (!session.lessonId) {
      throw new BadRequestException('Session không có lessonId');
    }

    const answers = session.answers;
    const avg = (
      key:
        | 'overallScore'
        | 'pronunciation'
        | 'fluency'
        | 'grammar'
        | 'vocabulary'
        | 'confidence',
    ) => {
      if (!answers.length) return 0;
      return Math.round(
        answers.reduce((sum, item) => sum + Number(item[key] || 0), 0) /
          answers.length,
      );
    };

    const overallScore = avg('overallScore');
    const pronunciation = avg('pronunciation');
    const fluency = avg('fluency');
    const grammar = avg('grammar');
    const vocabulary = avg('vocabulary');
    const confidence = avg('confidence');

    const oldProgress = await this.prisma.speakingLessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId: session.lessonId,
        },
      },
    });

    const updatedSession = await this.prisma.speakingSession.update({
      where: { id: sessionId },
      data: {
        status: SpeakingSessionStatus.COMPLETED,
        overallScore,
        pronunciation,
        fluency,
        grammar,
        vocabulary,
        confidence,
        finishedAt: new Date(),
      },
    });

    await this.prisma.speakingLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId: session.lessonId,
        },
      },
      update: {
        completed: true,
        attempts: {
          increment: 1,
        },
        lastScore: overallScore,
        bestScore: Math.max(oldProgress?.bestScore || 0, overallScore),
        completedAt: new Date(),
      },
      create: {
        userId,
        lessonId: session.lessonId,
        completed: true,
        attempts: 1,
        lastScore: overallScore,
        bestScore: overallScore,
        completedAt: new Date(),
      },
    });

    return updatedSession;
  }

  async getCategoryDetail(slug: string, userId: string) {
    const category = await this.prisma.speakingCategory.findUnique({
      where: { slug },
      include: {
        topics: {
          where: { isActive: true },
          include: {
            lessons: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy speaking category');
    }

    const lessons = category.topics.flatMap((topic) => topic.lessons);
    const lessonIds = lessons.map((lesson) => lesson.id);

    const sessions = await this.prisma.speakingSession.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completed = sessions.filter(
      (item) => item.status === SpeakingSessionStatus.COMPLETED,
    ).length;

    const inProgress = sessions.filter(
      (item) => item.status === SpeakingSessionStatus.IN_PROGRESS,
    ).length;

    const notStarted = Math.max(lessons.length - completed - inProgress, 0);

    const percent =
      lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;

    const mainTopic = category.topics[0];

    const relatedCategories = await this.prisma.speakingCategory.findMany({
      where: {
        isActive: true,
        id: { not: category.id },
      },
      orderBy: { order: 'asc' },
      take: 4,
      include: {
        topics: true,
      },
    });

    return {
      category: {
        id: category.id,
        title: category.title,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        imageUrl: category.imageUrl || mainTopic?.imageUrl || null,
        levelRange: mainTopic
          ? `${mainTopic.minLevel}-${mainTopic.maxLevel}`
          : 'A1-B1',
        levelText: mainTopic
          ? this.getLevelText(mainTopic.minLevel, mainTopic.maxLevel)
          : 'Beginner - Intermediate',
        lessonCount: lessons.length,
        progressPercent: percent,
        estimatedMinutesText: '4 - 6 min per lesson',
      },

      progress: {
        percent,
        completed,
        inProgress,
        notStarted,
      },

      improveSkills: [
        {
          title: 'Fluency',
          description: 'Speak more naturally',
          icon: '🧩',
        },
        {
          title: 'Pronunciation',
          description: 'Improve your pronunciation',
          icon: '🎙️',
        },
        {
          title: 'Confidence',
          description: 'Speak with confidence',
          icon: '💜',
        },
      ],

      relatedCategories: relatedCategories.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        icon: item.icon || '🎙️',
        lessonCount: item.topics.reduce(
          (sum, topic) => sum + (topic.lessonCount || 0),
          0,
        ),
      })),
    };
  }

  async getCategoryLessons(
    slug: string,
    userId: string,
    query: GetTopicLessonsDto,
  ) {
    const category = await this.prisma.speakingCategory.findUnique({
      where: { slug },
      include: {
        topics: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy speaking category');
    }

    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.max(Number(query.limit || 8), 1);
    const skip = (page - 1) * limit;

    const topicIds = category.topics.map((topic) => topic.id);

    const [lessons, total] = await Promise.all([
      this.prisma.speakingLesson.findMany({
        where: {
          topicId: { in: topicIds },
          isActive: true,
        },
        orderBy: this.buildLessonOrderBy(query.sort),
        skip,
        take: limit,
      }),

      this.prisma.speakingLesson.count({
        where: {
          topicId: { in: topicIds },
          isActive: true,
        },
      }),
    ]);

    const sessions = await this.prisma.speakingSession.findMany({
      where: {
        userId,
        lessonId: {
          in: lessons.map((lesson) => lesson.id),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      lessons: lessons.map((lesson, index) => {
        const latestSession = sessions.find(
          (session) => session.lessonId === lesson.id,
        );

        let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED' =
          'NOT_STARTED';

        if (lesson.isLocked) {
          status = 'LOCKED';
        } else if (latestSession?.status === SpeakingSessionStatus.COMPLETED) {
          status = 'COMPLETED';
        } else if (
          latestSession?.status === SpeakingSessionStatus.IN_PROGRESS
        ) {
          status = 'IN_PROGRESS';
        }

        return {
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          icon: lesson.icon || '🎙️',
          level: lesson.level,
          estimatedMinutes: lesson.estimatedMinutes,
          order: skip + index + 1,
          status,
          sessionId: latestSession?.id || null,
        };
      }),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getHistory(userId: string, query: GetSpeakingHistoryDto) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.max(Number(query.limit || 8), 1);
    const skip = (page - 1) * limit;

    const where: Prisma.SpeakingSessionWhereInput = {
      userId,
      status: SpeakingSessionStatus.COMPLETED,
    };

    if (query.type && query.type !== 'all') {
      where.lesson = {
        type: query.type as any,
      };
    }

    if (query.category && query.category !== 'all') {
      where.topic = {
        category: {
          slug: query.category,
        },
      };
    }

    if (query.from || query.to) {
      where.finishedAt = {};

      if (query.from) {
        where.finishedAt.gte = new Date(query.from);
      }

      if (query.to) {
        const toDate = new Date(query.to);
        toDate.setHours(23, 59, 59, 999);
        where.finishedAt.lte = toDate;
      }
    }

    const [
      sessions,
      total,
      categories,
      completed,
      inProgress,
      monthlySessions,
    ] = await Promise.all([
      this.prisma.speakingSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          finishedAt: 'desc',
        },
        include: {
          topic: {
            include: {
              category: true,
            },
          },
          lesson: true,
        },
      }),

      this.prisma.speakingSession.count({ where }),

      this.prisma.speakingCategory.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      }),

      this.prisma.speakingSession.count({
        where: {
          userId,
          status: SpeakingSessionStatus.COMPLETED,
        },
      }),

      this.prisma.speakingSession.count({
        where: {
          userId,
          status: SpeakingSessionStatus.IN_PROGRESS,
        },
      }),

      this.prisma.speakingSession.findMany({
        where: {
          userId,
          status: SpeakingSessionStatus.COMPLETED,
          finishedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    const totalLessons = await this.prisma.speakingLesson.count({
      where: { isActive: true },
    });

    const notStarted = Math.max(totalLessons - completed - inProgress, 0);

    const overallProgress =
      totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

    const avgScore =
      monthlySessions.length > 0
        ? Math.round(
            monthlySessions.reduce((sum, item) => sum + item.overallScore, 0) /
              monthlySessions.length,
          )
        : 0;

    const avgDuration =
      monthlySessions.length > 0
        ? Math.round(
            monthlySessions.reduce(
              (sum, item) => sum + (item.duration || 0),
              0,
            ) / monthlySessions.length,
          )
        : 0;

    const recentActivity = sessions.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.topic?.title || item.lesson?.title || 'Speaking Practice',
      type: this.formatPracticeType(item.lesson?.type || 'FREE_TALK'),
      score: item.overallScore,
      level: this.getScoreLabel(item.overallScore),
      date: item.finishedAt || item.createdAt,
      icon: item.topic?.category?.icon || '🎙️',
    }));

    return {
      histories: sessions.map((item) => ({
        id: item.id,
        topicTitle:
          item.topic?.title || item.lesson?.title || 'Speaking Practice',
        type: this.formatPracticeType(item.lesson?.type || 'FREE_TALK'),
        rawType: item.lesson?.type || 'FREE_TALK',
        icon: item.topic?.category?.icon || '🎙️',
        score: item.overallScore,
        scoreLabel: this.getScoreLabel(item.overallScore),
        fluency: item.fluency,
        fluencyLabel: this.getScoreLabel(item.fluency),
        accuracy: Math.round((item.pronunciation + item.grammar) / 2),
        accuracyLabel: this.getScoreLabel(
          Math.round((item.pronunciation + item.grammar) / 2),
        ),
        completedAt: item.finishedAt || item.createdAt,
      })),

      filters: {
        types: [
          { label: 'All', value: 'all' },
          { label: 'Read Aloud', value: 'READ_ALOUD' },
          { label: 'Repeat After Me', value: 'REPEAT_AFTER_ME' },
          { label: 'Answer Questions', value: 'ANSWER_QUESTIONS' },
          { label: 'Free Talk', value: 'FREE_TALK' },
        ],
        categories: [
          { label: 'All Categories', value: 'all' },
          ...categories.map((item) => ({
            label: item.title,
            value: item.slug,
          })),
        ],
      },

      progress: {
        overallPercent: overallProgress,
        completed,
        inProgress,
        notStarted,
      },

      summary: {
        sessions: monthlySessions.length,
        avgScore,
        avgDurationText: this.formatDuration(avgDuration),
        improvementPercent: 12,
      },

      recentActivity,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private getScoreLabel(score: number) {
    if (score >= 90) return 'Excellent';
    if (score >= 85) return 'Very Good';
    if (score >= 70) return 'Good';
    return 'Average';
  }

  private formatPracticeType(type: string) {
    return type
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainSeconds = seconds % 60;
    return `${minutes}m ${remainSeconds}s`;
  }

  async getHistoryDetail(userId: string, sessionId: string) {
    const session = await this.prisma.speakingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        topic: {
          include: {
            category: true,
          },
        },
        lesson: true,
        answers: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy lịch sử luyện nói');
    }

    const firstAnswer = session.answers[0];

    const pronunciation = session.pronunciation || 0;
    const fluency = session.fluency || 0;
    const vocabulary = session.vocabulary || 0;
    const grammar = session.grammar || 0;
    const overallScore = session.overallScore || 0;
    const content = Math.round((vocabulary + grammar + fluency) / 3);

    const previousSessions = await this.prisma.speakingSession.findMany({
      where: {
        userId,
        status: SpeakingSessionStatus.COMPLETED,
        finishedAt: {
          lte: session.finishedAt || session.createdAt,
        },
      },
      orderBy: {
        finishedAt: 'asc',
      },
      take: 7,
    });

    return {
      session: {
        id: session.id,
        topicTitle: session.topic?.title || 'Speaking Practice',
        lessonTitle: session.lesson?.title || '',
        practiceType: this.formatPracticeType(
          session.lesson?.type || 'FREE_TALK',
        ),
        rawType: session.lesson?.type || 'FREE_TALK',
        icon: session.topic?.category?.icon || '🎙️',
        completedAt: session.finishedAt || session.createdAt,
        durationText: this.formatDuration(session.duration || 0),
        status: session.status,
      },

      scores: {
        overallScore,
        fluency,
        pronunciation,
        vocabulary,
        grammar,
        content,
        labels: {
          overallScore: this.getScoreLabel(overallScore),
          fluency: this.getScoreLabel(fluency),
          pronunciation: this.getScoreLabel(pronunciation),
          vocabulary: this.getScoreLabel(vocabulary),
          grammar: this.getScoreLabel(grammar),
          content: this.getScoreLabel(content),
        },
      },

      answer: {
        question: firstAnswer?.question || '',
        expectedText: firstAnswer?.expectedText || '',
        transcript: firstAnswer?.transcript || '',
        audioUrl: firstAnswer?.audioUrl || null,
        correctedText: firstAnswer?.correctedText || '',
      },

      aiFeedback: {
        feedback:
          firstAnswer?.feedback ||
          'Great job! You spoke clearly and organized your ideas well.',
        strengths: [
          'Spoke fluently with natural pauses',
          'Used a good range of vocabulary',
          'Organized ideas in a clear structure',
          'Confident tone and good pace',
        ],
        areasToImprove: Array.isArray(firstAnswer?.suggestions)
          ? (firstAnswer.suggestions as string[])
          : [
              'Work on pronouncing ending sounds',
              'Use more linking words',
              'Try to use more complex grammar',
              'Expand your answers with more details',
            ],
        details: [
          {
            key: 'pronunciation',
            title: 'Pronunciation',
            icon: '🎙️',
            comment:
              'Some words were mispronounced. Pay attention to the endings.',
          },
          {
            key: 'grammar',
            title: 'Grammar',
            icon: 'Aa',
            comment:
              'Good use of basic grammar. Try more complex sentence structures.',
          },
          {
            key: 'vocabulary',
            title: 'Vocabulary',
            icon: '📖',
            comment:
              'Nice variety. You can learn more advanced words for this topic.',
          },
          {
            key: 'fluency',
            title: 'Fluency',
            icon: '🔊',
            comment: 'You spoke smoothly with few hesitations. Keep it up!',
          },
        ],
      },

      summary: {
        topic: `${session.topic?.title || ''} - ${session.lesson?.title || ''}`,
        practiceType: this.formatPracticeType(
          session.lesson?.type || 'FREE_TALK',
        ),
        duration: this.formatDuration(session.duration || 0),
        completedAt: session.finishedAt || session.createdAt,
      },

      progressChart: previousSessions.map((item) => ({
        date: item.finishedAt || item.createdAt,
        score: item.overallScore,
      })),
    };
  }

  async practiceAgainFromHistory(userId: string, sessionId: string) {
    const oldSession = await this.prisma.speakingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!oldSession) {
      throw new NotFoundException('Không tìm thấy lịch sử luyện nói');
    }

    if (!oldSession.topicId || !oldSession.lessonId) {
      throw new BadRequestException(
        'Lịch sử này không có topicId hoặc lessonId',
      );
    }

    const newSession = await this.prisma.speakingSession.create({
      data: {
        userId,
        topicId: oldSession.topicId,
        lessonId: oldSession.lessonId,
        status: SpeakingSessionStatus.IN_PROGRESS,
      },
    });

    return {
      sessionId: newSession.id,
      redirectUrl: `/speaking/practice/${newSession.id}`,
    };
  }

  async getPracticeTypeDetail(userId: string, sessionId: string) {
    const session = await this.prisma.speakingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        topic: {
          include: {
            category: true,
          },
        },
        lesson: true,
        answers: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy lịch sử luyện nói');
    }

    const answer = session.answers[0];

    const fluency = session.fluency || 0;
    const pronunciation = session.pronunciation || 0;
    const grammar = session.grammar || 0;
    const vocabulary = session.vocabulary || 0;
    const overallScore = session.overallScore || 0;

    const accuracy = Math.round((pronunciation + grammar) / 2);
    const completeness = Math.round((vocabulary + fluency + grammar) / 3);

    return {
      header: {
        sessionId: session.id,
        title: this.formatPracticeType(session.lesson?.type || 'READ_ALOUD'),
        description: this.getPracticeTypeDescription(
          session.lesson?.type || 'READ_ALOUD',
        ),
        topicTitle: session.topic?.title || 'Speaking Practice',
        lessonTitle: session.lesson?.title || '',
        icon: session.topic?.category?.icon || '🎙️',
        completedAt: session.finishedAt || session.createdAt,
        durationText: this.formatDuration(session.duration || 0),
        status: session.status,
      },

      recording: {
        audioUrl: answer?.audioUrl || null,
        durationText: this.formatDuration(session.duration || 0),
      },

      passage: {
        title: session.lesson?.title || '',
        text: answer?.expectedText || session.lesson?.expectedText || '',
        icon: session.lesson?.icon || '☀️',
      },

      transcript: {
        text: answer?.transcript || '',
        correctedText: answer?.correctedText || '',
      },

      performance: {
        overallScore,
        message: overallScore >= 80 ? 'Good job! 🎉' : 'Keep practicing! 💪',
        description:
          answer?.feedback ||
          'You read the passage clearly and with good expression. Keep practicing to sound even more natural!',
        scores: {
          fluency,
          pronunciation,
          accuracy,
          completeness,
        },
        labels: {
          fluency: this.getScoreLabel(fluency),
          pronunciation: this.getScoreLabel(pronunciation),
          accuracy: this.getScoreLabel(accuracy),
          completeness: this.getScoreLabel(completeness),
        },
      },

      detailedFeedback: {
        strengths: [
          'Clear and easy to understand',
          'Good pace and natural pauses',
          'Used a good range of vocabulary',
        ],
        areasToImprove: Array.isArray(answer?.suggestions)
          ? (answer.suggestions as string[])
          : [
              'Work on pronouncing ending sounds',
              'Improve the ending sounds',
              'Try to use more varied intonation',
            ],
      },

      vocabularyHighlight: [
        {
          word: 'routine',
          audioUrl: null,
        },
        {
          word: 'healthy',
          audioUrl: null,
        },
        {
          word: 'breakfast',
          audioUrl: null,
        },
        {
          word: 'positive',
          audioUrl: null,
        },
        {
          word: 'mind',
          audioUrl: null,
        },
      ],

      nextSteps: [
        {
          title: 'Practice Similar Topic',
          icon: '📋',
          action: 'SIMILAR_TOPIC',
        },
        {
          title: 'Shadowing Exercise',
          icon: '🎧',
          action: 'SHADOWING',
        },
        {
          title: 'Tongue Twister Challenge',
          icon: '🌿',
          action: 'TONGUE_TWISTER',
        },
      ],
    };
  }

  private getPracticeTypeDescription(type: string) {
    switch (type) {
      case 'READ_ALOUD':
        return 'Read the given passage out loud clearly and naturally.';
      case 'REPEAT_AFTER_ME':
        return 'Listen and repeat the sentence with natural pronunciation.';
      case 'ANSWER_QUESTIONS':
        return 'Answer the question clearly and naturally.';
      case 'FREE_TALK':
        return 'Speak freely about the topic and express your ideas.';
      default:
        return 'Practice your speaking skill.';
    }
  }

  async getPracticeSession(userId: string, sessionId: string) {
    const session = await this.prisma.speakingSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        topic: { include: { category: true } },
        lesson: true,
        answers: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nói');
    }

    if (!session.lesson) {
      throw new NotFoundException('Session chưa gắn lesson');
    }

    const latestAnswer = session.answers[0];
    const expectedText =
      latestAnswer?.expectedText || session.lesson.expectedText || '';

    return {
      session: {
        id: session.id,
        status: session.status,
        step: latestAnswer ? 2 : 1,
        startedAt: session.startedAt,
        duration: session.duration || 0,
      },
      topic: {
        id: session.topic?.id || '',
        title: session.topic?.title || 'Speaking Practice',
        slug: session.topic?.slug || '',
        categoryTitle: session.topic?.category?.title || 'General',
        icon: session.topic?.category?.icon || '🎙️',
      },
      lesson: {
        id: session.lesson.id,
        title: session.lesson.title,
        slug: session.lesson.slug,
        description: session.lesson.description,
        type: session.lesson.type,
        level: session.lesson.level,
        estimatedMinutes: session.lesson.estimatedMinutes,
        prompt: session.lesson.prompt,
        expectedText,
        icon: session.lesson.icon || '🎙️',
      },
      latestAnswer: latestAnswer
        ? {
            id: latestAnswer.id,
            transcript: latestAnswer.transcript,
            audioUrl: latestAnswer.audioUrl,
            overallScore: latestAnswer.overallScore,
            feedback: latestAnswer.feedback,
          }
        : null,
      steps: [
        { order: 1, title: 'Read & Record', description: 'Speak clearly' },
        { order: 2, title: 'AI Evaluation', description: 'Get feedback' },
        { order: 3, title: 'Improve', description: 'Practice again' },
        { order: 4, title: 'Summary', description: 'See progress' },
      ],
      focusSkills: [
        {
          title: 'Pronunciation',
          description: 'Speak words clearly',
          icon: '🎙️',
        },
        { title: 'Fluency', description: 'Speak smoothly', icon: '🔊' },
        {
          title: 'Intonation',
          description: 'Use natural intonation',
          icon: '〽️',
        },
      ],
      tips: [
        {
          title: 'Find a quiet place',
          description: 'Avoid background noise',
          icon: '🎧',
        },
        {
          title: 'Speak naturally',
          description: "Don't read too fast or too slow",
          icon: '💬',
        },
        {
          title: 'Take your time',
          description: 'You can re-record anytime',
          icon: '⏱️',
        },
      ],
    };
  }

  async transcribePracticeAudio(
    userId: string,
    sessionId: string,
    dto: TranscribeSpeakingDto,
  ) {
    const session = await this.prisma.speakingSession.findFirst({
      where: { id: sessionId, userId },
      include: { lesson: true },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nói');
    }

    // Không fallback transcript sang expectedText.
    // Nếu chưa tích hợp STT/audio upload thật, trả transcript rỗng để hệ thống chấm 0 thay vì 100 sai.
    const transcript = String((dto as any).transcript || '').trim();

    return {
      transcript,
      audioUrl: dto.audioUrl,
    };
  }

  async evaluatePracticeAnswer(
    userId: string,
    sessionId: string,
    dto: EvaluateSpeakingDto,
  ) {
    const session = await this.prisma.speakingSession.findFirst({
      where: { id: sessionId, userId },
      include: { lesson: true, topic: true },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nói');
    }

    if (!session.lesson) {
      throw new NotFoundException('Session chưa gắn lesson');
    }

    const expectedText =
      session.lesson.expectedText || session.lesson.prompt || '';
    const transcript = String(dto.transcript || '').trim();
    const invalidReason = this.shouldRejectPracticeTranscript({
      transcript,
      expectedText,
      audioUrl: dto.audioUrl,
    });

    const evaluation = invalidReason
      ? this.emptySpeakingEvaluation(invalidReason)
      : await this.evaluateSpeakingAnswer({
          question: session.lesson.prompt || session.lesson.title,
          expectedText,
          transcript,
          level: session.lesson.level,
        });

    const normalizedEvaluation = this.normalizeEvaluation(evaluation);

    const answer = await this.prisma.speakingAnswer.create({
      data: {
        sessionId,
        question: session.lesson.prompt || session.lesson.title,
        expectedText,
        transcript,
        audioUrl: dto.audioUrl,
        overallScore: normalizedEvaluation.overallScore,
        pronunciation: normalizedEvaluation.pronunciation,
        fluency: normalizedEvaluation.fluency,
        grammar: normalizedEvaluation.grammar,
        vocabulary: normalizedEvaluation.vocabulary,
        confidence: normalizedEvaluation.confidence,
        correctedText: normalizedEvaluation.correctedText,
        feedback: normalizedEvaluation.feedback,
        suggestions: normalizedEvaluation.suggestions,
      },
    });

    await this.prisma.speakingSession.update({
      where: { id: sessionId },
      data: {
        overallScore: answer.overallScore,
        pronunciation: answer.pronunciation,
        fluency: answer.fluency,
        grammar: answer.grammar,
        vocabulary: answer.vocabulary,
        confidence: answer.confidence,
      },
    });

    return {
      answerId: answer.id,
      evaluation: {
        overallScore: answer.overallScore,
        pronunciation: answer.pronunciation,
        fluency: answer.fluency,
        grammar: answer.grammar,
        vocabulary: answer.vocabulary,
        confidence: answer.confidence,
        correctedText: answer.correctedText,
        feedback: answer.feedback,
        suggestions: answer.suggestions,
      },
    };
  }

async getPractice(userId: string, sessionId: string) {
  const session =
    await this.prisma.speakingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        lesson: true,
        topic: true,
        answers: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

  if (!session) {
    throw new NotFoundException(
      'Không tìm thấy phiên luyện nói',
    );
  }

  if (!session.lesson) {
    throw new BadRequestException(
      'Phiên luyện nói chưa được gắn với bài học',
    );
  }

  if (!session.topic) {
    throw new BadRequestException(
      'Phiên luyện nói chưa được gắn với chủ đề',
    );
  }

  const lesson = session.lesson;
  const topic = session.topic;
  const latestAnswer = session.answers[0] ?? null;

  return {
    session: {
      id: session.id,
      status: session.status,
      durationSeconds: session.duration ?? 0,
    },

    lesson: {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      prompt: lesson.prompt,
      expectedText: lesson.expectedText,
      estimatedMinutes: lesson.estimatedMinutes,
      type: lesson.type,
      level: lesson.level,
      icon: lesson.icon,
    },

    topic: {
      id: topic.id,
      title: topic.title,
      slug: topic.slug,
    },

    latestAnswer: latestAnswer
      ? {
          id: latestAnswer.id,
          transcript: latestAnswer.transcript,
          audioUrl: latestAnswer.audioUrl,
          overallScore:
            latestAnswer.overallScore,
          feedback: latestAnswer.feedback,
        }
      : null,

    steps: [
      {
        order: 1,
        title: 'Đọc yêu cầu',
        description:
          'Hiểu câu hỏi và chuẩn bị nội dung muốn nói.',
      },
      {
        order: 2,
        title: 'Ghi âm',
        description:
          'Nói rõ ràng, tự nhiên và giữ microphone ổn định.',
      },
      {
        order: 3,
        title: 'Nhận phản hồi AI',
        description:
          'AI phân tích phát âm, độ trôi chảy và ngữ pháp.',
      },
    ],

    focusSkills: [
      {
        title: 'Pronunciation',
        description:
          'Phát âm rõ ràng và chính xác.',
        icon: '🎙️',
      },
      {
        title: 'Fluency',
        description:
          'Nói tự nhiên và hạn chế ngập ngừng.',
        icon: '🔊',
      },
      {
        title: 'Grammar',
        description:
          'Sử dụng cấu trúc câu chính xác.',
        icon: 'Aa',
      },
    ],

    tips: [
      {
        title: 'Giữ khoảng cách phù hợp',
        description:
          'Đặt microphone cách miệng khoảng 15–20 cm.',
        icon: '🎤',
      },
      {
        title: 'Nói thành câu hoàn chỉnh',
        description:
          'Không chỉ trả lời bằng một hoặc hai từ.',
        icon: '💬',
      },
      {
        title: 'Không đọc quá nhanh',
        description:
          'Giữ tốc độ vừa phải để hệ thống nhận diện chính xác.',
        icon: '⏱️',
      },
    ],
  };
}
}
