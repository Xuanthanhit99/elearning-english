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

  async saveDraft(userId: string, sessionId: string, content: string) {
    const session = await this.prisma.writingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện viết');
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    return this.prisma.writingSession.update({
      where: { id: sessionId },
      data: {
        content,
        wordCount,
      },
    });
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
}
