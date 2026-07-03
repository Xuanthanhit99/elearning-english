import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ListeningJobService {
  private readonly logger = new Logger(ListeningJobService.name);
  constructor(
    private prismaService: PrismaService,
    private geminiService: GeminiService,
  ) {}

  @Cron('0 2 * * *')
  // @Cron('*/1 * * * *')
  async generateDailyListeningQuestions() {
    this.logger.log('Start daily listening question job');

    const configs = [
      { level: 'A1', topic: 'Daily Life' },
      { level: 'A2', topic: 'School' },
      { level: 'B1', topic: 'Environment' },
      { level: 'B1', topic: 'Technology' },
    ];

    const totalNeed = 100;
    const batchSize = 5;

    let created = 0;

    while (created < totalNeed) {
      for (const config of configs) {
        if (created >= totalNeed) break;

        const needCount = Math.min(batchSize, totalNeed - created);

        try {
          const questions = await this.generateByGemini(
            config.level,
            config.topic,
            needCount,
          );

          if (!questions.length) {
            this.logger.warn('Gemini returned empty questions');
            break;
          }

          await this.prismaService.listeningQuestion.createMany({
            data: questions.map((item) => ({
              level: config.level,
              topic: config.topic,
              audioUrl: '',
              transcript: item.transcript,
              question: item.question,
              options: item.options,
              correctAnswer: item.correctAnswer,
              explanation: item.explanation || '',
              duration: item.duration || 60,
              isActive: true,
            })),
            skipDuplicates: true,
          });

          created += questions.length;
          this.logger.log(
            `Created ${created}/${totalNeed} listening questions`,
          );

          await this.sleep(1500);
        } catch (error) {
          this.logger.error('Generate listening batch failed', error);
          await this.sleep(3000);
        }
      }
    }
    this.logger.log(`Daily listening job done. Created: ${created}`);
  }

  private async generateByGemini(level: string, topic: string, count: number) {
    const prompt = `
Bạn là hệ thống tạo dữ liệu luyện nghe tiếng Anh.

Hãy tạo ${count} câu hỏi luyện nghe.

Yêu cầu:
- Level: ${level}
- Topic: ${topic}
- Transcript ngắn 3-5 câu tiếng Anh
- Có question tiếng Anh
- Có 4 đáp án A, B, C, D
- correctAnswer chỉ là A/B/C/D
- explanation bằng tiếng Việt
- duration là số giây ước lượng

Chỉ trả về JSON array, không markdown.

Format:
[
  {
    "transcript": "...",
    "question": "...",
    "options": [
      { "label": "A", "text": "..." },
      { "label": "B", "text": "..." },
      { "label": "C", "text": "..." },
      { "label": "D", "text": "..." }
    ],
    "correctAnswer": "B",
    "explanation": "...",
    "duration": 60
  }
]
`;

    const result = await this.geminiService.generateJson(prompt);
    const data = result as any[];

    if (!Array.isArray(data)) return [];

    return data.filter((item) => {
      return (
        item.transcript &&
        item.question &&
        Array.isArray(item.options) &&
        item.options.length === 4 &&
        ['A', 'B', 'C', 'D'].includes(item.correctAnswer)
      );
    });
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
