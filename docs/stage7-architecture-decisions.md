# Stage 7.1 — Architecture Decision Records (Notification & Achievement)

Trạng thái: quyết định kiến trúc. Không code, không migration trong tài liệu này.
Căn cứ: `docs/stage7-notification-achievement-architecture-audit.md` (Stage 7.0) + `docs/stage7-prerequisites-resolution.md` (Stage 7.1, 3 prerequisite).

---

## Phần A — Notification Pipeline (nền tảng cho ADR-001 → ADR-004)

### A.1 Pipeline chuẩn

```
Domain Action (vd. Listening.finishSession(), MissionV2Reward.claim())
  → Domain Event (EventEmitter2, in-process, vd. 'learning.activity.completed', 'mission.completed')
    → Notification Event Mapper (trong module Notifications, KHÔNG trong domain module)
      → BullMQ Job ('notification.create' / 'notification.createMany')
        → Notification Processor (đã tồn tại: notifications.processor.ts, mở rộng thêm)
          → Database (Notification.create, có deduplicationKey unique)
            → Realtime Delivery (NotificationGateway.emitUser, best-effort)
            → REST Synchronization (client tự đồng bộ lại qua GET /notifications khi mở app / reconnect / focus — vẫn giữ polling làm fallback)
```

Nguyên tắc bắt buộc: **domain module không tự soạn nội dung Notification và không gọi `prisma.notification.create()` trực tiếp.** Domain module chỉ có trách nhiệm publish 1 typed domain event đầy đủ dữ liệu cần thiết. Toàn bộ phần "soạn tiêu đề, kiểm tra preference, khử trùng, ghi DB, đẩy realtime" thuộc về module Notifications.

Đây là thay đổi so với hiện trạng: hiện tại 8/9 điểm gọi (`mission-v2-reward`, `mission-v2-progress`, `leaderboard-reward`, `leaderboard-weekly-close`, `community-club-permission`, `community-social`, `community.processor`) đang tự soạn `title`/`message`/`type`/`href` rồi gọi thẳng `NotificationsService.createFromPayload()`. Việc chuyển đổi sang publish-event được xử lý dần (xem ADR-002, chiến lược "Legacy adapter"), không bắt buộc sửa hết trong 7A.

### A.2 Domain event vs Notification command/job — ranh giới trách nhiệm

| | Domain Event | Notification Command/Job |
|---|---|---|
| Ai phát ra | Domain module (Listening, Mission, Community...) | Notification Event Mapper (nội bộ module Notifications) |
| Cơ chế | `EventEmitter2` (`emitAsync`) | BullMQ (`queue.add`) |
| Nội dung | Sự thật nghiệp vụ thô (activity, userId, sourceId, score...) | Lệnh cụ thể đã được map: `notification.create`, `notification.createMany`, `notification.deliverRealtime`, `notification.sendDigest`, `notification.cleanup` |
| Ai biết về Notification | Domain module KHÔNG biết | Chỉ Notification module biết |
| Ví dụ | `learning.activity.completed`, `mission.completed`, `achievement.unlocked`, `community.comment.created` | `notification.create` (job xử lý 1 payload đã map sẵn title/message/type/href/dedupKey) |

Ví dụ cụ thể theo đề bài đã liệt kê, đối chiếu với event thật/dự kiến trong hệ thống:

```
learning.lesson.completed      → CHƯA publish (chỉ có learning.activity.completed dùng chung cho mọi activity)
learning.vocabulary.completed  → CHƯA có tên riêng, nằm trong learning.activity.completed (activity='VOCABULARY_COMPLETED')
learning.listening.completed   → tương tự, activity='LISTENING_COMPLETED'
mission.completed              → CHƯA tồn tại, cần thêm publish mới ở mission-v2-reward.service.ts (Prerequisite 1)
achievement.unlocked           → CHƯA tồn tại, sẽ được Achievement Evaluator (7C) publish sau khi unlock ghi DB thành công
community.comment.created      → CHƯA publish qua EventEmitter2 (hiện tại là gọi trực tiếp qua BullMQ community processor + gateway.emitNotification, không phải domain event)
community.post.reacted         → tương tự, chưa qua EventEmitter2
club.invitation.created        → tương tự, hiện tại là gọi trực tiếp community-club-permission.service.ts → NotificationsService
friend.request.created         → tương tự, community-social.service.ts → NotificationsService trực tiếp
system.announcement.created    → chưa tồn tại dưới bất kỳ hình thức nào (không có tính năng thông báo hệ thống thủ công hiện tại)
```

Quyết định: **không bắt buộc chuyển hết các luồng Community/Club/Friend sang domain event trong 7A.** Lý do (xem ADR-002 phần "Legacy adapter"): các luồng này đã hoạt động đúng (dù tight-coupled), rủi ro sửa toàn bộ trong 1 giai đoạn cao hơn lợi ích. 7A chỉ bắt buộc dựng xong pipeline (Mapper + Queue + Processor + Dedup + Preference) và áp dụng cho ít nhất các luồng có domain event sẵn có (`learning.activity.completed` khi mở rộng, `mission.completed`/`achievement.unlocked` mới). Community/Club/Friend được chuyển dần sau 7A theo chiến lược adapter.

---

## Phần B — Notification Event Contract (nền tảng ADR-001, ADR-003)

### B.1 Schema (ý nghĩa các trường, JSON-serializable, không chứa object Prisma đầy đủ)

```
NotificationDomainEvent {
  eventId: string            // uuid v4, sinh tại nơi publish, dùng để trace log xuyên suốt pipeline
  eventType: string          // vd. 'mission.completed', 'achievement.unlocked'
  eventVersion: number       // bắt đầu = 1, tăng khi đổi cấu trúc payload không tương thích ngược
  occurredAt: string         // ISO 8601, thời điểm nghiệp vụ xảy ra (không phải thời điểm xử lý)
  actorUserId: string | null // ai gây ra hành động (vd. người gửi lời mời club); null nếu là hệ thống (cron)
  recipientUserIds: string[] // danh sách người nhận tường minh — KHÔNG derive ngầm trong processor
  entityType: string         // vd. 'ListeningSession', 'MissionProgressEventV2', 'ClubInvite'
  entityId: string           // id thật của bản ghi gốc, để processor reload dữ liệu mới nhất nếu cần
  context: Record<string, JsonPrimitive>  // metadata nhỏ, whitelist rõ field (vd. { missionTitle, rewardXp }) — KHÔNG nhúng nguyên object Prisma
  deduplicationKey: string    // xem Phần C
  priority: 'LOW' | 'NORMAL' | 'HIGH'
  expiresAt: string | null    // null = không hết hạn; có giá trị cho loại notification có tính thời điểm (vd. "còn 2 giờ để claim")
}
```

Ràng buộc bắt buộc:
- Không đưa dữ liệu bí mật (token, mật khẩu, email cá nhân nhạy cảm nếu không cần hiển thị) vào `context`.
- `context` chỉ chứa primitive (string/number/boolean/null) hoặc mảng/object nông (1 cấp) của primitive — không nhúng nested object lớn, không nhúng toàn bộ Prisma model.
- Processor luôn có thể reload dữ liệu mới nhất từ `entityType`+`entityId` nếu `context` không đủ — payload không phải là nguồn sự thật duy nhất, DB mới là nguồn sự thật.
- Event không phụ thuộc `Request` object (không truyền `req`, `res`, session object nào vào payload — bảo đảm serializable qua BullMQ).

### B.2 Dead-letter / retry strategy

- BullMQ job dùng `attempts: 5` với `backoff: { type: 'exponential', delay: 2000 }` (2s, 4s, 8s, 16s, 32s).
- `removeOnFail: false` với giới hạn số lượng job fail giữ lại (vd. `{ count: 1000 }`) — không xoá ngay để có thể điều tra.
- Sau khi hết `attempts`, job vào trạng thái `failed` của BullMQ (đây là "dead-letter" thực tế trong Phase 1 — không xây thêm hàng đợi dead-letter riêng). Một `QueueEvents` listener ghi lại các job fail vào 1 bảng audit nhẹ (đề xuất tên `NotificationFailedEvent`, xem migration plan) để hiển thị cho admin, KHÔNG tự động retry vô hạn.
- Giới hạn Phase 1: không có UI admin để "re-drive" job fail thủ công — chỉ có log/bảng audit để biết có bao nhiêu job fail và vì sao. Nếu cần tái xử lý, làm thủ công qua script (tương tự các script `stage6d*-*.js` đã dùng ở Listening) — đây là giới hạn được chấp nhận cho Phase 1, ghi rõ trong ADR-009.

---

## Phần C — Deduplication (nền tảng ADR-003)

### C.1 Format

```
deduplicationKey = notification:{eventType}:{recipientId}:{entityId}:{eventVersion}
```

Ví dụ: `notification:mission.completed:user-abc:mission-progress-xyz:1`

### C.2 Các trường hợp phải chống trùng (đối chiếu với source thật đã đọc trong Stage 7.0)

| Trường hợp | Rủi ro trùng | Lớp bảo vệ |
|---|---|---|
| `EventEmitter2` listener chạy 2 lần | EventEmitter2 không đảm bảo exactly-once, nếu code publish bị gọi 2 lần (vd. do retry ở tầng gọi) | `deduplicationKey` unique index ở DB — lớp cuối cùng, không phụ thuộc tầng nào phía trên |
| BullMQ retry | Job attempt 2 chạy sau khi attempt 1 thực ra đã ghi DB thành công nhưng response bị mất (network) | Idempotency ở Processor: `create()` trong try/catch bắt lỗi P2002 (unique violation) → coi là no-op, KHÔNG throw lại |
| Client reconnect | Client fetch lại REST sau khi đã nhận qua socket — không phải rủi ro ghi trùng DB, mà rủi ro hiển thị trùng ở UI | Xử lý ở frontend (merge theo `id`, không phải theo thứ tự nhận), không phải trách nhiệm của dedup key |
| Request double-click (vd. user bấm "Đánh dấu đã đọc" 2 lần) | Không liên quan tạo notification, liên quan update — `markAsRead`/`markAllAsRead` đã là idempotent tự nhiên (update trạng thái, không tạo mới) | Không cần dedup key, đã an toàn theo thiết kế hiện tại |
| Hai instance backend xử lý cùng event | Nếu scale horizontal, 2 instance có thể cùng nhận 1 BullMQ job hoặc cùng nhận EventEmitter2 event nếu chạy trên cùng process — nhưng `EventEmitter2` là in-process nên **không có rủi ro 2 instance cùng chạy 1 EventEmitter2 emit của nhau** (mỗi instance chỉ emit/consume trong chính process của nó); rủi ro thật nằm ở BullMQ (2 worker có thể lấy job khác nhau nhưng cùng nội dung nếu producer bị gọi 2 lần từ 2 instance cho cùng 1 sự kiện nghiệp vụ) | `deduplicationKey` unique index là lớp chặn cuối cùng bất kể bao nhiêu worker |
| Scheduler chạy lặp (vd. cron daily reminder chạy trùng do lệch giờ deploy) | Đã có tiền lệ thật: `createOncePerDay()` hiện tại tự `findFirst` rồi mới `create` — có race condition lý thuyết nếu 2 lần gọi gần như đồng thời | Thay `findFirst`-then-`create` bằng `deduplicationKey` unique + catch P2002, an toàn tuyệt đối dưới concurrency thay vì dựa vào timing của `findFirst` |

**Nguyên tắc chốt: không dựa hoàn toàn vào BullMQ `jobId` để chống trùng.** `jobId` chỉ chống trùng *job* (không thêm 2 job giống hệt vào queue cùng lúc nếu dùng cùng `jobId`), nhưng không chống được trường hợp 2 job khác `jobId` cùng dẫn tới cùng 1 kết quả nghiệp vụ (vd. do publisher bị gọi 2 lần với dữ liệu khác biệt nhỏ). **Database (unique index trên `deduplicationKey`) luôn là lớp bảo vệ cuối cùng**, độc lập với BullMQ.

---

## Phần D — Notification Preference Model (nền tảng ADR-001)

### D.1 Bảng quyết định (8 preference thật trong `UserSettings`, đối chiếu source Stage 7.0)

| Preference | Hiện dùng | Event áp dụng | Default | Realtime | Digest |
|---|---|---|---|---|---|
| `dailyReminderEnabled` | CÓ (đã dùng trong `notifications.processor.ts`) | Cron nội bộ (không phải domain event, self-scheduled) — nhắc học hằng ngày | `true` | KHÔNG (chỉ in-app/push khi user không mở app) | Chính nó đã là 1 lần/ngày, không cần digest riêng |
| `missionReminder` | CÓ (đã dùng, weekly goal reminder) | Cron nội bộ — nhắc mission tuần mới | `true` | KHÔNG | CÓ (bản chất là digest tuần) |
| `pushNotification` | CÓ (gate chung cho kênh push, đang dùng cho daily reminder) | Cross-cutting — gate mọi thứ thuộc kênh "push" (khi push thật được xây, xem Missing Feature ở Stage 7.0) | `true` | Không áp dụng (đây là gate kênh, không phải loại event) | Không áp dụng |
| `friendActivity` | KHÔNG (chưa enforce ở đâu) | `friend.request.created`, `friend.request.accepted` | `true` | CÓ | KHÔNG |
| `clubNotification` | KHÔNG | `club.invitation.created`, `club.join.approved`, `club.join.rejected`, `club.role.changed`, `club.member.left`, `club.ownership.transferred` | `true` | CÓ | KHÔNG |
| `leaderboardNotification` | KHÔNG | `leaderboard.reward.granted`, `leaderboard.weekly.closed` | `true` | CÓ | CÓ (tuỳ chọn recap tuần) |
| `aiFeedbackNotification` | KHÔNG | Chưa có domain event tương ứng nào tồn tại trong hệ thống hiện tại (không tìm thấy tính năng "AI feedback ready" nào phát sinh sự kiện) | `true` | Chưa áp dụng (chưa có nguồn phát) | Chưa áp dụng |
| `emailNotification` | KHÔNG (không có `EmailService` nào tồn tại) | Cross-cutting — gate kênh email cho mọi loại notification, khi kênh email được xây | `false` | Không áp dụng (kênh email, không phải realtime) | CÓ (ứng viên tốt cho digest email hằng ngày/tuần thay vì gửi từng cái) |

### D.2 Nơi áp dụng preference

Quyết định: **kiểm tra ở CẢ HAI nơi, với vai trò khác nhau — không phải chọn một.**

- **Trước khi enqueue (coarse gate, tối ưu hiệu năng):** nếu preference tắt hẳn ở mức "loại notification" (vd. `clubNotification = false`), Notification Event Mapper có thể bỏ qua việc tạo job ngay từ đầu, tránh tốn queue/worker cho việc chắc chắn sẽ bị chặn. Đây là tối ưu, không phải nguồn sự thật.
- **Trong Processor tại thời điểm ghi DB (source of truth, bắt buộc):** Processor luôn re-check preference **mới nhất** trước khi ghi/đẩy realtime, vì job có thể nằm trong queue một khoảng thời gian và preference có thể đã đổi giữa lúc enqueue và lúc xử lý. Đây chính xác là pattern đã có sẵn và đúng trong code hiện tại (`createUserDailyReminder()` trong `notifications.processor.ts` re-check `dailyReminderEnabled`/`pushNotification` ngay tại thời điểm job chạy, không tin vào trạng thái lúc job được tạo) — Stage 7.1 chỉ mở rộng pattern này cho toàn bộ 8 preference thay vì chỉ 2 preference hiện tại.

Lý do chọn "cả hai, Processor là nguồn sự thật": tránh race condition giữa thời điểm user đổi setting và thời điểm job thực thi — nếu chỉ gate lúc enqueue, một job đã nằm trong queue trước khi user tắt preference vẫn sẽ được xử lý sai; nếu chỉ gate ở processor mà không gate lúc enqueue, hệ thống enqueue lãng phí job chắc chắn bị chặn.

### D.3 Phân biệt kênh

Preference không đồng nghĩa với việc tắt lưu trữ. Bảng phân biệt bắt buộc:

| Kênh | Ý nghĩa | Preference liên quan |
|---|---|---|
| In-app notification (ghi DB, hiển thị trong `/notifications`, `NotificationDrawer`) | Luôn ghi, trừ khi preference của loại đó tắt hẳn (vd. `clubNotification=false` → không tạo record luôn, không chỉ ẩn) | Tất cả 8 preference đều gate được kênh này |
| Realtime toast (đẩy qua socket ngay khi tạo) | Là một lớp UX bổ sung trên nền in-app đã ghi DB | KHÔNG có preference riêng cho "tắt toast nhưng vẫn lưu" trong 8 field hiện có — nếu cần tách riêng (vd. user muốn vẫn thấy trong danh sách nhưng không muốn popup), cần thêm preference mới ở giai đoạn sau, ngoài phạm vi 8 field hiện tại |
| Email | Gửi email riêng biệt, độc lập với việc có ghi in-app hay không | `emailNotification` (gate kênh, cross-cutting) |
| Push (thiết bị/OS) | Gửi qua FCM/APNs/WebPush (chưa tồn tại hạ tầng) | `pushNotification` (gate kênh) |
| Digest | Gộp nhiều notification thành 1 bản tóm tắt định kỳ thay vì gửi từng cái | Tuỳ loại — xem cột "Digest" ở bảng D.1 |

**Nguyên tắc chốt:** tắt "realtime toast" (nếu preference đó được thêm sau này) KHÔNG được hiểu là tắt lưu notification vào DB, trừ khi nghiệp vụ nói rõ preference đó là "tắt hoàn toàn loại notification này". Với 8 preference hiện có, tất cả đều được hiểu là "tắt hoàn toàn loại đó" (gate cả in-app lẫn mọi kênh khác) vì tên field không phân biệt kênh (vd. `clubNotification` không có field `clubNotificationRealtimeOnly` đi kèm).

---

## Phần E — Dependency Direction (nền tảng ADR-005, ADR-009, tham chiếu Prerequisite 1)

```
Learning Modules (Vocabulary/Grammar/Reading/Writing/Speaking/Listening/Quizzes/Placement)
  → learning.activity.completed (domain event, ĐÃ CÓ, không sửa 9 module)

Mission (mission-v2-reward.service.ts)
  → mission.completed (domain event MỚI, cần thêm publish)

Leaderboard (leaderboard-reward.service.ts, leaderboard-weekly-close.service.ts)
  → leaderboard.reward.granted / leaderboard.weekly.closed (domain event MỚI)

Community/Club/Friend (community-social, community-club-permission, community.processor)
  → giữ nguyên gọi trực tiếp NotificationsService trong 7A (Legacy adapter, xem ADR-002),
    chuyển dần sang domain event ở giai đoạn sau 7A

Domain Events (learning.activity.completed, mission.completed, leaderboard.reward.granted, ...)
  → Achievement Evaluator (7C, lắng nghe, KHÔNG sửa domain module)
    → Reward Ledger (AchievementUnlock, dùng lại pattern XpTransaction/idempotencyKey đã có)
    → achievement.unlocked (domain event MỚI, do chính Achievement module publish sau khi ghi Unlock Ledger thành công)

Domain Events (toàn bộ, bao gồm cả achievement.unlocked)
  → Notification Event Mapper
    → Notification Queue (BullMQ)

Notification module
  → KHÔNG phụ thuộc ngược vào Learning/Mission/Achievement internals
    (Notification chỉ biết "eventType + payload đã chuẩn hoá", không import service của Learning/Mission/Achievement,
     không query trực tiếp bảng nghiệp vụ của các module đó — nếu cần thêm dữ liệu hiển thị, dùng field có sẵn
     trong domain event payload, KHÔNG gọi cross-module service)
```

Nguyên tắc tránh circular dependency: Achievement module được phép phụ thuộc vào domain event của Learning/Mission/Leaderboard (một chiều: Learning → Event → Achievement). Notification module được phép phụ thuộc vào domain event của TẤT CẢ các module khác kể cả Achievement (Achievement → Event → Notification). Không module nghiệp vụ nào (Learning/Mission/Leaderboard/Achievement) được import trực tiếp `NotificationsService`/`AchievementService` sau khi hoàn tất chuyển đổi — chỉ còn phụ thuộc vào `EventEmitter2` (interface chung, không phải service cụ thể). Trong giai đoạn 7A, các luồng Legacy (Mission/Leaderboard/Community đang gọi trực tiếp `NotificationsService`) là **ngoại lệ tạm thời có kế hoạch xoá bỏ**, không phải kiến trúc đích.

---

## ADR-001 — Notification Event Pipeline

**Context:** Stage 7.0 xác nhận 8/9 điểm tạo Notification gọi trực tiếp `NotificationsService`, bỏ qua BullMQ queue đã đăng ký sẵn. Không có ranh giới rõ giữa "sự thật nghiệp vụ" và "lệnh tạo thông báo".

**Decision:** Áp dụng pipeline `Domain Action → Domain Event → Notification Event Mapper → BullMQ Job → Notification Processor → Database → Realtime Delivery → REST Synchronization` (chi tiết Phần A). Domain module chỉ publish typed event, không tự soạn nội dung Notification, không gọi DB trực tiếp.

**Alternatives:** (1) Giữ nguyên gọi trực tiếp, chỉ thêm validation — bị loại vì không giải quyết gốc rễ tight-coupling đã ghi nhận ở Stage 7.0; (2) Chuyển thẳng 100% sang event ngay trong 7A — bị loại vì rủi ro sửa quá nhiều file cùng lúc (9+ file), vi phạm nguyên tắc "small stage" xuyên suốt dự án.

**Consequences:** Notification module trở thành điểm tập trung logic (preference, dedup, template) thay vì rải rác; cần Legacy adapter cho các luồng chưa kịp chuyển (ADR-002).

**Risks:** Giai đoạn chuyển tiếp có 2 pattern song song (event-based và direct-call) tồn tại cùng lúc, dễ gây nhầm lẫn cho dev mới nếu không ghi chú rõ trong code.

**Implementation Notes:** 7A dựng pipeline đầy đủ và áp dụng cho `learning.activity.completed` (mở rộng) + `mission.completed`/`leaderboard.reward.granted` (mới). Community/Club/Friend giữ nguyên direct-call, có TODO comment trỏ tới ADR này.

---

## ADR-002 — EventEmitter2 vs BullMQ Responsibilities

**Context:** Hệ thống có cả `EventEmitter2` (2 event thật) và BullMQ (đã đăng ký nhưng dùng non-triệt để cho Notification). Cần ranh giới trách nhiệm rõ ràng để không lặp lại tình trạng "hạ tầng có sẵn nhưng không dùng đúng".

**Decision:**
- `EventEmitter2`: chỉ dùng cho domain event **nội bộ, cùng process, không cần đảm bảo durable**. Phù hợp cho việc thông báo "sự việc X đã xảy ra" giữa các module trong cùng 1 lần request/transaction đã hoàn tất.
- `BullMQ`: dùng cho mọi tác vụ **durable, bất đồng bộ**: ghi Notification vào DB, retry khi delivery lỗi, notification có lịch (scheduled), digest, cleanup/retention, fan-out cho nhiều user (vd. thông báo hệ thống cho toàn bộ user).
- **Không dùng `EventEmitter2` làm durable queue.** Nếu listener của `EventEmitter2` không chạy (process crash giữa lúc `emitAsync` và khi listener xử lý xong), sự kiện mất vĩnh viễn — không có cơ chế nào phát hiện hay retry. Đây là lý do Notification không được phép chỉ dựa vào 1 `@OnEvent` listener để ghi DB trực tiếp — phải luôn có một bước `queue.add()` nằm trong listener đó để việc ghi DB thật sự durable qua BullMQ (đã persist trong Redis, có retry riêng của BullMQ).

**Chiến lược chuyển đổi dần cho 8/9 direct call hiện tại:**

```
Legacy direct call (vd. mission-v2-reward.service.ts gọi thẳng notifications.createFromPayload())
  → bước 1: giữ nguyên lời gọi cũ (không phá vỡ hành vi hiện tại)
  → bước 2: thêm 1 typed publisher adapter mới (vd. MissionCompletedEventPublisher) ngay cạnh lời gọi cũ,
            publish domain event 'mission.completed' song song
  → bước 3: Notification module thêm listener mới cho 'mission.completed', TỰ tạo notification qua pipeline mới
  → bước 4: sau khi xác nhận pipeline mới hoạt động đúng qua regression test (2 đường cùng tạo ra kết quả giống nhau),
            XOÁ lời gọi trực tiếp cũ trong mission-v2-reward.service.ts
```

Đây là chiến lược "chạy song song rồi cắt cầu", không bắt buộc hoàn thành hết trong Stage 7.1/7A — chỉ bắt buộc bước 1-3 cho `mission.completed` (Mission) như một ví dụ mẫu chứng minh pipeline hoạt động; bước 4 và việc áp dụng cho Community/Club/Friend là công việc sau 7A.

**Alternatives:** Dùng BullMQ cho toàn bộ domain event (kể cả tính XP) — bị loại vì `learning.activity.completed`/`LearningXpListener` đã hoạt động ổn định qua nhiều stage, không có lý do thay đổi cơ chế đã chứng minh đúng, chỉ nên áp dụng nguyên tắc mới cho phần Notification/Achievement đang xây.

**Consequences:** Notification không bao giờ phụ thuộc vào việc 1 listener EventEmitter2 chạy thành công ngay trong cùng request — luôn có lớp BullMQ ở giữa đảm bảo durability.

**Risks:** Thêm 1 lớp gián tiếp (event → queue) nghĩa là Notification không xuất hiện tức thời trong cùng transaction — chấp nhận được vì Notification vốn không cần strong consistency với hành động gốc.

**Implementation Notes:** Namespace queue job theo `notification.create`/`notification.createMany`/`notification.deliverRealtime`/`notification.sendDigest`/`notification.cleanup` như đề bài yêu cầu, tái sử dụng `NOTIFICATIONS_QUEUE` đã có, mở rộng `NotificationJobName` enum.

---

## ADR-003 — Notification Deduplication

**Context:** Xem Phần C. `createOncePerDay()` hiện tại dùng find-then-create, có race condition lý thuyết.

**Decision:** Mọi Notification bắt buộc có `deduplicationKey` dạng `notification:{eventType}:{recipientId}:{entityId}:{eventVersion}`, với unique index ở tầng DB làm lớp bảo vệ cuối cùng, độc lập với BullMQ `jobId`.

**Alternatives:** (1) Chỉ dùng BullMQ `jobId` để dedup — bị loại vì không chống được trùng khi 2 job khác `jobId` dẫn tới cùng kết quả nghiệp vụ, và không bảo vệ được các luồng chưa qua queue (Legacy direct call); (2) Chỉ dùng application-level check (`findFirst` rồi `create`) như hiện tại — bị loại vì đã biết có race condition (tương tự sự cố duplicate `ListeningSession` đã xử lý ở Stage 6D.5, cùng một dạng lỗi).

**Consequences:** Cần migration thêm cột `deduplicationKey` (nullable cho dữ liệu cũ, unique cho dữ liệu mới) — xem migration plan.

**Risks:** Nếu 2 domain event hợp lệ nhưng khác nhau vô tình tạo cùng `deduplicationKey` (lỗi thiết kế key), notification thứ 2 sẽ bị chặn nhầm — cần review kỹ format key cho từng `eventType` mới trước khi thêm.

**Implementation Notes:** Processor bắt lỗi Prisma P2002 khi `create()`, coi là thành công no-op, không throw lại (tránh BullMQ retry vô ích cho lỗi dedup).

---

## ADR-004 — Notification Realtime Delivery

**Context:** Không có `NotificationGateway` riêng; polling REST 30s là kênh duy nhất. Kênh socket `community:notification` hiện tại tách biệt khỏi bảng `Notification`.

**Decision:** Xây `NotificationGateway` mới, namespace riêng (vd. `/notifications`), chỉ emit 3 loại sự kiện tối giản: `notification:created`, `notification:read`, `notification:unread-count-changed`. Client nhận event realtime chỉ để biết "có gì mới" rồi tự gọi lại REST để lấy dữ liệu đầy đủ (hoặc nhận kèm payload tối giản, không nhạy cảm, đủ hiển thị ngay). Polling REST vẫn giữ làm fallback/nguồn sự thật cuối cùng (nếu socket disconnect, client vẫn đúng dữ liệu sau tối đa 30s).

**Alternatives:** Emit toàn bộ nội dung Notification qua socket ngay khi tạo — bị loại vì không cần thiết cho mọi UI (Bell chỉ cần đổi số unread ngay, nội dung đầy đủ có thể lấy khi user mở Drawer) và tăng bề mặt dữ liệu truyền qua socket không cần thiết.

**Consequences:** Cần thiết kế reconnect: khi client reconnect, phải tự gọi lại `GET /notifications/unread-count` để đồng bộ (không tin tưởng giả định "không mất event nào trong lúc offline" — socket không buffer khi client offline theo xác nhận ở Stage 7.0).

**Risks:** Multiple tabs cùng 1 user — mỗi tab là 1 socket connection riêng, đều join room `user:{id}`, đều nhận event — cần đảm bảo `markAsRead` ở tab A phát broadcast `notification:read` để tab B cũng cập nhật UI, tránh lệch trạng thái giữa các tab.

**Implementation Notes:** Xác thực theo ADR-010 (không copy CommunityGateway). Chi tiết reconnect: sau `connect` event, client luôn gọi 1 lần `GET /notifications/unread-count` để đồng bộ lại, bất kể server có emit gì trong lúc disconnect hay không.

---

## ADR-005 — Achievement Source of Truth

**Context:** `/vocabulary/achievements/*` hiện là derive-on-the-fly, không có bảng lưu trữ, không unlock logic thật, `claimed` chỉ là kết quả so sánh threshold tại thời điểm gọi API.

**Decision:** Achievement là **hệ thống mới, độc lập, dùng 3 bảng**: `AchievementDefinition` (danh mục), `UserAchievementProgress` (tiến độ đang chạy, mutable), `AchievementUnlock` (ledger bất biến cho việc unlock+reward, có idempotency key). Vocabulary dashboard hiện tại **không phải và sẽ không trở thành** source of truth cho Achievement thật.

**Alternatives:** (1) Chỉ 2 bảng (gộp Progress và Unlock vào 1 bảng, thêm cột `unlockedAt`/`claimedAt` ngay trong Progress) — cân nhắc nhưng bị loại vì: Progress là bảng bị update liên tục (mỗi lần có domain event liên quan lại tăng `currentValue`), trong khi Unlock cần là bản ghi bất biến để làm idempotency-anchor cho reward (tương tự `XpTransaction` — bảng ledger XP hiện tại đã chứng minh pattern append-only + `idempotencyKey` unique hoạt động tốt qua nhiều stage). Gộp chung 2 vai trò vào 1 bảng mutable làm mất tính "ledger" cần thiết cho việc chống double-reward khi có concurrent update; (2) Mở rộng Vocabulary dashboard hiện tại thành Achievement thật (thêm bảng ngay trong module Vocabulary) — bị loại vì Achievement vốn cross-cutting (tổng hợp 8+ module), nhốt trong Vocabulary là smell kiến trúc đã ghi nhận ở Stage 7.0, không nên nhân rộng thêm.

**Consequences:** Cần AchievementModule mới hoàn toàn, tách biệt Vocabulary. Cần migration 3 bảng (không tạo trong Stage 7.1, xem migration plan).

**Risks:** Duy trì 2 hệ thống "achievement" song song một thời gian (Vocabulary derive-dashboard cũ + Achievement thật mới) có thể gây nhầm lẫn cho user nếu không làm rõ trên UI (xem ADR-008).

**Implementation Notes:** `UserAchievementProgress` unique theo `(userId, achievementId)`. `AchievementUnlock` có `idempotencyKey` unique theo `achievement-reward:{userId}:{achievementCode}:{unlockSequence}` (xem ADR-007).

---

## ADR-006 — Achievement Criteria Engine

**Context:** Nếu để mỗi module tự viết logic unlock riêng, sẽ lặp lại đúng vấn đề tight-coupling mà Notification hiện đang mắc phải.

**Decision:** Một `AchievementEvaluator` tập trung, subscribe domain event (theo Prerequisite 1 — chủ yếu `learning.activity.completed`, cộng `mission.completed`/`leaderboard.reward.granted` mới). Criteria được định nghĩa qua `criteriaType` (whitelist enum, không phải code tuỳ ý) + `criteriaConfig` (JSON, chỉ chứa cấu hình, KHÔNG chứa function/code):

```
criteriaType: COUNT_EVENT | SUM_VALUE | STREAK | THRESHOLD | DISTINCT_COUNT | COMPOSITE | ONE_TIME
```

Ví dụ ánh xạ:

```
"Complete 1 lesson"            → ONE_TIME,      config: { eventType: 'learning.activity.completed', activity: 'LESSON_COMPLETED' }
"Complete 10 lessons"          → COUNT_EVENT,   config: { eventType: 'learning.activity.completed', activity: 'LESSON_COMPLETED' }, target: 10
"Learn 100 words"              → SUM_VALUE,     config: { eventType: 'learning.activity.completed', activity: 'VOCABULARY_COMPLETED', valueField: 'wordsLearned' }, target: 100
"Maintain 7-day streak"        → STREAK,        config: { source: 'PetProfile.streak' }, target: 7
"Score 90% in Listening"       → THRESHOLD,     config: { eventType: 'learning.activity.completed', activity: 'LISTENING_COMPLETED', valueField: 'score' }, target: 90
"Complete all skills in 1 day" → COMPOSITE,     config: { requires: ['VOCABULARY_COMPLETED','GRAMMAR_COMPLETED','READING_COMPLETED','WRITING_COMPLETED','SPEAKING_COMPLETED','LISTENING_COMPLETED'], window: '1d' }
"Join first club"              → ONE_TIME,      config: { eventType: 'club.member.joined' }
"Publish first post"           → ONE_TIME,      config: { eventType: 'community.post.created' }
```

`criteriaConfig` phải được validate bằng schema cứng theo từng `criteriaType` (không tự do), và có `version` để criteria có thể đổi cấu trúc config sau này mà không phá dữ liệu cũ.

**Alternatives:** Lưu trực tiếp điều kiện dưới dạng biểu thức/code string rồi `eval` — bị loại thẳng vì rủi ro bảo mật nghiêm trọng (remote code execution nếu dữ liệu bị can thiệp) và không kiểm soát được qua validation.

**Consequences:** Thêm loại `criteriaType` mới trong tương lai cần code mới trong Evaluator (không chỉ thêm dữ liệu) — đây là đánh đổi chấp nhận được để giữ an toàn.

**Risks:** `COMPOSITE` là loại phức tạp nhất (cần theo dõi nhiều điều kiện trong 1 khung thời gian) — nên triển khai sau cùng trong 7C, không phải criteria đầu tiên để test.

**Implementation Notes:** Evaluator nhận domain event → tìm các `AchievementDefinition.isActive=true` có `criteriaConfig` khớp `eventType`/`activity` → cập nhật `UserAchievementProgress.currentValue` → nếu đạt `targetValue` → tạo `AchievementUnlock` (idempotent) → publish `achievement.unlocked`.

---

## ADR-007 — Achievement Reward Policy

**Context:** Cần chọn giữa auto-grant và manual claim; Reward phải đi qua Reward/XP ledger hiện có (không tự update XP/coins nhiều lần).

**Decision:** Mô hình hybrid: **achievement thông thường (XP/coins/pet-food) → auto-grant** ngay khi unlock, trong cùng transaction ghi `AchievementUnlock` (gọi `XpService`/reward-service hiện có, không tự cộng trực tiếp vào `User.xp`/`coins`); **reward đặc biệt/cosmetic (badge hiếm, danh hiệu, item trang trí) → manual claim**, cần user chủ động bấm nhận trên UI. Không bắt tất cả achievement phải claim — tránh thêm bước UX không cần thiết cho phần thưởng cơ bản.

**Alternatives:** (1) Toàn bộ manual claim — bị loại vì tăng số bước UX không cần thiết cho reward nhỏ (XP/coins), không có lợi ích rõ ràng; (2) Toàn bộ auto-grant kể cả cosmetic — bị loại vì cosmetic/badge hiếm thường có giá trị UX ở chính khoảnh khắc "claim" (celebration), tự động cấp làm mất trải nghiệm đó.

**Consequences:** Cần cột `rewardConfig.claimRequired: boolean` trong `AchievementDefinition` để Evaluator biết loại nào auto-grant, loại nào chờ claim.

**Idempotency key bắt buộc:**

```
achievement-reward:{userId}:{achievementCode}:{unlockSequence}
```

Dùng lại đúng pattern đã chứng minh hiệu quả của `XpTransaction.idempotencyKey` (`learning:${activity}:${sourceId}`) — check-before-insert hoặc unique constraint + catch P2002, tương tự cách `XpService.awardXp()` đang làm.

**Risks:** Auto-grant chạy trong cùng transaction với việc ghi `AchievementUnlock` — nếu reward-service (XP/coins) throw lỗi, cần rollback cả `AchievementUnlock` (không được để unlock "thành công" nhưng reward thất bại) — bắt buộc dùng `prisma.$transaction` bao trọn cả 2 thao tác, đúng pattern `XpService.awardXp()` đã dùng.

**Implementation Notes:** Reward không bao giờ tự `prisma.user.update({ xp: increment })` trực tiếp trong module Achievement — luôn gọi qua service reward hiện có (`XpService` hoặc service tương đương) để đảm bảo mọi thay đổi XP/coins đi qua đúng 1 con đường duy nhất, tránh 2 nguồn ghi đè lẫn nhau.

---

## ADR-008 — Vocabulary Legacy Compatibility

**Context:** `/vocabulary/achievements/*` đang hoạt động, có route thật, có frontend thật, không được phá trong Stage 7.

**Decision:** Giữ nguyên API + UI hiện tại của `/vocabulary/achievements/*`, tái định nghĩa vai trò của nó thành "read-only learning statistics" (thống kê học tập tổng hợp), tách biệt hoàn toàn với hệ thống Achievement thật mới (route riêng, module riêng, ví dụ `/achievements`). Không để 2 hệ thống cùng cấp reward cho cùng 1 hành vi user (Vocabulary dashboard hiện tại chưa từng cấp reward thật — chỉ hiển thị lại — nên không có rủi ro double-reward giữa 2 hệ thống ở thời điểm hiện tại).

```
Legacy vocabulary achievement summary → read-only learning statistics (giữ nguyên, không phá API)
New global achievement system         → persistent unlock/progress/reward (module mới, route mới)
```

**Alternatives:** (1) Map trực tiếp dữ liệu cũ sang bảng mới ngay lập tức — bị loại vì dữ liệu cũ là derive-on-the-fly, không có "lịch sử unlock" thật để migrate (không có timestamp unlock đáng tin cậy để backfill); (2) Xoá `/vocabulary/achievements/*` ngay khi có hệ thống mới — bị loại vì phá API đang chạy, vi phạm nguyên tắc "không phá API hiện có trong Stage 7.1".

**Consequences:** Cần đổi tên hiển thị trên UI (7D) để tránh hiểu lầm — đây là thay đổi copy/label, không phải thay đổi API, có thể làm độc lập với backend Achievement mới.

**Risks:** Nếu không đổi tên/label rõ ràng, user có thể nhầm lẫn 2 hệ thống, tưởng "achievement" ở Vocabulary là hệ thống chính thức trong khi nó chỉ là thống kê.

**Implementation Notes:** 7D quyết định cụ thể: giữ nguyên route cũ (không redirect ngay), thêm route mới `/achievements` cho hệ thống thật, có thể thêm link chéo giữa 2 trang để user không bị lạc.

---

## ADR-009 — Transactional Reliability Strategy

**Context:** Rủi ro kinh điển: "database transaction completed nhưng domain event không được publish" (vd. crash giữa lúc transaction commit và lúc `eventEmitter.emitAsync()` được gọi). Đã có tiền lệ thật tương tự trong dự án: Stage 6D.5 phát hiện `missionV2ProgressService.increase()` bị nuốt lỗi bởi try/catch trong `updateListeningMissions()`, và bảng `MissionProgressEventV2` không tồn tại (migration chưa apply) trong một thời gian dài mà không ai biết — một dạng "silent data loss" thật đã xảy ra trong chính codebase này.

**Decision (Phase 1 — pragmatic):**
- Publish domain event **sau khi** transaction nghiệp vụ chính đã commit thành công (không publish trong lúc transaction đang mở, tránh publish rồi transaction lại rollback).
- Database (`deduplicationKey`, `idempotencyKey`) là lớp chống trùng, không phải lớp chống mất event.
- Retry ở tầng publisher khi publisher **biết** có lỗi (vd. nếu `emitAsync` throw, log lỗi rõ ràng — không nuốt lỗi im lặng như `updateListeningMissions()` hiện đang làm).
- **Reconciliation scheduler** cho các luồng quan trọng (Mission reward, Achievement progress): 1 cron job định kỳ (vd. mỗi giờ) quét các bản ghi nghiệp vụ gốc (vd. `MissionProgressEventV2` đã COMPLETED nhưng chưa có `AchievementUnlock`/`Notification` tương ứng trong khung thời gian hợp lý) và xử lý bù — đây là lưới an toàn cho trường hợp event bị mất.

**Decision (Future — không xây trong Stage 7):** Transactional Outbox Pattern (ghi event vào 1 bảng "outbox" trong CÙNG transaction với thay đổi nghiệp vụ, sau đó 1 process riêng đọc outbox và publish — đảm bảo atomicity thật giữa business write và event publish). Đây là giải pháp "future robust", không cần thiết ở quy mô hiện tại của dự án (số lượng event thấp, đã có reconciliation scheduler làm lưới an toàn).

**Alternatives:** Xây Outbox ngay trong Stage 7 — bị loại vì phức tạp không tương xứng với quy mô hiện tại (dự án hiện chỉ có 2 event thật toàn hệ thống), đúng tinh thần "không xây khi chưa cần" của đề bài.

**Consequences:** Có một khoảng "cửa sổ rủi ro" nhỏ (giữa lúc transaction commit và lúc publish thành công) mà event có thể mất nếu process crash đúng lúc đó — được chấp nhận ở Phase 1, được bù bằng reconciliation scheduler cho các luồng quan trọng.

**Risks:** Reconciliation scheduler cần được viết cẩn thận để không tự tạo ra duplicate (phải dùng lại đúng `deduplicationKey`/`idempotencyKey` khi xử lý bù, không phải logic tạo mới riêng).

**Implementation Notes:** Ưu tiên reconciliation cho Mission → Achievement → Reward (chuỗi có tiền lệ lỗi thật ở Stage 6D.5), triển khai ở 7C/7E.

---

## ADR-010 — Socket Authentication Requirement

**Context:** `CommunityGateway.handleConnection()` tin `client.handshake.auth?.userId` từ client, không verify — lỗ hổng impersonation thật. `LeaderboardCookieAuthService` (được Stage 7.0 khuyến nghị copy) verify JWT bằng `process.env.JWT_SECRET`, trong khi access token thật được ký/verify ở mọi nơi khác (`JwtStrategy`, `AuthService`) bằng `process.env.JWT_ACCESS_SECRET` — một khác biệt cần xác minh trước khi tin tưởng hoàn toàn pattern này (phát hiện mới trong Stage 7.1, xem Prerequisite 3).

**Decision:** `NotificationGateway` (7B) tự triển khai xác thực độc lập:
- Đọc `access_token` từ cookie header (giống `cookieExtractor` của `JwtStrategy`).
- Verify bằng `jwtService.verify(token, { secret: process.env.JWT_ACCESS_SECRET })` — khớp với nơi token được ký, KHÔNG dùng `JWT_SECRET`.
- Không nhận `userId` từ bất kỳ payload nào client tự gửi (không `handshake.auth`, không query param).
- `client.join('user:' + verifiedUserId)` chỉ dùng id đã verify.
- Disconnect ngay khi thiếu cookie hoặc verify thất bại; không log giá trị token dưới bất kỳ hình thức nào.
- KHÔNG sửa `community.gateway.ts` hay `leaderboard-cookie-auth.service.ts` trong Stage 7 dưới bất kỳ hình thức nào.

**Security Finding (ghi nhận chính thức):**

```
Security Finding: CommunityGateway socket authentication is not fully verified.
Severity: HIGH
Staging Recommendation: Must fix before public staging.
```

- **File ảnh hưởng:** `backend/src/modules/community/gateway/community.gateway.ts` (`handleConnection`, dòng 22-25).
- **Cách gateway hiện lấy identity:** `client.handshake.auth?.userId` — dữ liệu do client tự gửi khi kết nối, không đi qua bất kỳ middleware xác thực nào.
- **Chỗ thiếu JWT verification:** không có lời gọi `jwtService.verify()` hay tương đương nào trong `handleConnection()` — so sánh trực tiếp với `LeaderboardRealtimeGateway.handleConnection()` (cùng file loại, khác module) có gọi `this.auth.authenticate(client)` verify JWT thật qua cookie.
- **Khả năng impersonation:** có thật — bất kỳ client nào tự soạn `handshake.auth.userId = <id của người khác>` khi connect sẽ được join room `user:{id}` của người đó, nhận được `community:notification`, `community:friend-request`, tin nhắn/club message realtime dành cho người đó.
- **Test cần có (khi remediation được thực hiện, ngoài Stage 7):** (1) connect với `userId` giả không kèm cookie hợp lệ → phải bị từ chối/disconnect; (2) connect với cookie JWT hợp lệ của user A nhưng `handshake.auth.userId` khai là user B → phải join room của user A (theo JWT), không phải user B; (3) không có cookie → disconnect ngay, không join room nào.

**Task độc lập (không gộp vào Notification):**

```
SECURITY-HARDENING-SOCKET-AUTH
Scope: community.gateway.ts handleConnection() — thay client.handshake.auth.userId bằng xác thực JWT thật qua cookie
       (tái sử dụng hoặc hợp nhất với pattern LeaderboardCookieAuthService SAU KHI đã xác minh và thống nhất
       secret JWT_ACCESS_SECRET cho toàn bộ socket gateway trong hệ thống).
Not in scope: bất kỳ thay đổi nào cho Notification/Achievement.
Trigger: mở thành chặng riêng, khuyến nghị thực hiện trước khi đưa bất kỳ tính năng realtime nào lên staging công khai.
```

**Alternatives:** Sửa luôn `CommunityGateway` trong Stage 7 vì "tiện đang động vào socket auth" — bị loại thẳng theo đúng chỉ đạo của người dùng ("không sửa CommunityGateway trong cùng lượt").

**Consequences:** `NotificationGateway` mới an toàn ngay từ đầu; `CommunityGateway` vẫn còn lỗ hổng cho tới khi task riêng được thực hiện — đây là rủi ro tồn đọng đã được ghi nhận chính thức, không phải rủi ro bị bỏ sót.

**Risks:** Nếu Stage 7B bị trì hoãn lâu và `SECURITY-HARDENING-SOCKET-AUTH` không được ưu tiên, lỗ hổng Community tiếp tục tồn tại trong production — cần escalate mức độ ưu tiên của task này với chủ dự án ngoài phạm vi kỹ thuật thuần tuý.

**Implementation Notes:** Trước khi viết `NotificationGateway`, chạy xác minh thật (`Get-Content backend/.env | Select-String "JWT_"` trên máy thật) để biết `JWT_SECRET` và `JWT_ACCESS_SECRET` có cùng giá trị hay không — nếu khác nhau, ghi nhận rõ trong PR của 7B rằng `LeaderboardCookieAuthService` có khả năng đang verify sai secret, và đây là lý do bổ sung (ngoài việc tách phạm vi) để không tái sử dụng class đó cho Notification.
