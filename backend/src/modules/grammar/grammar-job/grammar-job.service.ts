// src/grammar-job/grammar-job.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from 'src/modules/gemini/gemini.service';
import { GrammarCategory, GrammarLevel } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class GrammarJobService {
  private readonly logger = new Logger(GrammarJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRunning = false;

  // @Cron('0 2 * * *')
  // @Cron('*/1 * * * *')
  // @Cron('*/5 * * * *')
  // @Cron('*/5 * * * *')
  // @Cron('0 2 * * *')
  async generateDailyGrammarData() {
    if (this.isRunning) {
      this.logger.warn('Grammar job is already running, skip this round');
      return;
    }

    this.isRunning = true;
    this.logger.log('Start generate grammar data');

    try {
      const categories = await this.seedCategories();

      for (const category of categories.slice(0, 1)) {
        for (const level of ['A1'] as GrammarLevel[]) {
          await this.generateCategoryLevel(category, level);
          await this.sleep(5000);
        }
      }

      this.logger.log('Generate grammar data done');
    } catch (error) {
      this.logger.error('Grammar job failed');
      this.logger.error(error);
    } finally {
      this.isRunning = false;
    }
  }

  private async generateCategoryLevel(
    category: GrammarCategory,
    level: GrammarLevel,
  ) {
    const existingTopicCount = await this.prisma.grammarTopic.count({
      where: {
        categoryId: category.id,
        level,
      },
    });

    if (existingTopicCount >= 10) {
      return;
    }

    const topics = await this.safeGeminiCall(() =>
      this.generateTopicsByGemini({
        categoryTitle: category.title,
        level,
        count: 1,
      }),
    );

    await this.sleep(5000);

    for (const topic of topics) {
      const topicSlug = this.slugify(`${topic.title}-${level}`);

      const savedTopic = await this.prisma.grammarTopic.upsert({
        where: {
          slug: topicSlug,
        },
        update: {},
        create: {
          categoryId: category.id,
          title: topic.title,
          slug: topicSlug,
          description: topic.description,
          level,
          order: existingTopicCount + 1,
        },
      });

      const lessonCount = await this.prisma.grammarLesson.count({
        where: {
          topicId: savedTopic.id,
        },
      });

      if (lessonCount > 0) {
        continue;
      }

      const lessons = await this.safeGeminiCall(() =>
        this.generateLessonsByGemini({
          topicTitle: savedTopic.title,
          level,
          count: 1,
        }),
      );

      await this.sleep(5000);

      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];

        const lessonSlug = this.slugify(`${savedTopic.title}-${lesson.title}`);

        const savedLesson = await this.prisma.grammarLesson.upsert({
          where: {
            slug: lessonSlug,
          },
          update: {},
          create: {
            topicId: savedTopic.id,
            title: lesson.title,
            slug: lessonSlug,
            content: lesson.content,
            duration: lesson.duration || 10,
            order: i + 1,
          },
        });

        await this.sleep(5000);

        const questions = await this.safeGeminiCall(() =>
          this.generateQuestionsByGemini({
            topicTitle: savedTopic.title,
            lessonTitle: savedLesson.title,
            level,
            count: 3,
          }),
        );

        for (let qIndex = 0; qIndex < questions.length; qIndex++) {
          const q = questions[qIndex];

          await this.prisma.grammarQuestion.create({
            data: {
              lessonId: savedLesson.id,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: level,
              order: qIndex + 1,
            },
          });
        }
      }
    }
  }

  private async safeGeminiCall<T>(callback: () => Promise<T>): Promise<T | []> {
    try {
      return await callback();
    } catch (error) {
      this.logger.error('Gemini call failed, skip this item');
      this.logger.error(error);
      return [];
    }
  }

  private async seedCategories() {
    const data = [
      {
        title: 'Các thì',
        slug: 'cac-thi',
        icon: 'clock',
        color: 'purple',
        order: 1,
      },
      {
        title: 'Từ loại',
        slug: 'tu-loai',
        icon: 'type',
        color: 'blue',
        order: 2,
      },
      {
        title: 'Cấu trúc câu',
        slug: 'cau-truc-cau',
        icon: 'diagram',
        color: 'green',
        order: 3,
      },
      {
        title: 'Mệnh đề',
        slug: 'menh-de',
        icon: 'document',
        color: 'orange',
        order: 4,
      },
      {
        title: 'Giới từ',
        slug: 'gioi-tu',
        icon: 'location',
        color: 'pink',
        order: 5,
      },
    ];

    const result: GrammarCategory[] = [];

    for (const item of data) {
      const category = await this.prisma.grammarCategory.upsert({
        where: {
          slug: item.slug,
        },
        update: item,
        create: item,
      });

      result.push(category);
    }

    return result;
  }

  private async generateTopicsByGemini(params: {
    categoryTitle: string;
    level: GrammarLevel;
    count: number;
  }) {
    const prompt = `
Bạn là hệ thống tạo dữ liệu cho app học tiếng Anh.

Hãy tạo ${params.count} chủ điểm ngữ pháp tiếng Anh.

Category: ${params.categoryTitle}
Level: ${params.level}

Yêu cầu:
- Phù hợp với level.
- Không tạo dữ liệu trùng lặp.
- Trả về JSON array.
- Không markdown.
- Không giải thích thêm.

Format:
[
  {
    "title": "Present Simple",
    "description": "Cách dùng, dấu hiệu nhận biết và bài tập thì hiện tại đơn"
  }
]
`;

    const text = await this.geminiService.generateJson(prompt);
    return this.safeJsonParse(text);
  }

  private async generateLessonsByGemini(params: {
    topicTitle: string;
    level: GrammarLevel;
    count: number;
  }) {
    const prompt = `
Bạn là giáo viên tiếng Anh.

Hãy tạo ${params.count} bài học cho chủ điểm ngữ pháp sau:

Topic: ${params.topicTitle}
Level: ${params.level}

Yêu cầu:
- Nội dung bằng tiếng Việt dễ hiểu.
- Có ví dụ tiếng Anh.
- Trả về JSON array.
- Không markdown.

Format:
[
  {
    "title": "Cách dùng Present Simple",
    "duration": 10,
    "content": {
      "overview": "Giới thiệu ngắn",
      "structure": {
        "affirmative": "S + V(s/es)",
        "negative": "S + do/does + not + V",
        "question": "Do/Does + S + V?"
      },
      "examples": [
        {
          "en": "She goes to school every day.",
          "vi": "Cô ấy đi học mỗi ngày."
        }
      ],
      "commonMistakes": [
        "Quên thêm s/es với he/she/it"
      ],
      "summary": "Tóm tắt bài học"
    }
  }
]
`;

    const text = await this.geminiService.generateJson(prompt);
    return this.safeJsonParse(text);
  }

  private async generateQuestionsByGemini(params: {
    topicTitle: string;
    lessonTitle: string;
    level: GrammarLevel;
    count: number;
  }) {
    const prompt = `
Tạo ${params.count} câu hỏi trắc nghiệm ngữ pháp tiếng Anh.

Topic: ${params.topicTitle}
Lesson: ${params.lessonTitle}
Level: ${params.level}

Yêu cầu:
- Mỗi câu có 4 đáp án.
- correctAnswer phải khớp chính xác một option.
- Có explanation bằng tiếng Việt.
- Trả về JSON array.
- Không markdown.

Format:
[
  {
    "question": "Choose the correct answer: She ____ to school every day.",
    "options": ["go", "goes", "going", "gone"],
    "correctAnswer": "goes",
    "explanation": "Với chủ ngữ She ở thì hiện tại đơn, động từ cần thêm s/es."
  }
]
`;

    const text = await this.geminiService.generateJson(prompt);
    return this.safeJsonParse(text);
  }

  // private safeJsonParse(text: string) {
  //   try {
  //     const cleaned = text
  //       .replace(/```json/g, '')
  //       .replace(/```/g, '')
  //       .trim();

  //     return JSON.parse(cleaned);
  //   } catch (error) {
  //     this.logger.error('Gemini JSON parse failed');
  //     this.logger.error(text);
  //     return [];
  //   }
  // }
  private safeJsonParse(result: any) {
    try {
      if (Array.isArray(result)) {
        return result;
      }

      if (typeof result === 'object' && result !== null) {
        return [result];
      }

      if (typeof result !== 'string') {
        this.logger.error('Gemini result is not string or object');
        this.logger.error(result);
        return [];
      }

      const cleaned = result
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const match =
        cleaned.match(/\[[\s\S]*\]/) || cleaned.match(/\{[\s\S]*\}/);

      if (!match) {
        this.logger.error('Gemini did not return valid JSON');
        this.logger.error(result);
        return [];
      }

      const parsed = JSON.parse(match[0]);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      return [parsed];
    } catch (error) {
      this.logger.error('Gemini JSON parse failed');
      this.logger.error(result);
      this.logger.error(error);
      return [];
    }
  }

  private slugify(text: string) {
    const hash = crypto
      .createHash('md5')
      .update(text)
      .digest('hex')
      .slice(0, 6);

    return (
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + `-${hash}`
    );
  }
}
