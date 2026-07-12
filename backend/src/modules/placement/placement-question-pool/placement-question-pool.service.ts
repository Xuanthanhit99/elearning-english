// src/modules/placement/placement-question-pool.service.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  PlacementQuestionType,
  PlacementQuestionSource,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  GeneratedPlacementQuestion,
  PlacementAiService,
} from '../placement-ai/placement-ai.service';

@Injectable()
export class PlacementQuestionPoolService {
  private readonly logger = new Logger(PlacementQuestionPoolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly placementAiService: PlacementAiService,
  ) {}

  async ensureQuestions(params: {
    skill: LearningSkill;
    level: CefrLevel;
    type: PlacementQuestionType;
    requiredCount: number;
  }) {
    const { skill, level, type, requiredCount } = params;

    const existingQuestions = await this.prisma.placementQuestion.findMany({
      where: {
        skill,
        level,
        type,
        isActive: true,
      },
      select: {
        id: true,
        question: true,
      },
      orderBy: [
        {
          order: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    const missingCount = requiredCount - existingQuestions.length;

    if (missingCount <= 0) {
      return {
        generated: 0,
        totalAvailable: existingQuestions.length,
      };
    }

    this.logger.warn(
      `Thiếu ${missingCount} câu ${skill} ${level}. Bắt đầu gọi Gemini.`,
    );

    const generated = await this.placementAiService.generateQuestions({
      skill,
      level,
      type,
      count: missingCount,
      excludedQuestions: existingQuestions.map((item) => item.question),
    });

    await this.saveGeneratedQuestions(generated);

    return {
      generated: generated.length,
      totalAvailable: existingQuestions.length + generated.length,
    };
  }

  private async saveGeneratedQuestions(
    generated: GeneratedPlacementQuestion[],
  ) {
    await this.prisma.$transaction(
      generated.map((item, index) =>
        this.prisma.placementQuestion.create({
          data: {
            skill: item.skill,
            level: item.level,
            type: item.type,
            question: item.question,
            options: item.options,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
            passage: item.passage ?? null,
            source: PlacementQuestionSource.GEMINI,
            aiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            generationKey: `${item.skill}:${item.level}:${item.type}`,
            /*
             * Hiện schema của bạn mới có audioUrl.
             * audioScript có thể tạm lưu trong passage hoặc bổ sung field riêng.
             */
            audioUrl: null,

            order: index,
            isActive: true,
          },
        }),
      ),
    );
  }
}
