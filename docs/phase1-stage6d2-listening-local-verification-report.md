# Phase 1 - Stage 6D.2: Listening Local Verification

## 1. Executive Summary

Mục tiêu của chặng này là chạy **thật** toàn bộ command (git, prisma,
build, test, lint) để xác nhận các thay đổi ở Chặng 6D/6D.1 không chỉ
đúng về logic đọc source mà còn thật sự build/test pass. Kết quả:
**không thực hiện được** — công cụ shell (`mcp__workspace__bash`) của
phiên làm việc này không khởi động được trong suốt 3 lần thử ở chặng
này (tổng cộng 7+ lần tính từ đầu Chặng 6D.1), luôn báo cùng một lỗi:
`Not enough disk space to set up the workspace. Free up space and try
again.` — lỗi xảy ra **trước khi** máy ảo thực thi lệnh được mount,
nên không có bất kỳ lệnh nào (kể cả `echo`) chạy được. Đây là hạ tầng
phía môi trường thực thi lệnh của phiên Cowork này, không phải dữ liệu
trong `D:\elearning-english`.

Do đó, **Stage 7 Gate: `CLOSED`**. Trong phạm vi không cần shell (đọc
source, review logic, đối chiếu migration SQL với schema/code), đã làm
thêm được: phát hiện và sửa 1 vấn đề tài liệu sai lệch trong migration
mới (gợi ý status `'ABANDONED'` không tồn tại trong code), xác nhận lại
chính xác số lượng test thật (22, không phải 23 như report trước ước
lượng), và review kỹ business rule của partial unique index.

## 2. Environment

| Mục | Giá trị |
| --- | --- |
| OS (sandbox) | Không xác định được — `uname`/`ver` không chạy được |
| Node | Không xác định được |
| npm | Không xác định được |
| PostgreSQL | Không xác định được (không kết nối được, không có `psql`/Prisma chạy được) |
| Redis | Không xác định được |
| Disk | Không xác định được — chính lỗi disk là nguyên nhân workspace không khởi động, nhưng không có cách nào (kể cả `df -h`) chạy để đo chính xác |

Tất cả `BLOCKED BY ENVIRONMENT`. Không có công cụ thay thế nào trong bộ
Read/Write/Edit/Glob/Grep hiện có cho phép truy vấn các thông tin này.

## 3. Git Diff Review

Không có `git` (không có shell). Thay thế bằng liệt kê thủ công dựa
trên chính lịch sử thao tác Write/Edit của agent qua 3 chặng (6D, 6D.1,
6D.2) — đáng tin cậy vì agent là bên duy nhất đã sửa các file này trong
phiên làm việc:

**Listening backend:**
- `backend/src/modules/listening/listening.controller.ts`
- `backend/src/modules/listening/listening.service.ts`
- `backend/src/modules/listening/listening-tts.service.ts`
- `backend/src/modules/listening/dto/rate-listening-session.dto.ts` (mới)
- `backend/src/modules/listening-job/listening-job.controller.ts`
- `backend/src/modules/listening-job/listening-job.service.ts`

**Listening frontend:**
- `english-web-build/src/Components/Listening/ListeningHomePage.tsx`
- `english-web-build/src/Components/Listening/ListeningResultPage.tsx`
- `english-web-build/src/Components/Listening/listening.types.ts`

**Guard/shared (dùng chung, sửa vì trực tiếp phục vụ fix bảo mật Listening):**
- `backend/src/common/guards/roles.guard.ts`

**Prisma migration:**
- `backend/prisma/migrations/20260719120000_add_listening_active_session_unique/migration.sql` (mới, chưa apply, đã sửa lại comment ở Chặng 6D.2)

**Tests:**
- `backend/src/modules/listening/listening.service.spec.ts`
- `backend/src/modules/listening/listening.controller.spec.ts`
- `backend/src/modules/listening-job/listening-job.service.spec.ts`
- `backend/src/modules/listening/dto/rate-listening-session.dto.spec.ts` (mới)
- `backend/src/common/guards/roles.guard.spec.ts` (mới)

**Report:**
- `docs/phase1-stage6d-listening-report.md` (mới)
- `docs/phase1-stage6d1-listening-verification-report.md` (mới)
- `docs/phase1-stage6d2-listening-local-verification-report.md` (file này, mới)

**Unrelated:** không có. Không phát hiện file nào ngoài danh sách trên
bị agent sửa. Không thể loại trừ 100% khả năng có thay đổi khác của
người dùng nằm ngoài lịch sử thao tác của agent (vì không chạy được
`git status`/`git diff` để đối chiếu với working tree thật) — đây là
giới hạn cần lưu ý, không phải khẳng định tuyệt đối.

## 4. Migration Inventory

| Migration | Status | Dependency | Safe to apply |
| --- | --- | --- | --- |
| `20260717034435_add_chat_session` | Không xác nhận được qua `migrate status` (BLOCKED). Theo báo cáo trước: pending | — | Ngoài phạm vi Listening, không đánh giá |
| `20260717040228_add_chat_pet_feature` | Không xác nhận được (BLOCKED). Theo báo cáo trước: pending | Sau `add_chat_session` | Ngoài phạm vi Listening, không đánh giá |
| `20260718090000_add_mission_progress_event_v2` | Không xác nhận được (BLOCKED). Theo báo cáo trước: pending | Sau `add_chat_pet_feature` | Ngoài phạm vi Listening, không đánh giá |
| `20260719120000_add_listening_active_session_unique` | File tồn tại trên đĩa (xác nhận bằng Glob), **chưa apply** (không xác nhận được bằng `migrate status` vì BLOCKED, nhưng chắc chắn chưa apply vì được tạo trong chính phiên làm việc này và không có lệnh apply nào từng chạy) | Sau `20260718090000_add_mission_progress_event_v2` theo thời gian; phụ thuộc dữ liệu vào các migration Listening trước đó (`20260703032153_add_listening` và các bản fix) vì thao tác trực tiếp trên bảng `ListeningSession` | **Chưa xác định** — xem mục 5 (audit duplicate không chạy được) |

Không tạo migration mới ở Chặng 6D.2 (chỉ sửa comment trong migration
`20260719120000` — file này **chưa apply ở bất kỳ đâu** nên sửa comment
là an toàn, không vi phạm nguyên tắc "không sửa migration đã apply").

## 5. Duplicate Data Audit

**Không chạy được.** Audit yêu cầu kết nối PostgreSQL thật (qua
`psql`, `prisma studio`, hoặc script Node dùng Prisma Client) — cả ba
đều cần shell, và shell không khởi động được (mục 1, 2).

Query cần chạy (đã có sẵn trong comment của migration
`20260719120000`, khớp đúng logic của partial unique index ở mục 6):

```sql
SELECT "userId", "level", "topic", COUNT(*) AS active_count,
       array_agg("id") AS session_ids,
       array_agg("startedAt") AS started_at_list
FROM "ListeningSession"
WHERE "status" = 'IN_PROGRESS'
GROUP BY "userId", "level", "topic"
HAVING COUNT(*) > 1;
```

Kết quả mong đợi theo yêu cầu đề bài (User ID, topic/context, số active
sessions, session IDs, createdAt/updatedAt, status) **không thể thu
thập được** trong phiên này.

**Kết luận migration**: `CANNOT_AUDIT — BLOCKED BY ENVIRONMENT`. Đây
**không phải** `SAFE_TO_APPLY_IN_DEV` (vì chưa xác nhận được không có
duplicate) và cũng không phải `BLOCKED` theo nghĩa "đã audit và phát
hiện lỗi" — là một trạng thái riêng: **chưa audit được nên không được
apply**, theo đúng nguyên tắc mục 14 của đề bài (mặc định chỉ audit,
không apply; ở đây thậm chí audit cũng chưa thực hiện được). Không tự
ý dùng `db push` hoặc bỏ qua audit để apply liều.

## 6. Partial Unique Index Review

Đọc lại toàn bộ SQL (mục 4 ở trên) đối chiếu với
`backend/prisma/schema.prisma` (model `ListeningSession`, dòng
~1318-1339) và `backend/src/modules/listening/listening.service.ts`:

```sql
CREATE UNIQUE INDEX "ListeningSession_active_userId_level_topic_key"
    ON "ListeningSession" ("userId", "level", "topic")
    WHERE "status" = 'IN_PROGRESS';
```

Rà theo đúng danh sách lỗi cần phát hiện trong đề bài:

| Kiểm tra | Kết quả |
| --- | --- |
| Unique chỉ theo `userId` khiến không học song song nhiều lesson | **Không xảy ra** — khoá gồm `(userId, level, topic)`, khớp đúng đơn vị "phiên đang học" mà `startPractice()` dùng để tìm session active (`findFirst({where:{userId,level,topic,status:'IN_PROGRESS'}})`). User vẫn học song song nhiều `(level, topic)` khác nhau bình thường. |
| Unique theo `userId + lessonId` nhưng session không có `lessonId` | N/A — `ListeningSession` không có khái niệm `lessonId` (Listening không tích hợp Learning Path, đã ghi nhận ở Chặng 6D mục 12), đơn vị đúng là `(level, topic)`. |
| **Nullable column làm unique không hoạt động như mong đợi** | **CÓ, xác nhận là vấn đề thật.** `level String?` và `topic String?` trong schema là nullable. Postgres coi mỗi `NULL` là khác biệt với `NULL` khác trong unique index (kể cả partial), nên nếu có row `IN_PROGRESS` với `level`/`topic` là `NULL`, index **không** chặn được duplicate cho các row đó. Đã audit toàn bộ code path tạo session (`startPractice`, `continueSession`, `retrySession` → `createSessionPayload`) và xác nhận **hiện tại luôn resolve `level`/`topic` về chuỗi non-null** trước khi insert (có fallback `?? 'B1'` / `getDailyListeningTopic(...)`), nên đây là **rủi ro tiềm ẩn, chưa phải bug đang xảy ra** với code hiện tại. Đã ghi rõ giới hạn này vào comment migration (mục sửa ở Chặng 6D.2), **không** đổi nullability trong stage này (đổi sang `NOT NULL` là schema change riêng, cần audit dữ liệu NULL hiện có trước — ngoài phạm vi "chỉ sửa lỗi trực tiếp làm build/test/migration fail"). |
| Status condition thiếu một active status | **Không** — cột `status` là `String` tự do (không phải enum), và toàn bộ code Listening hiện tại chỉ thực sự dùng đúng 2 giá trị: `'IN_PROGRESS'` và `'COMPLETED'`. `WHERE status = 'IN_PROGRESS'` bao phủ đúng và đủ trạng thái "active" duy nhất hiện có. |
| Status condition giữ cả FAILED là active dù retry cần tạo mới | N/A — không có giá trị `'FAILED'` nào được dùng trong Listening. |
| Completed session vẫn lọt vào active condition | **Không** — `WHERE status = 'IN_PROGRESS'` loại trừ chính xác session `'COMPLETED'`, cho phép tạo attempt mới sau khi hoàn thành (đúng yêu cầu "sau completion có thể tạo attempt mới"). |
| Index name quá dài hoặc trùng | **Không** — `ListeningSession_active_userId_level_topic_key` dài 47 ký tự (giới hạn Postgres identifier là 63 byte). Đã grep toàn bộ `backend/prisma/migrations/` cho tên index này — chỉ xuất hiện đúng 1 lần (trong chính migration này), không trùng. |
| Prisma schema không thể biểu diễn index nhưng migration SQL vẫn hợp lệ | **Đúng, đây là tình trạng đã biết và chấp nhận được** — Prisma DSL hiện không hỗ trợ partial index (`WHERE` clause) trong `@@unique`/`@@index`. SQL migration độc lập với `schema.prisma` là cách làm chuẩn cho trường hợp này, không phải lỗi. `npx prisma validate`/`format`/`generate` chỉ kiểm tra `schema.prisma`, không đối chiếu migration nên không bị ảnh hưởng (chưa xác nhận bằng chạy lệnh thật — xem mục 7). |

**Code P2002 fallback đối chiếu**: `createSessionPayload()` trong
`listening.service.ts` dùng đúng cùng điều kiện
`{userId, level, topic, status: 'IN_PROGRESS'}` để query lại session
khi bắt được `P2002` — khớp chính xác với điều kiện `WHERE` của index,
không có sai lệch giữa index và code fallback.

**Kết luận mục 6**: index đúng đắn về mặt thiết kế, business rule khớp
với code. Vấn đề duy nhất phát hiện (nullable level/topic) là rủi ro
latent, không phải bug đang hoạt động, đã ghi nhận rõ trong migration.
**Không cần tạo migration thứ hai** để sửa migration hiện tại — migration
hiện tại đúng, chỉ cần sửa comment (đã làm) và ghi nhận known issue
(mục 20).

## 7. Prisma Commands

| Lệnh | Kết quả |
| --- | --- |
| `npx prisma format` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma validate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma generate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma migrate status` | `BLOCKED BY ENVIRONMENT` |

Không có lệnh nào trong nhóm này chạy được. Không giả định report cũ
(`phase1-stage6d1...`) còn đúng — số liệu migration pending ở mục 4 vẫn
ghi theo report cũ **kèm chú thích rõ "không xác nhận được"**, không
khẳng định là hiện trạng thật.

## 8. Backend Build

`npm run build`: `BLOCKED BY ENVIRONMENT`.

Không chạy được nên không có lỗi nào để sửa theo quy trình mục 5 của đề
bài (Prisma P2002 helper, import thừa, DTO class imports, RolesGuard,
status enum/type, payload mapper, queue service return types, optional
env config, test mock types). Đã tự rà soát tĩnh lại các điểm rủi ro
cao nhất bằng Read/Grep (không thay thế `tsc`):

- `isUniqueConstraintError()` trong `listening.service.ts` dùng
  `'code' in error && (error as {code?:string}).code === 'P2002'` —
  cú pháp hợp lệ, khớp pattern đã dùng ở
  `listening-job.processor.ts` (đã có sẵn từ trước, cùng pattern).
- Import mới trong `listening.service.ts`
  (`ListeningJobService`, `ListeningAudioBackfillService`) — đã xác
  nhận lại đường dẫn `../listening-job/listening-job.service` và
  `../listening-job/listening-audio-backfill.service` tồn tại đúng vị
  trí (Glob xác nhận).
- `RolesGuard` — đã đọc lại `roles.guard.ts` sau khi sửa, cú pháp hợp
  lệ (`Boolean(user?.role) && requiredRoles.includes(user.role)`).
- Test mock types: các file `.spec.ts` dùng `useValue` với object
  thường (không ép kiểu chặt) — pattern giống các spec khác đã có sẵn
  trong repo (`writing.service.spec.ts`, `speaking-processing.service.spec.ts`),
  rủi ro type-check thấp nhưng **chưa được `tsc` xác nhận thật**.

**Không có blocker nào được phát hiện qua đọc source**, nhưng đây
không phải là "build pass" — chỉ là "không tìm thấy lỗi rõ ràng bằng
mắt". Ghi đúng theo yêu cầu: không tuyên bố PASS.

## 9. Test Discovery

`npm test -- listening`: `BLOCKED BY ENVIRONMENT`. `npx jest
--listTests`: `BLOCKED BY ENVIRONMENT`.

Đếm thủ công bằng Grep số khai báo `it(` thật trong từng file (đáng
tin cậy hơn ước lượng bằng mắt ở report trước — report Chặng 6D.1 ghi
"23", con số chính xác sau khi đếm lại là **22**, đã sửa lại ở đây,
đúng theo chỉ thị "không giả định report cũ còn chính xác"):

| Suite (file) | Tests (đếm `it(`) | Pass | Fail | Skip |
| --- | ---: | ---: | ---: | ---: |
| `listening.service.spec.ts` | 7 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `listening.controller.spec.ts` | 1 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `listening-job.service.spec.ts` | 1 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `rate-listening-session.dto.spec.ts` | 7 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `roles.guard.spec.ts` | 6 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| **Tổng** | **22** | — | — | — |

Không coi bất kỳ dòng nào ở trên là "PASS ngầm định". `NOT RUN` là
trạng thái chính xác vì Jest thật sự chưa từng được gọi.

## 10. Transcript Security

Không chạy được test thật (mục 9), nên **không thể xác nhận bằng thực
thi** rằng field bị loại khỏi JSON serialize (yêu cầu quan trọng nhất
của đề bài mục 7: "Không chỉ kiểm tra value `undefined`; xác minh field
không bị serialize ra JSON"). Đọc lại source một lần nữa để làm rõ điểm
này bằng phân tích tĩnh:

- `toQuestionPayload()` trả `transcript: null` (không phải bỏ hẳn
  field) — nghĩa là khi Nest serialize response thành JSON,
  `"transcript": null` **vẫn xuất hiện trong JSON** (giá trị `null`,
  không phải field bị xoá hoàn toàn). Tương tự `correctAnswer: null`,
  `explanation: null` khi chưa `revealed`.
- Đây là khác biệt so với cách diễn giải "field không tồn tại trong
  JSON" mà đề bài mục 7 nhấn mạnh. Về mặt bảo mật, `null` **không làm
  lộ nội dung thật** (không có cách nào suy ra transcript thật từ giá
  trị `null`), nên mục tiêu "không lộ đáp án/ngữ liệu" đã đạt — nhưng
  nếu contract yêu cầu nghiêm ngặt "field không được tồn tại trong
  response" (ví dụ để giảm kích thước payload hoặc tránh lộ cấu trúc
  field cho client debug), thì cách làm hiện tại (`null`) **chưa khớp
  100%** với cách diễn đạt đó. Ghi nhận là **MEDIUM**, không sửa trong
  stage này vì đổi từ "field = null" sang "field không tồn tại" đòi hỏi
  đổi kiểu trả về (dùng `undefined` + kiểm tra `JSON.stringify` có loại
  bỏ `undefined` field tự động — Express/Nest mặc định loại bỏ field
  `undefined` khi serialize JSON, khác với `null` luôn được giữ) — đây
  là thay đổi hợp lý nhưng cần build/test thật để xác nhận không phá
  vỡ frontend (frontend hiện tại đọc `currentQuestion.transcript` và
  check truthy/falsy, `undefined` và `null` đều falsy nên về lý thuyết
  tương thích, nhưng cần test thật trước khi đổi).
- 6 case yêu cầu ở mục 7 đề bài (start không có 3 field, resume không
  có, sau answer có, sau skip có, câu chưa answer/skip vẫn không lộ,
  result completed có đủ) — đã có 1 test tổng hợp
  (`transcript/correctAnswer/explanation không lộ trước khi trả lời`)
  bao phủ resume + revealed/chưa-revealed cùng lúc, **nhưng chưa tách
  đủ 6 case riêng biệt** như liệt kê, và **chưa chạy được** để xác nhận
  pass. Đây vẫn là khoảng trống so với yêu cầu đầy đủ của đề bài.

**Kết luận**: `NOT RUN`, có 1 vấn đề thiết kế đáng lưu ý (null vs. field
absent) chưa xử lý.

## 11. Admin Authorization

Không chạy được HTTP thật hay Jest thật. Đọc lại source lần nữa cho đủ
6 case của đề bài:

| Case | Trạng thái |
| --- | --- |
| Anonymous → 401 | Suy luận đúng từ thứ tự `@UseGuards(JwtAuthGuard, RolesGuard)` (Passport `JwtAuthGuard` chạy trước, chặn request không có JWT hợp lệ bằng 401 trước khi `RolesGuard` được gọi) — **chưa test e2e thật để xác nhận**, chỉ suy luận từ NestJS guard execution order (hành vi chuẩn của framework, không phải code tự viết nên rủi ro thấp nhưng vẫn `NOT RUN`). |
| STUDENT → 403 | Có unit test (`roles.guard.spec.ts`), `NOT RUN`. |
| TEACHER → 403 | Có unit test, `NOT RUN`. |
| ADMIN → được phép | Có unit test, `NOT RUN`. |
| Thiếu `request.user` không crash 500 | Có unit test xác nhận `canActivate()` không throw (dùng `expect(() => ...).not.toThrow()`), `NOT RUN`. |
| Không có frontend production call tới admin endpoint | **Đã xác nhận bằng Grep thật** (không cần chạy code) — tìm `admin/listening-jobs` (case-insensitive) trong toàn bộ `english-web-build` (trừ `node_modules`): **0 kết quả**. Đây là mục duy nhất trong bảng này có thể khẳng định chắc chắn mà không cần shell. |

## 12. Reward Farming

Không chạy được test thật. 5 test case tương ứng đã được viết trong
`listening.service.spec.ts` ở Chặng 6D.1 (start→finish rỗng, có 1
answer→finish, finish lần 2, 2 finish "thắng-thua" transaction, — case
"rating không phát reward" xác nhận bằng đọc code, chưa có test riêng).
Toàn bộ `NOT RUN`. Không phát hiện thêm vấn đề mới khi đọc lại source ở
Chặng 6D.2 so với phân tích đã có ở report Chặng 6D.1 mục 7 (giữ
nguyên kết luận: `attempted` tính từ DB, không nhận từ client, không
double-count do `update()` trên unique key + tính lại toàn bộ mỗi lần,
idempotency key ổn định theo `sessionId`).

## 13. Rating Validation

Không chạy được test thật. `rate-listening-session.dto.spec.ts` (7
test, mục 9) bao phủ: hợp lệ không comment, hợp lệ có comment, reject
rating=0, reject rating=6, reject rating không phải số, reject comment
>500 ký tự, reject thiếu rating. **Chưa có test riêng cho "DTO field
dư → reject nếu ValidationPipe forbid"** (case 6 trong yêu cầu đề bài)
— đây dùng `forbidNonWhitelisted: true` ở cấp global (`main.ts`, đã xác
nhận từ Chặng 6D), áp dụng cho mọi DTO kể cả `RateListeningSessionDto`,
nhưng chưa viết test gửi field thừa (ví dụ `{rating:5, isCorrect:true}`)
để xác nhận `forbidNonWhitelisted` thật sự reject ở tầng
`ValidationPipe` (test hiện tại chỉ dùng `class-validator.validate()`
trực tiếp trên instance DTO, **không đi qua `ValidationPipe`/
`whitelist`/`forbidNonWhitelisted` thật**, nên không kiểm tra được hành
vi "field dư bị strip hoặc reject" — đây là khoảng trống thật, ghi nhận
MEDIUM). "Session chưa completed → reject" và "session user khác →
reject" đã verify bằng đọc code (`rateSession` gọi `getOwnedSession`
rồi check `status !== 'COMPLETED'`), chưa có test tích hợp cấp
service/controller cho riêng rating (chỉ có test DTO-level).

## 14. Concurrent Start

Không chạy được test thật, không có DB thật để tạo race condition thật
(cần 2 connection đồng thời gọi `create()`). Đã review lại logic (mục
6, 9 report Chặng 6D.1) — không phát hiện thêm vấn đề mới. Chưa có test
mock giả lập `create()` throw `P2002` ở lần gọi thứ 2 để verify code
catch hoạt động đúng ở mức unit (không cần DB thật, có thể mock
`prismaMock.listeningSession.create` reject với `{code:'P2002'}` lần
gọi thứ 2) — đây là gap có thể lấp trong đợt sau, chưa làm trong
Chặng 6D.2 vì ưu tiên xử lý blocker môi trường trước.

## 15. Async Gemini/TTS

Grep toàn bộ `backend/src/modules/listening` cho các pattern đề bài
yêu cầu (`generate`, `synthesize`, `textToSpeech`, `Gemini`,
`Promise.all`, `for (`, `while (`) — khớp trong 3 file: `listening-tts.service.ts`,
`listening.service.ts`, `listening.module.ts` (và chính
`listening.service.spec.ts`, không tính vì là test).

Đọc lại từng vị trí:

- `listening.service.ts`: vòng lặp `for (const item of valid)` **chỉ
  còn tồn tại bên trong `coldStartSynchronousFallback()`**, với `valid`
  đã bị `.slice(0, cap)` giới hạn tối đa `COLD_START_FALLBACK_CAP = 3`
  phần tử trước khi vào vòng lặp — không còn `for`/`while` nào lặp
  không giới hạn trong đường đi chính (`ensureQuestions` nhánh
  `existed > 0` hoặc `shortfall === 0` không có vòng lặp TTS nào, chỉ
  gọi `enqueue*Async()` — các hàm này gọi `.catch()` (fire-and-forget),
  không `await` chờ kết quả trong luồng request).
- Không có nested retry vô hạn: `generateQuestionsByGemini()` gọi
  `this.geminiService.generateJson(prompt)` đúng 1 lần (không tự retry
  ở tầng `ListeningService` — retry thật sự nằm trong
  `GeminiService.generateJson()` với giới hạn `3 retry × 2 models`,
  timeout `30000ms`/lần, đã xác nhận ở Chặng 6D — không đổi ở 6D.1/6D.2).
- Timeout: không có timeout riêng ở `coldStartSynchronousFallback()`,
  phụ thuộc hoàn toàn vào timeout nội tại của `GeminiService`
  (30s × tối đa 6 lần thử = tối đa ~180s trong trường hợp xấu nhất) +
  timeout của Google TTS SDK (không có timeout tường minh, phụ thuộc
  cấu hình mặc định của `@google-cloud/text-to-speech`). Đây là **giới
  hạn chưa xử lý** — cold-start fallback có thể vẫn mất nhiều giây tới
  vài phút nếu Gemini chậm, dù đã giới hạn số lượng câu hỏi. Ghi nhận
  MEDIUM.
- Cooldown: dùng `Map<string, number>` **in-memory** trên instance
  `ListeningService` (`coldStartCooldown`), key theo `level|topic`, TTL
  logic 60 giây (`Date.now() - lastTriggeredAt < COLD_START_COOLDOWN_MS`).
  **Ghi rõ theo đúng yêu cầu đề bài**: đây **không đồng bộ giữa nhiều
  instance backend** — nếu deploy nhiều replica (Node process khác
  nhau), mỗi instance có `Map` riêng, cooldown không chia sẻ được, nên
  N instance có thể cùng trigger fallback đồng thời (tối đa N × 3 câu
  thay vì 3 câu) trong kịch bản xấu nhất multi-instance. Không dùng
  Redis cho cooldown này (khác với các cơ chế idempotency khác trong
  hệ thống vốn dùng Postgres/Redis) — đây là lựa chọn có ý thức để giữ
  thay đổi tối thiểu, nhưng là giới hạn thật khi scale nhiều instance.
- Không cần bỏ fallback (đúng giới hạn: tối đa 3 câu, có cooldown, có
  log) — production decision phải ghi rõ limitation này (đã ghi ở mục
  21).

## 16. Audio Storage

- `LISTENING_AUDIO_STORAGE_DIR`: đọc lại `listening-tts.service.ts` —
  `process.env.LISTENING_AUDIO_STORAGE_DIR?.trim() || join(process.cwd(),
  'public', 'listening-audio')` — có default dev hợp lý
  (`public/listening-audio` tương đối theo `cwd`, không hard-code
  `D:\...` hay path Windows nào — đã grep xác nhận **0 kết quả** cho
  `D:\`, `D:/`, `C:\` trong toàn bộ `backend/src/modules/listening`).
- Directory được tạo an toàn nếu thiếu: `fs.mkdir(directory, {
  recursive: true })` trước khi ghi file — đúng yêu cầu.
- Không trả physical path ra API: hàm trả về `publicUrl` (URL HTTP qua
  `BACKEND_PUBLIC_URL`), không trả `filepath`/`directory` ở bất kỳ
  response nào.
- Static/public URL map: đã xác nhận chính xác cơ chế serve (grep
  `useStaticAssets|express.static|ServeStaticModule` toàn bộ
  `backend/src`) — file tĩnh được serve qua
  `ServeStaticModule.forRoot({ rootPath: join(process.cwd(), 'public'),
  serveRoot: '/' })` khai báo **cố định, hardcode** trong
  `backend/src/app.module.ts` (dòng ~89-92), phục vụ toàn bộ thư mục
  `public/` tại root `/` — nên `public/listening-audio/<hash>.mp3` được
  serve đúng tại `/listening-audio/<hash>.mp3`, khớp với
  `publicUrl` mà `listening-tts.service.ts` trả về **trong trường hợp
  dùng thư mục mặc định**.
  **Vấn đề xác nhận thật (không còn là suy đoán)**: `ServeStaticModule.forRoot(...)`
  chỉ đọc `rootPath` **một lần khi bootstrap module**, hoàn toàn không
  tham chiếu `process.env.LISTENING_AUDIO_STORAGE_DIR`. Nếu biến env
  này được set khác thư mục mặc định, `listening-tts.service.ts` sẽ ghi
  file vào thư mục mới đó, nhưng `ServeStaticModule` **vẫn chỉ serve từ
  `public/`** — kết quả là `publicUrl` trả về client sẽ 404 dù file tồn
  tại đúng chỗ trên đĩa. Đây là **lỗi thật, không phải rủi ro lý
  thuyết**, và env var mới thêm ở Chặng 6D.1 hiện **không có tác dụng
  thực tế** nếu set khác default (giữ nguyên `HIGH`, cần sửa
  `app.module.ts` để đọc cùng biến env hoặc bỏ hẳn biến env này nếu
  chưa cần dùng — không tự sửa trong report này để tránh sửa runtime
  logic chưa qua build/test thật).
- Filename: hash sha256 của transcript, không dùng raw user input, có
  chuẩn hoá (hex, cố định độ dài, không ký tự đặc biệt) — không cần
  thêm path normalization vì filename không bao giờ chứa `/`, `..`,
  hay ký tự path.
- `.env.example`: đã Glob `backend/.env.example` — **không tồn tại**
  trong repo, nên không có nơi để thêm tên biến `LISTENING_AUDIO_STORAGE_DIR`
  theo đúng convention (không tạo file `.env.example` mới vì ngoài
  phạm vi yêu cầu "không đổi env ngoài phạm vi" — việc tạo file cấu
  hình mẫu mới cho toàn bộ backend là thay đổi lớn hơn phạm vi
  Listening).
- Docker volume: nhắc lại từ Chặng 6D.1 — `backend/docker-compose.yml`
  chỉ có Postgres + Redis, không có service backend app nào để gắn
  volume. Cần bổ sung ở Chặng 8/10 nếu deploy bằng Docker.

## 17. Frontend Build

`npm run build` (frontend): `BLOCKED BY ENVIRONMENT`.

Không có gì mới so với Chặng 6D.1 (không sửa thêm frontend nào ở
6D.2). Các điểm đã verify bằng đọc source ở 6D.1 (practice không đọc
transcript trước answer, rating state hiển thị đúng, không còn debug
admin call — vừa re-confirm bằng Grep ở mục 11, resume không reset
answers) giữ nguyên kết luận, **vẫn `NOT RUN`** cho việc build thật.

## 18. Regression

`BLOCKED BY ENVIRONMENT` cho toàn bộ: Mission V2, Reward/Learning XP,
Learning Path, Vocabulary, Grammar, Reading, Writing, Speaking. Không
có cách chạy smoke test nào không cần shell.

`docs/phase1-stage6c-speaking-report.md`: vẫn **NOT FOUND** (đã kiểm
tra lại bằng Glob ở Chặng 6D, không kiểm tra lại lần nữa ở 6D.2 vì
không có gì thay đổi — không tạo report này vì ngoài phạm vi Listening).
Đúng theo chỉ thị: không coi đây là test failure, chỉ ghi nhận report
thiếu.

## 19. Lint/Diff

| Lệnh | Kết quả |
| --- | --- |
| Lint (file thay đổi, non-fix) | `BLOCKED BY ENVIRONMENT` |
| `git diff --check` | `BLOCKED BY ENVIRONMENT` |
| `git status` | `BLOCKED BY ENVIRONMENT` |
| `git diff --stat` | `BLOCKED BY ENVIRONMENT` |

Không tuyên bố lint pass. Không tuyên bố build pass thay cho lint pass
(2 việc khác nhau, cả 2 đều chưa chạy được nên không có gì để nhầm lẫn
ở đây, nhưng ghi rõ theo đúng chỉ thị mục 13 đề bài).

## 20. Known Issues

### BLOCKER

1. Toàn bộ command bắt buộc (git, prisma, build, test, lint) không chạy
   được trong suốt 3 chặng liên tiếp (6D, 6D.1, 6D.2) vì lỗi hạ tầng
   sandbox (`Not enough disk space to set up the workspace`). Đây là
   điều kiện tiên quyết bắt buộc cho Stage 7 Gate, chưa đạt.
2. Duplicate data audit cho migration
   `20260719120000_add_listening_active_session_unique` **chưa chạy
   được** — không thể xác nhận migration an toàn để apply.

### HIGH

1. `LISTENING_AUDIO_STORAGE_DIR` mới thêm có thể **không khớp** với
   route static file serving thật của backend nếu được set khác
   `public/listening-audio` mặc định — cần xác minh lại toàn bộ cấu
   hình static serving (`main.ts` và/hoặc module khác) trước khi dùng
   env này trong môi trường thật, nếu không audio sẽ 404 dù file tồn
   tại đúng chỗ trên đĩa.
2. Cold-start fallback (mục 15) không có cooldown đồng bộ multi-instance
   (dùng in-memory `Map`) — nếu deploy nhiều backend replica, giới hạn
   "tối đa 3 câu" chỉ đúng per-instance, không đúng toàn hệ thống.

### MEDIUM

1. Transcript/correctAnswer/explanation trước khi trả lời hiện trả
   `null` (field vẫn tồn tại trong JSON) thay vì bị loại hẳn khỏi
   response — chưa khớp 100% với cách diễn đạt "field không tồn tại"
   trong yêu cầu đề bài, dù không làm lộ nội dung thật.
2. Chưa có test xác nhận `ValidationPipe`/`forbidNonWhitelisted` thật
   sự reject field dư trong `RateListeningSessionDto` (test hiện tại
   chỉ gọi `class-validator.validate()` trực tiếp, không qua pipe thật).
3. Cold-start fallback không có timeout tường minh riêng, phụ thuộc
   hoàn toàn timeout nội tại của `GeminiService`/Google TTS SDK — có
   thể mất tới ~180s trong kịch bản xấu nhất.
4. Nullable `level`/`topic` trên `ListeningSession` là giới hạn latent
   của partial unique index (mục 6) — chưa xử lý, chỉ ghi nhận.
5. Chưa có test mock giả lập race condition `P2002` ở tầng
   `createSessionPayload` (chỉ có migration + code, chưa có unit test
   riêng cho nhánh catch).

### LOW

1. Không thể loại trừ hoàn toàn khả năng có thay đổi ngoài danh sách ở
   mục 3 vì không chạy được `git status` để đối chiếu working tree
   thật.
2. 6 case transcript-leak yêu cầu ở đề bài hiện gộp vào 1 test, chưa
   tách riêng từng case.

## 21. Final Decision

**`UNVERIFIED`**

Không chọn `READY_WITH_LIMITATIONS` (dù đây là quyết định của 2 report
trước) vì bản chất khác nhau: `READY_WITH_LIMITATIONS` ngụ ý "đã verify
và có giới hạn đã biết", còn ở đây **hoàn toàn không verify được bằng
thực thi** trong 3 lượt liên tiếp — dùng lại nhãn cũ sẽ đánh giá quá
cao mức độ tin cậy thật sự. `UNVERIFIED` phản ánh đúng: source đã được
sửa đúng logic (tin cậy ở mức đọc code kỹ), nhưng **chưa có bất kỳ bằng
chứng thực thi nào** (build/test/lint/migration status) trong toàn bộ
quá trình từ Chặng 6D đến 6D.2.

Không chọn `HIDE` vì không có bằng chứng cho thấy tính năng bị hỏng —
chỉ là chưa được xác minh, và các fix logic đều nhất quán, có lý do rõ
ràng khi đọc lại nhiều lần.

Không chọn `READY` vì hiển nhiên chưa đạt.

## 22. Stage 7 Gate

```text
CLOSED
```

Danh sách blocker chính xác (đối chiếu trực tiếp checklist mục 22 đề
bài):

| Điều kiện | Đạt? |
| --- | --- |
| Backend build pass | Không — `BLOCKED BY ENVIRONMENT` |
| Frontend build pass | Không — `BLOCKED BY ENVIRONMENT` |
| Prisma validate/generate pass | Không — `BLOCKED BY ENVIRONMENT` |
| Migration status known | Không — `BLOCKED BY ENVIRONMENT` (chỉ biết theo file trên đĩa, không biết trạng thái DB thật) |
| Listening tests discovered và pass | Discovered bằng đếm tĩnh (22 tests, 5 file) — **chưa pass** vì chưa chạy |
| Transcript tests pass | Chưa chạy |
| Admin authorization tests pass | Chưa chạy (trừ phần grep debug-call, đã xác nhận bằng công cụ tĩnh) |
| Reward farming tests pass | Chưa chạy |
| Concurrent start tests pass | Chưa có test dạng này, và cũng chưa chạy được nếu có |
| `git diff --check` pass | Không — `BLOCKED BY ENVIRONMENT` |
| Không còn BLOCKER/HIGH chưa xử lý | Không — 2 BLOCKER + 2 HIGH còn mở (mục 20) |

**Blocker chính để mở khoá Chặng 7**: cần một môi trường có shell hoạt
động thật (không phải sandbox Cowork hiện tại của phiên này) để chạy
toàn bộ bảng lệnh mục 7/8/9/19, thực hiện audit duplicate ở mục 5, và
xác minh lại 2 vấn đề HIGH mới phát hiện ở mục 20 (static serving cho
`LISTENING_AUDIO_STORAGE_DIR`, cooldown multi-instance) trước khi coi
Listening là sẵn sàng chuyển tiếp.
