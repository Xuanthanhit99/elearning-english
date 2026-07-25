import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  PlacementProcessingItemStatus,
} from '@prisma/client';
import { AiPlacementResult } from '../types/placement-result.types';

@Injectable()
export class PlacementResultAiService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('Thiáº¿u GEMINI_API_KEY');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite';
  }

  async buildResult(input: {
    userName: string;
    overallScore: number;
    overallLevel: CefrLevel;
    processedSeconds: number;
    skills: Array<{
      skill: LearningSkill;
      score: number;
      level: CefrLevel | null;
      status: PlacementProcessingItemStatus;
      message: string | null;
    }>;
  }): Promise<AiPlacementResult> {
    const prompt = `
Báº¡n lÃ  AI Coach cá»§a ná»n táº£ng há»c tiáº¿ng Anh BeaconVie.

HÃ£y táº¡o bÃ¡o cÃ¡o káº¿t quáº£ Placement Test báº±ng tiáº¿ng Viá»‡t.

NgÆ°á»i há»c: ${input.userName}
Äiá»ƒm tá»•ng local: ${input.overallScore}
CEFR local: ${input.overallLevel}
Thá»i gian xá»­ lÃ½: ${input.processedSeconds} giÃ¢y

Káº¿t quáº£ ká»¹ nÄƒng:
${JSON.stringify(input.skills, null, 2)}

Quy táº¯c:
- Ká»¹ nÄƒng SKIPPED pháº£i ghi lÃ  chÆ°a Ä‘Ã¡nh giÃ¡.
- KhÃ´ng Ä‘Æ°á»£c Ä‘Æ°a ká»¹ nÄƒng SKIPPED vÃ o Ä‘iá»ƒm tá»•ng.
- KhÃ´ng phÃ³ng Ä‘áº¡i Ä‘á»™ chÃ­nh xÃ¡c.
- confidence tá»« 70 Ä‘áº¿n 99.
- percentile tá»« 1 Ä‘áº¿n 99.
- rating tá»« 1 Ä‘áº¿n 5.
- priorities tá»‘i Ä‘a 3 má»¥c.
- phases Ä‘Ãºng 3 giai Ä‘oáº¡n.
- recommendedCourses Ä‘Ãºng 3 má»¥c.
- projectedLevel pháº£i há»£p lÃ½, thÆ°á»ng cao hÆ¡n overallLevel tá»‘i Ä‘a 1 báº­c.
- Má»—i skill cÃ³ tá»‘i Ä‘a 2 strengths vÃ  2 improvements.
- Chá»‰ tráº£ JSON há»£p lá»‡, khÃ´ng markdown.

Schema:

{
  "overallLevel": "B1",
  "overallScore": 70,
  "percentile": 68,
  "confidence": 94,
  "summary": "Nháº­n xÃ©t tá»•ng quan",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "projectedLevel": "B2",
  "projectedWeeksMin": 6,
  "projectedWeeksMax": 8,
  "skills": [
    {
      "skill": "LISTENING",
      "score": 72,
      "level": "B1",
      "status": "COMPLETED",
      "label": "KhÃ¡ tá»‘t",
      "rating": 4,
      "feedback": "Nháº­n xÃ©t ngáº¯n",
      "strengths": ["..."],
      "improvements": ["..."]
    }
  ],
  "priorities": [
    {
      "skill": "GRAMMAR",
      "priority": 1,
      "reason": "..."
    }
  ],
  "phases": [
    {
      "phase": 1,
      "title": "Cá»§ng cá»‘ ná»n táº£ng",
      "targetLevel": "B1",
      "weeksMin": 4,
      "weeksMax": 6,
      "description": "...",
      "objectives": ["...", "...", "..."]
    }
  ],
  "recommendedCourses": [
    {
      "title": "Grammar Foundation B1",
      "slug": "grammar-foundation-b1",
      "thumbnail": null,
      "rating": 4.8,
      "reviews": 124,
      "lessonCount": 28,
      "reason": "...",
      "order": 1
    }
  ]
}
`.trim();

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.5,
      },
    });

    const rawText = response.text?.trim();

    if (!rawText) {
      throw new Error('Gemini khÃ´ng tráº£ káº¿t quáº£ Placement Result');
    }

    const parsed = JSON.parse(
      rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, ''),
    ) as unknown;

    return this.normalizeResult(parsed, input);
  }

  private normalizeResult(
    value: unknown,
    fallback: {
      overallScore: number;
      overallLevel: CefrLevel;
      skills: Array<{
        skill: LearningSkill;
        score: number;
        level: CefrLevel | null;
        status: PlacementProcessingItemStatus;
        message: string | null;
      }>;
    },
  ): AiPlacementResult {
    const data =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};

    const normalizedSkills = fallback.skills.map((item) => {
      const aiItem = Array.isArray(data.skills)
        ? data.skills.find((candidate) => {
            if (!candidate || typeof candidate !== 'object') {
              return false;
            }

            return (
              String((candidate as Record<string, unknown>).skill ?? '') ===
              item.skill
            );
          })
        : null;

      const ai =
        aiItem && typeof aiItem === 'object'
          ? (aiItem as Record<string, unknown>)
          : {};

      return {
        skill: item.skill,
        score: item.score,
        level: item.level,
        status: item.status,
        label:
          typeof ai.label === 'string'
            ? ai.label
            : this.scoreLabel(item.score, item.status),
        rating: this.clampNumber(ai.rating, 1, 5, item.score / 20),
        feedback:
          typeof ai.feedback === 'string'
            ? ai.feedback
            : (item.message ?? 'ÄÃ£ hoÃ n táº¥t Ä‘Ã¡nh giÃ¡.'),
        strengths: this.toStringArray(ai.strengths).slice(0, 2),
        improvements: this.toStringArray(ai.improvements).slice(0, 2),
      };
    });

    return {
      overallLevel: this.toLevel(data.overallLevel, fallback.overallLevel),
      overallScore: this.clampNumber(
        data.overallScore,
        0,
        100,
        fallback.overallScore,
      ),
      percentile: Math.round(this.clampNumber(data.percentile, 1, 99, 50)),
      confidence: Math.round(this.clampNumber(data.confidence, 70, 99, 85)),
      summary:
        typeof data.summary === 'string'
          ? data.summary
          : 'Báº¡n Ä‘Ã£ hoÃ n thÃ nh bÃ i kiá»ƒm tra xáº¿p trÃ¬nh Ä‘á»™.',
      strengths: this.toStringArray(data.strengths).slice(0, 5),
      improvements: this.toStringArray(data.improvements).slice(0, 5),
      projectedLevel: this.toNullableLevel(data.projectedLevel),
      projectedWeeksMin: this.toNullableInteger(data.projectedWeeksMin),
      projectedWeeksMax: this.toNullableInteger(data.projectedWeeksMax),
      skills: normalizedSkills,
      priorities: this.normalizePriorities(data.priorities),
      phases: this.normalizePhases(data.phases),
      recommendedCourses: this.normalizeCourses(data.recommendedCourses),
    };
  }

  private normalizePriorities(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;

        const data = item as Record<string, unknown>;
        const skill = String(data.skill ?? '') as LearningSkill;

        if (!Object.values(LearningSkill).includes(skill)) {
          return null;
        }

        return {
          skill,
          priority: Math.round(
            this.clampNumber(data.priority, 1, 3, index + 1),
          ),
          reason:
            typeof data.reason === 'string'
              ? data.reason
              : 'NÃªn Æ°u tiÃªn trong lá»™ trÃ¬nh.',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 3);
  }

  private normalizePhases(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;

        const data = item as Record<string, unknown>;

        return {
          phase: index + 1,
          title:
            typeof data.title === 'string'
              ? data.title
              : `Giai Ä‘oáº¡n ${index + 1}`,
          targetLevel: this.toNullableLevel(data.targetLevel),
          weeksMin: Math.round(this.clampNumber(data.weeksMin, 1, 52, 4)),
          weeksMax: Math.round(this.clampNumber(data.weeksMax, 1, 52, 6)),
          description:
            typeof data.description === 'string'
              ? data.description
              : 'Lá»™ trÃ¬nh há»c cÃ¡ nhÃ¢n hÃ³a.',
          objectives: this.toStringArray(data.objectives).slice(0, 5),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 3);
  }

  private normalizeCourses(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;

        const data = item as Record<string, unknown>;

        return {
          title:
            typeof data.title === 'string'
              ? data.title
              : `KhÃ³a há»c Ä‘á» xuáº¥t ${index + 1}`,
          slug: typeof data.slug === 'string' ? data.slug : null,
          thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : null,
          rating:
            data.rating === null || data.rating === undefined
              ? null
              : this.clampNumber(data.rating, 0, 5, 4.5),
          reviews:
            data.reviews === null || data.reviews === undefined
              ? null
              : Math.round(this.clampNumber(data.reviews, 0, 999999, 0)),
          lessonCount:
            data.lessonCount === null || data.lessonCount === undefined
              ? null
              : Math.round(this.clampNumber(data.lessonCount, 0, 1000, 0)),
          reason:
            typeof data.reason === 'string'
              ? data.reason
              : 'PhÃ¹ há»£p vá»›i káº¿t quáº£ Ä‘Ã¡nh giÃ¡ cá»§a báº¡n.',
          order: index + 1,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 3);
  }

  private scoreLabel(score: number, status: PlacementProcessingItemStatus) {
    if (status === PlacementProcessingItemStatus.SKIPPED) {
      return 'ChÆ°a Ä‘Ã¡nh giÃ¡';
    }

    if (score >= 80) return 'Ráº¥t tá»‘t';
    if (score >= 60) return 'KhÃ¡ tá»‘t';
    if (score >= 40) return 'Trung bÃ¬nh';
    return 'Cáº§n cáº£i thiá»‡n';
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter(
          (item): item is string =>
            typeof item === 'string' && Boolean(item.trim()),
        )
      : [];
  }

  private toLevel(value: unknown, fallback: CefrLevel): CefrLevel {
    const level = String(value ?? '').toUpperCase() as CefrLevel;

    return Object.values(CefrLevel).includes(level) ? level : fallback;
  }

  private toNullableLevel(value: unknown): CefrLevel | null {
    if (value === null || value === undefined) return null;

    const level = String(value).toUpperCase() as CefrLevel;

    return Object.values(CefrLevel).includes(level) ? level : null;
  }

  private toNullableInteger(value: unknown): number | null {
    const number = Number(value);

    return Number.isFinite(number) ? Math.round(number) : null;
  }

  private clampNumber(
    value: unknown,
    min: number,
    max: number,
    fallback: number,
  ) {
    const number = Number(value);

    if (!Number.isFinite(number)) return fallback;

    return Math.max(min, Math.min(max, number));
  }
}
