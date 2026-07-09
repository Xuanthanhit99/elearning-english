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
    const models = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
    ];

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
    const [totalSessions, submittedSessions, recentHistory, recommendations] =
      await Promise.all([
        this.prisma.writingSession.count({
          where: { userId },
        }),

        this.prisma.writingSession.findMany({
          where: {
            userId,
            isSubmitted: true,
            overallScore: { not: null },
          },
        }),

        this.getRecentHistory(userId),

        this.getRecommendations(),
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
      recommendations,
      recentHistory,
      dailyGoal: {
        title: 'Daily Goal: Write for at least 15 minutes',
        current: 10,
        target: 15,
      },
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

    const session = await this.prisma.writingSession.create({
      data: {
        userId,
        lessonId,
      },
    });

    return {
      sessionId: session.id,
      lessonId,
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

  async getTopicDetail(userId: string, slug: string) {
    const topic = await this.prisma.writingTopic.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
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

    const lessons = topic.lessons.map((lesson, index) => {
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
      };
    });

    const completed = lessons.filter((x) => x.status === 'COMPLETED').length;
    const inProgress = lessons.filter((x) => x.status === 'IN_PROGRESS').length;

    const progressPercent =
      lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;

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
      },
      lessons,
      about: topic.about ?? '',
      tips: topic.tips ?? '',
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
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện viết');
    }

    const wordCount = this.countWords(body.content);

    const updated = await this.prisma.writingSession.update({
      where: { id: sessionId },
      data: {
        content: body.content,
        wordCount,
        timeSpentSeconds: body.timeSpentSeconds ?? session.timeSpentSeconds,
        isSubmitted: true,
        submittedAt: new Date(),

        // Tạm thời mock score, sau này thay bằng Gemini/OpenAI
        overallScore: 85,
        grammarScore: 82,
        vocabularyScore: 86,
        coherenceScore: 84,
        taskScore: 88,
        feedback: 'Good structure. Try to add more specific examples.',
      },
    });

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

    const score = session.overallScore ?? 0;

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
        overallScore: score,
        grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Fair',
        taskAchievement: session.taskScore ?? 72,
        coherence: session.coherenceScore ?? 70,
        lexicalResource: session.vocabularyScore ?? 68,
        grammar: session.grammarScore ?? 78,
        feedback:
          session.feedback ??
          'You have a clear position and good ideas. Your essay is generally well-organized, but there are some grammar and vocabulary mistakes.',
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
      vocabularySuggestions: [
        { original: 'do works', suggestion: 'do work' },
        { original: 'detect diseases', suggestion: 'diagnose diseases' },
        { original: 'AI is useful', suggestion: 'AI is beneficial' },
        { original: 'high costs', suggestion: 'expensive costs' },
        { original: 'use it wisely', suggestion: 'utilize it wisely' },
      ],
      detailedFeedback: [
        {
          title: 'Content',
          description: 'Good ideas and relevant examples.',
          type: 'CONTENT',
        },
        {
          title: 'Organization',
          description: 'Some transitions could be smoother.',
          type: 'ORGANIZATION',
        },
        {
          title: 'Vocabulary',
          description: 'Try to use a wider range of advanced words.',
          type: 'VOCABULARY',
        },
        {
          title: 'Grammar',
          description: 'Check articles and prepositions.',
          type: 'GRAMMAR',
        },
      ],
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
}
