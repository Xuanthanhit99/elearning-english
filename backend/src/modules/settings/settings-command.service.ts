import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnglishLevel, Prisma, type UserSettings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsSection } from './dto/settings-section.dto';
import { settingsDefaults } from './settings.defaults';
import { SettingsQueryService } from './settings-query.service';
import {
  SettingsUpdatedEvent,
  SettingsUpdateSource,
} from './events/settings-updated.event';

type SettingsPatch = Partial<
  Omit<
    Prisma.UserSettingsUncheckedCreateInput,
    'id' | 'userId' | 'createdAt' | 'updatedAt'
  >
>;

const MUTABLE_SETTINGS_FIELDS = [
  'learningGoal',
  'dailyStudyMinutes',
  'preferredSkills',
  'currentLevel',
  'autoDetectLevel',
  'challengeMode',
  'aiTeacher',
  'aiPersonality',
  'conversationSpeed',
  'correctionMode',
  'translationMode',
  'speechProvider',
  'micSensitivity',
  'autoStopSeconds',
  'playbackSpeed',
  'accent',
  'captionsEnabled',
  'dailyReminderEnabled',
  'dailyReminderTime',
  'missionReminder',
  'friendActivity',
  'clubNotification',
  'leaderboardNotification',
  'aiFeedbackNotification',
  'emailNotification',
  'pushNotification',
  'publicProfile',
  'showStreak',
  'showAchievements',
  'allowFriendRequests',
  'allowClubInvites',
  'showOnlineStatus',
  'showLastSeen',
  'communityNickname',
  'messagePermission',
  'autoJoinVoiceRoom',
  'theme',
  'language',
  'primaryColor',
  'fontScale',
  'compactMode',
  'animationsEnabled',
  'reduceMotion',
  'highContrast',
  'keyboardNavigation',
  'screenReaderOptimized',
  'focusMode',
  'energyMode',
  'learningDnaEnabled',
  'adaptiveDashboard',
  'autoSchedule',
  'weeklyTargetDays',
  'restDays',
  'preferredStudyTime',
  'timezone',
  'dataPersonalization',
  'analyticsConsent',
] as const satisfies Array<keyof UpdateSettingsDto>;

export type SettingsMutationContext = {
  source: SettingsUpdateSource;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const PRIVACY_SECURITY_FIELDS = new Set<string>([
  'publicProfile',
  'showStreak',
  'showAchievements',
  'allowFriendRequests',
  'allowClubInvites',
  'showOnlineStatus',
  'showLastSeen',
  'communityNickname',
  'messagePermission',
  'dataPersonalization',
  'analyticsConsent',
  'currentLevel',
  'autoDetectLevel',
  'learningGoal',
]);

@Injectable()
export class SettingsCommandService {
  private readonly logger = new Logger(SettingsCommandService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly query: SettingsQueryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLog: AuditLogService,
  ) {}

  async updateSettings(
    userId: string,
    dto: UpdateSettingsDto,
    context: SettingsMutationContext = { source: 'USER' },
  ): Promise<UserSettings> {
    const previous = await this.query.getSettings(userId);

    // Only keep fields that were actually provided on the DTO.
    const patch: SettingsPatch = {};
    for (const key of MUTABLE_SETTINGS_FIELDS) {
      const value = dto[key];
      if (value !== undefined) {
        (patch as Record<string, unknown>)[key] = value;
      }
    }

    if (Array.isArray(patch.preferredSkills)) {
      patch.preferredSkills = [...new Set(patch.preferredSkills)].sort();
    }

    if (Array.isArray(patch.restDays)) {
      patch.restDays = [...new Set(patch.restDays)].sort();
    }

    // showLastSeen cannot be true if showOnlineStatus is false (consistency rule).
    if (patch.showOnlineStatus === false && patch.showLastSeen !== false) {
      patch.showLastSeen = false;
    }

    const changedFields = this.diff(previous, patch);

    if (changedFields.length === 0) {
      return previous;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.userSettings.upsert({
        where: { userId },
        create: { userId, ...patch },
        update: patch satisfies Prisma.UserSettingsUncheckedUpdateInput,
      });

      return result;
    });

    await this.query.invalidate(userId);

    const sensitiveChanged = changedFields.filter((field) =>
      PRIVACY_SECURITY_FIELDS.has(field),
    );

    if (sensitiveChanged.length > 0) {
      await this.auditLog.record({
        userId,
        action: 'SETTINGS_SENSITIVE_FIELD_CHANGED',
        changedFields: sensitiveChanged,
        metadata: { source: context.source },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }

    this.eventEmitter
      .emitAsync(
        'settings.updated',
        new SettingsUpdatedEvent(
          userId,
          changedFields,
          previous,
          updated,
          context.source,
        ),
      )
      .catch((error) => {
        this.logger.error(
          `settings.updated listener(s) failed for userId=${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return updated;
  }

  async resetSection(
    userId: string,
    section: SettingsSection,
    context: SettingsMutationContext = { source: 'USER' },
  ) {
    const defaults = settingsDefaults[section];

    if (!defaults) {
      throw new BadRequestException('Invalid settings section');
    }

    return this.updateSettings(userId, defaults as UpdateSettingsDto, context);
  }

  /**
   * Called by the Placement module once a placement result is READY.
   * Never called directly with a Prisma write from Placement — it must
   * always go through here so autoDetectLevel is respected consistently.
   */
  async applyPlacementResult(userId: string, input: { level: EnglishLevel }) {
    const current = await this.query.getSettings(userId);

    if (!current.autoDetectLevel) {
      this.logger.log(
        `Skip auto level update for userId=${userId}: autoDetectLevel is disabled`,
      );
      return current;
    }

    return this.updateSettings(
      userId,
      { currentLevel: input.level },
      { source: 'PLACEMENT' },
    );
  }

  async enableFocusMode(
    userId: string,
    context: SettingsMutationContext = { source: 'USER' },
  ) {
    return this.updateSettings(userId, { focusMode: true }, context);
  }

  async disableFocusMode(
    userId: string,
    context: SettingsMutationContext = { source: 'USER' },
  ) {
    return this.updateSettings(userId, { focusMode: false }, context);
  }

  async updateLearningPreferences(
    userId: string,
    dto: Pick<
      UpdateSettingsDto,
      | 'learningGoal'
      | 'currentLevel'
      | 'autoDetectLevel'
      | 'challengeMode'
      | 'dailyStudyMinutes'
      | 'preferredSkills'
      | 'weeklyTargetDays'
      | 'restDays'
      | 'preferredStudyTime'
      | 'autoSchedule'
    >,
    context: SettingsMutationContext = { source: 'USER' },
  ) {
    return this.updateSettings(userId, dto, context);
  }

  async updateNotificationPreferences(
    userId: string,
    dto: Pick<
      UpdateSettingsDto,
      | 'dailyReminderEnabled'
      | 'dailyReminderTime'
      | 'missionReminder'
      | 'friendActivity'
      | 'clubNotification'
      | 'leaderboardNotification'
      | 'aiFeedbackNotification'
      | 'emailNotification'
      | 'pushNotification'
    >,
    context: SettingsMutationContext = { source: 'USER' },
  ) {
    return this.updateSettings(userId, dto, context);
  }

  /**
   * Computes the list of top-level fields that actually changed, comparing
   * arrays by ordered value equality instead of reference equality.
   */
  private diff(previous: UserSettings, patch: SettingsPatch): string[] {
    const changed: string[] = [];

    for (const key of Object.keys(patch)) {
      const nextValue = (patch as Record<string, unknown>)[key];
      const prevValue = (previous as Record<string, unknown>)[key];

      if (Array.isArray(nextValue) || Array.isArray(prevValue)) {
        if (!this.arraysEqual(prevValue as unknown[], nextValue as unknown[])) {
          changed.push(key);
        }
        continue;
      }

      if (nextValue !== prevValue) {
        changed.push(key);
      }
    }

    return changed;
  }

  private arraysEqual(
    a: unknown[] | null | undefined,
    b: unknown[] | null | undefined,
  ) {
    const arrA = a ?? [];
    const arrB = b ?? [];

    if (arrA.length !== arrB.length) return false;

    return arrA.every((value, index) => value === arrB[index]);
  }
}
