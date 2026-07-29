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
      eventType: NotificationEventType.ARENA_TIER_DEMOTED,
      eventVersion: 1,
      templateKey: 'arena-tier-demoted.v1',
      render: ({ metadata }) => {
        const tierLabel = getText(metadata, 'tierLabel', 'hang hien tai');
        return safeResult({
          templateKey: 'arena-tier-demoted.v1',
          title: getText(metadata, 'title', 'Cap nhat hang Arena'),
          body: getText(
            metadata,
            'message',
            `Hang Arena cua ban hien tai la ${tierLabel}. Tiep tuc chien dau de len lai nhe.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.arena()),
          metadata: { tierLabel },
        });
      },
    },
    {
      eventType: NotificationEventType.ARENA_PLACEMENT_COMPLETED,
      eventVersion: 1,
      templateKey: 'arena-placement-completed.v1',
      render: ({ metadata }) => {
        const tierLabel = getText(metadata, 'tierLabel', 'hang cua ban');
        return safeResult({
          templateKey: 'arena-placement-completed.v1',
          title: getText(metadata, 'title', 'Xep hang xong roi!'),
          body: getText(
            metadata,
            'message',
            `Ban da hoan thanh cac tran xep hang. Hang Arena hien tai: ${tierLabel}.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.arena()),
          metadata: { tierLabel },
        });
      },
    },
    {
      eventType: NotificationEventType.ARENA_RATING_DECAYED,
      eventVersion: 1,
      templateKey: 'arena-rating-decayed.v1',
      render: ({ metadata }) => {
        const mmrDelta = getText(metadata, 'mmrDelta', 'mot it');
        return safeResult({
          templateKey: 'arena-rating-decayed.v1',
          title: getText(metadata, 'title', 'Diem Arena da giam do vang mat'),
          body: getText(
            metadata,
            'message',
            `Diem Arena cua ban giam ${mmrDelta} sau thoi gian khong thi dau xep hang.`,
          ),
          actionUrl: getInternalHref(urls, metadata, urls.arena()),
          metadata: { mmrDelta },
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
      eventType: NotificationEventType.DOCUMENT_UPLOAD_RECEIVED,
      eventVersion: 1,
      templateKey: 'document-upload-received.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-upload-received.v1',
          title: getText(metadata, 'title', 'Đã nhận tài liệu của bạn'),
          body: getText(metadata, 'message', 'Tài liệu của bạn đang được xử lý.'),
          actionUrl: getInternalHref(urls, metadata, '/my-documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_PROCESSING_FAILED,
      eventVersion: 1,
      templateKey: 'document-processing-failed.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-processing-failed.v1',
          title: getText(metadata, 'title', 'Xử lý tài liệu thất bại'),
          body: getText(metadata, 'message', 'Có lỗi khi xử lý tài liệu của bạn.'),
          actionUrl: getInternalHref(urls, metadata, '/my-documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_PENDING_REVIEW,
      eventVersion: 1,
      templateKey: 'document-pending-review.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-pending-review.v1',
          title: getText(metadata, 'title', 'Tài liệu đang chờ duyệt'),
          body: getText(metadata, 'message', 'Tài liệu của bạn đang chờ Admin xem xét.'),
          actionUrl: getInternalHref(urls, metadata, '/my-documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_CHANGES_REQUESTED,
      eventVersion: 1,
      templateKey: 'document-changes-requested.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-changes-requested.v1',
          title: getText(metadata, 'title', 'Cần chỉnh sửa tài liệu'),
          body: getText(metadata, 'message', 'Admin yêu cầu bạn chỉnh sửa tài liệu trước khi xuất bản.'),
          actionUrl: getInternalHref(urls, metadata, '/my-documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_APPROVED,
      eventVersion: 1,
      templateKey: 'document-approved.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-approved.v1',
          title: getText(metadata, 'title', 'Tài liệu đã được duyệt'),
          body: getText(metadata, 'message', 'Tài liệu của bạn đã được duyệt và sẽ sớm xuất bản.'),
          actionUrl: getInternalHref(urls, metadata, '/my-documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_PUBLISHED,
      eventVersion: 1,
      templateKey: 'document-published.v1',
      render: ({ metadata }) => {
        const slug = getText(metadata, 'slug', '');
        return safeResult({
          templateKey: 'document-published.v1',
          title: getText(metadata, 'title', 'Tài liệu đã được xuất bản'),
          body: getText(metadata, 'message', 'Tài liệu của bạn đã xuất bản trên Thư viện tài liệu.'),
          actionUrl: getInternalHref(urls, metadata, slug ? `/documents/${slug}` : '/my-documents'),
        });
      },
    },
    {
      eventType: NotificationEventType.DOCUMENT_REJECTED,
      eventVersion: 1,
      templateKey: 'document-rejected.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-rejected.v1',
          title: getText(metadata, 'title', 'Tài liệu bị từ chối'),
          body: getText(metadata, 'message', 'Tài liệu của bạn không được chấp nhận.'),
          actionUrl: getInternalHref(urls, metadata, '/my-documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_HIDDEN,
      eventVersion: 1,
      templateKey: 'document-hidden.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-hidden.v1',
          title: getText(metadata, 'title', 'Tài liệu đã bị ẩn'),
          body: getText(metadata, 'message', 'Tài liệu của bạn tạm thời bị ẩn khỏi Thư viện tài liệu.'),
          actionUrl: getInternalHref(urls, metadata, '/my-documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_REMOVED,
      eventVersion: 1,
      templateKey: 'document-removed.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-removed.v1',
          title: getText(metadata, 'title', 'Tài liệu đã bị gỡ'),
          body: getText(metadata, 'message', 'Tài liệu của bạn đã bị gỡ khỏi Thư viện tài liệu.'),
          actionUrl: getInternalHref(urls, metadata, '/my-documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_REPORT_RESOLVED,
      eventVersion: 1,
      templateKey: 'document-report-resolved.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-report-resolved.v1',
          title: getText(metadata, 'title', 'Báo cáo của bạn đã được xử lý'),
          body: getText(metadata, 'message', 'Admin đã xử lý báo cáo tài liệu bạn gửi.'),
          actionUrl: getInternalHref(urls, metadata, '/documents'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_GENERATION_COMPLETED,
      eventVersion: 1,
      templateKey: 'document-generation-completed.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-generation-completed.v1',
          title: getText(metadata, 'title', 'Tạo tài liệu AI hoàn tất'),
          body: getText(metadata, 'message', 'Tài liệu do Gemini tạo đã sẵn sàng để duyệt.'),
          actionUrl: getInternalHref(urls, metadata, '/admin/documents/moderation'),
        }),
    },
    {
      eventType: NotificationEventType.DOCUMENT_GENERATION_FAILED,
      eventVersion: 1,
      templateKey: 'document-generation-failed.v1',
      render: ({ metadata }) =>
        safeResult({
          templateKey: 'document-generation-failed.v1',
          title: getText(metadata, 'title', 'Tạo tài liệu AI thất bại'),
          body: getText(metadata, 'message', 'Quá trình tạo tài liệu bằng Gemini gặp lỗi.'),
          actionUrl: getInternalHref(urls, metadata, '/admin/documents/generator'),
        }),
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
            'Ban co mot cap nhat moi tu BeaconVie.',
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
