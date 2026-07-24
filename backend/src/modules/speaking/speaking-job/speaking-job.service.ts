import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  SpeakingDifficulty,
  SpeakingLevel,
  SpeakingPracticeType,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from '../../gemini/gemini.service';
import { QuestionGenerationLockService } from '../../question-bank/question-generation-lock/question-generation-lock.service';

/** Lessons per topic the curriculum needs before this job stops generating more. */
const SPEAKING_LESSONS_PER_TOPIC_THRESHOLD = 20;

type GeminiSpeakingLesson = {
  title: string;
  slug: string;
  description: string;
  type: SpeakingPracticeType;
  level: SpeakingLevel;
  estimatedMinutes: number;
  prompt: string;
  expectedText: string;
  icon: string;
};

@Injectable()
export class SpeakingJobService {
  private readonly logger = new Logger(SpeakingJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly generationLock: QuestionGenerationLockService,
  ) {}

  /**
   * Was limited to 3 of the 8 categories `seed-speaking.ts` actually seeds
   * (Education, Technology, Culture, Health & Fitness, Food & Drinks were
   * never covered) — now matches every seeded category. `maxLevel` is
   * clamped to B2 for all of them (some seed rows optimistically claim up
   * to C1) to match this product's actual supported-content policy — see
   * SUPPORTED_CONTENT_LEVELS.
   */
  // Chạy mỗi ngày lúc 2h sáng
  @Cron('0 2 * * *')
  async generateDailySpeakingData() {
    this.logger.log('Start generate speaking data');

    const configs = [
      {
        categoryTitle: 'Daily Life',
        categorySlug: 'daily-life',
        categoryIcon: '☕',
        categoryDescription:
          'Talk about daily routines, habits, family, hobbies, and everyday life.',
        topicTitle: 'Daily Life',
        topicSlug: 'daily-life',
        minLevel: 'A1' as SpeakingLevel,
        maxLevel: 'B1' as SpeakingLevel,
        difficulty: 'BEGINNER' as SpeakingDifficulty,
      },
      {
        categoryTitle: 'Work & Career',
        categorySlug: 'work-career',
        categoryIcon: '💼',
        categoryDescription:
          'Practice speaking about jobs, workplace, interviews, and career goals.',
        topicTitle: 'Work & Career',
        topicSlug: 'work-career',
        minLevel: 'A2' as SpeakingLevel,
        maxLevel: 'B2' as SpeakingLevel,
        difficulty: 'PRE_INTERMEDIATE' as SpeakingDifficulty,
      },
      {
        categoryTitle: 'Education',
        categorySlug: 'education',
        categoryIcon: '🎓',
        categoryDescription:
          'Explore learning, school life, and education in general.',
        topicTitle: 'Education',
        topicSlug: 'education',
        minLevel: 'A1' as SpeakingLevel,
        maxLevel: 'B2' as SpeakingLevel,
        difficulty: 'INTERMEDIATE' as SpeakingDifficulty,
      },
      {
        categoryTitle: 'Travel & Places',
        categorySlug: 'travel-places',
        categoryIcon: '✈️',
        categoryDescription:
          'Talk about travel plans, places, hotels, airports, and experiences.',
        topicTitle: 'Travel & Places',
        topicSlug: 'travel-places',
        minLevel: 'A2' as SpeakingLevel,
        maxLevel: 'B2' as SpeakingLevel,
        difficulty: 'PRE_INTERMEDIATE' as SpeakingDifficulty,
      },
      {
        categoryTitle: 'Technology',
        categorySlug: 'technology',
        categoryIcon: '💻',
        categoryDescription:
          'Discuss gadgets, the internet, and technological trends.',
        topicTitle: 'Technology',
        topicSlug: 'technology',
        minLevel: 'A2' as SpeakingLevel,
        maxLevel: 'B2' as SpeakingLevel,
        difficulty: 'ADVANCED' as SpeakingDifficulty,
      },
      {
        categoryTitle: 'Culture',
        categorySlug: 'culture',
        categoryIcon: '🎨',
        categoryDescription:
          'Talk about traditions, festivals, and cultural differences.',
        topicTitle: 'Culture',
        topicSlug: 'culture',
        minLevel: 'A2' as SpeakingLevel,
        maxLevel: 'B2' as SpeakingLevel,
        difficulty: 'ADVANCED' as SpeakingDifficulty,
      },
      {
        categoryTitle: 'Health & Fitness',
        categorySlug: 'health-fitness',
        categoryIcon: '💚',
        categoryDescription:
          'Speak about healthy lifestyle, fitness, and well-being.',
        topicTitle: 'Health & Fitness',
        topicSlug: 'health-fitness',
        minLevel: 'A1' as SpeakingLevel,
        maxLevel: 'B1' as SpeakingLevel,
        difficulty: 'BEGINNER' as SpeakingDifficulty,
      },
      {
        categoryTitle: 'Food & Drinks',
        categorySlug: 'food-drinks',
        categoryIcon: '🍔',
        categoryDescription:
          'Share your favorite food, recipes, and dining experiences.',
        topicTitle: 'Food & Drinks',
        topicSlug: 'food-drinks',
        minLevel: 'A1' as SpeakingLevel,
        maxLevel: 'B1' as SpeakingLevel,
        difficulty: 'BEGINNER' as SpeakingDifficulty,
      },
    ];

    for (const config of configs) {
      try {
        await this.generateForConfig(config);
      } catch (error) {
        // Was previously unguarded — one Gemini failure for a single
        // config used to abort every remaining config in the run.
        this.logger.error(
          `Speaking generation failed for ${config.topicTitle}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    this.logger.log('Generate speaking data done');
  }

  // Dùng để test gọi tay
  async generateManual() {
    return this.generateDailySpeakingData();
  }

  private async generateForConfig(config: {
    categoryTitle: string;
    categorySlug: string;
    categoryIcon: string;
    categoryDescription: string;
    topicTitle: string;
    topicSlug: string;
    minLevel: SpeakingLevel;
    maxLevel: SpeakingLevel;
    difficulty: SpeakingDifficulty;
  }) {
    const category = await this.prisma.speakingCategory.upsert({
      where: { slug: config.categorySlug },
      update: {
        title: config.categoryTitle,
        description: config.categoryDescription,
        icon: config.categoryIcon,
        isActive: true,
      },
      create: {
        title: config.categoryTitle,
        slug: config.categorySlug,
        description: config.categoryDescription,
        icon: config.categoryIcon,
        isActive: true,
      },
    });

    const topic = await this.prisma.speakingTopic.upsert({
      where: { slug: config.topicSlug },
      update: {
        title: config.topicTitle,
        description: config.categoryDescription,
        categoryId: category.id,
        minLevel: config.minLevel,
        maxLevel: config.maxLevel,
        difficulty: config.difficulty,
        isActive: true,
      },
      create: {
        categoryId: category.id,
        title: config.topicTitle,
        slug: config.topicSlug,
        description: config.categoryDescription,
        minLevel: config.minLevel,
        maxLevel: config.maxLevel,
        difficulty: config.difficulty,
        isActive: true,
      },
    });

    const existingCount = await this.prisma.speakingLesson.count({
      where: {
        topicId: topic.id,
        isActive: true,
      },
    });

    if (existingCount >= SPEAKING_LESSONS_PER_TOPIC_THRESHOLD) {
      this.logger.log(
        `Skip ${config.topicTitle}. Existing lessons: ${existingCount}`,
      );
      return;
    }

    // Postgres advisory lock (same infrastructure Vocabulary/Placement/
    // Grammar/Reading use) guards concurrent instances from both
    // generating lessons for this exact topic at once.
    const lessons = await this.generationLock.withLock(
      `speaking-lesson:${config.topicSlug}`,
      async () => {
        const recheckedCount = await this.prisma.speakingLesson.count({
          where: { topicId: topic.id, isActive: true },
        });

        if (recheckedCount >= SPEAKING_LESSONS_PER_TOPIC_THRESHOLD) {
          return [];
        }

        const need = SPEAKING_LESSONS_PER_TOPIC_THRESHOLD - recheckedCount;

        return this.generateLessonsWithGemini({
          topicTitle: config.topicTitle,
          level: `${config.minLevel}-${config.maxLevel}`,
          count: Math.min(need, 5),
        });
      },
    );

    for (const lesson of lessons) {
      await this.prisma.speakingLesson.upsert({
        where: {
          slug: lesson.slug,
        },
        update: {
          title: lesson.title,
          description: lesson.description,
          type: lesson.type,
          level: lesson.level,
          estimatedMinutes: lesson.estimatedMinutes,
          prompt: lesson.prompt,
          expectedText: lesson.expectedText,
          icon: lesson.icon,
          topicId: topic.id,
          isActive: true,
        },
        create: {
          topicId: topic.id,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          type: lesson.type,
          level: lesson.level,
          estimatedMinutes: lesson.estimatedMinutes,
          prompt: lesson.prompt,
          expectedText: lesson.expectedText,
          icon: lesson.icon,
          order: existingCount + 1,
          isLocked: false,
          isActive: true,
        },
      });
    }

    const lessonCount = await this.prisma.speakingLesson.count({
      where: {
        topicId: topic.id,
        isActive: true,
      },
    });

    await this.prisma.speakingTopic.update({
      where: { id: topic.id },
      data: {
        lessonCount,
      },
    });

    this.logger.log(
      `Generated ${lessons.length} speaking lessons for ${config.topicTitle}`,
    );
  }

  private async generateLessonsWithGemini(params: {
    topicTitle: string;
    level: string;
    count: number;
  }): Promise<GeminiSpeakingLesson[]> {
    const prompt = `
Bạn là AI tạo dữ liệu cho app luyện nói tiếng Anh.

Hãy tạo ${params.count} speaking lessons.

Topic: ${params.topicTitle}
Level: ${params.level}

Yêu cầu:
- type chỉ được là một trong:
READ_ALOUD, REPEAT_AFTER_ME, ANSWER_QUESTIONS, FREE_TALK
- level chỉ được là: A1, A2, B1, B2, C1, C2
- slug viết lowercase, dùng dấu -
- expectedText là câu/đoạn mẫu tiếng Anh
- prompt là câu hỏi hoặc hướng dẫn luyện nói
- estimatedMinutes từ 4 đến 8
- icon là emoji phù hợp

Chỉ trả về JSON hợp lệ, không markdown.

Format:
[
  {
    "title": "string",
    "slug": "string",
    "description": "string",
    "type": "READ_ALOUD",
    "level": "A1",
    "estimatedMinutes": 5,
    "prompt": "string",
    "expectedText": "string",
    "icon": "string"
  }
]
`;

    const parsed = (await this.geminiService.generateJson(prompt, {
      models: ['gemini-2.5-flash'],
    })) as any[];

    return parsed.map((item: any) => ({
      title: String(item.title || 'Speaking Lesson'),
      slug: this.slugify(String(item.slug || item.title || 'speaking-lesson')),
      description: String(item.description || ''),
      type: this.safePracticeType(item.type),
      level: this.safeLevel(item.level),
      estimatedMinutes: Number(item.estimatedMinutes || 5),
      prompt: String(item.prompt || ''),
      expectedText: String(item.expectedText || ''),
      icon: String(item.icon || '🎙️'),
    }));
  }

  private safePracticeType(value: string): SpeakingPracticeType {
    const allowed: SpeakingPracticeType[] = [
      'READ_ALOUD',
      'REPEAT_AFTER_ME',
      'ANSWER_QUESTIONS',
      'FREE_TALK',
    ];

    return allowed.includes(value as SpeakingPracticeType)
      ? (value as SpeakingPracticeType)
      : 'FREE_TALK';
  }

  private safeLevel(value: string): SpeakingLevel {
    const allowed: SpeakingLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    return allowed.includes(value as SpeakingLevel)
      ? (value as SpeakingLevel)
      : 'A1';
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
