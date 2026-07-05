import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartListeningDto } from './dto/start-listening.dto';
import { SubmitListeningAnswerDto } from './dto/submit-listening-answer.dto';
import { GeminiService } from '../gemini/gemini.service';

type ListeningOption = {
  label: string;
  text: string;
};

type GeneratedListeningQuestion = {
  transcript?: string;
  question?: string;
  options?: ListeningOption[];
  correctAnswer?: string;
  explanation?: string;
  duration?: number;
};

@Injectable()
export class ListeningService {
  constructor(
    private prismaService: PrismaService,
    private geminiService: GeminiService,
  ) {}

  async startPractice(userId: string, dto: StartListeningDto) {
    const limit = Math.min(Math.max(dto.limit ?? 10, 1), 20);
    const level = dto.level ?? 'B1';
    const topic = dto.topic?.trim() || this.getDailyListeningTopic(level);
    const usedQuestionIds = await this.getUsedQuestionIdsToday(
      userId,
      level,
      topic,
    );

    await this.ensureQuestions({
      level,
      topic,
      limit: usedQuestionIds.length + limit,
    });

    let questions = await this.prismaService.listeningQuestion.findMany({
      where: {
        isActive: true,
        level,
        topic,
        id: {
          notIn: usedQuestionIds,
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (questions.length < limit) {
      await this.ensureQuestions({
        level,
        topic,
        limit: usedQuestionIds.length + limit + (limit - questions.length),
      });

      questions = await this.prismaService.listeningQuestion.findMany({
        where: {
          isActive: true,
          level,
          topic,
          id: {
            notIn: usedQuestionIds,
          },
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    if (!questions.length) {
      throw new BadRequestException('Không thể tạo dữ liệu luyện nghe.');
    }

    const session = await this.prismaService.listeningSession.create({
      data: {
        userId,
        level,
        topic,
        total: questions.length,
        status: 'IN_PROGRESS',
      },
    });

    await this.prismaService.listeningSessionAnswer.createMany({
      data: questions.map((question) => ({
        sessionId: session.id,
        questionId: question.id,
        selectedAnswer: null,
        isCorrect: null,
        isSkipped: false,
        timeSpent: 0,
        listenedCount: 0,
      })),
      skipDuplicates: true,
    });

    return {
      sessionId: session.id,
      level,
      topic,
      totalQuestions: questions.length,
      currentQuestionIndex: 1,
      progress: {
        percent: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
      },
      questions: questions.map((question, index) =>
        this.toQuestionPayload(question, index + 1),
      ),
    };
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    dto: SubmitListeningAnswerDto,
  ) {
    const { session, question } = await this.getSessionQuestion(
      userId,
      sessionId,
      dto.questionId,
    );

    if (session.status === 'COMPLETED') {
      throw new ForbiddenException('Bài luyện nghe này đã hoàn thành');
    }

    const selectedAnswer = dto.selectedAnswer.trim().toUpperCase();
    const isCorrect =
      selectedAnswer === question.correctAnswer.trim().toUpperCase();

    await this.prismaService.listeningSessionAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: dto.questionId,
        },
      },
      create: {
        sessionId,
        questionId: dto.questionId,
        selectedAnswer,
        isCorrect,
        isSkipped: false,
        timeSpent: dto.timeSpent,
        listenedCount: dto.listenedCount,
      },
      update: {
        selectedAnswer,
        isCorrect,
        isSkipped: false,
        timeSpent: dto.timeSpent,
        listenedCount: dto.listenedCount,
        answeredAt: new Date(),
      },
    });

    const progress = await this.recalculateSession(sessionId);

    return {
      questionId: dto.questionId,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation,
      transcript: question.transcript,
      progress,
    };
  }

  async skipQuestion(
    userId: string,
    sessionId: string,
    body: { questionId: string; timeSpent?: number; listenedCount?: number },
  ) {
    await this.getSessionQuestion(userId, sessionId, body.questionId);

    await this.prismaService.listeningSessionAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: body.questionId,
        },
      },
      create: {
        sessionId,
        questionId: body.questionId,
        selectedAnswer: null,
        isCorrect: null,
        isSkipped: true,
        timeSpent: body.timeSpent ?? 0,
        listenedCount: body.listenedCount ?? 0,
      },
      update: {
        selectedAnswer: null,
        isCorrect: null,
        isSkipped: true,
        timeSpent: body.timeSpent ?? 0,
        listenedCount: body.listenedCount ?? 0,
        answeredAt: new Date(),
      },
    });

    return {
      questionId: body.questionId,
      progress: await this.recalculateSession(sessionId),
    };
  }

  async flagQuestion(
    userId: string,
    sessionId: string,
    body: { questionId: string; isFlagged?: boolean },
  ) {
    await this.getSessionQuestion(userId, sessionId, body.questionId);

    const answer = await this.prismaService.listeningSessionAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: body.questionId,
        },
      },
      create: {
        sessionId,
        questionId: body.questionId,
        isFlagged: body.isFlagged ?? true,
      },
      update: {
        isFlagged: body.isFlagged ?? true,
      },
    });

    return {
      questionId: body.questionId,
      isFlagged: answer.isFlagged,
    };
  }

  async finishSession(userId: string, sessionId: string) {
    const session = await this.prismaService.listeningSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền kết thúc phiên này');
    }

    const progress = await this.recalculateSession(sessionId);
    const score =
      session.total > 0 ? Math.round((progress.correct / session.total) * 100) : 0;

    const updatedSession = await this.prismaService.listeningSession.update({
      where: { id: sessionId },
      data: {
        correct: progress.correct,
        wrong: progress.wrong,
        skipped: progress.skipped,
        score,
        xpEarned: progress.correct * 3,
        coinsEarned: Math.floor(progress.correct / 2),
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return {
      sessionId: updatedSession.id,
      totalQuestions: updatedSession.total,
      correct: updatedSession.correct,
      wrong: updatedSession.wrong,
      skipped: updatedSession.skipped,
      score: updatedSession.score,
      xpEarned: updatedSession.xpEarned,
      coinsEarned: updatedSession.coinsEarned,
      status: updatedSession.status,
      completedAt: updatedSession.completedAt,
    };
  }

  async retrySession(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);
    const answers = await this.prismaService.listeningSessionAnswer.findMany({
      where: { sessionId },
      include: { question: true },
      orderBy: { answeredAt: 'asc' },
    });

    const questions = answers.map((answer) => answer.question).filter(Boolean);
    if (!questions.length) {
      throw new NotFoundException('Không tìm thấy câu hỏi của bài luyện nghe');
    }

    return this.createSessionPayload({
      userId,
      level: session.level || 'B1',
      topic: session.topic || this.getDailyListeningTopic(session.level || 'B1'),
      questions: questions.slice(0, session.total || 10),
    });
  }

  async rateSession(
    userId: string,
    sessionId: string,
    body: { rating: number; comment?: string },
  ) {
    const session = await this.getOwnedSession(userId, sessionId);
    const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating) || 0)));

    if (!rating) {
      throw new BadRequestException('Vui lòng chọn số sao đánh giá');
    }

    const ratedAt = new Date();
    const comment = body.comment?.trim() || null;

    await this.prismaService.$executeRaw`
      UPDATE "ListeningSession"
      SET "rating" = ${rating},
          "ratingComment" = ${comment},
          "ratedAt" = ${ratedAt}
      WHERE "id" = ${session.id}
    `;

    return {
      sessionId: session.id,
      rating,
      ratedAt,
      message: 'Cảm ơn bạn đã đánh giá bài học!',
    };
  }

  async continueSession(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);
    const level = session.level || 'B1';
    const topic = session.topic || this.getDailyListeningTopic(level);
    const limit = session.total || 10;

    const previousAnswers = await this.prismaService.listeningSessionAnswer.findMany({
      where: { sessionId },
      include: { question: true },
      orderBy: { answeredAt: 'asc' },
    });

    const wrongQuestions = previousAnswers
      .filter((answer) => answer.isCorrect === false)
      .map((answer) => answer.question)
      .filter(Boolean)
      .slice(0, limit);

    const freshNeed = Math.max(0, limit - wrongQuestions.length);
    const usedQuestionIds = await this.getUsedQuestionIdsToday(userId, level, topic);

    await this.ensureQuestions({
      level,
      topic,
      limit: usedQuestionIds.length + freshNeed,
    });

    const freshQuestions = freshNeed
      ? await this.prismaService.listeningQuestion.findMany({
          where: {
            isActive: true,
            level,
            topic,
            id: {
              notIn: usedQuestionIds,
            },
          },
          take: freshNeed,
          orderBy: {
            createdAt: 'desc',
          },
        })
      : [];

    if (freshQuestions.length < freshNeed) {
      await this.ensureQuestions({
        level,
        topic,
        limit: usedQuestionIds.length + freshNeed + (freshNeed - freshQuestions.length),
      });
    }

    const filledFreshQuestions =
      freshQuestions.length >= freshNeed
        ? freshQuestions
        : await this.prismaService.listeningQuestion.findMany({
            where: {
              isActive: true,
              level,
              topic,
              id: {
                notIn: usedQuestionIds,
              },
            },
            take: freshNeed,
            orderBy: {
              createdAt: 'desc',
            },
          });

    return this.createSessionPayload({
      userId,
      level,
      topic,
      questions: [...wrongQuestions, ...filledFreshQuestions].slice(0, limit),
    });
  }

  private async getOwnedSession(userId: string, sessionId: string) {
    const session = await this.prismaService.listeningSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập phiên này');
    }

    return session;
  }

  private async createSessionPayload(params: {
    userId: string;
    level: string;
    topic: string;
    questions: any[];
  }) {
    const session = await this.prismaService.listeningSession.create({
      data: {
        userId: params.userId,
        level: params.level,
        topic: params.topic,
        total: params.questions.length,
        status: 'IN_PROGRESS',
      },
    });

    await this.prismaService.listeningSessionAnswer.createMany({
      data: params.questions.map((question) => ({
        sessionId: session.id,
        questionId: question.id,
        selectedAnswer: null,
        isCorrect: null,
        isSkipped: false,
        timeSpent: 0,
        listenedCount: 0,
      })),
      skipDuplicates: true,
    });

    return {
      sessionId: session.id,
      level: params.level,
      topic: params.topic,
      totalQuestions: params.questions.length,
      currentQuestionIndex: 1,
      progress: {
        percent: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
      },
      questions: params.questions.map((question, index) =>
        this.toQuestionPayload(question, index + 1),
      ),
    };
  }

  private getDailyListeningTopic(level: string) {
    const topicsByLevel: Record<string, string[]> = {
      A1: [
        'Daily Life',
        'Family',
        'Food',
        'School',
        'Weather',
        'Shopping',
        'Hobbies',
      ],
      A2: [
        'Travel',
        'Health',
        'Work',
        'Friends',
        'Transportation',
        'Home',
        'Sports',
      ],
      B1: [
        'Environment',
        'Technology',
        'Education',
        'Culture',
        'Business',
        'Community',
        'Media',
        'Health',
        'Travel',
        'Science',
        'Career',
        'Lifestyle',
      ],
      B2: [
        'Global Issues',
        'Innovation',
        'Workplace',
        'Social Media',
        'Sustainability',
        'Economy',
        'Education',
      ],
      C1: [
        'Public Policy',
        'Academic Life',
        'Leadership',
        'Research',
        'Culture and Identity',
        'Urban Development',
        'Ethics',
      ],
      C2: [
        'Philosophy',
        'Advanced Science',
        'International Relations',
        'Literature',
        'Psychology',
        'Economics',
        'Art Criticism',
      ],
    };

    const topics = topicsByLevel[level] || topicsByLevel.B1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNumber = Math.floor(today.getTime() / 86_400_000);

    return topics[dayNumber % topics.length];
  }

  private async getUsedQuestionIdsToday(
    userId: string,
    level: string,
    topic: string,
  ) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const answers = await this.prismaService.listeningSessionAnswer.findMany({
      where: {
        session: {
          userId,
          level,
          topic,
          startedAt: {
            gte: start,
            lt: end,
          },
        },
      },
      select: {
        questionId: true,
      },
      distinct: ['questionId'],
    });

    return answers.map((answer) => answer.questionId);
  }

  private async ensureQuestions(params: {
    level: string;
    topic: string;
    limit: number;
  }) {
    const existed = await this.prismaService.listeningQuestion.count({
      where: {
        isActive: true,
        level: params.level,
        topic: params.topic,
      },
    });

    if (existed >= params.limit) return;

    const generated = await this.generateQuestionsByGemini({
      ...params,
      count: params.limit - existed,
    });

    const fallback =
      generated.length > 0
        ? generated
        : this.buildFallbackQuestions(params.level, params.topic, params.limit);

    const existedQuestions = await this.prismaService.listeningQuestion.findMany({
      where: {
        level: params.level,
        topic: params.topic,
      },
      select: { question: true },
    });

    const existedSet = new Set(
      existedQuestions.map((item) => item.question.trim().toLowerCase()),
    );

    const valid = fallback
      .filter((item) => this.isValidQuestion(item))
      .filter((item) => {
        const key = item.question!.trim().toLowerCase();
        if (existedSet.has(key)) return false;
        existedSet.add(key);
        return true;
      })
      .slice(0, params.limit - existed);

    if (!valid.length) return;

    await this.prismaService.listeningQuestion.createMany({
      data: valid.map((item) => ({
        level: params.level,
        topic: params.topic,
        audioUrl: '',
        transcript: item.transcript!,
        question: item.question!,
        options: item.options!,
        correctAnswer: item.correctAnswer!,
        explanation: item.explanation ?? '',
        duration: item.duration ?? 68,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  private async generateQuestionsByGemini(params: {
    level: string;
    topic: string;
    count: number;
  }) {
    const prompt = `
Bạn là hệ thống tạo dữ liệu luyện nghe tiếng Anh.
Hãy tạo ${params.count + 2} câu hỏi luyện nghe cho level ${params.level}, chủ đề "${params.topic}".

Yêu cầu:
- transcript là đoạn hội thoại hoặc độc thoại tự nhiên, 4-6 câu tiếng Anh.
- question hỏi ý chính, chi tiết, suy luận hoặc mục đích nói.
- options gồm đúng 4 đáp án A/B/C/D.
- correctAnswer chỉ là A, B, C hoặc D.
- explanation bằng tiếng Việt ngắn gọn.
- duration là số giây 45-90.
- Không markdown, chỉ trả JSON array.

Format:
[
  {
    "transcript": "Anna: We should reduce plastic waste. Ben: I agree...",
    "question": "What is the main idea of the conversation?",
    "options": [
      { "label": "A", "text": "They are planning a trip." },
      { "label": "B", "text": "They are discussing ways to protect the environment." },
      { "label": "C", "text": "They are buying a new phone." },
      { "label": "D", "text": "They are talking about the weather." }
    ],
    "correctAnswer": "B",
    "explanation": "Cả đoạn nói về cách giảm rác nhựa và bảo vệ môi trường.",
    "duration": 68
  }
]`;

    try {
      const result = await this.geminiService.generateJson(prompt);
      return Array.isArray(result) ? (result as GeneratedListeningQuestion[]) : [];
    } catch (error) {
      console.error('Gemini generate listening error', error);
      return [];
    }
  }

  private async getSessionQuestion(
    userId: string,
    sessionId: string,
    questionId: string,
  ) {
    const session = await this.prismaService.listeningSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập phiên này');
    }

    const question = await this.prismaService.listeningQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    return { session, question };
  }

  private async recalculateSession(sessionId: string) {
    const session = await this.prismaService.listeningSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    const answers = await this.prismaService.listeningSessionAnswer.findMany({
      where: { sessionId },
    });

    const correct = answers.filter((item) => item.isCorrect === true).length;
    const wrong = answers.filter(
      (item) => item.isCorrect === false && !item.isSkipped,
    ).length;
    const skipped = answers.filter((item) => item.isSkipped).length;
    const done = correct + wrong + skipped;
    const percent =
      session.total > 0 ? Math.round((done / session.total) * 100) : 0;

    await this.prismaService.listeningSession.update({
      where: { id: sessionId },
      data: {
        correct,
        wrong,
        skipped,
      },
    });

    return {
      percent,
      correct,
      wrong,
      skipped,
    };
  }

  private toQuestionPayload(question: any, order: number) {
    return {
      id: question.id,
      order,
      level: question.level,
      topic: question.topic,
      audioUrl: question.audioUrl,
      transcript: question.transcript,
      duration: question.duration,
      question: question.question,
      options: question.options,
      answered: false,
      selectedAnswer: null,
      isCorrect: null,
      isSkipped: false,
      isFlagged: false,
      explanation: null,
      correctAnswer: null,
    };
  }

  private isValidQuestion(item: GeneratedListeningQuestion) {
    return (
      Boolean(item.transcript && item.transcript.length > 30) &&
      Boolean(item.question) &&
      Array.isArray(item.options) &&
      item.options.length === 4 &&
      item.options.every((option) => option.label && option.text) &&
      ['A', 'B', 'C', 'D'].includes(item.correctAnswer || '')
    );
  }

  private buildFallbackQuestions(level: string, topic: string, limit: number) {
    const base: GeneratedListeningQuestion[] = [
      {
        transcript:
          'Mia: Our school is starting an environment project this week. Tom: That sounds useful. What will students do? Mia: We will collect plastic bottles and plant small trees behind the library. Tom: Great, I can help after class on Friday.',
        question: 'What is the main idea of the conversation?',
        options: [
          { label: 'A', text: 'They are planning a mountain trip.' },
          { label: 'B', text: 'They are discussing ways to protect the environment.' },
          { label: 'C', text: 'They are buying books for the library.' },
          { label: 'D', text: 'They are talking about the weather.' },
        ],
        correctAnswer: 'B',
        explanation:
          'Hai bạn nói về dự án thu gom chai nhựa và trồng cây để bảo vệ môi trường.',
        duration: 68,
      },
      {
        transcript:
          'Ben: I forgot to bring my reusable bottle today. Anna: You can use the water station near the cafeteria. Ben: Good idea. I want to stop buying plastic bottles every day. Anna: Small habits can make a big difference.',
        question: 'What does Ben want to change?',
        options: [
          { label: 'A', text: 'He wants to buy more snacks.' },
          { label: 'B', text: 'He wants to stop buying plastic bottles every day.' },
          { label: 'C', text: 'He wants to move the water station.' },
          { label: 'D', text: 'He wants to eat lunch earlier.' },
        ],
        correctAnswer: 'B',
        explanation:
          'Ben nói rằng cậu ấy muốn ngừng mua chai nhựa mỗi ngày.',
        duration: 62,
      },
      {
        transcript:
          'Teacher: Tomorrow we will listen to a short talk about clean energy. Please write down three key words while you listen. Student: Should we understand every word? Teacher: No, focus on the main ideas first, then details.',
        question: 'What does the teacher advise students to do first?',
        options: [
          { label: 'A', text: 'Focus on the main ideas.' },
          { label: 'B', text: 'Translate every word.' },
          { label: 'C', text: 'Draw a picture.' },
          { label: 'D', text: 'Read the transcript first.' },
        ],
        correctAnswer: 'A',
        explanation:
          'Giáo viên khuyên học sinh nắm ý chính trước, sau đó mới nghe chi tiết.',
        duration: 58,
      },
    ];

    return Array.from({ length: limit }, (_, index) => ({
      ...base[index % base.length],
      question:
        index < base.length
          ? base[index].question
          : `${base[index % base.length].question} (${index + 1})`,
    })).map((item) => ({
      ...item,
      topic,
      level,
    }));
  }
}
