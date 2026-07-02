import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateLearningProfileDto } from './dto/update-learning-profile.dto';
import { WordProgressStatus } from '@prisma/client';
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

  async ensureFallbackTopics() {
    const names = [
      'Environment',
      'Daily life',
      'Travel',
      'Business',
      'Health',
      'Technology',
      'Conversation',
    ];
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

    const lock = await this.checkPreviousWeekTestLock(userId, weekStart);

    if (lock) {
      return lock;
    }

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

  if (hasDuplicatedTopic) {
    await this.rebuildUserWeeklyPlan(userId, existed.id);
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
      throw new BadRequestException('Chưa đủ 7 chủ đề khác nhau cho tuần này');
    }

    const randomTopics = this.shuffle(uniqueTopics).slice(0, 7);

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

      console.log(
        `Picked ${words.length} words for user ${userId} on day ${i + 1}`,
      );

      for (let j = 0; j < words.length; j++) {
        await this.prisma.userDailyVocabularyWord.create({
          data: {
            dayId: dayPlan.id,
            wordId: words[j].id,
            order: j + 1,
          },
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
        status: {
          in: ['KNOWN', 'MASTERED'],
        },
      },
      select: { wordId: true },
    });

    console.log('learned', learned);

    const learnedIds = learned.map((x) => x.wordId);

    let words = await this.prisma.word.findMany({
      where: {
        topicId: params.topicId,
        level: params.level,
        id: {
          notIn: learnedIds,
        },
      },
      orderBy: [{ difficulty: 'asc' }, { searchCount: 'asc' }],
      take: params.limit,
    });

    console.log('learned-words', words);

    if (words.length >= params.limit) {
      return words;
    }

    const missing = params.limit - words.length;
    console.log('learned-words-missing', missing);

    console.log('missing', missing);

    await this.generateWordsByGemini({
      topicId: params.topicId,
      level: params.level,
      count: missing + 5,
    });

    words = await this.prisma.word.findMany({
      where: {
        topicId: params.topicId,
        level: params.level,
        id: {
          notIn: learnedIds,
        },
      },
      orderBy: [{ difficulty: 'asc' }, { searchCount: 'asc' }],
      take: params.limit,
    });

    return words;
  }
  async updateWordProgress(
    userId: string,
    wordId: string,
    status: WordProgressStatus,
  ) {
    const word = await this.prisma.word.findUnique({
      where: { id: wordId },
    });

    if (!word) {
      throw new NotFoundException('Không tìm thấy từ');
    }

    return this.prisma.userWordProgress.upsert({
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
        correctCount: status === 'KNOWN' ? { increment: 1 } : undefined,
        wrongCount: status === 'REVIEW' ? { increment: 1 } : undefined,
        interval: status === 'KNOWN' ? 7 : status === 'REVIEW' ? 1 : undefined,
        learnedAt: status === 'KNOWN' ? new Date() : undefined,
        reviewAt:
          status === 'KNOWN'
            ? this.addDays(7)
            : status === 'REVIEW'
              ? this.addDays(1)
              : this.addDays(1),
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
        reviewAt:
          status === 'KNOWN'
            ? this.addDays(7)
            : status === 'REVIEW'
              ? this.addDays(1)
              : this.addDays(1),
      },
    });
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
      where: {
        topicId: params.topicId,
        level: params.level,
      },
      select: {
        word: true,
      },
    });

    const existedText = existedWords.map((x) => x.word).join(', ');

    const prompt = `
Bạn là hệ thống tạo dữ liệu từ vựng cho app học tiếng Anh.

Hãy tạo ${params.count} từ tiếng Anh thật theo yêu cầu:

Chủ đề: ${topic.name}
Cấp độ CEFR: ${params.level}

Không tạo các từ đã có:
${existedText || 'Không có'}

Yêu cầu bắt buộc:
- Chỉ tạo từ/cụm từ tiếng Anh có thật, tự nhiên, người bản xứ dùng.
- Tuyệt đối không tạo placeholder như "${topic.name} word", "${topic.name} word 1", "word 1", "example word".
- Từ phải phù hợp đúng chủ đề "${topic.name}".
- Từ phải phù hợp cấp độ ${params.level}.
- Từ dễ đến khó.
- Không trùng từ.
- meaningVi phải là nghĩa tiếng Việt tự nhiên.
- meaningEn phải là định nghĩa tiếng Anh ngắn gọn.
- example phải là câu tiếng Anh tự nhiên, ngắn, dễ hiểu.
- phonetic dùng IPA chuẩn, nếu không chắc thì để null.
- synonyms và antonyms là array, nếu không có thì [].
- difficulty là số từ 1 đến 5.
- Trả về JSON thuần, không markdown, không giải thích.

Format bắt buộc:
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
]
`;

    let result: GeminiWordItem[] = [];

    try {
      const aiResult = (await this.geminiService.generateJson(
        prompt,
      )) as GeminiWordItem[];

      result = Array.isArray(aiResult) ? aiResult : [];
    } catch {
      result = this.buildFallbackWords(topic.name, params.level, params.count);
    }

    if (!Array.isArray(result)) {
      return [];
    }

    const createdWords: any[] = [];

    for (const item of result) {
      if (!item.word) continue;

      const cleanWord = item.word.toLowerCase().trim();

      const word = await this.prisma.word.upsert({
        where: {
          word: cleanWord,
        },
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

    const base = banks[topic];

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
        words: true,
      },
    });

    if (!day) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    for (const item of day.words) {
      await this.prisma.userWordProgress.upsert({
        where: {
          userId_wordId: {
            userId,
            wordId: item.wordId,
          },
        },
        update: {
          status: 'LEARNING',
          seenCount: {
            increment: 1,
          },
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

    return this.prisma.userDailyVocabularyPlan.update({
      where: { id: dayId },
      data: {
        status: 'COMPLETED',
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

    if (!test && completedDays >= 7) {
      test = await this.createWeeklyTest(userId, planId);
    }

    if (!test) {
      return {
        status: 'LOCKED',
        message: `Bạn cần hoàn thành đủ 7 ngày học. Hiện tại: ${completedDays}/7`,
        completedDays,
        requiredDays: 7,
      };
    }

    return test;
  }

  async createWeeklyTest(userId: string, planId: string) {
    const learnedWords = await this.prisma.userDailyVocabularyWord.findMany({
      where: {
        day: {
          planId,
        },
      },
      include: {
        word: true,
      },
    });

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

  async getReviewWords(userId: string) {
    // const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const reviewWords = await this.prisma.userWordProgress.findMany({
      where: {
        userId,
        status: {
          in: ['LEARNING', 'REVIEW'],
        },
        reviewAt: {
          lte: endOfToday,
        },
      },
      include: {
        word: true,
      },
      orderBy: {
        reviewAt: 'asc',
      },
      take: 20,
    });

    console.table(reviewWords);
    console.log('COMPLETE USER:', userId);

    return {
      total: reviewWords.length,
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
    const due = await this.getReviewWords(userId);
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
        userId,
        type: 'WORD',
        visibility: 'PUBLIC',
        title: `Từ vựng: ${detail.word}`,
        content: content || shareText,
        hashtags: ['Vocabulary', detail.topic?.name || detail.level].filter(
          Boolean,
        ),
        word: detail.word,
        ipa: detail.phonetic,
        meaning: detail.meaningVi || detail.meaningEn,
        example: detail.example,
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

  async bootstrapTodayVocabulary(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    const { weekStart } = this.getWeekRange();
    console.log('bootstrapTodayVocabulary------------------------->1');
    // 1. Tạo topic nếu DB chưa có
    await this.ensureTopicsForLevel(profile.level);
    console.log('bootstrapTodayVocabulary------------------------->2');

    // 2. Tạo word nếu topic chưa đủ từ
    // await this.ensureWordsForLevel(profile.level);

    // 3. Tạo weekly pool nếu chưa có
    await this.ensureWeeklyPool(profile.level, weekStart);
    console.log('bootstrapTodayVocabulary------------------------>3');

    // 4. Tạo user weekly plan
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

    const existingDates = new Set(
      plan.days.map((d) => new Date(d.date).toISOString().slice(0, 10)),
    );

    let availableTopics = plan.pool.topics;

    if (!availableTopics.length) {
      const fallbackTopics = await this.prisma.wordTopic.findMany({ take: 7 });

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

      for (let j = 0; j < words.length; j++) {
        await this.prisma.userDailyVocabularyWord.create({
          data: {
            dayId: dayPlan.id,
            wordId: words[j].id,
            order: j + 1,
          },
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

    const [urgent, normal, later, completedToday] = await Promise.all([
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
    ]);

    return {
      summary: {
        totalReview: urgent + normal + later,
        urgent,
        normal,
        later,
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

    const words = await this.pickWordsForUser({
      userId,

      topicId: day.topicId,

      level: day.level,

      limit: required,
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
}
