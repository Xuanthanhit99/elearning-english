import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LearningSkill, MissionV2Action, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import type Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import { ListeningAudioBackfillService } from '../listening-job/listening-audio-backfill.service';
import { ListeningJobService } from '../listening-job/listening-job.service';
import { RateListeningSessionDto } from './dto/rate-listening-session.dto';
import { StartListeningDto } from './dto/start-listening.dto';
import { SubmitListeningAnswerDto } from './dto/submit-listening-answer.dto';
import { ListeningTtsService } from './listening-tts.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { LISTENING_REDIS } from './listening-redis.provider';

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
  private readonly logger = new Logger(ListeningService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly missionV2ProgressService: MissionV2ProgressService,
    private readonly listeningTtsService: ListeningTtsService,
    private readonly learningXp: LearningXpPublisher,
    private readonly listeningJobService: ListeningJobService,
    private readonly listeningAudioBackfillService: ListeningAudioBackfillService,
    @Inject(LISTENING_REDIS) private readonly redis: Redis,
  ) {}

  async getHome(userId: string) {
    const [progress, inProgress, recentSessions] = await Promise.all([
      this.prismaService.userListeningProgress.findUnique({
        where: {
          userId,
        },
      }),
      this.prismaService.listeningSession.findFirst({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        orderBy: {
          startedAt: 'desc',
        },
      }),
      this.prismaService.listeningSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 5,
      }),
    ]);

    const recommendedLevel = progress?.currentLevel ?? 'B1';

    return {
      stats: {
        completedSessions: progress?.completedSessions ?? 0,
        averageAccuracy: progress?.averageAccuracy ?? 0,
        totalListeningTime: progress?.totalListeningTime ?? 0,
        totalListeningTimeText: this.formatDuration(
          progress?.totalListeningTime ?? 0,
        ),
        totalXp: progress?.totalXp ?? 0,
      },
      level: {
        current: recommendedLevel,
        title: this.levelTitle(recommendedLevel),
      },
      streak: {
        current: progress?.currentStreak ?? 0,
        longest: progress?.longestStreak ?? 0,
      },
      continueSession: inProgress
        ? {
            sessionId: inProgress.id,
            level: inProgress.level,
            topic: inProgress.topic,
            total: inProgress.total,
            correct: inProgress.correct,
            wrong: inProgress.wrong,
            skipped: inProgress.skipped,
            progressPercent:
              inProgress.total > 0
                ? Math.round(
                    ((inProgress.correct +
                      inProgress.wrong +
                      inProgress.skipped) /
                      inProgress.total) *
                      100,
                  )
                : 0,
          }
        : null,
      dailyRecommendation: {
        level: recommendedLevel,
        topic: this.getDailyListeningTopic(recommendedLevel),
        limit: 10,
      },
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        level: session.level,
        topic: session.topic,
        score: session.score,
        total: session.total,
        correct: session.correct,
        completedAt: session.completedAt,
      })),
    };
  }

  async getHistory(userId: string, page = 1, limit = 10) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const where = {
      userId,
      status: 'COMPLETED',
    } satisfies Prisma.ListeningSessionWhereInput;

    const [totalItems, sessions] = await Promise.all([
      this.prismaService.listeningSession.count({
        where,
      }),
      this.prismaService.listeningSession.findMany({
        where,
        orderBy: {
          completedAt: 'desc',
        },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));

    return {
      meta: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },
      items: sessions.map((session) => ({
        id: session.id,
        level: session.level,
        topic: session.topic,
        total: session.total,
        correct: session.correct,
        wrong: session.wrong,
        skipped: session.skipped,
        score: session.score,
        xpEarned: session.xpEarned,
        coinsEarned: session.coinsEarned,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      })),
    };
  }

  async startPractice(userId: string, dto: StartListeningDto) {
    const limit = Math.min(Math.max(dto.limit ?? 10, 1), 20);

    const level = dto.level ?? 'B1';
    const topic = dto.topic?.trim() || this.getDailyListeningTopic(level);

    /*
     * Không tạo vô hạn session mới nếu user load lại.
     */
    const existing = await this.prismaService.listeningSession.findFirst({
      where: {
        userId,
        level,
        topic,
        status: 'IN_PROGRESS',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (existing) {
      return this.getSessionPayload(userId, existing.id);
    }

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

    return this.createSessionPayload({
      userId,
      level,
      topic,
      questions,
    });
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

    this.assertSessionEditable(session.status);

    const selectedAnswer = dto.selectedAnswer.trim().toUpperCase();

    const isCorrect =
      selectedAnswer === question.correctAnswer.trim().toUpperCase();

    await this.prismaService.listeningSessionAnswer.update({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: dto.questionId,
        },
      },
      data: {
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
    body: {
      questionId: string;
      timeSpent?: number;
      listenedCount?: number;
    },
  ) {
    const { session } = await this.getSessionQuestion(
      userId,
      sessionId,
      body.questionId,
    );

    this.assertSessionEditable(session.status);

    await this.prismaService.listeningSessionAnswer.update({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: body.questionId,
        },
      },
      data: {
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
    body: {
      questionId: string;
      isFlagged?: boolean;
    },
  ) {
    const { session } = await this.getSessionQuestion(
      userId,
      sessionId,
      body.questionId,
    );

    /*
     * Flag có thể thay đổi cả sau khi hoàn thành để user
     * đánh dấu câu muốn ôn lại.
     */
    const answer = await this.prismaService.listeningSessionAnswer.update({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: body.questionId,
        },
      },
      data: {
        isFlagged: body.isFlagged ?? true,
      },
    });

    return {
      sessionId: session.id,
      questionId: body.questionId,
      isFlagged: answer.isFlagged,
    };
  }

  async finishSession(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);

    if (session.status === 'COMPLETED') {
      return {
        ...this.mapCompletedSession(session),
        alreadyCompleted: true,
        missionUpdated: false,
        resultUrl: `/listening/sessions/${session.id}/result`,
      };
    }

    const answers = await this.prismaService.listeningSessionAnswer.findMany({
      where: {
        sessionId,
      },
    });

    const correct = answers.filter((item) => item.isCorrect === true).length;

    const wrong = answers.filter(
      (item) => item.isCorrect === false && !item.isSkipped,
    ).length;

    const skipped = answers.filter((item) => item.isSkipped).length;

    const score =
      session.total > 0 ? Math.round((correct / session.total) * 100) : 0;

    const xpEarned = correct * 3;
    const coinsEarned = Math.floor(correct / 2);

    const totalTimeSpent = answers.reduce(
      (sum, answer) => sum + Math.max(answer.timeSpent ?? 0, 0),
      0,
    );

    const now = new Date();

    const transactionResult = await this.prismaService.$transaction(
      async (tx) => {
        const completion = await tx.listeningSession.updateMany({
          where: {
            id: sessionId,
            userId,
            status: {
              not: 'COMPLETED',
            },
          },
          data: {
            correct,
            wrong,
            skipped,
            score,
            xpEarned,
            coinsEarned,
            status: 'COMPLETED',
            completedAt: now,
          },
        });

        if (completion.count !== 1) {
          return {
            completedByThisRequest: false,
          };
        }

        const currentProgress = await tx.userListeningProgress.findUnique({
          where: {
            userId,
          },
        });

        const previousCompleted = currentProgress?.completedSessions ?? 0;

        const nextCompleted = previousCompleted + 1;

        const nextAverage = Math.round(
          ((currentProgress?.averageAccuracy ?? 0) * previousCompleted +
            score) /
            Math.max(nextCompleted, 1),
        );

        const streak = this.calculateStreak(
          currentProgress?.lastStudyDate ?? null,
          currentProgress?.currentStreak ?? 0,
          currentProgress?.longestStreak ?? 0,
          now,
        );

        const nextXp = (currentProgress?.totalXp ?? 0) + xpEarned;

        await tx.userListeningProgress.upsert({
          where: {
            userId,
          },
          update: {
            currentLevel: this.resolveLevel(nextXp),
            totalXp: {
              increment: xpEarned,
            },
            completedSessions: {
              increment: 1,
            },
            totalListeningTime: {
              increment: totalTimeSpent,
            },
            averageAccuracy: nextAverage,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastStudyDate: now,
          },
          create: {
            userId,
            currentLevel: this.resolveLevel(xpEarned),
            totalXp: xpEarned,
            completedSessions: 1,
            totalListeningTime: totalTimeSpent,
            averageAccuracy: score,
            currentStreak: 1,
            longestStreak: 1,
            lastStudyDate: now,
          },
        });

        /*
         * Đồng bộ reward vào Pet/Wallet hiện có.
         * Nếu schema của bạn dùng model khác, đổi riêng block này.
         */
        await tx.petProfile.upsert({
          where: {
            userId,
          },
          update: {
            xp: {
              increment: xpEarned,
            },
            coins: {
              increment: coinsEarned,
            },
          },
          create: {
            userId,
            petType: 'fox',
            petName: 'Foxy',
            isChosen: true,
            xp: xpEarned,
            coins: coinsEarned,
          },
        });

        return {
          completedByThisRequest: true,
        };
      },
    );

    if (!transactionResult.completedByThisRequest) {
      const completed = await this.getOwnedSession(userId, sessionId);

      return {
        ...this.mapCompletedSession(completed),
        alreadyCompleted: true,
        missionUpdated: false,
        resultUrl: `/listening/sessions/${completed.id}/result`,
      };
    }

    const studiedMinutes = Math.max(1, Math.ceil(totalTimeSpent / 60));

    /*
     * Không trả Mission/XP nếu user finish mà chưa trả lời/skip câu
     * nào (gọi finish ngay sau start). Tránh farm reward bằng session rỗng.
     * Session vẫn được đánh dấu COMPLETED (đã commit ở transaction trên)
     * để không bị kẹt IN_PROGRESS mãi, nhưng không phát thưởng.
     */
    const attempted = correct + wrong + skipped;

    const missionUpdated =
      attempted > 0
        ? await this.updateListeningMissions({
            userId,
            sessionId,
            score,
            studiedMinutes,
          })
        : false;

    const completed = await this.getOwnedSession(userId, sessionId);

    if (attempted > 0) {
      try {
        await this.learningXp.publish({
          activity: 'LISTENING_COMPLETED',
          userId,
          sourceId: completed.id,
          score: completed.score,
          completionRate: completed.score,
          metadata: {
            sessionId: completed.id,
            topic: completed.topic,
            level: completed.level,
            totalQuestions: completed.total,
            correctAnswers: completed.correct,
            wrongAnswers: completed.wrong,
            skippedAnswers: completed.skipped,
            xpEarned: completed.xpEarned,
            coinsEarned: completed.coinsEarned,
          },
        });
      } catch (error) {
        this.logger.error(
          `Listening XP publish failed: ${completed.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    } else {
      this.logger.warn(
        `Listening session finished with zero attempted questions, reward skipped: ${completed.id}`,
      );
    }

    return {
      ...this.mapCompletedSession(completed),
      alreadyCompleted: false,
      missionUpdated,
      resultUrl: `/listening/sessions/${completed.id}/result`,
    };
  }

  async getSessionResult(userId: string, sessionId: string) {
    const session = await this.prismaService.listeningSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        answer: {
          include: {
            question: true,
          },
          orderBy: {
            answeredAt: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    if (session.status !== 'COMPLETED') {
      throw new BadRequestException('Phiên luyện nghe chưa hoàn thành');
    }

    const totalTimeSpent = session.answer.reduce(
      (sum, answer) => sum + Math.max(answer.timeSpent ?? 0, 0),
      0,
    );

    return {
      summary: {
        sessionId: session.id,
        level: session.level,
        topic: session.topic,
        totalQuestions: session.total,
        correct: session.correct,
        wrong: session.wrong,
        skipped: session.skipped,
        score: session.score,
        accuracy: session.score,
        xpEarned: session.xpEarned,
        coinsEarned: session.coinsEarned,
        totalTimeSpent,
        totalTimeText: this.formatDuration(totalTimeSpent),
        completedAt: session.completedAt,
        rating: session.rating ?? null,
        ratingComment: session.ratingComment ?? null,
        ratedAt: session.ratedAt ?? null,
      },
      questions: session.answer.map((answer, index) => ({
        id: answer.questionId,
        order: index + 1,
        question: answer.question.question,
        options: answer.question.options,
        audioUrl: answer.question.audioUrl,
        transcript: answer.question.transcript,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: answer.question.correctAnswer,
        isCorrect: answer.isCorrect,
        isSkipped: answer.isSkipped,
        isFlagged: answer.isFlagged,
        explanation: answer.question.explanation,
        listenedCount: answer.listenedCount,
        timeSpent: answer.timeSpent,
      })),
      feedback: this.buildFeedback(
        session.score,
        session.correct,
        session.wrong,
        session.skipped,
      ),
    };
  }

  async retrySession(userId: string, sessionId: string) {
    const session = await this.getOwnedSession(userId, sessionId);

    const answers = await this.prismaService.listeningSessionAnswer.findMany({
      where: {
        sessionId,
      },
      include: {
        question: true,
      },
      orderBy: {
        answeredAt: 'asc',
      },
    });

    const questions = answers.map((answer) => answer.question).filter(Boolean);

    if (!questions.length) {
      throw new NotFoundException('Không tìm thấy câu hỏi của bài luyện nghe');
    }

    return this.createSessionPayload({
      userId,
      level: session.level || 'B1',
      topic:
        session.topic || this.getDailyListeningTopic(session.level || 'B1'),
      questions: questions.slice(0, session.total || 10),
    });
  }

  async rateSession(
    userId: string,
    sessionId: string,
    body: RateListeningSessionDto,
  ) {
    const session = await this.getOwnedSession(userId, sessionId);

    /*
     * Chỉ cho rate khi bài đã hoàn thành, tránh rating một session
     * đang IN_PROGRESS (session có thể còn thay đổi kết quả).
     */
    if (session.status !== 'COMPLETED') {
      throw new ForbiddenException(
        'Chỉ có thể đánh giá sau khi hoàn thành bài luyện nghe',
      );
    }

    const rating = Math.max(
      1,
      Math.min(5, Math.round(Number(body.rating) || 0)),
    );

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

    const previousAnswers =
      await this.prismaService.listeningSessionAnswer.findMany({
        where: {
          sessionId,
        },
        include: {
          question: true,
        },
        orderBy: {
          answeredAt: 'asc',
        },
      });

    const wrongQuestions = previousAnswers
      .filter((answer) => answer.isCorrect === false)
      .map((answer) => answer.question)
      .filter(Boolean)
      .slice(0, limit);

    const freshNeed = Math.max(0, limit - wrongQuestions.length);

    const usedQuestionIds = await this.getUsedQuestionIdsToday(
      userId,
      level,
      topic,
    );

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

    return this.createSessionPayload({
      userId,
      level,
      topic,
      questions: [...wrongQuestions, ...freshQuestions].slice(0, limit),
    });
  }

  private async getSessionPayload(userId: string, sessionId: string) {
    const session = await this.prismaService.listeningSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        answer: {
          include: {
            question: true,
          },
          orderBy: {
            question: {
              createdAt: 'asc',
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    return {
      sessionId: session.id,
      level: session.level,
      topic: session.topic,
      totalQuestions: session.total,
      currentQuestionIndex: Math.min(
        session.correct + session.wrong + session.skipped + 1,
        session.total,
      ),
      progress: {
        percent:
          session.total > 0
            ? Math.round(
                ((session.correct + session.wrong + session.skipped) /
                  session.total) *
                  100,
              )
            : 0,
        correct: session.correct,
        wrong: session.wrong,
        skipped: session.skipped,
      },
      questions: session.answer.map((answer, index) => {
        const revealed = answer.selectedAnswer !== null || answer.isSkipped;

        return {
          ...this.toQuestionPayload(answer.question, index + 1),
          answered: revealed,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
          isSkipped: answer.isSkipped,
          isFlagged: answer.isFlagged,
          /*
           * BẢO MẬT: transcript/explanation/correctAnswer chỉ được trả
           * về sau khi câu hỏi đã được trả lời hoặc skip. Trước đó
           * toQuestionPayload() không còn set các field này (xem dưới),
           * nên FE không nhận được đáp án/ngữ liệu trước khi submit.
           */
          transcript: revealed ? answer.question.transcript : null,
          explanation: revealed ? answer.question.explanation : null,
          correctAnswer: revealed ? answer.question.correctAnswer : null,
        };
      }),
    };
  }

  private async createSessionPayload(params: {
    userId: string;
    level: string;
    topic: string;
    questions: any[];
  }) {
    let session: { id: string };

    try {
      session = await this.prismaService.listeningSession.create({
        data: {
          userId: params.userId,
          level: params.level,
          topic: params.topic,
          total: params.questions.length,
          status: 'IN_PROGRESS',
        },
      });
    } catch (error) {
      /*
       * Race condition: 2 request start() đồng thời cùng
       * (userId, level, topic) có thể cùng đi qua check "existing IN_PROGRESS"
       * (không thấy gì) rồi cùng insert. Sau khi migration
       * 20260719120000_add_listening_active_session_unique được apply,
       * request thua cuộc sẽ nhận P2002 ở đây thay vì tạo session trùng.
       * Xử lý: coi request thua là "resume" session vừa được request kia
       * tạo, KHÔNG throw lỗi cho user.
       *
       * Lưu ý: nếu migration trên CHƯA được apply (xem mục Prisma
       * Migration Status trong report), catch này sẽ không bao giờ
       * trigger vì DB chưa có unique index — hành vi giữ nguyên như cũ,
       * không có gì bị phá vỡ.
       */
      if (this.isUniqueConstraintError(error)) {
        const existing = await this.prismaService.listeningSession.findFirst({
          where: {
            userId: params.userId,
            level: params.level,
            topic: params.topic,
            status: 'IN_PROGRESS',
          },
          orderBy: {
            startedAt: 'desc',
          },
        });

        if (existing) {
          return this.getSessionPayload(params.userId, existing.id);
        }
      }

      throw error;
    }

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

    return this.getSessionPayload(params.userId, session.id);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private async getOwnedSession(userId: string, sessionId: string) {
    const session = await this.prismaService.listeningSession.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập phiên này');
    }

    return session;
  }

  private async getSessionQuestion(
    userId: string,
    sessionId: string,
    questionId: string,
  ) {
    const session = await this.getOwnedSession(userId, sessionId);

    const sessionAnswer =
      await this.prismaService.listeningSessionAnswer.findUnique({
        where: {
          sessionId_questionId: {
            sessionId,
            questionId,
          },
        },
        include: {
          question: true,
        },
      });

    if (!sessionAnswer?.question) {
      throw new NotFoundException('Câu hỏi không thuộc phiên luyện nghe này');
    }

    return {
      session,
      question: sessionAnswer.question,
    };
  }

  private assertSessionEditable(status: string) {
    if (status === 'COMPLETED') {
      throw new ForbiddenException('Bài luyện nghe này đã hoàn thành');
    }
  }

  private async recalculateSession(sessionId: string) {
    const session = await this.prismaService.listeningSession.findUnique({
      where: {
        id: sessionId,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nghe');
    }

    const answers = await this.prismaService.listeningSessionAnswer.findMany({
      where: {
        sessionId,
      },
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
      where: {
        id: sessionId,
      },
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

  private async updateListeningMissions(input: {
    userId: string;
    sessionId: string;
    score: number;
    studiedMinutes: number;
  }) {
    try {
      await this.missionV2ProgressService.increase({
        userId: input.userId,
        action: MissionV2Action.LISTEN_AUDIO,
        amount: 1,
        skill: LearningSkill.LISTENING,
      });

      await this.missionV2ProgressService.increase({
        userId: input.userId,
        action: MissionV2Action.COMPLETE_LESSON,
        amount: 1,
        skill: LearningSkill.LISTENING,
      });

      await this.missionV2ProgressService.increase({
        userId: input.userId,
        action: MissionV2Action.STUDY_LESSON,
        amount: 1,
        skill: LearningSkill.LISTENING,
      });

      if (input.score >= 50) {
        await this.missionV2ProgressService.increase({
          userId: input.userId,
          action: MissionV2Action.COMPLETE_QUIZ,
          amount: 1,
          skill: LearningSkill.LISTENING,
          quizId: input.sessionId,
        });
      }

      await this.missionV2ProgressService.increase({
        userId: input.userId,
        action: MissionV2Action.STUDY_MINUTES,
        amount: input.studiedMinutes,
        studyMinutes: input.studiedMinutes,
        skill: LearningSkill.LISTENING,
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Cập nhật Listening Mission thất bại, session=${input.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return false;
    }
  }

  private mapCompletedSession(session: any) {
    return {
      sessionId: session.id,
      totalQuestions: session.total,
      correct: session.correct,
      wrong: session.wrong,
      skipped: session.skipped,
      score: session.score,
      xpEarned: session.xpEarned,
      coinsEarned: session.coinsEarned,
      status: session.status,
      completedAt: session.completedAt,
    };
  }

  private buildFeedback(
    score: number,
    correct: number,
    wrong: number,
    skipped: number,
  ) {
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (score >= 80) {
      strengths.push('Bạn nắm ý chính và chi tiết nghe khá tốt.');
    } else if (score >= 50) {
      strengths.push('Bạn đã hiểu được phần lớn nội dung chính.');
      improvements.push('Hãy nghe lại các câu sai và chú ý từ khóa.');
    } else {
      improvements.push('Nên nghe từng đoạn ngắn và ghi lại từ khóa chính.');
    }

    if (skipped > 0) {
      improvements.push(
        `Bạn đã bỏ qua ${skipped} câu. Hãy ôn lại các câu này.`,
      );
    }

    if (wrong > correct) {
      improvements.push(
        'Hãy luyện phân biệt các đáp án có từ khóa gần giống nhau.',
      );
    }

    return {
      strengths,
      improvements,
    };
  }

  private calculateStreak(
    lastStudyDate: Date | null,
    currentStreak: number,
    longestStreak: number,
    now: Date,
  ) {
    if (!lastStudyDate) {
      return {
        currentStreak: 1,
        longestStreak: Math.max(longestStreak, 1),
      };
    }

    const last = this.startOfDay(lastStudyDate);
    const today = this.startOfDay(now);

    const differenceDays = Math.floor(
      (today.getTime() - last.getTime()) / 86_400_000,
    );

    const nextCurrent =
      differenceDays <= 0
        ? Math.max(currentStreak, 1)
        : differenceDays === 1
          ? Math.max(currentStreak, 0) + 1
          : 1;

    return {
      currentStreak: nextCurrent,
      longestStreak: Math.max(longestStreak, nextCurrent),
    };
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private resolveLevel(totalXp: number) {
    if (totalXp >= 2000) return 'C2';
    if (totalXp >= 1500) return 'C1';
    if (totalXp >= 1000) return 'B2';
    if (totalXp >= 600) return 'B1';
    if (totalXp >= 400) return 'A2';
    return 'A1';
  }

  private levelTitle(level: string) {
    const titles: Record<string, string> = {
      A1: 'Beginner',
      A2: 'Elementary',
      B1: 'Intermediate',
      B2: 'Upper Intermediate',
      C1: 'Advanced',
      C2: 'Proficient',
    };

    return titles[level] ?? level;
  }

  private formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;

    if (minutes < 60) {
      return `${minutes}m ${remain}s`;
    }

    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
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

  /**
   * Stage 6D.1: KHÔNG còn gọi Gemini/TTS đồng bộ không giới hạn trong
   * request user. Chiến lược mới:
   *  - Nếu đã đủ câu hỏi active: chỉ enqueue backfill audio async (nếu
   *    có câu thiếu audioUrl), KHÔNG chờ, KHÔNG gọi TTS ở đây.
   *  - Nếu thiếu câu hỏi nhưng đã có sẵn ít nhất 1 câu (existed > 0):
   *    enqueue job sinh thêm (async, chạy nền), request hiện tại phục
   *    vụ với số câu đang có (ít hơn `limit` yêu cầu) thay vì block.
   *  - Nếu hoàn toàn chưa có câu nào cho (level, topic) — cold start —
   *    mới cho phép một fallback đồng bộ GIỚI HẠN NGHIÊM NGẶT
   *    (tối đa `COLD_START_FALLBACK_CAP` = 3 câu, 1 lần gọi Gemini,
   *    tối đa 3 lần gọi TTS), có cooldown để tránh nhiều request đồng
   *    thời cùng trigger fallback lặp lại.
   */
  private static readonly COLD_START_FALLBACK_CAP = 3;
  private static readonly COLD_START_LOCK_TTL_SECONDS = 60;

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

    const shortfall = Math.max(0, params.limit - existed);

    if (shortfall === 0) {
      this.enqueueMissingAudioAsync(params.level, params.topic);
      return;
    }

    /*
     * Luôn enqueue job sinh dữ liệu bất đồng bộ cho phần thiếu, dù có
     * dùng fallback đồng bộ bên dưới hay không — đây là nguồn bổ sung
     * dữ liệu chính thức (BullMQ, có validate/hash/dedupe riêng, xem
     * ListeningJobProcessor). jobId ổn định theo ngày nên nhiều request
     * cùng lúc không tạo nhiều job trùng.
     */
    this.enqueueShortfallAsync(params.level, params.topic, shortfall);

    if (existed > 0) {
      /*
       * Đã có sẵn dữ liệu (dù chưa đủ `limit`) — phục vụ ngay với số
       * câu hiện có, không block request chờ sinh thêm.
       */
      return;
    }

    await this.coldStartSynchronousFallback(params.level, params.topic);
  }

  private enqueueShortfallAsync(level: string, topic: string, count: number) {
    const jobDate = new Date().toISOString().slice(0, 10);
    const jobId = `listening-shortfall-${level}-${this.slugify(topic)}-${jobDate}`;

    this.listeningJobService
      .enqueueGeneration({
        totalNeed: Math.min(count, 50),
        batchSize: Math.min(count, 5) || 1,
        configs: [{ level, topic }],
        jobId,
      })
      .catch((error) => {
        this.logger.error(
          `Enqueue Listening shortfall generation failed: level=${level}, topic=${topic}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  private enqueueMissingAudioAsync(level: string, topic: string) {
    this.listeningAudioBackfillService
      .enqueueMissingAudio(10)
      .catch((error) => {
        this.logger.error(
          `Enqueue Listening audio backfill failed: level=${level}, topic=${topic}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  /**
   * Stage 6D.3: SỬA LỖI HIGH từ 6D.1/6D.2 — cooldown trước đây dùng
   * `Map` in-memory trên instance service, chỉ đúng khi chạy 1
   * backend process. Nhiều replica sẽ có `Map` riêng, mất tác dụng
   * giới hạn chung. Giờ dùng Redis `SET key value NX EX ttl` — atomic
   * thật (không tách GET-rồi-SET), TTL đúng 60 giây theo rule cũ,
   * dùng chung Redis instance của backend.
   *
   * Key không dùng trực tiếp `topic` (free text người dùng nhập qua
   * `StartListeningDto.topic`) mà qua `slugify()` + hash nếu quá dài,
   * để không đưa raw user input thẳng vào Redis key namespace.
   */
  private coldStartLockKey(level: string, topic: string): string {
    const slug = this.slugify(topic) || 'unknown';
    const scopedTopic =
      slug.length > 60
        ? createHash('sha1').update(slug).digest('hex').slice(0, 16)
        : slug;

    return `listening:cold-start-lock:${level}:${scopedTopic}`;
  }

  private async tryAcquireColdStartLock(
    level: string,
    topic: string,
  ): Promise<boolean> {
    const key = this.coldStartLockKey(level, topic);

    try {
      const result = await this.redis.set(
        key,
        '1',
        'EX',
        ListeningService.COLD_START_LOCK_TTL_SECONDS,
        'NX',
      );

      return result === 'OK';
    } catch (error) {
      /*
       * Redis lỗi/unavailable: KHÔNG cho phép fallback chạy (an toàn
       * = deny, không phải allow) để tránh nhiều instance cùng lúc
       * không có gì chặn lại và cùng gọi Gemini/TTS không giới hạn.
       * Job async (enqueueShortfallAsync) vẫn hoạt động bình thường
       * vì không phụ thuộc Redis lock này (BullMQ tự có Redis riêng
       * và dedupe theo jobId).
       */
      this.logger.error(
        `Listening cold-start Redis lock check failed (treat as NOT acquired): level=${level}, topic=${topic}`,
        error instanceof Error ? error.stack : String(error),
      );

      return false;
    }
  }

  private async coldStartSynchronousFallback(level: string, topic: string) {
    const acquired = await this.tryAcquireColdStartLock(level, topic);

    if (!acquired) {
      this.logger.warn(
        `Listening cold start fallback skipped (lock not acquired: cooldown active, another instance running, or Redis unavailable): level=${level}, topic=${topic}`,
      );
      return;
    }

    const cap = ListeningService.COLD_START_FALLBACK_CAP;

    this.logger.warn(
      `Listening cold start fallback triggered: level=${level}, topic=${topic}, cap=${cap}`,
    );

    const generated = await this.generateQuestionsByGemini({
      level,
      topic,
      count: cap,
    });

    const fallback =
      generated.length > 0
        ? generated
        : this.buildFallbackQuestions(level, topic, cap);

    const existedQuestions =
      await this.prismaService.listeningQuestion.findMany({
        where: {
          level,
          topic,
        },
        select: {
          question: true,
        },
      });

    const existedSet = new Set(
      existedQuestions.map((item) => item.question.trim().toLowerCase()),
    );

    const valid = fallback
      .filter((item) => this.isValidQuestion(item))
      .filter((item) => {
        const key = item.question!.trim().toLowerCase();

        if (existedSet.has(key)) {
          return false;
        }

        existedSet.add(key);
        return true;
      })
      .slice(0, cap);

    for (const item of valid) {
      const audioUrl = await this.listeningTtsService.createAudioFromTranscript(
        item.transcript!,
      );

      await this.prismaService.listeningQuestion.create({
        data: {
          level,
          topic,
          audioUrl: audioUrl ?? '',
          transcript: item.transcript!,
          question: item.question!,
          options: item.options!,
          correctAnswer: item.correctAnswer!,
          explanation: item.explanation ?? '',
          duration: item.duration ?? 68,
          isActive: true,
        },
      });
    }

    this.logger.log(
      `Listening cold start fallback done: level=${level}, topic=${topic}, created=${valid.length}`,
    );
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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

      return Array.isArray(result)
        ? (result as GeneratedListeningQuestion[])
        : [];
    } catch (error) {
      this.logger.error(
        'Gemini generate listening error',
        error instanceof Error ? error.stack : String(error),
      );

      return [];
    }
  }

  private toQuestionPayload(question: any, order: number) {
    return {
      id: question.id,
      order,
      level: question.level,
      topic: question.topic,
      audioUrl: question.audioUrl,
      /*
       * BẢO MẬT (Stage 6D.1): transcript là ngữ liệu có thể lộ đáp án
       * (câu hỏi hỏi ý chính/chi tiết của transcript). Mặc định null ở
       * đây; getSessionPayload() sẽ set lại transcript thật khi câu
       * hỏi đã answered/skipped. submitAnswer()/skipQuestion() response
       * (gọi riêng, không qua hàm này) vẫn trả transcript ngay sau khi
       * trả lời vì lúc đó user đã hoàn tất câu đó.
       */
      transcript: null,
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
          {
            label: 'A',
            text: 'They are planning a mountain trip.',
          },
          {
            label: 'B',
            text: 'They are discussing ways to protect the environment.',
          },
          {
            label: 'C',
            text: 'They are buying books for the library.',
          },
          {
            label: 'D',
            text: 'They are talking about the weather.',
          },
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
          {
            label: 'A',
            text: 'He wants to buy more snacks.',
          },
          {
            label: 'B',
            text: 'He wants to stop buying plastic bottles every day.',
          },
          {
            label: 'C',
            text: 'He wants to move the water station.',
          },
          {
            label: 'D',
            text: 'He wants to eat lunch earlier.',
          },
        ],
        correctAnswer: 'B',
        explanation: 'Ben nói rằng cậu ấy muốn ngừng mua chai nhựa mỗi ngày.',
        duration: 62,
      },
      {
        transcript:
          'Teacher: Tomorrow we will listen to a short talk about clean energy. Please write down three key words while you listen. Student: Should we understand every word? Teacher: No, focus on the main ideas first, then details.',
        question: 'What does the teacher advise students to do first?',
        options: [
          {
            label: 'A',
            text: 'Focus on the main ideas.',
          },
          {
            label: 'B',
            text: 'Translate every word.',
          },
          {
            label: 'C',
            text: 'Draw a picture.',
          },
          {
            label: 'D',
            text: 'Read the transcript first.',
          },
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
    }));
  }
}
