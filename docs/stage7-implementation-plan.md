# Stage 7.1 — Implementation Plan (Migration / API / Test / Breakdown / Gate)

Trạng thái: kế hoạch kiến trúc. **Không migration nào được tạo trong tài liệu này.** Không code Stage 7A trong lượt này.
Căn cứ: `docs/stage7-notification-achievement-architecture-audit.md` (Stage 7.0), `docs/stage7-prerequisites-resolution.md`, `docs/stage7-architecture-decisions.md` (10 ADR, Stage 7.1).

---

## 1. Migration Plan (dự kiến, chưa tạo)

### 1.1 Notification

| # | Bảng/cột | Unique/Index | Nullable/Default | Backfill | Risk | Rollback |
|---|---|---|---|---|---|---|
| N1 | `Notification.type` (Prisma enum `NotificationType` mới, thay cho suy luận runtime) | không | Nullable ban đầu, không default cứng (cần backfill trước khi bắt buộc NOT NULL) | Chạy script backfill dùng lại chính logic `inferType()` hiện có (đọc title/message cũ) để gán `type` cho các row đã tồn tại, sau đó mới đổi cột thành NOT NULL ở migration kế tiếp | Backfill sai nếu logic suy luận cũ vốn đã không hoàn hảo (đã ghi nhận ở Stage 7.0 — suy luận theo string matching có thể sai) — chấp nhận vì đây là cải thiện so với hiện trạng, không phải làm xấu đi | Rollback = xoá cột `type`, quay lại suy luận runtime như cũ (không mất dữ liệu vì title/message giữ nguyên) |
| N2 | `Notification.deduplicationKey` | `@@unique` | Nullable cho row cũ (không backfill retroactive vì không tái tạo được key chính xác cho lịch sử), bắt buộc có giá trị cho mọi row mới do code tầng ứng dụng đảm bảo | Không backfill dữ liệu cũ | Nếu để nullable vĩnh viễn, cần đảm bảo unique index của Postgres cho phép nhiều NULL cùng lúc (mặc định Postgres cho phép — cần xác nhận Prisma migrate ra đúng `UNIQUE NULLS NOT DISTINCT` hay hành vi mặc định trước khi áp dụng) | Rollback = xoá cột và unique index, quay lại find-then-create như hiện tại |
| N3 | `Notification.entityType`, `Notification.entityId` | `@@index([entityType, entityId])` (tuỳ chọn, phục vụ tra cứu "notification nào liên quan bản ghi X") | Nullable | Không backfill (dữ liệu cũ không có entity gốc tách bạch, giữ nguyên nullable) | Thấp | Xoá cột |
| N4 | `Notification.priority` (enum `NotificationPriority` default `NORMAL`) | không | Default `NORMAL` | Toàn bộ row cũ tự nhận `NORMAL` qua default, không cần script | Thấp | Xoá cột |
| N5 | `Notification.expiresAt` | không | Nullable | Không backfill | Thấp | Xoá cột |
| N6 | `@@index([userId, createdAt])` | index | — | — | Thấp, chỉ thêm index, không đổi dữ liệu | Xoá index |
| N7 | `@@index([userId, isRead])` | index | — | — | Thấp | Xoá index |
| N8 | Bảng mới `NotificationFailedEvent` (audit log cho BullMQ job fail — xem ADR-001 Phần B.2) | `id`, `eventType`, `payload (Json)`, `error (String)`, `failedAt`, `attempts` | Bảng mới hoàn toàn | Không áp dụng (bảng rỗng ban đầu) | Thấp | Xoá bảng |

### 1.2 Achievement (3 bảng mới, theo ADR-005)

| # | Bảng/cột | Unique/Index | Nullable/Default | Backfill | Risk | Rollback |
|---|---|---|---|---|---|---|
| A1 | `AchievementDefinition` — `id, code (unique), name, description, category, icon, rarity, criteriaType, criteriaConfig (Json), target, rewardConfig (Json), isActive (default true), isSecret (default false), repeatability (enum ONE_TIME/REPEATABLE, default ONE_TIME), version (default 1)` | `@@unique([code])` | Không áp dụng (bảng mới, seed data thủ công khi triển khai 7C) | Không áp dụng | Thấp — bảng độc lập, không đụng dữ liệu hiện có | Xoá bảng |
| A2 | `UserAchievementProgress` — `id, userId, achievementId, currentValue (default 0), targetValue, status (enum NOT_STARTED/IN_PROGRESS/COMPLETED, default NOT_STARTED), startedAt (nullable), updatedAt, unlockedAt (nullable), claimedAt (nullable), progressVersion (default 1)` | `@@unique([userId, achievementId])` | `currentValue` default 0 | Không áp dụng | Trung bình — cần đảm bảo `@@unique([userId, achievementId])` không xung đột nếu có concurrent event tăng progress cùng lúc; xử lý bằng `upsert` thay vì `create` riêng | Xoá bảng |
| A3 | `AchievementUnlock` (ledger bất biến) — `id, userId, achievementId, unlockSequence (int, tăng dần theo achievement lặp lại được), unlockedAt, rewardStatus (enum PENDING/GRANTED/CLAIMED/FAILED), rewardTransactionId (nullable, trỏ tới XpTransaction hoặc bảng reward tương ứng), idempotencyKey (unique)` | `@@unique([idempotencyKey])`, `@@index([userId, achievementId])` | `rewardStatus` default `PENDING` | Không áp dụng | Trung bình — đây là bảng quan trọng nhất cho việc chống double-reward, cần review kỹ index/unique trước khi apply thật | Xoá bảng (chấp nhận mất ledger nếu rollback — chỉ nên rollback khi chưa có dữ liệu thật) |
| A4 | `UserSettings` — không thêm cột mới cho Achievement trong Stage 7 (preference achievement, nếu cần, để giai đoạn sau) | — | — | — | — | — |

### 1.3 UserSettings (liên quan Prerequisite 2, không phải bảng mới — chỉ dùng lại field đã có)

Không cần migration mới cho 8 preference đã tồn tại — chỉ cần code (7A) đọc đủ 8 field thay vì 3. Migration duy nhất liên quan `UserSettings` trong phạm vi Stage 7 là KHÔNG CÓ (giữ nguyên schema, chỉ thay đổi cách sử dụng).

---

## 2. API Contract Plan

### 2.1 Notification (mở rộng từ endpoint hiện có, không phá vỡ contract cũ)

```
GET    /notifications                  (đã có — giữ nguyên contract, bổ sung filter ?type= nếu cột type được thêm)
GET    /notifications/unread-count     (đã có — giữ nguyên)
PATCH  /notifications/:id/read         (route mới, thay thế dần POST /notifications/read — giữ cả 2 trong giai đoạn chuyển tiếp)
PATCH  /notifications/read-all         (route mới, thay thế dần POST /notifications/read-all)
PATCH  /notifications/:id/archive      (MỚI — cần cột archivedAt, hiện chưa có trong migration plan Section 1;
                                         nếu 7A quyết định làm Archive, bổ sung cột archivedAt (nullable) vào migration N-series)
DELETE /notifications/:id              (đã có — giữ nguyên, xoá cứng)
GET    /notification-preferences       (MỚI — đọc 8 field preference từ UserSettings, scoped theo user đăng nhập)
PATCH  /notification-preferences       (MỚI — cập nhật, tái sử dụng settings-command.service.ts hiện có nếu hợp lý thay vì tạo service riêng)
```

Ghi chú: 2 route legacy PATCH hiện tại (`markAsReadLegacy`, `markAllAsReadLegacy`) đã tồn tại trùng chức năng với POST — 7A giữ nguyên cả 2 kiểu (POST cũ + PATCH mới) để không phá frontend đang gọi POST, dọn dẹp về sau khi frontend đã chuyển hẳn sang PATCH.

### 2.2 Achievement (toàn bộ mới)

```
GET  /achievements                 (danh mục công khai — không lộ achievement isSecret=true chưa unlock)
GET  /achievements/:code           (chi tiết 1 achievement — cùng quy tắc ẩn secret)
GET  /achievements/me              (toàn bộ progress của user hiện tại — scoped theo JWT, không nhận userId từ query)
GET  /achievements/me/unlocked     (danh sách đã unlock, đọc từ AchievementUnlock)
GET  /achievements/me/progress     (tiến độ đang chạy, đọc từ UserAchievementProgress)
POST /achievements/:code/claim     (CHỈ giữ nếu achievement đó có rewardConfig.claimRequired=true theo ADR-007;
                                     nếu achievement không yêu cầu claim, endpoint trả 400 "not claimable" thay vì cho phép no-op thành công)
```

**Ràng buộc bắt buộc mọi endpoint (cả Notification lẫn Achievement):** scope theo `req.user.id` lấy từ `JwtAuthGuard`, không nhận `userId` dưới bất kỳ hình thức nào từ body/query/param của client (đúng nguyên tắc đã áp dụng đúng trong `NotificationsService` hiện tại — Section 8 của report Stage 7.0 xác nhận đây là điểm đã làm đúng, cần giữ nguyên tinh thần đó cho Achievement).

---

## 3. Test Strategy (Test Matrix)

### 3.1 Notification

| Nhóm | Test case |
|---|---|
| Ownership/security | User A không đọc/sửa/xoá được notification của User B qua bất kỳ endpoint nào (kể cả khi đoán đúng `id`) |
| Preference filtering | Mỗi 1 trong 8 preference, khi tắt, chặn đúng loại notification tương ứng; khi bật, không chặn nhầm loại khác |
| Idempotency | Publish cùng domain event 2 lần (cùng `deduplicationKey`) chỉ tạo 1 Notification |
| BullMQ retry | Job fail lần 1 (giả lập lỗi DB tạm thời) → retry thành công lần 2, không tạo trùng |
| Duplicate event | 2 event khác `eventId` nhưng cùng `deduplicationKey` (giả lập publisher gọi 2 lần) → chỉ 1 bản ghi |
| Unread count | Đếm đúng sau khi tạo/đọc/đọc-tất-cả/xoá |
| Read/Read-all | Cả 2 route cũ (POST) và mới (PATCH) đều hoạt động đúng trong giai đoạn chuyển tiếp |
| Pagination | `page`/`limit` trả đúng, `hasMore` đúng ở biên (trang cuối, `limit` vượt quá `total`) |
| Gateway authentication | Không có cookie → disconnect; cookie hết hạn → disconnect; cookie hợp lệ → join đúng room `user:{verifiedId}`, không thể tự khai `userId` khác |
| Reconnect sync | Client disconnect rồi reconnect → tự động gọi lại `unread-count`, không dựa vào giả định "đã nhận hết trong lúc offline" |
| Scheduler | `syncUserDailyReminder` không tạo job trùng khi settings đổi nhiều lần liên tiếp trong thời gian ngắn |
| Expiry/cleanup | Notification có `expiresAt` trong quá khứ không hiển thị trong `findMyNotifications` (nếu tính năng expiry được triển khai ở 7A), job `notification.cleanup` xoá đúng phạm vi, không xoá nhầm notification chưa hết hạn |

### 3.2 Achievement

| Nhóm | Test case |
|---|---|
| Progress | `currentValue` tăng đúng theo domain event khớp `criteriaConfig` |
| Threshold | Đạt đúng `targetValue` → chuyển `status` sang `COMPLETED`, ghi `unlockedAt` |
| Duplicate events | Cùng 1 domain event (cùng `entityId`) xử lý 2 lần không tăng `currentValue` 2 lần (idempotent theo `entityId` đã xử lý) |
| Concurrent unlock | 2 event đến gần như đồng thời cho cùng user/achievement — chỉ 1 `AchievementUnlock` được tạo (test bằng `Promise.all` gọi song song trong integration test) |
| One-time reward | Reward chỉ cấp đúng 1 lần cho achievement `ONE_TIME`, kể cả khi Evaluator chạy lại (idempotencyKey chặn) |
| Repeatable achievement | Achievement `REPEATABLE` cho phép unlock nhiều lần, mỗi lần có `unlockSequence` tăng dần và `idempotencyKey` khác nhau |
| Inactive definition | `isActive=false` không được Evaluator xử lý tiếp, dù domain event khớp criteria |
| Criteria version | Đổi `criteriaConfig` version mới không phá vỡ progress đã ghi nhận theo version cũ (cần test explicit cho tình huống này trước khi cho phép đổi version ở production) |
| Reward failure/retry | Reward-service (XP/coins) throw lỗi → `AchievementUnlock` rollback theo cùng transaction, không có unlock "treo" mà không có reward |
| Unauthorized claim | Gọi `POST /achievements/:code/claim` khi chưa unlock, hoặc unlock của người khác → 403/404, không lộ thông tin |
| Hidden/secret achievement | `isSecret=true` chưa unlock không xuất hiện trong `GET /achievements`/`GET /achievements/:code` cho tới khi user tự unlock nó |

### 3.3 Integration (end-to-end, theo đúng ví dụ đề bài)

```
Listening completed (finishSession() ghi COMPLETED)
  → domain event 'learning.activity.completed' (activity=LISTENING_COMPLETED)
    → Achievement Evaluator tăng progress cho các achievement liên quan Listening
      → nếu đạt target → unlock (ghi AchievementUnlock, idempotent)
        → reward cấp đúng 1 lần (qua Reward Ledger, không tự update XP trực tiếp)
        → publish 'achievement.unlocked'
          → Notification Event Mapper tạo đúng 1 Notification (không trùng với Notification XP thông thường của chính Listening, nếu XP Notification cũng được bật ở 7A)
```

Test integration này bắt buộc chạy trên dữ liệu thật (tương tự cách các chặng 6D đã verify bằng script Node/Prisma thật, không mock), vì đây là chuỗi có tiền lệ lỗi thật (Stage 6D.5: `MissionProgressEventV2` từng bị nuốt lỗi im lặng suốt một thời gian dài mà không ai phát hiện) — không được chỉ tin vào unit test có mock.

---

## 4. Implementation Breakdown (7A–7E, cập nhật theo 10 ADR)

### Stage 7A — Notification Backend Core
- **Scope:** Notification Event Mapper + mở rộng `NotificationJobName` (`notification.create`, `notification.createMany`, `notification.deliverRealtime`, `notification.sendDigest`, `notification.cleanup`); migration N1-N8 (Section 1.1); Notification Preference Model đọc đủ 8 field (Prerequisite 2); publish `mission.completed`/`leaderboard.reward.granted` mới (3 file, theo Prerequisite 1); DTO + validation cho Controller; dedup theo ADR-003; reconciliation scheduler cơ bản cho Mission→Notification (ADR-009).
- **Không làm:** Achievement (thuộc 7C), Realtime gateway (thuộc 7B).
- **Files:** `notifications.service.ts`, `.controller.ts`, `.types.ts`, `.processor.ts`, `.scheduler.ts`, `.constants.ts`, schema.prisma (`Notification` model + `NotificationFailedEvent`), `mission-v2-reward.service.ts`, `leaderboard-reward.service.ts`, `leaderboard-weekly-close.service.ts` (thêm publish, không đổi logic nghiệp vụ hiện có).
- **Migration:** CÓ (N1-N8).
- **Queue:** CÓ (mở rộng cách dùng, không tạo queue mới).
- **WebSocket:** KHÔNG.
- **Tests:** theo Section 3.1 (trừ Gateway authentication/Reconnect sync — thuộc 7B).
- **Risk:** TRUNG BÌNH.

### Stage 7B — Notification Realtime & UI
- **Scope:** `NotificationGateway` mới theo ADR-004/ADR-010 (xác thực `JWT_ACCESS_SECRET`, KHÔNG copy `CommunityGateway`); frontend: socket subscribe trong `NotificationDrawer`, đồng bộ multi-tab, reconnect sync, filter theo type, infinite scroll trang `/notifications`.
- **Bắt buộc trước khi code:** xác minh `.env` thật (`JWT_SECRET` vs `JWT_ACCESS_SECRET`, xem ADR-010 Implementation Notes) và mở task `SECURITY-HARDENING-SOCKET-AUTH` độc lập cho `CommunityGateway` (không code trong 7B, chỉ mở task).
- **Files:** file gateway mới trong `modules/notifications/`, `NotificationDrawer.tsx`, `notifications-api.ts`, trang `/notifications`.
- **Migration:** KHÔNG.
- **Queue:** dùng lại của 7A.
- **WebSocket:** CÓ (mới).
- **Tests:** Gateway authentication, Reconnect sync (Section 3.1), cộng test riêng xác nhận không lặp lại lỗ hổng dạng `CommunityGateway` (test impersonation phải thất bại).
- **Risk:** TRUNG BÌNH-CAO — điểm cần review kỹ nhất do liên quan bảo mật.

### Stage 7C — Achievement Backend Core
- **Scope:** `AchievementModule` mới theo ADR-005 (3 bảng), `AchievementEvaluator` theo ADR-006 (criteria engine, ưu tiên `ONE_TIME`/`COUNT_EVENT`/`THRESHOLD` trước, `COMPOSITE` làm sau cùng), reward policy hybrid theo ADR-007, subscribe `learning.activity.completed` + `mission.completed`/`leaderboard.reward.granted` (không sửa 9 module học tập, theo Prerequisite 1), publish `achievement.unlocked`.
- **Files:** module mới hoàn toàn (`modules/achievement/`); schema.prisma (3 bảng mới A1-A3).
- **Migration:** CÓ (A1-A3).
- **Queue:** cân nhắc dùng queue cho việc tính progress bất đồng bộ nếu volume event lớn (quyết định cụ thể khi bắt đầu 7C, không bắt buộc ngay).
- **WebSocket:** KHÔNG (celebration realtime thuộc 7D nếu cần).
- **Tests:** theo Section 3.2 + integration Section 3.3.
- **Risk:** CAO NHẤT trong 5 giai đoạn — tính năng hoàn toàn mới, không có gì tái sử dụng ngoài pattern idempotency của `XpTransaction`.

### Stage 7D — Achievement Frontend
- **Scope:** UI mới độc lập (route `/achievements`) gọi API Achievement thật (7C); giữ nguyên `/vocabulary/achievements/*` theo ADR-008 (đổi label/copy để tránh nhầm lẫn, không phá API); celebration/unlock animation; nút claim thật cho achievement có `claimRequired=true`.
- **Files:** thư mục UI mới; chỉnh nhẹ copy/label trong `Components/Vocabulary/achievements/*` (không đổi logic/API).
- **Migration:** KHÔNG.
- **Tests:** hiển thị đúng theo dữ liệu thật từ bảng mới; luồng claim end-to-end cho achievement `claimRequired=true`; xác nhận achievement không-claim-required tự động hiển thị "đã nhận" mà không có nút claim.
- **Risk:** TRUNG BÌNH.

### Stage 7E — Integration + Regression
- **Scope:** chạy lại toàn bộ luồng học tập + Mission/Leaderboard/Community để xác nhận: Notification qua queue mới (7A) hoạt động đúng, Achievement progress/unlock/reward đúng 1 lần (7C), không double-reward, không regression trên các stage đã đóng (đặc biệt Listening — Stage 7 Gate hiện dựa trên Listening `READY`); chạy reconciliation scheduler thật để xác nhận không bỏ sót do lỗi publish (ADR-009); rà soát migration N1-N8/A1-A3 đã áp dụng đúng qua `prisma migrate status`.
- **Files:** không sửa code mới, chủ yếu script/test verification theo đúng phong cách các chặng 6D đã làm (không fabricate PASS).
- **Migration:** KHÔNG (chỉ verify).
- **Tests:** full regression suite + test double-reward XP/Mission/Achievement + an ninh (test lại ADR-010 impersonation case).
- **Risk:** THẤP nếu 7A-7D đúng scope, nhưng bắt buộc trước khi coi Stage 7 hoàn tất.

---

## 5. Kết luận Gate

Đối chiếu 7 điều kiện bắt buộc trước khi mở `Stage 7A Gate`:

| # | Điều kiện | Trạng thái sau Stage 7.1 |
|---|---|---|
| 1 | Notification pipeline | CHỐT — pipeline `Domain Action → Domain Event → Mapper → BullMQ → Processor → DB → Realtime → REST sync` (ADR-001) |
| 2 | EventEmitter2/BullMQ responsibilities | CHỐT — ranh giới rõ + chiến lược chuyển đổi dần cho 8/9 direct call (ADR-002) |
| 3 | Deduplication strategy | CHỐT — `deduplicationKey` format + unique index là lớp bảo vệ cuối cùng, không dựa vào BullMQ jobId (ADR-003) |
| 4 | Achievement source of truth | CHỐT — 3 bảng độc lập (`AchievementDefinition`/`UserAchievementProgress`/`AchievementUnlock`), Vocabulary dashboard không phải source of truth (ADR-005) |
| 5 | Achievement reward policy | CHỐT — hybrid auto-grant (thường) / manual claim (cosmetic), qua Reward Ledger hiện có, có idempotency key (ADR-007) |
| 6 | Socket authentication requirement | CHỐT — `NotificationGateway` phải xác thực bằng `JWT_ACCESS_SECRET`, không copy `CommunityGateway`; `SECURITY-HARDENING-SOCKET-AUTH` mở thành task độc lập, không chặn Stage 7A vì Stage 7A chưa động tới realtime (ADR-010) |
| 7 | Migration và test plan | CHỐT — migration N1-N8/A1-A3 liệt kê chi tiết (Section 1, chưa tạo), API contract (Section 2), test matrix đầy đủ (Section 3) |

Cả 7 điều kiện đều đã được chốt ở mức thiết kế/kiến trúc. Không có blocker nào được phát hiện trong Stage 7.1 ngăn việc bắt đầu code Stage 7A. Lỗ hổng `CommunityGateway` (Prerequisite 3 / ADR-010) là rủi ro tồn đọng có thật nhưng đã được cô lập thành task độc lập (`SECURITY-HARDENING-SOCKET-AUTH`), không thuộc phạm vi Notification/Achievement và không chặn 7A (vốn không đụng tới realtime) — cần được ưu tiên xử lý trước khi Stage 7B (realtime) hoặc bất kỳ tính năng socket nào lên staging công khai.

**Kết luận: `READY_FOR_STAGE_7A`**

```
Stage 7A Gate: OPEN
```

**Điều kiện đi kèm khi bắt đầu Stage 7A (bắt buộc, không phải tuỳ chọn):**
1. Xác nhận lại UI Settings thật (`settings-page.tsx`) có đang hiển thị 5 preference chưa dùng hay không, trước khi triển khai Notification Preference Model đầy đủ 8 field (Prerequisite 2).
2. Không code Realtime/Gateway trong 7A (thuộc 7B).
3. Không code Achievement trong 7A (thuộc 7C).
4. Không sửa `CommunityGateway` trong bất kỳ phần nào của Stage 7.
5. Mọi migration của 7A phải qua đúng quy trình đã dùng ở các chặng 6D (`npx prisma migrate dev`, không `migrate reset`/`db push`, backup trước khi chạy trên dữ liệu thật nếu môi trường có dữ liệu cần giữ).
