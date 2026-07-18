# Stage 7.1 — Prerequisites Resolution

Nguồn: `docs/stage7-notification-achievement-architecture-audit.md` (Stage 7.0, COMPLETED).
Phạm vi: chỉ chốt quyết định kiến trúc. Không code, không migration trong tài liệu này.

Stage 7.0 kết thúc với `Decision: READY_WITH_PREREQUISITES`, `Stage 7A Gate: CLOSED`, và 3 prerequisite được trích nguyên văn từ report gốc (mục "Kết luận" của report Stage 7.0):

> 1. Quyết định cách Achievement (7C) nhận tín hiệu từ 9 module học tập — mở rộng qua `learning.activity.completed` listener mới (khuyến nghị, ít rủi ro regression nhất) hay sửa trực tiếp từng module.
> 2. Thêm index cho `Notification` và quyết định số phận 5 field preference chưa dùng trong `UserSettings`, trước khi 7A chuyển sang dùng queue rộng rãi hơn.
> 3. Thống nhất KHÔNG dùng pattern xác thực của `CommunityGateway` cho bất kỳ gateway Notification/Achievement mới nào ở 7B/7D; và lên lịch một chặng riêng (ngoài Stage 7) để vá lỗ hổng đó trong Community.

Cả ba đều được xử lý dưới đây, không bỏ sót cái nào.

---

## Prerequisite 1 — Cơ chế Achievement nhận tín hiệu từ các module học tập

**Vấn đề hiện tại:** Toàn hệ thống chỉ có 2 event thật qua `EventEmitter2` (`learning.activity.completed`, `settings.updated`). 9 module học tập (Vocabulary, Grammar, Reading, Writing, Speaking, Listening, Quizzes, Placement-result, Missions-v2 reward) đã publish `learning.activity.completed` khi hoàn thành hoạt động — đây là điểm nối có sẵn duy nhất. Nếu Achievement Evaluator không dùng điểm này, sẽ phải tự thêm hook vào 9 file service khác nhau, rủi ro regression cao trên các module đã qua Stage 6 (đặc biệt Listening, vừa đóng Stage 6D.5).

**Quyết định cần chốt:** Achievement Evaluator lấy dữ liệu domain-event bằng cách nào — subscribe lại `learning.activity.completed` hay tự định nghĩa domain event mới per-module.

**Phương án:**

| Phương án | Mô tả |
|---|---|
| A. Subscribe `learning.activity.completed` hiện có | Achievement Evaluator đăng ký thêm 1 `@OnEvent('learning.activity.completed')` mới, song song với `LearningXpListener` đã có (EventEmitter2 hỗ trợ nhiều listener cho cùng 1 event, đã xác nhận qua source: cả `LearningXpListener` lẫn tương lai `AchievementEvaluatorListener` đều có thể lắng nghe cùng tên event mà không xung đột) |
| B. Sửa trực tiếp 9 module để gọi thêm `achievementService.evaluate()` | Thêm lời gọi mới vào từng service (Vocabulary, Grammar, Reading, Writing, Speaking, Listening, Quizzes, Placement-result, Missions-v2) |
| C. Định nghĩa domain event mới riêng cho từng loại hoạt động (`learning.vocabulary.completed`, `learning.listening.completed`, ...) thay thế `learning.activity.completed` | Refactor lại toàn bộ publisher hiện tại sang nhiều event tên riêng biệt |

**Ưu/nhược:**

- A: Ưu — không sửa 9 file gốc, tận dụng event đã publish đủ field (`activity`, `userId`, `sourceId`, `score`, `completionRate`), rủi ro regression thấp nhất, đúng tinh thần "domain module chỉ publish, không biết ai consume". Nhược — payload `LearningActivityCompletedEvent` hiện tại được thiết kế cho mục đích tính XP, có thể thiếu vài field Achievement Evaluator cần về sau (vd. streak context) — cần rà soát bổ sung field khi cần, nhưng đó là mở rộng payload, không phải sửa call-site.
- B: Ưu — rõ ràng, dễ trace theo từng module. Nhược — đúng 9 điểm sửa, rủi ro regression cao nhất, đi ngược nguyên tắc Part 12 của Stage 7.0 (tránh rải logic khắp nơi giống Notification hiện tại đang mắc phải).
- C: Ưu — tên event rõ nghĩa hơn cho Achievement criteria (vd. `COUNT_EVENT` theo `eventType` cụ thể dễ viết criteria hơn dùng field `activity` bên trong payload chung). Nhược — refactor lại toàn bộ 9 publisher call-site, phạm vi tương đương phương án B về rủi ro, chỉ khác lý do sửa.

**Phương án được chọn: A**, với một tinh chỉnh: giữ tên event `learning.activity.completed` làm event vật lý duy nhất (không sửa publisher), nhưng Achievement Evaluator tự phân loại theo field `activity` bên trong payload để ánh xạ sang `criteriaType` tương ứng (vd. `activity === 'LISTENING_COMPLETED'` → tăng progress cho các achievement có `criteriaConfig.activity = 'LISTENING_COMPLETED'`). Việc này giữ nguyên toàn bộ 9 file gốc, không đổi 1 dòng nào trong đó ở Stage 7C.

Mission-claim và Leaderboard-reward hiện KHÔNG publish qua `EventEmitter2` (gọi trực tiếp `NotificationsService`) — 2 luồng này cần một domain event mới độc lập (`mission.completed`, `leaderboard.reward.granted`) được thêm vào đúng 2 file đã xác định (`mission-v2-reward.service.ts`, `leaderboard-reward.service.ts`, `leaderboard-weekly-close.service.ts`) khi làm 7A/7C — đây là ngoại lệ nằm ngoài phương án A vì 2 luồng này chưa từng publish event nào để tái sử dụng. Phạm vi sửa: 3 file, không phải 9.

**Ảnh hưởng backend:** thêm 1 listener mới (`AchievementProgressListener`) trong module Achievement mới (7C); thêm 2-3 lời gọi publish mới trong Mission/Leaderboard reward services (không đổi logic nghiệp vụ hiện có của 2 service này, chỉ thêm 1 dòng `eventEmitter.emitAsync(...)` sau khi transaction gốc hoàn tất — tương tự cách `learning-xp.publisher.ts` đang làm).

**Ảnh hưởng frontend:** không có trong prerequisite này (thuộc 7D).

**Migration cần thiết:** không có migration nào cho riêng quyết định này (đây là quyết định wiring code, không đổi schema). Migration của Achievement nằm ở Prerequisite khác (xem Section 15 của `stage7-implementation-plan.md`).

**Rủi ro:**
- `learning.activity.completed` được `emitAsync` (không đợi kết quả ở publisher) — nếu Achievement listener throw lỗi, cần xác nhận điều này không làm rollback hay ảnh hưởng tới `LearningXpListener` đang chạy song song trên cùng event (theo cơ chế `EventEmitter2`, các listener độc lập nhau, lỗi 1 listener không huỷ listener khác — nhưng cần test riêng để xác nhận thay vì giả định).
- Payload hiện tại của `learning.activity.completed` được thiết kế riêng cho tính XP; nếu Achievement Evaluator cần field chưa có (vd. tổng số ngày streak tại thời điểm hoàn thành), sẽ phải sửa `LearningActivityCompletedEvent` type + 9 publisher call-site để bổ sung field — đây là sửa nhỏ (thêm field optional) chứ không phải đổi luồng gọi, rủi ro thấp nhưng cần rà soát cụ thể ở đầu 7C trước khi code.

**Tiêu chí hoàn thành:** Achievement Evaluator (7C) subscribe được `learning.activity.completed` và cập nhật đúng `UserAchievementProgress` cho ít nhất 1 activity mẫu (vd. Listening) mà không sửa bất kỳ dòng nào trong `listening.service.ts`; Mission-claim và Leaderboard-reward publish được domain event mới của riêng chúng mà không đổi hành vi nghiệp vụ hiện có (regression test xác nhận Mission/Leaderboard vẫn hoạt động y hệt trước khi thêm publish).

---

## Prerequisite 2 — Index cho `Notification` + số phận 5 field preference chưa dùng

**Vấn đề hiện tại:** `model Notification` không có `@@index` nào trong khi mọi query đều lọc theo `userId` (+ `isRead`) và sắp theo `createdAt`. `UserSettings` có 8 field preference liên quan notification, nhưng chỉ 3 field (`dailyReminderEnabled`, `pushNotification`, `missionReminder`) thực sự được đọc trong code; 5 field còn lại (`friendActivity`, `clubNotification`, `leaderboardNotification`, `aiFeedbackNotification`, `emailNotification`) tồn tại trong schema + DTO nhưng không có bất kỳ nơi nào trong `backend/src` đọc chúng.

**Quyết định cần chốt:** (a) thêm index nào; (b) giữ, triển khai thật, hay xoá 5 field chưa dùng.

**Phương án cho (a) — index:**

| Phương án | Mô tả | Đánh giá |
|---|---|---|
| A1. `@@index([userId, createdAt])` + `@@index([userId, isRead])` | 2 index tách biệt, Postgres tự chọn theo query planner | Đơn giản, đủ cho pattern query hiện tại (`findMany` sort theo `createdAt`, `count` theo `isRead`) |
| A2. 1 index gộp `@@index([userId, isRead, createdAt])` | 1 composite index duy nhất | Tối ưu hơn cho query kết hợp cả 2 điều kiện cùng lúc, nhưng kém linh hoạt hơn nếu sau này cần query chỉ theo `isRead` không kèm `userId` (không có use-case đó hiện tại) |

**Chọn A1** (2 index tách biệt) vì khớp chính xác 2 pattern query thật đã đọc trong `notifications.service.ts` (`findMany` luôn có `userId`+sort `createdAt`; `count` luôn có `userId`+`isRead`) và đơn giản hơn để thêm cột `deduplicationKey`/`type` sau này mà không phải thiết kế lại composite index.

**Phương án cho (b) — 5 field chưa dùng:**

| Phương án | Ưu | Nhược |
|---|---|---|
| B1. Xoá khỏi schema + DTO | Dọn dead schema, tránh hiểu nhầm là tính năng đã có | Là breaking change cho DTO `update-settings.dto.ts` nếu frontend `settings-page.tsx` đang gửi các field này lên (cần xác nhận thêm) |
| B2. Giữ nguyên, triển khai thật khi làm 7A (map sang preference-gate cho domain event tương ứng) | Không breaking change, biến "dead field" thành tính năng thật đúng như tên gọi | Cần bổ sung logic gate cho 5 loại event mới (friend, club, leaderboard, ai-feedback, email) — nằm trong phạm vi 7A vốn đã phải làm preference model |
| B3. Giữ nguyên nhưng không làm gì thêm | Không tốn công | Giữ nguyên vấn đề gốc — field tồn tại mà vô nghĩa, gây hiểu lầm cho dev sau này |

**Chọn B2.** Lý do: Stage 7.0 đã xác nhận `settings-page.tsx` (frontend) có tham chiếu tới các field này (`friendActivity`, `clubNotification`, ... xuất hiện trong `settings-api.ts`/`settings-types.ts`/`settings-page.tsx` theo kết quả grep) — nghĩa là UI Settings có thể đã có toggle cho các preference này, chỉ là backend chưa enforce. Xoá (B1) sẽ là breaking change không cần thiết cho một UI có thể đã tồn tại; giữ mà không làm gì (B3) để lại nợ kỹ thuật đã ghi nhận. B2 vừa khớp đúng ý định gốc của schema, vừa tận dụng công sức thiết kế Notification Preference Model đã lên kế hoạch cho 7A (xem ADR liên quan trong `stage7-architecture-decisions.md`).

**Ảnh hưởng backend:** thêm cột index (migration); Notification Preference Model (7A) đọc đủ 8 field thay vì 3; cần map từng field sang domain-event tương ứng (bảng chi tiết ở ADR-001/preference table trong `stage7-architecture-decisions.md`).

**Ảnh hưởng frontend:** không đổi UI Settings hiện có (nếu đã có toggle, chỉ là giờ chúng có tác dụng thật); không có thay đổi bắt buộc trong Stage 7.1.

**Migration cần thiết:** CÓ — thêm 2 index cho `Notification` (không tạo trong tài liệu này, liệt kê ở `stage7-implementation-plan.md` Section Migration Plan, thực thi ở 7A).

**Rủi ro:** nếu frontend Settings UI thực ra CHƯA có toggle cho 5 field này (cần xác nhận lại khi bắt đầu 7A bằng cách đọc trực tiếp `settings-page.tsx`, vì Stage 7.0 chỉ xác nhận field này được *tham chiếu* trong file, chưa xác nhận có UI toggle thật hiển thị cho user), thì B2 sẽ triển khai preference-gating cho các field mà user chưa từng có cách để tự thay đổi — cần double-check trước khi code 7A, không phải giả định.

**Tiêu chí hoàn thành:** migration thêm 2 index chạy thành công, `prisma migrate status` sạch; cả 8 field preference (không chỉ 3) đều được `NotificationPreferenceResolver` (thiết kế ở 7A) đọc và áp dụng đúng cho domain event tương ứng, có test xác nhận từng field gate đúng loại notification của nó.

---

## Prerequisite 3 — Không copy pattern xác thực của `CommunityGateway`

**Vấn đề hiện tại:** `CommunityGateway.handleConnection()` lấy `userId` từ `client.handshake.auth?.userId` do client tự khai, không verify JWT — bất kỳ client nào cũng có thể tự xưng là user khác để join room `user:${userId}` và nhận toàn bộ sự kiện realtime của người đó. Đây là lỗ hổng thật, đang tồn tại trong code, được xác nhận lại trong Stage 7.1.

**Phát hiện bổ sung trong Stage 7.1 (chưa có trong report Stage 7.0):** khi đọc lại `LeaderboardCookieAuthService` (pattern đã được Stage 7.0 khuyến nghị "nên copy") để chuẩn bị thiết kế `NotificationGateway`, phát hiện nó verify JWT bằng `process.env.JWT_SECRET`:

```ts
// leaderboard-cookie-auth.service.ts:36-38
const payload = this.jwtService.verify<{...}>(token, {
  secret: process.env.JWT_SECRET,
});
```

Trong khi access token thật của hệ thống được ký và verify ở mọi nơi khác bằng `JWT_ACCESS_SECRET` (`jwt.strategy.ts:27`, `auth.service.ts:138,231,365`, `two-factor-crypto.util.ts:14`). `JWT_SECRET` chỉ được dùng làm secret mặc định đăng ký cho `JwtModule` trong `auth.module.ts:24` (nhiều khả năng phục vụ mục đích khác, không phải access token). Nếu 2 biến môi trường này khác giá trị trong `.env` thật, `LeaderboardCookieAuthService.authenticate()` đang verify token bằng secret sai — về lý thuyết token hợp lệ có thể bị từ chối, hoặc tệ hơn nếu `JWT_SECRET` bị để trống/dễ đoán trong khi `JWT_ACCESS_SECRET` được cấu hình chặt, đây là bề mặt tấn công cần xác minh (chưa xác minh giá trị `.env` thật trong Stage 7.1 — cần một dòng lệnh thật để `Get-Content backend/.env | Select-String JWT` mới kết luận được có phải cùng giá trị hay không, việc này nên làm ở đầu 7B, không phải trong tài liệu kiến trúc thuần tuý này).

**Quyết định cần chốt:** `NotificationGateway` xác thực bằng cơ chế nào.

**Phương án:**

| Phương án | Mô tả | Đánh giá |
|---|---|---|
| A. Copy y nguyên `LeaderboardCookieAuthService` | Tái sử dụng class hiện có | Kế thừa luôn rủi ro secret-mismatch vừa phát hiện — KHÔNG chọn |
| B. Viết `SocketAuthService` dùng chung mới, verify bằng `JWT_ACCESS_SECRET` (khớp `JwtStrategy` — nguồn xác thực REST đang hoạt động đúng), dùng lại cho cả Leaderboard lẫn Notification | Tập trung 1 nơi xác thực socket, sửa luôn điểm sai của Leaderboard | Đúng nguyên tắc single-source-of-truth, nhưng "sửa luôn Leaderboard" nằm ngoài phạm vi Stage 7 nếu không cẩn thận |
| C. `NotificationGateway` tự viết riêng logic xác thực bằng `JWT_ACCESS_SECRET`, không đụng tới `LeaderboardCookieAuthService` | Độc lập hoàn toàn, không ảnh hưởng module Leaderboard | An toàn phạm vi nhất nhưng để lại 2 bản logic xác thực gần giống nhau (Notification đúng, Leaderboard vẫn dùng secret khả nghi) |

**Chọn C cho Stage 7B (không sửa Leaderboard trong Stage 7 dưới bất kỳ hình thức nào), kèm khuyến nghị riêng (không phải quyết định thực thi):** sau khi xác minh `.env` thật, nếu `JWT_SECRET` ≠ `JWT_ACCESS_SECRET`, mở một task riêng (không thuộc Stage 7) để hợp nhất `LeaderboardCookieAuthService` sang dùng `JWT_ACCESS_SECRET`, sau đó mới cân nhắc gộp thành `SocketAuthService` dùng chung (phương án B) như một refactor kế tiếp. Trong Stage 7B, `NotificationGateway` triển khai xác thực độc lập, đúng theo `JWT_ACCESS_SECRET`, không phụ thuộc và không sửa `leaderboard-cookie-auth.service.ts`.

Quy tắc thiết kế bắt buộc cho `NotificationGateway` (chi tiết đầy đủ ở ADR-010, `stage7-architecture-decisions.md`):
- Đọc `access_token` từ cookie header y hệt `cookieExtractor` của `JwtStrategy` (`req.cookies['access_token']`, áp dụng tương đương cho `socket.handshake.headers.cookie`).
- Verify bằng `jwtService.verify(token, { secret: process.env.JWT_ACCESS_SECRET })`.
- Không nhận `userId` từ payload client gửi lên dưới bất kỳ hình thức nào (không qua `handshake.auth`, không qua query param).
- `client.join(\`user:${verifiedUserId}\`)` chỉ dùng `verifiedUserId` lấy từ payload JWT đã verify.
- Disconnect ngay nếu không có cookie hoặc verify thất bại, không log token ra console/log file dưới bất kỳ hình thức nào (kể cả log lỗi — chỉ log message lỗi, không log giá trị token).

**Ảnh hưởng backend:** file mới `notification-socket-auth.service.ts` (hoặc tên tương đương) trong `modules/notifications/`; `NotificationGateway` mới dùng service này; KHÔNG sửa `community.gateway.ts` hay `leaderboard-cookie-auth.service.ts` trong Stage 7.

**Ảnh hưởng frontend:** client Socket.IO khi kết nối tới namespace Notification phải đảm bảo cookie `access_token` được gửi kèm handshake (`withCredentials: true` hoặc tương đương) — không cần gửi `userId` trong `auth` payload nữa (khác với thói quen hiện tại của `community` namespace).

**Migration cần thiết:** không có.

**Rủi ro:** nếu không xác minh `.env` thật trước 7B, có nguy cơ lặp lại giả định sai (giống việc Stage 7.0 đã giả định copy Leaderboard là an toàn, trong khi Stage 7.1 vừa phát hiện nó có vấn đề tiềm ẩn) — quy tắc cứng cho 7B: chạy 1 lệnh xác minh biến môi trường thật trước khi viết `NotificationGateway`, không dựa vào source code suy luận.

**Tiêu chí hoàn thành:** `NotificationGateway` verify JWT thật bằng `JWT_ACCESS_SECRET`, có test xác nhận: (1) không có cookie → disconnect; (2) cookie sai/hết hạn → disconnect; (3) không thể tự khai `userId` khác qua bất kỳ field nào của payload kết nối; (4) `SECURITY-HARDENING-SOCKET-AUTH` được tạo thành task độc lập, không gộp vào bất kỳ PR/migration nào của Notification.

---

## Tổng kết resolution status

| Prerequisite | Trạng thái |
|---|---|
| 1. Cơ chế Achievement nhận tín hiệu | RESOLVED — dùng lại `learning.activity.completed` cho 9 module học tập; thêm domain event mới riêng cho Mission-claim/Leaderboard-reward (3 file, không phải 9) |
| 2. Index Notification + 5 field preference | RESOLVED — thêm 2 index (`[userId,createdAt]`, `[userId,isRead]`); triển khai thật cho cả 8 field preference ở 7A, cần double-check UI Settings thật trước khi code |
| 3. Không copy pattern CommunityGateway | RESOLVED WITH FOLLOW-UP — `NotificationGateway` (7B) tự xác thực bằng `JWT_ACCESS_SECRET`, độc lập với Leaderboard; phát hiện thêm rủi ro secret-mismatch tiềm ẩn ở `LeaderboardCookieAuthService` cần xác minh `.env` thật trước 7B; `SECURITY-HARDENING-SOCKET-AUTH` được mở làm task độc lập cho `CommunityGateway` |

Cả 3 prerequisite đều đã được chốt phương án ở mức kiến trúc. Xem `docs/stage7-architecture-decisions.md` cho các ADR chi tiết và `docs/stage7-implementation-plan.md` cho migration/API/test plan và kết luận gate cuối cùng.
