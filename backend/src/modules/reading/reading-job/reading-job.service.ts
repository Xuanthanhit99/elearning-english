import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  ReadingCategory,
  ReadingDifficulty,
  ReadingLevel,
} from '@prisma/client';
import { GeminiService } from 'src/modules/gemini/gemini.service';
import { PrismaService } from 'src/prisma/prisma.service';

type GeminiReadingData = {
  title?: string;
  description?: string;
  difficulty?: string;
  readTime?: number;
  wordCount?: number;
  xpReward?: number;
  content?: string;
  vocabulary?: {
    word?: string;
    partOfSpeech?: string;
    meaning?: string;
    example?: string;
  }[];
  questions?: {
    question?: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
  }[];
};

@Injectable()
export class ReadingJobService {
  private readonly logger = new Logger(ReadingJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  @Cron('0 2 * * *')
  // @Cron('*/5 * * * *')
  async generateDailyReadingData() {
    this.logger.log('Start generate reading data');

    const categories = await this.seedCategories();

    for (const category of categories) {
      for (const level of ['A1', 'A2', 'B1', 'B2'] as ReadingLevel[]) {
        try {
          const existedCount = await this.prisma.readingArticle.count({
            where: {
              categoryId: category.id,
              level,
            },
          });

          if (existedCount >= 10) {
            this.logger.log(
              `Skip ${category.name} ${level}, existed ${existedCount}`,
            );
            continue;
          }

          await this.generateArticle({
            categoryId: category.id,
            categoryName: category.name,
            level,
          });

          await this.sleep(6000);
        } catch (error) {
          this.logger.error(
            `Generate failed: ${category.name} ${level}`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    this.logger.log('Finished generate reading data');
  }

  private async seedCategories(): Promise<ReadingCategory[]> {
    const categories = [
      {
        name: 'Daily Life',
        slug: 'daily-life',
        description: 'Các bài đọc về cuộc sống hằng ngày.',
        icon: 'book',
        color: 'purple',
        order: 1,
      },
      {
        name: 'Education',
        slug: 'education',
        description: 'Chủ đề giáo dục, học tập và trường lớp.',
        icon: 'graduation',
        color: 'blue',
        order: 2,
      },
      {
        name: 'Environment',
        slug: 'environment',
        description: 'Môi trường, thiên nhiên và phát triển bền vững.',
        icon: 'leaf',
        color: 'green',
        order: 3,
      },
      {
        name: 'Technology',
        slug: 'technology',
        description: 'Công nghệ, AI và tác động của công nghệ.',
        icon: 'monitor',
        color: 'orange',
        order: 4,
      },
      {
        name: 'Science',
        slug: 'science',
        description: 'Khoa học tự nhiên và khám phá thế giới.',
        icon: 'flask',
        color: 'emerald',
        order: 5,
      },
      {
        name: 'Culture',
        slug: 'culture',
        description: 'Văn hóa, lễ hội và đời sống xã hội.',
        icon: 'globe',
        color: 'violet',
        order: 6,
      },
    ];

    return Promise.all(
      categories.map((item) =>
        this.prisma.readingCategory.upsert({
          where: { slug: item.slug },
          update: item,
          create: item,
        }),
      ),
    );
  }

  private async generateArticle(params: {
    categoryId: string;
    categoryName: string;
    level: ReadingLevel;
  }) {
    const prompt = this.buildPrompt(params.categoryName, params.level);

    let data: GeminiReadingData | null = null;

    try {
      data = await this.geminiService.generateJson(prompt);
    } catch (error) {
      this.logger.warn(
        `Gemini failed for ${params.categoryName} ${params.level}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    if (!this.isValidGeminiData(data)) {
      this.logger.warn(
        `Invalid Gemini data for ${params.categoryName} ${params.level}`,
      );
      return;
    }

    const existedTitle = await this.prisma.readingArticle.findFirst({
      where: {
        title: data.title,
        categoryId: params.categoryId,
        level: params.level,
      },
    });

    if (existedTitle) {
      this.logger.log(`Skip duplicated title: ${data.title}`);
      return;
    }

    const slug = await this.createUniqueArticleSlug(data.title as string);

    await this.prisma.$transaction(async (tx) => {
      const article = await tx.readingArticle.create({
        data: {
          categoryId: params.categoryId,
          title: data.title!,
          slug,
          description: data.description ?? null,
          content: data.content!,
          level: params.level,
          difficulty: this.normalizeDifficulty(data.difficulty),
          readTime: Number(data.readTime) || 5,
          wordCount: Number(data.wordCount) || this.countWords(data.content!),
          questionCount: Array.isArray(data.questions)
            ? Math.min(data.questions.length, 5)
            : 0,
          xpReward: Number(data.xpReward) || 20,
          isPublished: true,
        },
      });

      const vocabularies = (data.vocabulary ?? [])
        .filter((item) => item.word && item.meaning)
        .slice(0, 6)
        .map((item) => ({
          articleId: article.id,
          word: String(item.word),
          meaning: String(item.meaning),
          partOfSpeech: item.partOfSpeech ? String(item.partOfSpeech) : null,
          example: item.example ? String(item.example) : null,
        }));

      if (vocabularies.length > 0) {
        await tx.readingVocabulary.createMany({
          data: vocabularies,
        });
      }

      const questions = (data.questions ?? [])
        .filter((item) => {
          return (
            item.question &&
            Array.isArray(item.options) &&
            item.options.length === 4 &&
            item.correctAnswer &&
            item.options.includes(item.correctAnswer)
          );
        })
        .slice(0, 5)
        .map((item, index) => ({
          articleId: article.id,
          question: String(item.question),
          options: item.options ?? [],
          correctAnswer: String(item.correctAnswer),
          explanation: item.explanation ? String(item.explanation) : null,
          order: index + 1,
        }));

      if (questions.length > 0) {
        await tx.readingQuestion.createMany({
          data: questions,
        });
      }

      this.logger.log(`Created reading article: ${article.title}`);
    });
  }

  private buildPrompt(categoryName: string, level: ReadingLevel) {
    return `
Bạn là hệ thống tạo dữ liệu cho app học tiếng Anh.

Hãy tạo 1 bài đọc tiếng Anh theo JSON.

Chủ đề: ${categoryName}
Trình độ CEFR: ${level}

Yêu cầu:
- Bài đọc phù hợp CEFR ${level}
- Nội dung tự nhiên, dễ học
- Không dùng nội dung bản quyền
- Có tiêu đề tiếng Anh
- Có mô tả tiếng Việt ngắn
- content là tiếng Anh, gồm 4 đoạn văn ngắn
- vocabulary đúng 6 từ vựng quan trọng
- questions đúng 5 câu hỏi multiple choice
- Mỗi câu hỏi có đúng 4 options
- correctAnswer phải khớp chính xác 1 option
- explanation là tiếng Việt

QUAN TRỌNG:
- Chỉ trả về DUY NHẤT 1 JSON object.
- Không markdown.
- Không dùng \`\`\`json.
- Không thêm bất kỳ chữ nào trước hoặc sau JSON.
- Nếu không tạo được, trả về {}.

Format:
{
  "title": "string",
  "description": "string",
  "difficulty": "EASY",
  "readTime": 10,
  "wordCount": 500,
  "xpReward": 20,
  "content": "Paragraph 1\\n\\nParagraph 2\\n\\nParagraph 3\\n\\nParagraph 4",
  "vocabulary": [
    {
      "word": "string",
      "partOfSpeech": "n",
      "meaning": "string",
      "example": "string"
    }
  ],
  "questions": [
    {
      "question": "string",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "correctAnswer": "option 1",
      "explanation": "string"
    }
  ]
}
`;
  }

  private isValidGeminiData(
    data: GeminiReadingData | null,
  ): data is GeminiReadingData {
    if (!data) return false;
    if (!data.title || !data.content) return false;
    if (!Array.isArray(data.vocabulary)) return false;
    if (!Array.isArray(data.questions)) return false;

    return true;
  }

  private normalizeDifficulty(value?: string): ReadingDifficulty {
    const normalized = String(value ?? '').toUpperCase();

    if (normalized === 'MEDIUM') return ReadingDifficulty.MEDIUM;
    if (normalized === 'HARD') return ReadingDifficulty.HARD;

    return ReadingDifficulty.EASY;
  }

  private countWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private async createUniqueArticleSlug(title: string) {
    const base = this.slugify(title);
    let slug = base || `reading-${Date.now()}`;
    let index = 1;

    while (
      await this.prisma.readingArticle.findUnique({
        where: { slug },
      })
    ) {
      slug = `${base}-${index}`;
      index++;
    }

    return slug;
  }

  private slugify(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
