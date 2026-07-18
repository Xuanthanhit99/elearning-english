# Phase 1 - Stage 6D: Listening Production Flow

## 0. Environment Note (đọc trước)

Sandbox thực thi lệnh (bash) của phiên làm việc này không khởi động được
("Not enough disk space to set up the workspace"), xuyên suốt toàn bộ
stage. Vì vậy **mọi lệnh chạy thực tế** (`npx prisma migrate status`,
`npm run build`, `npm test`, `git status`, `git diff --check`, frontend
build...) đều ở trạng thái `BLOCKED BY ENVIRONMENT`, không phải `PASS` giả.
Toàn bộ audit và fix trong report này dựa trên đọc source tĩnh
(Read/Grep/Glob) và đối chiếu logic thủ công, không phải kết quả chạy
chương trình. Đây là hạn chế môi trường, cần chạy lại các lệnh ở mục 21
trên máy có sandbox hoạt động trước khi merge/deploy.

## 1. Scope

- Module: Listening only (`backend/src/modules/listening`,
  `backend/src/modules/listening-job`, và
  `english-web-build/src/Components/Listening/**`,
  `english-web-build/app/(main)/listening/**`).
- Không sửa lại Vocabulary/Grammar/Reading/Writing/Speaking/Mission core.
- Không migrate, không reset DB, không sửa migration đã apply.
- Báo cáo trước đó đã đọc: `phase1-stage2` đến `phase1-stage6b` (tồn
  tại). `phase1-stage6c-speaking-report.md`: **NOT FOUND** trong
  `docs/` — Speaking chưa có report riêng, chỉ audit qua source hiện
  tại khi cần đối chiếu pattern chung (Mission/XP), không rewrite.

## 2. Prisma Migration Status

`npx prisma migrate status`: **BLOCKED BY ENVIRONMENT** (không chạy được
do sandbox không khởi động). Đối chiếu tĩnh thư mục
`backend/prisma/migrations`:

- 3 migration “pending” theo yêu cầu đề bài vẫn còn nguyên, chưa bị đụng:
  `20260717034435_add_chat_session`, `20260717040228_add_chat_pet_feature`,
  `20260718090000_add_mission_progress_event_v2`.
- Các bảng Listening (`ListeningQuestion`, `ListeningSession`,
  `ListeningSessionAnswer`, `UserListeningProgress`, field
  `rating/ratingComment/ratedAt`, `questionHash`) đều đã có migration
  riêng từ trước (`20260703032153_add_listening`,
  `20260703042306_add_listening_v2`,
  `20260703043212_fix_listening_answer_v1`,
  `202607050024_fix_listening_session_rating`,
  `20260712170506_add_user_listening_progress`,
  `20260712180154_add_listening_question_hash`) — **không nằm trong 3
  migration pending**. Về mặt file migration, Listening schema không
  phụ thuộc 3 migration đang treo.
- Không thể xác nhận DB thật đã apply đến đâu vì không chạy được lệnh.
  Không tự ý `migrate dev`/`db push`/reset theo đúng chỉ thị.

## 3. Listening Flow — Trước / Sau

**Trước stage này:**

```text
Home -> Topic/Practice start -> Practice (audio + Q&A) -> Finish -> Result -> Rating -> History
```

đã được triển khai đầy đủ về UI + API, nhưng có các lỗ hổng production
(bảo mật, reward integrity, validation, test) liệt kê ở mục 20.

**Sau stage này:** cùng luồng, đã vá các lỗ hổng scoped an toàn (mục 5),
kiến trúc tổng thể (2 pipeline sinh câu hỏi, TTS lưu local disk) giữ
nguyên và được ghi rõ là giới hạn sản xuất (mục 8, 18).

## 4. Audit Table

| Thành phần | Có | Dùng dữ liệu thật | Lỗi/thiếu | Hành động |
| --- | --- | --- | --- | --- |
| `ListeningController` (`/listening/*`) | Có | Có (Prisma) | Rating dùng inline type, không validate | Đã thêm DTO (mục 5) |
| `ListeningJobController` (`/admin/listening-jobs/*`) | Có | Có | **`@Roles('ADMIN')` bị comment — mọi user đăng nhập gọi được** | Đã fix (mục 5) |
| `ListeningService` | Có | Có | Reward XP phát dù finish rỗng; rating không kiểm tra status | Đã fix (mục 5) |
| `ListeningTtsService` (Google TTS) | Có | Có, cache theo hash | Lưu file local disk, không multi-instance safe | `READY_WITH_LIMITATIONS`, ghi nhận |
| `ListeningJobService`/`Processor` (BullMQ) | Có | Có | Cron 02:00 hằng ngày (không chạy mỗi phút) — OK | Không đổi |
| `ListeningAudioBackfillService` | Có | Có | OK | Không đổi |
| Prisma models Listening | Có | Có | Thiếu index `[userId]`, `[status]` trên `ListeningSession` | Ghi nhận, không tự thêm migration |
| Listening tests (`*.spec.ts`) | Có nhưng rỗng | Không | DI provider thiếu → test không phản ánh hành vi thật | Đã bổ sung mock (mục 5) |
| Frontend Home/Topic/Practice/Result/History | Có | Có (API thật, không mock) | Rating không hiển thị trạng thái đã đánh giá | Đã fix (mục 5) |
| Frontend Dictation | Có (placeholder trung thực) | N/A | Đã tự ghi rõ "chưa có API", không giả lập | Giữ nguyên, đúng chuẩn |
| Frontend Dialogue | Có (dùng lại Topic flow) | Có | OK | Không đổi |
| `listening_v0/*` (route + component cũ) | Có, không link trong sidebar | N/A | Route mồ côi, có thể gây nhầm lẫn khi audit route Stage 9 | Ghi nhận, không xoá (ngoài phạm vi) |
| Learning Path integration | Không có | N/A | Listening hiện là practice độc lập, không gắn lesson Learning Path | Ghi nhận đúng theo Stage 4 event map, không phải lỗi |

## 5. Fix Đã Thực Hiện (đúng phạm vi Listening)

### 5.1 BLOCKER — Admin endpoint không có role check

`backend/src/modules/listening-job/listening-job.controller.ts` có
`@UseGuards(JwtAuthGuard, RolesGuard)` nhưng `@Roles('ADMIN')` bị
comment. `RolesGuard.canActivate` trả `true` khi không có metadata
roles (xem `backend/src/common/guards/roles.guard.ts`), nghĩa là **bất
kỳ user đã đăng nhập nào** cũng gọi được `POST
/admin/listening-jobs/generate` và `POST
/admin/listening-jobs/backfill-audio` — hai endpoint trigger hàng loạt
Gemini + Google TTS (tốn phí, có thể bị lạm dụng để DoS quota). Đối
chiếu toàn bộ codebase, đây là admin controller **duy nhất** thiếu
`@Roles`; còn có bằng chứng cụ thể trong
`ListeningHomePage.tsx` có 1 dòng debug đã comment gọi thẳng
`/admin/listening-jobs/backfill-audio` từ trang Home thường.

**Fix:** bật lại `@Roles(UserRole.ADMIN)`, import `UserRole` từ
`@prisma/client` giống các admin controller khác trong repo. Xoá dòng
debug gọi endpoint admin trong `ListeningHomePage.tsx`.

### 5.2 HIGH — Rating không kiểm tra session đã hoàn thành

`rateSession` trước đây chỉ kiểm tra ownership, không kiểm tra
`session.status === 'COMPLETED'`, vi phạm yêu cầu "chỉ session
completed". Đã thêm `ForbiddenException` khi session chưa hoàn thành.

### 5.3 HIGH — Reward phát cho session rỗng (finish ngay sau start)

`finishSession` trước đây luôn gọi `updateListeningMissions` +
`learningXp.publish('LISTENING_COMPLETED')` (base 20 XP) miễn là
transaction complete thành công lần đầu — kể cả khi user gọi
`POST /finish` ngay sau khi `start`, chưa trả lời/skip câu nào
(`correct=wrong=skipped=0`). Đây là lỗ hổng farm reward: XP trực tiếp
từ `xpEarned = correct * 3` đã đúng là 0, nhưng `learningXp.publish` vẫn
cấp `baseXp = 20` không điều kiện (xem `LEARNING_XP_RULES.LISTENING_COMPLETED`),
cộng cả Mission `LISTEN_AUDIO` / `COMPLETE_LESSON` / `STUDY_LESSON`.

**Fix:** thêm biến `attempted = correct + wrong + skipped`; chỉ gọi
Mission progress và `learningXp.publish` khi `attempted > 0`. Session
vẫn được đánh dấu `COMPLETED` (không kẹt `IN_PROGRESS` mãi) nhưng không
phát thưởng nếu người dùng chưa tương tác câu nào.

### 5.4 MEDIUM — API result thiếu rating state

Yêu cầu mục 15: "Result backend trả... Rating state" nhưng
`getSessionResult` trước đây không trả `rating/ratingComment/ratedAt`.
Đã bổ sung 3 field vào `summary`. Frontend (`ListeningResultPage.tsx`)
được cập nhật để prefill số sao và hiển thị "Đã gửi đánh giá · Bấm sao
để sửa" khi đã có rating, thay vì luôn hiện form trống (có thể khiến
user tưởng chưa đánh giá và không biết có thể sửa).

### 5.5 MEDIUM — Rating/comment không có validate thật

`main.ts` bật `ValidationPipe({ whitelist: true, forbidNonWhitelisted:
true })`, nhưng `rating`/`skip`/`flag` dùng inline TS type
(`@Body() body: { rating: number; comment?: string }`) thay vì DTO
class — ValidationPipe của Nest **không validate** khi metatype không
phải class có decorator, nên `comment` có thể dài vô hạn, `rating` chỉ
được code tự `Math.max/min` clamp âm thầm thay vì trả lỗi 400 rõ ràng.

**Fix:** thêm `RateListeningSessionDto` (`class-validator`:
`rating` là `IsInt` `Min(1)` `Max(5)`; `comment` optional
`IsString` `MaxLength(500)`), dùng DTO này ở controller + service.
`skip`/`flag` body giữ nguyên inline type (rủi ro thấp hơn, không có
input tự do dạng text) — ghi nhận là nợ kỹ thuật nhỏ ở mục 14, không
sửa để giữ đúng phạm vi tối thiểu.

### 5.6 Test debt — spec rỗng, thiếu DI mock

`listening.service.spec.ts`, `listening.controller.spec.ts`,
`listening-job.service.spec.ts` trước đây chỉ có test "should be
defined" nhưng **không cung cấp constructor dependencies**
(`PrismaService`, `GeminiService`, `MissionV2ProgressService`,
`ListeningTtsService`, `LearningXpPublisher` cho service; BullMQ queue
token cho job service) — `Test.createTestingModule(...).compile()` sẽ
throw lỗi resolve dependency khi chạy thật, tức các test này gần như
chắc chắn fail nếu CI thực sự chạy `npm test`.

**Fix:** bổ sung mock provider tối thiểu cho cả 3 file, theo đúng
pattern đã dùng ở `writing.service.spec.ts` /
`speaking-processing.service.spec.ts` (mock Prisma theo model,
`getQueueToken(...)` cho BullMQ). Không thể tự chạy `npm test` để xác
nhận PASS trong sandbox này (mục 0) — cần verify thủ công.

## 6. Data Model (không đổi schema)

- `ListeningQuestion`: `level/topic/audioUrl/transcript/question/
  options(Json)/correctAnswer/explanation/duration/isActive/
  questionHash(unique)`. Index `[level, topic, isActive]`. OK.
- `ListeningSession`: `userId/level/topic/total/correct/wrong/skipped/
  score/status/xpEarned/coinsEarned/rating/ratingComment/ratedAt/
  startedAt/completedAt`. **Không có index riêng trên `userId` hay
  `status`** — các query `findFirst({ userId, status: 'IN_PROGRESS' })`
  và lịch sử `findMany({ userId, status: 'COMPLETED' })` hiện chạy
  full/partial scan theo PK hoặc phải dựa vào FK index ngầm của
  `userId` (quan hệ với `User`). Với dữ liệu lớn sẽ chậm dần. **Không tự
  thêm migration** trong stage này (rủi ro đụng 3 migration đang
  pending) — ghi nhận MEDIUM, đề xuất thêm `@@index([userId, status])`
  và `@@index([userId, completedAt])` ở stage sau, cùng lúc với xử lý
  migration ở Chặng 8.
- `ListeningSessionAnswer`: unique `[sessionId, questionId]` — đúng,
  ngăn duplicate answer record cho cùng câu hỏi trong 1 session.
- `UserListeningProgress`: 1-1 với `User` (`@unique userId`), index
  `[currentLevel]`, `[lastStudyDate]`. OK.
- Correct answer luôn thuộc option: được đảm bảo ở tầng generator
  (Gemini output bị lọc bởi `normalizeGeneratedQuestion`/`isValidQuestion`
  yêu cầu đúng 4 label A-D duy nhất và `correctAnswer` thuộc A-D).
- Transcript: **vẫn được trả về trong payload khi câu hỏi CHƯA trả lời**
  (`toQuestionPayload` trả `transcript: question.transcript` không điều
  kiện, so với `correctAnswer`/`explanation` thì có điều kiện `answered
  || isSkipped`). Đây là rò rỉ đáp án tiềm ẩn nếu transcript chứa gợi ý
  trực tiếp câu trả lời — code có comment thừa nhận
  ("Không trả transcript trước khi answer ở UI production. Hiện vẫn
  giữ trong payload để tương thích frontend cũ."). **Không sửa** trong
  stage này vì đây là quyết định tương thích ngược đã ghi chú rõ chủ
  đích, và ẩn transcript có thể phá vỡ UI hiện tại (nút "Xem lời thoại"
  đang dùng chung field) — ghi nhận **HIGH** ở mục 14 để cân nhắc ở
  bước sau khi có thời gian sửa cả BE lẫn FE cùng lúc.

## 7. Session Lifecycle

- Start (`POST /listening/practice/start`): dùng `CurrentUser`, không
  nhận `userId` từ body. Có check session `IN_PROGRESS` cùng
  `(userId, level, topic)` để tránh tạo mới khi đã có — nhưng **đây là
  check-then-act không transaction**: 2 request `startPractice` gửi
  đồng thời (double-click nhanh, hoặc 2 tab) có thể cùng không thấy
  session tồn tại và cùng tạo 2 session `IN_PROGRESS` riêng cho cùng
  `(userId, level, topic)`. Không có unique constraint DB ngăn việc
  này. **MEDIUM**, cần schema (unique index có điều kiện hoặc
  serialize bằng lock) để fix triệt để — ngoài phạm vi an toàn của
  stage này (cần migration), ghi nhận known issue.
- Resume: `getSessionPayload` trả đúng `questions`, `selectedAnswer`,
  `progress`, không tạo session mới, không phụ thuộc localStorage
  (chỉ dùng `sessionStorage` để truyền `finish` result 1 lần, có
  fallback gọi API `result` thật — không phải nguồn sự thật).
- Answer/skip/flag: đều verify ownership qua `getOwnedSession` +
  `getSessionQuestion` (unique `sessionId_questionId`), chặn sửa khi
  `status === 'COMPLETED'` (trừ `flagQuestion`, cố ý cho sửa sau khi
  hoàn thành theo comment trong code — hợp lý, không phải lỗi).
  `submitAnswer` cho phép đổi đáp án trước khi hoàn thành (update, tính
  lại `isCorrect` mỗi lần) — không có tăng đếm dồn (không dùng
  increment cộng dồn), `recalculateSession` luôn tính lại từ toàn bộ
  answers hiện tại trong DB → **an toàn với retry/đổi đáp án nhiều
  lần**, không phát sinh double-count.
- Finish (`POST /finish`): idempotent bằng `updateMany({ where: {
  status: { not: 'COMPLETED' } } })` trong transaction, chỉ request có
  `completion.count === 1` mới được coi là "completed by this request"
  → 2 request `finish` song song chỉ 1 request thực sự trigger
  reward/mission, request còn lại nhận lại state đã completed
  (`alreadyCompleted: true`). Đây là pattern đúng, giống Stage 4/6B.

## 8. Audio / TTS

- Lưu trữ: file MP3 ghi vào `backend/public/listening-audio/<sha256
  hash của transcript>.mp3`, phục vụ qua `BACKEND_PUBLIC_URL`. Cache
  theo hash transcript, không generate lại nếu file đã tồn tại
  (`fs.access` check trước khi gọi TTS) — đáp ứng "không generate lại
  audio mỗi lần GET".
- Concurrent request cùng transcript mới: có race nhỏ (2 request cùng
  không thấy file tồn tại, cùng gọi TTS, cùng ghi đè cùng nội dung) —
  không gây sai dữ liệu (nội dung giống nhau), chỉ tốn thêm 1 lần gọi
  TTS. **LOW**.
- Credential: dùng `new textToSpeech.TextToSpeechClient()` khởi tạo ở
  field class (constructor thời điểm module load), dựa vào
  `GOOGLE_APPLICATION_CREDENTIALS` chuẩn Google Cloud SDK (lazy auth,
  không throw khi construct). Lỗi khi gọi thật (`synthesizeSpeech`)
  được bọc `try/catch`, trả `null`, không làm crash app — đáp ứng yêu
  cầu "credential thiếu không làm app startup crash". **Không xác
  minh được bằng chạy thực tế** trong sandbox này.
- Khi TTS fail, `ensureQuestions` (pipeline đồng bộ trong request user)
  vẫn lưu `ListeningQuestion` với `audioUrl: ''` — có cơ chế
  `ensureMissingAudio`/`ListeningAudioBackfillService` để backfill sau,
  nhưng câu hỏi có thể lọt vào session của user ngay tại thời điểm
  audio chưa sẵn sàng → frontend phải xử lý "audio missing" (đã có,
  xem mục 9).
- **HIGH kiến trúc**: có **2 pipeline sinh câu hỏi** riêng biệt và
  không dùng chung logic dedupe:
  1. `ListeningJobService`/`ListeningJobProcessor` (BullMQ, cron
     02:00, `createQuestionHash` unique theo `level/topic/transcript/
     question`, generate audio **bất đồng bộ** qua job riêng
     `GENERATE_AUDIO`) — đúng kiến trúc mong muốn theo mục 8 yêu cầu.
  2. `ListeningService.ensureQuestions` (gọi trực tiếp từ
     `startPractice`/`continueSession` khi ngân hàng câu hỏi thiếu) —
     gọi **Gemini và Google TTS đồng bộ ngay trong HTTP request của
     user** (vòng lặp `for (const item of valid) { await
     listeningTtsService.createAudioFromTranscript(...) }`), không set
     `questionHash` (dedupe chỉ dựa vào so khớp text trong cùng batch +
     level/topic, yếu hơn), có thể khiến request `POST
     /listening/practice/start` treo nhiều giây nếu phải sinh nhiều câu
     hỏi + audio cùng lúc. Vi phạm trực tiếp yêu cầu mục 8 "Không gọi
     TTS trong mỗi request người dùng nếu không cần".
  - **Quyết định trong stage này**: không rewrite kiến trúc (rủi ro
    cao, ngoài phạm vi "sửa đúng phạm vi" của 1 chặng), chỉ ghi nhận rõ
    là known issue HIGH, đề xuất ở stage sau: khi thiếu câu hỏi,
    `startPractice` nên enqueue job sinh dữ liệu (dùng lại
    `ListeningJobService.enqueueGeneration`) và trả lỗi/tin nhắn "đang
    chuẩn bị bài học" thay vì tự sinh đồng bộ.
- Multi-instance: audio lưu local disk trong container backend — nếu
  deploy nhiều replica backend không có shared volume/object storage,
  request tới các instance khác nhau có thể không thấy file audio vừa
  tạo (dù URL vẫn cùng domain nếu qua load balancer sticky, nhưng ghi
  đọc file khác node sẽ 404). **READY_WITH_LIMITATIONS** — cần volume
  dùng chung (NFS/S3-compatible) trước khi scale nhiều instance.

## 9. Audio Player Frontend

- `ListeningPracticePage.tsx`: audio chỉ phát khi user bấm nút (không
  autoplay) → tự động tránh lỗi autoplay-block của trình duyệt. Có
  handler `onPlay/onPause/onEnded/onTimeUpdate` cập nhật state
  Playing/Paused/currentTime. Không có state "Ended" riêng biệt hiển
  thị UI (chỉ set `isPlaying=false`), chấp nhận được.
- Không có audio URL: `playAudio()` set lỗi rõ ràng ("Câu hỏi chưa có
  audio...") thay vì crash hoặc gọi `.play()` trên `src` rỗng.
- Duration: dùng `currentQuestion.duration` (số nguyên từ backend, có
  `Math.max(..., 1)` khi chia) thay vì `audio.duration` gốc trình
  duyệt → tránh NaN khi metadata chưa load.
- Component unmount: không có `useEffect` cleanup để `pause()` audio
  khi rời trang — nếu user chuyển route nhanh trong khi audio đang
  phát, audio element bị unmount bởi React nên phát cũng dừng theo
  (không phải leak nghiêm trọng, nhưng không tường minh). **LOW**, ghi
  nhận không sửa.
- Transcript trước khi trả lời: **frontend chỉ hiện nút "Xem lời
  thoại" khi `currentQuestion.answered` là true** (điều kiện JSX rõ
  ràng), nên dù backend vẫn gửi `transcript` trong payload câu chưa trả
  lời (mục 6), **UI không hiển thị** nó trước khi trả lời. Vẫn là rò rỉ
  ở tầng network response (DevTools/Network tab thấy được), không phải
  DOM — đúng như đã ghi nhận là known issue HIGH ở mục 6, chỉ giảm nhẹ
  bởi CSS/JS ẩn ở tầng UI chứ chưa triệt để theo đúng yêu cầu "không chỉ
  dùng CSS để giấu transcript / không để trong API response trước
  submit".

## 10. Answer Validation

- DTO `SubmitListeningAnswerDto`: `questionId` string, `selectedAnswer`
  giới hạn `IsIn(['A','B','C','D'])`, `timeSpent` `0-3600s`,
  `listenedCount` `0-100`. Không nhận `isCorrect`/`score` từ client —
  đúng yêu cầu.
- Backend tự tính `isCorrect` bằng so sánh `selectedAnswer` với
  `question.correctAnswer` (uppercase, trim) — không tin client.
- Chống double count: xác nhận ở mục 7, `recalculateSession` tính lại
  toàn bộ mỗi lần, không cộng dồn.
- Đổi đáp án: được phép trước khi `COMPLETED` (không có business rule
  cấm rõ ràng nào bị vi phạm ở source hiện tại) — cập nhật đúng bằng
  `update`, không tạo row mới nhờ unique `[sessionId, questionId]`.

## 11. Mission V2 / Reward

| Hành động | Mission action | Reward source | Idempotency key |
| --- | --- | --- | --- |
| Finish session có ít nhất 1 câu attempt | `LISTEN_AUDIO`, `COMPLETE_LESSON`, `STUDY_LESSON` (luôn), `COMPLETE_QUIZ` (nếu `score >= 50`), `STUDY_MINUTES` | `learningXp.publish('LISTENING_COMPLETED')` → `XpService.awardXp` (`XpTransaction`, `UserXpProfile`, leaderboard) | `learning:LISTENING_COMPLETED:{sessionId}` (tạo trong `LearningXpListener.idempotencyKey`) |
| Finish session (transaction complete) | — | `PetProfile.xp/coins` tăng trực tiếp trong `$transaction` của `finishSession` (không qua Mission/XP pipeline chung) | Bảo vệ bởi `updateMany({status: {not: COMPLETED}})` — chỉ chạy 1 lần/session |
| Rating | — (không phát mission/reward, đúng yêu cầu) | — | — |

Không phát hiện double-count Mission trực tiếp (`updateListeningMissions`
chỉ gọi 1 lần/khi `attempted > 0`, được bảo vệ bởi
`completedByThisRequest`). `PetProfile.xp/coins` và
`UserXpProfile.totalXp` (qua `learningXp.publish`) là **2 hệ thống
reward riêng** (Pet game vs. XP/leaderboard toàn cục) — không trùng
field, không double-award cùng 1 số liệu, khớp với ghi nhận ở
`phase1-stage4-mission-reward-report.md` rằng Listening (và các module
kỹ năng khác) vẫn dùng pattern "mixed" chưa hợp nhất hoàn toàn vào
pipeline `awardXpWithSideEffects`. Đây là nợ kiến trúc đã biết từ
Stage 4, không phải bug mới.

Retry `finish` sau khi đã `COMPLETED`: trả `alreadyCompleted: true,
missionUpdated: false`, không gọi lại Mission/XP — đúng yêu cầu.

## 12. Learning Path Integration

Listening **không tích hợp Learning Path** — không có bất kỳ tham chiếu
`learning-path`/`learningPath` nào trong `backend/src/modules/listening`.
Đây là practice độc lập truy cập qua sidebar (`/listening`), khớp với
bảng event map ở `phase1-stage4-mission-reward-report.md` (nguồn
`LISTENING_COMPLETED` là "existing Listening service", không phải
Learning Path lesson). Vì vậy các yêu cầu ở đề bài mục 14 (resolve path
lesson, complete lesson một lần...) hiện **không áp dụng** cho
Listening — không phải thiếu sót cần vá trong stage này.

## 13. API Contract (Listening)

| Method | Endpoint | Auth | Nhận từ client | Trả về |
| --- | --- | --- | --- | --- |
| GET | `/listening/home` | Cookie JWT | — | stats, continueSession, dailyRecommendation, recentSessions |
| GET | `/listening/history` | Cookie JWT | `page`, `limit` (query) | phân trang session COMPLETED |
| POST | `/listening/practice/start` | Cookie JWT | `level?`, `topic?`, `limit?` | session payload (resume nếu đã có IN_PROGRESS) |
| POST | `/listening/sessions/:id/answer` | Cookie JWT + ownership | `questionId`, `selectedAnswer(A-D)`, `timeSpent`, `listenedCount` | `isCorrect`, `correctAnswer`, `explanation`, `progress` |
| POST | `/listening/sessions/:id/skip` | Cookie JWT + ownership | `questionId`, `timeSpent?`, `listenedCount?` | `progress` |
| POST | `/listening/sessions/:id/flag` | Cookie JWT + ownership | `questionId`, `isFlagged?` | `isFlagged` |
| POST | `/listening/sessions/:id/finish` | Cookie JWT + ownership | — | kết quả + `missionUpdated`, `resultUrl` (idempotent) |
| GET | `/listening/sessions/:id/result` | Cookie JWT + ownership | — | summary (nay có thêm `rating/ratingComment/ratedAt`), questions, feedback |
| POST | `/listening/sessions/:id/rating` | Cookie JWT + ownership + **status COMPLETED (mới)** | `rating(1-5)`, `comment?(<=500 ký tự, mới validate)` | rating đã lưu |
| POST | `/listening/sessions/:id/retry` \| `/continue` | Cookie JWT + ownership | — | session mới (dùng lại câu sai / câu mới) |
| POST | `/admin/listening-jobs/generate` \| `/backfill-audio` | Cookie JWT + **ADMIN role (mới bắt buộc)** | `totalNeed?/batchSize?` hoặc `limit?` | job đã enqueue |

Không endpoint nào nhận `userId`, `isCorrect`, `score`, XP từ client.

## 14. Frontend States

- Home/Topic/Practice/Result/History đều có `loading`, `error` (kèm nút
  "Tải lại"), và trạng thái rỗng hợp lý (`if (!data) return null` sau
  khi xử lý loading/error).
- Practice: double-submit được chặn bằng `submitting` state + `disabled`
  trên nút; `finish()` cũng khoá bằng `submitting`.
- Result: rating giờ hiển thị đúng trạng thái đã đánh giá (mục 5.4),
  chặn double-click bằng `actionLoading`.
- Dictation: **không giả lập** — hiển thị thông báo rõ ràng backend
  chưa hỗ trợ, không gọi API answer giả. Đúng chuẩn "không mock runtime".
- `listening_v0/*`: tồn tại trên filesystem, không có link trong
  `AppSidebar`/`StudySidebar`/`MobileStudyNav` — route mồ côi, nên được
  liệt kê vào Route Audit ở Chặng 9 để quyết định `HIDE`/xoá, không xử
  lý ở đây vì ngoài phạm vi Listening chặng 6D.

## 15. Generator Audit (`ListeningJobService`)

- Config thật trong source: `A1-Daily Life`, `A2-School`,
  `B1-Environment`, `B1-Technology` (đúng như đề cập trong đề bài mẫu).
  `totalNeed = 100`, `batchSize = 5`.
- Cron: `@Cron('0 2 * * *')` — 02:00 mỗi ngày, **không chạy mỗi phút**
  (dòng cron test theo phút đã bị comment sẵn, không active). Đạt yêu
  cầu production cron.
- Validate Gemini JSON: `normalizeGeneratedQuestion` kiểm tra
  `transcript.length >= 20`, đúng 4 option nhãn A-D duy nhất,
  `correctAnswer` thuộc A-D, `duration` clamp 30-120s. Loại bỏ item
  không hợp lệ trước khi lưu.
- Duplicate: `createQuestionHash` (sha256 theo
  `level|topic|transcript|question`) lưu vào field unique
  `questionHash`; xử lý `error.code === 'P2002'` (Prisma unique
  violation) như skip hợp lệ — chống trùng ở cả tầng ứng dụng lẫn DB.
  **Lưu ý**: pipeline đồng bộ trong `ListeningService.ensureQuestions`
  KHÔNG set `questionHash` (mục 8) — nợ kỹ thuật giữa 2 pipeline.
- Audio generation: tách job riêng `GENERATE_AUDIO`, chỉ chạy **sau**
  khi question đã được validate và lưu — đúng yêu cầu thứ tự.
- Retry: `attempts: 4` (batch) / `attempts: 5` (audio) với backoff
  exponential — có giới hạn, không vô hạn.
- Provider failure: lỗi Gemini/TTS trong job chỉ làm job đó fail (bị
  BullMQ retry theo `attempts`), không làm app crash khi khởi động
  (TTS client/Gemini client đều khởi tạo lazy).
- Restart: cron chỉ chạy 1 lần/ngày theo lịch, không tự generate lại
  toàn bộ 100 câu mỗi lần restart app (không có logic chạy lúc
  `onModuleInit`).

## 16. Security

- Toàn bộ endpoint user-facing dùng `@UseGuards(JwtAuthGuard)` ở mức
  controller, user lấy từ `@CurrentUser()` (cookie JWT), không nhận
  `userId` từ body/query.
- Ownership: mọi thao tác trên session đều qua
  `getOwnedSession`/`getSessionQuestion`, ném `ForbiddenException` nếu
  `session.userId !== userId`.
- DTO whitelist: `main.ts` bật `whitelist + forbidNonWhitelisted`
  toàn cục; `StartListeningDto`/`SubmitListeningAnswerDto` dùng DTO
  class đầy đủ; `RateListeningSessionDto` mới bổ sung. `skip`/`flag`
  vẫn dùng inline type (không validate được bởi ValidationPipe, nhưng
  input rủi ro thấp — boolean/optional int).
- Pagination: `getHistory` có `safeLimit = Math.min(Math.max(limit,1),50)`
  — có giới hạn trên.
- Admin endpoint: đã fix ở mục 5.1.
- Rating/comment length: đã fix ở mục 5.5.
- Raw SQL: `rateSession` dùng `$executeRaw` với tagged template
  (`${rating}`, `${comment}`, `${ratedAt}`) — đây là dạng parameterized
  của Prisma (không phải string concatenation), **không phải SQL
  injection**, nhưng không rõ lý do dùng raw thay vì
  `prisma.listeningSession.update(...)` vì các field `rating` /
  `ratingComment` / `ratedAt` đã tồn tại trong schema/generated client.
  Không đổi trong stage này (hành vi đang đúng, đổi sang `update()` là
  refactor không cấp thiết, có thể làm ở lần dọn dẹp sau).

## 17. Files Changed

| File | Thay đổi | Lý do |
| --- | --- | --- |
| `backend/src/modules/listening-job/listening-job.controller.ts` | Bật lại `@Roles(UserRole.ADMIN)` | Chặn user thường trigger Gemini/TTS hàng loạt |
| `backend/src/modules/listening/dto/rate-listening-session.dto.ts` | File mới | DTO validate rating/comment |
| `backend/src/modules/listening/listening.controller.ts` | Dùng `RateListeningSessionDto` | Bật ValidationPipe thật cho rating |
| `backend/src/modules/listening/listening.service.ts` | `rateSession` check `status===COMPLETED`; `finishSession` chỉ phát Mission/XP khi `attempted>0`; `getSessionResult` trả thêm `rating/ratingComment/ratedAt` | Vá reward-farming + rating rule + API contract |
| `backend/src/modules/listening/listening.service.spec.ts` | Thêm mock DI đầy đủ | Test cũ thiếu provider, sẽ fail khi chạy thật |
| `backend/src/modules/listening/listening.controller.spec.ts` | Thêm mock `ListeningService` | Tương tự |
| `backend/src/modules/listening-job/listening-job.service.spec.ts` | Thêm mock BullMQ queue token | Tương tự |
| `english-web-build/src/Components/Listening/ListeningHomePage.tsx` | Xoá dòng debug gọi admin endpoint | Dọn dẹp, giảm rủi ro bảo mật vô tình bật lại |
| `english-web-build/src/Components/Listening/ListeningResultPage.tsx` | Prefill rating từ `summary`, cho sửa rating | Khớp API contract mới, UX rating đúng |
| `english-web-build/src/Components/Listening/listening.types.ts` | Thêm `rating/ratingComment/ratedAt` vào `ListeningResultResponse.summary` | Khớp backend |

Không sửa file ngoài phạm vi Listening. Không chạy formatter toàn repo,
không lint `--fix`.

## 18. Tests

| Mục | Kết quả |
| --- | --- |
| `npx prisma format` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma validate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma generate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma migrate status` | `BLOCKED BY ENVIRONMENT` |
| Backend build (`npm run build`) | `BLOCKED BY ENVIRONMENT` |
| Listening tests (`npm test -- listening`) | `BLOCKED BY ENVIRONMENT` — đã sửa mock DI để test **có thể** compile được khi chạy thật, nhưng chưa tự xác nhận PASS |
| Mission/Reward regression | `NOT RUN` (không sửa mission/reward core, chỉ sửa call site trong Listening) |
| Learning Path regression | `NOT AVAILABLE` — Listening không tích hợp Learning Path (mục 12) |
| Vocabulary/Grammar/Reading/Writing/Speaking smoke test | `NOT RUN` — ngoài phạm vi, không sửa các module này |
| Frontend build (`npm run build`) | `BLOCKED BY ENVIRONMENT` |
| `git status` / `git diff --stat` / `git diff --check` | `BLOCKED BY ENVIRONMENT` |

**Xác nhận thủ công thay thế**: đã đọc lại toàn bộ file đã sửa
(controller, service, DTO, spec) bằng công cụ Read sau khi edit để rà
soát cú pháp TypeScript/JSX bằng mắt (không thay thế được `tsc`/`jest`
thật). Cần chạy lại đầy đủ bảng trên ở môi trường có sandbox hoạt động
trước khi merge.

## 19. Lint Debt

Không chạy được `npm run lint` (môi trường). Không chạy lint `--fix`
theo đúng chỉ thị. Không có cách xác nhận lỗi lint mới/cũ trong stage
này — ghi `NOT RUN`.

## 20. Known Issues

### BLOCKER

- (Đã fix) Admin Listening job endpoint không có role check — xem mục
  5.1. Cần xác nhận lại bằng build/test thật trước khi coi là đóng.

### HIGH

1. Reward-farming khi finish session rỗng — đã fix (mục 5.3), cần test
   thật để xác nhận không có tác dụng phụ (ví dụ: một số flow legacy
   FE có thể trông cậy vào `missionUpdated` luôn `true`).
2. Transcript vẫn nằm trong response API trước khi trả lời (mục 6, 9)
   — chỉ được ẩn ở tầng UI, chưa ẩn ở tầng response. Cần sửa cả BE
   (không trả `transcript` cho câu `answered === false`) lẫn FE (đảm
   bảo UI không phụ thuộc transcript sớm) trong 1 lần đổi để tránh vỡ
   tương thích.
3. Kiến trúc sinh câu hỏi có 2 pipeline (đồng bộ trong request user vs.
   BullMQ job), pipeline đồng bộ gọi Gemini + Google TTS ngay trong
   request `startPractice`/`continueSession` — vi phạm khuyến nghị
   "không gọi TTS mỗi request người dùng", rủi ro timeout khi ngân
   hàng câu hỏi cạn. Đề xuất chuyển hẳn sang enqueue job khi thiếu dữ
   liệu.
4. Race condition tạo 2 session `IN_PROGRESS` cùng
   `(userId, level, topic)` khi có 2 request `start` đồng thời (không
   transaction/lock, không unique constraint DB). Cần schema fix
   (partial unique index) — để dành cho Chặng 8 (đi cùng migration).

### MEDIUM

1. `ListeningSession` thiếu index `[userId, status]` /
   `[userId, completedAt]` — ảnh hưởng hiệu năng khi dữ liệu lớn, cần
   thêm ở đợt migration sau.
2. `skip`/`flag` body vẫn dùng inline type, không được ValidationPipe
   validate thật (rủi ro thấp nhưng nên đồng bộ hoá với `rating` khi
   có dịp).
3. Audio lưu local disk (`backend/public/listening-audio`) — không an
   toàn khi scale nhiều instance backend nếu không có shared
   volume/object storage.
4. `rateSession` dùng `$executeRaw` thay vì `prisma.update` dù field đã
   có trong schema — không phải bug nhưng là code smell, nên dọn dẹp.

### LOW

1. `listening_v0/*` là route mồ côi (không link từ sidebar) — nên được
   xử lý ở Route Audit Chặng 9 (`HIDE` hoặc xoá).
2. Race nhỏ khi 2 request cùng lúc generate audio cho cùng transcript
   mới (ghi đè cùng nội dung, không sai dữ liệu).
3. Audio `<audio>` element không có cleanup `pause()` tường minh khi
   component unmount.

## 21. Checklist

- [x] Đọc report các stage trước (`stage2`-`stage6b`); `stage6c` NOT FOUND.
- [x] Audit toàn bộ backend Listening (controller/service/DTO/TTS/job/
      processor/backfill/prisma).
- [x] Audit toàn bộ frontend Listening (Home/Topic/Practice/Result/
      History/Dictation/Dialogue/helpers/types/hook/routes).
- [x] Lập bảng audit + danh sách lỗi có severity.
- [x] Sửa lỗi đúng phạm vi (bảo mật admin endpoint, rating rule, reward
      farming, API contract rating, test DI, dọn debug code).
- [ ] Chạy build/test thật — `BLOCKED BY ENVIRONMENT`, cần chạy lại
      trên máy có sandbox hoạt động.
- [x] Viết report này với production decision trung thực.

## 22. Production Decision

**`READY_WITH_LIMITATIONS`**

Lý do không phải `READY`:

- Không thể tự chạy `prisma migrate status`, backend/frontend build,
  và test suite trong phiên này (môi trường lỗi) — theo đúng nguyên
  tắc "không tuyên bố PASS giả", các thay đổi code **chưa được xác
  nhận bằng build/test thật**.
- Audio/TTS pipeline đồng bộ trong request (mục 8, HIGH #3) chưa được
  sửa tận gốc — chỉ ghi nhận, có rủi ro timeout khi ngân hàng câu hỏi
  cạn ở topic/level ít người học.
- Transcript vẫn lộ trong API response trước khi trả lời (HIGH #2).
- Race condition tạo trùng session `IN_PROGRESS` (HIGH #4) cần schema
  fix ở Chặng 8.
- Audio lưu local disk chưa multi-instance safe (MEDIUM #3).

Lý do không phải `HIDE`: luồng chính (Home → chọn level/topic → start
→ nghe → trả lời → finish idempotent → result → rating → history) hoạt
động đúng logic khi đọc source, có ownership/auth/idempotency đúng
chuẩn, không có mock runtime, và các lỗ hổng nghiêm trọng nhất (admin
endpoint không role-check, reward-farming session rỗng, rating thiếu
validate/status-check) đã được vá trong phạm vi an toàn.

**Điều kiện để nâng lên `READY`:** chạy lại đầy đủ bảng mục 18 trên môi
trường có sandbox hoạt động (đặc biệt: build pass, Listening test suite
pass sau khi thêm mock DI, `prisma migrate status` xác nhận Listening
schema đã ở đúng trạng thái so với 3 migration pending), và xử lý ít
nhất HIGH #2 (transcript leak) trước khi go-live thật.
