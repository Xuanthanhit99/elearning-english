import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  SpeakingDifficulty,
  SpeakingLevel,
  SpeakingPracticeType,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

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
  private readonly model;

  constructor(private readonly prisma: PrismaService) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  // Chạy mỗi ngày lúc 2h sáng
  @Cron('0 2 * * *')
// @Cron('*/5 * * * *')
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
    ];

    for (const config of configs) {
      await this.generateForConfig(config);
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

    if (existingCount >= 20) {
      this.logger.log(
        `Skip ${config.topicTitle}. Existing lessons: ${existingCount}`,
      );
      return;
    }

    const need = 20 - existingCount;

    const lessons = await this.generateLessonsWithGemini({
      topicTitle: config.topicTitle,
      level: `${config.minLevel}-${config.maxLevel}`,
      count: Math.min(need, 5),
    });

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

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();

    const parsed = this.parseJsonArray(text);

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

  private parseJsonArray(text: string) {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');

    if (start === -1 || end === -1) {
      throw new Error('Gemini response is not valid JSON array');
    }

    return JSON.parse(cleaned.slice(start, end + 1));
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
