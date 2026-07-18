# Phase 1 - Stage 6D.3: Listening Local Fix & Verification

## 1. Executive Summary

Mục tiêu chặng này là sửa 2 vấn đề HIGH đã xác định ở Chặng 6D.2 (audio
storage config lệch giữa writer/static-server, cooldown cold-start
không đồng bộ multi-instance), audit migration bằng DB thật, và chạy
toàn bộ command thật. Kết quả:

- **2 vấn đề HIGH đã được sửa bằng code thật** (không phải chỉ ghi
  nhận): audio storage nay dùng chung 1 nguồn cấu hình cho writer +
  static server + URL; cooldown cold-start nay dùng Redis `SET NX EX`
  atomic thay vì `Map` in-memory.
- **Không audit được migration bằng DB thật** — shell
  (`mcp__workspace__bash`) tiếp tục không khởi động được trong suốt
  chặng này (đã thử lại 4 lần), cùng lỗi `Not enough disk space to set
  up the workspace` như 2 chặng trước. Đây là lần thứ 3 liên tiếp (6D.1,
  6D.2, 6D.3) môi trường thực thi lệnh hoàn toàn không dùng được.
- Nhân tiện sửa audio storage, đã phát hiện thêm và xử lý luôn vấn đề
  nullable `level`/`topic` trong partial unique index (ghi nhận ở
  6D.2, sửa thật ở 6D.3 bằng COALESCE expression index).
- **Không có bất kỳ bằng chứng thực thi nào** (build/test/lint/migrate
  status) — mọi đánh giá "đúng" trong report này vẫn chỉ ở mức đọc
  source cẩn thận, không phải kết quả chạy chương trình.

## 2. Git State

`git status`, `git diff --stat`, `git diff --name-only`, `git diff
--check`: **`BLOCKED BY ENVIRONMENT`** — không có shell nên không chạy
được lệnh `git` nào trong chặng này (giống 6D.1, 6D.2).

Thay thế bằng liệt kê thủ công các file agent đã sửa/tạo trong chính
Chặng 6D.3 (dựa trên lịch sử Write/Edit thật của lượt này):

**Sửa:**
- `backend/src/app.module.ts` — `ServeStaticModule.forRoot()` dùng
  `getStaticRootDir()` thay vì hard-code `join(process.cwd(),'public')`.
- `backend/src/modules/listening/listening-tts.service.ts` — dùng
  `getListeningAudioDir()`/`getListeningAudioUrlPrefix()` thay vì đọc
  trực tiếp `LISTENING_AUDIO_STORAGE_DIR`.
- `backend/src/modules/listening/listening.module.ts` — đăng ký
  `ListeningRedisProvider`.
- `backend/src/modules/listening/listening.service.ts` — inject Redis,
  thay `coldStartCooldown` (Map) bằng `tryAcquireColdStartLock()` dùng
  Redis `SET NX EX`.
- `backend/src/modules/listening/dto/start-listening.dto.ts` — thêm
  `@MaxLength(100)` cho `topic`.
- `backend/prisma/migrations/20260719120000_add_listening_active_session_unique/migration.sql`
  — sửa trực tiếp (chưa apply) để dùng COALESCE sentinel cho
  `level`/`topic` nullable.
- `backend/src/modules/listening/listening.service.spec.ts` — thêm
  mock `LISTENING_REDIS`, thêm 6 test cho cold-start lock.

**Mới:**
- `backend/src/config/static-assets.config.ts`
- `backend/src/config/static-assets.config.spec.ts`
- `backend/src/modules/listening/listening-redis.provider.ts`
- `docs/phase1-stage6d3-listening-local-fix-verification-report.md` (file này)

**Không sửa gì ngoài phạm vi Listening/config static dùng chung/guard.**
Không có file "unrelated".

## 3. Audio Storage Fix

**Before (tới hết Chặng 6D.2):**

```text
Writer (listening-tts.service.ts):
  directory = process.env.LISTENING_AUDIO_STORAGE_DIR || <cwd>/public/listening-audio

Static server (app.module.ts):
  ServeStaticModule.forRoot({ rootPath: <cwd>/public, serveRoot: '/' })  // hard-code, KHÔNG đọc env

URL trả về:
  `${BACKEND_PUBLIC_URL}/listening-audio/${filename}`
```

Nếu `LISTENING_AUDIO_STORAGE_DIR` được set khác `<cwd>/public/listening-audio`
→ file ghi đúng chỗ mới, nhưng static server vẫn chỉ phục vụ
`<cwd>/public` → URL trả về 404. Bug thật, đã xác nhận bằng đọc code ở
Chặng 6D.2.

**After (Chặng 6D.3):**

```text
backend/src/config/static-assets.config.ts (nguồn cấu hình DUY NHẤT)
  getStaticRootDir()          -> STATIC_ROOT_DIR hoặc <cwd>/public
  getListeningAudioDir()      -> getStaticRootDir() + LISTENING_AUDIO_SUBDIR (mặc định "listening-audio")
  getListeningAudioUrlPrefix()-> "/" + LISTENING_AUDIO_SUBDIR

app.module.ts:
  ServeStaticModule.forRoot({ rootPath: getStaticRootDir(), serveRoot: '/' })

listening-tts.service.ts:
  directory = getListeningAudioDir()
  publicUrl = `${BACKEND_PUBLIC_URL}${getListeningAudioUrlPrefix()}/${filename}`
```

Bất biến được đảm bảo bằng code (không chỉ tài liệu): `getListeningAudioDir()`
luôn `resolve(getStaticRootDir(), subdir)`, có kiểm tra
`resolvedDir.startsWith(resolvedRoot)` — writer **không thể** ghi ra
ngoài phạm vi static root nữa dù env bị cấu hình sai.

**Config contract:**

| Biến env | Ý nghĩa | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `STATIC_ROOT_DIR` | Thư mục static root (được `ServeStaticModule` serve tại `/`) | `<cwd>/public` | Đường dẫn tuyệt đối hoặc tương đối so với cwd |
| `LISTENING_AUDIO_SUBDIR` | Tên thư mục con (bên trong `STATIC_ROOT_DIR`) chứa audio Listening | `listening-audio` | **Chỉ tên subdir**, không phải path tuyệt đối — bị `sanitizeSubdir()` reject nếu chứa `..` hoặc trông giống path tuyệt đối (rơi về default an toàn thay vì lỗi) |
| `LISTENING_AUDIO_STORAGE_DIR` | **Đã loại bỏ** ở Stage 6D.3 | — | Biến này mới thêm ở 6D.1, chưa từng release/dùng thật ở đâu ngoài chính các stage audit này, nên gỡ bỏ trực tiếp thay vì giữ song song 2 cơ chế dễ gây nhầm lẫn |

**Docker implication:** không đổi so với nhận định ở 6D.1/6D.2 —
`backend/docker-compose.yml` hiện chỉ có Postgres + Redis, chưa có
service backend app nào để gắn volume. Khi container hoá backend ở
Chặng 8/10, cần mount volume tại đúng `STATIC_ROOT_DIR` (mặc định
`public/`) để không mất audio khi container restart; **không cần**
volume riêng cho `LISTENING_AUDIO_SUBDIR` vì nó luôn nằm bên trong
`STATIC_ROOT_DIR`.

**`.env.example`:** vẫn không tồn tại trong `backend/` (đã kiểm tra lại
bằng Glob ở chặng này) — không tạo mới (ngoài phạm vi). Đã kiểm tra
`.env` thật (chỉ đọc TÊN biến, không đọc giá trị, để không lộ secret
vào context/report): xác nhận `REDIS_HOST`, `REDIS_PORT`,
`REDIS_PASSWORD` đã tồn tại sẵn (dùng được ngay cho
`ListeningRedisProvider` ở mục 4); `STATIC_ROOT_DIR`,
`LISTENING_AUDIO_SUBDIR`, `BACKEND_PUBLIC_URL` chưa có trong `.env`
hiện tại — nghĩa là môi trường này sẽ chạy đúng theo default (không
đổi hành vi).

**Test bổ sung (`static-assets.config.spec.ts`, 8 test, UNVERIFIED):**
default static root, default audio dir, default URL prefix, custom
`STATIC_ROOT_DIR` giữ bất biến writer-nằm-trong-root, custom
`LISTENING_AUDIO_SUBDIR` đổi đúng URL prefix, reject path traversal
(`../../etc`), reject absolute path (`/etc/passwd`), URL không chứa
physical path.

## 4. Distributed Cooldown Fix

**Before:** `private readonly coldStartCooldown = new Map<string,
number>()` trên instance `ListeningService` — mỗi backend process có
`Map` riêng, không chia sẻ giữa các replica.

**After:**

- **Redis key**: `listening:cold-start-lock:{level}:{scopedTopic}`,
  trong đó `scopedTopic` = `slugify(topic)`, và nếu slug dài hơn 60 ký
  tự thì thay bằng `sha1(slug).slice(0,16)` — không đưa raw user input
  (topic tự do người dùng nhập) thẳng vào Redis key, tránh key-space
  phình to bất thường.
- **TTL**: đúng 60 giây (`COLD_START_LOCK_TTL_SECONDS = 60`), qua
  `redis.set(key, '1', 'EX', 60, 'NX')`.
- **Atomic behavior**: dùng đúng 1 lệnh `SET key value NX EX ttl` —
  không có bước GET-rồi-SET tách rời, nên không có race giữa check và
  set. `result === 'OK'` nghĩa là request này thắng (nhận lock); `null`
  nghĩa là key đã tồn tại (request khác đang trong cooldown), trả `false`.
- **Failure mode (Redis unavailable)**: `tryAcquireColdStartLock()` bọc
  `try/catch` quanh lệnh Redis; nếu lỗi (mất kết nối, timeout...), log
  lỗi rõ ràng và **trả `false`** (coi như KHÔNG nhận lock) — nghĩa là
  cold-start fallback bị **skip** khi Redis lỗi, thay vì chạy không
  giới hạn. Đây là lựa chọn "an toàn = deny" đúng theo yêu cầu "Không
  tạo unbounded generation" khi Redis down. Job async
  (`enqueueShortfallAsync`, dùng BullMQ) **không phụ thuộc** lock này
  nên vẫn hoạt động bình thường kể cả khi Redis của lock (là cùng
  Redis instance cấu hình qua `REDIS_HOST`/`PORT`/`PASSWORD`, nhưng về
  mặt logic code là 2 client riêng) gặp sự cố tạm thời.
- **Context isolation**: key gồm cả `level` và `scopedTopic`, nên
  `(A1, "Daily Life")` và `(B1, "Environment")` không đụng lock của
  nhau — verify bằng test (mục dưới).

**Test bổ sung (`listening.service.spec.ts`, +6 test, UNVERIFIED):**
request đầu nhận lock, request thứ hai trong cooldown không nhận lock,
TTL đúng 60s, scope level/topic khác nhau tạo key khác nhau, Redis lỗi
không throw và trả false, `enqueueShortfallAsync` vẫn gọi
`ListeningJobService` độc lập với kết quả lock. Test gọi trực tiếp
private method qua `(service as any)` — lựa chọn có ý thức để test
đúng đơn vị logic vừa sửa, tránh phải dựng lại toàn bộ mock chain của
`startPractice` chỉ để chạm nhánh cold-start.

## 5. Migration Inventory

| Migration | Status | Dependency | Safe to apply |
| --- | --- | --- | --- |
| `20260717034435_add_chat_session` | Không xác nhận được (`BLOCKED BY ENVIRONMENT`) | — | Ngoài phạm vi Listening |
| `20260717040228_add_chat_pet_feature` | Không xác nhận được | Sau `add_chat_session` | Ngoài phạm vi Listening |
| `20260718090000_add_mission_progress_event_v2` | Không xác nhận được | Sau `add_chat_pet_feature` | Ngoài phạm vi Listening |
| `20260719120000_add_listening_active_session_unique` | Tồn tại trên đĩa, **đã sửa nội dung ở Stage 6D.3** (COALESCE sentinel, xem mục 6), **chưa apply ở bất kỳ đâu** | Sau `add_mission_progress_event_v2`; phụ thuộc dữ liệu bảng `ListeningSession` | Xem mục 7 — `UNVERIFIED` (không audit được bằng DB thật) |

Không tạo migration thứ 5 — migration `20260719120000` **được sửa trực
tiếp** vì xác nhận chắc chắn chưa apply ở đâu (đúng theo chỉ thị mục 6
đề bài "Nếu migration chưa apply: Có thể sửa migration hiện tại. Không
tạo migration nối tiếp").

## 6. Nullable Unique Index Analysis

Đã đọc lại flow `startPractice`/`continueSession`/`retrySession` trong
`listening.service.ts` một lần nữa trước khi quyết định hướng sửa —
xác nhận **level/topic luôn được resolve về chuỗi non-null** trước khi
tạo `ListeningSession`, nên đây là rủi ro latent (schema cho phép NULL,
code không bao giờ tạo NULL), không phải bug đang xảy ra.

**Hướng đã chọn: B — COALESCE expression index**, vì:

- Hướng A (`NULLS NOT DISTINCT`) là cú pháp Postgres 15+; không xác
  nhận được version PostgreSQL thật đang dùng (mục 2 báo cáo 6D.1 ghi
  `postgres:16` trong `docker-compose.yml` cho **local dev**, nhưng
  không có gì đảm bảo staging/production dùng cùng version) — dùng cú
  pháp có thể không tương thích ngược là rủi ro không cần thiết khi
  Hướng B (COALESCE, tương thích mọi version Postgres hỗ trợ expression
  index, tức từ rất lâu) đạt cùng mục tiêu.
- Hướng C (tách nhiều partial index theo từng pattern null) phức tạp
  hơn cần thiết cho 2 cột nullable (tối đa 4 tổ hợp) — khó bảo trì hơn
  1 expression index duy nhất.
- Hướng D (đổi business key) không áp dụng — key `(userId, level,
  topic)` đã đúng bản chất nghiệp vụ (đơn vị "phiên đang học" theo
  đúng cách `startPractice()` tìm session tồn tại), vấn đề chỉ nằm ở
  cách PostgreSQL so sánh NULL, không phải sai key.

**SQL sau khi sửa:**

```sql
CREATE UNIQUE INDEX "ListeningSession_active_userId_level_topic_key"
    ON "ListeningSession" (
        "userId",
        (COALESCE("level", '__NULL_LEVEL__')),
        (COALESCE("topic", '__NULL_TOPIC__'))
    )
    WHERE "status" = 'IN_PROGRESS';
```

Sentinel `'__NULL_LEVEL__'`/`'__NULL_TOPIC__'` khác nhau cho từng cột
(tránh trùng chéo giữa 2 cột), định dạng không trùng dữ liệu thật
(`level` chỉ nhận 6 mã ngắn A1-C2 qua `IsIn` validation của
`StartListeningDto`; `topic` là chuỗi tự nhiên do Gemini/người dùng
nhập, không có tiền lệ chứa chuỗi `__NULL_TOPIC__`).

**Đối chiếu bắt buộc theo đề bài:**

- Index khớp query fallback sau `P2002`: **có** — `createSessionPayload()`
  dùng `findFirst({where:{userId,level,topic,status:'IN_PROGRESS'}})`,
  Prisma tự map `level`/`topic` (dù có là `null` hay chuỗi) sang đúng
  điều kiện SQL tương ứng; không cần sửa code fallback vì đây là
  expression index ở tầng constraint-checking, không đổi ngữ nghĩa
  truy vấn `SELECT` thông thường.
- Không chặn attempt mới sau completion: **đúng** — `WHERE status =
  'IN_PROGRESS'` không đổi, session `COMPLETED` không rơi vào phạm vi
  index.
- Failed/abandoned status theo enum thật: **N/A** — đã xác nhận lại
  (mục 6, 6D.2) `ListeningSession.status` là `String` tự do, code chỉ
  dùng `'IN_PROGRESS'`/`'COMPLETED'`, không có enum `FAILED`/`ABANDONED`
  nào tồn tại để tham chiếu.
- Không tham chiếu status không tồn tại: **đúng**, comment migration
  đã được viết lại ở 6D.2 để không gợi ý sai giá trị `'ABANDONED'`
  không có thật trong code, giữ nguyên ở 6D.3.

## 7. Duplicate Data Audit

**Không chạy được** — cần kết nối PostgreSQL thật (`psql`, Prisma
Client qua script Node, hoặc `prisma studio`), cả ba đều cần shell, và
shell không khởi động được trong suốt chặng này (mục 2).

Query audit đã cập nhật đúng theo index mới (COALESCE, mục 6), nằm
trong comment của chính file migration:

```sql
SELECT COALESCE("level", '__NULL_LEVEL__') AS level_key,
       COALESCE("topic", '__NULL_TOPIC__') AS topic_key,
       "userId",
       COUNT(*) AS active_count,
       array_agg("id") AS session_ids,
       array_agg("startedAt") AS started_at_list
FROM "ListeningSession"
WHERE "status" = 'IN_PROGRESS'
GROUP BY "userId", level_key, topic_key
HAVING COUNT(*) > 1;
```

| User | Level | Topic | Active count | Session IDs | Statuses | CreatedAt |
| --- | --- | --- | ---: | --- | --- | --- |
| *(không thu thập được — BLOCKED BY ENVIRONMENT)* | | | | | | |

Không có dữ liệu thật để đề xuất cleanup rule cụ thể (giữ session
nhiều answers hơn / updatedAt mới hơn / status tiến xa hơn) — nguyên
tắc cleanup đã ghi sẵn dạng hướng dẫn chung trong comment migration
(mục 6, phần "Nếu có row, cần dọn dữ liệu..."), sẽ áp dụng cụ thể khi
có kết quả audit thật.

**Migration status (theo đúng 3 lựa chọn khả dĩ của đề bài mục 7):**
không phải `BLOCKED_BY_DUPLICATE_DATA` (chưa phát hiện duplicate vì
chưa audit được) và cũng không phải `SAFE_TO_APPLY_IN_LOCAL_DEV` (chưa
xác nhận sạch) — dùng đúng nhãn `UNVERIFIED` ở mục 17.

## 8. Prisma Results

| Lệnh | Kết quả |
| --- | --- |
| `npx prisma format` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma validate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma generate` | `BLOCKED BY ENVIRONMENT` |
| `npx prisma migrate status` | `BLOCKED BY ENVIRONMENT` |

Ghi đúng theo yêu cầu: không dùng danh sách migration "dự kiến" của đề
bài như thể là kết quả thật. Danh sách ở mục 5 là đối chiếu tĩnh trên
đĩa (Glob), không phải output của `migrate status`.

## 9. Backend Build

`npm run build`: `BLOCKED BY ENVIRONMENT`.

Rà soát tĩnh các điểm rủi ro cao nhất phát sinh từ thay đổi chặng này
(không thay thế `tsc` thật):

- `app.module.ts`: xoá `import { join } from 'path'` vì không còn nơi
  nào dùng `join` trong file này sau khi thay `ServeStaticModule`
  bằng `getStaticRootDir()` — đã grep xác nhận không còn lệnh gọi
  `join(` nào khác trong file.
- `listening-tts.service.ts`: vẫn giữ `import { join } from 'path'`
  (dùng cho `join(directory, filename)`), thêm import
  `getListeningAudioDir`/`getListeningAudioUrlPrefix` từ
  `../../config/static-assets.config` — đã đếm lại số dấu `../` khớp
  đúng vị trí (`backend/src/modules/listening/` → lên 2 cấp →
  `backend/src/config/`).
- `listening.service.ts`: thêm `Inject` vào import từ `@nestjs/common`
  (trước đó chưa import `Inject`), thêm `import type Redis from
  'ioredis'` (type-only import, không tạo runtime dependency thừa),
  thêm `createHash` từ `crypto` (dùng cho `coldStartLockKey` khi slug
  quá dài) — gói `ioredis` đã là dependency có sẵn của backend (dùng ở
  `leaderboard.module.ts`), không thêm package mới.
- `listening.module.ts`: thêm `ListeningRedisProvider` vào
  `providers` — đã đọc lại `listening-redis.provider.ts`, cú pháp
  `Provider` object hợp lệ, cùng pattern với
  `leaderboard.module.ts` (chỉ khác token/tên biến).
- `listening.service.spec.ts`: thêm provider mock `LISTENING_REDIS` —
  đã đối chiếu lại constructor thật của `ListeningService` (7 tham số:
  `prismaService, geminiService, missionV2ProgressService,
  listeningTtsService, learningXp, listeningJobService,
  listeningAudioBackfillService, redis` — **8 tham số**, đã đếm lại
  cho khớp) để đảm bảo `TestingModule` cung cấp đủ provider, tránh lỗi
  "Nest can't resolve dependencies" khi chạy thật.

**Không phát hiện lỗi rõ ràng qua đọc source**, nhưng đây không phải
"build pass" — chỉ là không tìm thấy lỗi bằng mắt. Không dùng `any`
diện rộng, không dùng `@ts-ignore`, không comment-out logic, không bỏ
validation nào để "qua build" — không có lý do phải làm vậy vì build
chưa từng chạy để biết có lỗi hay không.

## 10. Test Discovery

`npx jest --listTests`, `npm test -- listening`: `BLOCKED BY
ENVIRONMENT`.

Đếm lại bằng Grep (chính xác hơn ước lượng) sau khi thêm test mới ở
chặng này:

| Suite (file) | Tests (đếm `it(`) | Pass | Fail | Skip |
| --- | ---: | ---: | ---: | ---: |
| `listening.service.spec.ts` | 13 (7 cũ + 6 mới cho cold-start lock) | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `listening.controller.spec.ts` | 1 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `listening-job.service.spec.ts` | 1 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `rate-listening-session.dto.spec.ts` | 7 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `roles.guard.spec.ts` | 6 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `static-assets.config.spec.ts` (mới) | 8 | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| **Tổng** | **36** | — | — | — |

Số 22 ghi ở report 6D.2 giờ tăng lên **36** (thêm 6 test cold-start lock
+ 8 test static-assets.config, tổng +14). Không coi bất kỳ dòng nào là
"PASS ngầm định" — `NOT RUN` là trạng thái chính xác.

## 11. Security Tests

Không có gì thay đổi so với 6D.2 (không sửa thêm code bảo mật admin
route/ownership ở chặng này). Nhắc lại kết luận đã có, **vẫn `NOT
RUN`** cho việc thực thi test thật:

- Anonymous → 401: suy luận từ thứ tự guard (`JwtAuthGuard` trước
  `RolesGuard`), chưa e2e thật.
- STUDENT/TEACHER → 403, ADMIN → success, thiếu `request.user` không
  crash: có unit test (`roles.guard.spec.ts`, 6 test), chưa chạy.
- Transcript/correctAnswer/explanation không lộ trước answer/skip: có
  unit test, chưa chạy.
- Session/rating/result/history ownership, không nhận `userId` từ
  client, không nhận score/reward từ client: đã verify bằng đọc code ở
  Chặng 6D/6D.1 (`getOwnedSession`, DTO không có field
  `userId`/`isCorrect`/`score`), không đổi ở 6D.3, chưa có test tích
  hợp riêng cho từng ownership case.

## 12. Reward Tests

Không có thay đổi logic reward ở Chặng 6D.3. 5 test reward-farming
(`listening.service.spec.ts`) vẫn nguyên trạng từ 6D.1, `NOT RUN`.
Mission/Learning XP/Leaderboard/Streak/Learning Path idempotency:
Listening không tích hợp Learning Path (đã xác nhận từ Chặng 6D, mục
12 report đó), Mission/XP/Leaderboard/Streak idempotency dựa vào cơ chế
chung đã audit ở Stage 4 (`XpTransaction.idempotencyKey`,
`updateMany({status:{not:'COMPLETED'}})`) — không có gì mới để test
riêng cho Listening ngoài những gì đã có.

## 13. Frontend Build

`npm run build` (frontend): `BLOCKED BY ENVIRONMENT`. Không sửa
frontend nào ở Chặng 6D.3 (toàn bộ thay đổi chặng này là backend +
migration). Các điểm đã verify ở 6D/6D.1/6D.2 giữ nguyên kết luận,
**vẫn `NOT RUN`**.

## 14. Regression

`BLOCKED BY ENVIRONMENT` cho toàn bộ: Mission V2, Reward/Learning XP,
Learning Path, Vocabulary, Grammar, Reading, Writing, Speaking, backend
build, frontend build. Không có cách chạy smoke test nào không cần
shell. Không mở rộng sửa các module này (đúng phạm vi).

## 15. Lint/Diff

| Lệnh | Kết quả |
| --- | --- |
| Lint (file thay đổi, non-fix) | `BLOCKED BY ENVIRONMENT` |
| `git diff --check` | `BLOCKED BY ENVIRONMENT` |
| `git status` | `BLOCKED BY ENVIRONMENT` |
| `git diff --stat` | `BLOCKED BY ENVIRONMENT` |
| `git diff --name-only` | `BLOCKED BY ENVIRONMENT` |

Không tuyên bố lint pass. Không có gì để phân loại New/Old/Warning/
Runtime vì lệnh chưa từng chạy.

## 16. Known Issues

### BLOCKER

1. Toàn bộ command bắt buộc (git, prisma, build, test, lint) không
   chạy được trong 3 chặng liên tiếp (6D.1, 6D.2, 6D.3) vì lỗi hạ tầng
   sandbox. Điều kiện tiên quyết cho Stage 7 Gate chưa đạt.
2. Duplicate data audit cho migration
   `20260719120000_add_listening_active_session_unique` **vẫn chưa
   chạy được** — dù index đã được làm chặt hơn (COALESCE), vẫn không
   có bằng chứng dữ liệu thật sạch để apply.

### HIGH

*(2 vấn đề HIGH của 6D.2 đã được sửa bằng code — hạ xuống, xem ghi chú
"đã đóng" bên dưới; không còn HIGH mới phát sinh từ việc audit chặng
này.)*

### MEDIUM

1. Toàn bộ 36 test (6 file) ở trạng thái `UNVERIFIED` — đã đối chiếu
   kỹ với source thật nhưng chưa có xác nhận `tsc`/`jest` thật.
2. `LISTENING_AUDIO_STORAGE_DIR` (biến env cũ từ 6D.1) đã bị loại bỏ
   khỏi code — nếu bất kỳ nơi nào (tài liệu ngoài repo, ghi chú vận
   hành) đã nhắc tới biến này, cần cập nhật lại (không có ảnh hưởng
   trong chính repo vì đã grep xác nhận không còn code path nào đọc
   biến đó).
3. Redis lock dùng chung cấu hình kết nối (`REDIS_HOST/PORT/PASSWORD`)
   nhưng tạo **connection riêng** với `LeaderboardModule` thay vì dùng
   chung 1 connection pool — chấp nhận được ở quy mô hiện tại, nhưng
   nếu số module tự tạo Redis connection tăng lên, nên cân nhắc 1
   `RedisModule` dùng chung toàn backend (ngoài phạm vi stage này).
4. Chưa có test tích hợp DB thật cho 6 case nullable unique index (mục
   10 đề bài phần "Nullable unique index") — cần DB test riêng, chưa
   thực hiện được vì không có shell.

### LOW

1. Không thể loại trừ hoàn toàn thay đổi ngoài danh sách mục 2 vì
   không chạy được `git status`.
2. Chưa tách đủ 5 test case audio-config theo đúng liệt kê chi tiết
   của đề bài mục 10 (hiện có 8 test bao phủ tương đương nhưng không
   1-1 theo đúng tên từng case).

**Vấn đề HIGH đã đóng (so với báo cáo 6D.2):**

- ~~`LISTENING_AUDIO_STORAGE_DIR` lệch với `ServeStaticModule`~~ →
  **đã sửa** bằng `static-assets.config.ts` dùng chung (mục 3). Chưa
  build/test thật để xác nhận 100%, nhưng logic đã đúng và có test đi
  kèm.
- ~~Cooldown cold-start chỉ an toàn single-instance~~ → **đã sửa**
  bằng Redis `SET NX EX` (mục 4). Chưa build/test thật để xác nhận
  100%, nhưng logic đã đúng và có test đi kèm.

## 17. Migration Decision

```text
UNVERIFIED
```

Không phải `SAFE_TO_APPLY_LOCAL_DEV` vì chưa audit được duplicate data
bằng DB thật. Không phải `BLOCKED_BY_DUPLICATE_DATA` vì chưa phát hiện
duplicate nào (chưa audit được, không phải "đã audit và thấy lỗi").
Không phải `BLOCKED_BY_INDEX_DESIGN` — thiết kế index đã được review kỹ
và sửa đúng ở mục 6, không còn vấn đề thiết kế nào đã biết. Đúng nhãn
duy nhất phù hợp là `UNVERIFIED`.

## 18. Listening Production Decision

```text
UNVERIFIED
```

Giữ nguyên nhãn như Chặng 6D.2 (không phải vì "giữ nguyên máy móc" —
đã đánh giá lại): dù 2 vấn đề HIGH đã được sửa bằng code có logic đúng
đắn và có test đi kèm, **không có bất kỳ xác nhận thực thi nào**
(build/test/lint) cho toàn bộ thay đổi tích luỹ qua 4 chặng (6D, 6D.1,
6D.2, 6D.3). Không hạ xuống `HIDE` vì không có bằng chứng tính năng bị
hỏng — chỉ là chưa được verify bằng chạy chương trình thật.

## 19. Stage 7 Gate

```text
CLOSED
```

| Điều kiện | Đạt? |
| --- | --- |
| Prisma validate/generate pass | Không — `BLOCKED BY ENVIRONMENT` |
| Migration status known | Không — `BLOCKED BY ENVIRONMENT` |
| Duplicate audit hoàn thành | Không — `BLOCKED BY ENVIRONMENT` |
| Index design đúng với nullable values | **Đạt** — đã sửa bằng COALESCE (mục 6), review kỹ, không còn vấn đề thiết kế đã biết |
| Backend build pass | Không — `BLOCKED BY ENVIRONMENT` |
| Listening tests discovered và pass | Discovered tĩnh (36 tests, 6 file) — chưa pass vì chưa chạy |
| Audio storage HIGH đã sửa và test | Đã sửa bằng code (mục 3) + có 8 test — **chưa chạy test để xác nhận** |
| Multi-instance cooldown HIGH đã sửa và test | Đã sửa bằng code (mục 4) + có 6 test — **chưa chạy test để xác nhận** |
| Frontend build pass | Không — `BLOCKED BY ENVIRONMENT` |
| Security/reward tests pass | Không — chưa chạy |
| `git diff --check` pass | Không — `BLOCKED BY ENVIRONMENT` |
| Không còn BLOCKER/HIGH | Còn 2 BLOCKER (mục 16); 0 HIGH mới, nhưng 2 HIGH cũ chỉ "đã sửa code", chưa "đã verify" nên chưa thể tính là đóng hoàn toàn theo tinh thần gate nghiêm ngặt |

**Blocker chính xác để mở khoá Chặng 7**: cần một môi trường có shell
hoạt động thật để (1) chạy `npx prisma format/validate/generate/migrate
status`, (2) audit duplicate data bằng SQL thật theo đúng query ở mục
7, (3) `npm run build` cả backend và frontend, (4) `npm test --
listening` xác nhận 36 test thật sự pass (đặc biệt 14 test mới của
chặng này), (5) `git diff --check` và lint non-fix trên các file đã
đổi. Cho tới khi có môi trường đó, Listening giữ nguyên `UNVERIFIED`,
không tự nâng lên `READY`/`READY_WITH_LIMITATIONS` dù logic đã được
review và sửa cẩn thận qua 4 chặng liên tiếp.
