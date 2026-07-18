# Phase 1 - Stage 6D.1: Listening Verification & Hardening

## 0. Kết luận nhanh

**Không đủ điều kiện chuyển sang Chặng 7.** Lý do chính: sandbox thực
thi lệnh (bash) trong toàn bộ phiên làm việc này **không khởi động
được** — báo lỗi `Not enough disk space to set up the workspace` ngay
từ bước mount, xảy ra **trước khi** bất kỳ lệnh nào (kể cả `df -h`)
được chạy. Đây là hạ tầng phía môi trường thực thi, không phải dữ liệu
trong `D:\elearning-english`. Do đó **không thể dọn dung lượng, không
chạy `git`, không chạy `prisma`, không `npm run build`, không `npm
test`, không lint** trong phiên này. Mọi mục dưới đây đánh dấu
`BLOCKED BY ENVIRONMENT` là trung thực, không phải PASS giả.

Trong phạm vi có thể làm (đọc/sửa file tĩnh), đã hoàn thành toàn bộ các
hardening thật được yêu cầu (mục 3, 7, 8, 9, 10, 11) và bổ sung test
code (chưa chạy được — UNVERIFIED).

## 1. Environment Recovery

- **Disk before**: không xác định được — `df -h` không chạy được vì
  workspace chưa từng khởi động thành công trong phiên này (đã thử lại
  nhiều lần, xem log dưới).
- **Cleanup**: không thực hiện được — không có shell để chạy `rm -rf
  backend/dist`, xoá `.next`, `coverage`, npm cache... Không có công cụ
  nào trong bộ Read/Write/Edit/Glob/Grep hiện có cho phép xoá thư mục
  hàng loạt an toàn (Write/Edit chỉ thao tác từng file nội dung, không
  xoá thư mục), nên **cố tình không** dùng các công cụ đó để giả lập
  dọn dẹp — tránh xoá nhầm ngoài phạm vi cho phép.
- **Disk after**: không xác định được, cùng lý do.
- **Số lần thử bash trong phiên này**: 4 lần (`df -h`, `echo hello`,
  `df -h && git status`, `df -h && git status` lần 2), tất cả trả về
  cùng lỗi `Not enough disk space to set up the workspace`.
- **Khuyến nghị cho người dùng**: đây nhiều khả năng là giới hạn dung
  lượng của máy ảo Cowork chạy phiên này (side Anthropic), không phải
  ổ đĩa `D:\elearning-english` trên máy người dùng. Đề xuất: thử mở
  phiên Cowork mới, hoặc chạy các lệnh ở mục 4/5/12/13 trực tiếp trên
  máy/terminal thật của người dùng rồi dán kết quả lại để xác nhận.

## 2. Git Diff Review

Không có `git`. Thay thế bằng cách liệt kê thủ công toàn bộ file đã
tạo/sửa trong Chặng 6D + 6D.1 (dựa trên lịch sử thao tác Write/Edit
thực tế của phiên này, đối chiếu lại bằng Read sau khi sửa):

| File | Thay đổi | Loại | Đúng phạm vi | Nguy cơ |
| --- | --- | --- | --- | --- |
| `backend/src/modules/listening-job/listening-job.controller.ts` | Bật `@Roles(UserRole.ADMIN)` | `SECURITY_FIX` | Có | Thấp — khớp pattern các admin controller khác |
| `backend/src/common/guards/roles.guard.ts` | `user?.role` optional chaining, tránh throw khi thiếu `request.user` | `SECURITY_FIX` | Có (guard dùng trực tiếp bởi endpoint vừa fix) | Rất thấp — chỉ đổi hành vi crash→false, không đổi hành vi khi có user |
| `backend/src/modules/listening/dto/rate-listening-session.dto.ts` | File DTO mới | `VALIDATION_FIX` | Có | Thấp |
| `backend/src/modules/listening/listening.controller.ts` | Dùng `RateListeningSessionDto` thay inline type | `VALIDATION_FIX` | Có | Thấp |
| `backend/src/modules/listening/listening.service.ts` | (1) `rateSession` chặn khi chưa COMPLETED; (2) `finishSession` chặn reward khi `attempted===0`; (3) `getSessionResult` trả thêm rating state; (4) `toQuestionPayload`/`getSessionPayload` ẩn transcript/correctAnswer/explanation trước khi trả lời; (5) `createSessionPayload` bắt P2002 fallback về session đã tồn tại; (6) `ensureQuestions` viết lại: bỏ vòng lặp TTS đồng bộ không giới hạn, thay bằng enqueue async + fallback cold-start giới hạn 3 câu; (7) constructor inject thêm `ListeningJobService`, `ListeningAudioBackfillService` | `SECURITY_FIX` + `REWARD_FIX` + `API_CONTRACT_FIX` | Có, toàn bộ nằm trong module Listening | **Trung bình** — thay đổi hành vi runtime nhiều nhất trong đợt này (transcript payload, session tạo mới, sinh câu hỏi), chưa build/test thật để xác nhận không lỗi cú pháp/logic |
| `backend/prisma/migrations/20260719120000_add_listening_active_session_unique/migration.sql` | Migration mới (CHƯA apply): partial unique index chống duplicate active session | `SECURITY_FIX`-adjacent (data integrity) | Có | Thấp cho tới khi apply; cần audit dữ liệu hiện có trước khi apply thật (đã ghi trong migration) |
| `backend/src/modules/listening-job/listening-job.service.ts` | `enqueueGeneration` nhận thêm `jobId?` optional để dedupe job theo ngày | `API_CONTRACT_FIX` (nội bộ) | Có | Thấp — optional, không đổi hành vi cron hiện tại (cron không truyền `jobId`) |
| `backend/src/modules/listening/listening-tts.service.ts` | Thêm env `LISTENING_AUDIO_STORAGE_DIR` optional, mặc định giữ nguyên path cũ | `UNRELATED`-adjacent nhưng thuộc yêu cầu mục 11 | Có | Rất thấp — có fallback giữ hành vi cũ |
| `backend/src/modules/listening/listening.service.spec.ts` | Viết lại: mock đủ DI (bao gồm 2 provider mới) + test thật cho reward-farming (5 case) + transcript leak (1 case) | `TEST_FIX` | Có | Thấp (test code, không ảnh hưởng runtime) nhưng **UNVERIFIED** |
| `backend/src/modules/listening/listening.controller.spec.ts` | Mock `ListeningService` đầy đủ method | `TEST_FIX` | Có | Thấp, UNVERIFIED |
| `backend/src/modules/listening-job/listening-job.service.spec.ts` | Mock `getQueueToken` | `TEST_FIX` | Có | Thấp, UNVERIFIED |
| `backend/src/modules/listening/dto/rate-listening-session.dto.spec.ts` | File test mới, validate trực tiếp bằng `class-validator` | `TEST_FIX` | Có | Rất thấp (không phụ thuộc Nest/DB), UNVERIFIED |
| `backend/src/common/guards/roles.guard.spec.ts` | File test mới, xác minh guard thật + đọc metadata thật từ `ListeningJobController` | `TEST_FIX` | Có (test trực tiếp fix bảo mật) | Rất thấp, UNVERIFIED |
| `english-web-build/src/Components/Listening/ListeningHomePage.tsx` | Xoá dòng debug gọi admin endpoint | `SECURITY_FIX` | Có | Không |
| `english-web-build/src/Components/Listening/ListeningResultPage.tsx` | Prefill/sửa rating theo state backend | `FRONTEND_FIX` | Có | Thấp |
| `english-web-build/src/Components/Listening/listening.types.ts` | Thêm field rating vào type | `API_CONTRACT_FIX` | Có | Không |
| `docs/phase1-stage6d-listening-report.md` | Report Chặng 6D | Tài liệu | Có | Không |

Không phát hiện file nào bị sửa ngoài phạm vi Listening/guard dùng
chung trực tiếp bởi Listening. Không có mục `UNCERTAIN`.

## 3. Prisma Status

| Lệnh | Kết quả |
| --- | --- |
| `npx prisma format` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma validate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma generate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma migrate status` | `BLOCKED BY ENVIRONMENT` |

Đối chiếu tĩnh (đọc thư mục `backend/prisma/migrations`): 3 migration
pending theo báo cáo trước **vẫn còn nguyên, không bị sửa**:

```text
20260717034435_add_chat_session
20260717040228_add_chat_pet_feature
20260718090000_add_mission_progress_event_v2
```

Đã thêm **1 migration mới** (không tính vào 3 migration pending kể
trên vì được tạo trong stage này, không phải migration "đang treo" từ
trước): `20260719120000_add_listening_active_session_unique` —
**CHƯA apply**, có ghi rõ dependency + cảnh báo cần audit dữ liệu
trùng trước khi apply (xem nội dung file migration). Không sửa migration
cũ nào. Không chạy `migrate dev`/`db push`/reset.

## 4. Backend Build

`npm run build`: `BLOCKED BY ENVIRONMENT`. Không thể xác nhận
TypeScript compile thành công cho các thay đổi ở mục 2. Đã tự rà soát
lại toàn bộ đoạn code sửa bằng Read sau mỗi Edit (kiểm tra ngoặc, tên
biến, import, kiểu dữ liệu) nhưng đây **không thay thế** `tsc` thật.

Rủi ro cụ thể cần build thật để loại trừ:

- Import vòng giữa `ListeningModule` → `ListeningJobModule` (đã audit
  thủ công: `ListeningJobModule` không import `ListeningModule`, chỉ
  import `ListeningTtsService` (file class trực tiếp) — không phải
  circular module dependency, nhưng cần `nest build` xác nhận).
- Kiểu dữ liệu `session.rating`/`ratingComment`/`ratedAt` từ Prisma
  Client (đã có trong `schema.prisma` qua migration cũ, nhưng
  **`npx prisma generate` chưa chạy được trong phiên này** nên không
  chắc chắn Prisma Client hiện tại trên máy đã có các field này trong
  type — nếu client cũ chưa generate lại, TypeScript có thể báo lỗi
  thiếu field).

## 5. Test Discovery

`npm test -- listening`: `BLOCKED BY ENVIRONMENT`.

Không thể xác nhận số suites/tests/pass/fail/thời gian thật. Ghi nhận
đúng theo yêu cầu: **không báo PASS**, và cũng không báo "No tests
found" giả — đơn giản là lệnh chưa từng chạy được.

Danh sách file test hiện có liên quan Listening (đã viết/sửa, cần chạy
xác nhận):

| File | Số `it()` | Loại |
| --- | --- | --- |
| `backend/src/modules/listening/listening.service.spec.ts` | 8 (1 defined + 5 reward-farming + 1 transcript-leak, phân theo `describe`) | Unit, mock Prisma/Gemini/Mission/XP/Job/Backfill |
| `backend/src/modules/listening/listening.controller.spec.ts` | 1 | Unit, mock `ListeningService` |
| `backend/src/modules/listening-job/listening-job.service.spec.ts` | 1 | Unit, mock BullMQ queue token |
| `backend/src/modules/listening/dto/rate-listening-session.dto.spec.ts` | 7 | Unit, `class-validator` trực tiếp |
| `backend/src/common/guards/roles.guard.spec.ts` | 6 | Unit, `Reflector` thật + metadata thật từ `ListeningJobController` |

Tổng cộng 23 `it()` trong 5 file — **UNVERIFIED**, cần chạy
`npm test -- listening roles.guard` (hoặc pattern tương đương theo
`package.json`) trên môi trường có sandbox hoạt động.

## 6. Security Verification

### Admin route (`/admin/listening-jobs/*`)

- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` đã
  xác nhận có mặt trên `ListeningJobController` (đọc lại file sau khi
  sửa).
- **Đã kiểm tra guard thật hoạt động**, không chỉ kiểm tra annotation
  tồn tại: viết `roles.guard.spec.ts` gọi `RolesGuard.canActivate()`
  thật với `Reflector` thật, đọc **metadata thật** từ
  `ListeningJobController.prototype.generate` (không phải metadata giả
  lập) — xác nhận `reflector.getAllAndOverride(ROLE_KEY, [...])` trả
  đúng `[UserRole.ADMIN]`. Sau đó test 4 case: `STUDENT` → false,
  `TEACHER` → false, `ADMIN` → true, không có `user` → false (không
  throw). **UNVERIFIED** (chưa chạy được, xem mục 5).
- Case "Anonymous → 401": xảy ra ở tầng `JwtAuthGuard` (Passport),
  **trước** khi `RolesGuard` được gọi (guard chạy tuần tự trong
  `@UseGuards`, guard đầu tiên trả false/throw thì các guard sau không
  chạy). Không viết thêm test cho `JwtAuthGuard` vì đây là guard dùng
  chung toàn hệ thống, không phải thay đổi của Listening — ngoài phạm
  vi, không kiểm tra lại từ đầu.
- **Không thể chạy request HTTP thật (e2e)** để xác nhận 401/403/200
  qua network thật — chỉ xác minh ở mức unit (guard logic + metadata
  thật). Đây là hạn chế, ghi nhận rõ trong mục 14.

### Debug frontend call

- Đã grep toàn bộ `english-web-build` (trừ `node_modules`) cho
  `admin/listening-jobs`, `admin-listening`, `listeningJobs` (case
  insensitive) — **không còn kết quả nào**. Dòng debug trong
  `ListeningHomePage.tsx` (gọi `POST /admin/listening-jobs/backfill-audio`
  từ trang Home người dùng thường) đã bị xoá ở Chặng 6D và được xác
  nhận lại không còn tồn tại ở Chặng 6D.1.
- Không tìm thấy route/component nào khác trong Listening gọi thẳng
  `/admin/listening-jobs/*`.

## 7. Reward Farming Verification

Đã đọc lại toàn bộ `finishSession` sau khi sửa (không chỉ điều kiện
`attempted > 0` đơn lẻ) và xác nhận:

- `attempted = correct + wrong + skipped` được tính từ
  `listeningSessionAnswer.findMany({ where: { sessionId } })` — dữ
  liệu **đọc từ DB**, không nhận trực tiếp từ client (client chỉ gửi
  `selectedAnswer`/`timeSpent`/`listenedCount` qua
  `SubmitListeningAnswerDto`, không gửi `isCorrect`/`attempted`).
  Client không có cách nào set field này.
- Retry submit cùng 1 câu (`submitAnswer` gọi lại nhiều lần cho cùng
  `questionId`): dùng `update()` trên unique
  `[sessionId, questionId]`, không phải `create()`/increment — mỗi
  lần retry chỉ ghi đè record hiện có. `recalculateSession` (và
  `finishSession`) luôn **tính lại từ toàn bộ answers hiện tại trong
  DB** (`filter` trên mảng đọc mới mỗi lần), không cộng dồn biến đếm —
  nên retry/đổi đáp án nhiều lần không làm `attempted` tăng sai.
- Một câu trả lời nhiều lần: do unique `[sessionId, questionId]`, mỗi
  câu chỉ có đúng 1 row `ListeningSessionAnswer` — không thể có 2 row
  cho cùng 1 câu trong 1 session, nên không thể tăng `attempted` nhiều
  lần cho cùng 1 câu.
- Business rule hiện tại: **có ít nhất 1 câu được trả lời HOẶC bị skip
  hợp lệ (`attempted > 0`) mới được reward** — đây là rule tối thiểu
  được thêm mới ở Chặng 6D để chặn trường hợp "finish rỗng hoàn toàn".
  **Không tự thay đổi thành "phải hoàn thành toàn bộ bài"** vì đề bài
  gốc không yêu cầu rule chặt hơn và source trước đó vốn cho phép
  finish sớm với `skipped > 0` là hợp lệ (tính năng "bỏ qua câu" vốn có
  sẵn) — nếu cần rule "phải trả lời hết mới được reward", cần yêu cầu
  nghiệp vụ rõ ràng hơn trước khi đổi.
- Idempotency: dùng **session ID ổn định** làm khoá — cụ thể
  `LearningXpListener.idempotencyKey('LISTENING_COMPLETED', sourceId)`
  với `sourceId = completed.id` (chính là `sessionId`), tạo key
  `learning:LISTENING_COMPLETED:{sessionId}`. Đúng theo convention đã
  dùng ở Stage 4/6B, không tạo pattern key mới.
- 5 test case bắt buộc theo mục 7 của đề bài (start→finish rỗng,
  1 answer→finish, finish lần 2, 2 finish song song, retry) đều đã có
  test tương ứng trong `listening.service.spec.ts` (mục 5) —
  **UNVERIFIED**, chưa chạy được. Case "rating không phát reward" đã
  verify bằng đọc code (`rateSession` không gọi
  `missionV2ProgressService`/`learningXp` ở bất kỳ nhánh nào) nhưng
  chưa có test riêng.

## 8. Transcript Exposure

**Before** (Chặng 6D): `toQuestionPayload()` luôn trả
`transcript: question.transcript` không điều kiện; `getSessionPayload()`
chỉ ẩn `explanation`/`correctAnswer` có điều kiện, transcript thì không
— nghĩa là API response của `/listening/practice/start` (và resume)
luôn chứa transcript thật kể cả cho câu chưa trả lời, dù frontend
không hiển thị nó (chỉ ẩn bằng điều kiện JSX, đúng dạng "ẩn ở
client-side" mà đề bài cảnh báo là chưa đủ).

**After** (Chặng 6D.1):

- `toQuestionPayload()` (mapper dùng chung cho response tạo/xem session
  mới) nay trả `transcript: null` mặc định.
- `getSessionPayload()` (dùng bởi `startPractice` khi resume,
  `createSessionPayload` sau khi tạo mới) override lại
  `transcript`/`explanation`/`correctAnswer` **cùng một điều kiện**
  `revealed = selectedAnswer !== null || isSkipped` — cả 3 field chỉ
  có giá trị thật khi câu đã được trả lời hoặc skip. Trước đó chỉ có
  `explanation`/`correctAnswer` được bảo vệ, giờ `transcript` được xử
  lý nhất quán.
- Không tạo `ListeningQuestionPracticeDto`/`ListeningQuestionResultDto`
  riêng như đề xuất trong đề bài (dùng class DTO output) — thay vào đó
  giữ nguyên **mapper function** hiện có (`toQuestionPayload` +
  override trong `getSessionPayload`) vì đây là thay đổi tối thiểu, ít
  rủi ro hơn so với việc tạo 2 DTO class mới và đổi kiểu trả về của
  nhiều method cùng lúc trong 1 stage chưa build/test được. Hiệu quả
  bảo mật giống nhau (transcript không còn nằm trong response trước
  khi trả lời), chỉ khác về tổ chức code. Ghi nhận là lựa chọn có ý
  thức, không phải bỏ sót.
- `submitAnswer()`/`skipQuestion()` (response ngay sau khi trả lời/skip
  1 câu cụ thể) **không đổi** — vẫn trả transcript/correctAnswer/
  explanation ngay lập tức, đúng vì đây là thời điểm hợp lệ để lộ (user
  vừa hoàn tất câu đó).
- `getSessionResult()` (chỉ hoạt động khi `session.status ===
  'COMPLETED'`, đã có check từ trước) **không đổi** — vẫn trả transcript/
  correctAnswer/explanation cho toàn bộ câu hỏi, đúng vì toàn bộ session
  đã hoàn thành.
- Frontend: **không cần sửa** — đã xác nhận lại
  `ListeningPracticePage.tsx` chỉ render nút "Xem lời thoại" khi
  `currentQuestion.answered === true`, nên trước đây dù BE có gửi
  transcript sớm, UI cũng không hiển thị; nay BE gửi `null`, UI vẫn
  hoạt động y hệt (không có logic nào phụ thuộc transcript non-null
  trước khi answered). Audio player dùng `audioUrl`, không dùng
  transcript, không bị ảnh hưởng.
- Đã thêm test `resume (startPractice trên session IN_PROGRESS có sẵn)
  chỉ lộ transcript/correctAnswer/explanation cho câu đã trả lời` trong
  `listening.service.spec.ts` — **UNVERIFIED**.
- Chưa viết test cho 5 case liệt kê đầy đủ ở mục 8 đề bài (start
  response, resume, result sau completion, correct answer trước
  submit, explanation trước submit) như các test case tách biệt —
  hiện gộp chung trong 1 test resume (kiểm tra cả 3 field cùng lúc, cả
  2 trạng thái answered/chưa answered). Nếu cần tách chi tiết hơn theo
  đúng 5 case, cần thêm ở đợt sau.

## 9. Concurrent Start

- **Root cause**: `startPractice`/`createSessionPayload` theo pattern
  "tìm session IN_PROGRESS đang có → nếu không thấy → tạo mới" nhưng
  không có transaction/lock giữa bước tìm và bước tạo, và DB trước đây
  không có unique constraint nào chặn 2 row `ListeningSession` cùng
  `(userId, level, topic, status='IN_PROGRESS')`. Hai request gửi gần
  như đồng thời (double-click nhanh, 2 tab) có thể cùng đi qua bước
  "không thấy" rồi cùng `create()`.
- **Fix**: 2 phần đi cùng nhau (Cách D — catch unique conflict, theo
  đúng gợi ý ưu tiên trong đề bài):
  1. Migration mới `20260719120000_add_listening_active_session_unique`
     (raw SQL, **chưa apply**): `CREATE UNIQUE INDEX ... ON
     "ListeningSession" ("userId","level","topic") WHERE "status" =
     'IN_PROGRESS'` — partial unique index, chỉ áp dụng cho session
     đang IN_PROGRESS (không chặn user tạo attempt mới sau khi
     session cũ đã COMPLETED, vì lúc đó điều kiện WHERE không còn
     match).
  2. `createSessionPayload()` bọc `create()` trong try/catch, nếu lỗi
     là `P2002` (unique violation) thì **không throw cho user** — query
     lại session IN_PROGRESS hiện có cho đúng `(userId, level, topic)`
     và trả `getSessionPayload()` của session đó (request "thua" nhận
     lại đúng session mà request "thắng" vừa tạo, cả 2 response trỏ
     cùng 1 `sessionId`).
- **Trạng thái hiệu lực**: catch P2002 chỉ thật sự ngăn được duplicate
  **sau khi migration được apply**. Trước khi apply, code catch này là
  no-op an toàn (P2002 không bao giờ xảy ra vì DB chưa có constraint) —
  hành vi giữ nguyên như cũ, **không có gì bị phá vỡ** nếu migration
  chưa chạy. Đây là thiết kế cố ý để không phụ thuộc vào việc apply
  migration ngay trong stage này (đúng chỉ thị "không tự apply").
- **Test**: chưa viết test tích hợp giả lập 2 request đồng thời thật
  (cần DB thật hoặc mock `create()` throw P2002 ở lần gọi thứ 2) — có
  thể bổ sung ở đợt sau khi có thể chạy test thật với DB test. Hiện
  chỉ verify bằng đọc code logic.
- User khác không bị ảnh hưởng: unique index có `userId` trong danh
  sách cột nên chỉ áp dụng trong phạm vi 1 user, không chặn user khác.

## 10. TTS Runtime Architecture

- **Trước**: `ensureQuestions()` khi thiếu câu hỏi sẽ gọi
  `generateQuestionsByGemini()` (1 lần Gemini) rồi lặp `for (const item
  of valid)` gọi `listeningTtsService.createAudioFromTranscript()`
  **đồng bộ, không giới hạn** (có thể tới `limit` lần, mặc định 10,
  tối đa 20) ngay trong request `POST /listening/practice/start`.
  `ensureMissingAudio()` (nhánh "đã đủ câu nhưng thiếu audio") cũng gọi
  TTS đồng bộ tới 10 lần.
- **Sau**: đã loại bỏ hoàn toàn nhánh gọi TTS lặp không giới hạn khỏi
  đường đi chính:
  - Đủ câu hỏi (`shortfall === 0`): chỉ **enqueue** job backfill audio
    bất đồng bộ (`ListeningAudioBackfillService.enqueueMissingAudio`),
    không chờ, không gọi TTS trong request.
  - Thiếu câu hỏi nhưng đã có sẵn ít nhất 1 câu (`existed > 0`):
    enqueue job sinh thêm bất đồng bộ
    (`ListeningJobService.enqueueGeneration` với `jobId` ổn định theo
    ngày để dedupe), phục vụ ngay bằng số câu đang có — **không** gọi
    Gemini/TTS trong request này.
  - Hoàn toàn chưa có câu nào (`existed === 0`, cold start thật sự):
    **vẫn còn một fallback đồng bộ giới hạn nghiêm ngặt** — tối đa 3
    câu (`COLD_START_FALLBACK_CAP`), 1 lần gọi Gemini, tối đa 3 lần gọi
    TTS, có cooldown 60 giây theo `(level, topic)` để nhiều request
    đồng thời không cùng trigger lặp lại, có log rõ khi trigger.
- Theo đúng quy tắc mục 10 đề bài, production decision cho khía cạnh
  này là **`READY_WITH_LIMITATIONS`** (không phải `READY`) vì "vẫn còn
  nhánh fallback nhỏ" — cụ thể tối đa 3 câu/1 lần cold-start, có
  cooldown, có log, có rate-limit (cooldown 60s), không loop vô hạn,
  không gọi TTS nhiều hơn 3 lần/request. Đây đúng là mức "giữ fallback
  giới hạn nếu kiến trúc bắt buộc" mà đề bài cho phép.
- **Chưa verify được bằng test chạy thật** thời gian phản hồi thực tế
  của `startPractice` khi cold start (cần Gemini/TTS thật hoặc mock
  thời gian) — chỉ xác nhận bằng đọc code rằng số vòng lặp TTS tối đa
  đã giảm từ "tới `limit` (≤20)" xuống "tối đa 3".

## 11. Audio Storage

- Serve qua static route (không đổi trong stage này — đã xác nhận ở
  Chặng 6D là serve qua `BACKEND_PUBLIC_URL` + path
  `/listening-audio/<hash>.mp3`).
- Filename = `sha256(transcript).slice(0,24) + '.mp3'` — luôn là hex
  string, không path traversal, không phụ thuộc input người dùng trực
  tiếp (transcript do Gemini/fallback sinh ra ở tầng server, không phải
  raw user input), unique theo nội dung, không overwrite (check
  `fs.access` trước khi ghi).
- **Mới**: thêm env `LISTENING_AUDIO_STORAGE_DIR` (optional) để override
  thư mục lưu audio, mặc định giữ nguyên `public/listening-audio` dưới
  `process.cwd()` — không đổi hành vi nếu không set env này.
- **Docker volume**: đã đọc `backend/docker-compose.yml` — file này
  **chỉ định nghĩa Postgres + Redis**, không có service backend app
  nào được container hoá ở đây, nên **không có volume nào được khai
  báo cho `backend/public/listening-audio`** trong repo hiện tại. Kết
  luận: setup hiện tại là chạy backend trực tiếp trên host (không phải
  trong container), nên "audio mất sau restart container" chưa áp dụng
  cho local dev — nhưng nếu triển khai production bằng Docker sau này,
  **bắt buộc phải thêm volume** cho thư mục audio (qua
  `LISTENING_AUDIO_STORAGE_DIR` mới thêm) để không mất dữ liệu khi
  container restart. Đây là việc của Chặng 8/10 (Deployment Readiness),
  chỉ ghi nhận ở đây.
- Kết luận rõ ràng theo đúng yêu cầu:

```text
Single-instance supported
Multi-instance unsupported without shared storage
```

## 12. Frontend Verification

`npm run build` (frontend): `BLOCKED BY ENVIRONMENT`.

Đã xác minh bằng đọc source (không chạy được app thật):

- Rating state: `ListeningResultPage.tsx` đọc `result.summary.rating`
  sau khi load, set `rating`/`ratingSent` tương ứng — nếu đã có rating
  từ trước, UI hiển thị đúng (nút đổi label, sao được tô sẵn).
- Không submit rating 2 lần ngoài ý muốn: nút bị `disabled` khi
  `actionLoading || ratingSent`; bấm lại vào sao sẽ reset `ratingSent`
  về false để cho phép sửa (đúng rule backend cho phép update).
- Không còn debug call admin generator (mục 6).
- Practice không phụ thuộc transcript trước khi trả lời (mục 8).
- Audio error state, reload/resume, Result route, History route: đã
  audit ở Chặng 6D (không đổi thêm trong 6D.1), không phát hiện thoái
  hoá do các thay đổi backend (response shape của `questions[]` chỉ
  thêm điều kiện null cho transcript, không đổi field name/format nào
  khác mà frontend phụ thuộc).
- `git diff --check` (khoảng trắng cuối dòng, conflict marker...):
  `BLOCKED BY ENVIRONMENT`.

## 13. Commands

| Command | Result |
| --- | --- |
| `df -h` | `BLOCKED BY ENVIRONMENT` |
| `du -sh node_modules ...` | `BLOCKED BY ENVIRONMENT` |
| `git status` | `BLOCKED BY ENVIRONMENT` |
| `git diff --stat` | `BLOCKED BY ENVIRONMENT` |
| `git diff --name-only` | `BLOCKED BY ENVIRONMENT` |
| `git diff` | `BLOCKED BY ENVIRONMENT` |
| `git diff --check` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma format` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma validate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma generate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma migrate status` | `BLOCKED BY ENVIRONMENT` |
| Backend build (`npm run build`) | `BLOCKED BY ENVIRONMENT` |
| Backend test (`npm test -- listening`) | `BLOCKED BY ENVIRONMENT` |
| Backend test (`npm test -- roles.guard`) | `BLOCKED BY ENVIRONMENT` |
| Frontend build (`npm run build`) | `BLOCKED BY ENVIRONMENT` |
| Lint (file thay đổi, non-fix) | `NOT RUN` (không chạy được, và không có cách lint thủ công không dùng tool) |

Không có mục nào được đánh dấu `PASS` trong report này bằng cách chạy
lệnh thật — toàn bộ xác nhận "đúng logic" trong các mục 6-11 đến từ
**đọc source thủ công**, không phải kết quả thực thi.

## 14. Known Issues

### BLOCKER

1. Toàn bộ thay đổi code ở Chặng 6D + 6D.1 **chưa được build/test
   thật xác nhận**. Đây là điều kiện bắt buộc trước khi chuyển Chặng 7
   theo đúng tiêu chí đề bài — hiện chưa đạt.

### HIGH

1. Migration `20260719120000_add_listening_active_session_unique`
   **chưa apply** — race condition tạo duplicate session vẫn có thể
   xảy ra trên DB thật cho tới khi migration này chạy (code catch
   P2002 là no-op nếu DB chưa có constraint).
2. Chưa xác nhận được `prisma generate` đã sinh Prisma Client khớp với
   `schema.prisma` hiện tại (đặc biệt các field rating/ratingComment/
   ratedAt dùng ở `getSessionResult`) — nếu client cũ, build có thể
   fail.
3. Cold-start fallback TTS (tối đa 3 câu/lần) vẫn còn tồn tại theo
   thiết kế — không phải bug, nhưng là giới hạn đã biết, cần
   `READY_WITH_LIMITATIONS` cho khía cạnh này (mục 10).

### MEDIUM

1. Chưa có test tích hợp thật (DB thật hoặc mock 2-lần-gọi) cho race
   condition concurrent start — chỉ verify bằng đọc code.
2. Chưa tách test transcript-leak thành đủ 5 case riêng biệt như đề
   bài liệt kê (hiện gộp vào 1 test resume kiểm tra đồng thời nhiều
   field).
3. Không thể chạy e2e HTTP thật cho admin route 401/403/200 — chỉ có
   unit test ở tầng guard.
4. `backend/docker-compose.yml` chưa có service backend app + volume
   cho audio — cần bổ sung ở Chặng 8/10 nếu deploy bằng Docker.

### LOW

1. Toàn bộ test mới (23 `it()` trong 5 file) đang ở trạng thái
   `UNVERIFIED` — rủi ro thấp về mặt logic (đã đối chiếu kỹ với source
   thật) nhưng vẫn có thể có lỗi cú pháp/type nhỏ chỉ `tsc`/`jest` thật
   mới phát hiện được.

## 15. Final Production Decision

**`READY_WITH_LIMITATIONS`** — giữ nguyên như báo cáo trước, nhưng đây
là đánh giá lại dựa trên logic thật (không phải giữ nguyên máy móc từ
report cũ):

Lý do không nâng lên `READY`:

- BLOCKER #1 ở mục 14 — không có build/test thật xác nhận các thay đổi
  không phá vỡ gì. Đây là điều kiện tiên quyết bắt buộc.
- Migration chống race condition chưa apply (HIGH #1) — lỗ hổng gốc
  vẫn tồn tại trên DB thật cho tới khi apply.
- Cold-start TTS fallback vẫn còn (theo thiết kế, HIGH #3) — không
  phải bug nhưng đúng định nghĩa "còn nhánh fallback nhỏ".

Lý do không phải `HIDE`:

- Toàn bộ lỗ hổng nghiêm trọng nhất đã biết từ Chặng 6D (admin endpoint
  không role-check, reward-farming session rỗng, rating thiếu
  validate/status-check, transcript lộ trong response, race condition
  tạo duplicate session, TTS đồng bộ không giới hạn) đều đã có fix
  logic đúng đắn trong source, đã được đọc lại cẩn thận để giảm rủi ro
  lỗi cú pháp, và có test code đi kèm (dù chưa chạy được) — không phải
  tình trạng bỏ mặc hoặc mock giả.
- Luồng chính (Home → start → nghe → trả lời → finish idempotent →
  result → rating → history) không đổi cấu trúc, chỉ siết chặt điều
  kiện bảo mật/reward/transcript — không có thay đổi nào biết trước sẽ
  làm gãy luồng.

**Điều kiện bắt buộc để nâng lên `READY`** (đối chiếu trực tiếp với
mục 15 của đề bài Chặng 6D.1):

| Điều kiện | Trạng thái |
| --- | --- |
| Disk issue đã xử lý | Chưa — không xác định được nguyên nhân/khắc phục trong phiên này |
| Prisma validate pass | Chưa chạy |
| Prisma generate pass | Chưa chạy |
| Migration status đã chạy | Chưa chạy |
| Backend build pass | Chưa chạy |
| Listening test thật sự phát hiện và pass | Chưa chạy |
| Frontend build pass | Chưa chạy |
| `git diff --check` pass | Chưa chạy |
| Admin route có test 401/403/admin | Có unit test (guard-level), chưa có e2e HTTP thật, chưa chạy được |
| Debug admin call đã xoá | **Đạt** (đã verify bằng grep) |
| Reward farming test pass | Có test, chưa chạy được |
| Rating validation test pass | Có test, chưa chạy được |
| Transcript/correctAnswer không lộ trước completion | **Đạt về logic** (đã sửa + có test), chưa chạy test xác nhận |
| Concurrent start không tạo duplicate | Có migration + code fix, **migration chưa apply** nên chưa đạt đầy đủ trên DB thật |
| Không còn synchronous bulk Gemini/TTS trong request user | **Đạt phần lớn** — đã giảm từ không giới hạn xuống tối đa 3 câu có cooldown, đúng mức `READY_WITH_LIMITATIONS` cho phép |
| Production decision đã cập nhật | **Đạt** (report này) |

**Kết luận: dừng ở Chặng 6D.1, KHÔNG chuyển sang Chặng 7 trong lượt sửa
này.** Blocker chính xác để mở khoá Chặng 7: cần một môi trường có
sandbox/shell hoạt động để chạy toàn bộ bảng lệnh ở mục 13, xác nhận
build pass và ít nhất bộ test Listening + `roles.guard` pass thật, và
apply (ở môi trường dev an toàn đã xác nhận, không phải từ máy này)
migration `20260719120000_add_listening_active_session_unique` cùng 3
migration pending còn lại.
