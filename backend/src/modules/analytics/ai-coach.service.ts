import { Injectable, Logger } from '@nestjs/common';
import { LearningGoal } from '@prisma/client';
import { RedisCacheService } from 'src/common/cache/redis-cache.service';
import { dateKeyInTimezone, normalizeUserTimezone } from 'src/common/time/user-timezone.util';
import { GeminiService } from '../gemini/gemini.service';
import { SettingsQueryService } from '../settings/settings-query.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AnalyticsService } from './analytics.service';
import { SkillRadarService } from './skill-radar.service';
import { WeaknessDetectionService } from './weakness-detection.service';
import { AnalyticsCacheKeys, AnalyticsCacheTtl } from './analytics-cache.constants';
import { AnalyticsRange } from './dto/analytics-query.dto';

const GOAL_LABELS: Record<LearningGoal, string> = {
  IELTS: 'Luyện thi IELTS',
  TOEIC: 'Luyện thi TOEIC',
  SPEAKING: 'Cải thiện kỹ năng nói',
  DAILY_ENGLISH: 'Tiếng Anh giao tiếp hàng ngày',
  BUSINESS_ENGLISH: 'Tiếng Anh thương mại',
  TRAVEL: 'Tiếng Anh du lịch',
  KIDS: 'Tiếng Anh cho trẻ em',
  GRAMMAR: 'Củng cố ngữ pháp',
  VOCABULARY: 'Mở rộng từ vựng',
};

const GOAL_FOCUS: Record<LearningGoal, string> = {
  IELTS:
    'Ưu tiên cấu trúc bài thi IELTS: Speaking Part 1-3, Writing Task 1-2, Reading/Listening học thuật.',
  TOEIC:
    'Ưu tiên cấu trúc bài thi TOEIC: Listening & Reading, ngữ pháp và từ vựng công sở.',
  SPEAKING: 'Ưu tiên phản xạ nói, phát âm và sự tự tin khi giao tiếp.',
  DAILY_ENGLISH: 'Ưu tiên tình huống giao tiếp hàng ngày và từ vựng thông dụng.',
  BUSINESS_ENGLISH: 'Ưu tiên tiếng Anh công sở: email, thuyết trình, đàm phán.',
  TRAVEL: 'Ưu tiên từ vựng và tình huống du lịch, giao tiếp nơi công cộng.',
  KIDS: 'Ưu tiên nội dung đơn giản, sinh động, phù hợp với trẻ em.',
  GRAMMAR: 'Ưu tiên củng cố nền tảng ngữ pháp trước khi mở rộng kỹ năng khác.',
  VOCABULARY: 'Ưu tiên mở rộng vốn từ vựng theo chủ đề.',
};

export type CoachAdviceSource = 'GEMINI' | 'FALLBACK_TEMPLATE';

export type CoachAdvice = {
  headline: string;
  whyThisLesson: string;
  recommendedFocus: { skill: string; topic: string; reason: string } | null;
  whatsNext: string[];
  weeklyPlan: string[];
  examPrepTip: string;
  dailyHabitTip: string;
  source: CoachAdviceSource;
  goal: LearningGoal;
  metrics: CoachMetricsSnapshot;
  generatedAt: Date;
};

type CoachMetricsSnapshot = {
  xpLast7Days: number;
  activeDaysLast7: number;
  currentStreak: number;
  todayGoalProgressPercent: number;
  radar: Array<{ skill: string; label: string; score: number }>;
  topWeaknesses: Array<{ skill: string; topic: string; accuracy: number; reason: string }>;
};

/**
 * Grounds every Gemini call in real, just-computed metrics (overview, skill
 * radar, weakness detection) — the prompt is built entirely from numbers
 * this request already fetched, never invented. Cached per user+goal+day so
 * a Gemini call happens at most a few times/day per user (cost + latency
 * guard), with a deterministic, still-metrics-grounded fallback if Gemini is
 * unavailable so the feature degrades gracefully instead of failing.
 */
@Injectable()
export class AiCoachService {
  private readonly logger = new Logger(AiCoachService.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly redisCache: RedisCacheService,
    private readonly settingsQuery: SettingsQueryService,
    private readonly analyticsService: AnalyticsService,
    private readonly skillRadarService: SkillRadarService,
    private readonly weaknessDetectionService: WeaknessDetectionService,
    private readonly dashboardService: DashboardService,
  ) {}

  async getCoachAdvice(
    userId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<CoachAdvice> {
    const settings = await this.settingsQuery.getSettings(userId);
    const goal = settings.learningGoal;
    const timezone = normalizeUserTimezone(settings.timezone);
    const dayKey = dateKeyInTimezone(new Date(), timezone);
    const cacheKey = AnalyticsCacheKeys.coach(userId, goal, dayKey);

    if (!options?.forceRefresh) {
      const cached = await this.redisCache.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as CoachAdvice;
        } catch {
          // corrupted entry — fall through and recompute
        }
      }
    }

    const [overview, radar, weaknesses, dashboard] = await Promise.all([
      this.analyticsService.getOverview(userId, {
        range: AnalyticsRange.SEVEN_DAYS,
        limit: 5,
      }),
      this.skillRadarService.getRadar(userId),
      this.weaknessDetectionService.getWeaknesses(userId),
      this.dashboardService.getDashboard(userId),
    ]);

    const metrics: CoachMetricsSnapshot = {
      xpLast7Days: overview.summary.xp,
      activeDaysLast7: overview.summary.activeDays,
      currentStreak: dashboard.currentStreak,
      todayGoalProgressPercent: dashboard.today.dailyGoalProgress,
      radar: radar.skills.map((item) => ({
        skill: item.skill,
        label: item.label,
        score: item.score,
      })),
      topWeaknesses: weaknesses.overallWeakest.map((item) => ({
        skill: item.skill,
        topic: item.topic,
        accuracy: item.accuracy,
        reason: item.reason,
      })),
    };

    let advice: Omit<CoachAdvice, 'goal' | 'metrics' | 'generatedAt'>;
    try {
      const generated = await this.gemini.generateJson(
        this.buildPrompt(goal, metrics),
        { temperature: 0.3, retries: 2, timeoutMs: 20000 },
      );
      advice = this.normalizeGeneratedAdvice(generated);
    } catch (error) {
      this.logger.warn(
        `AI Coach Gemini call failed for user ${userId}, using fallback template: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      advice = this.buildFallbackAdvice(goal, metrics);
    }

    const result: CoachAdvice = {
      ...advice,
      goal,
      metrics,
      generatedAt: new Date(),
    };

    await this.redisCache.set(
      cacheKey,
      JSON.stringify(result),
      AnalyticsCacheTtl.COACH_SECONDS,
    );

    return result;
  }

  private buildPrompt(goal: LearningGoal, metrics: CoachMetricsSnapshot) {
    const radarLines = metrics.radar
      .map((item) => `- ${item.label}: ${item.score}/100`)
      .join('\n');
    const weaknessLines = metrics.topWeaknesses.length
      ? metrics.topWeaknesses.map((item) => `- ${item.reason}`).join('\n')
      : '- Chưa đủ dữ liệu để xác định điểm yếu cụ thể.';

    return `Bạn là AI Learning Coach của một nền tảng học tiếng Anh. CHỈ được sử dụng số liệu thực tế dưới đây, KHÔNG được bịa thêm số liệu, bài học hoặc kỹ năng không có trong danh sách.

MỤC TIÊU HỌC TẬP CỦA NGƯỜI DÙNG: ${GOAL_LABELS[goal]}
ĐỊNH HƯỚNG: ${GOAL_FOCUS[goal]}

SỐ LIỆU 7 NGÀY GẦN NHẤT:
- XP kiếm được: ${metrics.xpLast7Days}
- Số ngày hoạt động: ${metrics.activeDaysLast7}/7
- Streak hiện tại: ${metrics.currentStreak} ngày
- Tiến độ mục tiêu hôm nay: ${metrics.todayGoalProgressPercent}%

RADAR KỸ NĂNG (điểm gần đây, thang 0-100):
${radarLines}

ĐIỂM YẾU ĐÃ PHÁT HIỆN (ưu tiên từ cao xuống thấp):
${weaknessLines}

Trả lời DUY NHẤT bằng JSON đúng theo schema sau, viết bằng tiếng Việt, mọi câu phải dựa trên đúng số liệu ở trên:
{
  "headline": "1 câu tóm tắt tình hình học tập hiện tại",
  "whyThisLesson": "giải thích ngắn gọn vì sao nên ưu tiên điểm yếu/kỹ năng nêu trên",
  "recommendedFocus": { "skill": "tên kỹ năng", "topic": "tên chủ đề yếu nhất", "reason": "lý do" } hoặc null nếu chưa đủ dữ liệu,
  "whatsNext": ["2 đến 4 gợi ý hành động cụ thể tiếp theo"],
  "weeklyPlan": ["3 đến 5 gợi ý cho kế hoạch luyện tập trong tuần, phù hợp với mục tiêu ${GOAL_LABELS[goal]}"],
  "examPrepTip": "lời khuyên ôn luyện phù hợp với mục tiêu, hoặc lời khuyên chung nếu mục tiêu không phải kỳ thi",
  "dailyHabitTip": "1 thói quen nhỏ nên duy trì mỗi ngày"
}`;
  }

  private normalizeGeneratedAdvice(
    raw: unknown,
  ): Omit<CoachAdvice, 'goal' | 'metrics' | 'generatedAt'> {
    const data = (raw ?? {}) as Record<string, unknown>;
    const asStringArray = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];

    const recommendedFocusRaw = data.recommendedFocus as
      | Record<string, unknown>
      | null
      | undefined;

    return {
      headline:
        typeof data.headline === 'string' && data.headline.trim()
          ? data.headline
          : 'Đang phân tích tiến độ học tập của bạn.',
      whyThisLesson:
        typeof data.whyThisLesson === 'string' ? data.whyThisLesson : '',
      recommendedFocus:
        recommendedFocusRaw &&
        typeof recommendedFocusRaw.skill === 'string' &&
        typeof recommendedFocusRaw.topic === 'string'
          ? {
              skill: recommendedFocusRaw.skill,
              topic: recommendedFocusRaw.topic,
              reason:
                typeof recommendedFocusRaw.reason === 'string'
                  ? recommendedFocusRaw.reason
                  : '',
            }
          : null,
      whatsNext: asStringArray(data.whatsNext),
      weeklyPlan: asStringArray(data.weeklyPlan),
      examPrepTip: typeof data.examPrepTip === 'string' ? data.examPrepTip : '',
      dailyHabitTip:
        typeof data.dailyHabitTip === 'string' ? data.dailyHabitTip : '',
      source: 'GEMINI',
    };
  }

  private buildFallbackAdvice(
    goal: LearningGoal,
    metrics: CoachMetricsSnapshot,
  ): Omit<CoachAdvice, 'goal' | 'metrics' | 'generatedAt'> {
    const weakest = metrics.topWeaknesses[0] ?? null;
    const weakestRadar = [...metrics.radar].sort((a, b) => a.score - b.score)[0];

    return {
      headline: weakest
        ? `${weakest.skill} → ${weakest.topic} đang là điểm cần cải thiện nhất (độ chính xác ${weakest.accuracy}%).`
        : metrics.activeDaysLast7 > 0
          ? `Bạn đã học ${metrics.activeDaysLast7}/7 ngày gần đây, streak ${metrics.currentStreak} ngày.`
          : 'Chưa đủ dữ liệu 7 ngày gần đây — hãy hoàn thành một bài học để bắt đầu.',
      whyThisLesson: weakest
        ? weakest.reason
        : weakestRadar
          ? `${weakestRadar.label} đang có điểm thấp nhất trong radar kỹ năng (${weakestRadar.score}/100).`
          : 'Cần thêm dữ liệu học tập để đưa ra khuyến nghị chính xác.',
      recommendedFocus: weakest
        ? { skill: weakest.skill, topic: weakest.topic, reason: weakest.reason }
        : null,
      whatsNext: weakest
        ? [`Ôn tập lại chủ đề "${weakest.topic}" của kỹ năng ${weakest.skill}.`]
        : ['Hoàn thành bài học đầu tiên để hệ thống bắt đầu phân tích.'],
      weeklyPlan: [GOAL_FOCUS[goal]],
      examPrepTip: GOAL_FOCUS[goal],
      dailyHabitTip: `Duy trì streak hiện tại (${metrics.currentStreak} ngày) bằng cách học ít nhất một bài mỗi ngày.`,
      source: 'FALLBACK_TEMPLATE',
    };
  }
}
