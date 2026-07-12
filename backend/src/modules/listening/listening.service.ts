import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LearningSkill, MissionV2Action, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import { StartListeningDto } from './dto/start-listening.dto';
import { SubmitListeningAnswerDto } from './dto/submit-listening-answer.dto';
import { ListeningTtsService } from './listening-tts.service';

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

    const missionUpdated = await this.updateListeningMissions({
      userId,
      sessionId,
      score,
      studiedMinutes,
    });

    const completed = await this.getOwnedSession(userId, sessionId);

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
    body: {
      rating: number;
      comment?: string;
    },
  ) {
    const session = await this.getOwnedSession(userId, sessionId);

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
      questions: session.answer.map((answer, index) => ({
        ...this.toQuestionPayload(answer.question, index + 1),
        answered: answer.selectedAnswer !== null || answer.isSkipped,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        isSkipped: answer.isSkipped,
        isFlagged: answer.isFlagged,
        explanation:
          answer.selectedAnswer !== null || answer.isSkipped
            ? answer.question.explanation
            : null,
        correctAnswer:
          answer.selectedAnswer !== null || answer.isSkipped
            ? answer.question.correctAnswer
            : null,
      })),
    };
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

    return this.getSessionPayload(params.userId, session.id);
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

    if (existed >= params.limit) {
      await this.ensureMissingAudio(params.level, params.topic);

      return;
    }

    const generated = await this.generateQuestionsByGemini({
      ...params,
      count: params.limit - existed,
    });

    const fallback =
      generated.length > 0
        ? generated
        : this.buildFallbackQuestions(params.level, params.topic, params.limit);

    const existedQuestions =
      await this.prismaService.listeningQuestion.findMany({
        where: {
          level: params.level,
          topic: params.topic,
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
      .slice(0, params.limit - existed);

    for (const item of valid) {
      const audioUrl = await this.listeningTtsService.createAudioFromTranscript(
        item.transcript!,
      );

      await this.prismaService.listeningQuestion.create({
        data: {
          level: params.level,
          topic: params.topic,
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
  }

  private async ensureMissingAudio(level: string, topic: string) {
    const questions = await this.prismaService.listeningQuestion.findMany({
      where: {
        level,
        topic,
        isActive: true,
        OR: [
          {
            audioUrl: '',
          },
          {
            audioUrl: '',
          },
        ],
      },
      take: 10,
    });

    for (const question of questions) {
      if (!question.transcript) {
        continue;
      }
      const audioUrl = await this.listeningTtsService.createAudioFromTranscript(
        question.transcript,
      );

      if (!audioUrl) {
        continue;
      }

      await this.prismaService.listeningQuestion.update({
        where: {
          id: question.id,
        },
        data: {
          audioUrl,
        },
      });
    }
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
       * Không trả transcript trước khi answer ở UI production.
       * Hiện vẫn giữ trong payload để tương thích frontend cũ.
       */
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
