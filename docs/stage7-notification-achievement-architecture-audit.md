# Stage 7.0 — Notification & Achievement Architecture Audit (No Implementation)

Ngày audit: 2026-07-18
Phạm vi: chỉ đọc source thật, không sửa code, không tạo migration, không refactor. Fix duy nhất khi phát hiện blocker nghiêm trọng ảnh hưởng toàn hệ thống (không có blocker dạng đó được phát hiện trong chặng này).

---

## 1. Executive Summary

Hệ thống hiện có một `NotificationsModule` thật (Prisma-backed, có BullMQ queue, có scheduler cron) nhưng **không có bất kỳ `AchievementModule`/`Achievement` model nào**. Thứ đang được gọi là "Achievement" trên frontend (`/vocabulary/achievements/*`) thực chất là 3 trang UI đọc từ 3 endpoint nằm trong `VocabularyController`, và toàn bộ dữ liệu — bao gồm cả trạng thái `claimed`/`unlocked` — được **tính toán lại (derive) mỗi lần gọi API** từ dữ liệu thật của nhiều module khác (Vocabulary, Listening, Writing, Grammar, Reading, Speaking, Missions, Pet, Arena, Placement), không hề được lưu trữ hay có logic mở khoá/nhận thưởng thật. Không có bảng `Achievement`, không có cột "unlocked at", không có reward claim ghi vào DB.

Notification thật hơn nhưng vẫn rất mỏng: chỉ 8 sự kiện tạo notification trong toàn bộ codebase (3 từ Community/comment-reaction-follow, 2 từ Community Club, 2 từ Missions-v2 + Leaderboard, 1 nhắc học hằng ngày/tuần), tất cả gọi trực tiếp `NotificationsService.create*()` đồng bộ — **không đi qua BullMQ queue** dù queue đã được đăng ký (chỉ scheduler dùng queue thật). Không có Notification Gateway/Socket.IO riêng — bell UI (`NotificationDrawer.tsx`) polling REST mỗi 30 giây. Riêng module Community có một kênh Socket.IO thật (`community:notification`) nhưng tách biệt hoàn toàn khỏi bảng `Notification`, và điểm xác thực (`handleConnection` trust `handshake.auth.userId` không verify) là một lỗ hổng bảo mật thật đang tồn tại (không thuộc phạm vi Stage 7 để sửa, chỉ ghi nhận).

Toàn hệ thống chỉ có **2 event thật** qua `EventEmitter2`: `learning.activity.completed` (9 module publish, 1 listener consume) và `settings.updated` (1 publisher, 1 listener). Không có event bus chung cho Mission/XP/Leaderboard/Pet/Achievement — mọi liên kết giữa các module này là **gọi service trực tiếp** (tight coupling), không phải qua event.

**Kết luận Stage 7: `READY_WITH_PREREQUISITES`.** Không có blocker kiến trúc chặn việc bắt đầu code Notification/Achievement, nhưng có 3 tiền đề nên xử lý trước hoặc song song với 7A: (1) quyết định event-bus hay tiếp tục gọi trực tiếp cho Achievement hook, (2) thêm index cho bảng `Notification` trước khi traffic tăng, (3) không tái sử dụng pattern xác thực socket không-verify của `CommunityGateway` cho Notification Realtime.

---

## 2. Existing Architecture (Kiến trúc & Dependency Map hiện tại)

### 2.1 Cơ chế liên kết module

Hệ thống dùng hai cơ chế song song, không thống nhất:

- **Event thật (`@nestjs/event-emitter`, loose coupling):** chỉ 2 event tồn tại toàn hệ thống — xem Section 5.
- **Gọi service trực tiếp (tight coupling):** đây là cơ chế chính cho Mission ↔ XP ↔ Leaderboard ↔ Notification ↔ Pet. Ví dụ: `listening.service.ts` gọi thẳng `missionV2ProgressService.increase()`; `mission-v2-reward.service.ts` và `leaderboard-reward.service.ts` gọi thẳng `NotificationsService.createFromPayload()`; `XpService.awardXp()` tự cập nhật leaderboard trong cùng transaction, không phát event nào cho "XP awarded".

Hệ quả: không có một điểm trung tâm nào để "gắn thêm" Achievement logic mà không sửa nhiều file rải rác. Đây là input quan trọng cho Part 12 (kế hoạch 7C).

### 2.2 Dependency map thực tế (theo source đã đọc)

```
Auth (JwtAuthGuard)
  └─ mọi Controller (Notifications, Vocabulary, Missions-v2, Leaderboard, Community...)

Learning modules (Vocabulary/Grammar/Reading/Writing/Speaking/Listening/Quizzes/Placement)
  └─ emitAsync('learning.activity.completed') → LearningXpListener → XpService.awardXp()
                                                                        └─ cập nhật User.xp/level, UserXpProfile,
                                                                           XpTransaction, LeaderboardSeason/Entry
                                                                           (tất cả trong 1 transaction, không emit event tiếp)

Listening.service → missionV2ProgressService.increase() (gọi thẳng, try/catch nuốt lỗi)
Missions-v2 (reward.service, progress.service) → NotificationsService.create*() (gọi thẳng)
Leaderboard (reward.service, weekly-close.service) → NotificationsService.create*() (gọi thẳng)
Community / Community-Club / Community-Social → NotificationsService.create*() (gọi thẳng)
                                                → CommunityGateway.emitNotification()/emitUser() (Socket.IO, chỉ 3 event: comment/reaction/follow)

Settings.settings-command.service → emit('settings.updated') → NotificationsSettingsListener
                                                               → NotificationScheduler.syncUserDailyReminder() (BullMQ repeatable job)

Vocabulary.service.getAchievementOverview() → đọc trực tiếp (Promise.all) từ:
  User, PetProfile, UserWordProgress, ListeningSession, QuizResult, WritingSubmission/Session,
  MissionV2 (Prisma model), PetReward, ArenaReward (nếu có), GrammarSession, ReadingSession,
  SpeakingSession, PlacementResult
  → không ghi ngược lại bất kỳ bảng nào — thuần derive-only, không phải Achievement engine thật.
```

Achievement/Notification **không nằm trong sơ đồ trên như một node độc lập có input rõ ràng** — Notification là "leaf" nhận lệnh tạo trực tiếp từ 5 module khác nhau; "Achievement" (Vocabulary) là một "sink" đọc dữ liệu chứ không phải một node có thể trigger gì cho module khác (không có Achievement → Notification, không có Achievement → Reward).

---

## 3. Notification Audit (Part 2 + Part 7 Realtime)

Đọc source thật tại `backend/src/modules/notifications/` (`.module.ts`, `.controller.ts`, `.service.ts`, `.processor.ts`, `.scheduler.ts`, `.constants.ts`, `.types.ts`, `settings-updated.listener.ts`).

| Hạng mục | Trạng thái | Ghi chú thật từ source |
|---|---|---|
| NotificationModule | EXISTING | `notifications.module.ts`, import `PrismaModule` + `BullModule.registerQueue`, export `NotificationsService` |
| NotificationService | EXISTING | CRUD đầy đủ: create, createFromPayload, createOncePerDay, findMyNotifications (phân trang), getUnreadCount, markAsRead, markAllAsRead, delete |
| NotificationGateway (Socket.IO riêng cho Notification) | MISSING | Không có file gateway nào trong `modules/notifications/`. Kênh socket `community:notification` tồn tại nhưng thuộc `CommunityGateway`, không liên quan bảng `Notification` |
| Queue (BullMQ) | PARTIAL | Queue `notifications` được đăng ký và có Processor xử lý đủ 4 job name, nhưng **chỉ `NotificationScheduler` (daily/weekly reminder) thực sự add job vào queue**; 8 lời gọi tạo notification còn lại (Mission/Leaderboard/Community/Club) gọi thẳng `NotificationsService.create*()`, bỏ qua queue hoàn toàn |
| Redis | EXISTING (gián tiếp) | Queue chạy trên BullMQ nên phụ thuộc Redis connection có sẵn của dự án; không có logic Redis riêng trong module Notifications |
| Socket.IO | MISSING (cho riêng Notification) | Xem NotificationGateway ở trên |
| Scheduler/Cron | EXISTING | `NotificationScheduler.onModuleInit()` add 2 repeatable job: `DAILY_REMINDERS` (`0 20 * * *`), `WEEKLY_GOALS` (`10 8 * * 1`); còn có `syncUserDailyReminder()` tạo job lặp lại theo giờ user chọn, tự xoá job cũ trước khi tạo mới (tránh trùng) |
| Prisma model | EXISTING | `model Notification { id, userId, title, message, isRead, createdAt }` — xem Section 6 để biết thiếu gì |
| Enum | PARTIAL | `NotificationType` chỉ là TypeScript union (`notifications.types.ts`), không phải Prisma enum — `type` không được lưu trong DB, mà được **suy luận lại (`inferType`) từ nội dung title/message bằng string matching** mỗi lần trả về. Rủi ro: đổi câu chữ thông báo có thể làm sai lệch phân loại |
| DTO | MISSING | Controller nhận tham số thô (`@Body('id') id: string`, `@Query('page') page?: string`), không có class-validator DTO nào cho Notifications |
| Controller | EXISTING | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/read`, `POST /notifications/read-all`, `DELETE /notifications/:id`, cộng 2 route legacy PATCH trùng chức năng |
| Guard | PARTIAL | Chỉ có `@UseGuards(JwtAuthGuard)` ở class-level — không có kiểm tra rate-limit, không có Guard riêng cho ownership ngoài việc mỗi query luôn `where: { userId }` (đây là điểm đúng, xem Section 8) |
| Read/Unread | EXISTING | `isRead` boolean, `markAsRead`, `markAllAsRead`, `getUnreadCount` đều hoạt động thật |
| Archive | MISSING | Không có trạng thái "archived" nào, chỉ có Read và Delete (xoá cứng) |
| Delete | EXISTING | `delete()` — xoá cứng khỏi DB (không phải soft-delete) |
| User Preference | PARTIAL | `UserSettings` có 8 field liên quan notification (`dailyReminderEnabled`, `dailyReminderTime`, `missionReminder`, `friendActivity`, `clubNotification`, `leaderboardNotification`, `aiFeedbackNotification`, `emailNotification`, `pushNotification`) nhưng **chỉ 3/8 field thực sự được đọc và enforce** trong code (`dailyReminderEnabled`, `pushNotification` trong `notifications.processor.ts`; `missionReminder` trong `createWeeklyGoalReminders`). Các field `friendActivity`, `clubNotification`, `leaderboardNotification`, `aiFeedbackNotification`, `emailNotification` được định nghĩa trong schema + DTO settings nhưng **không được đọc ở bất kỳ đâu khác** trong toàn bộ `backend/src` — tồn tại "cho có", không có tác dụng thật |
| Email | MISSING | Có field `emailNotification` trong settings nhưng không có `EmailService`/nodemailer/SES nào được gọi từ Notifications module |
| Push (thiết bị/OS-level) | MISSING | Có field `pushNotification` nhưng chỉ dùng để gate việc tạo notification **trong DB**, không có FCM/APNs/WebPush thật nào được gọi |
| In-app | EXISTING | Đây là kênh duy nhất hoạt động thật: REST + polling 30s |
| Deep Link | EXISTING (thô) | `href` được suy ra qua `inferHref()` theo type suy luận, hoặc lấy từ `message` bằng regex `href=(\S+)` nhúng trong text — cách lưu href trong message string là giải pháp tạm, dễ vỡ nếu message chứa `href=` tự nhiên |

**Part 7 — Realtime audit:**

- Không có Socket.IO/Redis Pub-Sub cho riêng domain Notification. `NotificationDrawer.tsx` (frontend) chỉ gọi REST `getNotifications()`/`getUnreadNotificationCount()`, polling mỗi 30s bằng `setInterval` + refetch khi `window focus`. Không có reconnect logic vì không có socket nào để reconnect.
- Kênh Socket.IO thật duy nhất liên quan "notification" là `community:notification` (`CommunityGateway`, namespace `/community`), phát cho 3 sự kiện: comment mới, reaction mới, follower mới. Đây là **luồng song song, tách biệt** khỏi bảng `Notification` — cùng một sự kiện (vd. comment mới) vừa emit socket vừa `createFromPayload()` ghi DB, hai luồng độc lập, không có cơ chế idempotency/ordering nối giữa chúng.
- `CommunityGateway.handleConnection()` lấy `userId` từ `client.handshake.auth?.userId` **không hề xác thực** (không so với JWT/cookie) rồi cho join room `user:${userId}` — bất kỳ client nào cũng có thể tự xưng là user khác để nhận thông báo/tin nhắn realtime của người đó. Đây là lỗ hổng bảo mật thật, đang tồn tại trong code hiện tại (không phải giả định) — xem Section 8.
- Ngược lại, `LeaderboardRealtimeGateway` (`namespace: /leaderboard`) xác thực đúng cách qua `LeaderboardCookieAuthService.authenticate()`, disconnect nếu không hợp lệ. Đây là ví dụ pattern đúng nên copy cho Notification Realtime tương lai (7B), không nên copy pattern của `CommunityGateway`.
- Không có "duplicate event" hay "offline queue" nào được xử lý ở tầng gateway hiện tại (server chỉ emit, không buffer khi client offline).

---

## 4. Achievement Audit (Part 3)

**Không có `AchievementModule` trong `backend/src/modules/`.** Grep toàn bộ backend cho từ khoá "achievement" (không phân biệt hoa/thường) chỉ trả về các hàm nằm trong `vocabulary.service.ts`:

- `getAchievementOverview(userId)` — tính toán trực tiếp (không cache, không lưu) từ 20+ query song song (`Promise.all`) trên: `User.xp/level`, `PetProfile`, `UserWordProgress`, `ListeningSession`, `QuizResult`, `WritingSubmission`, `MissionV2` (completed/claimed), `PetReward`, `GrammarSession`, `ReadingSession`, `SpeakingSession`, `PlacementResult`.
- `getAchievementDetail(userId, key)` — gọi lại `getAchievementOverview()` rồi `.find()` theo `key` trong mảng `recent` (không có bảng riêng cho từng thành tích, không có `id` cố định — `key` chỉ là chỉ mục tạm trong response).
- `getAchievementActivityDetail(...)` — gọi lại `getAchievementDetail()`.

Route thật (`vocabulary.controller.ts`): `GET /vocabulary/overview/achievements`, `GET /vocabulary/overview\achievements:key` (chú ý: path pattern dùng `\` thay vì `/`, xem Section 10 — đây là lỗi cú pháp route thật, đáng ngờ nhưng không thuộc phạm vi audit này để fix vì Vocabulary đã qua Stage 6, chỉ ghi nhận là input cho việc thiết kế route Achievement thật ở 7C phải làm đúng ngay từ đầu, không copy pattern này).

Chi tiết theo checklist yêu cầu:

- **Achievement definitions:** không tồn tại dưới dạng dữ liệu (không có bảng danh mục thành tích, không có seed data, không có config file liệt kê "10 thành tích khả dụng"). Danh sách "achievement" hiển thị là **lịch sử hoạt động gần đây** được format lại thành card, không phải danh mục cố định.
- **Progress tracking:** không có bảng lưu tiến độ theo từng achievement. `GoalItem.current`/`target` được tính lại mỗi lần gọi API từ dữ liệu nguồn (vd. streak, số bài hoàn thành tuần này).
- **Unlock logic:** không tồn tại. `unlocked` = so sánh trực tiếp `current >= required` tại thời điểm gọi API, không có sự kiện "unlock" nào được ghi nhận, không có timestamp "đã mở khoá lúc nào" đáng tin cậy ngoài field hiển thị `dateLabel` (định dạng "x phút/giờ/ngày trước" tính từ dữ liệu nguồn, vd. `completedAt` của activity liên quan — không phải thời điểm unlock achievement).
- **Reward (XP/Badge/Coins/Pet/Leaderboard):** trường `claimed` trong response **luôn được set bằng chính điều kiện unlock** (`claimed: unlocked` hoặc `claimed: current >= step.required`) — nghĩa là không có hành động "claim" thật nào tồn tại, không có endpoint POST claim, không có transaction cộng thưởng nào chạy khi user "claim" trên UI. Frontend hiển thị nút/badge "Đã nhận" nhưng đó chỉ là suy diễn từ dữ liệu đã có sẵn (vd. XP đã cộng từ trước qua `XpService.awardXp()` của module gốc — Achievement chỉ đang hiển thị lại, không tự thưởng thêm).
- **Repeatable vs one-time achievement:** không phân biệt được vì không có state lưu trữ; do dữ liệu được tính lại mỗi lần, mọi "achievement" về bản chất đều là repeatable (sẽ đổi kết quả nếu dữ liệu nguồn đổi), không có one-time achievement thật nào được "khoá cứng" sau khi đạt.

**Kết luận Part 3:** hệ thống Achievement thật **không tồn tại**. Cái đang gọi là "achievement" là một dashboard tổng hợp (aggregated learning stats feed) được đặt nhầm chỗ trong `VocabularyService`/`VocabularyController` dù nó tổng hợp dữ liệu của toàn bộ 8 module học tập khác — đây là một smell kiến trúc rõ ràng (cross-cutting feature bị nhốt trong 1 module con) cần được tách ra khi xây Achievement thật ở 7C/7D.

---

## 5. Event Audit (Part 1 + Part 5 Event Flow)

### 5.1 Bảng toàn bộ event thật trong hệ thống

Chỉ có đúng 2 event `EventEmitter2` tồn tại (grep `@OnEvent`/`eventEmitter.emit` toàn bộ `backend/src`, không có event thứ 3 nào):

| Module | Event | Publisher | Consumer | Dùng cho Notification | Dùng cho Achievement |
|---|---|---|---|---|---|
| Learning-XP | `learning.activity.completed` | `LearningXpPublisher.publish()`, gọi từ: Listening, Writing (processor), Reading, Grammar, Vocabulary, Speaking, Placement-result, Missions-v2 (reward.service), Quizzes (9 nơi gọi `publish`) | `LearningXpListener.handle()` (duy nhất) → `XpService.awardXp()` | KHÔNG — không consumer nào tạo Notification từ event này | KHÔNG — không có Achievement listener nào |
| Settings | `settings.updated` | `settings-command.service.ts` (khi user đổi settings) | `NotificationsSettingsListener.handle()` (duy nhất) → `NotificationScheduler.syncUserDailyReminder()` | CÓ (gián tiếp — chỉ đồng bộ lại lịch cron nhắc học, không tạo Notification ngay lập tức) | KHÔNG |

Tất cả các luồng còn lại (Mission progress, Mission claim, Leaderboard reward, Leaderboard weekly close, Community actions, Club actions) **không phát event nào** — chúng gọi thẳng method của `NotificationsService`/`missionV2ProgressService` như liệt kê ở Section 2.1. Do đó bảng Part 1 chỉ có 2 dòng thật; mọi "event" khác mà đề bài liệt kê làm ví dụ (Vocabulary, Grammar, Reading, Writing, Speaking, Listening, Placement, Community, Club, Leaderboard, Shop, Arena, Pet, User, Auth, Payment) **không tồn tại dưới dạng EventEmitter2 event** — chúng là lời gọi hàm trực tiếp, không phải publish/subscribe.

### 5.2 Event flow thật: Listening Complete → ... (ví dụ theo đề bài, dựng lại từ source thật)

```
ListeningService.finishSession()
  1. Ghi ListeningSession.status = COMPLETED, xpEarned, coinsEarned, rating (trực tiếp, cùng transaction)
  2. updateListeningMissions() → gọi thẳng missionV2ProgressService.increase() x5 lần
     (LISTEN_AUDIO, COMPLETE_LESSON, STUDY_LESSON, COMPLETE_QUIZ, STUDY_MINUTES)
     — bọc try/catch, lỗi bị NUỐT (không throw), chỉ trả về false
  3. learningXpPublisher.publish('learning.activity.completed', {activity: LISTENING_COMPLETED, ...})
     → LearningXpListener → XpService.awardXp()
        → cập nhật User.xp/level, UserXpProfile, XpTransaction, LeaderboardEntry/Season (1 transaction)
  4. KHÔNG có bước nào gọi NotificationsService (Listening không tạo thông báo "Hoàn thành Listening")
  5. KHÔNG có bước nào chạm tới Achievement (vì Achievement không phải engine, chỉ đọc lại dữ liệu
     ListeningSession/User khi user tự mở trang /vocabulary/achievements sau đó)
  6. KHÔNG có bước nào ghi PetReward (PetReward chỉ khoá theo lessonId, Listening không có lessonId)
```

**Flag theo yêu cầu đề bài:** luồng Listening (và tương tự Vocabulary/Grammar/Reading/Writing/Speaking/Quiz) đang **thiếu hoàn toàn bước Notification và bước Achievement thật** ở điểm hoàn thành bài học. So sánh với Mission-v2/Leaderboard — 2 module này ít nhất có gọi `NotificationsService` trực tiếp (dù đồng bộ, không qua queue) khi claim mission hoặc nhận thưởng leaderboard, còn 8 module học tập (Listening, Reading, Grammar, Writing, Speaking, Vocabulary, Quizzes, Placement) hoàn toàn im lặng phía Notification.

---

## 6. Prisma Audit (Part 4)

### 6.1 Model `Notification` (đọc thật từ `schema.prisma:565-575`)

```prisma
model Notification {
  id      String  @id @default(uuid())
  userId  String
  title   String
  message String
  isRead  Boolean @default(false)

  user User @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())
}
```

Vấn đề xác nhận thật (không đoán, đọc trực tiếp schema):

- **Không có `@@index` nào trên bảng này.** Trong khi `NotificationsService.findMyNotifications()` luôn `WHERE userId = ? [AND isRead = false] ORDER BY createdAt DESC` và `count()` cùng điều kiện — mọi truy vấn đều sẽ full-table-scan khi dữ liệu lớn.
- **Không có `onDelete: Cascade`** trên relation `user` — nếu xoá `User`, thao tác xoá sẽ thất bại (foreign key constraint) trừ khi có logic dọn dẹp Notification trước, điều này chưa thấy ở đâu trong `UsersService`/`AuthService` đã đọc qua các stage trước.
- **Không có cột `type` thật** (chỉ suy luận runtime từ text) — nghĩa là không thể filter theo type ở tầng SQL (vd. "chỉ lấy notification loại MISSION") mà phải load hết rồi lọc ở application layer, cực kỳ kém hiệu quả khi cần filter.
- **Không có cột `archivedAt`/soft-delete** — khớp với việc Archive = MISSING ở Section 3.
- **Không có unique constraint chống trùng** ngoài logic `createOncePerDay()` tự query `findFirst` rồi mới `create` (race condition tiềm ẩn nếu 2 job chạy đồng thời cho cùng user/ngày — tương tự dạng race condition mà Chặng 6D.4 từng phát hiện ở Listening trước khi có unique index).

**Khuyến nghị (chỉ đề xuất, không tạo migration):**
- Thêm `@@index([userId, createdAt])` và `@@index([userId, isRead])`.
- Cân nhắc thêm cột `type` (Prisma enum) thật thay vì suy luận từ text, để filter/index được và tránh sai lệch phân loại khi đổi câu chữ.
- Cân nhắc `onDelete: Cascade` cho relation `user` nếu nghiệp vụ cho phép xoá cứng Notification khi xoá User (cần xác nhận với nghiệp vụ, không tự quyết ở đây).
- Cân nhắc unique index `(userId, title, DATE(createdAt))` hoặc một `dedupeKey` cột riêng để `createOncePerDay` an toàn dưới concurrency thật, thay vì find-then-create.

### 6.2 Model `Achievement`

**Không tồn tại.** Không có model nào tên chứa "Achievement" trong `schema.prisma` (grep xác nhận, chỉ có field `showAchievements Boolean` trong `UserSettings` — một cờ bật/tắt hiển thị, không phải dữ liệu achievement). Việc xây Achievement thật (7C) sẽ cần thiết kế từ đầu: tối thiểu cần `AchievementDefinition` (danh mục, điều kiện, phần thưởng), `UserAchievementProgress` (tiến độ hiện tại theo user+achievement), và `UserAchievementUnlock` (thời điểm mở khoá, đã claim hay chưa) — đây là đề xuất kiến trúc cho Part 12, không phải migration được tạo trong chặng này.

---

## 7. Frontend Audit (Part 6 + Part 10 UX)

### 7.1 Notification (đọc thật `NotificationDrawer.tsx`, `notifications-api.ts`)

| Hạng mục | Trạng thái |
|---|---|
| Bell / Badge unread count | EXISTING (qua `AppHeader.tsx`, dùng `onUnreadChange` callback từ Drawer) |
| Dropdown/Drawer | EXISTING (`NotificationDrawer.tsx`, slide-in panel, không phải dropdown nhỏ mà là full drawer bên phải) |
| Notification Center (trang riêng `/notifications`) | EXISTING (route có trong danh sách build Stage 6D.4, link "Xem tất cả" trỏ tới đây) |
| Infinite Scroll | MISSING — Drawer chỉ lấy `limit: 8`, không có scroll-load-more; chưa xác nhận trang `/notifications` riêng có phân trang thật hay không (chưa đọc file trang đó trong chặng này — flag để xác nhận thêm nếu 7B cần) |
| Filter (theo type) | MISSING trên Drawer (chỉ có filter `unreadOnly` ở API, chưa thấy UI filter theo type trong Drawer) |
| Read | EXISTING |
| Mark All Read | EXISTING |
| Archive | MISSING (khớp Section 3/6) |
| Delete | EXISTING |
| Empty state | EXISTING (thông báo "Chưa có thông báo" có icon) |
| Loading state | EXISTING (`Loader2` spinner) |
| Error state | EXISTING (thô — chỉ 1 dòng text "Chưa tải được thông báo.") |
| Mobile | EXISTING (full-width trên mobile, overlay backdrop riêng cho mobile) |
| Desktop | EXISTING (max-width drawer bên phải) |
| Realtime update (socket) | MISSING — chỉ polling 30s + refetch on focus, không subscribe socket nào |

### 7.2 Achievement (đọc thật 3 file trong `Components/Vocabulary/achievements/`)

| Hạng mục | Trạng thái |
|---|---|
| Achievement Page (Overview) | EXISTING — `AchievementOverviewPage.tsx`, có tabs, summary card (totalAchievements, xpEarned, completedChallenges, longestStreak), danh sách "recent", danh sách "goals" |
| Progress | EXISTING (hiển thị `current`/`target`/`progressPercent` cho từng goal) |
| Locked/Unlocked | EXISTING (field `locked`/`unlocked` hiển thị icon khoá khác nhau) |
| Celebration/Unlock animation | MISSING (không thấy animation/confetti/toast khi đạt goal mới — chỉ là màn hình tĩnh khi load lại trang) |
| Detail page | EXISTING — `AchievementDetailPage.tsx` + `AchievementActivityDetailPage.tsx`, có `rewards` list với trạng thái `claimed`/`locked` |
| Reward Claim (hành động thật) | MISSING — như Section 4 đã xác nhận, `claimed` chỉ là kết quả so sánh, không có nút bấm nào gọi API "claim" thật |
| History | PARTIAL — `AchievementActivityDetailPage` hiển thị lịch sử hoạt động liên quan, nhưng đây là lịch sử của hoạt động gốc (vd. lịch sử làm bài Listening), không phải lịch sử "đã đạt achievement nào lúc nào" |

**Part 10 UX audit (đề xuất, không code):** nếu xây Achievement thật ở 7D, nên tách hẳn khỏi namespace `Vocabulary` (route hiện tại `/vocabulary/achievements/*` gây hiểu lầm đây là tính năng riêng của Vocabulary trong khi dữ liệu cross-module), cần thêm unlock celebration/toast, cần trang riêng không phụ thuộc `VocabularyController`. Notification nên bổ sung filter theo type trên Drawer, infinite scroll ở trang `/notifications`, và cân nhắc realtime toast khi có thông báo mới (dựa trên hạ tầng gateway đã có sẵn pattern đúng ở `LeaderboardRealtimeGateway`).

---

## 8. Security Audit (Part 9)

- **Ownership của Notification: AN TOÀN.** Mọi query trong `NotificationsService` đều có `where: { userId }` hoặc `findFirst({ where: { id, userId } })` trước khi update/delete — User A không thể đọc/sửa/xoá notification của User B qua API hiện tại (đã đọc toàn bộ service, xác nhận không có đường vòng).
- **Lỗ hổng thật (đã xác nhận bằng source, không phải giả định):** `CommunityGateway.handleConnection()` (`backend/src/modules/community/gateway/community.gateway.ts:22-25`) lấy `userId` từ `client.handshake.auth?.userId` do client tự gửi lên, **không đối chiếu với JWT/session/cookie nào**, rồi `client.join(\`user:${userId}\`)`. Bất kỳ ai kết nối socket `/community` và tự khai `userId` của người khác đều join được room riêng của người đó, nhận toàn bộ sự kiện `community:notification`, `community:friend-request`, tin nhắn club, v.v. dành cho người đó. Đây là lỗ hổng đọc trộm dữ liệu realtime thật, đang tồn tại trong production code hiện nay. So sánh: `LeaderboardRealtimeGateway` xác thực đúng qua cookie (`LeaderboardCookieAuthService`) — chứng tỏ codebase đã có pattern đúng, chỉ là `CommunityGateway` không áp dụng.
  - **Quyết định phạm vi:** đây là lỗi có thật nhưng nằm trong module Community (đã qua các stage trước, không phải Notification/Achievement), và không chặn việc audit/lên kế hoạch Stage 7 — nên được ghi nhận là Known Issue nghiêm trọng cần một chặng sửa lỗi bảo mật riêng cho Community, đồng thời là **quy tắc bắt buộc** cho 7B: Notification Realtime Gateway phải xác thực theo cookie như Leaderboard, tuyệt đối không copy pattern của Community.
- **Achievement "unlock giả":** vì không có bảng Achievement/trạng thái lưu trữ, hiện tại không có API "claim" nào để giả mạo — rủi ro "unlock qua fake API call" hiện là 0% vì chưa có gì để giả mạo. Đây là điểm cần thiết kế đúng ngay từ 7C: khi có bảng thật, endpoint claim phải server-side re-validate điều kiện (không tin dữ liệu client gửi lên) và có transaction/idempotency giống `XpService.awardXp()` đã làm tốt (idempotencyKey pattern).
- **Admin API:** không tìm thấy endpoint admin nào cho Notification hay Achievement trong chặng này (chưa có tính năng để có admin API).
- **Rate limit:** không có `ThrottlerModule` toàn cục, chỉ 1 controller khác (`chat-session`) có nhắc tới rate limit riêng. Notification endpoints (`read`, `read-all`, `delete`) hiện không bị giới hạn tần suất — rủi ro thấp (chỉ tự thao tác trên dữ liệu của chính mình) nhưng nên cân nhắc chung khi làm 7A.
- **Validation/Mass assignment:** Controller không dùng DTO/class-validator (Section 3) — `@Body('id') id: string` nhận thẳng string không validate UUID format; không phải lỗi bảo mật nghiêm trọng (vì luôn kèm `where: { userId }`) nhưng là nợ kỹ thuật nên dọn khi làm 7A.

---

## 9. Performance Audit (Part 8)

- **N+1 / Missing index:** `Notification` không có index (Section 6) — `findMyNotifications` chạy 3 query song song (`findMany`, `count`, `count`) mỗi lần mở Drawer, nhân với polling 30 giây/user, ở quy mô lớn sẽ là tải đáng kể cho Postgres nếu không có index.
- **Pagination:** đã có `page`/`limit` (offset-based) trong `findMyNotifications`, giới hạn `limit` tối đa 50 — hợp lý cho quy mô hiện tại, nhưng offset-based sẽ chậm dần khi 1 user có hàng chục nghìn notification (không có ở quy mô hiện tại nhưng đáng ghi nhận cho tương lai xa).
- **Cursor-based pagination:** MISSING (đang dùng offset).
- **Batch update:** `markAllAsRead` dùng `updateMany` (tốt, 1 câu SQL). `createDailyReminders`/`createWeeklyGoalReminders` dùng vòng `for` gọi `createOncePerDay` tuần tự cho tối đa 500 user/lần — với `take: 500` nghĩa là có giới hạn cứng, nhưng nếu số user ACTIVE > 500 thì **các user còn lại sẽ không nhận được nhắc học ngày hôm đó** (không có phân trang/batch tiếp theo trong cùng lần chạy cron) — đây là một bug thật đáng ghi nhận (Technical Debt, Section 10), không phải performance thuần tuý mà là đúng/sai chức năng ở quy mô lớn.
- **Achievement (Vocabulary):** `getAchievementOverview` chạy ~20 query song song mỗi lần user mở trang — không cache, không có TTL. Ở quy mô nhỏ ổn, nhưng đây chính là lý do một Achievement engine thật (bảng lưu trạng thái, cập nhật khi có sự kiện thay vì tính lại toàn bộ) sẽ hiệu quả hơn nhiều về lâu dài.
- **Redis/Queue:** BullMQ cho Notification hiện chỉ chịu tải nhẹ (2 cron job + job daily reminder theo user) — chưa phải điểm nghẽn, nhưng nếu 7A chuyển toàn bộ 8 điểm gọi trực tiếp sang enqueue qua queue (khuyến nghị ở Section 13), cần theo dõi throughput queue khi scale.

---

## 10. Technical Debt

1. Notification tạo trực tiếp (đồng bộ, in-request) thay vì qua queue ở 8/9 điểm gọi — không tận dụng hạ tầng BullMQ đã có sẵn, rủi ro làm chậm request chính (vd. claim mission phải đợi ghi Notification xong mới trả response) và không có retry nếu ghi Notification lỗi.
2. `NotificationType` không phải cột DB thật mà suy luận runtime từ text — dễ vỡ, khó filter/index.
3. `href` được nhúng trong chuỗi `message` bằng quy ước `\n\nhref=...` rồi regex lấy lại — giải pháp tạm, dễ xung đột nếu nội dung thông báo tự nhiên chứa chuỗi "href=".
4. 5/8 field preference notification trong `UserSettings` (`friendActivity`, `clubNotification`, `leaderboardNotification`, `aiFeedbackNotification`, `emailNotification`) tồn tại trong schema/DTO nhưng không được code nào đọc — hoặc là tính năng dở dang, hoặc là dead schema cần dọn.
5. `createDailyReminders`/`createWeeklyGoalReminders` giới hạn cứng `take: 500`, không loop tiếp cho phần còn lại — bug chức năng tiềm ẩn ở quy mô > 500 user active.
6. Route Vocabulary achievement dùng `\` thay vì `/` trong path pattern NestJS (`'overview\achievements:key'`) — cần xác nhận đây có phải lỗi gõ nhầm gây route không hoạt động như kỳ vọng hay không (không xác minh runtime trong chặng này vì ngoài phạm vi Listening/Notification, chỉ ghi nhận).
7. "Achievement" hiện là derived-only feature nằm sai vị trí (trong Vocabulary module) dù tổng hợp dữ liệu toàn hệ thống — cần tách module khi làm 7C/7D.
8. Không có DTO/class-validator cho Notifications Controller.
9. `CommunityGateway` xác thực socket không an toàn (Section 8) — nợ kỹ thuật/bảo mật nghiêm trọng nhất tìm thấy trong chặng này, nhưng ngoài phạm vi Notification/Achievement để fix ngay.

---

## 11. Risks

- **Rủi ro kiến trúc:** thêm Achievement thật vào hệ thống hiện tại nghĩa là phải "chèn" hook vào ít nhất 9 module học tập + Mission + Leaderboard (vì không có event bus chung) — nguy cơ rải logic Achievement khắp nơi giống như Notification hiện tại đang bị, trừ khi 7C giới thiệu một cơ chế event tập trung hơn (khuyến nghị ở Part 12/Section 14).
- **Rủi ro dữ liệu:** nếu Achievement thật được thêm nhưng không migrate/khởi tạo dữ liệu tương thích với "achievement ảo" hiện tại (derived từ Vocabulary), user có thể thấy tiến độ "biến mất" hoặc reset khi chuyển từ derived sang persisted — cần kế hoạch di trú dữ liệu hiển thị, không chỉ migration schema.
- **Rủi ro bảo mật đã biết:** lỗ hổng `CommunityGateway` (Section 8) tồn tại độc lập với Stage 7 nhưng nếu 7B tái sử dụng sai gateway/pattern này cho Notification Realtime, lỗ hổng sẽ lan sang cả Notification.
- **Rủi ro vận hành:** giới hạn `take: 500` trong cron reminder (Section 9) có thể đang âm thầm bỏ sót user thật ngay bây giờ nếu số user ACTIVE đã vượt 500 — nên xác minh số liệu thật trước khi coi đây là rủi ro "tương lai".

---

## 12. Missing Features

- Notification: Archive, Email delivery, Push delivery (thiết bị), Realtime/Socket, Filter theo type ở UI, Infinite scroll, DTO validation, Notification riêng cho 8 module học tập khi hoàn thành bài (hiện tại chỉ Mission/Leaderboard/Community mới tạo notification).
- Achievement: toàn bộ hệ thống (definitions, progress table thật, unlock event, claim endpoint thật, badge/tier, repeatable vs one-time, celebration UI, trang độc lập ngoài Vocabulary).
- Không có cơ chế event bus chung để Notification/Achievement subscribe một cách lỏng lẻo (loose-coupled) thay vì bị gọi cứng từ từng module.

---

## 13. Production Recommendations

- Chuyển toàn bộ điểm tạo Notification hiện đang gọi đồng bộ (`mission-v2-reward`, `mission-v2-progress`, `leaderboard-reward`, `leaderboard-weekly-close`, `community-club-permission`, `community-social`, `community.processor`) sang enqueue qua `NOTIFICATIONS_QUEUE` (hạ tầng đã sẵn có, chỉ chưa được dùng đúng) để tách khỏi request chính và có retry.
- Thêm index `@@index([userId, createdAt])`, `@@index([userId, isRead])` cho `Notification` trước khi traffic tăng (đề xuất, chưa tạo migration theo đúng quy tắc chặng này).
- Thiết kế Achievement như một module độc lập mới (`AchievementModule`) với bảng `AchievementDefinition` + `UserAchievementProgress` + `UserAchievementUnlock`, cập nhật qua một event tập trung (cân nhắc mở rộng `learning.activity.completed` thành named events theo domain, hoặc thêm 1 event `mission.claimed`/`leaderboard.reward.granted` mới) thay vì đọc lại toàn bộ dữ liệu mỗi lần như hiện tại.
- Khi làm Notification Realtime (7B), bắt buộc dùng pattern xác thực cookie giống `LeaderboardCookieAuthService`, không dùng pattern `CommunityGateway`.
- Đề xuất một chặng riêng (ngoài Stage 7) để rà soát và vá lỗ hổng xác thực của `CommunityGateway`, vì đây là lỗ hổng thật đang ảnh hưởng dữ liệu realtime của Community ngay cả khi không làm gì thêm cho Stage 7.
- Dọn 5 field preference notification không dùng trong `UserSettings`, hoặc triển khai thật cho chúng khi làm 7A (quyết định nghiệp vụ, không tự chọn thay ở đây).

---

## 14. Stage 7 Implementation Plan (7A–7E)

### 7A — Notification Backend Core
- **Scope:** DTO + validation cho Controller hiện có; chuyển 8 điểm gọi trực tiếp sang enqueue qua `NOTIFICATIONS_QUEUE`; thêm cột `type` thật (Prisma enum) thay suy luận runtime; thêm index; quyết định giữ/bỏ 5 field preference chưa dùng; sửa giới hạn cứng `take: 500` trong reminder cron.
- **Files bị ảnh hưởng:** `notifications.service.ts`, `.controller.ts`, `.types.ts`, `.processor.ts`, `.scheduler.ts`, schema.prisma (`Notification` model), 7 file đang gọi trực tiếp (`mission-v2-reward.service.ts`, `mission-v2-progress.service.ts`, `leaderboard-reward.service.ts`, `leaderboard-weekly-close.service.ts`, `community-club-permission.service.ts`, `community-social.service.ts`, `community.processor.ts`).
- **Migration:** CÓ (thêm cột `type` enum + index; đây là migration cho Stage 7 thật khi được triển khai, không phải trong chặng audit này).
- **Queue:** CÓ (đã có sẵn hạ tầng, mở rộng cách dùng).
- **WebSocket:** KHÔNG (thuộc 7B).
- **Tests:** cần test cho queue producer/consumer mới, test regression cho 7 file service bị sửa cách gọi Notification.
- **Risk:** TRUNG BÌNH — sửa 7 file khác nhau, rủi ro regression rải rác nếu không test kỹ từng luồng (Mission claim, Leaderboard reward, Community actions).

### 7B — Notification Realtime + Frontend
- **Scope:** `NotificationGateway` mới (namespace riêng, xác thực cookie như Leaderboard — KHÔNG như Community), emit khi có Notification mới thay vì chỉ polling; frontend: subscribe socket trong `NotificationDrawer`, thêm filter theo type, infinite scroll cho trang `/notifications`, toast realtime.
- **Files:** file gateway mới trong `modules/notifications/`, `NotificationDrawer.tsx`, `notifications-api.ts`, trang `/notifications`.
- **Migration:** KHÔNG.
- **Queue:** không thêm mới, dùng lại queue của 7A.
- **WebSocket:** CÓ (mới).
- **Tests:** test kết nối/xác thực gateway, test reconnect, test không rò rỉ dữ liệu giữa các user (regression test riêng cho lỗ hổng dạng Community).
- **Risk:** TRUNG BÌNH-CAO nếu không cẩn thận lặp lại lỗi xác thực của Community — đây là điểm phải review kỹ nhất trong 7B.

### 7C — Achievement Backend Core
- **Scope:** thiết kế mới hoàn toàn — `AchievementModule`, bảng `AchievementDefinition`/`UserAchievementProgress`/`UserAchievementUnlock`, logic cập nhật tiến độ khi có hoạt động liên quan (hook vào các điểm hiện đang publish `learning.activity.completed` + các điểm gọi trực tiếp Mission/Leaderboard), endpoint claim thật với server-side validate + idempotency (theo mẫu `XpService.awardXp()` đã làm tốt).
- **Files:** module mới hoàn toàn; có thể cần sửa nhẹ 9 module học tập để thêm hook (hoặc thêm 1 listener mới subscribe `learning.activity.completed` thay vì sửa từng module — khuyến nghị cách này để giảm rủi ro regression, vì event đã publish sẵn đủ dữ liệu `activity`/`userId`/`sourceId`/`score`).
- **Migration:** CÓ (3 bảng mới).
- **Queue:** cân nhắc dùng queue để tính progress bất đồng bộ, tránh chặn request chính.
- **WebSocket:** không bắt buộc ở 7C (thuộc 7D nếu cần celebration realtime).
- **Tests:** unit test cho logic unlock/claim, test idempotency (không cộng thưởng 2 lần), test không thể claim khi chưa đủ điều kiện (kể cả khi client gửi request trực tiếp).
- **Risk:** CAO NHẤT trong 5 giai đoạn — đây là tính năng hoàn toàn mới, không có gì để tái sử dụng ngoài pattern idempotency của XP.

### 7D — Achievement Frontend
- **Scope:** tách UI Achievement ra khỏi namespace Vocabulary, route riêng (vd. `/achievements`), gọi API module Achievement mới (7C) thay vì `vocabulary.service.getAchievementOverview`, thêm celebration/unlock animation, nút claim thật gọi API thật.
- **Files:** thư mục mới thay thế `Components/Vocabulary/achievements/*`; cần giữ tương thích ngược tạm thời (redirect route cũ) nếu người dùng đã bookmark `/vocabulary/achievements`.
- **Migration:** KHÔNG.
- **Queue/WebSocket:** dùng lại nếu 7C/7B đã có.
- **Tests:** test hiển thị đúng theo dữ liệu thật từ bảng mới, test luồng claim end-to-end.
- **Risk:** TRUNG BÌNH — chủ yếu là công sức di chuyển UI + đảm bảo không phá route cũ.

### 7E — Integration + Regression
- **Scope:** chạy lại toàn bộ luồng học tập (Vocabulary/Grammar/Reading/Writing/Speaking/Listening/Quiz/Placement/Mission/Leaderboard) để xác nhận: Notification vẫn được tạo đúng qua queue mới (7A), Achievement progress cập nhật đúng theo hoạt động thật (7C), không có double-reward, không có regression trên các stage đã đóng (đặc biệt Listening — Stage 7 Gate hiện đang OPEN dựa trên trạng thái Listening READY).
- **Files:** không sửa code mới, chủ yếu test/verification script tương tự các chặng 6D đã làm (backend build, test suite, frontend build, prisma migrate status).
- **Migration:** KHÔNG (chỉ verify migration của 7A/7C đã áp dụng đúng).
- **Tests:** full regression suite + test riêng cho double-reward giữa XP/Mission/Achievement.
- **Risk:** THẤP nếu 7A-7D làm đúng theo scope, nhưng là bước bắt buộc không được bỏ qua trước khi coi Stage 7 hoàn tất.

### Kết luận

**Stage 7 Status: `READY_WITH_PREREQUISITES`**

Không có blocker kiến trúc nào ngăn việc bắt đầu triển khai. Ba tiền đề nên thống nhất trước khi code 7A:
1. Quyết định cách Achievement (7C) nhận tín hiệu từ 9 module học tập — mở rộng qua `learning.activity.completed` listener mới (khuyến nghị, ít rủi ro regression nhất) hay sửa trực tiếp từng module.
2. Thêm index cho `Notification` và quyết định số phận 5 field preference chưa dùng trong `UserSettings`, trước khi 7A chuyển sang dùng queue rộng rãi hơn.
3. Thống nhất KHÔNG dùng pattern xác thực của `CommunityGateway` cho bất kỳ gateway Notification/Achievement mới nào ở 7B/7D; và lên lịch một chặng riêng (ngoài Stage 7) để vá lỗ hổng đó trong Community.
