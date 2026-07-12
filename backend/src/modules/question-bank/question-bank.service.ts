import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  PlacementQuestion,
  PlacementQuestionSource,
  PlacementQuestionType,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlacementAiService } from '../placement/placement-ai/placement-ai.service';
import { QuestionGenerationLockService } from './question-generation-lock/question-generation-lock.service';
import { PlacementTtsService } from '../placement/placement-tts.service';

export type EnsureQuestionBankInput = {
  skill: LearningSkill;
  level: CefrLevel;
  type: PlacementQuestionType;
  requiredCount: number;
};

@Injectable()
export class QuestionBankService {
  private readonly logger = new Logger(QuestionBankService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly placementAiService: PlacementAiService,
    private readonly lockService: QuestionGenerationLockService,
    private readonly placementTtsService: PlacementTtsService,
  ) {}

  async ensurePlacementQuestions(
    input: EnsureQuestionBankInput,
  ): Promise<PlacementQuestion[]> {
    const lockKey = this.createLockKey(input);

    return this.lockService.withLock(lockKey, async () => {
      /*
       * Phải kiểm tra DB lại sau khi đã lấy lock.
       * Có thể request khác vừa sinh câu hỏi xong.
       */
      const existingQuestions = await this.findAvailableQuestions(input);

      if (existingQuestions.length >= input.requiredCount) {
        return existingQuestions.slice(0, input.requiredCount);
      }

      const missingCount = input.requiredCount - existingQuestions.length;

      this.logger.warn(
        `Thiếu ${missingCount} câu ${input.skill} ${input.level} ${input.type}`,
      );

      const generatedQuestions =
        await this.placementAiService.generateQuestions({
          skill: input.skill,
          level: input.level,
          type: input.type,
          count: missingCount,
          excludedQuestions: existingQuestions.map(
            (question) => question.question,
          ),
        });

      await this.saveGeneratedQuestions(generatedQuestions);

      const refreshedQuestions = await this.findAvailableQuestions(input);

      if (refreshedQuestions.length < input.requiredCount) {
        throw new BadGatewayException(
          `Không thể chuẩn bị đủ câu hỏi ${input.skill}.`,
        );
      }

      return refreshedQuestions.slice(0, input.requiredCount);
    });
  }

  private async findAvailableQuestions(input: EnsureQuestionBankInput) {
    return this.prisma.placementQuestion.findMany({
      where: {
        skill: input.skill,
        level: input.level,
        type: input.type,
        isActive: true,
      },
      orderBy: [
        {
          usageCount: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
      take: input.requiredCount,
    });
  }

  private async saveGeneratedQuestions(
    generatedQuestions: Array<{
      skill: LearningSkill;
      level: CefrLevel;
      type: PlacementQuestionType;
      question: string;
      options: Array<{
        key: string;
        text: string;
        translation?: string | null;
      }>;
      correctAnswer: string;
      explanation: string;
      passage?: string | null;
      audioScript?: string | null;
    }>,
  ): Promise<void> {
    for (const generated of generatedQuestions) {
      const questionHash = this.createQuestionHash({
        skill: generated.skill,
        level: generated.level,
        type: generated.type,
        question: generated.question,
      });

      try {
        /*
         * Bước 1:
         * Gemini đã tạo question và audioScript trước khi vào method này.
         */

        /*
         * Bước 2:
         * Nếu là Listening thì lấy audioScript gọi Google TTS.
         */
        const audioUrl = await this.generateListeningAudio({
          type: generated.type,
          audioScript: generated.audioScript,
          questionHash,
        });

        /*
         * Bước 3:
         * Lưu đầy đủ câu hỏi và audioUrl vào DB.
         */
        await this.prisma.placementQuestion.create({
          data: {
            skill: generated.skill,
            level: generated.level,
            type: generated.type,
            question: generated.question.trim(),
            options: generated.options,
            correctAnswer: generated.correctAnswer.trim(),
            explanation: generated.explanation.trim(),
            passage: generated.passage?.trim() || null,
            audioScript: generated.audioScript?.trim() || null,
            audioUrl,
            source: PlacementQuestionSource.GEMINI,
            aiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
            questionHash,
            usageCount: 0,
            isActive: true,
          },
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          this.logger.warn(
            `Bỏ qua câu hỏi Gemini bị trùng: ${generated.question}`,
          );

          continue;
        }

        this.logger.error(
          `Không thể lưu câu hỏi: ${generated.question}`,
          error instanceof Error ? error.stack : String(error),
        );

        throw error;
      }
    }
  }

  private createLockKey(input: EnsureQuestionBankInput) {
    return ['placement-question', input.skill, input.level, input.type].join(
      ':',
    );
  }

  private createQuestionHash(input: {
    skill: LearningSkill;
    level: CefrLevel;
    type: PlacementQuestionType;
    question: string;
  }) {
    const normalizedQuestion = input.question
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, ' ');

    return createHash('sha256')
      .update(
        [input.skill, input.level, input.type, normalizedQuestion].join('|'),
      )
      .digest('hex');
  }

  private async generateListeningAudio(input: {
    type: PlacementQuestionType;
    audioScript?: string | null;
    questionHash: string;
  }): Promise<string | null> {
    if (input.type !== PlacementQuestionType.LISTENING) {
      return null;
    }

    const audioScript = input.audioScript?.trim();

    if (!audioScript) {
      throw new BadGatewayException(
        'Gemini không trả về audioScript cho câu Listening.',
      );
    }

    return this.placementTtsService.createAudioFromScript(
      audioScript,
      input.questionHash,
    );
  }
}
