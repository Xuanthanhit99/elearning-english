import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReadingCategory, ReadingDifficulty, ReadingLevel } from '@prisma/client';
import { GeminiService } from 'src/modules/gemini/gemini.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReadingJobService {
  private readonly logger = new Logger(ReadingJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  @Cron('0 2 * * *')
  async generateDailyReadingData() {
    this.logger.log('Start generate reading data');

    const categories = await this.seedCategories();

    for (const category of categories) {
      for (const level of ['A1', 'A2', 'B1', 'B2'] as ReadingLevel[]) {
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
      }
    }

    this.logger.log('Finished generate reading data');
  }

  private async seedCategories() {
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

    const result: ReadingCategory[] = [];

    for (const item of categories) {
      const category = await this.prisma.readingCategory.upsert({
        where: { slug: item.slug },
        update: item,
        create: item,
      });

      result.push(category);
    }

    return result;
  }

  private async generateArticle(params: {
    categoryId: string;
    categoryName: string;
    level: ReadingLevel;
  }) {
    const prompt = `
Bạn là hệ thống tạo dữ liệu cho app học tiếng Anh.

Hãy tạo 1 bài đọc tiếng Anh theo JSON.

Chủ đề: ${params.categoryName}
Trình độ: ${params.level}

Yêu cầu:
- Bài đọc phù hợp CEFR ${params.level}
- Nội dung tự nhiên, dễ học
- Không dùng nội dung bản quyền
- Có tiêu đề tiếng Anh
- Có mô tả tiếng Việt ngắn
- Có content tiếng Anh 4-6 đoạn
- Có 6 từ vựng quan trọng
- Có 5 câu hỏi multiple choice
- Mỗi câu hỏi có 4 options
- correctAnswer phải khớp chính xác 1 option
- Có explanation tiếng Việt

Chỉ trả về JSON, không markdown.

Format:
{
  "title": "string",
  "description": "string",
  "difficulty": "EASY | MEDIUM | HARD",
  "readTime": 10,
  "wordCount": 500,
  "xpReward": 20,
  "content": "string",
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
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "string"
    }
  ]
}
`;

    const data = await this.geminiService.generateJson(prompt);

    if (!data?.title || !data?.content) {
      this.logger.warn(`Gemini failed for ${params.categoryName} ${params.level}`);
      return;
    }

    const slug = await this.createUniqueArticleSlug(data.title);

    const article = await this.prisma.readingArticle.create({
      data: {
        categoryId: params.categoryId,
        title: data.title,
        slug,
        description: data.description ?? null,
        content: data.content,
        level: params.level,
        difficulty: this.normalizeDifficulty(data.difficulty),
        readTime: Number(data.readTime) || 5,
        wordCount: Number(data.wordCount) || this.countWords(data.content),
        questionCount: Array.isArray(data.questions) ? data.questions.length : 0,
        xpReward: Number(data.xpReward) || 20,
        isPublished: true,
      },
    });

    if (Array.isArray(data.vocabulary)) {
      await this.prisma.readingVocabulary.createMany({
        data: data.vocabulary.slice(0, 8).map((item) => ({
          articleId: article.id,
          word: String(item.word ?? ''),
          meaning: String(item.meaning ?? ''),
          partOfSpeech: item.partOfSpeech ? String(item.partOfSpeech) : null,
          example: item.example ? String(item.example) : null,
        })),
        skipDuplicates: true,
      });
    }

    if (Array.isArray(data.questions)) {
      await this.prisma.readingQuestion.createMany({
        data: data.questions.slice(0, 5).map((item, index) => ({
          articleId: article.id,
          question: String(item.question ?? ''),
          options: item.options ?? [],
          correctAnswer: String(item.correctAnswer ?? ''),
          explanation: item.explanation ? String(item.explanation) : null,
          order: index + 1,
        })),
      });
    }

    this.logger.log(`Created reading article: ${article.title}`);
  }

  private safeParseJson(raw: string) {
    try {
      const cleaned = raw
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error('Parse Gemini JSON failed');
      this.logger.error(raw);
      return null;
    }
  }

  private normalizeDifficulty(value: string): ReadingDifficulty {
    if (value === 'MEDIUM') return ReadingDifficulty.MEDIUM;
    if (value === 'HARD') return ReadingDifficulty.HARD;
    return ReadingDifficulty.EASY;
  }

  private countWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private async createUniqueArticleSlug(title: string) {
    const base = this.slugify(title);
    let slug = base;
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
}