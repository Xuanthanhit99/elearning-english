import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from 'src/prisma/prisma.service';
import { CheckWritingDto } from './dro/check-writing.dto';

@Injectable()
export class WritingService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  constructor(private readonly prisma: PrismaService) {}

  private cleanJson(text: string) {
    return text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
  }

  async checkWriting(dto: CheckWritingDto, userId?: string) {
    console.log(process.env.GEMINI_API_KEY);
    const text = dto.text?.trim();

    if (!text) {
      throw new BadRequestException('Text is required');
    }

    const requestLevel = dto.level || 'Beginner';
    const style = dto.style || 'general';

    const existed = await this.prisma.writingSubmission.findFirst({
      where: {
        originalText: text,
        style,
        level: requestLevel,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existed) {
      return {
        id: existed.id,
        score: existed.score,
        level: existed.level,
        summary:
          existed.summary ||
          `Bài viết đạt mức ${existed.level}, cần cải thiện thêm ngữ pháp và cách diễn đạt.`,
        grammarScore: existed.grammarScore,
        vocabularyScore: existed.vocabularyScore,
        clarityScore: existed.clarityScore,
        meaningScore: existed.meaningScore,
        corrections: existed.corrections || [],
        suggestedVersion: existed.suggestedVersion || '',
        phrases: existed.phrases || [],
        learningTips: existed.learningTips || [],
        miuNote: existed.miuNote || '',
      };
    }

    const prompt = `
Check this English writing for Vietnamese learners.

Text:
${text}

Style: ${style}
Level: ${requestLevel}

Return ONLY JSON:
{
  "detectedLanguage": "",
  "score": 0,
  "level": "",
  "summary": "",
  "grammarScore": 0,
  "vocabularyScore": 0,
  "clarityScore": 0,
  "meaningScore": 0,
  "corrections": [
    {
      "type": "",
      "level": "",
      "wrong": "",
      "correct": "",
      "explanation": ""
    }
  ],
  "suggestedVersion": "",
  "phrases": [],
  "learningTips": [],
  "miuNote": ""
}

Rules:
- Explain in Vietnamese.
- Keep it concise.
- Maximum 3 corrections.
- Maximum 5 phrases.
- Maximum 3 learningTips.
`;

    try {
      const aiData = await this.callGemini(prompt);

      const saved = await this.prisma.writingSubmission.create({
        data: {
          userId: userId || null,
          originalText: text,
          detectedLanguage: aiData.detectedLanguage || '',
          style,
          level: requestLevel,

          score: aiData.score,
          grammarScore: aiData.grammarScore,
          vocabularyScore: aiData.vocabularyScore,
          clarityScore: aiData.clarityScore,
          meaningScore: aiData.meaningScore,

          corrections: aiData.corrections || [],
          suggestedVersion: aiData.suggestedVersion || '',
          phrases: aiData.phrases || [],
          learningTips: aiData.learningTips || [],
          miuNote: aiData.miuNote || '',
        },
      });

      return {
        id: saved.id,
        score: aiData.score,
        level: aiData.level,

        summary:
          aiData.summary ||
          `Bài viết đạt mức ${aiData.level}, cần cải thiện thêm ngữ pháp và cách diễn đạt.`,

        grammarScore: aiData.grammarScore,
        vocabularyScore: aiData.vocabularyScore,
        clarityScore: aiData.clarityScore,
        meaningScore: aiData.meaningScore,

        corrections: aiData.corrections || [],
        suggestedVersion: aiData.suggestedVersion || '',
        phrases: aiData.phrases || [],
        learningTips: aiData.learningTips || [],
        miuNote: aiData.miuNote || '',
      };
    } catch (error: any) {
      console.log('FULL ERROR:', error);

      throw new BadRequestException('Không thể check bài viết lúc này');
    }
  }

  private async callGemini(prompt: string) {
    const models = ['gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
        });

        const result = await model.generateContent(prompt);
        const rawText = result.response.text();

        return JSON.parse(this.cleanJson(rawText));
      } catch (error: any) {
        console.log('Gemini failed:', {
          modelName,
          status: error?.status,
          message: error?.message,
        });

        if (error?.status === 503 || error?.status === 429) {
          continue;
        }

        throw error;
      }
    }

    throw new BadRequestException(
      'AI đang quá tải, vui lòng thử lại sau vài phút.',
    );
  }

  async getMyHistory(userId: string) {
    return this.prisma.writingSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getHome(userId: string) {
    const [
      totalSessions,
      submittedSessions,
      recentHistory,
      recommendations,
      progress,
    ] = await Promise.all([
      this.prisma.writingSession.count({ where: { userId } }),
      this.prisma.writingSession.findMany({
        where: {
          userId,
          isSubmitted: true,
          overallScore: { not: null },
        },
      }),
      this.getRecentHistory(userId),
      this.getRecommendations(),
      this.getProgress(userId),
    ]);

    const avgScore =
      submittedSessions.length > 0
        ? Math.round(
            submittedSessions.reduce(
              (sum, item) => sum + (item.overallScore ?? 0),
              0,
            ) / submittedSessions.length,
          )
        : 0;

    return {
      user: {
        name: 'Minh Anh',
        level: 18,
      },
      stats: {
        essaysWritten: totalSessions,
        avgScore,
        dayStreak: 5,
        xpToday: 2450,
        gems: 5230,
      },
      todayPractice: [
        {
          key: 'ESSAY',
          title: 'Essay',
          description: 'Write academic essays on various topics.',
          icon: 'file-text',
          color: 'purple',
        },
        {
          key: 'EMAIL',
          title: 'Email',
          description: 'Practice professional and personal emails.',
          icon: 'mail',
          color: 'green',
        },
        {
          key: 'STORY',
          title: 'Story',
          description: 'Create engaging stories and narratives.',
          icon: 'book-open',
          color: 'orange',
        },
        {
          key: 'SENTENCE',
          title: 'Sentence',
          description: 'Improve your sentences and expressions.',
          icon: 'pen',
          color: 'blue',
        },
        {
          key: 'PROGRESS',
          title: 'Progress',
          description: 'Track your writing journey and improvement.',
          icon: 'bar-chart',
          color: 'pink',
        },
      ],

      writingPath: [
        {
          key: 'SENTENCE',
          title: 'Sentence Builder',
          description: 'Viết câu đơn theo gợi ý hình ảnh hoặc từ khóa.',
          order: 1,
        },
        {
          key: 'PARAGRAPH',
          title: 'Paragraph Writing',
          description: 'Ghép 4–6 câu thành một đoạn văn hoàn chỉnh.',
          order: 2,
        },
        {
          key: 'ESSAY',
          title: 'Essay Writing',
          description: 'Viết bài luận đầy đủ từ 100–250 từ.',
          order: 3,
        },
        {
          key: 'DAILY_CHALLENGE',
          title: 'Daily Writing Challenge',
          description: 'Mỗi ngày một chủ đề ngắn để duy trì streak.',
          order: 4,
        },
        {
          key: 'AI_COACH',
          title: 'AI Coach',
          description: 'AI giải thích lỗi, gợi ý sửa và yêu cầu viết lại.',
          order: 5,
        },
      ],

      recommendations,
      recentHistory,
      dailyGoal: {
        title: 'Daily Goal: Write for at least 15 minutes',
        current: 10,
        target: 15,
      },
      progress,
    };
  }

  async getProgress(userId: string) {
    const submitted = await this.prisma.writingSession.findMany({
      where: {
        userId,
        isSubmitted: true,
        overallScore: { not: null },
      },
      select: {
        overallScore: true,
      },
    });

    if (submitted.length === 0) {
      return {
        overall: 0,
        excellent: 0,
        good: 0,
        needsImprovement: 0,
      };
    }

    const excellent = submitted.filter((x) => (x.overallScore ?? 0) >= 85);
    const good = submitted.filter(
      (x) => (x.overallScore ?? 0) >= 70 && (x.overallScore ?? 0) < 85,
    );
    const needsImprovement = submitted.filter(
      (x) => (x.overallScore ?? 0) < 70,
    );

    const overall = Math.round(
      submitted.reduce((sum, item) => sum + (item.overallScore ?? 0), 0) /
        submitted.length,
    );

    return {
      overall,
      excellent: excellent.length,
      good: good.length,
      needsImprovement: needsImprovement.length,
      total: submitted.length,
    };
  }

  async getRecentHistory(userId: string) {
    const sessions = await this.prisma.writingSession.findMany({
      where: {
        userId,
        isSubmitted: true,
      },
      include: {
        lesson: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 5,
    });

    return sessions.map((item) => ({
      id: item.id,
      title: item.lesson.title,
      type: item.lesson.type,
      level: item.lesson.level,
      score: item.overallScore ?? 0,
      submittedAt: item.submittedAt,
    }));
  }

  async getRecommendations() {
    const lessons = await this.prisma.writingLesson.findMany({
      where: {
        isActive: true,
      },
      include: {
        topic: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 4,
    });

    return lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      level: lesson.level,
      type: lesson.type,
      category: lesson.topic.category ?? lesson.topic.title,
      imageUrl: lesson.topic.imageUrl,
      writers: Math.floor(Math.random() * 1200) + 300,
    }));
  }

  async startLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.writingLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const existing = await this.prisma.writingSession.findFirst({
      where: {
        userId,
        lessonId,
        isSubmitted: false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (existing) {
      return {
        sessionId: existing.id,
        lessonId,
        reused: true,
      };
    }

    const session = await this.prisma.writingSession.create({
      data: {
        userId,
        lessonId,
      },
    });

    return {
      sessionId: session.id,
      lessonId,
      reused: false,
    };
  }

  async getTopics(
    userId: string,
    query: {
      search?: string;
      difficulty?: string;
      progress?: string;
      sort?: string;
      page: number;
      limit: number;
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.difficulty && query.difficulty !== 'ALL') {
      where.difficulty = query.difficulty;
    }

    let orderBy: any = { order: 'asc' };

    if (query.sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    if (query.sort === 'popular') {
      orderBy = { learnerCount: 'desc' };
    }

    const [topics, total] = await Promise.all([
      this.prisma.writingTopic.findMany({
        where,
        include: {
          lessons: {
            where: { isActive: true },
            select: { id: true },
          },
          progress: {
            where: { userId },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),

      this.prisma.writingTopic.count({ where }),
    ]);

    let items = topics.map((topic) => {
      const progress = topic.progress[0];

      return {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        imageUrl: topic.imageUrl,
        difficulty: topic.difficulty,
        lessonCount: topic.lessons.length,
        progressPercent: progress?.progressPercent ?? 0,
        learnerCount: topic.learnerCount,
      };
    });

    if (query.progress === 'IN_PROGRESS') {
      items = items.filter(
        (x) => x.progressPercent > 0 && x.progressPercent < 100,
      );
    }

    if (query.progress === 'COMPLETED') {
      items = items.filter((x) => x.progressPercent >= 100);
    }

    if (query.progress === 'NOT_STARTED') {
      items = items.filter((x) => x.progressPercent === 0);
    }

    if (query.sort === 'progress') {
      items = items.sort((a, b) => b.progressPercent - a.progressPercent);
    }

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTopicDetail(userId: string, slug: string, sort = 'DEFAULT') {
    const topic = await this.prisma.writingTopic.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: { isActive: true },
          orderBy:
            sort === 'NEWEST'
              ? { createdAt: 'desc' }
              : sort === 'TITLE'
                ? { title: 'asc' }
                : { order: 'asc' },
          include: {
            sessions: {
              where: { userId },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
        progress: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Không tìm thấy chủ đề luyện viết');
    }

    let lessons = topic.lessons.map((lesson, index) => {
      const session = lesson.sessions[0];

      const progressPercent = session?.isSubmitted
        ? 100
        : session?.content
          ? 60
          : 0;

      const status =
        progressPercent === 100
          ? 'COMPLETED'
          : progressPercent > 0
            ? 'IN_PROGRESS'
            : 'NOT_STARTED';

      return {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        imageUrl: lesson.imageUrl,
        type: lesson.type,
        level: lesson.level,
        duration: lesson.duration ?? 20,
        learnerCount: lesson.learnerCount ?? 0,
        order: index + 1,
        status,
        progressPercent,
        sessionId: session?.id ?? null,
        score: session?.overallScore ?? null,
      };
    });

    if (sort === 'PROGRESS') {
      lessons = lessons.sort((a, b) => b.progressPercent - a.progressPercent);
    }

    const completed = lessons.filter((x) => x.status === 'COMPLETED').length;
    const inProgress = lessons.filter((x) => x.status === 'IN_PROGRESS').length;

    const progressPercent =
      lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;

    const submittedSessions = await this.prisma.writingSession.findMany({
      where: {
        userId,
        lessonId: {
          in: lessons.map((x) => x.id),
        },
        isSubmitted: true,
        overallScore: { not: null },
      },
      select: {
        overallScore: true,
      },
    });

    const averageScore =
      submittedSessions.length > 0
        ? Math.round(
            submittedSessions.reduce(
              (sum, item) => sum + (item.overallScore ?? 0),
              0,
            ) / submittedSessions.length,
          )
        : 0;

    const bestScore =
      submittedSessions.length > 0
        ? Math.max(...submittedSessions.map((x) => x.overallScore ?? 0))
        : 0;

    const nextLesson =
      lessons.find((x) => x.status === 'IN_PROGRESS') ||
      lessons.find((x) => x.status === 'NOT_STARTED') ||
      lessons[0] ||
      null;

    return {
      id: topic.id,
      title: topic.title,
      slug: topic.slug,
      description: topic.description,
      imageUrl: topic.imageUrl,
      difficulty: topic.difficulty,
      levelText: topic.levelText ?? 'B1 - B2 Level',

      progress: {
        overall: topic.progress[0]?.progressPercent ?? progressPercent,
        totalLessons: lessons.length,
        completed,
        inProgress,
        notStarted: lessons.length - completed - inProgress,
      },

      stats: {
        averageScore,
        bestScore,
        totalAttempts: submittedSessions.length,
        estimatedHours: Math.ceil(
          lessons.reduce((sum, item) => sum + (item.duration || 20), 0) / 60,
        ),
      },

      nextLesson,

      aiRecommendation: nextLesson
        ? {
            title: nextLesson.title,
            reason:
              nextLesson.status === 'IN_PROGRESS'
                ? 'Bạn đang học dở bài này, nên tiếp tục để hoàn thành tiến độ.'
                : 'Đây là bài phù hợp tiếp theo để cải thiện kỹ năng viết của bạn.',
            estimatedTime: nextLesson.duration,
            level: nextLesson.level,
            type: nextLesson.type,
          }
        : null,

      lessons,

      about: {
        overview: topic.about || topic.description || '',
        learningObjectives: [
          'Viết câu và đoạn văn rõ ràng hơn.',
          'Sử dụng từ vựng phù hợp với chủ đề.',
          'Cải thiện cấu trúc bài viết và lập luận.',
        ],
        grammarFocus: ['Verb tense', 'Linking words', 'Sentence structure'],
        commonMistakes: [
          'Lặp từ quá nhiều.',
          'Thiếu ví dụ cụ thể.',
          'Câu quá dài hoặc thiếu dấu câu.',
        ],
        recommendedVocabulary: [
          'impact',
          'benefit',
          'challenge',
          'solution',
          'improve',
        ],
      },

      tips: [
        'Đọc kỹ đề trước khi viết.',
        'Lập dàn ý ngắn trước khi bắt đầu.',
        'Dùng linking words như however, moreover, therefore.',
        'Kiểm tra grammar và punctuation trước khi nộp.',
      ],
    };
  }

  async getWritingTypes(userId: string, slug: string) {
    const topic = await this.prisma.writingTopic.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: { isActive: true },
          include: {
            sessions: {
              where: { userId },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException('Không tìm thấy chủ đề');
    }

    const typeConfigs = [
      {
        key: 'SENTENCE',
        title: 'Sentence Writing',
        description: 'Write complete sentences about given topics.',
        icon: '✏️',
        color: 'green',
      },
      {
        key: 'PARAGRAPH',
        title: 'Paragraph',
        description: 'Write clear and coherent paragraphs.',
        icon: '📄',
        color: 'blue',
      },
      {
        key: 'ESSAY',
        title: 'Essay',
        description: 'Write well-structured essays with arguments.',
        icon: '📋',
        color: 'purple',
      },
      {
        key: 'EMAIL',
        title: 'Email',
        description: 'Write professional and personal emails.',
        icon: '✉️',
        color: 'orange',
      },
      {
        key: 'OPINION',
        title: 'Opinion',
        description: 'Express your opinions and support them.',
        icon: '💬',
        color: 'pink',
      },
      {
        key: 'STORY',
        title: 'Story',
        description: 'Write interesting stories and narratives.',
        icon: '📖',
        color: 'teal',
      },
      {
        key: 'IELTS_TASK_1',
        title: 'IELTS Task 1',
        description: 'Describe charts, graphs, and diagrams.',
        icon: '📊',
        color: 'orange',
      },
      {
        key: 'IELTS_TASK_2',
        title: 'IELTS Task 2',
        description: 'Write essays in response to point of view.',
        icon: '🖊️',
        color: 'sky',
      },
    ];

    const types = typeConfigs.map((type) => {
      const lessons = topic.lessons.filter(
        (lesson) => lesson.type === type.key,
      );

      const completed = lessons.filter(
        (lesson) => lesson.sessions[0]?.isSubmitted,
      ).length;

      return {
        ...type,
        lessonCount: lessons.length,
        completedCount: completed,
        progressPercent:
          lessons.length > 0
            ? Math.round((completed / lessons.length) * 100)
            : 0,
      };
    });

    const completedLessons = topic.lessons.filter(
      (lesson) => lesson.sessions[0]?.isSubmitted,
    ).length;

    const overallProgress =
      topic.lessons.length > 0
        ? Math.round((completedLessons / topic.lessons.length) * 100)
        : 0;

    return {
      topic: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        description: topic.description,
        imageUrl: topic.imageUrl,
        difficulty: topic.difficulty,
        levelText: topic.levelText ?? 'B1 - B2 Level',
        lessonCount: topic.lessons.length,
        estimatedTime: '4h 30m',
        progressPercent: overallProgress,
      },
      types,
    };
  }

  async startWritingType(userId: string, slug: string, type: string) {
    const lesson = await this.prisma.writingLesson.findFirst({
      where: {
        topic: { slug },
        type: type as any,
        isActive: true,
      },
      orderBy: { order: 'asc' },
    });

    if (!lesson) {
      throw new NotFoundException('Không có bài học cho dạng bài này');
    }

    const session = await this.prisma.writingSession.create({
      data: {
        userId,
        lessonId: lesson.id,
      },
    });

    return {
      sessionId: session.id,
      lessonId: lesson.id,
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.writingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        lesson: {
          include: {
            topic: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện viết');
    }

    const topic = session.lesson.topic;

    const topicLessons = await this.prisma.writingLesson.findMany({
      where: {
        topicId: topic.id,
        isActive: true,
      },
      include: {
        sessions: {
          where: { userId },
          take: 1,
        },
      },
    });

    const completed = topicLessons.filter(
      (lesson) => lesson.sessions[0]?.isSubmitted,
    ).length;

    const inProgress = topicLessons.filter(
      (lesson) =>
        lesson.sessions[0]?.content && !lesson.sessions[0]?.isSubmitted,
    ).length;

    return {
      session: {
        id: session.id,
        content: session.content ?? '',
        wordCount: session.wordCount,
        timeSpentSeconds: session.timeSpentSeconds ?? 0,
        isSubmitted: session.isSubmitted,
      },
      lesson: {
        id: session.lesson.id,
        title: session.lesson.title,
        slug: session.lesson.slug,
        prompt: session.lesson.prompt,
        description: session.lesson.description,
        type: session.lesson.type,
        level: session.lesson.level,
        duration: session.lesson.duration,
        minWords: session.lesson.minWords,
        maxWords: session.lesson.maxWords,
        sampleEssay: session.lesson.sampleEssay,
      },
      topic: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
      },
      progress: {
        overall:
          topicLessons.length > 0
            ? Math.round((completed / topicLessons.length) * 100)
            : 0,
        completed,
        inProgress,
        notStarted: topicLessons.length - completed - inProgress,
        totalLessons: topicLessons.length,
      },
      tips: [
        {
          title: 'Plan before you write',
          description: 'Spend a few minutes organizing your ideas.',
        },
        {
          title: 'Use clear structure',
          description: 'Introduction, body, conclusion.',
        },
        {
          title: 'Support with examples',
          description: 'Give specific reasons and examples.',
        },
        {
          title: 'Check your writing',
          description: 'Review grammar, spelling, and punctuation.',
        },
      ],
    };
  }

  async saveDraft(
    userId: string,
    sessionId: string,
    body: { content: string; timeSpentSeconds?: number },
  ) {
    const session = await this.prisma.writingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện viết');
    }

    const wordCount = this.countWords(body.content);

    return this.prisma.writingSession.update({
      where: { id: sessionId },
      data: {
        content: body.content,
        wordCount,
        timeSpentSeconds: body.timeSpentSeconds ?? session.timeSpentSeconds,
      },
    });
  }

  async reviewEssay(
    userId: string,
    sessionId: string,
    body: { content: string; timeSpentSeconds?: number },
  ) {
    await this.saveDraft(userId, sessionId, body);

    return {
      sessionId,
      nextStep: 'REVIEW',
      message: 'Bài viết đã được lưu, chuyển sang màn review.',
    };
  }

  async submitEssay(
    userId: string,
    sessionId: string,
    body: { content: string; timeSpentSeconds?: number },
  ) {
    const session = await this.prisma.writingSession.findFirst({
      where: { id: sessionId, userId },
      include: { lesson: true },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện viết');
    }

    const content = body.content?.trim();

    if (!content) {
      throw new BadRequestException('Vui lòng nhập bài viết trước khi nộp');
    }

    const wordCount = this.countWords(content);

    const ai = await this.analyzeWritingWithAI({
      text: content,
      prompt: session.lesson.prompt,
      type: session.lesson.type,
      level: session.lesson.level,
      minWords: session.lesson.minWords,
      maxWords: session.lesson.maxWords,
    });

    const updated = await this.prisma.writingSession.update({
      where: { id: sessionId },
      data: {
        content,
        wordCount,
        timeSpentSeconds: body.timeSpentSeconds ?? session.timeSpentSeconds,
        isSubmitted: true,
        submittedAt: new Date(),

        overallScore: Number(ai.overallScore || 0),
        taskScore: Number(ai.taskScore || 0),
        coherenceScore: Number(ai.coherenceScore || 0),
        vocabularyScore: Number(ai.vocabularyScore || 0),
        grammarScore: Number(ai.grammarScore || 0),
        feedback: ai.feedback || '',

        aiResult: ai,
        corrections: ai.corrections || [],
        strengths: ai.strengths || [],
        improvements: ai.improvements || [],
        vocabularySuggestions: ai.vocabularySuggestions || [],
        suggestedVersion: ai.suggestedVersion || '',
        learningTips: ai.learningTips || [],
        aiCoachTask: ai.aiCoachTask || '',
        rewriteRequired: Boolean(ai.rewriteRequired),
        nextPracticeSuggestion: ai.nextPracticeSuggestion || '',
      },
    });

    await this.recalculateTopicProgress(userId, session.lesson.topicId);

    return {
      sessionId: updated.id,
      resultUrl: `/writing/sessions/${updated.id}/result`,
    };
  }

  private countWords(content: string) {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }

  async getResult(userId: string, sessionId: string) {
    const session = await this.prisma.writingSession.findFirst({
      where: {
        id: sessionId,
        userId,
        isSubmitted: true,
      },
      include: {
        lesson: {
          include: {
            topic: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy kết quả bài viết');
    }

    const aiResult: any = session.aiResult || {};

    return {
      session: {
        id: session.id,
        content: session.content ?? '',
        wordCount: session.wordCount,
        timeSpentSeconds: session.timeSpentSeconds ?? 0,
        submittedAt: session.submittedAt,
      },
      lesson: {
        id: session.lesson.id,
        title: session.lesson.title,
        type: session.lesson.type,
        level: session.lesson.level,
        maxWords: session.lesson.maxWords,
      },
      topic: {
        id: session.lesson.topic.id,
        title: session.lesson.topic.title,
        slug: session.lesson.topic.slug,
      },
      result: {
        overallScore: session.overallScore ?? 0,
        grade: aiResult.grade ?? this.getGrade(session.overallScore ?? 0),
        taskAchievement: session.taskScore ?? 0,
        coherence: session.coherenceScore ?? 0,
        lexicalResource: session.vocabularyScore ?? 0,
        grammar: session.grammarScore ?? 0,
        feedback: session.feedback ?? '',
      },
      strengths: session.strengths || [],
      improvements: session.improvements || [],
      corrections: session.corrections || [],
      vocabularySuggestions: session.vocabularySuggestions || [],
      suggestedVersion: session.suggestedVersion || '',
      learningTips: session.learningTips || [],
      aiCoachTask: session.aiCoachTask || '',
      rewriteRequired: session.rewriteRequired,
      nextPracticeSuggestion: session.nextPracticeSuggestion || '',
    };
  }

  async retryEssay(userId: string, sessionId: string) {
    const oldSession = await this.prisma.writingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!oldSession) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const newSession = await this.prisma.writingSession.create({
      data: {
        userId,
        lessonId: oldSession.lessonId,
      },
    });

    return {
      sessionId: newSession.id,
    };
  }

  async getWritingHistory(
    userId: string,
    query: {
      topic?: string;
      type?: string;
      level?: string;
      status?: string;
      from?: string;
      to?: string;
      page: number;
      limit: number;
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    if (query.status === 'COMPLETED') {
      where.isSubmitted = true;
    }

    if (query.status === 'IN_PROGRESS') {
      where.isSubmitted = false;
      where.content = { not: null };
    }

    if (query.status === 'NOT_STARTED') {
      where.isSubmitted = false;
      where.OR = [{ content: null }, { content: '' }];
    }

    if (query.from || query.to) {
      where.updatedAt = {};

      if (query.from) {
        where.updatedAt.gte = new Date(query.from);
      }

      if (query.to) {
        where.updatedAt.lte = new Date(query.to);
      }
    }

    const lessonWhere: any = {};

    if (query.type && query.type !== 'ALL') {
      lessonWhere.type = query.type;
    }

    if (query.level && query.level !== 'ALL') {
      lessonWhere.level = query.level;
    }

    if (query.topic && query.topic !== 'ALL') {
      lessonWhere.topic = {
        slug: query.topic,
      };
    }

    if (Object.keys(lessonWhere).length > 0) {
      where.lesson = lessonWhere;
    }

    const [sessions, total, allSessions] = await Promise.all([
      this.prisma.writingSession.findMany({
        where,
        include: {
          lesson: {
            include: {
              topic: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),

      this.prisma.writingSession.count({ where }),

      this.prisma.writingSession.findMany({
        where: { userId },
        select: {
          isSubmitted: true,
          overallScore: true,
          content: true,
        },
      }),
    ]);

    const completed = allSessions.filter((x) => x.isSubmitted).length;
    const inProgress = allSessions.filter(
      (x) => !x.isSubmitted && x.content,
    ).length;
    const notStarted = allSessions.filter(
      (x) => !x.isSubmitted && !x.content,
    ).length;

    const scored = allSessions.filter((x) => x.overallScore !== null);
    const averageScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, item) => sum + (item.overallScore ?? 0), 0) /
              scored.length,
          )
        : 0;

    return {
      stats: {
        totalEssays: allSessions.length,
        completed,
        inProgress,
        notStarted,
        averageScore,
        completedPercent:
          allSessions.length > 0
            ? Math.round((completed / allSessions.length) * 100)
            : 0,
        inProgressPercent:
          allSessions.length > 0
            ? Math.round((inProgress / allSessions.length) * 100)
            : 0,
        notStartedPercent:
          allSessions.length > 0
            ? Math.round((notStarted / allSessions.length) * 100)
            : 0,
      },
      items: sessions.map((session) => {
        const status = session.isSubmitted
          ? 'COMPLETED'
          : session.content
            ? 'IN_PROGRESS'
            : 'NOT_STARTED';

        return {
          id: session.id,
          title: session.lesson.title,
          description: session.lesson.description,
          topic: session.lesson.topic.title,
          topicSlug: session.lesson.topic.slug,
          type: session.lesson.type,
          level: session.lesson.level,
          score: session.overallScore,
          status,
          completedAt: session.submittedAt,
          updatedAt: session.updatedAt,
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

  async getWritingHistoryDetail(userId: string, sessionId: string) {
    const session = await this.prisma.writingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        lesson: {
          include: {
            topic: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy chi tiết lịch sử');
    }

    const score = session.overallScore ?? 0;

    return {
      session: {
        id: session.id,
        content: session.content ?? '',
        wordCount: session.wordCount,
        timeSpentSeconds: session.timeSpentSeconds ?? 0,
        submittedAt: session.submittedAt,
        status: session.isSubmitted ? 'COMPLETED' : 'IN_PROGRESS',
      },
      lesson: {
        id: session.lesson.id,
        title: session.lesson.title,
        type: session.lesson.type,
        level: session.lesson.level,
        maxWords: session.lesson.maxWords,
      },
      topic: {
        id: session.lesson.topic.id,
        title: session.lesson.topic.title,
        slug: session.lesson.topic.slug,
      },
      score: {
        overall: score,
        grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Fair',
        taskAchievement: session.taskScore ?? 72,
        coherence: session.coherenceScore ?? 70,
        lexicalResource: session.vocabularyScore ?? 68,
        grammar: session.grammarScore ?? 78,
      },
      strengths: [
        'Clear introduction and conclusion',
        'Good use of examples',
        'Logical paragraph structure',
      ],
      improvements: [
        'Use more advanced vocabulary',
        'Fix grammar and punctuation errors',
        'Improve sentence variety',
      ],
      corrections: [
        {
          wrong: 'do works',
          correct: 'do work',
          explanation: '"Do" is used with the base form of the verb.',
          type: 'Grammar',
        },
        {
          wrong: 'human errors',
          correct: 'human error',
          explanation: '"Error" is uncountable in this context.',
          type: 'Grammar',
        },
        {
          wrong: 'questions',
          correct: 'questions',
          explanation: 'Good word, but try to use more specific vocabulary.',
          type: 'Vocabulary',
        },
        {
          wrong: 'if we use it wisely',
          correct: 'if we use it wisely.',
          explanation: 'Add a period at the end of the sentence.',
          type: 'Punctuation',
        },
      ],
      progressChart: [
        { date: 'Apr 10', score: 30 },
        { date: 'Apr 24', score: 50 },
        { date: 'May 8', score: 52 },
        { date: 'May 10', score },
      ],
    };
  }

  private async analyzeWritingWithAI(params: {
    text: string;
    prompt: string;
    type: string;
    level: string;
    minWords?: number;
    maxWords?: number;
  }) {
    const prompt = `
Bạn là AI English Writing Coach cho học viên Việt Nam.

Hãy chấm bài viết tiếng Anh này.

Writing type: ${params.type}
Level: ${params.level}
Prompt: ${params.prompt}
Word target: ${params.minWords || 0} - ${params.maxWords || 0} words

Student writing:
${params.text}

Return ONLY JSON:
{
  "overallScore": 0,
  "taskScore": 0,
  "coherenceScore": 0,
  "vocabularyScore": 0,
  "grammarScore": 0,
  "grade": "",
  "feedback": "",
  "strengths": [],
  "improvements": [],
  "corrections": [
    {
      "wrong": "",
      "correct": "",
      "explanation": "",
      "type": ""
    }
  ],
  "vocabularySuggestions": [
    {
      "original": "",
      "suggestion": ""
    }
  ],
  "suggestedVersion": "",
  "learningTips": [],
  "aiCoachTask": "",
  "rewriteRequired": true,
  "nextPracticeSuggestion": ""
}

Rules:
- Feedback, explanation, learningTips viết bằng tiếng Việt.
- Scores từ 0 đến 100.
- Maximum 5 corrections.
- Maximum 5 vocabularySuggestions.
- aiCoachTask là nhiệm vụ viết lại ngắn để học viên cải thiện bài.
`;

    return this.callGemini(prompt);
  }

  private async recalculateTopicProgress(userId: string, topicId: string) {
    const lessons = await this.prisma.writingLesson.findMany({
      where: { topicId, isActive: true },
      select: { id: true },
    });

    const lessonIds = lessons.map((x) => x.id);

    const completed = await this.prisma.writingSession.count({
      where: {
        userId,
        lessonId: { in: lessonIds },
        isSubmitted: true,
      },
    });

    const total = lessons.length;
    const progressPercent =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    await this.prisma.writingTopicProgress.upsert({
      where: {
        userId_topicId: {
          userId,
          topicId,
        },
      },
      update: {
        completedLessons: completed,
        totalLessons: total,
        progressPercent,
      },
      create: {
        userId,
        topicId,
        completedLessons: completed,
        totalLessons: total,
        progressPercent,
      },
    });
  }

  private getGrade(score: number) {
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  }

  async rewriteEssay(
    userId: string,
    sessionId: string,
    body: { content?: string },
  ) {
    const session = await this.prisma.writingSession.findFirst({
      where: { id: sessionId, userId },
      include: { lesson: true },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const content = body.content?.trim() || session.content || '';

    if (!content) {
      throw new BadRequestException('Không có nội dung để rewrite');
    }

    const prompt = `
Rewrite this English writing to make it clearer, more natural, and suitable for level ${session.lesson.level}.

Original:
${content}

Return ONLY JSON:
{
  "improvedVersion": "",
  "mainChanges": [],
  "learningTips": []
}

Rules:
- improvedVersion bằng tiếng Anh.
- mainChanges và learningTips giải thích bằng tiếng Việt.
`;

    const ai = await this.callGemini(prompt);

    return {
      sessionId,
      improvedVersion: ai.improvedVersion || '',
      mainChanges: ai.mainChanges || [],
      learningTips: ai.learningTips || [],
    };
  }
}
