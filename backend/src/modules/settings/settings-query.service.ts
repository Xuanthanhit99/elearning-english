import { Inject, Injectable } from '@nestjs/common';
import type { UserSettings } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SETTINGS_CACHE_TTL_SECONDS,
  SETTINGS_REDIS,
  settingsCacheKey,
} from './settings.constants';

/**
 * Read-only access to UserSettings for every other module in the system.
 * Other modules should depend on this service (via SettingsModule's exports)
 * instead of querying `prisma.userSettings` directly, so that Settings stays
 * the single source of truth and callers automatically benefit from caching.
 */
@Injectable()
export class SettingsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SETTINGS_REDIS) private readonly redis: Redis,
  ) {}

  async getSettings(userId: string): Promise<UserSettings> {
    const cached = await this.redis
      .get(settingsCacheKey(userId))
      .catch(() => null);

    if (cached) {
      try {
        return JSON.parse(cached) as UserSettings;
      } catch {
        // corrupted cache entry, fall through to DB read
      }
    }

    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    await this.redis
      .set(
        settingsCacheKey(userId),
        JSON.stringify(settings),
        'EX',
        SETTINGS_CACHE_TTL_SECONDS,
      )
      .catch(() => undefined);

    return settings;
  }

  async invalidate(userId: string) {
    await this.redis.del(settingsCacheKey(userId)).catch(() => undefined);
  }

  async getLearningSettings(userId: string) {
    const s = await this.getSettings(userId);
    return {
      learningGoal: s.learningGoal,
      dailyStudyMinutes: s.dailyStudyMinutes,
      preferredSkills: s.preferredSkills,
      currentLevel: s.currentLevel,
      autoDetectLevel: s.autoDetectLevel,
      challengeMode: s.challengeMode,
      weeklyTargetDays: s.weeklyTargetDays,
      restDays: s.restDays,
      preferredStudyTime: s.preferredStudyTime,
      autoSchedule: s.autoSchedule,
      adaptiveDashboard: s.adaptiveDashboard,
      focusMode: s.focusMode,
      energyMode: s.energyMode,
    };
  }

  async getAiSettings(userId: string) {
    const s = await this.getSettings(userId);
    return {
      aiTeacher: s.aiTeacher,
      aiPersonality: s.aiPersonality,
      conversationSpeed: s.conversationSpeed,
      correctionMode: s.correctionMode,
      translationMode: s.translationMode,
      currentLevel: s.currentLevel,
      learningGoal: s.learningGoal,
    };
  }

  async getSpeakingSettings(userId: string) {
    const s = await this.getSettings(userId);
    return {
      speechProvider: s.speechProvider,
      micSensitivity: s.micSensitivity,
      autoStopSeconds: s.autoStopSeconds,
      playbackSpeed: s.playbackSpeed,
      accent: s.accent,
      captionsEnabled: s.captionsEnabled,
      conversationSpeed: s.conversationSpeed,
      correctionMode: s.correctionMode,
    };
  }

  async getNotificationSettings(userId: string) {
    const s = await this.getSettings(userId);
    return {
      dailyReminderEnabled: s.dailyReminderEnabled,
      dailyReminderTime: s.dailyReminderTime,
      missionReminder: s.missionReminder,
      friendActivity: s.friendActivity,
      clubNotification: s.clubNotification,
      leaderboardNotification: s.leaderboardNotification,
      aiFeedbackNotification: s.aiFeedbackNotification,
      emailNotification: s.emailNotification,
      pushNotification: s.pushNotification,
      preferredStudyTime: s.preferredStudyTime,
      timezone: s.timezone,
      focusMode: s.focusMode,
    };
  }

  async getCommunitySettings(userId: string) {
    const s = await this.getSettings(userId);
    return {
      publicProfile: s.publicProfile,
      showStreak: s.showStreak,
      showAchievements: s.showAchievements,
      allowFriendRequests: s.allowFriendRequests,
      allowClubInvites: s.allowClubInvites,
      showOnlineStatus: s.showOnlineStatus,
      showLastSeen: s.showLastSeen,
      communityNickname: s.communityNickname,
      messagePermission: s.messagePermission,
      autoJoinVoiceRoom: s.autoJoinVoiceRoom,
    };
  }

  async getAppearanceSettings(userId: string) {
    const s = await this.getSettings(userId);
    return {
      theme: s.theme,
      language: s.language,
      primaryColor: s.primaryColor,
      fontScale: s.fontScale,
      compactMode: s.compactMode,
      animationsEnabled: s.animationsEnabled,
      reduceMotion: s.reduceMotion,
      highContrast: s.highContrast,
      keyboardNavigation: s.keyboardNavigation,
      screenReaderOptimized: s.screenReaderOptimized,
    };
  }

  /**
   * Compact, prompt-ready AI context. Every module that talks to the AI
   * (Speaking, Writing, AI Tutor/Gemini) should build its prompt from this
   * instead of dumping the entire UserSettings row into the prompt.
   */
  async buildAiUserContext(userId: string) {
    const s = await this.getSettings(userId);

    return {
      aiTeacherName: s.aiTeacher,
      personality: s.aiPersonality,
      level: s.currentLevel,
      goal: s.learningGoal,
      correctionMode: s.correctionMode,
      translationMode: s.translationMode,
      conversationSpeed: s.conversationSpeed,
    };
  }

  /**
   * Renders the AI context as a short natural-language instruction block,
   * ready to prepend to a system prompt.
   */
  async buildAiPromptContext(userId: string): Promise<string> {
    const ctx = await this.buildAiUserContext(userId);

    const personalityLine: Record<string, string> = {
      TEACHER: 'Act like a formal, structured teacher.',
      COACH: 'Act like an encouraging coach.',
      FRIEND: 'Act like a friendly peer, casual tone.',
      STRICT_MENTOR: 'Act like a strict mentor who is direct about mistakes.',
    };

    const correctionLine: Record<string, string> = {
      MAJOR_ONLY: 'Only point out major, meaning-changing mistakes.',
      CORRECT_EVERYTHING:
        'Correct every mistake in detail, including minor ones.',
      EXPLAIN_GRAMMAR: 'Explain the grammar rule behind each correction.',
      NATIVE_EXPRESSION:
        'Suggest a more natural native-like phrasing after correcting.',
    };

    const translationLine: Record<string, string> = {
      ALWAYS: 'Always include a Vietnamese translation alongside your reply.',
      ON_REQUEST:
        'Only translate to Vietnamese if the learner explicitly asks.',
      NEVER: 'Do not provide Vietnamese translations.',
    };

    return [
      `You are ${ctx.aiTeacherName}, an English tutor for a learner at level ${ctx.level} whose goal is ${ctx.goal}.`,
      personalityLine[ctx.personality] ?? '',
      correctionLine[ctx.correctionMode] ?? '',
      translationLine[ctx.translationMode] ?? '',
      `Speak at a conversation pace multiplier of ${ctx.conversationSpeed}x relative to normal.`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  async getPrivacySettings(userId: string) {
    const s = await this.getSettings(userId);
    return {
      publicProfile: s.publicProfile,
      showStreak: s.showStreak,
      showAchievements: s.showAchievements,
      showOnlineStatus: s.showOnlineStatus,
      showLastSeen: s.showLastSeen,
      dataPersonalization: s.dataPersonalization,
      analyticsConsent: s.analyticsConsent,
    };
  }
}
