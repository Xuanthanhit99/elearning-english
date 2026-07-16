import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateLearningProfileDto } from './dto/update-learning-profile.dto';
import {
  LearningSkill,
  MissionV2Action,
  MissionV2Status,
  PlacementResultStatus,
  Prisma,
  WordProgressStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { SubmitWeeklyTestDto } from './dto/submit-weekly-test.dto';
import { GeminiService } from '../gemini/gemini.service';
import { VocabularyJobService } from '../vocabulary-job/vocabulary-job.service';

import {
  buildAnswer,
  buildOptions,
  buildQuestion,
  pickQuestionType,
} from 'src/common/helpers/questions.helper';
import { SubmitReviewSessionDto } from './dto/review-session-answer.dto';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';

type GeminiWordItem = {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaningVi?: string;
  meaningEn?: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  difficulty?: number;
};

@Injectable()
export class VocabularyService {
  constructor(
    private prisma: PrismaService,
    private geminiService: GeminiService,
    private vocabularyJobService: VocabularyJobService,
    private readonly missionV2ProgressService: MissionV2ProgressService,
    private readonly learningXp: LearningXpPublisher,
  ) {}

  private isLockedPlan(plan: any): plan is {
    locked: true;
    reason: string;
    testRequired: boolean;
    previousTest: any;
  } {
    return !!plan && plan.locked === true;
  }

  private hasDays(plan: any): plan is { id: string; days: any[] } {
    return !!plan && Array.isArray(plan.days);
  }

  async getTopics() {
    return this.prisma.wordTopic.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createTopic(dto: CreateTopicDto) {
    return this.prisma.wordTopic.create({
      data: dto,
    });
  }

  async createWord(dto: CreateWordDto) {
    return this.prisma.word.create({
      data: {
        ...dto,
        word: dto.word.toLowerCase().trim(),
        difficulty: dto.difficulty || 1,
        source: 'ADMIN',
      },
    });
  }

  async getOrCreateProfile(userId: string) {
    return this.prisma.userLearningProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        level: 'A1',
        dailyWordTarget: 10,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateLearningProfileDto) {
    await this.getOrCreateProfile(userId);

    return this.prisma.userLearningProfile.update({
      where: { userId },
      data: dto,
    });
  }

  getWeekRange() {
    const now = new Date();
    const day = now.getDay(); // 0 CN, 1 T2
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  }

  shuffle<T>(arr: T[]) {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  private getDefaultTopicNames() {
    return [
      'Environment',
      'Daily life',
      'Travel',
      'Business',
      'Health',
      'Technology',
      'Conversation',
      'Education',
      'Work',
      'Shopping',
      'Sports',
      'Culture',
      'Entertainment',
      'Science',
      'Money',
      'Housing',
      'Transportation',
      'Relationships',
      'Hobbies',
      'Nature',
      'News',
      'Internet',
      'Cooking',
      'Music',
      'Movies',
      'Clothes',
      'Feelings',
      'Safety',
      'Government',
      'Art',
      'Books',
      'Cities',
      'Countryside',
      'Career',
      'Pets',
      'Festivals',
    ];
  }

  async ensureFallbackTopics() {
    const names = this.getDefaultTopicNames();
    const topics: Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      icon: string | null;
      color: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (const name of names) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const topic = await this.prisma.wordTopic.upsert({
        where: { slug },
        update: {},
        create: {
          name,
          slug,
          description: `Fallback vocabulary topic: ${name}`,
        },
      });
      topics.push(topic);
    }

    return topics;
  }

  async ensureWeeklyPoolHasTopics(poolId: string, level: string) {
    const pool = await this.prisma.weeklyTopicPool.findUnique({
      where: { id: poolId },
      include: { topics: true },
    });

    if (!pool) {
      throw new NotFoundException('Không tìm thấy weekly topic pool');
    }

    const existingIds = new Set(pool.topics.map((item) => item.topicId));

    if (existingIds.size >= 7) {
      return pool;
    }

    let candidateTopics = await this.prisma.wordTopic.findMany({
      where: {
        id: { notIn: [...existingIds] },
        words: {
          some: {
            level,
          },
        },
      },
      take: 7 - existingIds.size,
    });

    if (existingIds.size + candidateTopics.length < 7) {
      await this.ensureFallbackTopics();

      candidateTopics = await this.prisma.wordTopic.findMany({
        where: {
          id: { notIn: [...existingIds] },
        },
        orderBy: { name: 'asc' },
        take: 7 - existingIds.size,
      });
    }

    const itemsToCreate = candidateTopics
      .slice(0, 7 - existingIds.size)
      .map((topic, index) => ({
        poolId,
        topicId: topic.id,
        order: existingIds.size + index + 1,
      }));

    if (itemsToCreate.length) {
      await this.prisma.weeklyTopicPoolItem.createMany({
        data: itemsToCreate,
        skipDuplicates: true,
      });
    }

    return this.prisma.weeklyTopicPool.findUnique({
      where: { id: poolId },
      include: { topics: true },
    });
  }

  private async getUsedTopicIdsBeforeWeek(userId: string, weekStart: Date) {
    const usedDays = await this.prisma.userDailyVocabularyPlan.findMany({
      where: {
        plan: {
          userId,
          weekStart: {
            lt: weekStart,
          },
        },
      },
      select: {
        topicId: true,
      },
      distinct: ['topicId'],
    });

    return usedDays.map((day) => day.topicId);
  }

  private async getFreshTopicsForUser(params: {
    userId: string;
    level: string;
    weekStart: Date;
    poolTopics: Array<{ topicId: string; order: number }>;
    count: number;
  }) {
    await this.ensureFallbackTopics();

    const usedTopicIds = await this.getUsedTopicIdsBeforeWeek(
      params.userId,
      params.weekStart,
    );
    const usedTopicSet = new Set(usedTopicIds);
    const selected = new Map<string, { topicId: string; order: number }>();

    for (const item of this.shuffle(params.poolTopics)) {
      if (!usedTopicSet.has(item.topicId)) {
        selected.set(item.topicId, item);
      }
      if (selected.size >= params.count) break;
    }

    if (selected.size < params.count) {
      const extraTopics = await this.prisma.wordTopic.findMany({
        where: {
          id: {
            notIn: [...usedTopicIds, ...selected.keys()],
          },
        },
        orderBy: { createdAt: 'asc' },
        take: params.count - selected.size,
      });

      for (const [index, topic] of extraTopics.entries()) {
        selected.set(topic.id, {
          topicId: topic.id,
          order: selected.size + index + 1,
        });
      }
    }

    if (selected.size < params.count) {
      throw new BadRequestException(
        'Chưa đủ chủ đề mới cho người dùng trong tuần này',
      );
    }

    return [...selected.values()].slice(0, params.count);
  }

  async ensureFallbackWords(topicId: string, level: string, limit: number) {
    const words = [
      ['environment', 'môi trường', 'We should protect the environment.'],
      ['recycle', 'tái chế', 'I recycle paper and bottles.'],
      ['pollution', 'ô nhiễm', 'Pollution is harmful to health.'],
      ['conserve', 'bảo tồn', 'We conserve water every day.'],
      ['climate', 'khí hậu', 'The climate is changing quickly.'],
      ['nature', 'thiên nhiên', 'Nature gives us fresh air.'],
      ['forest', 'rừng', 'The forest is home to many animals.'],
      ['energy', 'năng lượng', 'Solar energy is clean.'],
      ['plastic', 'nhựa', 'Plastic waste is a big problem.'],
      ['planet', 'hành tinh', 'Earth is our planet.'],
    ].slice(0, limit);

    for (const [word, meaningVi, example] of words) {
      await this.prisma.word.upsert({
        where: { word },
        update: {
          topicId,
          level,
        },
        create: {
          word,
          partOfSpeech: 'noun',
          meaningVi,
          meaningEn: meaningVi,
          example,
          level,
          difficulty: 1,
          topicId,
          source: 'SEED',
        },
      });
    }
  }

  async getOrCreateUserWeeklyPlan(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const { weekStart, weekEnd } = this.getWeekRange();

    const existed = await this.prisma.userWeeklyVocabularyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart,
        },
      },
      include: {
        days: {
          include: {
            topic: true,
            words: {
              include: {
                word: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (existed) {
      const topicIds = existed.days.map((day) => day.topicId);
      const uniqueTopicIds = new Set(topicIds);

      const hasNotEnoughDays = existed.days.length < 7;

      const hasDuplicatedTopic =
        topicIds.length > 0 && uniqueTopicIds.size !== topicIds.length;

      const hasNotEnoughWords = existed.days.some(
        (day) => day.words.length < profile.dailyWordTarget,
      );

      const usedTopicIds = await this.getUsedTopicIdsBeforeWeek(
        userId,
        weekStart,
      );
      const hasTopicUsedInPreviousWeeks = topicIds.some((topicId) =>
        usedTopicIds.includes(topicId),
      );
      const hasCompletedDay = existed.days.some(
        (day) => day.status === 'COMPLETED',
      );

      if (
        hasDuplicatedTopic ||
        (hasTopicUsedInPreviousWeeks && !hasCompletedDay)
      ) {
        return this.rebuildUserWeeklyPlan(userId, existed.id);
      } else if (hasNotEnoughDays || hasNotEnoughWords) {
        await this.repairUserWeeklyPlanDays(
          userId,
          existed.id,
          existed.weekStart,
          existed.level,
          profile.dailyWordTarget,
        );
      }

      return this.prisma.userWeeklyVocabularyPlan.findUnique({
        where: { id: existed.id },
        include: {
          days: {
            include: {
              topic: true,
              words: {
                include: { word: true },
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { date: 'asc' },
          },
        },
      });
    }

    let pool = await this.prisma.weeklyTopicPool.findUnique({
      where: {
        level_weekStart: {
          level: profile.level,
          weekStart,
        },
      },
      include: {
        topics: true,
      },
    });

    if (!pool) {
      await this.vocabularyJobService.generatePoolForLevel(profile.level);
      pool = await this.prisma.weeklyTopicPool.findUnique({
        where: {
          level_weekStart: {
            level: profile.level,
            weekStart,
          },
        },
        include: {
          topics: true,
        },
      });
    }

    if (pool) {
      await this.ensureWeeklyPoolHasTopics(pool.id, profile.level);
      pool = await this.prisma.weeklyTopicPool.findUnique({
        where: {
          level_weekStart: {
            level: profile.level,
            weekStart,
          },
        },
        include: {
          topics: true,
        },
      });
    }

    if (!pool) {
      throw new NotFoundException(
        `Chưa có đủ chủ đề từ vựng cho level ${profile.level}`,
      );
    }

    let availableTopics = pool.topics;

    if (!availableTopics.length) {
      let fallbackTopics = await this.prisma.wordTopic.findMany({
        take: 7,
      });

      if (!fallbackTopics.length) {
        fallbackTopics = await this.ensureFallbackTopics();
      }

      availableTopics = fallbackTopics.map((topic, index) => ({
        id: `fallback-${topic.id}`,
        poolId: pool.id,
        topicId: topic.id,
        order: index + 1,
      }));
    }

    if (!availableTopics.length) {
      throw new NotFoundException(
        `Chưa có chủ đề từ vựng cho level ${profile.level}`,
      );
    }

    // const shuffledTopics = this.shuffle(availableTopics);
    // const randomTopics = Array.from({ length: 7 }, (_, index) => {
    //   return shuffledTopics[index % shuffledTopics.length];
    // });

    const uniqueTopics = Array.from(
      new Map(availableTopics.map((item) => [item.topicId, item])).values(),
    );

    if (uniqueTopics.length < 7) {
      await this.ensureWeeklyPoolHasTopics(pool.id, profile.level);

      const repairedPool = await this.prisma.weeklyTopicPool.findUnique({
        where: { id: pool.id },
        include: { topics: true },
      });

      const repairedTopics = Array.from(
        new Map(
          (repairedPool?.topics || []).map((item) => [item.topicId, item]),
        ).values(),
      );

      if (repairedTopics.length < 7) {
        throw new BadRequestException(
          'Chưa đủ 7 chủ đề khác nhau cho tuần này',
        );
      }

      uniqueTopics.splice(0, uniqueTopics.length, ...repairedTopics);
    }

    const randomTopics = await this.getFreshTopicsForUser({
      userId,
      level: profile.level,
      weekStart,
      poolTopics: uniqueTopics,
      count: 7,
    });

    const plan = await this.prisma.userWeeklyVocabularyPlan.create({
      data: {
        userId,
        poolId: pool.id,
        level: profile.level,
        weekStart,
        weekEnd,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const status = date < today ? 'MISSED' : 'AVAILABLE';

      const dayPlan = await this.prisma.userDailyVocabularyPlan.create({
        data: {
          planId: plan.id,
          date,
          dayOfWeek: i === 6 ? 0 : i + 2,
          topicId: randomTopics[i].topicId,
          level: profile.level,
          status,
        },
      });

      const words = await this.pickWordsForUser({
        userId,
        topicId: randomTopics[i].topicId,
        level: profile.level,
        limit: profile.dailyWordTarget,
      });

      if (words.length) {
        await this.prisma.userDailyVocabularyWord.createMany({
          data: words.map((word, j) => ({
            dayId: dayPlan.id,
            wordId: word.id,
            order: j + 1,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.userWeeklyVocabularyPlan.findUnique({
      where: { id: plan.id },
      include: {
        days: {
          include: {
            topic: true,
            words: {
              include: { word: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });
  }

  async getTodayVocabulary(userId: string) {
    const profile = await this.getOrCreateProfile(userId);

    const todayPlan = await this.findTodayPlan(userId);

    if (todayPlan) {
      if (todayPlan.status === 'COMPLETED') {
        return {
          locked: false,
          completed: true,
          ...todayPlan,
        };
      }

      const required = profile.dailyWordTarget || 10;

      if (todayPlan.words.length < required) {
        await this.fillTodayPlanWords(userId, todayPlan, required);
      }

      const updated = await this.findTodayPlan(userId);

      if (!updated) {
        throw new NotFoundException('Không tìm thấy bài học hôm nay');
      }

      return {
        locked: false,
        completed: updated.status === 'COMPLETED',
        ...updated,
      };
    }

    const plan = await this.bootstrapTodayVocabulary(userId);

    if (!this.hasDays(plan)) return plan;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const createdTodayPlan = plan.days.find((day) => {
      const d = new Date(day.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    if (!createdTodayPlan) {
      throw new NotFoundException('Không tìm thấy bài học hôm nay');
    }

    if (createdTodayPlan.words.length < (profile.dailyWordTarget || 10)) {
      await this.fillTodayPlanWords(
        userId,
        createdTodayPlan,
        profile.dailyWordTarget || 10,
      );

      const updated = await this.findTodayPlan(userId);

      if (!updated) {
        throw new NotFoundException('Không tìm thấy bài học hôm nay');
      }

      return {
        locked: false,
        completed: updated.status === 'COMPLETED',
        ...updated,
      };
    }

    return {
      locked: false,
      completed: createdTodayPlan.status === 'COMPLETED',
      ...createdTodayPlan,
    };
  }
  async pickWordsForUser(params: {
    userId: string;
    topicId: string;
    level: string;
    limit: number;
  }) {
    const learned = await this.prisma.userWordProgress.findMany({
      where: {
        userId: params.userId,
      },
      select: { wordId: true },
    });

    const learnedIds = learned.map((x) => x.wordId);

    const findStrict = () =>
      this.prisma.word.findMany({
        where: {
          topicId: params.topicId,
          level: params.level,
          id: { notIn: learnedIds },
        },
        orderBy: [{ difficulty: 'asc' }, { searchCount: 'asc' }],
        take: params.limit,
      });

    let words = await findStrict();

    if (words.length >= params.limit) return words;

    await this.generateFallbackWords({
      topicId: params.topicId,
      level: params.level,
      count: params.limit - words.length,
    });

    words = await findStrict();

    if (words.length >= params.limit) return words;

    const missing = params.limit - words.length;

    const created = await this.generateWordsByGemini({
      topicId: params.topicId,
      level: params.level,
      count: missing + 10,
    });

    words = await findStrict();

    if (words.length >= params.limit) return words;

    // fallback mềm: lấy cùng topic, bỏ qua level
    const fallbackWords = await this.prisma.word.findMany({
      where: {
        topicId: params.topicId,
        id: { notIn: learnedIds },
      },
      orderBy: [{ difficulty: 'asc' }, { searchCount: 'asc' }],
      take: params.limit,
    });

    if (fallbackWords.length > 0) return fallbackWords;

    throw new BadRequestException(
      `Không tạo được từ cho topicId=${params.topicId}, level=${params.level}`,
    );
  }
  async updateWordProgress(
    userId: string,
    wordId: string,
    status: WordProgressStatus,
  ) {
    const word = await this.prisma.word.findUnique({
      where: {
        id: wordId,
      },
      select: {
        id: true,
        word: true,
      },
    });

    if (!word) {
      throw new NotFoundException('Không tìm thấy từ.');
    }

    const previousProgress = await this.prisma.userWordProgress.findUnique({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const updatedProgress = await this.prisma.userWordProgress.upsert({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
      update: {
        status,
        seenCount: {
          increment: 1,
        },
        correctCount:
          status === 'KNOWN'
            ? {
                increment: 1,
              }
            : undefined,
        wrongCount:
          status === 'REVIEW'
            ? {
                increment: 1,
              }
            : undefined,
        interval: status === 'KNOWN' ? 7 : status === 'REVIEW' ? 1 : undefined,
        learnedAt: status === 'KNOWN' ? new Date() : undefined,
        reviewAt: status === 'KNOWN' ? this.addDays(7) : this.addDays(1),
      },
      create: {
        userId,
        wordId,
        status,
        seenCount: 1,
        correctCount: status === 'KNOWN' ? 1 : 0,
        wrongCount: status === 'REVIEW' ? 1 : 0,
        interval: status === 'KNOWN' ? 7 : status === 'REVIEW' ? 1 : 0,
        learnedAt: status === 'KNOWN' ? new Date() : null,
        reviewAt: status === 'KNOWN' ? this.addDays(7) : this.addDays(1),
      },
    });

    /*
     * UserWordProgress của bạn chỉ nhận:
     * NEW | LEARNING | KNOWN | REVIEW
     */
    const countedStatuses: WordProgressStatus[] = [
      'LEARNING',
      'KNOWN',
      'REVIEW',
    ];

    const wasAlreadyCounted =
      previousProgress !== null &&
      countedStatuses.includes(previousProgress.status);

    const shouldCount = countedStatuses.includes(status);

    /*
     * Chỉ cộng nhiệm vụ khi từ được học lần đầu.
     */
    if (!wasAlreadyCounted && shouldCount) {
      await this.missionV2ProgressService.increase({
        userId,
        action: MissionV2Action.LEARN_WORD,
        amount: 1,
        skill: LearningSkill.VOCABULARY,
      });
    }

    return {
      ...updatedProgress,
      missionProgressUpdated: !wasAlreadyCounted && shouldCount,
    };
  }

  getNextReviewDate() {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date;
  }

  async searchWord(keyword: string, userId: string) {
    if (!keyword) {
      throw new BadRequestException('Thiếu từ khóa');
    }

    const cleanKeyword = keyword.toLowerCase().trim();

    let word = await this.prisma.word.findUnique({
      where: { word: cleanKeyword },
    });

    if (!word) {
      throw new NotFoundException('Chưa có từ này trong DB');
    }

    word = await this.prisma.word.update({
      where: { id: word.id },
      data: {
        searchCount: {
          increment: 1,
        },
      },
    });

    await this.prisma.userWordHistory.create({
      data: {
        userId,
        wordId: word.id,
        keyword: cleanKeyword,
      },
    });

    return word;
  }

  async getRandomWords(userId: string, level?: string, limit = 10) {
    const profile = await this.getOrCreateProfile(userId);
    const finalLevel = level || profile.level;

    const learned = await this.prisma.userWordProgress.findMany({
      where: {
        userId,
        status: 'KNOWN',
      },
      select: { wordId: true },
    });

    const learnedIds = learned.map((x) => x.wordId);

    return this.prisma.word.findMany({
      where: {
        level: finalLevel,
        id: {
          notIn: learnedIds,
        },
      },
      orderBy: {
        searchCount: 'asc',
      },
      take: limit,
    });
  }

  async getMyHistory(userId: string) {
    return this.prisma.userWordHistory.findMany({
      where: { userId },
      include: {
        word: true,
      },
      orderBy: {
        searchedAt: 'desc',
      },
      take: 50,
    });
  }

  async generateWordsByGemini(params: {
    topicId: string;
    level: string;
    count: number;
  }) {
    const topic = await this.prisma.wordTopic.findUnique({
      where: { id: params.topicId },
    });

    if (!topic) {
      throw new NotFoundException('Không tìm thấy chủ đề');
    }

    const existedWords = await this.prisma.word.findMany({
      where: { topicId: params.topicId, level: params.level },
      select: { word: true },
      take: 100,
      orderBy: { createdAt: 'desc' }, // Giả định bạn có trường này, nếu không thì bỏ orderBy
    });

    const existedText = existedWords.map((x) => x.word).join(', ');

    const prompt = `
Bạn là AI tạo dữ liệu từ vựng tiếng Anh. Hãy tạo đúng ${params.count} từ/cụm từ tiếng Anh thực tế.
Yêu cầu:
- Chủ đề: "${topic.name}"
- Cấp độ CEFR: ${params.level}
- KHÔNG trùng với danh sách này: [${existedText}]
- Thứ tự: Sắp xếp độ khó (difficulty) tăng dần từ 1 đến 5.
- Nội dung: example ngắn gọn; meaningVi dịch tự nhiên; synonyms/antonyms dạng mảng; phonetic dùng IPA chuẩn (hoặc null).
- Ưu tiên từ/cụm từ có thể minh họa bằng một hình ảnh rõ ràng, cụ thể. Với từ trừu tượng, example phải gợi ra một tình huống/hình ảnh dễ hiểu.
- Tránh tạo từ quá rộng hoặc quá mơ hồ nếu có lựa chọn cụ thể hơn trong cùng chủ đề.

Trả về định dạng JSON Array chuẩn theo mẫu:
[
  {
    "word": "doctor",
    "phonetic": "/ˈdɑːk.tər/",
    "partOfSpeech": "noun",
    "meaningVi": "bác sĩ",
    "meaningEn": "a person whose job is to treat sick people",
    "example": "I need to see a doctor.",
    "synonyms": ["physician"],
    "antonyms": [],
    "difficulty": 1
  }
]`;

    let result: GeminiWordItem[] = [];

    try {
      // const aiResult = (await this.geminiService.generateJson(
      //   prompt,
      // )) as GeminiWordItem[];
      const aiResult = (await this.geminiService.generateJson(
        prompt,
      )) as GeminiWordItem[];
      result = Array.isArray(aiResult) ? aiResult : [];
    } catch (error) {
      console.error('GEMINI ERROR:', error);
      result = this.buildFallbackWords(topic.name, params.level, params.count);
    }

    if (!Array.isArray(result) || result.length === 0) {
      console.warn('Gemini không tạo được từ cho topic:', topic.name);
      return [];
    }

    const createdWords: any[] = [];

    for (const item of result) {
      if (!item.word) continue;

      const cleanWord = item.word.toLowerCase().trim();

      if (this.isInvalidGeneratedWord(cleanWord, topic.name)) {
        console.warn('SKIP INVALID WORD:', cleanWord);
        continue;
      }

      const word = await this.prisma.word.upsert({
        where: {
          word: cleanWord,
        },
        update: {
          topicId: params.topicId,
          level: params.level,
          phonetic: item.phonetic || undefined,
          partOfSpeech: item.partOfSpeech || undefined,
          meaningVi: item.meaningVi || undefined,
          meaningEn: item.meaningEn || undefined,
          example: item.example || undefined,
          synonyms: item.synonyms || undefined,
          antonyms: item.antonyms || undefined,
          difficulty: item.difficulty || undefined,
        },
        create: {
          word: cleanWord,
          phonetic: item.phonetic || null,
          partOfSpeech: item.partOfSpeech || null,
          meaningVi: item.meaningVi || null,
          meaningEn: item.meaningEn || null,
          example: item.example || null,
          synonyms: item.synonyms || [],
          antonyms: item.antonyms || [],
          difficulty: item.difficulty || 1,
          level: params.level,
          topicId: params.topicId,
          source: 'GEMINI',
          isAiGenerated: true,
          needsReview: true,
        },
      });

      createdWords.push(word);
    }

    return createdWords;
  }

  buildFallbackWords(topicName: string, level: string, count: number) {
    const topic = topicName.toLowerCase();
    const banks: Record<string, GeminiWordItem[]> = {
      food: [
        {
          word: 'apple',
          phonetic: '/ˈæp.əl/',
          partOfSpeech: 'noun',
          meaningVi: 'quả táo',
          meaningEn: 'a round fruit',
          example: 'I eat an apple every day.',
          synonyms: ['fruit'],
          antonyms: [],
          difficulty: 1,
        },
        {
          word: 'bread',
          phonetic: '/bred/',
          partOfSpeech: 'noun',
          meaningVi: 'bánh mì',
          meaningEn: 'food made from flour',
          example: 'She buys bread for breakfast.',
          synonyms: ['loaf'],
          antonyms: [],
          difficulty: 1,
        },
        {
          word: 'rice',
          phonetic: '/raɪs/',
          partOfSpeech: 'noun',
          meaningVi: 'cơm, gạo',
          meaningEn: 'small white grains used as food',
          example: 'We eat rice with fish.',
          synonyms: ['grain'],
          antonyms: [],
          difficulty: 1,
        },
        {
          word: 'water',
          phonetic: '/ˈwɔː.tər/',
          partOfSpeech: 'noun',
          meaningVi: 'nước',
          meaningEn: 'a clear liquid people drink',
          example: 'Please drink more water.',
          synonyms: ['drink'],
          antonyms: [],
          difficulty: 1,
        },
        {
          word: 'breakfast',
          phonetic: '/ˈbrek.fəst/',
          partOfSpeech: 'noun',
          meaningVi: 'bữa sáng',
          meaningEn: 'the first meal of the day',
          example: 'Breakfast is ready.',
          synonyms: ['morning meal'],
          antonyms: [],
          difficulty: 2,
        },
      ],
      technology: [
        {
          word: 'computer',
          phonetic: '/kəmˈpjuː.tər/',
          partOfSpeech: 'noun',
          meaningVi: 'máy tính',
          meaningEn: 'an electronic machine for work or study',
          example: 'I use a computer to learn English.',
          synonyms: ['PC'],
          antonyms: [],
          difficulty: 1,
        },
        {
          word: 'phone',
          phonetic: '/fəʊn/',
          partOfSpeech: 'noun',
          meaningVi: 'điện thoại',
          meaningEn: 'a device used to call people',
          example: 'My phone is on the table.',
          synonyms: ['mobile'],
          antonyms: [],
          difficulty: 1,
        },
        {
          word: 'internet',
          phonetic: '/ˈɪn.tə.net/',
          partOfSpeech: 'noun',
          meaningVi: 'mạng internet',
          meaningEn: 'the global computer network',
          example: 'The internet helps me study.',
          synonyms: ['web'],
          antonyms: [],
          difficulty: 2,
        },
        {
          word: 'keyboard',
          phonetic: '/ˈkiː.bɔːrd/',
          partOfSpeech: 'noun',
          meaningVi: 'bàn phím',
          meaningEn: 'a board with keys for typing',
          example: 'This keyboard is new.',
          synonyms: [],
          antonyms: [],
          difficulty: 2,
        },
        {
          word: 'screen',
          phonetic: '/skriːn/',
          partOfSpeech: 'noun',
          meaningVi: 'màn hình',
          meaningEn: 'the flat part that shows images',
          example: 'Look at the screen.',
          synonyms: ['display'],
          antonyms: [],
          difficulty: 1,
        },
      ],
    };

    const quickBanks: Record<
      string,
      Array<[string, string, string, string]>
    > = {
      environment: [
        ['environment', 'noun', 'môi trường', 'We protect the environment.'],
        ['recycle', 'verb', 'tái chế', 'I recycle paper.'],
        ['pollution', 'noun', 'ô nhiễm', 'Pollution is dangerous.'],
        ['climate', 'noun', 'khí hậu', 'The climate is changing.'],
        ['nature', 'noun', 'thiên nhiên', 'I love nature.'],
        ['forest', 'noun', 'rừng', 'The forest is quiet.'],
        ['energy', 'noun', 'năng lượng', 'Solar energy is clean.'],
        ['plastic', 'noun', 'nhựa', 'Do not throw plastic away.'],
        ['planet', 'noun', 'hành tinh', 'Earth is our planet.'],
        ['waste', 'noun', 'rác thải', 'Waste can harm rivers.'],
      ],
      'daily life': [
        ['routine', 'noun', 'thói quen hằng ngày', 'My routine starts early.'],
        ['wake', 'verb', 'thức dậy', 'I wake up at six.'],
        ['shower', 'noun', 'việc tắm vòi sen', 'I take a shower.'],
        ['commute', 'verb', 'đi làm, đi học', 'I commute by bus.'],
        ['chore', 'noun', 'việc nhà', 'I do chores after dinner.'],
        ['meal', 'noun', 'bữa ăn', 'Lunch is my main meal.'],
        ['rest', 'verb', 'nghỉ ngơi', 'You should rest.'],
        ['schedule', 'noun', 'lịch trình', 'My schedule is full.'],
        ['habit', 'noun', 'thói quen', 'Reading is a good habit.'],
        ['errand', 'noun', 'việc vặt', 'I have an errand today.'],
      ],
      travel: [
        ['travel', 'verb', 'du lịch', 'We travel in summer.'],
        ['ticket', 'noun', 'vé', 'I bought a train ticket.'],
        ['airport', 'noun', 'sân bay', 'The airport is busy.'],
        ['hotel', 'noun', 'khách sạn', 'The hotel is near the beach.'],
        ['passport', 'noun', 'hộ chiếu', 'Bring your passport.'],
        ['luggage', 'noun', 'hành lý', 'My luggage is heavy.'],
        ['map', 'noun', 'bản đồ', 'Use a map in the city.'],
        ['journey', 'noun', 'chuyến đi', 'The journey was long.'],
        ['guide', 'noun', 'hướng dẫn viên', 'The guide speaks English.'],
        ['destination', 'noun', 'điểm đến', 'Paris is a popular destination.'],
      ],
      business: [
        ['meeting', 'noun', 'cuộc họp', 'The meeting starts at nine.'],
        ['client', 'noun', 'khách hàng', 'Our client is waiting.'],
        ['budget', 'noun', 'ngân sách', 'The budget is small.'],
        ['profit', 'noun', 'lợi nhuận', 'Profit increased this year.'],
        ['market', 'noun', 'thị trường', 'The market is growing.'],
        ['contract', 'noun', 'hợp đồng', 'Please read the contract.'],
        ['invoice', 'noun', 'hóa đơn', 'Send the invoice today.'],
        ['deadline', 'noun', 'hạn chót', 'The deadline is Friday.'],
        ['teamwork', 'noun', 'làm việc nhóm', 'Teamwork helps the project.'],
        ['strategy', 'noun', 'chiến lược', 'We need a new strategy.'],
      ],
      health: [
        ['health', 'noun', 'sức khỏe', 'Health is important.'],
        ['doctor', 'noun', 'bác sĩ', 'I need to see a doctor.'],
        ['medicine', 'noun', 'thuốc', 'Take this medicine.'],
        ['exercise', 'noun', 'tập thể dục', 'Exercise keeps you strong.'],
        ['fever', 'noun', 'sốt', 'He has a fever.'],
        ['cough', 'noun', 'ho', 'The cough is better.'],
        ['pain', 'noun', 'cơn đau', 'I feel pain in my back.'],
        ['sleep', 'noun', 'giấc ngủ', 'Good sleep helps your health.'],
        ['diet', 'noun', 'chế độ ăn', 'A healthy diet matters.'],
        ['clinic', 'noun', 'phòng khám', 'The clinic opens at eight.'],
      ],
      conversation: [
        [
          'conversation',
          'noun',
          'cuộc trò chuyện',
          'We had a short conversation.',
        ],
        ['greet', 'verb', 'chào hỏi', 'She greets her teacher.'],
        ['reply', 'verb', 'trả lời', 'Please reply soon.'],
        ['question', 'noun', 'câu hỏi', 'I have a question.'],
        ['answer', 'noun', 'câu trả lời', 'Your answer is clear.'],
        ['opinion', 'noun', 'ý kiến', 'What is your opinion?'],
        ['agree', 'verb', 'đồng ý', 'I agree with you.'],
        ['explain', 'verb', 'giải thích', 'Can you explain it?'],
        ['topic', 'noun', 'chủ đề', 'This topic is interesting.'],
        ['polite', 'adjective', 'lịch sự', 'Be polite when you speak.'],
      ],
    };

    const base =
      banks[topic] ||
      quickBanks[topic]?.map(
        ([word, partOfSpeech, meaningVi, example], index) => ({
          word,
          phonetic: undefined,
          partOfSpeech,
          meaningVi,
          meaningEn: meaningVi,
          example,
          synonyms: [],
          antonyms: [],
          difficulty: Math.min(5, Math.floor(index / 2) + 1),
        }),
      );

    if (!base) {
      return [];
    }

    return base.slice(0, count);
  }

  async generateFallbackWords(params: {
    topicId: string;
    level: string;
    count: number;
  }) {
    const topic = await this.prisma.wordTopic.findUnique({
      where: { id: params.topicId },
    });

    if (!topic) {
      throw new NotFoundException('Không tìm thấy chủ đề');
    }

    const items = this.buildFallbackWords(
      topic.name,
      params.level,
      params.count,
    );
    const createdWords: any[] = [];

    for (const item of items) {
      if (!item.word) continue;

      const cleanWord = item.word.toLowerCase().trim();
      const word = await this.prisma.word.upsert({
        where: { word: cleanWord },
        update: {
          topicId: params.topicId,
          level: params.level,
        },
        create: {
          word: cleanWord,
          phonetic: item.phonetic || null,
          partOfSpeech: item.partOfSpeech || null,
          meaningVi: item.meaningVi || null,
          meaningEn: item.meaningEn || null,
          example: item.example || null,
          synonyms: item.synonyms || [],
          antonyms: item.antonyms || [],
          difficulty: item.difficulty || 1,
          level: params.level,
          topicId: params.topicId,
          source: 'SEED',
          isAiGenerated: false,
          needsReview: false,
        },
      });

      createdWords.push(word);
    }

    return createdWords;
  }

  async getWeeklyTestReview(userId: string) {
    const test = await this.prisma.weeklyVocabularyTest.findFirst({
      where: {
        userId,
        status: 'FAILED',
      },
      include: {
        questions: {
          where: {
            isCorrect: false,
          },
          include: {
            word: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!test) {
      throw new NotFoundException('Không có bài ôn tập');
    }

    return {
      testId: test.id,
      score: test.score,
      passScore: test.passScore,
      words: test.questions.map((q) => ({
        wordId: q.word.id,
        word: q.word.word,
        phonetic: q.word.phonetic,
        meaningVi: q.word.meaningVi,
        meaningEn: q.word.meaningEn,
        example: q.word.example,
        audio: q.word.audio,
      })),
    };
  }

  async retryWeeklyTest(userId: string) {
    const oldTest = await this.prisma.weeklyVocabularyTest.findFirst({
      where: {
        userId,
        status: 'FAILED',
      },
      include: {
        questions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!oldTest) {
      throw new NotFoundException('Không có bài test cần làm lại');
    }

    await this.prisma.weeklyVocabularyQuestion.updateMany({
      where: {
        testId: oldTest.id,
      },
      data: {
        userAnswer: null,
        isCorrect: null,
        score: 0,
      },
    });

    return this.prisma.weeklyVocabularyTest.update({
      where: {
        id: oldTest.id,
      },
      data: {
        status: 'AVAILABLE',
        score: 0,
      },
      include: {
        questions: {
          include: {
            word: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async ensurePreviousWeekPassed(userId: string, currentWeekStart: Date) {
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const previousPlan = await this.prisma.userWeeklyVocabularyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart: previousWeekStart,
        },
      },
    });

    if (!previousPlan) return;

    const test = await this.prisma.weeklyVocabularyTest.findUnique({
      where: {
        userId_planId: {
          userId,
          planId: previousPlan.id,
        },
      },
    });

    if (!test || test.status !== 'PASSED') {
      return {
        locked: true,
        reason: 'Bạn cần vượt qua bài kiểm tra từ vựng tuần trước',
        testRequired: true,
        currentScore: test?.score || 0,
        passScore: test?.passScore || 70,
      };
    }

    return null;
  }

  async checkPreviousWeekTestLock(userId: string, currentWeekStart: Date) {
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const previousPlan = await this.prisma.userWeeklyVocabularyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart: previousWeekStart,
        },
      },
    });

    if (!previousPlan) return null;

    const test = await this.prisma.weeklyVocabularyTest.findUnique({
      where: {
        userId_planId: {
          userId,
          planId: previousPlan.id,
        },
      },
    });

    if (!test || test.status !== 'PASSED') {
      return {
        locked: true,
        reason: 'Bạn cần vượt qua bài kiểm tra từ vựng tuần trước',
        testRequired: true,
        previousTest: {
          status: test?.status || 'LOCKED',
          score: test?.score || 0,
          passScore: test?.passScore || 70,
        },
      };
    }

    return null;
  }

  async completeDailyVocabulary(userId: string, dayId: string) {
    const day = await this.prisma.userDailyVocabularyPlan.findFirst({
      where: {
        id: dayId,
        plan: {
          userId,
        },
      },
      include: {
        words: {
          select: {
            wordId: true,
          },
        },
      },
    });

    if (!day) {
      throw new NotFoundException('Không tìm thấy bài học.');
    }

    /*
     * Chống hoàn thành và cộng mission nhiều lần.
     */
    if (day.status === 'COMPLETED') {
      return {
        ...day,
        completed: true,
        alreadyCompleted: true,
      };
    }

    /*
     * Bảo đảm tất cả từ trong bài đã có lịch ôn.
     *
     * Chú ý: đoạn này không cộng LEARN_WORD.
     * LEARN_WORD đã được cộng ngay khi người dùng bấm
     * "Đã biết" hoặc "Cần ôn lại".
     */
    for (const item of day.words) {
      await this.prisma.userWordProgress.upsert({
        where: {
          userId_wordId: {
            userId,
            wordId: item.wordId,
          },
        },
        update: {
          reviewAt: this.addDays(1),
        },
        create: {
          userId,
          wordId: item.wordId,
          status: 'LEARNING',
          seenCount: 1,
          interval: 1,
          easeFactor: 250,
          reviewAt: this.addDays(1),
        },
      });
    }

    const completedDay = await this.prisma.userDailyVocabularyPlan.update({
      where: {
        id: dayId,
      },
      data: {
        status: 'COMPLETED',
      },
      include: {
        topic: true,
        words: {
          include: {
            word: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    /*
     * Mission "Hoàn thành bài học hôm nay".
     */
    await this.missionV2ProgressService.increase({
      userId,
      action: MissionV2Action.COMPLETE_LESSON,
      amount: 1,
      skill: LearningSkill.VOCABULARY,
    });

    /*
     * Mission "Luyện kỹ năng ưu tiên".
     *
     * Nếu AI ưu tiên Vocabulary thì mission STUDY_LESSON
     * có skill VOCABULARY sẽ được tăng.
     */
    await this.missionV2ProgressService.increase({
      userId,
      action: MissionV2Action.STUDY_LESSON,
      amount: 1,
      skill: LearningSkill.VOCABULARY,
    });

    await this.learningXp.publish({
      activity: 'VOCABULARY_COMPLETED',
      userId,
      sourceId: completedDay.id,
      completionRate: 100,
      metadata: {
        dayId: completedDay.id,
        planId: completedDay.planId,
        topicId: completedDay.topicId,
        learnedWords: completedDay.words.length,
      },
    });

    return {
      ...completedDay,
      completed: true,
      alreadyCompleted: false,
    };
  }

  async addExtraDailyVocabulary(userId: string, dayId: string, amount = 5) {
    const safeAmount = Math.min(20, Math.max(5, Math.floor(amount)));
    const day = await this.prisma.userDailyVocabularyPlan.findFirst({
      where: {
        id: dayId,
        plan: {
          userId,
        },
      },
      include: {
        words: true,
      },
    });

    if (!day) {
      throw new NotFoundException('Không tìm thấy bài học hôm nay.');
    }

    await this.fillTodayPlanWords(userId, day, day.words.length + safeAmount);

    return this.prisma.userDailyVocabularyPlan.update({
      where: { id: dayId },
      data: {
        status: 'AVAILABLE',
      },
      include: {
        topic: true,
        words: {
          include: {
            word: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async getLatestUserWeeklyPlan(userId: string) {
    const plan = await this.prisma.userWeeklyVocabularyPlan.findFirst({
      where: { userId },
      include: {
        days: {
          include: {
            topic: true,
            words: {
              include: { word: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { weekStart: 'desc' },
    });

    if (plan) return plan;

    const created = await this.getOrCreateUserWeeklyPlan(userId);

    if (!this.hasDays(created)) {
      return null;
    }

    return created;
  }

  async getWeeklyTest(userId: string) {
    const plan = await this.getLatestUserWeeklyPlan(userId);

    if (!plan) {
      throw new NotFoundException('Chưa có kế hoạch học từ vựng');
    }

    const planId = plan.id;

    const completedDays = await this.prisma.userDailyVocabularyPlan.count({
      where: {
        planId,
        status: 'COMPLETED',
      },
    });

    let test = await this.prisma.weeklyVocabularyTest.findUnique({
      where: {
        userId_planId: {
          userId,
          planId,
        },
      },
      include: {
        questions: {
          include: { word: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    const learnedWords = await this.getWeeklyLearnedWords(planId);
    const learnedWordCount = learnedWords.length;

    if (
      test &&
      ['AVAILABLE', 'FAILED'].includes(test.status) &&
      learnedWordCount > test.questions.length
    ) {
      await this.prisma.weeklyVocabularyQuestion.deleteMany({
        where: { testId: test.id },
      });
      await this.prisma.weeklyVocabularyTest.delete({
        where: { id: test.id },
      });
      test = null;
    }

    if (!test && learnedWordCount > 0) {
      test = await this.createWeeklyTest(userId, planId);
    }

    if (!test) {
      return {
        status: 'LOCKED',
        message:
          'Bạn chỉ cần hoàn thành ít nhất một chủ đề/ngày học để mở bài kiểm tra tuần. Bạn vẫn có thể bỏ qua kiểm tra và tiếp tục học từ mới.',
        completedDays,
        requiredDays: 1,
        learnedWords: learnedWordCount,
      };
    }

    return test;
  }

  async getWeeklyLearnedWords(planId: string) {
    return this.prisma.userDailyVocabularyWord.findMany({
      where: {
        day: {
          planId,
          status: 'COMPLETED',
        },
      },
      distinct: ['wordId'],
      include: {
        word: true,
        day: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async createWeeklyTest(userId: string, planId: string) {
    const learnedWords = await this.getWeeklyLearnedWords(planId);

    const selectedWords = this.shuffle(learnedWords).slice(0, 20);

    const test = await this.prisma.weeklyVocabularyTest.create({
      data: {
        userId,
        planId,
        status: 'AVAILABLE',
        totalQuestions: selectedWords.length,
        passScore: 70,
        unlockedAt: new Date(),
      },
    });

    for (let i = 0; i < selectedWords.length; i++) {
      const item = selectedWords[i];
      const type = pickQuestionType(i);

      await this.prisma.weeklyVocabularyQuestion.create({
        data: {
          testId: test.id,
          wordId: item.wordId,
          type,
          question: buildQuestion(type, item.word),
          options: await buildOptions(this.prisma, type, item.wordId),
          answer: buildAnswer(type, item.word),
          order: i + 1,
        },
      });
    }

    return this.prisma.weeklyVocabularyTest.findUnique({
      where: { id: test.id },
      include: {
        questions: {
          include: {
            word: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async submitWeeklyTest(userId: string, dto: SubmitWeeklyTestDto) {
    const test = await this.prisma.weeklyVocabularyTest.findFirst({
      where: {
        userId,
        status: {
          in: ['AVAILABLE', 'FAILED'],
        },
      },
      include: {
        questions: {
          include: {
            word: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!test) {
      throw new NotFoundException('Không có bài kiểm tra khả dụng');
    }

    let correctCount = 0;

    for (const question of test.questions) {
      const userAnswer = dto.answers.find((x) => x.questionId === question.id);

      const answerText = userAnswer?.answer?.trim().toLowerCase() || '';
      const correctAnswer = question.answer.trim().toLowerCase();

      let isCorrect = false;

      if (question.type === 'WRITE_SENTENCE') {
        isCorrect = answerText.includes(question.word.word.toLowerCase());
      } else {
        isCorrect = answerText === correctAnswer;
      }

      if (isCorrect) correctCount++;

      await this.prisma.weeklyVocabularyQuestion.update({
        where: { id: question.id },
        data: {
          userAnswer: userAnswer?.answer || '',
          isCorrect,
          score: isCorrect ? 1 : 0,
        },
      });

      if (!isCorrect) {
        await this.prisma.userWordProgress.upsert({
          where: {
            userId_wordId: {
              userId,
              wordId: question.wordId,
            },
          },
          update: {
            status: 'REVIEW',
            reviewAt: this.getNextReviewDate(),
            seenCount: {
              increment: 1,
            },
          },
          create: {
            userId,
            wordId: question.wordId,
            status: 'REVIEW',
            reviewAt: this.getNextReviewDate(),
            seenCount: 1,
          },
        });
      }
    }

    const score = Math.round((correctCount / test.questions.length) * 100);
    const isPassed = score >= test.passScore;

    const updatedTest = await this.prisma.weeklyVocabularyTest.update({
      where: { id: test.id },
      data: {
        score,
        status: isPassed ? 'PASSED' : 'FAILED',
        passedAt: isPassed ? new Date() : null,
        attemptCount: {
          increment: 1,
        },
      },
    });

    const wrongQuestions = await this.prisma.weeklyVocabularyQuestion.findMany({
      where: {
        testId: test.id,
        isCorrect: false,
      },
      include: {
        word: true,
      },
    });

    return {
      status: updatedTest.status,
      score,
      passScore: test.passScore,
      message: isPassed
        ? 'Chúc mừng! Bạn đã vượt qua bài kiểm tra.'
        : 'Bạn chưa đạt. Hãy ôn lại các từ sai trước khi làm lại.',
      canUnlockNextWeek: isPassed,
      unlockedTodayLearning: isPassed,
      wrongWords: wrongQuestions.map((q) => ({
        wordId: q.word.id,
        word: q.word.word,
        meaningVi: q.word.meaningVi,
        meaningEn: q.word.meaningEn,
        example: q.word.example,
      })),
    };
  }

  async getReviewWords(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const page = Math.max(1, Math.floor(options.page || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(options.limit || 8)));
    const where = {
      userId,
      status: {
        in: ['LEARNING', 'REVIEW'] as WordProgressStatus[],
      },
      reviewAt: {
        lte: endOfToday,
      },
    };

    const [total, reviewWords] = await Promise.all([
      this.prisma.userWordProgress.count({ where }),
      this.prisma.userWordProgress.findMany({
        where,
        include: {
          word: true,
        },
        orderBy: [{ reviewAt: 'asc' }, { wrongCount: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      words: reviewWords.map((item) => ({
        progressId: item.id,
        wordId: item.word.id,
        word: item.word.word,
        phonetic: item.word.phonetic,
        audio: item.word.audio,
        meaningVi: item.word.meaningVi,
        meaningEn: item.word.meaningEn,
        example: item.word.example,
        status: item.status,
        seenCount: item.seenCount,
        correctCount: item.correctCount,
        wrongCount: item.wrongCount,
        reviewAt: item.reviewAt,
      })),
    };
  }

  calculateNextReview(params: {
    isCorrect: boolean;
    interval: number;
    easeFactor: number;
    correctCount: number;
  }) {
    let interval = params.interval;
    let easeFactor = params.easeFactor;

    if (!params.isCorrect) {
      return {
        status: 'REVIEW' as const,
        interval: 1,
        easeFactor: Math.max(130, easeFactor - 20),
        reviewAt: this.addDays(1),
      };
    }

    const nextCorrectCount = params.correctCount + 1;

    if (nextCorrectCount === 1) interval = 1;
    else if (nextCorrectCount === 2) interval = 3;
    else if (nextCorrectCount === 3) interval = 7;
    else if (nextCorrectCount === 4) interval = 14;
    else interval = Math.round(interval * (easeFactor / 100));

    easeFactor = Math.min(300, easeFactor + 10);

    let status: 'LEARNING' | 'KNOWN' | 'MASTERED' = 'LEARNING';

    if (nextCorrectCount >= 3) status = 'KNOWN';
    if (nextCorrectCount >= 5) status = 'MASTERED';

    return {
      status,
      interval,
      easeFactor,
      reviewAt: status === 'MASTERED' ? null : this.addDays(interval),
    };
  }

  addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  async submitReview(userId: string, dto: SubmitReviewDto) {
    const results: Array<{
      wordId: string;
      word: string;
      isCorrect: boolean;
      nextStatus: WordProgressStatus;
      nextReviewAt: Date | null;
      interval: number;
    }> = [];

    for (const item of dto.answers) {
      const progress = await this.prisma.userWordProgress.findUnique({
        where: {
          userId_wordId: {
            userId,
            wordId: item.wordId,
          },
        },
        include: {
          word: true,
        },
      });

      if (!progress) continue;

      const next = this.calculateNextReview({
        isCorrect: item.isCorrect,
        interval: progress.interval,
        easeFactor: progress.easeFactor,
        correctCount: progress.correctCount,
      });

      const updated = await this.prisma.userWordProgress.update({
        where: {
          id: progress.id,
        },
        data: {
          status: next.status,
          interval: next.interval,
          easeFactor: next.easeFactor,
          reviewAt: next.reviewAt,
          seenCount: {
            increment: 1,
          },
          correctCount: item.isCorrect ? { increment: 1 } : undefined,
          wrongCount: !item.isCorrect ? { increment: 1 } : undefined,
          learnedAt:
            next.status === 'KNOWN' && !progress.learnedAt
              ? new Date()
              : undefined,
          masteredAt: next.status === 'MASTERED' ? new Date() : undefined,
        },
        include: {
          word: true,
        },
      });

      results.push({
        wordId: updated.wordId,
        word: updated.word.word,
        isCorrect: item.isCorrect,
        nextStatus: updated.status,
        nextReviewAt: updated.reviewAt,
        interval: updated.interval,
      });
    }

    return {
      message: 'Đã cập nhật ôn tập',
      total: results.length,
      results,
    };
  }
  async getWordDetail(userId: string, wordId: string) {
    const word = await this.prisma.word.findUnique({
      where: { id: wordId },
      include: { topic: true },
    });
    if (!word) throw new NotFoundException('Không tìm thấy từ vựng');

    const [progress, notebook] = await Promise.all([
      this.prisma.userWordProgress.findUnique({
        where: { userId_wordId: { userId, wordId } },
      }),
      this.prisma.userVocabularyNotebook.findUnique({
        where: { userId_wordId: { userId, wordId } },
      }),
    ]);

    return { ...word, progress, notebook, inNotebook: Boolean(notebook) };
  }

  async getWordRelations(userId: string, wordId: string) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) throw new NotFoundException('Không tìm thấy từ vựng');

    const sameTopic = await this.prisma.word.findMany({
      where: {
        id: { not: wordId },
        topicId: word.topicId || undefined,
        level: word.level,
      },
      orderBy: [{ difficulty: 'asc' }, { searchCount: 'asc' }],
      take: 8,
    });

    await this.missionV2ProgressService.increase({
      userId,
      action: MissionV2Action.LEARN_WORD,
      amount: 1,
      skill: LearningSkill.VOCABULARY,
    });

    return {
      wordId,
      synonyms: word.synonyms,
      antonyms: word.antonyms,
      sameTopic,
    };
  }

  async getDailyWords(userId: string, dayId: string) {
    const day = await this.prisma.userDailyVocabularyPlan.findFirst({
      where: { id: dayId, plan: { userId } },
      include: {
        topic: true,
        words: { include: { word: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!day) throw new NotFoundException('Không tìm thấy bài học trong ngày');

    const wordIds = day.words.map((item) => item.wordId);
    const [progresses, notebookItems] = await Promise.all([
      this.prisma.userWordProgress.findMany({
        where: { userId, wordId: { in: wordIds } },
      }),
      this.prisma.userVocabularyNotebook.findMany({
        where: { userId, wordId: { in: wordIds } },
      }),
    ]);

    return {
      ...day,
      words: day.words.map((item) => ({
        ...item,
        progress:
          progresses.find((progress) => progress.wordId === item.wordId) ||
          null,
        inNotebook: notebookItems.some(
          (notebook) => notebook.wordId === item.wordId,
        ),
      })),
    };
  }

  async getWordNavigation(userId: string, dayId: string, wordId: string) {
    const day = await this.getDailyWords(userId, dayId);
    const currentIndex = day.words.findIndex((item) => item.wordId === wordId);
    if (currentIndex < 0)
      throw new NotFoundException('Từ này không nằm trong bài học');

    return {
      currentIndex,
      total: day.words.length,
      previous: currentIndex > 0 ? day.words[currentIndex - 1] : null,
      current: day.words[currentIndex],
      next:
        currentIndex < day.words.length - 1
          ? day.words[currentIndex + 1]
          : null,
    };
  }

  async addToNotebook(userId: string, wordId: string, note?: string) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) throw new NotFoundException('Không tìm thấy từ vựng');

    return this.prisma.userVocabularyNotebook.upsert({
      where: { userId_wordId: { userId, wordId } },
      update: { note },
      create: { userId, wordId, note },
      include: { word: true },
    });
  }

  async removeFromNotebook(userId: string, wordId: string) {
    await this.prisma.userVocabularyNotebook.deleteMany({
      where: { userId, wordId },
    });
    return { removed: true };
  }

  async getNotebook(userId: string) {
    return this.prisma.userVocabularyNotebook.findMany({
      where: { userId },
      include: { word: { include: { topic: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFlashcard(userId: string, wordId: string) {
    const detail = await this.getWordDetail(userId, wordId);
    return {
      wordId,
      front: detail.word,
      phonetic: detail.phonetic,
      audio: detail.audio,
      back: detail.meaningVi || detail.meaningEn,
      example: detail.example,
      partOfSpeech: detail.partOfSpeech,
      progress: detail.progress,
    };
  }

  async getDailyFlashcards(userId: string, dayId: string) {
    const day = await this.getDailyWords(userId, dayId);

    return {
      dayId: day.id,
      topic: day.topic,
      total: day.words.length,
      cards: day.words.map((item) => ({
        wordId: item.wordId,
        front: item.word.word,
        phonetic: item.word.phonetic,
        audio: item.word.audio,
        back: item.word.meaningVi || item.word.meaningEn,
        example: item.word.example,
        partOfSpeech: item.word.partOfSpeech,
        progress: item.progress,
      })),
    };
  }

  getFlashcardReviewValue(
    rating?: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY',
    isCorrect = false,
  ) {
    if (!rating) {
      return {
        isCorrect,
        interval: isCorrect ? 3 : 1,
        easeDelta: isCorrect ? 10 : -20,
      };
    }

    const values = {
      AGAIN: { isCorrect: false, interval: 1, easeDelta: -30 },
      HARD: { isCorrect: true, interval: 2, easeDelta: -10 },
      GOOD: { isCorrect: true, interval: 4, easeDelta: 10 },
      EASY: { isCorrect: true, interval: 7, easeDelta: 20 },
    };

    return values[rating];
  }

  async reviewFlashcard(
    userId: string,
    wordId: string,
    isCorrect = false,
    rating?: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY',
  ) {
    await this.ensureProgress(userId, wordId);
    const review = this.getFlashcardReviewValue(rating, isCorrect);
    const progress = await this.prisma.userWordProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });

    if (!progress) {
      throw new NotFoundException('Không tìm thấy tiến độ từ vựng');
    }

    const nextCorrectCount = review.isCorrect
      ? progress.correctCount + 1
      : progress.correctCount;
    const nextStatus =
      nextCorrectCount >= 5
        ? 'MASTERED'
        : nextCorrectCount >= 3
          ? 'KNOWN'
          : review.isCorrect
            ? 'LEARNING'
            : 'REVIEW';

    const updated = await this.prisma.userWordProgress.update({
      where: { id: progress.id },
      data: {
        status: nextStatus,
        seenCount: { increment: 1 },
        correctCount: review.isCorrect ? { increment: 1 } : undefined,
        wrongCount: !review.isCorrect ? { increment: 1 } : undefined,
        interval: review.interval,
        easeFactor: Math.min(
          300,
          Math.max(130, progress.easeFactor + review.easeDelta),
        ),
        reviewAt:
          nextStatus === 'MASTERED' ? null : this.addDays(review.interval),
        learnedAt:
          nextStatus === 'KNOWN' && !progress.learnedAt
            ? new Date()
            : undefined,
        masteredAt: nextStatus === 'MASTERED' ? new Date() : undefined,
      },
      include: { word: true },
    });

    return {
      wordId,
      rating: rating || (isCorrect ? 'GOOD' : 'AGAIN'),
      isCorrect: review.isCorrect,
      nextStatus: updated.status,
      nextReviewAt: updated.reviewAt,
      interval: updated.interval,
      easeFactor: updated.easeFactor,
    };
  }

  async reviewFlashcardSession(
    userId: string,
    reviews: Array<{
      wordId: string;
      rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
    }>,
  ) {
    const results: Array<{
      wordId: string;
      rating: string;
      isCorrect: boolean;
      nextStatus: WordProgressStatus;
      nextReviewAt: Date | null;
      interval: number;
      easeFactor: number;
    }> = [];

    for (const item of reviews) {
      results.push(
        await this.reviewFlashcard(userId, item.wordId, undefined, item.rating),
      );
    }

    const remembered = results.filter((item) => item.isCorrect).length;

    return {
      total: results.length,
      remembered,
      reward: {
        xp: remembered * 5,
        coin: remembered * 2,
      },
      results,
    };
  }

  async ensureProgress(userId: string, wordId: string) {
    const progress = await this.prisma.userWordProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });
    if (progress) return progress;
    return this.updateWordProgress(userId, wordId, 'LEARNING');
  }

  async getReviewSuggestions(userId: string) {
    const due = await this.getReviewWords(userId, { page: 1, limit: 10 });
    const weakWords = await this.prisma.userWordProgress.findMany({
      where: { userId, wrongCount: { gt: 0 } },
      include: { word: true },
      orderBy: [{ wrongCount: 'desc' }, { reviewAt: 'asc' }],
      take: 10,
    });

    return {
      dueToday: due.total,
      words: due.words.slice(0, 10),
      weakWords: weakWords.map((item) => ({
        wordId: item.wordId,
        word: item.word.word,
        meaningVi: item.word.meaningVi,
        meaningEn: item.word.meaningEn,
        wrongCount: item.wrongCount,
        reviewAt: item.reviewAt,
      })),
    };
  }

  async getMyStats(userId: string) {
    const [total, learned, mastered, reviewDue, notebook, testsTaken] =
      await Promise.all([
        this.prisma.userWordProgress.count({ where: { userId } }),
        this.prisma.userWordProgress.count({
          where: { userId, status: { in: ['KNOWN', 'MASTERED'] } },
        }),
        this.prisma.userWordProgress.count({
          where: { userId, status: 'MASTERED' },
        }),
        this.prisma.userWordProgress.count({
          where: {
            userId,
            status: { in: ['LEARNING', 'REVIEW'] },
            reviewAt: { lte: new Date() },
          },
        }),
        this.prisma.userVocabularyNotebook.count({ where: { userId } }),
        this.prisma.weeklyVocabularyTest.count({ where: { userId } }),
      ]);

    return {
      totalWords: total,
      learnedWords: learned,
      masteredWords: mastered,
      reviewDue,
      notebookWords: notebook,
      testsTaken,
      memoryRate: total ? Math.round((learned / total) * 100) : 0,
    };
  }

  async getTodayChallenge(userId: string) {
    const today = await this.getTodayPlan(userId);
    if (!today) {
      throw new NotFoundException('Không có bài học hôm nay');
    }

    const dailyWords = await this.getDailyWords(userId, today.id);
    const target = dailyWords.words[0]?.word;

    return {
      challengeId: dailyWords.id,
      type: 'WRITE_SENTENCE',
      title: 'Thử thách từ vựng hôm nay',
      total: 1,
      wordId: target?.id,
      word: target?.word,
      prompt: target
        ? `Hãy viết một câu tiếng Anh có sử dụng từ "${target.word}".`
        : 'Hãy viết một câu tiếng Anh với từ vừa học.',
      hint: target?.meaningVi || target?.meaningEn || null,
      questions: target
        ? [
            {
              wordId: target.id,
              prompt: `Hãy viết một câu tiếng Anh có sử dụng từ "${target.word}".`,
              options: [],
            },
          ]
        : [],
    };
  }

  private async getTodayPlan(userId: string) {
    const plan = await this.getOrCreateUserWeeklyPlan(userId);

    if (!this.hasDays(plan)) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      plan.days.find((day) => {
        const d = new Date(day.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }) ?? null
    );
  }

  async submitChallenge(
    userId: string,
    challengeId: string,
    answers: Array<{ wordId: string; answer: string }>,
    sentence?: string,
  ) {
    const day = await this.getDailyWords(userId, challengeId);
    const wordMap = new Map(day.words.map((item) => [item.wordId, item.word]));
    const targetWord = day.words[0]?.word;

    if (sentence && targetWord) {
      let aiResult: {
        score: number;
        completed: boolean;
        feedback: string;
        suggestion?: string;
      } | null = null;

      try {
        aiResult = await this.geminiService.generateJson(`
You are grading an English vocabulary challenge for a Vietnamese learner.
Target word: "${targetWord.word}"
Sentence: "${sentence}"

Return only JSON:
{
  "score": 0,
  "completed": false,
  "feedback": "short Vietnamese feedback",
  "suggestion": "corrected or better sentence"
}

Rules:
- completed is true only if the sentence naturally uses the target word.
- score is 0-100.
- feedback must be encouraging and concise.
`);
      } catch (error) {
        const normalizedSentence = sentence.toLowerCase();
        const normalizedWord = targetWord.word.toLowerCase();
        const includesWord = normalizedSentence.includes(normalizedWord);
        const hasEnoughWords = sentence.trim().split(/\s+/).length >= 4;
        aiResult = {
          score: includesWord && hasEnoughWords ? 100 : 45,
          completed: includesWord && hasEnoughWords,
          feedback:
            includesWord && hasEnoughWords
              ? 'Câu của bạn hợp lệ. Foxy đã cộng tiến độ cho từ này.'
              : `Hãy viết câu dài hơn và dùng từ "${targetWord.word}" trong câu.`,
          suggestion: `Try using "${targetWord.word}" in a complete sentence.`,
        };
      }

      const checkedResult = aiResult || {
        score: 0,
        completed: false,
        feedback: 'Chưa chấm được câu này, hãy thử lại sau.',
        suggestion: `Try using "${targetWord.word}" in a complete sentence.`,
      };
      const isCorrect = Boolean(
        checkedResult.completed || checkedResult.score >= 70,
      );

      await this.ensureProgress(userId, targetWord.id);
      await this.reviewFlashcard(
        userId,
        targetWord.id,
        isCorrect,
        isCorrect ? 'GOOD' : 'AGAIN',
      );

      return {
        type: 'WRITE_SENTENCE',
        wordId: targetWord.id,
        word: targetWord.word,
        sentence,
        completed: isCorrect,
        score: checkedResult.score,
        reward: isCorrect ? { xp: 20, coin: 10 } : { xp: 0, coin: 0 },
        feedback: checkedResult.feedback,
        suggestion: checkedResult.suggestion,
      };
    }

    const results = answers.map((answer) => {
      const word = wordMap.get(answer.wordId);
      const accepted = [word?.meaningVi, word?.meaningEn, word?.word]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase().trim());
      const isCorrect = accepted.includes(
        String(answer.answer || '')
          .toLowerCase()
          .trim(),
      );
      return { wordId: answer.wordId, word: word?.word, isCorrect };
    });

    await Promise.all(
      results.map(async (result) => {
        await this.ensureProgress(userId, result.wordId);
        return this.submitReview(userId, {
          answers: [{ wordId: result.wordId, isCorrect: result.isCorrect }],
        });
      }),
    );

    const correct = results.filter((item) => item.isCorrect).length;
    return {
      total: results.length,
      correct,
      score: results.length ? Math.round((correct / results.length) * 100) : 0,
      results,
    };
  }

  async shareWord(userId: string, wordId: string, content?: string) {
    const detail = await this.getWordDetail(userId, wordId);
    const shareText = `${detail.word}: ${detail.meaningVi || detail.meaningEn || ''}`;
    const post = await this.prisma.communityPost.create({
      data: {
        authorId: userId,
        type: 'SHARE',
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        title: `Từ vựng mới: ${detail.word}`,
        content: [
          detail.meaningVi,
          detail.example ? `Ví dụ: ${detail.example}` : null,
        ]
          .filter(Boolean)
          .join('\n\n'),
        category: 'VOCABULARY',
        tags: ['vocabulary', detail.level.toLowerCase()],
        media: Prisma.JsonNull,
        pollData: Prisma.JsonNull,
      },
    });

    return {
      wordId,
      post,
      shareText,
      url: `/vocabulary?wordId=${wordId}`,
      word: detail,
    };
  }

  async getLearningOverview(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const today = this.startOfToday();
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      user,
      todayPlan,
      completedLessons,
      learnedWords,
      masteredWords,
      reviewDue,
      notebookWords,
      testsTaken,
      scoreAggregate,
      completedDays,
      reviewWords,
      reviewDashboard,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { fullname: true },
      }),
      this.findTodayPlan(userId),
      this.prisma.userDailyVocabularyPlan.count({
        where: { status: 'COMPLETED', plan: { userId } },
      }),
      this.prisma.userWordProgress.count({
        where: { userId, status: { in: ['KNOWN', 'MASTERED'] } },
      }),
      this.prisma.userWordProgress.count({
        where: { userId, status: 'MASTERED' },
      }),
      this.prisma.userWordProgress.count({
        where: {
          userId,
          status: { in: ['LEARNING', 'REVIEW', 'KNOWN'] },
          reviewAt: { lte: endOfToday },
        },
      }),
      this.prisma.userVocabularyNotebook.count({ where: { userId } }),
      this.prisma.weeklyVocabularyTest.count({
        where: { userId, status: { in: ['PASSED', 'FAILED'] } },
      }),
      this.prisma.weeklyVocabularyTest.aggregate({
        where: { userId, status: { in: ['PASSED', 'FAILED'] } },
        _avg: { score: true },
      }),
      this.prisma.userDailyVocabularyPlan.findMany({
        where: { status: 'COMPLETED', plan: { userId } },
        select: { date: true },
        orderBy: { date: 'desc' },
        take: 60,
      }),
      this.prisma.userWordProgress.findMany({
        where: {
          userId,
          status: { in: ['LEARNING', 'REVIEW', 'KNOWN'] },
          reviewAt: { lte: endOfToday },
        },
        include: {
          word: {
            include: {
              topic: true,
            },
          },
        },
        orderBy: [{ reviewAt: 'asc' }, { updatedAt: 'asc' }],
        take: 3,
      }),
      this.getReviewDashboard(userId),
    ]);

    const todayWordIds = todayPlan?.words?.map((item) => item.wordId) || [];
    const todayLearned = todayWordIds.length
      ? await this.prisma.userWordProgress.count({
          where: {
            userId,
            wordId: { in: todayWordIds },
            status: { in: ['LEARNING', 'REVIEW', 'KNOWN', 'MASTERED'] },
          },
        })
      : 0;

    const dayKey = (date: Date) => date.toISOString().slice(0, 10);
    const completedSet = new Set(
      completedDays.map((item) => dayKey(new Date(item.date))),
    );
    let streakDays = 0;
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      if (!completedSet.has(dayKey(date))) {
        if (i === 0) continue;
        break;
      }
      streakDays += 1;
    }

    const totalXp = learnedWords * 10 + masteredWords * 15 + testsTaken * 50;
    const currentLevel = Math.max(1, Math.floor(totalXp / 150) + 1);
    const nextLevelXp = currentLevel * 150;
    const levelStartXp = (currentLevel - 1) * 150;
    const xpInLevel = Math.max(0, totalXp - levelStartXp);
    const xpNeed = Math.max(1, nextLevelXp - levelStartXp);
    const averageScore = Math.round(scoreAggregate._avg.score || 0);
    const memoryRate =
      reviewDashboard?.summary?.memoryRate ||
      (learnedWords ? Math.round((masteredWords / learnedWords) * 100) : 0);

    const reviewRows = reviewWords.map((item) => ({
      id: item.wordId,
      word: item.word.word,
      phonetic: item.word.phonetic,
      meaningVi: item.word.meaningVi,
      topic: item.word.topic?.name || 'Từ vựng',
      level: item.word.level,
      priority:
        item.status === 'REVIEW' || (item.wrongCount || 0) > 1
          ? 'Khó'
          : item.status === 'LEARNING'
            ? 'Trung bình'
            : '-',
      lastReviewed: item.updatedAt,
    }));

    return {
      user: {
        name: user?.fullname || 'bạn',
      },
      profile: {
        level: profile.level,
        levelName: 'Explorer',
        levelNumber: currentLevel,
        xp: totalXp,
        nextXp: nextLevelXp,
        xpProgress: Math.round((xpInLevel / xpNeed) * 100),
      },
      stats: {
        lessonsLearned: completedLessons,
        testsTaken,
        averageScore,
        streakDays,
        learnedToday: todayLearned,
        learnedWords,
        masteredWords,
        reviewDue,
        notebookWords,
      },
      todayPlan: {
        date: today.toISOString(),
        topic: todayPlan?.topic?.name || 'Từ vựng hôm nay',
        status: todayPlan?.status || 'AVAILABLE',
        items: [
          {
            key: 'vocabulary',
            title: 'Học từ vựng mới',
            subtitle: todayPlan?.topic?.name
              ? `10 từ về chủ đề ${todayPlan.topic.name}`
              : 'Hoàn thành bộ từ hôm nay',
            completed:
              todayPlan?.status === 'COMPLETED'
                ? profile.dailyWordTarget
                : todayLearned,
            total: todayPlan?._count?.words || profile.dailyWordTarget,
            done: todayPlan?.status === 'COMPLETED',
          },
          {
            key: 'listening',
            title: 'Luyện nghe',
            subtitle: todayPlan?.topic?.name
              ? `Nghe hội thoại chủ đề ${todayPlan.topic.name}`
              : 'Nghe một đoạn hội thoại ngắn',
            completed: 0,
            total: 1,
            done: false,
          },
          {
            key: 'grammar',
            title: 'Ôn ngữ pháp',
            subtitle: 'Thì hiện tại đơn và hiện tại tiếp diễn',
            completed: 0,
            total: 1,
            done: false,
          },
          {
            key: 'quiz',
            title: 'Kiểm tra nhanh',
            subtitle: 'Làm bài kiểm tra 15 câu',
            completed: 0,
            total: 1,
            done: false,
          },
        ],
      },
      review: {
        total: reviewDue,
        urgent: reviewDashboard?.summary?.urgent || 0,
        grammar: 8,
        exercises: Math.max(0, Math.min(5, reviewDue)),
        words: reviewRows,
      },
      skills: [
        {
          key: 'vocabulary',
          label: 'Từ vựng',
          percent: memoryRate || 70,
          status: 'Trung bình',
        },
        {
          key: 'grammar',
          label: 'Ngữ pháp',
          percent: 65,
          status: 'Trung bình',
        },
        { key: 'listening', label: 'Nghe', percent: 80, status: 'Khá' },
        { key: 'speaking', label: 'Nói', percent: 60, status: 'Trung bình' },
        { key: 'reading', label: 'Đọc', percent: 75, status: 'Khá' },
        { key: 'writing', label: 'Viết', percent: 55, status: 'Cần cố gắng' },
      ],
      achievements: [
        {
          key: 'streak',
          title: `${Math.max(streakDays, 1)} ngày liên tiếp`,
          subtitle: 'Học đều mỗi ngày',
          icon: 'fire',
        },
        {
          key: 'listening',
          title: 'Nghe chăm chỉ',
          subtitle: 'Hoàn thành 10 bài luyện nghe',
          icon: 'headphones',
        },
        {
          key: 'words',
          title: 'Từ vựng mới',
          subtitle: `Học ${learnedWords || 50} từ mới`,
          icon: 'book',
        },
        {
          key: 'quiz',
          title: 'Kiểm tra nhanh',
          subtitle: testsTaken
            ? `Hoàn thành ${testsTaken} bài kiểm tra`
            : 'Hoàn thành 5 bài kiểm tra',
          icon: 'target',
        },
      ],
    };
  }

  async getSkillProgressOverview(userId: string) {
    const overview = await this.getLearningOverview(userId);
    const today = this.startOfToday();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const labels = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return `${String(date.getDate()).padStart(2, '0')}/${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}`;
    });

    const dayKey = (date?: Date | null) => {
      if (!date) return '';
      return new Date(date).toISOString().slice(0, 10);
    };
    const labelKeyMap = new Map(
      labels.map((label, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        return [date.toISOString().slice(0, 10), label];
      }),
    );
    const average = (values: number[]) =>
      values.length
        ? Math.round(
            values.reduce((sum, value) => sum + value, 0) / values.length,
          )
        : 0;
    const statusFor = (percent: number) =>
      percent >= 80
        ? 'Khá'
        : percent >= 50
          ? 'Trung bình'
          : percent > 0
            ? 'Cần cố gắng'
            : 'Chưa bắt đầu';
    const trendFrom = (records: Array<{ date?: Date | null; value: number }>) =>
      labels.map((label) => {
        const values = records
          .filter((record) => labelKeyMap.get(dayKey(record.date)) === label)
          .map((record) => record.value);
        return { label, value: average(values) };
      });
    const timeAgo = (date?: Date | null) => {
      if (!date) return '';
      const diffMs = Date.now() - new Date(date).getTime();
      const minutes = Math.max(1, Math.floor(diffMs / 60000));
      if (minutes < 60) return `${minutes} phút trước`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} giờ trước`;
      return `${Math.floor(hours / 24)} ngày trước`;
    };
    const vocabScore = (item: {
      status: string;
      correctCount: number;
      wrongCount: number;
    }) => {
      const answered = item.correctCount + item.wrongCount;
      if (answered > 0) return Math.round((item.correctCount / answered) * 100);
      if (item.status === 'MASTERED') return 100;
      if (item.status === 'KNOWN') return 80;
      if (item.status === 'LEARNING' || item.status === 'REVIEW') return 50;
      return 0;
    };

    const [
      user,
      vocabProgress,
      weeklyTests,
      quizResults,
      listeningSessions,
      listeningTimes,
      completedLessons,
      totalEnrolledLessons,
      speakingResults,
      pronunciationResults,
      writingSubmissions,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true },
      }),
      this.prisma.userWordProgress.findMany({
        where: { userId },
        select: {
          status: true,
          correctCount: true,
          wrongCount: true,
          updatedAt: true,
          learnedAt: true,
          masteredAt: true,
        },
      }),
      this.prisma.weeklyVocabularyTest.findMany({
        where: { userId, status: { in: ['PASSED', 'FAILED'] } },
        select: { score: true, updatedAt: true, passedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.quizResult.findMany({
        where: { userId },
        select: {
          score: true,
          createdAt: true,
          lesson: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listeningSession.findMany({
        where: { userId, status: 'COMPLETED' },
        select: {
          score: true,
          topic: true,
          xpEarned: true,
          completedAt: true,
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.listeningSessionAnswer.findMany({
        where: {
          answeredAt: { gte: weekStart, lte: endOfToday },
          session: { userId },
        },
        select: { timeSpent: true },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId, completed: true },
        select: {
          completedAt: true,
          lesson: { select: { title: true, duration: true } },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.lesson.count({
        where: { section: { course: { enrollments: { some: { userId } } } } },
      }),
      this.prisma.speakingResult.findMany({
        where: { userId, score: { not: null } },
        select: {
          score: true,
          createdAt: true,
          lesson: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pronunciationResult.findMany({
        where: { userId },
        select: {
          score: true,
          createdAt: true,
          exercise: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.writingSubmission.findMany({
        where: { userId, score: { not: null } },
        select: { score: true, createdAt: true, style: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const vocabPercent = average(vocabProgress.map(vocabScore));
    const grammarPercent = average([
      ...weeklyTests.map((item) => item.score),
      ...quizResults.map((item) => item.score),
    ]);
    const listeningPercent = average(
      listeningSessions.map((item) => item.score),
    );
    const speakingPercent = average([
      ...speakingResults.map((item) => item.score || 0),
      ...pronunciationResults.map((item) => item.score),
    ]);
    const readingPercent = totalEnrolledLessons
      ? Math.round((completedLessons.length / totalEnrolledLessons) * 100)
      : 0;
    const writingPercent = average(
      writingSubmissions.map((item) => item.score || 0),
    );

    const skillRows = [
      {
        key: 'vocabulary',
        label: 'Từ vựng',
        percent: vocabPercent,
        icon: 'pen',
        trend: trendFrom(
          vocabProgress
            .filter(
              (item) =>
                item.updatedAt >= weekStart && item.updatedAt <= endOfToday,
            )
            .map((item) => ({ date: item.updatedAt, value: vocabScore(item) })),
        ),
      },
      {
        key: 'grammar',
        label: 'Ngữ pháp',
        percent: grammarPercent,
        icon: 'exercise',
        trend: trendFrom([
          ...weeklyTests.map((item) => ({
            date: item.passedAt || item.updatedAt,
            value: item.score,
          })),
          ...quizResults.map((item) => ({
            date: item.createdAt,
            value: item.score,
          })),
        ]),
      },
      {
        key: 'listening',
        label: 'Nghe',
        percent: listeningPercent,
        icon: 'headphones',
        trend: trendFrom(
          listeningSessions.map((item) => ({
            date: item.completedAt,
            value: item.score,
          })),
        ),
      },
      {
        key: 'speaking',
        label: 'Nói',
        percent: speakingPercent,
        icon: 'mic',
        trend: trendFrom([
          ...speakingResults.map((item) => ({
            date: item.createdAt,
            value: item.score || 0,
          })),
          ...pronunciationResults.map((item) => ({
            date: item.createdAt,
            value: item.score,
          })),
        ]),
      },
      {
        key: 'reading',
        label: 'Đọc',
        percent: readingPercent,
        icon: 'book',
        trend: trendFrom(
          completedLessons.map((item) => ({
            date: item.completedAt,
            value: 100,
          })),
        ),
      },
      {
        key: 'writing',
        label: 'Viết',
        percent: writingPercent,
        icon: 'pen',
        trend: trendFrom(
          writingSubmissions.map((item) => ({
            date: item.createdAt,
            value: item.score || 0,
          })),
        ),
      },
    ];

    const skills = skillRows.map((skill) => ({
      ...skill,
      status: statusFor(skill.percent),
    }));

    const strongest = skills.reduce((best, item) =>
      item.percent > best.percent ? item : best,
    );
    const weakest = skills.reduce((low, item) =>
      item.percent < low.percent ? item : low,
    );
    const improvedSkills = skills.filter((item) => {
      const first = item.trend[0]?.value || 0;
      const last = item.trend[item.trend.length - 1]?.value || 0;
      return last > first;
    }).length;
    const totalStudySeconds =
      listeningTimes.reduce((sum, item) => sum + (item.timeSpent || 0), 0) +
      completedLessons
        .filter((item) => item.completedAt && item.completedAt >= weekStart)
        .reduce((sum, item) => sum + (item.lesson.duration || 0) * 60, 0);
    const studyHours = Math.floor(totalStudySeconds / 3600);
    const studyMinutes = Math.floor((totalStudySeconds % 3600) / 60);
    const xpEarned =
      user?.xp ||
      0 ||
      overview.profile.xp +
        listeningSessions.reduce((sum, item) => sum + (item.xpEarned || 0), 0);

    const recentActivities = [
      ...listeningSessions.slice(0, 4).map((item) => ({
        skill: 'Nghe',
        title: 'Luyện nghe',
        subtitle: item.topic ? `Chủ đề: ${item.topic}` : 'Bài luyện nghe',
        time: timeAgo(item.completedAt),
        xp: item.xpEarned || 0,
        icon: 'headphones',
        date: item.completedAt,
      })),
      ...weeklyTests.slice(0, 4).map((item) => ({
        skill: 'Từ vựng',
        title: 'Kiểm tra từ vựng',
        subtitle: `Điểm ${item.score}%`,
        time: timeAgo(item.passedAt || item.updatedAt),
        xp: 0,
        icon: 'book',
        date: item.passedAt || item.updatedAt,
      })),
      ...quizResults.slice(0, 4).map((item) => ({
        skill: 'Ngữ pháp',
        title: item.lesson?.title || 'Bài tập ngữ pháp',
        subtitle: `Điểm ${item.score}%`,
        time: timeAgo(item.createdAt),
        xp: 0,
        icon: 'exercise',
        date: item.createdAt,
      })),
      ...completedLessons.slice(0, 4).map((item) => ({
        skill: 'Đọc',
        title: item.lesson?.title || 'Hoàn thành bài học',
        subtitle: 'Đã hoàn thành',
        time: timeAgo(item.completedAt),
        xp: 0,
        icon: 'book',
        date: item.completedAt,
      })),
      ...speakingResults.slice(0, 4).map((item) => ({
        skill: 'Nói',
        title: item.lesson?.title || 'Luyện nói',
        subtitle: `Điểm ${item.score || 0}%`,
        time: timeAgo(item.createdAt),
        xp: 0,
        icon: 'mic',
        date: item.createdAt,
      })),
      ...writingSubmissions.slice(0, 4).map((item) => ({
        skill: 'Viết',
        title: 'Luyện viết',
        subtitle: `Điểm ${item.score || 0}%`,
        time: timeAgo(item.createdAt),
        xp: 0,
        icon: 'pen',
        date: item.createdAt,
      })),
    ]
      .filter((item) => item.date)
      .sort(
        (a, b) =>
          new Date(b.date as Date).getTime() -
          new Date(a.date as Date).getTime(),
      )
      .slice(0, 4)
      .map(({ date, ...item }) => item);

    return {
      user: overview.user,
      summary: {
        averageProgress: Math.round(
          skills.reduce((sum, item) => sum + item.percent, 0) / skills.length,
        ),
        improvedSkills,
        totalStudyTime: `${studyHours}h ${String(studyMinutes).padStart(2, '0')}m`,
        xpEarned,
        rangeLabel: '7 ngày qua',
      },
      skills,
      strongest: {
        key: strongest.key,
        label: strongest.label,
        percent: strongest.percent,
        message: `Bạn có khả năng ${strongest.label.toLowerCase()} khá tốt! Hãy tiếp tục duy trì nhé.`,
      },
      weakest: {
        key: weakest.key,
        label: weakest.label,
        percent: weakest.percent,
        message: `Hãy dành thêm thời gian học ${weakest.label.toLowerCase()} mỗi ngày để cải thiện kỹ năng này.`,
      },
      activities: recentActivities,
      recommendations: [
        {
          title: `Cải thiện ${weakest.label.toLowerCase()}`,
          subtitle: `Kỹ năng này hiện ở mức ${weakest.percent}%.`,
          href:
            weakest.key === 'vocabulary'
              ? '/vocabulary'
              : weakest.key === 'listening'
                ? '/listening'
                : weakest.key === 'speaking'
                  ? '/speaking'
                  : weakest.key === 'reading'
                    ? '/reading'
                    : weakest.key === 'writing'
                      ? '/writing'
                      : '/grammar',
          icon: weakest.icon,
        },
        {
          title: 'Nghe chủ đề yêu thích',
          subtitle: listeningSessions.length
            ? `Bạn đã hoàn thành ${listeningSessions.length} bài nghe.`
            : 'Bắt đầu luyện nghe 10 câu hôm nay.',
          href: '/listening',
          icon: 'headphones',
        },
        {
          title: 'Đọc bài ngắn mỗi ngày',
          subtitle: completedLessons.length
            ? `Bạn đã hoàn thành ${completedLessons.length} bài học.`
            : 'Hoàn thành bài đọc đầu tiên của bạn.',
          href: '/reading',
          icon: 'book',
        },
      ],
    };
  }

  async getSkillActivities(
    userId: string,
    range = '7d',
    skill = 'all',
    limit = 20,
  ) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 80);
    const days = range === '30d' ? 30 : range === '14d' ? 14 : 7;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const selectedSkill = skill === 'all' ? 'all' : skill;
    const includeSkill = (key: string) =>
      selectedSkill === 'all' || selectedSkill === key;
    const timeAgo = (date?: Date | null) => {
      if (!date) return '';
      const diffMs = Date.now() - new Date(date).getTime();
      const minutes = Math.max(1, Math.floor(diffMs / 60000));
      if (minutes < 60) return `${minutes} phút trước`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} giờ trước`;
      return `${Math.floor(hours / 24)} ngày trước`;
    };
    const activityDateWhere = { gte: startDate, lte: endDate };

    const [
      overview,
      skillOverview,
      vocabProgress,
      weeklyTests,
      grammarLessons,
      quizResults,
      listeningSessions,
      listeningTimes,
      completedLessons,
      speakingResults,
      pronunciationResults,
      writingSubmissions,
    ] = await Promise.all([
      this.getLearningOverview(userId),
      this.getSkillProgressOverview(userId),
      includeSkill('vocabulary')
        ? this.prisma.userWordProgress.findMany({
            where: {
              userId,
              updatedAt: activityDateWhere,
              status: { in: ['LEARNING', 'KNOWN', 'MASTERED', 'REVIEW'] },
            },
            take: safeLimit,
            orderBy: { updatedAt: 'desc' },
            include: {
              word: {
                include: {
                  topic: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      includeSkill('vocabulary')
        ? this.prisma.weeklyVocabularyTest.findMany({
            where: {
              userId,
              status: { in: ['PASSED', 'FAILED'] },
              updatedAt: activityDateWhere,
            },
            take: safeLimit,
            orderBy: { updatedAt: 'desc' },
          })
        : Promise.resolve([]),
      includeSkill('grammar')
        ? this.prisma.grammarLessonProgress.findMany({
            where: {
              userId,
              updatedAt: activityDateWhere,
            },
            take: safeLimit,
            orderBy: { updatedAt: 'desc' },
            include: {
              lesson: {
                include: {
                  topic: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      includeSkill('grammar')
        ? this.prisma.quizResult.findMany({
            where: {
              userId,
              createdAt: activityDateWhere,
            },
            take: safeLimit,
            orderBy: { createdAt: 'desc' },
            include: {
              lesson: true,
            },
          })
        : Promise.resolve([]),
      includeSkill('listening')
        ? this.prisma.listeningSession.findMany({
            where: {
              userId,
              status: 'COMPLETED',
              completedAt: activityDateWhere,
            },
            take: safeLimit,
            orderBy: { completedAt: 'desc' },
          })
        : Promise.resolve([]),
      this.prisma.listeningSessionAnswer.findMany({
        where: {
          answeredAt: activityDateWhere,
          session: { userId },
        },
        select: { timeSpent: true },
      }),
      includeSkill('reading')
        ? this.prisma.lessonProgress.findMany({
            where: {
              userId,
              completed: true,
              completedAt: activityDateWhere,
            },
            take: safeLimit,
            orderBy: { completedAt: 'desc' },
            include: {
              lesson: true,
            },
          })
        : Promise.resolve([]),
      includeSkill('speaking')
        ? this.prisma.speakingResult.findMany({
            where: {
              userId,
              createdAt: activityDateWhere,
            },
            take: safeLimit,
            orderBy: { createdAt: 'desc' },
            include: {
              lesson: true,
            },
          })
        : Promise.resolve([]),
      includeSkill('speaking')
        ? this.prisma.pronunciationResult.findMany({
            where: {
              userId,
              createdAt: activityDateWhere,
            },
            take: safeLimit,
            orderBy: { createdAt: 'desc' },
            include: {
              exercise: true,
            },
          })
        : Promise.resolve([]),
      includeSkill('writing')
        ? this.prisma.writingSubmission.findMany({
            where: {
              userId,
              createdAt: activityDateWhere,
              score: { not: null },
            },
            take: safeLimit,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const skillMap: Record<
      string,
      { label: string; badge: string; icon: string; tone: string; href: string }
    > = {
      vocabulary: {
        label: 'Từ vựng',
        badge: 'TỪ VỰNG',
        icon: 'pen',
        tone: 'emerald',
        href: '/vocabulary',
      },
      grammar: {
        label: 'Ngữ pháp',
        badge: 'NGỮ PHÁP',
        icon: 'book',
        tone: 'purple',
        href: '/grammar',
      },
      listening: {
        label: 'Nghe',
        badge: 'NGHE',
        icon: 'headphones',
        tone: 'blue',
        href: '/listening',
      },
      speaking: {
        label: 'Nói',
        badge: 'NÓI',
        icon: 'mic',
        tone: 'orange',
        href: '/speaking',
      },
      reading: {
        label: 'Đọc',
        badge: 'ĐỌC',
        icon: 'book',
        tone: 'pink',
        href: '/reading',
      },
      writing: {
        label: 'Viết',
        badge: 'VIẾT',
        icon: 'pen',
        tone: 'cyan',
        href: '/writing',
      },
    };
    const makeActivity = (payload: {
      id: string;
      skill: keyof typeof skillMap;
      title: string;
      subtitle: string;
      date?: Date | null;
      xp?: number;
      coins?: number;
      percent?: number;
      href?: string;
    }) => {
      const meta = skillMap[payload.skill];
      return {
        id: payload.id,
        skillKey: payload.skill,
        skill: meta.label,
        badge: meta.badge,
        title: payload.title,
        subtitle: payload.subtitle,
        time: timeAgo(payload.date),
        date: payload.date,
        xp: payload.xp || 0,
        coins: payload.coins || 0,
        percent: payload.percent || 0,
        icon: meta.icon,
        tone: meta.tone,
        href: payload.href || meta.href,
      };
    };

    const activities = [
      ...vocabProgress.map((item) =>
        makeActivity({
          id: `vocab-${item.id}`,
          skill: 'vocabulary',
          title: `Học từ mới: ${item.word?.word || 'Từ vựng'}`,
          subtitle: item.word?.topic?.name
            ? `Chủ đề ${item.word.topic.name}`
            : `Đúng ${item.correctCount}/${item.correctCount + item.wrongCount || 1} lần`,
          date: item.updatedAt,
          xp: item.status === 'MASTERED' ? 15 : 10,
          percent:
            item.correctCount + item.wrongCount > 0
              ? Math.round(
                  (item.correctCount / (item.correctCount + item.wrongCount)) *
                    100,
                )
              : item.status === 'MASTERED'
                ? 100
                : 50,
          href: '/vocabulary',
        }),
      ),
      ...weeklyTests.map((item) =>
        makeActivity({
          id: `vocab-test-${item.id}`,
          skill: 'vocabulary',
          title: 'Hoàn thành kiểm tra từ vựng',
          subtitle: `Bạn đạt ${item.score}% sau ${item.attemptCount || 1} lần làm`,
          date: item.passedAt || item.updatedAt,
          xp: item.status === 'PASSED' ? 20 : 5,
          percent: item.score,
          href: '/vocabulary/test',
        }),
      ),
      ...grammarLessons.map((item) =>
        makeActivity({
          id: `grammar-${item.id}`,
          skill: 'grammar',
          title: item.completed
            ? `Hoàn thành bài: ${item.lesson?.topic?.title || item.lesson?.title || 'Ngữ pháp'}`
            : `Bắt đầu bài: ${item.lesson?.topic?.title || item.lesson?.title || 'Ngữ pháp'}`,
          subtitle: item.completed
            ? `Bạn đã hoàn thành với điểm ${item.score}%`
            : 'Bạn đã bắt đầu bài học này',
          date: item.completedAt || item.updatedAt,
          xp: item.completed ? 20 : 0,
          percent: item.score,
          href: `/grammar/lesson/${item.lessonId}`,
        }),
      ),
      ...quizResults.map((item) =>
        makeActivity({
          id: `grammar-quiz-${item.id}`,
          skill: 'grammar',
          title: item.lesson?.title || 'Hoàn thành bài tập ngữ pháp',
          subtitle: `Bạn trả lời đúng ${item.correct}/${item.total} câu`,
          date: item.createdAt,
          xp: 20,
          percent: item.score,
          href: '/grammar',
        }),
      ),
      ...listeningSessions.map((item) =>
        makeActivity({
          id: `listening-${item.id}`,
          skill: 'listening',
          title: `Luyện nghe: ${item.topic || 'Daily Conversation'}`,
          subtitle: `Bạn đạt ${item.score}% độ chính xác`,
          date: item.completedAt,
          xp: item.xpEarned || 0,
          coins: item.coinsEarned || 0,
          percent: item.score,
          href: '/listening',
        }),
      ),
      ...speakingResults.map((item) =>
        makeActivity({
          id: `speaking-${item.id}`,
          skill: 'speaking',
          title: item.lesson?.title || 'Luyện nói',
          subtitle: `Điểm phát âm ${item.score || 0}%`,
          date: item.createdAt,
          xp: 20,
          percent: item.score || 0,
          href: '/speaking',
        }),
      ),
      ...pronunciationResults.map((item) =>
        makeActivity({
          id: `pronunciation-${item.id}`,
          skill: 'speaking',
          title: item.exercise?.title || 'Luyện phát âm',
          subtitle: `Điểm phát âm ${item.score}%`,
          date: item.createdAt,
          xp: 15,
          percent: item.score,
          href: '/pronunciation',
        }),
      ),
      ...completedLessons.map((item) =>
        makeActivity({
          id: `reading-${item.id}`,
          skill: 'reading',
          title: item.lesson?.title || 'Hoàn thành bài đọc',
          subtitle: 'Bạn đã hoàn thành bài học',
          date: item.completedAt,
          xp: 15,
          percent: 100,
          href: '/reading',
        }),
      ),
      ...writingSubmissions.map((item) =>
        makeActivity({
          id: `writing-${item.id}`,
          skill: 'writing',
          title: `Viết câu: ${item.style || 'Bài viết'}`,
          subtitle: `Bạn đã gửi bài viết và chờ đánh giá`,
          date: item.createdAt,
          xp: 10,
          percent: item.score || 0,
          href: '/writing',
        }),
      ),
    ]
      .filter((item) => item.date)
      .sort(
        (a, b) =>
          new Date(b.date as Date).getTime() -
          new Date(a.date as Date).getTime(),
      );

    const totalStudySeconds =
      listeningTimes.reduce((sum, item) => sum + (item.timeSpent || 0), 0) +
      (completedLessons as any[]).reduce(
        (sum, item) => sum + ((item.lesson as any)?.duration || 0) * 60,
        0,
      );
    const studyHours = Math.floor(totalStudySeconds / 3600);
    const studyMinutes = Math.floor((totalStudySeconds % 3600) / 60);
    const returnedActivities = activities
      .slice(0, safeLimit)
      .map(({ date, ...item }) => item);

    return {
      summary: {
        totalActivities: activities.length,
        streakDays: (overview.stats as any)?.streakDays || 0,
        totalStudyTime: `${studyHours}h ${String(studyMinutes).padStart(2, '0')}m`,
        rangeLabel: `${days} ngày qua`,
        activityGrowth: activities.length > 0 ? 12 : 0,
      },
      skills: skillOverview.skills.map((item: any) => ({
        key: item.key,
        label: item.label,
        percent: item.percent,
        status: item.status,
        icon: item.icon,
        tone: skillMap[item.key]?.tone || 'purple',
      })),
      activities: returnedActivities,
      hasMore: activities.length > returnedActivities.length,
      filters: {
        range,
        skill: selectedSkill,
        limit: safeLimit,
      },
    };
  }

  async getAchievementOverview(userId: string) {
    const overview = await this.getLearningOverview(userId);
    const today = this.startOfToday();
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);

    const timeAgo = (date?: Date | null) => {
      if (!date) return '';
      const diffMs = Date.now() - new Date(date).getTime();
      const minutes = Math.max(1, Math.floor(diffMs / 60000));
      if (minutes < 60) return `${minutes} phút trước`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} giờ trước`;
      return `${Math.floor(hours / 24)} ngày trước`;
    };

    const [
      user,
      petProfile,
      learnedToday,
      learnedWords,
      listeningSessions,
      listeningToday,
      weeklyTests,
      quizResults,
      writingSubmissions,
      writingToday,
      completedMissions,
      completedMissionsThisWeek,
      petRewards,
      arenaRewards,
      grammarCompleted,
      grammarToday,
      readingSessions,
      readingToday,
      speakingSessions,
      speakingToday,
      writingSessions,
      writingSessionsToday,
      completedMissionsV2,
      completedMissionsV2ThisWeek,
      latestPlacementResult,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true },
      }),
      this.prisma.petProfile.findUnique({
        where: { userId },
        select: { bestStreak: true, streak: true },
      }),
      this.prisma.userWordProgress.findMany({
        where: {
          userId,
          status: { in: ['LEARNING', 'REVIEW', 'KNOWN', 'MASTERED'] },
          updatedAt: { gte: today, lte: endOfToday },
        },
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.userWordProgress.findMany({
        where: {
          userId,
          status: { in: ['LEARNING', 'REVIEW', 'KNOWN', 'MASTERED'] },
        },
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.listeningSession.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { completedAt: true, xpEarned: true, topic: true },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.listeningSession.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: today, lte: endOfToday },
        },
      }),
      this.prisma.weeklyVocabularyTest.findMany({
        where: { userId, status: { in: ['PASSED', 'FAILED'] } },
        select: { score: true, updatedAt: true, passedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.quizResult.findMany({
        where: { userId },
        select: { score: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.writingSubmission.findMany({
        where: { userId, score: { not: null } },
        select: { score: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.writingSubmission.count({
        where: {
          userId,
          score: { not: null },
          createdAt: { gte: today, lte: endOfToday },
        },
      }),
      this.prisma.userMission.findMany({
        where: { userId, completed: true },
        include: { mission: true },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.userMission.findMany({
        where: {
          userId,
          completed: true,
          completedAt: { gte: weekStart, lte: endOfToday },
        },
        include: { mission: true },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.petReward.findMany({
        where: { userId },
        select: {
          xp: true,
          createdAt: true,
          lesson: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.arenaRewardLog.findMany({
        where: { userId },
        select: { isWinner: true, arenaDelta: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.grammarLessonProgress.findMany({
        where: { userId, completed: true },
        select: {
          score: true,
          completedAt: true,
          lesson: { select: { title: true } },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.grammarLessonProgress.count({
        where: {
          userId,
          completed: true,
          completedAt: { gte: today, lte: endOfToday },
        },
      }),
      this.prisma.readingSession.findMany({
        where: { userId, isCompleted: true },
        select: {
          id: true,
          completedAt: true,
          earnedXp: true,
          score: true,
          accuracy: true,
          article: { select: { title: true } },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.readingSession.count({
        where: {
          userId,
          isCompleted: true,
          completedAt: { gte: today, lte: endOfToday },
        },
      }),
      this.prisma.speakingSession.findMany({
        where: { userId, status: 'COMPLETED' },
        select: {
          id: true,
          overallScore: true,
          finishedAt: true,
          lesson: { select: { title: true } },
          topic: { select: { title: true } },
        },
        orderBy: { finishedAt: 'desc' },
      }),
      this.prisma.speakingSession.count({
        where: {
          userId,
          status: 'COMPLETED',
          finishedAt: { gte: today, lte: endOfToday },
        },
      }),
      this.prisma.writingSession.findMany({
        where: { userId, isSubmitted: true },
        select: {
          id: true,
          overallScore: true,
          submittedAt: true,
          lesson: { select: { title: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.writingSession.count({
        where: {
          userId,
          isSubmitted: true,
          submittedAt: { gte: today, lte: endOfToday },
        },
      }),
      this.prisma.userMissionV2.findMany({
        where: {
          userId,
          status: { in: [MissionV2Status.COMPLETED, MissionV2Status.CLAIMED] },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.userMissionV2.findMany({
        where: {
          userId,
          status: { in: [MissionV2Status.COMPLETED, MissionV2Status.CLAIMED] },
          completedAt: { gte: weekStart, lte: endOfToday },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.placementResult.findFirst({
        where: { userId, status: PlacementResultStatus.READY },
        include: { phases: true },
        orderBy: { generatedAt: 'desc' },
      }),
    ]);

    const streakDays = Math.max(
      overview.stats.streakDays || 0,
      petProfile?.streak || 0,
    );
    const longestStreak = Math.max(streakDays, petProfile?.bestStreak || 0);
    const totalTests = weeklyTests.length + quizResults.length;
    const xpEarned =
      user?.xp ||
      0 ||
      overview.profile.xp +
        listeningSessions.reduce((sum, item) => sum + (item.xpEarned || 0), 0) +
        completedMissions.reduce(
          (sum, item) => sum + (item.mission?.rewardXp || 0),
          0,
        );

    const recent = [
      streakDays > 0 && {
        key: 'streak',
        title: `${streakDays} ngày liên tiếp`,
        description: `Bạn đã duy trì học tập ${streakDays} ngày liên tiếp.`,
        tag: 'Chuỗi ngày học',
        category: 'system',
        icon: 'fire',
        tone: 'orange',
        xp: streakDays * 10,
        dateLabel: streakDays === 1 ? 'Hôm nay' : `${streakDays} ngày`,
        date: today,
      },
      listeningToday > 0 && {
        key: 'listening-today',
        title: 'Nghe chăm chỉ',
        description: `Hoàn thành ${listeningToday} bài luyện nghe trong ngày.`,
        tag: 'Kỹ năng Nghe',
        category: 'learning',
        icon: 'headphones',
        tone: 'emerald',
        xp: listeningToday * 5,
        dateLabel: 'Hôm nay',
        date: listeningSessions[0]?.completedAt || today,
      },
      learnedToday.length > 0 && {
        key: 'words-today',
        title: 'Từ vựng mới',
        description: `Học ${learnedToday.length} từ mới trong ngày.`,
        tag: 'Kỹ năng Từ vựng',
        category: 'learning',
        icon: 'book',
        tone: 'pink',
        xp: learnedToday.length * 5,
        dateLabel: 'Hôm nay',
        date: learnedToday[0]?.updatedAt || today,
      },
      totalTests > 0 && {
        key: 'quick-tests',
        title: 'Kiểm tra nhanh',
        description: `Hoàn thành ${totalTests} bài kiểm tra.`,
        tag: 'Thử thách',
        category: 'challenge',
        icon: 'target',
        tone: 'orange',
        xp: totalTests * 10,
        dateLabel: timeAgo(
          weeklyTests[0]?.passedAt ||
            weeklyTests[0]?.updatedAt ||
            quizResults[0]?.createdAt,
        ),
        date:
          weeklyTests[0]?.passedAt ||
          weeklyTests[0]?.updatedAt ||
          quizResults[0]?.createdAt ||
          today,
      },
      writingToday > 0 && {
        key: 'writing-today',
        title: 'Viết đều đặn',
        description: `Hoàn thành ${writingToday} bài viết trong ngày.`,
        tag: 'Kỹ năng Viết',
        category: 'learning',
        icon: 'pen',
        tone: 'blue',
        xp: writingToday * 10,
        dateLabel: 'Hôm nay',
        date: writingSubmissions[0]?.createdAt || today,
      },
      grammarToday > 0 && {
        key: 'grammar-today',
        title: 'Ngữ pháp chắc tay',
        description: `Hoàn thành ${grammarToday} bài ngữ pháp trong ngày.`,
        tag: 'Kỹ năng Ngữ pháp',
        category: 'learning',
        icon: 'exercise',
        tone: 'purple',
        xp: grammarToday * 10,
        dateLabel: 'Hôm nay',
        date: grammarCompleted[0]?.completedAt || today,
      },
      readingToday > 0 && {
        key: 'reading-today',
        title: 'Đọc hiểu đều đặn',
        description: `Hoàn thành ${readingToday} bài đọc trong ngày.`,
        tag: 'Kỹ năng Đọc',
        category: 'learning',
        icon: 'book',
        tone: 'emerald',
        xp: readingToday * 10,
        dateLabel: 'Hôm nay',
        date: readingSessions[0]?.completedAt || today,
      },
      speakingToday > 0 && {
        key: 'speaking-today',
        title: 'Nói tự tin',
        description: `Hoàn thành ${speakingToday} bài luyện nói trong ngày.`,
        tag: 'Kỹ năng Nói',
        category: 'learning',
        icon: 'mic',
        tone: 'orange',
        xp: speakingToday * 10,
        dateLabel: 'Hôm nay',
        date: speakingSessions[0]?.finishedAt || today,
      },
      writingSessionsToday > 0 && {
        key: 'writing-session-today',
        title: 'Bài viết AI',
        description: `Gửi ${writingSessionsToday} bài Writing để AI đánh giá trong ngày.`,
        tag: 'Kỹ năng Viết',
        category: 'learning',
        icon: 'pen',
        tone: 'blue',
        xp: writingSessionsToday * 15,
        dateLabel: 'Hôm nay',
        date: writingSessions[0]?.submittedAt || today,
      },
      completedMissionsThisWeek.length > 0 && {
        key: 'weekly-challenges',
        title: 'Thử thách tuần',
        description: `Hoàn thành ${completedMissionsThisWeek.length} thử thách tuần.`,
        tag: 'Thử thách',
        category: 'challenge',
        icon: 'trophy',
        tone: 'purple',
        xp: completedMissionsThisWeek.reduce(
          (sum, item) => sum + (item.mission?.rewardXp || 0),
          0,
        ),
        dateLabel: timeAgo(completedMissionsThisWeek[0]?.completedAt),
        date: completedMissionsThisWeek[0]?.completedAt || today,
      },
      completedMissionsV2ThisWeek.length > 0 && {
        key: 'mission-v2-week',
        title: 'Nhiệm vụ PoppyLingo',
        description: `Hoàn thành ${completedMissionsV2ThisWeek.length} nhiệm vụ mới trong tuần.`,
        tag: 'Mission V2',
        category: 'challenge',
        icon: 'target',
        tone: 'purple',
        xp: completedMissionsV2ThisWeek.reduce(
          (sum, item) => sum + (item.rewardXp || 0),
          0,
        ),
        dateLabel: timeAgo(completedMissionsV2ThisWeek[0]?.completedAt),
        date: completedMissionsV2ThisWeek[0]?.completedAt || today,
      },
      latestPlacementResult && {
        key: 'learning-path',
        title: 'Lộ trình cá nhân',
        description: `Lộ trình học đạt ${
          latestPlacementResult.phases.length
            ? Math.round(
                latestPlacementResult.phases.reduce(
                  (sum, phase) => sum + phase.progress,
                  0,
                ) / latestPlacementResult.phases.length,
              )
            : 0
        }% tiến độ.`,
        tag: 'Learning Path',
        category: 'system',
        icon: 'sparkles',
        tone: 'purple',
        xp: Math.round(latestPlacementResult.overallScore),
        dateLabel: timeAgo(latestPlacementResult.generatedAt),
        date: latestPlacementResult.generatedAt,
      },
      (user?.xp || 0) > 0 && {
        key: 'xp-total',
        title: 'Thợ săn XP',
        description: `Tích lũy ${user?.xp || 0} XP trong quá trình học.`,
        tag: 'XP',
        category: 'system',
        icon: 'zap',
        tone: 'yellow',
        xp: user?.xp || 0,
        dateLabel: 'Tổng tích lũy',
        date: today,
      },
      (user?.level || 1) > 1 && {
        key: 'level-up',
        title: `Level ${user?.level}`,
        description: `Bạn đã đạt cấp độ ${user?.level}.`,
        tag: 'Level',
        category: 'system',
        icon: 'star',
        tone: 'yellow',
        xp: (user?.level || 1) * 25,
        dateLabel: 'Đã mở khóa',
        date: today,
      },
      ...petRewards.map((reward) => ({
        key: `pet-${reward.createdAt.getTime()}`,
        title: 'Hoàn thành bài học',
        description: reward.lesson?.title || 'Nhận thưởng sau khi học bài.',
        tag: 'Hệ thống',
        category: 'system',
        icon: 'star',
        tone: 'yellow',
        xp: reward.xp || 0,
        dateLabel: timeAgo(reward.createdAt),
        date: reward.createdAt,
      })),
      ...arenaRewards.map((reward) => ({
        key: `arena-${reward.createdAt.getTime()}`,
        title: reward.isWinner
          ? 'Chiến thắng đấu trường'
          : 'Thi đấu đấu trường',
        description: `Điểm đấu trường ${reward.arenaDelta >= 0 ? '+' : ''}${reward.arenaDelta}.`,
        tag: 'Thử thách',
        category: 'challenge',
        icon: 'arena',
        tone: 'purple',
        xp: Math.max(0, reward.arenaDelta),
        dateLabel: timeAgo(reward.createdAt),
        date: reward.createdAt,
      })),
    ]
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 20);

    const goals = [
      {
        key: 'streak-7',
        title: '7 ngày liên tiếp',
        subtitle: 'Học liên tục 7 ngày',
        icon: 'fire',
        current: Math.min(streakDays, 7),
        target: 7,
      },
      {
        key: 'vocabulary-50',
        title: 'Bậc thầy từ vựng',
        subtitle: 'Học 50 từ mới',
        icon: 'book',
        current: Math.min(learnedWords.length, 50),
        target: 50,
      },
      {
        key: 'listening-50',
        title: 'Nghe chuyên nghiệp',
        subtitle: 'Hoàn thành 50 bài nghe',
        icon: 'headphones',
        current: Math.min(listeningSessions.length, 50),
        target: 50,
      },
      {
        key: 'grammar-20',
        title: 'Bậc thầy ngữ pháp',
        subtitle: 'Hoàn thành 20 bài ngữ pháp',
        icon: 'exercise',
        current: Math.min(grammarCompleted.length, 20),
        target: 20,
      },
      {
        key: 'reading-20',
        title: 'Đọc hiểu bền bỉ',
        subtitle: 'Hoàn thành 20 bài đọc',
        icon: 'book',
        current: Math.min(readingSessions.length, 20),
        target: 20,
      },
      {
        key: 'speaking-20',
        title: 'Nói tự tin',
        subtitle: 'Hoàn thành 20 bài nói',
        icon: 'mic',
        current: Math.min(speakingSessions.length, 20),
        target: 20,
      },
      {
        key: 'writing-20',
        title: 'Viết đều đặn',
        subtitle: 'Gửi 20 bài Writing',
        icon: 'pen',
        current: Math.min(
          writingSessions.length + writingSubmissions.length,
          20,
        ),
        target: 20,
      },
      {
        key: 'mission-v2-30',
        title: 'Chinh phục nhiệm vụ',
        subtitle: 'Hoàn thành 30 Mission V2',
        icon: 'target',
        current: Math.min(completedMissionsV2.length, 30),
        target: 30,
      },
    ];

    const goalsWithState = goals.map((goal) => {
      const progressPercent = goal.target
        ? Math.min(100, Math.round((goal.current / goal.target) * 100))
        : 0;
      const unlocked = goal.current >= goal.target;

      return {
        ...goal,
        progressPercent,
        locked: !unlocked,
        unlocked,
        claimable: unlocked,
        claimed: unlocked,
      };
    });

    return {
      user: overview.user,
      summary: {
        totalAchievements: recent.length,
        xpEarned,
        completedChallenges:
          completedMissions.length + completedMissionsV2.length + totalTests,
        longestStreak,
      },
      recent,
      goals: goalsWithState,
      categories: [
        { key: 'all', label: 'Tất cả' },
        { key: 'learning', label: 'Học tập' },
        { key: 'challenge', label: 'Thử thách' },
        { key: 'system', label: 'Hệ thống' },
      ],
    };
  }

  async getAchievementDetail(userId: string, key: string) {
    const overview = await this.getAchievementOverview(userId);
    const achievement = (overview.recent as any[]).find(
      (item) => item.key === key,
    );

    if (!achievement) {
      throw new NotFoundException('Không tìm thấy thành tích này.');
    }

    const now = new Date();
    const timeText = (date?: Date | null) => {
      if (!date) return '';
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(date));
    };
    const dateText = (date?: Date | null) => {
      if (!date) return '';
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      }).format(new Date(date));
    };

    const [
      petProfile,
      learnedWords,
      listeningSessions,
      weeklyTests,
      quizResults,
      writingSubmissions,
      completedMissions,
    ] = await Promise.all([
      this.prisma.petProfile.findUnique({
        where: { userId },
        select: { streak: true, bestStreak: true },
      }),
      this.prisma.userWordProgress.findMany({
        where: {
          userId,
          status: { in: ['LEARNING', 'REVIEW', 'KNOWN', 'MASTERED'] },
        },
        select: {
          id: true,
          updatedAt: true,
          word: { select: { word: true, meaningVi: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.listeningSession.findMany({
        where: { userId, status: 'COMPLETED' },
        select: {
          id: true,
          completedAt: true,
          topic: true,
          xpEarned: true,
          score: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 20,
      }),
      this.prisma.weeklyVocabularyTest.findMany({
        where: { userId, status: { in: ['PASSED', 'FAILED'] } },
        select: { id: true, score: true, updatedAt: true, passedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      this.prisma.quizResult.findMany({
        where: { userId },
        select: {
          id: true,
          score: true,
          createdAt: true,
          lesson: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.writingSubmission.findMany({
        where: { userId, score: { not: null } },
        select: { id: true, score: true, createdAt: true, style: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.userMission.findMany({
        where: { userId, completed: true },
        include: { mission: true },
        orderBy: { completedAt: 'desc' },
        take: 20,
      }),
    ]);

    const streak = Math.max(
      petProfile?.streak || 0,
      (overview.summary as any).longestStreak || 0,
    );
    const testsCount = weeklyTests.length + quizResults.length;
    const baseActivities = {
      streak: [
        ...listeningSessions.slice(0, 2).map((item) => ({
          id: item.id,
          type: 'listening',
          title: item.topic ? `Luyện nghe chủ đề ${item.topic}` : 'Luyện nghe',
          subtitle: `Điểm ${item.score}%`,
          time: timeText(item.completedAt),
          xp: item.xpEarned || 0,
          icon: 'headphones',
        })),
        ...learnedWords.slice(0, 1).map((item) => ({
          id: item.id,
          type: 'vocabulary',
          title: 'Học từ vựng mới',
          subtitle: item.word?.word || 'Từ mới',
          time: timeText(item.updatedAt),
          xp: 15,
          icon: 'book',
        })),
        ...writingSubmissions.slice(0, 1).map((item) => ({
          id: item.id,
          type: 'writing',
          title: 'Viết câu',
          subtitle: item.style || `Điểm ${item.score || 0}%`,
          time: timeText(item.createdAt),
          xp: 10,
          icon: 'pen',
        })),
      ],
      'listening-today': listeningSessions.slice(0, 6).map((item) => ({
        id: item.id,
        type: 'listening',
        title: item.topic ? `Luyện nghe chủ đề ${item.topic}` : 'Luyện nghe',
        subtitle: `Điểm ${item.score}%`,
        time: timeText(item.completedAt),
        xp: item.xpEarned || 0,
        icon: 'headphones',
      })),
      'words-today': learnedWords.slice(0, 6).map((item) => ({
        id: item.id,
        type: 'vocabulary',
        title: item.word?.word || 'Từ vựng mới',
        subtitle: item.word?.meaningVi || 'Đã học',
        time: timeText(item.updatedAt),
        xp: 5,
        icon: 'book',
      })),
      'quick-tests': [
        ...weeklyTests.map((item) => ({
          id: item.id,
          type: 'weekly-test',
          title: 'Kiểm tra từ vựng',
          subtitle: `Điểm ${item.score}%`,
          time: timeText(item.passedAt || item.updatedAt),
          xp: 10,
          icon: 'target',
        })),
        ...quizResults.map((item) => ({
          id: item.id,
          type: 'quiz',
          title: item.lesson?.title || 'Bài tập ngữ pháp',
          subtitle: `Điểm ${item.score}%`,
          time: timeText(item.createdAt),
          xp: 10,
          icon: 'target',
        })),
      ].slice(0, 6),
      'writing-today': writingSubmissions.slice(0, 6).map((item) => ({
        id: item.id,
        type: 'writing',
        title: 'Viết câu',
        subtitle: item.style || `Điểm ${item.score || 0}%`,
        time: timeText(item.createdAt),
        xp: 10,
        icon: 'pen',
      })),
      'weekly-challenges': completedMissions.slice(0, 6).map((item) => ({
        id: item.id,
        type: 'mission',
        title: item.mission?.title || 'Thử thách',
        subtitle: item.mission?.description || 'Đã hoàn thành',
        time: timeText(item.completedAt),
        xp: item.mission?.rewardXp || 0,
        icon: 'trophy',
      })),
    };

    const current =
      key === 'streak'
        ? streak
        : key === 'listening-today'
          ? listeningSessions.length
          : key === 'words-today'
            ? learnedWords.length
            : key === 'quick-tests'
              ? testsCount
              : key === 'writing-today'
                ? writingSubmissions.length
                : key === 'weekly-challenges'
                  ? completedMissions.length
                  : achievement.xp || 0;

    const target =
      key === 'streak'
        ? 7
        : key === 'listening-today'
          ? 10
          : key === 'words-today'
            ? 50
            : key === 'quick-tests'
              ? 5
              : key === 'writing-today'
                ? 7
                : key === 'weekly-challenges'
                  ? 7
                  : Math.max(current, 1);

    const rewardSteps =
      key === 'streak'
        ? [
            { label: '1 ngày', reward: '+10 XP', required: 1 },
            { label: '3 ngày', reward: '+30 XP', required: 3 },
            { label: '7 ngày', reward: '+100 XP', required: 7 },
            { label: '14 ngày', reward: '+200 XP', required: 14 },
            { label: '30 ngày', reward: '+500 XP', required: 30 },
          ]
        : [
            {
              label: 'Mốc 1',
              reward: '+10 XP',
              required: Math.max(1, Math.ceil(target * 0.25)),
            },
            {
              label: 'Mốc 2',
              reward: '+30 XP',
              required: Math.max(2, Math.ceil(target * 0.5)),
            },
            { label: 'Mốc 3', reward: '+100 XP', required: target },
          ];

    const progressSteps = Array.from(
      { length: Math.min(target, 7) },
      (_, index) => ({
        label: `${index + 1} ${key === 'streak' ? 'ngày' : 'mốc'}`,
        date: index === 0 ? dateText(now) : '',
        done: current >= index + 1,
        value: index + 1,
      }),
    );

    return {
      achievement: {
        ...achievement,
        achievedAt: achievement.dateLabel || 'Gần đây',
      },
      overview: {
        title: 'Tổng quan thành tích',
        description:
          key === 'streak'
            ? 'Duy trì học tập mỗi ngày để xây dựng thói quen và đạt chuỗi dài hơn!'
            : 'Tiếp tục luyện tập để mở thêm các mốc thưởng tiếp theo.',
        current,
        target,
        unit: key === 'streak' ? 'ngày' : 'mốc',
        progressSteps,
        tip:
          key === 'streak'
            ? 'Học mỗi ngày một chút sẽ giúp bạn tiến bộ nhanh hơn và ghi nhớ lâu hơn!'
            : 'Duy trì nhịp học đều sẽ giúp bạn đạt thành tích này nhanh hơn.',
      },
      rewards: rewardSteps.map((step) => ({
        ...step,
        claimed: current >= step.required,
        locked: current < step.required,
      })),
      activities: (baseActivities as any)[key]?.length
        ? (baseActivities as any)[key]
        : [
            {
              title: achievement.title,
              subtitle: achievement.description,
              time: timeText(now),
              xp: achievement.xp || 0,
              icon: achievement.icon,
              id: key,
              type: 'achievement',
            },
          ],
      suggestions: [
        {
          title:
            key === 'streak'
              ? `Học thêm ${Math.max(0, target - current)} ngày nữa để mở khóa mốc tiếp theo!`
              : `Hoàn thành thêm ${Math.max(0, target - current)} hoạt động nữa.`,
          subtitle: `Bạn sẽ nhận được thêm phần thưởng khi đạt mốc.`,
          icon: 'calendar',
        },
        {
          title: 'Đặt mục tiêu học mỗi ngày',
          subtitle: 'Chỉ 15-20 phút mỗi ngày thôi!',
          icon: 'pen',
        },
        {
          title: 'Theo dõi tiến độ thường xuyên',
          subtitle: 'Bạn sẽ có thêm động lực!',
          icon: 'sparkles',
        },
      ],
    };
  }

  async getAchievementActivityDetail(
    userId: string,
    key: string,
    type: string,
    id: string,
  ) {
    if (!type || !id) {
      throw new NotFoundException('Thiếu thông tin hoạt động.');
    }

    const detail = await this.getAchievementDetail(userId, key);
    const reward = detail.rewards;
    const suggestions = [
      {
        title: 'Luyện nghe chủ đề Khách sạn',
        subtitle: 'Nâng cao kỹ năng nghe hiểu',
        href: '/listening',
        icon: 'headphones',
      },
      {
        title: 'Học từ vựng chủ đề Du lịch',
        subtitle: 'Mở rộng vốn từ qua flashcards',
        href: '/vocabulary',
        icon: 'book',
      },
      {
        title: 'Luyện viết đoạn văn Du lịch',
        subtitle: 'Rèn kỹ năng viết hiệu quả',
        href: '/writing',
        icon: 'pen',
      },
      {
        title: 'Luyện nói tình huống Du lịch',
        subtitle: 'Tự tin giao tiếp khi đi du lịch',
        href: '/speaking',
        icon: 'mic',
      },
    ];
    const timeText = (date?: Date | null) => {
      if (!date) return '';
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(date));
    };
    const dateText = (date?: Date | null) => {
      if (!date) return '';
      return new Intl.DateTimeFormat('vi-VN').format(new Date(date));
    };

    if (type === 'listening') {
      const session = await this.prisma.listeningSession.findFirst({
        where: { id, userId },
        include: {
          answer: {
            include: { question: true },
            orderBy: { answeredAt: 'asc' },
          },
        },
      });
      if (!session)
        throw new NotFoundException('Không tìm thấy hoạt động nghe.');

      const answered = session.answer.filter((item) => !item.isSkipped);
      const correct =
        session.correct || answered.filter((item) => item.isCorrect).length;
      const total = session.total || session.answer.length || 1;
      const durationSeconds =
        session.answer.reduce((sum, item) => sum + (item.timeSpent || 0), 0) ||
        (session.completedAt
          ? Math.max(
              0,
              Math.round(
                (new Date(session.completedAt).getTime() -
                  new Date(session.startedAt).getTime()) /
                  1000,
              ),
            )
          : 0);
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      const firstQuestion = session.answer[0]?.question;

      return {
        header: {
          title: session.topic
            ? `Luyện nghe chủ đề ${session.topic}`
            : 'Luyện nghe',
          subtitle:
            firstQuestion?.title || `Hoàn thành ${total} câu luyện nghe`,
          tag: 'Kỹ năng Nghe',
          icon: 'headphones',
          tone: 'purple',
          completedAt: `Hoàn thành lúc ${timeText(session.completedAt)} - ${dateText(session.completedAt)}`,
          xp: session.xpEarned || correct * 3,
        },
        stats: [
          {
            label: 'Điểm số',
            value: `${session.score || Math.round((correct / total) * 100)}%`,
            sub: `${correct}/${total} câu đúng`,
            icon: 'target',
            tone: 'purple',
          },
          {
            label: 'Thời gian',
            value: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
            sub: 'Phút',
            icon: 'check',
            tone: 'emerald',
          },
          {
            label: 'Độ khó',
            value: session.level || 'Trung bình',
            sub: session.level
              ? `Cấp độ ${session.level}`
              : 'Theo trình độ hiện tại',
            icon: 'zap',
            tone: 'orange',
          },
          {
            label: 'XP nhận được',
            value: `+${session.xpEarned || correct * 3} XP`,
            sub: session.completedAt ? 'Đã hoàn thành' : 'Đang học',
            icon: 'star',
            tone: 'blue',
          },
        ],
        content: {
          title: firstQuestion?.title || session.topic || 'Bài luyện nghe',
          description:
            firstQuestion?.transcript ||
            firstQuestion?.question ||
            'Nội dung luyện nghe đã hoàn thành.',
          level: session.level || 'B1',
          topic: session.topic || 'Listening',
          duration: firstQuestion?.duration
            ? `${Math.floor(firstQuestion.duration / 60)
                .toString()
                .padStart(
                  2,
                  '0',
                )}:${(firstQuestion.duration % 60).toString().padStart(2, '0')}`
            : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
          mediaUrl: firstQuestion?.audioUrl || '',
          actionLabel: 'Luyện lại bài học',
          actionHref: '/listening',
        },
        timeline: [
          {
            time: timeText(session.startedAt),
            title: 'Bắt đầu bài học',
            xp: 0,
            icon: 'play',
            done: true,
          },
          ...session.answer.slice(0, 4).map((item, index) => ({
            time: timeText(item.answeredAt),
            title: item.isCorrect
              ? `Trả lời đúng câu ${index + 1}`
              : item.isSkipped
                ? `Bỏ qua câu ${index + 1}`
                : `Trả lời sai câu ${index + 1}`,
            xp: item.isCorrect ? 3 : 0,
            icon: item.isCorrect ? 'check' : 'x',
            done: Boolean(item.isCorrect),
          })),
          {
            time: timeText(session.completedAt),
            title: 'Hoàn thành bài học',
            xp: session.xpEarned || correct * 3,
            icon: 'trophy',
            done: true,
          },
        ],
        rewards: reward,
        suggestions,
      };
    }

    if (type === 'writing') {
      const writing = await this.prisma.writingSubmission.findFirst({
        where: { id, userId },
      });
      if (!writing)
        throw new NotFoundException('Không tìm thấy hoạt động viết.');

      return {
        header: {
          title: 'Viết câu',
          subtitle: writing.style || 'Hoạt động luyện viết',
          tag: 'Kỹ năng Viết',
          icon: 'pen',
          tone: 'blue',
          completedAt: `Hoàn thành lúc ${timeText(writing.createdAt)} - ${dateText(writing.createdAt)}`,
          xp: 10,
        },
        stats: [
          {
            label: 'Điểm số',
            value: `${writing.score || 0}%`,
            sub: 'Tổng điểm',
            icon: 'target',
            tone: 'purple',
          },
          {
            label: 'Từ vựng',
            value: `${writing.vocabularyScore || 0}%`,
            sub: 'Vốn từ',
            icon: 'book',
            tone: 'pink',
          },
          {
            label: 'Ngữ pháp',
            value: `${writing.grammarScore || 0}%`,
            sub: 'Độ chính xác',
            icon: 'exercise',
            tone: 'orange',
          },
          {
            label: 'XP nhận được',
            value: '+10 XP',
            sub: 'Đã hoàn thành',
            icon: 'star',
            tone: 'blue',
          },
        ],
        content: {
          title: writing.style || 'Bài viết của bạn',
          description: writing.summary || writing.originalText,
          level: writing.level || 'B1',
          topic: 'Writing',
          duration: '05:00',
          mediaUrl: '',
          actionLabel: 'Luyện viết tiếp',
          actionHref: '/writing',
        },
        timeline: [
          {
            time: timeText(writing.createdAt),
            title: 'Bắt đầu viết',
            xp: 0,
            icon: 'play',
            done: true,
          },
          {
            time: timeText(writing.updatedAt),
            title: 'Nhận góp ý và chấm điểm',
            xp: 5,
            icon: 'check',
            done: true,
          },
          {
            time: timeText(writing.updatedAt),
            title: 'Hoàn thành hoạt động',
            xp: 10,
            icon: 'trophy',
            done: true,
          },
        ],
        rewards: reward,
        suggestions,
      };
    }

    if (type === 'vocabulary') {
      const progress = await this.prisma.userWordProgress.findFirst({
        where: { id, userId },
        include: { word: { include: { topic: true } } },
      });
      if (!progress)
        throw new NotFoundException('Không tìm thấy hoạt động từ vựng.');

      return {
        header: {
          title: `Học từ "${progress.word.word}"`,
          subtitle:
            progress.word.meaningVi || progress.word.meaningEn || 'Từ vựng mới',
          tag: 'Kỹ năng Từ vựng',
          icon: 'book',
          tone: 'pink',
          completedAt: `Hoàn thành lúc ${timeText(progress.updatedAt)} - ${dateText(progress.updatedAt)}`,
          xp: 5,
        },
        stats: [
          {
            label: 'Số lần học',
            value: String(progress.seenCount),
            sub: 'Lượt xem',
            icon: 'book',
            tone: 'purple',
          },
          {
            label: 'Trả lời đúng',
            value: String(progress.correctCount),
            sub: 'Lần',
            icon: 'check',
            tone: 'emerald',
          },
          {
            label: 'Cần ôn',
            value: String(progress.wrongCount),
            sub: 'Lần quên',
            icon: 'target',
            tone: 'orange',
          },
          {
            label: 'XP nhận được',
            value: '+5 XP',
            sub: 'Đã học',
            icon: 'star',
            tone: 'blue',
          },
        ],
        content: {
          title: progress.word.word,
          description:
            progress.word.example ||
            progress.word.meaningVi ||
            'Từ vựng đã học.',
          level: progress.word.level,
          topic: progress.word.topic?.name || 'Vocabulary',
          duration: '02:00',
          mediaUrl: progress.word.audio || '',
          actionLabel: 'Ôn lại từ này',
          actionHref: '/vocabulary/review',
        },
        timeline: [
          {
            time: timeText(progress.createdAt),
            title: 'Bắt đầu học từ',
            xp: 0,
            icon: 'play',
            done: true,
          },
          {
            time: timeText(progress.updatedAt),
            title: 'Cập nhật tiến độ',
            xp: 5,
            icon: 'check',
            done: true,
          },
          {
            time: timeText(progress.reviewAt),
            title: 'Lịch ôn tiếp theo',
            xp: 0,
            icon: 'calendar',
            done: Boolean(progress.reviewAt),
          },
        ],
        rewards: reward,
        suggestions,
      };
    }

    throw new NotFoundException('Chưa hỗ trợ chi tiết cho loại hoạt động này.');
  }

  async bootstrapTodayVocabulary(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const { weekStart } = this.getWeekRange();

    // 1. Tạo topic nếu DB chưa có
    await this.ensureTopicsForLevel(profile.level);

    // 2. Tạo weekly pool nếu chưa có. Từ vựng sẽ được bổ sung theo từng topic
    // khi tạo ngày học, tránh gọi AI cho toàn bộ kho từ trong request hôm nay.
    await this.ensureWeeklyPool(profile.level, weekStart);

    // 3. Tạo user weekly plan
    return this.getOrCreateUserWeeklyPlan(userId);
  }

  async ensureTopicsForLevel(level: string) {
    const count = await this.prisma.wordTopic.count();

    if (count > 0) return;

    const defaultTopics = [
      'Food',
      'Family',
      'School',
      'Weather',
      'Daily Life',
      'Animals',
      'Travel',
    ];

    for (const name of defaultTopics) {
      await this.prisma.wordTopic.upsert({
        where: {
          slug: name.toLowerCase().replace(/\s+/g, '-'),
        },
        update: {},
        create: {
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
        },
      });
    }
  }

  async ensureWordsForLevel(level: string) {
    const topics = await this.prisma.wordTopic.findMany();

    for (const topic of topics) {
      const count = await this.prisma.word.count({
        where: {
          topicId: topic.id,
          level,
        },
      });

      if (count >= 10) continue;

      await this.generateWordsByGemini({
        topicId: topic.id,
        level,
        count: 10 - count,
      });
    }
  }

  async ensureWeeklyPool(level: string, weekStart: Date) {
    const existed = await this.prisma.weeklyTopicPool.findUnique({
      where: {
        level_weekStart: {
          level,
          weekStart,
        },
      },
    });

    if (existed) return existed;

    return this.vocabularyJobService.generatePoolForLevel(level);
  }

  async repairUserWeeklyPlanDays(
    userId: string,
    planId: string,
    weekStart: Date,
    level: string,
    dailyWordTarget: number,
  ) {
    const plan = await this.prisma.userWeeklyVocabularyPlan.findUnique({
      where: { id: planId },
      include: {
        pool: {
          include: {
            topics: true,
          },
        },
        days: true,
      },
    });

    if (!plan) throw new NotFoundException('Không tìm thấy weekly plan');

    await this.ensureWeeklyPoolHasTopics(plan.poolId, level);

    const existingDates = new Set(
      plan.days.map((d) => new Date(d.date).toISOString().slice(0, 10)),
    );
    const existingTopicIds = new Set(plan.days.map((day) => day.topicId));

    const repairedPool = await this.prisma.weeklyTopicPool.findUnique({
      where: { id: plan.poolId },
      include: { topics: true },
    });

    let availableTopics = Array.from(
      new Map(
        (repairedPool?.topics || plan.pool.topics).map((item) => [
          item.topicId,
          item,
        ]),
      ).values(),
    ).filter((item) => !existingTopicIds.has(item.topicId));

    if (!availableTopics.length) {
      const fallbackTopics = await this.prisma.wordTopic.findMany({
        where: { id: { notIn: [...existingTopicIds] } },
        take: 7,
      });

      availableTopics = fallbackTopics.map((topic, index) => ({
        id: `fallback-${topic.id}`,
        poolId: plan.poolId,
        topicId: topic.id,
        order: index + 1,
      }));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const key = date.toISOString().slice(0, 10);
      if (existingDates.has(key)) continue;

      const topic = availableTopics[i % availableTopics.length];
      const status = date < today ? 'MISSED' : 'AVAILABLE';

      const dayPlan = await this.prisma.userDailyVocabularyPlan.create({
        data: {
          planId,
          date,
          dayOfWeek: i === 6 ? 0 : i + 2,
          topicId: topic.topicId,
          level,
          status,
        },
      });

      const words = await this.pickWordsForUser({
        userId,
        topicId: topic.topicId,
        level,
        limit: dailyWordTarget,
      });

      if (words.length) {
        await this.prisma.userDailyVocabularyWord.createMany({
          data: words.map((word, j) => ({
            dayId: dayPlan.id,
            wordId: word.id,
            order: j + 1,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  async getReviewDashboard(userId: string) {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const [urgent, normal, later, completedToday, allProgress, reviewTopics] =
      await Promise.all([
        this.prisma.userWordProgress.count({
          where: {
            userId,
            reviewAt: { lte: endOfToday },
            status: {
              in: ['LEARNING', 'REVIEW', 'KNOWN'],
            },
          },
        }),
        this.prisma.userWordProgress.count({
          where: {
            userId,
            status: { in: ['LEARNING', 'REVIEW', 'KNOWN'] },
            reviewAt: {
              gt: endOfToday,
              lte: next7Days,
            },
          },
        }),

        this.prisma.userWordProgress.count({
          where: {
            userId,
            status: { in: ['LEARNING', 'REVIEW', 'KNOWN'] },
            reviewAt: {
              gt: next7Days,
              lte: next30Days,
            },
          },
        }),

        this.prisma.userWordProgress.count({
          where: {
            userId,
            updatedAt: {
              gte: this.startOfToday(),
              lte: endOfToday,
            },
          },
        }),
        this.prisma.userWordProgress.findMany({
          where: { userId },
          select: {
            status: true,
            updatedAt: true,
            reviewAt: true,
            correctCount: true,
            wrongCount: true,
          },
        }),
        this.prisma.userWordProgress.findMany({
          where: {
            userId,
            status: { in: ['LEARNING', 'REVIEW', 'KNOWN'] },
          },
          include: {
            word: {
              include: {
                topic: true,
              },
            },
          },
          take: 200,
        }),
      ]);

    const remembered = allProgress.filter((item) =>
      ['KNOWN', 'MASTERED'].includes(item.status),
    ).length;
    const memoryRate = allProgress.length
      ? Math.round((remembered / allProgress.length) * 100)
      : 0;

    const today = this.startOfToday();
    const trend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const next = new Date(date);
      next.setDate(date.getDate() + 1);

      const reviewed = allProgress.filter(
        (item) => item.updatedAt >= date && item.updatedAt < next,
      );
      const correct = reviewed.reduce(
        (sum, item) => sum + item.correctCount,
        0,
      );
      const wrong = reviewed.reduce((sum, item) => sum + item.wrongCount, 0);

      return {
        date: date.toISOString().slice(0, 10),
        label: `${String(date.getDate()).padStart(2, '0')}/${String(
          date.getMonth() + 1,
        ).padStart(2, '0')}`,
        value:
          correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 0,
      };
    });

    const topicCount = new Map<string, { name: string; count: number }>();
    for (const item of reviewTopics) {
      const topicId = item.word.topic?.id || 'unknown';
      const name = item.word.topic?.name || 'Khác';
      const existed = topicCount.get(topicId);
      topicCount.set(topicId, {
        name,
        count: (existed?.count || 0) + 1,
      });
    }

    const topics = [...topicCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const longestGap = allProgress.reduce((max, item) => {
      const diff = Math.max(
        0,
        Math.floor((today.getTime() - item.updatedAt.getTime()) / 86400000),
      );
      return Math.max(max, diff);
    }, 0);

    return {
      summary: {
        totalReview: urgent + normal + later,
        urgent,
        normal,
        later,
        memoryRate,
        longestGap,
      },
      today: {
        reviewToday: urgent,
        completed: completedToday,
        total: urgent,
        estimatedTime: Math.max(1, Math.ceil(urgent * 0.5)),
        canStart: urgent > 0,
      },
      streak: {
        current: 7, // sau này nối bảng streak thật
        best: 18,
        rewardAt: 14,
        days: [
          { day: 'MON', completed: true },
          { day: 'TUE', completed: true },
          { day: 'WED', completed: true },
          { day: 'THU', completed: true },
          { day: 'FRI', completed: true },
          { day: 'SAT', completed: true },
          { day: 'SUN', completed: false },
        ],
      },
      trend,
      topics,
    };
  }

  startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  async getReviewSession(userId: string) {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const items = await this.prisma.userWordProgress.findMany({
      where: {
        userId,
        status: { in: ['LEARNING', 'REVIEW', 'KNOWN'] },
        reviewAt: {
          lte: endOfToday,
        },
      },
      include: {
        word: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: [{ reviewAt: 'asc' }, { wrongCount: 'desc' }],
      take: 30,
    });

    return {
      sessionId: `review-${userId}-${Date.now()}`,
      total: items.length,
      cards: items.map((item, index) => ({
        order: index + 1,
        progressId: item.id,
        wordId: item.wordId,
        word: item.word.word,
        phonetic: item.word.phonetic,
        audio: item.word.audio,
        meaningVi: item.word.meaningVi,
        meaningEn: item.word.meaningEn,
        example: item.word.example,
        partOfSpeech: item.word.partOfSpeech,
        topic: item.word.topic,
        status: item.status,
        interval: item.interval,
        easeFactor: item.easeFactor,
        correctCount: item.correctCount,
        wrongCount: item.wrongCount,
        reviewAt: item.reviewAt,
      })),
    };
  }

  async submitReviewSession(userId: string, dto: SubmitReviewSessionDto) {
    type ReviewUpdate = {
      wordId: string;
      rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
      isCorrect: boolean;
      nextStatus: WordProgressStatus;
      nextReviewAt: Date | null;
      interval: number;
      easeFactor: number;
    };

    const updates: ReviewUpdate[] = [];

    for (const item of dto.answers) {
      const result = await this.reviewFlashcard(
        userId,
        item.wordId,
        undefined,
        item.quality,
      );

      updates.push(result);
    }

    const again = updates.filter((x) => x.rating === 'AGAIN').length;
    const hard = updates.filter((x) => x.rating === 'HARD').length;
    const good = updates.filter((x) => x.rating === 'GOOD').length;
    const easy = updates.filter((x) => x.rating === 'EASY').length;

    const remembered = good + easy;
    const reviewed = updates.length;

    return {
      completed: true,
      sessionId: dto.sessionId || null,
      reviewed,
      remembered,
      again,
      hard,
      good,
      easy,
      accuracy: reviewed ? Math.round((remembered / reviewed) * 100) : 0,
      reward: {
        xp: remembered * 5 + easy * 2,
        coin: remembered * 2,
        petXp: remembered,
      },
      updates,
    };
  }

  async findTodayPlan(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.userDailyVocabularyPlan.findFirst({
      where: {
        date: today,
        plan: {
          userId,
        },
      },
      include: {
        topic: true,
        words: {
          include: {
            word: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            words: true,
          },
        },
      },
    });
  }

  private async fillTodayPlanWords(userId: string, day: any, required: number) {
    const existedIds = day.words.map((x) => x.wordId);
    const missingCount = Math.max(0, required - existedIds.length);

    if (missingCount === 0) return;

    const words = await this.pickWordsForUser({
      userId,

      topicId: day.topicId,

      level: day.level,

      limit: missingCount,
    });

    const missing = words.filter((x) => !existedIds.includes(x.id));

    if (!missing.length) return;

    await this.prisma.userDailyVocabularyWord.createMany({
      data: missing.map((w, index) => ({
        dayId: day.id,

        wordId: w.id,

        order: existedIds.length + index + 1,
      })),

      skipDuplicates: true,
    });
  }

  async rebuildUserWeeklyPlan(userId: string, planId: string) {
    const plan = await this.prisma.userWeeklyVocabularyPlan.findFirst({
      where: {
        id: planId,
        userId,
      },
      include: {
        days: {
          include: {
            words: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Không tìm thấy weekly plan');
    }

    const dayIds = plan.days.map((day) => day.id);

    await this.prisma.userDailyVocabularyWord.deleteMany({
      where: {
        dayId: {
          in: dayIds,
        },
      },
    });

    await this.prisma.userDailyVocabularyPlan.deleteMany({
      where: {
        planId,
      },
    });

    await this.prisma.userWeeklyVocabularyPlan.delete({
      where: {
        id: planId,
      },
    });

    return this.getOrCreateUserWeeklyPlan(userId);
  }

  private isInvalidGeneratedWord(word: string, topicName: string) {
    const clean = word.toLowerCase().trim();
    const topic = topicName.toLowerCase().trim();

    return (
      !clean ||
      clean.includes(`${topic} word`) ||
      clean.includes('word ') ||
      clean === 'example' ||
      (clean === 'doctor' && topic !== 'health') ||
      /\d/.test(clean)
    );
  }
}
