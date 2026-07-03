import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartListeningDto } from './dto/start-listening.dto';
import { SubmitListeningAnswerDto } from './dto/submit-listening-answer.dto';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class ListeningService {
  constructor(
    private prismaService: PrismaService,
    private geminiService: GeminiService,
  ) {}

  async startPractice(userId: string, dto: StartListeningDto) {
    const limit = dto.limit ?? 10;
    const level = dto.level ?? 'A1';
    const topic = dto.topic ?? 'Daily Life';

    // 1. Lấy dữ liệu trong DB
    let questions = await this.prismaService.listeningQuestion.findMany({
      where: {
        isActive: true,
        level,
        topic,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 2. Nếu chưa đủ thì dùng Gemini tạo thêm
    if (questions.length < limit) {
      const needCount = limit - questions.length;

      const prompt = `
Bạn là hệ thống tạo dữ liệu luyện nghe tiếng Anh.

Hãy tạo ${needCount} câu hỏi luyện nghe.

Yêu cầu:

- Level: ${level}
- Topic: ${topic}

Mỗi câu gồm:

- transcript từ 4-6 câu tiếng Anh
- question
- 4 đáp án A,B,C,D
- correctAnswer chỉ là A/B/C/D
- explanation bằng tiếng Việt
- duration (giây)

Chỉ trả về JSON Array.

[
  {
    "level":"${level}",
    "topic":"${topic}",
    "transcript":"...",
    "question":"...",
    "options":[
      {
        "label":"A",
        "text":"..."
      },
      {
        "label":"B",
        "text":"..."
      },
      {
        "label":"C",
        "text":"..."
      },
      {
        "label":"D",
        "text":"..."
      }
    ],
    "correctAnswer":"A",
    "explanation":"...",
    "duration":60
  }
]
`;

      try {
        const generated = await this.geminiService.generateJson(prompt);

        const generatedQuestions = generated as any[];
        if (Array.isArray(generatedQuestions) && generatedQuestions.length) {
          // Các câu hỏi đã có trong DB
          const existed = await this.prismaService.listeningQuestion.findMany({
            where: {
              level,
              topic,
            },
            select: {
              question: true,
            },
          });

          const existedQuestions = new Set(
            existed.map((x) => x.question.trim().toLowerCase()),
          );

          // Validate
          const validQuestions = generatedQuestions.filter((item) => {
            return (
              item.transcript &&
              item.transcript.length > 30 &&
              item.question &&
              Array.isArray(item.options) &&
              item.options.length === 4 &&
              item.options.every((o) => o.label && o.text) &&
              ['A', 'B', 'C', 'D'].includes(item.correctAnswer) &&
              !existedQuestions.has(item.question.trim().toLowerCase())
            );
          });

          if (validQuestions.length) {
            await this.prismaService.listeningQuestion.createMany({
              data: validQuestions.map((item) => ({
                level,
                topic,
                audioUrl: '',
                transcript: item.transcript,
                question: item.question,
                options: item.options,
                correctAnswer: item.correctAnswer,
                explanation: item.explanation ?? '',
                duration: item.duration ?? 60,
                isActive: true,
              })),
            });
          }
        }
      } catch (e) {
        console.error('Gemini generate listening error', e);
      }

      // Load lại dữ liệu sau khi Gemini tạo
      questions = await this.prismaService.listeningQuestion.findMany({
        where: {
          isActive: true,
          level,
          topic,
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    // 3. Nếu vẫn không có dữ liệu
    if (!questions.length) {
      throw new BadRequestException('Không thể tạo dữ liệu luyện nghe.');
    }

    // 4. Tạo session
    const session = await this.prismaService.listeningSession.create({
      data: {
        userId,
        level,
        topic,
        total: questions.length,
        status: 'IN_PROGRESS',
      },
    });

    // 5. Trả dữ liệu
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
      questions: questions.map((q, index) => ({
        id: q.id,
        order: index + 1,
        level: q.level,
        topic: q.topic,
        audioUrl: q.audioUrl,
        duration: q.duration,
        question: q.question,
        options: q.options,
        answered: false,
        selectedAnswer: null,
        isCorrect: null,
        isFlagged: false,
      })),
    };
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    dto: SubmitListeningAnswerDto,
  ) {
    const session = await this.prismaService.listeningSession.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập session này');
    }

    if (session.status === 'COMPLETED') {
      throw new ForbiddenException('Session này đã hoàn thành');
    }

    const question = await this.prismaService.listeningQuestion.findUnique({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }

    const isCorrect =
      dto.selectedAnswer.trim().toUpperCase() ===
      question.correctAnswer.trim().toUpperCase();

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
        selectedAnswer: dto.selectedAnswer,
        isCorrect,
        isSkipped: false,
        timeSpent: dto.timeSpent,
        listenedCount: dto.listenedCount,
      },
      update: {
        selectedAnswer: dto.selectedAnswer,
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
      selectedAnswer: dto.selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation,
      progress,
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
      throw new ForbiddenException('Bạn không có quyền kết thúc session này');
    }

    const answers = await this.prismaService.listeningSessionAnswer.findMany({
      where: { sessionId },
    });

    const correct = answers.filter((x) => x.isCorrect === true).length;
    const wrong = answers.filter(
      (x) => x.isCorrect === false && !x.isSkipped,
    ).length;
    const skipped = answers.filter((x) => x.isSkipped).length;

    const score =
      session.total > 0 ? Math.round((correct / session.total) * 100) : 0;

    const xpEarned = correct * 3;
    const coinsEarned = Math.floor(correct / 2);

    const updatedSession = await this.prismaService.listeningSession.update({
      where: { id: sessionId },
      data: {
        correct,
        wrong,
        skipped,
        score,
        xpEarned,
        coinsEarned,
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

  private async recalculateSession(sessionId: string) {
    const session = await this.prismaService.listeningSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy session');
    }

    const answers = await this.prismaService.listeningSessionAnswer.findMany({
      where: { sessionId },
    });

    const correct = answers.filter((x) => x.isCorrect === true).length;
    const wrong = answers.filter(
      (x) => x.isCorrect === false && !x.isSkipped,
    ).length;
    const skipped = answers.filter((x) => x.isSkipped).length;

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
}
