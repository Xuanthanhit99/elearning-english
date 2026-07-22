import { NotificationEventType } from '../contracts/notification-event-type';
import { JsonValue } from '../contracts/notification-context';
import { NotificationActionUrlBuilder } from './notification-action-url.builder';
import {
  NotificationTemplateContext,
  NotificationTemplateDefinition,
  NotificationTemplateResult,
} from './notification-template.types';

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 500;

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function getText(
  metadata: Record<string, JsonValue>,
  key: string,
  fallback: string,
) {
  const value = metadata[key];
  if (typeof value !== 'string') return fallback;
  return (
    sanitizeText(value, key === 'message' ? MAX_BODY_LENGTH : 100) || fallback
  );
}

function getInternalHref(
  urls: NotificationActionUrlBuilder,
  metadata: Record<string, JsonValue>,
  fallback: string,
) {
  const value = metadata.href;
  if (typeof value !== 'string' || !value.trim()) return fallback;

  try {
    return urls.ensureInternalPath(value.trim());
  } catch {
    return fallback;
  }
}

function safeResult(input: {
  templateKey: string;
  title: string;
  body: string;
  actionUrl: string;
  metadata?: Record<string, JsonValue>;
}): NotificationTemplateResult {
  const title = sanitizeText(input.title, MAX_TITLE_LENGTH);
  const body = sanitizeText(input.body, MAX_BODY_LENGTH);

  if (!title || !body) {
    throw new Error('Notification template produced empty title/body.');
  }

  return {
    templateKey: input.templateKey,
    title,
    body,
    actionUrl: input.actionUrl,
    metadata: input.metadata || {},
  };
}

export function createNotificationTemplateRegistry(
  urls: NotificationActionUrlBuilder,
): readonly NotificationTemplateDefinition[] {
  return [
    {
      eventType: NotificationEventType.DAILY_REMINDER,
      eventVersion: 1,
      templateKey: 'daily-reminder.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'daily-reminder.v1',
          title: getText(metadata, 'title', 'Nhac hoc hom nay'),
          body: getText(
            metadata,
            'message',
            'Da den gio hoc theo lich cua ban. Cung hoan thanh muc tieu hom nay nhe!',
          ),
          actionUrl: getInternalHref(urls, metadata, urls.dashboard()),
        }),
    },
    {
      eventType: NotificationEventType.LEARNING_COMPLETED,
      eventVersion: 1,
      templateKey: 'learning-completed.v1',
      render: ({ metadata }) => {
        const lessonTitle = getText(metadata, 'lessonTitle', 'bai hoc');
        return safeResult({
          templateKey: 'learning-completed.v1',
          title: getText(metadata, 'title', 'Ban vua hoan thanh bai hoc'),
          body: getText(
            metadata,
            'message',
            `Ban da hoan thanh ${lessonTitle}. Tiep tuc giu nhip hoc nhe!`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.learningPath()),
          metadata: { lessonTitle },
        });
      },
    },
    {
      eventType: NotificationEventType.MISSION_COMPLETED,
      eventVersion: 1,
      templateKey: 'mission-completed.v1',
      render: ({ metadata }) => {
        const missionTitle = getText(metadata, 'missionTitle', 'nhiem vu');
        return safeResult({
          templateKey: 'mission-completed.v1',
          title: getText(metadata, 'title', 'Hoan thanh nhiem vu'),
          body: getText(
            metadata,
            'message',
            `Ban da hoan thanh ${missionTitle}. Phan thuong dang cho ban.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.missions()),
          metadata: { missionTitle },
        });
      },
    },
    {
      eventType: NotificationEventType.ACHIEVEMENT_UNLOCKED,
      eventVersion: 1,
      templateKey: 'achievement-unlocked.v1',
      render: ({ metadata }) => {
        const achievementTitle = getText(
          metadata,
          'achievementTitle',
          'thanh tich moi',
        );
        const rewardLabel = getText(metadata, 'rewardLabel', 'phan thuong');
        return safeResult({
          templateKey: 'achievement-unlocked.v1',
          title: getText(metadata, 'title', 'Mo khoa thanh tich moi'),
          body: getText(
            metadata,
            'message',
            `Ban vua mo khoa ${achievementTitle}. ${rewardLabel} dang san sang de nhan.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.achievements()),
          metadata: { achievementTitle, rewardLabel },
        });
      },
    },
    {
      eventType: NotificationEventType.ARENA_PROMOTED,
      eventVersion: 1,
      templateKey: 'arena-promoted.v1',
      render: ({ metadata }) => {
        const tierLabel = getText(metadata, 'tierLabel', 'hang moi');
        return safeResult({
          templateKey: 'arena-promoted.v1',
          title: getText(metadata, 'title', 'Thang hang Arena!'),
          body: getText(
            metadata,
            'message',
            `Chuc mung! Ban da duoc thang len ${tierLabel} tren Arena.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.arena()),
          metadata: { tierLabel },
        });
      },
    },
    {
      eventType: NotificationEventType.LEADERBOARD_REWARD_GRANTED,
      eventVersion: 1,
      templateKey: 'leaderboard-reward-granted.v1',
      render: ({ metadata }) => {
        const rewardLabel = getText(metadata, 'rewardLabel', 'phan thuong');
        return safeResult({
          templateKey: 'leaderboard-reward-granted.v1',
          title: getText(metadata, 'title', 'Ban co phan thuong bang xep hang'),
          body: getText(
            metadata,
            'message',
            `Ban vua nhan ${rewardLabel} tu bang xep hang.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.leaderboardRewards()),
          metadata: { rewardLabel },
        });
      },
    },
    {
      eventType: NotificationEventType.FRIEND_ACTIVITY,
      eventVersion: 1,
      templateKey: 'friend-activity.v1',
      render: ({ metadata }) => {
        const actorDisplayName = getText(
          metadata,
          'actorDisplayName',
          'Ban be',
        );
        return safeResult({
          templateKey: 'friend-activity.v1',
          title: getText(metadata, 'title', 'Hoat dong ban be'),
          body: getText(
            metadata,
            'message',
            `${actorDisplayName} vua co hoat dong moi.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.community()),
          metadata: { actorDisplayName },
        });
      },
    },
    {
      eventType: NotificationEventType.CLUB_ACTIVITY,
      eventVersion: 1,
      templateKey: 'club-activity.v1',
      render: ({ metadata }) => {
        const clubName = getText(metadata, 'clubName', 'Club cua ban');
        return safeResult({
          templateKey: 'club-activity.v1',
          title: getText(metadata, 'title', 'Cap nhat Club'),
          body: getText(
            metadata,
            'message',
            `${clubName} vua co cap nhat moi.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.community()),
          metadata: { clubName },
        });
      },
    },
    {
      eventType: NotificationEventType.COMMUNITY_ACTIVITY,
      eventVersion: 1,
      templateKey: 'community-activity.v1',
      render: ({ metadata }) => {
        const actorDisplayName = getText(
          metadata,
          'actorDisplayName',
          'Cong dong',
        );
        return safeResult({
          templateKey: 'community-activity.v1',
          title: getText(metadata, 'title', 'Cap nhat cong dong'),
          body: getText(
            metadata,
            'message',
            `${actorDisplayName} vua co hoat dong moi trong cong dong.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.community()),
          metadata: { actorDisplayName },
        });
      },
    },
    {
      eventType: NotificationEventType.AI_FEEDBACK_READY,
      eventVersion: 1,
      templateKey: 'ai-feedback-ready.v1',
      render: ({ metadata }) => {
        const moduleName = getText(metadata, 'moduleName', 'bai luyen tap');
        return safeResult({
          templateKey: 'ai-feedback-ready.v1',
          title: getText(metadata, 'title', 'AI da cham xong bai cua ban'),
          body: getText(
            metadata,
            'message',
            `Phan hoi cho ${moduleName} da san sang.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.writingHistory()),
          metadata: { moduleName },
        });
      },
    },
    {
      eventType: NotificationEventType.SYSTEM_NOTIFICATION,
      eventVersion: 1,
      templateKey: 'system-notification.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'system-notification.v1',
          title: getText(metadata, 'title', 'Thong bao he thong'),
          body: getText(
            metadata,
            'message',
            'Ban co mot cap nhat moi tu PoppyLingo.',
          ),
          actionUrl: getInternalHref(urls, metadata, urls.notifications()),
        }),
    },
  ] as const;
}

export function templateContextFromPayload(input: {
  eventType: NotificationEventType;
  eventVersion: number;
  entityType: string;
  entityId: string;
  metadata: Record<string, JsonValue>;
}): NotificationTemplateContext {
  return input;
}
