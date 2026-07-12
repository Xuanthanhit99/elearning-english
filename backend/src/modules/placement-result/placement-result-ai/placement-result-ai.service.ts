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
      throw new Error('Thiếu GEMINI_API_KEY');
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
Bạn là AI Coach của nền tảng học tiếng Anh PoppyLingo.

Hãy tạo báo cáo kết quả Placement Test bằng tiếng Việt.

Người học: ${input.userName}
Điểm tổng local: ${input.overallScore}
CEFR local: ${input.overallLevel}
Thời gian xử lý: ${input.processedSeconds} giây

Kết quả kỹ năng:
${JSON.stringify(input.skills, null, 2)}

Quy tắc:
- Kỹ năng SKIPPED phải ghi là chưa đánh giá.
- Không được đưa kỹ năng SKIPPED vào điểm tổng.
- Không phóng đại độ chính xác.
- confidence từ 70 đến 99.
- percentile từ 1 đến 99.
- rating từ 1 đến 5.
- priorities tối đa 3 mục.
- phases đúng 3 giai đoạn.
- recommendedCourses đúng 3 mục.
- projectedLevel phải hợp lý, thường cao hơn overallLevel tối đa 1 bậc.
- Mỗi skill có tối đa 2 strengths và 2 improvements.
- Chỉ trả JSON hợp lệ, không markdown.

Schema:

{
  "overallLevel": "B1",
  "overallScore": 70,
  "percentile": 68,
  "confidence": 94,
  "summary": "Nhận xét tổng quan",
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
      "label": "Khá tốt",
      "rating": 4,
      "feedback": "Nhận xét ngắn",
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
      "title": "Củng cố nền tảng",
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
      throw new Error('Gemini không trả kết quả Placement Result');
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
            : (item.message ?? 'Đã hoàn tất đánh giá.'),
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
          : 'Bạn đã hoàn thành bài kiểm tra xếp trình độ.',
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
              : 'Nên ưu tiên trong lộ trình.',
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
              : `Giai đoạn ${index + 1}`,
          targetLevel: this.toNullableLevel(data.targetLevel),
          weeksMin: Math.round(this.clampNumber(data.weeksMin, 1, 52, 4)),
          weeksMax: Math.round(this.clampNumber(data.weeksMax, 1, 52, 6)),
          description:
            typeof data.description === 'string'
              ? data.description
              : 'Lộ trình học cá nhân hóa.',
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
              : `Khóa học đề xuất ${index + 1}`,
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
              : 'Phù hợp với kết quả đánh giá của bạn.',
          order: index + 1,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 3);
  }

  private scoreLabel(score: number, status: PlacementProcessingItemStatus) {
    if (status === PlacementProcessingItemStatus.SKIPPED) {
      return 'Chưa đánh giá';
    }

    if (score >= 80) return 'Rất tốt';
    if (score >= 60) return 'Khá tốt';
    if (score >= 40) return 'Trung bình';
    return 'Cần cải thiện';
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
