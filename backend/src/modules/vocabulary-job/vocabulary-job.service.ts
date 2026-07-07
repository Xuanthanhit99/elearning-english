import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';

type GeminiTopicItem = {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
};

type GeminiWordItem = {
  word?: string;
  phonetic?: string | null;
  partOfSpeech?: string | null;
  meaningVi?: string | null;
  meaningEn?: string | null;
  example?: string | null;
  synonyms?: string[];
  antonyms?: string[];
  difficulty?: number;
};

@Injectable()
export class VocabularyJobService {
  constructor(
    private prisma: PrismaService,
    private geminiService: GeminiService,
  ) {}

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

  private async ensureFallbackTopics() {
    const topics: Array<{ id: string }> = [];

    for (const name of this.getDefaultTopicNames()) {
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

  // @Cron('0 0 * * 1', { timeZone: 'Asia/Bangkok' })
  // @Cron('*/1 * * * *')
  async generateWeeklyTopicPools() {
    console.log('Generating weekly topic pools...');
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    for (const level of levels) {
      await this.generatePoolForLevel(level, { refreshFromGemini: true });
    }
  }

  async generatePoolForLevel(
    level: string,
    options: { refreshFromGemini?: boolean } = {},
  ) {
    const { weekStart, weekEnd } = this.getWeekRange();

    const existed = await this.prisma.weeklyTopicPool.findUnique({
      where: {
        level_weekStart: {
          level,
          weekStart,
        },
      },
    });

    if (existed) {
      const userPlanCount = await this.prisma.userWeeklyVocabularyPlan.count({
        where: { poolId: existed.id },
      });

      if (options.refreshFromGemini && userPlanCount === 0) {
        const selectedTopics = await this.selectWeeklyTopics(level, weekStart);

        await this.prisma.weeklyTopicPoolItem.deleteMany({
          where: { poolId: existed.id },
        });
        await this.attachTopicsToPool(existed.id, selectedTopics);

        return existed;
      }

      await this.ensurePoolHasSevenTopics(existed.id, level);
      return existed;
    }

    const selectedTopics = await this.selectWeeklyTopics(level, weekStart);

    const pool = await this.prisma.weeklyTopicPool.create({
      data: {
        level,
        weekStart,
        weekEnd,
      },
    });

    await this.attachTopicsToPool(pool.id, selectedTopics);

    return pool;
  }

  private async selectWeeklyTopics(level: string, weekStart: Date) {
    const recentTopicNames = await this.getRecentTopicNames(level, weekStart);
    const generatedTopics = await this.ensureGeminiTopicsForLevel({
      level,
      weekStart,
      recentTopicNames,
      count: 7,
    });

    let selectedTopics = generatedTopics.slice(0, 7);

    if (selectedTopics.length < 7) {
      const selectedIds = new Set(selectedTopics.map((topic) => topic.id));
      const topics = await this.prisma.wordTopic.findMany({
        where: {
          id: { notIn: [...selectedIds] },
          name: { notIn: recentTopicNames },
          words: {
            some: {
              level,
            },
          },
        },
        take: 20,
      });

      selectedTopics = [
        ...selectedTopics,
        ...this.shuffle(topics).slice(0, 7 - selectedTopics.length),
      ];
    }

    if (selectedTopics.length < 7) {
      await this.ensureFallbackTopics();
      const selectedIds = new Set(selectedTopics.map((topic) => topic.id));
      const fallbackTopics = await this.prisma.wordTopic.findMany({
        where: { id: { notIn: [...selectedIds] } },
        orderBy: { name: 'asc' },
        take: 7 - selectedTopics.length,
      });

      selectedTopics = [...selectedTopics, ...fallbackTopics].slice(0, 7);
    }

    for (const topic of selectedTopics) {
      await this.ensureWordsForTopic(level, topic.id, 10);
    }

    return selectedTopics;
  }

  private async attachTopicsToPool(
    poolId: string,
    selectedTopics: Array<{ id: string }>,
  ) {
    await this.prisma.weeklyTopicPoolItem.createMany({
      data: selectedTopics.map((topic, index) => ({
        poolId,
        topicId: topic.id,
        order: index + 1,
      })),
      skipDuplicates: true,
    });
  }

  private async getRecentTopicNames(level: string, weekStart: Date) {
    const pools = await this.prisma.weeklyTopicPool.findMany({
      where: {
        level,
        weekStart: {
          lt: weekStart,
        },
      },
      include: {
        topics: {
          include: {
            topic: true,
          },
        },
      },
      orderBy: { weekStart: 'desc' },
      take: 12,
    });

    return Array.from(
      new Set(
        pools.flatMap((pool) =>
          pool.topics.map((item) => item.topic.name).filter(Boolean),
        ),
      ),
    );
  }

  private async ensureGeminiTopicsForLevel(params: {
    level: string;
    weekStart: Date;
    recentTopicNames: string[];
    count: number;
  }) {
    const prompt = `
Bạn là hệ thống tạo kế hoạch từ vựng tiếng Anh theo tuần.
Hãy tạo ${params.count + 3} chủ đề học từ vựng mới cho level CEFR ${params.level}.

Không dùng lại các chủ đề gần đây:
[${params.recentTopicNames.join(', ')}]

Yêu cầu:
- Chủ đề phải thực tế, dễ tạo từ vựng, phù hợp người học tiếng Anh.
- Không tạo chủ đề quá rộng kiểu "General Vocabulary".
- Không trùng tên trong danh sách trả về.
- name dùng tiếng Anh, ngắn gọn 1-3 từ.
- description là tiếng Việt ngắn, thân thiện.
- icon là một từ khóa tiếng Anh ngắn như leaf, plane, book, laptop.
- color là mã hex nhẹ nhàng.
- Chỉ trả về JSON array, không markdown.

Format:
[
  {
    "name": "Healthy Habits",
    "description": "Từ vựng về thói quen sống lành mạnh",
    "icon": "heart",
    "color": "#dcfce7"
  }
]`;

    let items: GeminiTopicItem[] = [];
    try {
      const result = await this.geminiService.generateJson(prompt);
      items = Array.isArray(result) ? result : [];
    } catch (error: any) {
      console.error('[VocabularyJob] Gemini topic generation failed:', error.message);
    }

    const recent = new Set(
      params.recentTopicNames.map((name) => this.normalizeName(name)),
    );
    const selected = new Map<string, Awaited<ReturnType<typeof this.upsertTopic>>>();

    for (const item of items) {
      const name = item.name?.trim();
      if (!name) continue;

      const normalized = this.normalizeName(name);
      if (recent.has(normalized) || selected.has(normalized)) continue;

      const topic = await this.upsertTopic({
        name,
        description: item.description,
        icon: item.icon,
        color: item.color,
      });

      selected.set(normalized, topic);
      await this.ensureWordsForTopic(params.level, topic.id, 10);

      if (selected.size >= params.count) break;
    }

    return [...selected.values()];
  }

  private async upsertTopic(item: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }) {
    const slug = this.slugify(item.name);
    return this.prisma.wordTopic.upsert({
      where: { slug },
      update: {
        description: item.description || undefined,
        icon: item.icon || undefined,
        color: item.color || undefined,
      },
      create: {
        name: item.name,
        slug,
        description: item.description,
        icon: item.icon,
        color: item.color,
      },
    });
  }

  private async ensureWordsForTopic(level: string, topicId: string, count: number) {
    const topic = await this.prisma.wordTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) return;

    const existingWords = await this.prisma.word.findMany({
      where: { topicId, level },
      select: { word: true },
      take: 100,
    });

    if (existingWords.length >= count) return;

    const prompt = `
Bạn là hệ thống tạo dữ liệu từ vựng tiếng Anh cho app học tập.
Hãy tạo ${count - existingWords.length + 4} từ/cụm từ mới cho chủ đề "${topic.name}", level ${level}.

Không dùng lại các từ đã có:
[${existingWords.map((item) => item.word).join(', ')}]

Yêu cầu:
- Từ/cụm từ tự nhiên, người bản xứ dùng.
- Phù hợp chủ đề và level CEFR ${level}.
- Không trùng từ trong danh sách trả về.
- meaningVi dịch tự nhiên sang tiếng Việt.
- meaningEn là định nghĩa tiếng Anh ngắn.
- example là câu ví dụ ngắn, dễ hiểu.
- synonyms và antonyms là array, nếu không có thì [].
- difficulty từ 1 đến 5.
- Chỉ trả về JSON array, không markdown.

Format:
[
  {
    "word": "recycle",
    "phonetic": "/riːˈsaɪkl/",
    "partOfSpeech": "verb",
    "meaningVi": "tái chế",
    "meaningEn": "to use something again after processing it",
    "example": "We recycle paper at school.",
    "synonyms": ["reuse"],
    "antonyms": ["waste"],
    "difficulty": 1
  }
]`;

    let items: GeminiWordItem[] = [];
    try {
      const result = await this.geminiService.generateJson(prompt);
      items = Array.isArray(result) ? result : [];
    } catch (error: any) {
      console.error('[VocabularyJob] Gemini word generation failed:', error.message);
      return;
    }

    const existing = new Set(existingWords.map((item) => this.normalizeName(item.word)));
    const words = items
      .filter((item) => item.word?.trim())
      .filter((item) => {
        const normalized = this.normalizeName(item.word || '');
        if (existing.has(normalized)) return false;
        existing.add(normalized);
        return true;
      })
      .slice(0, count - existingWords.length)
      .map((item) => ({
        word: (item.word || '').toLowerCase().trim(),
        phonetic: item.phonetic || undefined,
        partOfSpeech: item.partOfSpeech || undefined,
        meaningVi: item.meaningVi || undefined,
        meaningEn: item.meaningEn || undefined,
        example: item.example || undefined,
        synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
        antonyms: Array.isArray(item.antonyms) ? item.antonyms : [],
        level,
        difficulty: Math.max(1, Math.min(5, item.difficulty || 1)),
        topicId,
        source: 'GEMINI' as const,
        isAiGenerated: true,
      }));

    if (!words.length) return;

    await this.prisma.word.createMany({
      data: words,
      skipDuplicates: true,
    });
  }

  private async ensurePoolHasSevenTopics(poolId: string, level: string) {
    const pool = await this.prisma.weeklyTopicPool.findUnique({
      where: { id: poolId },
      include: { topics: true },
    });

    if (!pool || pool.topics.length >= 7) return;

    const existingIds = new Set(pool.topics.map((item) => item.topicId));

    let topics = await this.prisma.wordTopic.findMany({
      where: {
        id: { notIn: [...existingIds] },
        words: { some: { level } },
      },
      take: 7 - existingIds.size,
    });

    if (existingIds.size + topics.length < 7) {
      await this.ensureFallbackTopics();
      topics = await this.prisma.wordTopic.findMany({
        where: { id: { notIn: [...existingIds] } },
        orderBy: { name: 'asc' },
        take: 7 - existingIds.size,
      });
    }

    if (!topics.length) return;

    for (const topic of topics) {
      await this.ensureWordsForTopic(level, topic.id, 10);
    }

    await this.prisma.weeklyTopicPoolItem.createMany({
      data: topics.slice(0, 7 - existingIds.size).map((topic, index) => ({
        poolId,
        topicId: topic.id,
        order: existingIds.size + index + 1,
      })),
      skipDuplicates: true,
    });
  }

  getWeekRange() {
    const now = new Date();
    const day = now.getDay();
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

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private normalizeName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
