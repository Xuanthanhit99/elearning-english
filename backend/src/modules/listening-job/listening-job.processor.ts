import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { ListeningTtsService } from '../listening/listening-tts.service';
import { ContentCacheService } from '../../common/cache/content-cache.service';
import { CacheKeys } from '../../common/cache/cache-keys';
import {
  LISTENING_GENERATION_JOB,
  LISTENING_GENERATION_QUEUE,
} from './listening-job.constants';
import {
  GenerateAudioJobData,
  GenerateBatchJobData,
  GeneratedListeningQuestion,
} from './listening-job.types';

@Injectable()
@Processor(LISTENING_GENERATION_QUEUE, {
  concurrency: 2,
})
export class ListeningJobProcessor extends WorkerHost {
  private readonly logger = new Logger(ListeningJobProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly listeningTtsService: ListeningTtsService,
    private readonly contentCache: ContentCacheService,

    @InjectQueue(LISTENING_GENERATION_QUEUE)
    private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case LISTENING_GENERATION_JOB.GENERATE_BATCH:
        return this.generateBatch(job as Job<GenerateBatchJobData>);

      case LISTENING_GENERATION_JOB.GENERATE_AUDIO:
        return this.generateAudio(job as Job<GenerateAudioJobData>);

      default:
        throw new Error(`Unsupported Listening job: ${job.name}`);
    }
  }

  private async generateBatch(job: Job<GenerateBatchJobData>) {
    const { level, topic, count } = job.data;

    this.logger.log(
      `Generate Listening batch: level=${level}, topic=${topic}, count=${count}`,
    );

    const generated = await this.generateByGemini(level, topic, count);

    if (!generated.length) {
      throw new Error(
        `Gemini returned no valid Listening questions for ${level}/${topic}`,
      );
    }

    let created = 0;
    let skipped = 0;
    let audioQueued = 0;

    for (const item of generated) {
      const questionHash = this.createQuestionHash({
        level,
        topic,
        transcript: item.transcript,
        question: item.question,
      });

      try {
        const existing = await this.prisma.listeningQuestion.findFirst({
          where: {
            OR: [
              {
                question: item.question.trim(),
                level,
                topic,
              },
              {
                transcript: item.transcript.trim(),
                level,
                topic,
              },
            ],
          },
          select: {
            id: true,
            audioUrl: true,
            transcript: true,
          },
        });

        if (existing) {
          skipped += 1;

          if (!existing.audioUrl && existing.transcript) {
            await this.queue.add(
              LISTENING_GENERATION_JOB.GENERATE_AUDIO,
              {
                questionId: existing.id,
                transcript: existing.transcript,
              },
              {
                jobId: `listening-audio-${existing.id}`,
                attempts: 5,
                backoff: {
                  type: 'exponential',
                  delay: 5000,
                },
                removeOnComplete: true,
                removeOnFail: false,
              },
            );

            audioQueued += 1;
          }

          continue;
        }

        const createdQuestion = await this.prisma.listeningQuestion.create({
          data: {
            level,
            topic,
            audioUrl: '',
            transcript: item.transcript.trim(),
            question: item.question.trim(),
            options: item.options,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation?.trim() ?? '',
            duration: item.duration ?? 60,
            isActive: true,

            /*
             * Nếu schema của bạn chưa có questionHash thì xóa field này.
             * Khuyến nghị thêm unique field để chống trùng tuyệt đối.
             */
            ...(this.hasQuestionHashSupport()
              ? ({ questionHash } as never)
              : {}),
          },
        });

        created += 1;

        await this.queue.add(
          LISTENING_GENERATION_JOB.GENERATE_AUDIO,
          {
            questionId: createdQuestion.id,
            transcript: item.transcript.trim(),
          },
          {
            jobId: `listening-audio-${createdQuestion.id}`,
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        audioQueued += 1;
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          skipped += 1;
          continue;
        }

        throw error;
      }
    }

    if (created > 0) {
      // New rows were persisted for this level+topic — refresh so the next
      // startPractice() read isn't served a stale (shorter) cached pool.
      await this.contentCache.invalidate(
        CacheKeys.listeningQuestions(level, topic),
      );
    }

    this.logger.log(
      `Listening batch done: created=${created}, skipped=${skipped}, audioQueued=${audioQueued}`,
    );

    return {
      created,
      skipped,
      audioQueued,
    };
  }

  private async generateAudio(job: Job<GenerateAudioJobData>) {
    const { questionId, transcript } = job.data;

    const question = await this.prisma.listeningQuestion.findUnique({
      where: {
        id: questionId,
      },
      select: {
        id: true,
        audioUrl: true,
        transcript: true,
      },
    });

    if (!question) {
      this.logger.warn(
        `Skip TTS because ListeningQuestion not found: ${questionId}`,
      );

      return {
        skipped: true,
        reason: 'QUESTION_NOT_FOUND',
      };
    }

    if (question.audioUrl?.trim()) {
      return {
        skipped: true,
        reason: 'AUDIO_ALREADY_EXISTS',
        audioUrl: question.audioUrl,
      };
    }

    const normalizedTranscript =
      transcript?.trim() || question.transcript?.trim();

    if (!normalizedTranscript) {
      throw new Error(
        `ListeningQuestion ${questionId} does not have transcript`,
      );
    }

    const audioUrl =
      await this.listeningTtsService.createAudioFromTranscript(
        normalizedTranscript,
      );

    if (!audioUrl) {
      throw new Error(
        `Google TTS returned empty audio URL for question ${questionId}`,
      );
    }

    await this.prisma.listeningQuestion.update({
      where: {
        id: questionId,
      },
      data: {
        audioUrl,
      },
    });

    this.logger.log(
      `Listening audio ready: questionId=${questionId}, audioUrl=${audioUrl}`,
    );

    return {
      questionId,
      audioUrl,
    };
  }

  private async generateByGemini(
    level: string,
    topic: string,
    count: number,
  ): Promise<GeneratedListeningQuestion[]> {
    const prompt = `
Bạn là hệ thống tạo dữ liệu luyện nghe tiếng Anh.

Hãy tạo ${count} câu hỏi luyện nghe.

Yêu cầu:
- Level: ${level}
- Topic: ${topic}
- Transcript ngắn 3-5 câu tiếng Anh
- Có question tiếng Anh
- Có đúng 4 đáp án A, B, C, D
- correctAnswer chỉ là A/B/C/D
- explanation bằng tiếng Việt
- duration là số giây ước lượng từ 30 đến 120
- Không lặp lại cùng một transcript hoặc question trong JSON
- Chỉ trả về JSON array, không markdown

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
]`;

    const result = await this.geminiService.generateJson(prompt);

    if (!Array.isArray(result)) {
      return [];
    }

    const seen = new Set<string>();

    return result
      .map((item) => this.normalizeGeneratedQuestion(item))
      .filter((item): item is GeneratedListeningQuestion => item !== null)
      .filter((item) => {
        const key = `${item.transcript}|${item.question}`
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, count);
  }

  private normalizeGeneratedQuestion(
    value: unknown,
  ): GeneratedListeningQuestion | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const item = value as Record<string, unknown>;

    const transcript =
      typeof item.transcript === 'string' ? item.transcript.trim() : '';

    const question =
      typeof item.question === 'string' ? item.question.trim() : '';

    const correctAnswer =
      typeof item.correctAnswer === 'string'
        ? item.correctAnswer.trim().toUpperCase()
        : '';

    const rawOptions = Array.isArray(item.options) ? item.options : [];

    const options = rawOptions
      .map((option) => {
        if (typeof option !== 'object' || option === null) {
          return null;
        }

        const data = option as Record<string, unknown>;
        const label =
          typeof data.label === 'string' ? data.label.trim().toUpperCase() : '';

        const text = typeof data.text === 'string' ? data.text.trim() : '';

        if (!['A', 'B', 'C', 'D'].includes(label) || !text) {
          return null;
        }

        return {
          label: label as 'A' | 'B' | 'C' | 'D',
          text,
        };
      })
      .filter(
        (
          option,
        ): option is {
          label: 'A' | 'B' | 'C' | 'D';
          text: string;
        } => option !== null,
      );

    const uniqueLabels = new Set(options.map((option) => option.label));

    if (
      transcript.length < 20 ||
      !question ||
      options.length !== 4 ||
      uniqueLabels.size !== 4 ||
      !['A', 'B', 'C', 'D'].includes(correctAnswer)
    ) {
      return null;
    }

    const duration =
      typeof item.duration === 'number' && Number.isFinite(item.duration)
        ? Math.min(Math.max(Math.round(item.duration), 30), 120)
        : 60;

    return {
      transcript,
      question,
      options,
      correctAnswer: correctAnswer as 'A' | 'B' | 'C' | 'D',
      explanation:
        typeof item.explanation === 'string' ? item.explanation.trim() : '',
      duration,
    };
  }

  private createQuestionHash(input: {
    level: string;
    topic: string;
    transcript: string;
    question: string;
  }) {
    return createHash('sha256')
      .update(
        [
          input.level.trim().toUpperCase(),
          input.topic.trim().toLowerCase(),
          input.transcript.trim().toLowerCase(),
          input.question.trim().toLowerCase(),
        ].join('|'),
      )
      .digest('hex');
  }

  /**
   * Đặt false nếu schema ListeningQuestion chưa có questionHash.
   * Sau khi thêm field Prisma, đổi thành true và bỏ comment hướng dẫn.
   */
  private hasQuestionHashSupport() {
    return true;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(
      `Listening job completed: id=${job.id}, name=${job.name}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Listening job failed: id=${job?.id}, name=${job?.name}`,
      error.stack,
    );
  }
}
