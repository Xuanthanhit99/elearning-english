import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WritingType, WritingLevel, WritingTopic } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GeminiService } from '../../gemini/gemini.service';
import { QuestionGenerationLockService } from '../../question-bank/question-generation-lock/question-generation-lock.service';
import { SUPPORTED_CONTENT_LEVELS } from '../../../common/skill-level/skill-level.types';

/** Lessons per topic+type+level the curriculum needs before this job stops generating more. */
const WRITING_LESSONS_PER_TOPIC_TYPE_LEVEL_THRESHOLD = 5;

@Injectable()
export class WritingJobService {
  private readonly logger = new Logger(WritingJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly generationLock: QuestionGenerationLockService,
  ) {}

  /**
   * Was hardcoded to WritingLevel.B1 only — every other level (A1, A2, B2)
   * never got any generated content regardless of demand. Now iterates the
   * same A1-B2 range every other job in this codebase supports.
   */
  @Cron('0 2 * * *')
  async generateDailyWritingData() {
    this.logger.log('Start generate writing data');

    const topics: WritingTopic[] = await this.seedTopics();

    for (const topic of topics) {
      for (const type of [
        WritingType.SENTENCE,
        WritingType.PARAGRAPH,
        WritingType.ESSAY,
        WritingType.EMAIL,
        WritingType.OPINION,
        WritingType.STORY,
        WritingType.IELTS_TASK_1,
        WritingType.IELTS_TASK_2,
      ]) {
        for (const level of SUPPORTED_CONTENT_LEVELS as WritingLevel[]) {
          try {
            await this.generateTopicTypeLevel(topic, type, level);
          } catch (error) {
            this.logger.error(
              `Writing generation failed for ${topic.title} - ${type} - ${level}`,
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      }
    }

    this.logger.log('Done generate writing data');
  }

  private async generateTopicTypeLevel(
    topic: WritingTopic,
    type: WritingType,
    level: WritingLevel,
  ) {
    const count = await this.prisma.writingLesson.count({
      where: {
        topicId: topic.id,
        type,
        level,
      },
    });

    if (count >= WRITING_LESSONS_PER_TOPIC_TYPE_LEVEL_THRESHOLD) {
      return;
    }

    // Postgres advisory lock (same infrastructure Vocabulary/Placement/
    // Grammar/Reading/Speaking use) guards concurrent instances from both
    // generating lessons for this exact topic+type+level at once.
    const lockKey = `writing-lesson:${topic.slug}:${type}:${level}`;

    const lessons = await this.generationLock.withLock(lockKey, async () => {
      const recheckedCount = await this.prisma.writingLesson.count({
        where: { topicId: topic.id, type, level },
      });

      if (recheckedCount >= WRITING_LESSONS_PER_TOPIC_TYPE_LEVEL_THRESHOLD) {
        return [];
      }

      return this.generateLessonsByGemini({
        topicTitle: topic.title,
        topicId: topic.id,
        type,
        level,
        count: WRITING_LESSONS_PER_TOPIC_TYPE_LEVEL_THRESHOLD - recheckedCount,
      });
    });

    for (const lesson of lessons) {
      await this.prisma.writingLesson.upsert({
        where: { slug: lesson.slug },
        update: {},
        create: {
          topicId: topic.id,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          prompt: lesson.prompt,
          type,
          level,
          minWords: lesson.minWords,
          maxWords: lesson.maxWords,
          duration: lesson.duration,
          order: lesson.order,
          sampleEssay: lesson.sampleEssay,
          isActive: true,
        },
      });
    }

    this.logger.log(
      `Generated ${lessons.length} lessons for ${topic.title} - ${type} - ${level}`,
    );
  }

  private async seedTopics() {
    const topics = [
      {
        title: 'Business',
        slug: 'business',
        category: 'Business',
        description:
          'Write about work, companies, marketing, finance and business situations.',
        difficulty: 'INTERMEDIATE',
        order: 1,
      },
      {
        title: 'Travel',
        slug: 'travel',
        category: 'Travel',
        description:
          'Describe places, travel experiences, hotels, transport and journeys.',
        difficulty: 'BEGINNER',
        order: 2,
      },
      {
        title: 'Education',
        slug: 'education',
        category: 'Education',
        description:
          'Write about school life, learning, teachers, exams and future goals.',
        difficulty: 'INTERMEDIATE',
        order: 3,
      },
      {
        title: 'Technology',
        slug: 'technology',
        category: 'Technology',
        description:
          'Explore AI, gadgets, social media, online learning and future technology.',
        difficulty: 'INTERMEDIATE',
        order: 4,
      },
      {
        title: 'Health',
        slug: 'health',
        category: 'Health',
        description:
          'Discuss healthy habits, mental health, fitness and healthcare topics.',
        difficulty: 'BEGINNER',
        order: 5,
      },
      {
        title: 'Environment',
        slug: 'environment',
        category: 'Environment',
        description:
          'Write about nature, pollution, climate change and protecting the planet.',
        difficulty: 'INTERMEDIATE',
        order: 6,
      },
    ];

    const result: WritingTopic[] = [];

    for (const item of topics) {
      const topic = await this.prisma.writingTopic.upsert({
        where: { slug: item.slug },
        update: {
          title: item.title,
          category: item.category,
          description: item.description,
          difficulty: item.difficulty,
          order: item.order,
        },
        create: {
          title: item.title,
          slug: item.slug,
          category: item.category,
          description: item.description,
          difficulty: item.difficulty,
          learnerCount: 0,
          order: item.order,
          isActive: true,
        },
      });

      result.push(topic);
    }

    return result;
  }

  private async generateLessonsByGemini(params: {
    topicId: string;
    topicTitle: string;
    type: WritingType;
    level: WritingLevel;
    count: number;
  }) {
    const existed = await this.prisma.writingLesson.findMany({
      where: {
        topicId: params.topicId,
        type: params.type,
      },
      select: {
        title: true,
        slug: true,
      },
    });

    const existedText = existed.map((x) => x.title).join(', ');

    const prompt = `
Bạn là hệ thống tạo dữ liệu cho app học tiếng Anh.

Hãy tạo ${params.count} bài luyện viết tiếng Anh.

Topic: ${params.topicTitle}
Writing type: ${params.type}
Level: ${params.level}

Các bài đã có, không tạo trùng:
${existedText}

Return ONLY JSON array:
[
  {
    "title": "",
    "slug": "",
    "description": "",
    "prompt": "",
    "minWords": 80,
    "maxWords": 150,
    "duration": 20,
    "order": 1,
    "sampleEssay": ""
  }
]

Rules:
- slug dùng kebab-case, có prefix topic và type để tránh trùng.
- prompt rõ ràng, phù hợp học viên Việt Nam.
- sampleEssay viết bằng tiếng Anh, đúng level.
- Không markdown.
- Không giải thích ngoài JSON.
`;

    try {
      const ai = await this.callGemini(prompt);

      if (!Array.isArray(ai)) {
        return [];
      }

      return ai
        .map((item, index) => ({
          title: String(item.title || '').trim(),
          slug: String(item.slug || '').trim(),
          description: String(item.description || '').trim(),
          prompt: String(item.prompt || '').trim(),
          minWords: Number(item.minWords || 80),
          maxWords: Number(item.maxWords || 150),
          duration: Number(item.duration || 20),
          order: Number(item.order || index + 1),
          sampleEssay: String(item.sampleEssay || '').trim(),
        }))
        .filter((x) => x.title && x.slug && x.prompt);
    } catch (error) {
      this.logger.error(
        `Gemini không tạo được writing lesson cho ${params.topicTitle} - ${params.type}`,
      );
      return [];
    }
  }

  private async callGemini(prompt: string) {
    try {
      return await this.geminiService.generateJson(prompt, {
        models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
        retries: 1,
      });
    } catch (error: any) {
      this.logger.warn(`Gemini failed: ${error?.message}`);
      return [];
    }
  }
}
