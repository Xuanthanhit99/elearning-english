# Chặng 6D.4 — Listening Execution-Only Verification Report

**Ngày:** 2026-07-18
**Phương pháp xác minh:** Toàn bộ command trong report này được người dùng (poppy-dev) chạy trực tiếp trên máy Windows thật (PowerShell, `D:\elearning-english`) và dán lại nguyên văn output do `mcp__workspace__bash` (sandbox) không khả dụng ("Not enough disk space to set up the workspace") và computer-use không thể gõ lệnh vào terminal (tier "click" — chỉ click được, không type được). Không có kết quả nào trong report này được giả lập.

---

## 1. Git state

**Status: PASS**

```
git status
```
- Branch `main`, up to date với `origin/main`.
- 15 file modified đúng scope Listening (Stage 6D → 6D.3) + `package.json` (sửa mới trong 6D.4, xem mục 7).
- Untracked: migration mới, `roles.guard.spec.ts`, `src/config/` (static-assets config + spec), `rate-listening-session.dto.ts` + spec, `listening-redis.provider.ts`, 4 report cũ, và `scripts/stage6d4-duplicate-audit.js` (script audit mới, xem mục 4 — **nên xoá sau khi dùng xong, không phải code sản phẩm**).

```
git diff --stat
```
- 16 file thay đổi, 828 insertions(+), 13 deletions(-) — khớp với các stage trước cộng thêm `package.json` (+3 dòng, xem mục 7).

```
git diff --check
```
- Không có lỗi whitespace thật. Các dòng "LF will be replaced by CRLF" chỉ là cảnh báo line-ending bình thường trên Windows, không phải lỗi.

**Không có gì bị mất, không có thay đổi ngoài ý muốn.**

---

## 2. Prisma checks

**Status: PASS**

```
npx prisma format   → "Formatted prisma\schema.prisma" — PASS
npx prisma validate → "The schema... is valid" — PASS
npx prisma generate → "Generated Prisma Client (v6.19.3)" — PASS
```

```
npx prisma migrate status
```
Kết quả thật, 4 migration pending (đúng như 3 report trước dự đoán, xác minh lại — không giả định):
```
20260717034435_add_chat_session
20260717040228_add_chat_pet_feature
20260718090000_add_mission_progress_event_v2
20260719120000_add_listening_active_session_unique
```
Chưa migration nào được apply. Migration Listening (`20260719120000_...`) đúng như thiết kế ở Stage 6D.3 (COALESCE sentinel cho level/topic nullable).

---

## 3. Migration SQL review (đối chiếu DB thật)

**Status: PASS (thiết kế), nhưng KHÔNG được apply — xem mục 4**

- Tên bảng `"ListeningSession"`, cột `"userId"`, `"level"`, `"topic"`, `"status"` khớp đúng `schema.prisma` (đã đọc lại model thật, dòng 1318-1339).
- Cột thật trong model: `id, userId, level, topic, total, correct, wrong, skipped, score, status, xpEarned, coinsEarned, rating, ratingComment, ratedAt, startedAt, completedAt` — **không có `createdAt`/`updatedAt`** (phát hiện thật ở mục 4, đã sửa script audit).
- Predicate `WHERE "status" = 'IN_PROGRESS'` khớp đúng giá trị status thực tế dùng trong code (`status` là `String` tự do, chỉ 2 giá trị `'IN_PROGRESS'`/`'COMPLETED'` được dùng).
- Sentinel COALESCE (`__NULL_LEVEL__`, `__NULL_TOPIC__`) type-correct (String), không trùng dữ liệu thật (level luôn A1-C2, topic không có tiền lệ chứa chuỗi này).
- Index chỉ áp dụng khi `status='IN_PROGRESS'` → không chặn việc tạo session mới sau khi đã hoàn thành.

---

## 4. Duplicate-data audit (read-only, DB thật)

**Status: BLOCKED_BY_DUPLICATE_DATA — có dữ liệu vi phạm thật**

Script `backend/scripts/stage6d4-duplicate-audit.js` (chỉ `SELECT`, không `UPDATE`/`DELETE`) chạy qua Prisma Client thật, kết quả thật:

| userId | level | topic | active_count | session IDs (rút gọn) | status | ghi chú |
|---|---|---|---|---|---|---|
| 3b126a1a... | B1 | Lifestyle | **9** | dbde94c6, ec69d10a, d242e483, 3e836c10, 1d664844, 35373f36, d6d42a3e, 6077a076, eafe375e | tất cả `IN_PROGRESS` | startedAt trải từ 14:36:58 → 14:43:04 ngày 2026-07-06, `completedAt` đều `null` |
| 3b126a1a... | B1 | Career | 2 | 9ea0aa8a, 716c0877 | `IN_PROGRESS` | startedAt 2026-07-05 16:32/16:33 |
| 3b126a1a... | B1 | Education | 2 | ad0366e9, 34a05312 | `IN_PROGRESS` | startedAt 2026-07-09 14:46 |

- Tổng session `IN_PROGRESS` toàn bảng: **13**.
- `NULL_LEVEL_TOPIC_BREAKDOWN`: 0 row có `level`/`topic` NULL trong toàn bộ 13 row — xác nhận thiết kế COALESCE ở mục 3 hiện chưa thực sự được test bằng dữ liệu NULL thật (nhưng không ảnh hưởng tính đúng đắn).

**Kết luận:** Nếu apply migration `20260719120000_...` ngay bây giờ, `CREATE UNIQUE INDEX` sẽ **FAIL** vì nhóm `(userId=3b126a1a..., B1, Lifestyle)` có 9 row vi phạm constraint. Đây chính là bằng chứng thực tế cho lỗ hổng race-condition mà migration này được thiết kế để chặn — dữ liệu duplicate có sẵn trong DB dev hiện tại là do lỗi cũ (trước khi có `isUniqueConstraintError`/P2002 catch ở Stage 6D) tạo ra, migration chưa từng được apply nên chưa bảo vệ được các session tạo sau đó.

**Không thực hiện bất kỳ UPDATE/DELETE nào.** Việc dọn dữ liệu (theo đúng khuyến nghị trong comment migration: giữ lại 1 bản mỗi nhóm, set các bản dư sang `'COMPLETED'`) cần được quyết định bởi đội phát triển/chủ dự án, không tự thực hiện trong report này.

---

## 5. Migration Decision

**`BLOCKED_BY_DUPLICATE_DATA`**

Không apply migration trong Chặng 6D.4 này (đúng quy tắc không tự apply). Migration về mặt thiết kế SQL là đúng (mục 3), nhưng dữ liệu hiện tại trong DB dev vi phạm constraint mới — phải dọn dữ liệu trước khi apply được, ở bất kỳ môi trường nào (dev/staging/production).

---

## 6. Backend build

**Status: PASS**

```
npm run build  (nest build)
```
Chạy xong không có lỗi TypeScript, không cảnh báo. Real PASS — không giả lập.

---

## 7. Test discovery + run

**Status: PASS (Listening scope) — với 1 fix hạ tầng ngoài phạm vi Listening đã xin phép người dùng**

### 7.1 Test discovery
`npx jest --listTests` liệt kê thật 98 file spec, gồm đủ 6 file Listening-liên-quan: `listening.service.spec.ts`, `listening.controller.spec.ts`, `listening-job.service.spec.ts`, `rate-listening-session.dto.spec.ts`, `roles.guard.spec.ts`, `static-assets.config.spec.ts`.

### 7.2 Lần chạy đầu tiên — phát hiện lỗi hạ tầng ngoài scope
`npx jest` với pattern nhắm đúng 6 file trên: **3/6 suite FAIL** với `Cannot find module 'src/...'`.

**Nguyên nhân xác minh thật:** `package.json` jest config có `"rootDir": "src"` nhưng thiếu `modulePaths`/`moduleDirectories` để resolve import kiểu tuyệt đối `from 'src/common/...'` — dù `tsconfig.json` (`baseUrl: "./"`) khiến `nest build` hiểu đúng, Jest's resolver (khác `tsc`) thì không.

**Bằng chứng đây là lỗi TOÀN DỰ ÁN, không do Stage 6D:** grep `from 'src/` trên toàn `backend/src` → **157 lần, 119 file**, bao gồm các module hoàn toàn chưa từng bị đụng tới (vd. `courses.service.ts`, `courses.controller.ts`). Chạy `npm test` toàn bộ project (trước khi fix): **71/98 suite FAIL** với cùng lỗi — xác nhận đây là lỗi hạ tầng test có sẵn từ trước, ảnh hưởng gần như toàn bộ codebase, hoàn toàn không liên quan Listening/Stage 6D.

**Xử lý:** Đã hỏi ý kiến người dùng (AskUserQuestion) — người dùng chọn fix ngay bằng 1 dòng cấu hình tối thiểu: thêm `"modulePaths": ["<rootDir>/.."]` vào `jest` block trong `package.json`. Đây là thay đổi rủi ro thấp (chỉ ảnh hưởng module resolution, không đổi logic), nhưng về mặt kỹ thuật nằm ngoài phạm vi thuần Listening — đã được người dùng xác nhận cho phép.

### 7.3 Sau khi fix jest config
`npm test` toàn dự án: **67/98 suite fail, 31 pass** (giảm từ 71 fail). Các lỗi còn lại đều thuộc 1 loại lỗi hạ tầng KHÁC, cũng pre-existing, cũng ngoài scope Listening: rất nhiều file spec cũ (`courses`, `orders`, `missions`, `wallet`, `speaking`, `placement`, v.v. — không phải Listening) chỉ viết `providers: [XyzService]` mà không mock `PrismaService`, nên NestJS DI không compile được test module (`Nest can't resolve dependencies... PrismaService`). Đây là bug có sẵn của các spec file khác, y hệt loại lỗi tôi đã fix cho `ListeningService`/`ListeningController` ở các Chặng 6D trước — không sửa trong report này vì ngoài phạm vi Listening.

### 7.4 Kết quả thật, riêng scope Listening
```
npx jest --verbose "src/modules/listening" "src/modules/listening-job" "src/config/static-assets.config.spec.ts" "src/common/guards/roles.guard.spec.ts"

Test Suites: 6 passed, 6 total
Tests:       36 passed, 36 total
```
**Toàn bộ 6 suite, 36 test Listening: PASS thật.** (1 dòng log `ERROR ... ECONNREFUSED` xuất hiện trong output — đây là log CHỦ ĐÍCH từ test "Redis lỗi/unavailable: không throw, trả false", không phải lỗi thật, test đó PASS.)

---

## 8. Required test categories checklist (thật, không giả định)

| Nhóm | Test | Kết quả |
|---|---|---|
| Transcript security | resume session chỉ lộ transcript/correctAnswer cho câu đã trả lời | PASS |
| Admin authorization | RolesGuard đọc đúng metadata `@Roles(ADMIN)` từ `ListeningJobController`, chặn STUDENT/TEACHER, cho ADMIN, không throw khi thiếu user | PASS (6 test) |
| Reward farming | không phát Mission/XP khi `attempted===0`; có phát khi >0; skip-only vẫn tính; đã COMPLETED không phát lại; loser của race không phát lại | PASS (5 test) |
| Rating DTO validation | rating 1-5 hợp lệ, reject 0/6/non-int, comment ≤500 ký tự, reject thiếu rating | PASS (7 test) |
| Concurrent start (cold-start lock) | request đầu nhận lock, request 2 trong cooldown bị từ chối, TTL=60s, scope theo level/topic, Redis lỗi → false an toàn, enqueue job độc lập với lock | PASS (6 test) |
| Audio config | default path, custom `STATIC_ROOT_DIR`/`LISTENING_AUDIO_SUBDIR`, path traversal reject, absolute path reject, URL không lộ physical path | PASS (8 test) |
| Redis cooldown runtime | xem mục 9 | PASS |

---

## 9. Redis runtime verification

**Status: PASS**

Container thật: `english_platform_redis` (`redis:7-alpine`).
```
redis-cli ping                              → PONG
redis-cli INFO server                       → redis_version:7.4.9  (thỏa >=5)
redis-cli set test:stage6d4 1 EX 5 NX       → OK
redis-cli ttl test:stage6d4                 → 2   (đang đếm ngược đúng trong cửa sổ 5s)
```
Pattern `SET NX EX` hoạt động đúng thật trên Redis thật, không chỉ trên mock. Không log password (không dùng).

---

## 10. Audio storage runtime verification

**Status: PASS**

- `dir public\listening-audio` (thật): có sẵn hàng trăm file `.mp3`, bao gồm file mới tạo **cùng ngày hôm nay** (7/18/2026, 10:23 AM) — xác nhận writer hiện tại đang ghi đúng vào `<cwd>/public/listening-audio` theo config hợp nhất từ Stage 6D.3.
- `curl.exe -I http://localhost:3002/listening-audio/09a97fb5ef0a21a950c63993.mp3` (backend đang chạy thật, port 3002 theo `.env`):
  ```
  HTTP/1.1 200 OK
  Content-Type: audio/mpeg
  Content-Length: 105024   (khớp đúng kích thước file trên đĩa)
  ```
- URL không lộ physical path (`D:\elearning-english\...`) — chỉ `/listening-audio/<filename>`.
- Xác nhận trực tiếp: bug writer/server-config-mismatch (phát hiện Stage 6D.2, fix Stage 6D.3) hoạt động đúng trong thực tế — nếu còn lệch, request này đã trả 404.
- **Giới hạn cần ghi nhận:** cấu hình hiện tại hỗ trợ **single-instance storage** (đĩa cục bộ). Nếu scale nhiều instance backend, cần shared storage (S3/NFS/volume dùng chung) — chưa implement, ngoài phạm vi Chặng 6D.

---

## 11. Frontend build

**Status: PASS**

```
cd english-web-build && npm run build   (next build, Turbopack)
```
- Next.js 16.2.9, TypeScript compile PASS, 68/68 route generate thành công.
- Đủ toàn bộ route Listening: `/listening`, `/listening/dialogue`, `/listening/dictation`, `/listening/history`, `/listening/practice/[sessionId]`, `/listening/sessions/[sessionId]/result`, `/listening/topics`.
- Không có lỗi.

---

## 12. Regression (các module khác)

**Status: PASS (build-level), NOT RUN (test-level ngoài scope)**

- Backend build tổng thể PASS (mục 6) — không có lỗi biên dịch nào ở bất kỳ module nào khác do thay đổi Listening gây ra.
- Frontend build tổng thể PASS (mục 11) — 68 route khác Listening đều build được.
- Test-level regression cho Mission V2/Reward/Learning XP/Learning Path/Vocabulary/Grammar/Reading/Writing/Speaking: các suite pass được của các module này (`grammar`, `reading`, `writing`, `vocabulary`, `learning-path`, `missions-v2`, `auth`...) đều **PASS** trong lần chạy `npm test` toàn dự án (mục 7.3, phần "31 passed"/sau đó nhiều hơn). Các suite fail là do bug DI-mock pre-existing không liên quan Listening (mục 7.3) — không phải regression do Chặng 6D gây ra.

---

## 13. Lint / diff

**Status: PASS (0 lỗi mới do Stage 6D)**

- **Không dùng `npm run lint`** vì script đó có sẵn `--fix` (vi phạm quy tắc không auto-fix). Dùng `npx eslint <danh sách file cụ thể>` không `--fix`.
- Lần chạy đầu: 527 lỗi/2 warning trên 18 file Listening-scope.
- **Đối chứng:** chạy cùng eslint trên `auth.service.spec.ts` — file hoàn toàn chưa từng bị đụng — cho lỗi **y hệt pattern** (`Unsafe call... trên describe/it/expect`) → xác nhận đây là lỗi cấu hình ESLint/Jest-type toàn dự án, pre-existing, không do Stage 6D.
- Kiểm tra thủ công từng vị trí lỗi `no-unsafe-*` còn lại trong code nghiệp vụ (`roles.guard.ts`, `listening.service.ts` các dòng dùng `any`) — đối chiếu với đúng những dòng tôi thực sự sửa ở các Chặng 6D trước, xác nhận các hàm `mapCompletedSession(session: any)`, `toQuestionPayload(question: any, ...)`, `request.user` (any) đều **có `any` từ trước**, tôi không đổi kiểu dữ liệu của chúng.
- **Lỗi prettier thật (8 vị trí, thuộc code tôi viết ở các Chặng 6D trước, chưa từng chạy prettier)** — đã sửa thủ công (không dùng `--fix`), không đổi logic: `static-assets.config.ts` (2), `rate-listening-session.dto.ts` (1), `listening.service.ts` (3 vị trí), `listening.service.spec.ts` (1).
- Sau khi sửa: chạy lại, còn **498 lỗi/2 warning**, toàn bộ đều thuộc 2 nhóm pre-existing đã xác minh ở trên. **0 lỗi mới do Stage 6D.**
- Frontend: `npx eslint` 3 file đã sửa → 3 lỗi, cả 3 đều nằm trong code KHÔNG do tôi sửa (useEffect wrapper gọi `load()`, hàm `startAction()` dùng `any`) — xác nhận qua đối chiếu đúng phạm vi thay đổi đã ghi trong report cũ.

---

## 14. File đã sửa thêm trong Chặng 6D.4

| File | Thay đổi |
|---|---|
| `backend/package.json` | Thêm `"modulePaths": ["<rootDir>/.."]` vào jest config (fix lỗi hạ tầng toàn dự án, đã xin phép người dùng) |
| `backend/src/config/static-assets.config.ts` | Format lại 2 vị trí theo prettier (không đổi logic) |
| `backend/src/modules/listening/dto/rate-listening-session.dto.ts` | Format lại import theo prettier |
| `backend/src/modules/listening/listening.service.ts` | Format lại 3 vị trí theo prettier (ternary, findFirst call, method chain) — không đổi logic |
| `backend/src/modules/listening/listening.service.spec.ts` | Format lại 1 vị trí theo prettier |
| `backend/scripts/stage6d4-duplicate-audit.js` | **File mới, tạm thời** — script audit read-only, nên xoá sau khi dùng xong (không phải code sản phẩm) |

Không có thay đổi nào khác về logic nghiệp vụ trong Chặng 6D.4 — đúng yêu cầu "chỉ chạy lệnh thật và sửa lỗi build/test trực tiếp phát sinh".

---

## 15. Command đã chạy và kết quả thật (tóm tắt)

| Lệnh | Kết quả |
|---|---|
| `git status`, `git diff --stat`, `git diff --check` | PASS, sạch |
| `npx prisma format/validate/generate` | PASS |
| `npx prisma migrate status` | 4 migration pending (thật) |
| Duplicate audit SQL (read-only) | BLOCKED_BY_DUPLICATE_DATA — 3 nhóm, 13 session, nhóm lớn nhất 9 |
| `npm run build` (backend) | PASS |
| `npx jest --listTests` | 98 file, đủ 6 file Listening |
| `npm test` (toàn dự án, trước fix) | 71/98 suite fail (lỗi hạ tầng pre-existing) |
| `npm test` (toàn dự án, sau fix jest config) | 67/98 suite fail (lỗi DI-mock pre-existing khác, không phải Listening) |
| `npx jest` (6 file Listening) | **6/6 suite PASS, 36/36 test PASS** |
| `redis-cli ping/INFO/set/ttl` | PASS thật trên Redis 7.4.9 |
| `curl -I` audio file | HTTP 200 thật |
| `npm run build` (frontend) | PASS, 68/68 route |
| `npx eslint` (18 file backend) | 0 lỗi mới, 498 lỗi pre-existing đã phân loại |
| `npx eslint` (3 file frontend) | 0 lỗi mới, 3 lỗi pre-existing đã phân loại |

---

## 16. Migration Decision & Listening Production Decision

**Migration Decision: `BLOCKED_BY_DUPLICATE_DATA`**
Không apply. Cần dọn dữ liệu trùng (13 session `IN_PROGRESS`, 3 nhóm) trước khi apply được ở bất kỳ môi trường nào.

**Listening Production Decision: `READY_WITH_LIMITATIONS`**

Lý do:
- Toàn bộ fix bảo mật/reward/rating/leak transcript đã verify PASS thật bằng test thật + đối chiếu logic (mục 7-8).
- Redis cooldown + audio storage đã verify PASS thật bằng runtime check thật trên máy thật (mục 9-10), không chỉ mock.
- Backend + frontend build PASS thật.
- **Nhưng:** race-condition fix ở tầng DB (partial unique index) **CHƯA có hiệu lực** vì migration chưa apply được (do chính dữ liệu duplicate — bằng chứng thật là DB hiện có 9 session trùng nhau). Ứng dụng hiện chỉ được bảo vệ bởi P2002-catch ở tầng code (đã có sẵn, hoạt động khi migration được apply) — nhưng KHÔNG có bảo vệ tầng DB thật cho tới khi migration apply thành công.
- Audio storage giới hạn single-instance (đã ghi nhận, không phải bug, là giới hạn kiến trúc).
- Lỗi hạ tầng test/lint toàn dự án (ngoài Listening) vẫn tồn tại, không thuộc trách nhiệm sửa của Chặng 6D nhưng ảnh hưởng khả năng chạy CI toàn dự án nói chung — nên được xử lý ở 1 chặng hạ tầng riêng trong tương lai.

---

## 17. Stage 7 Gate: **CLOSED**

Điều kiện KHÔNG đạt (danh sách chính xác):

1. **Migration chưa được apply** ở bất kỳ môi trường nào (kể cả dev) — bị chặn bởi dữ liệu duplicate thật.
2. **Duplicate data chưa được dọn** — 3 nhóm, 13 session `IN_PROGRESS` cùng userId, cần quyết định nghiệp vụ (giữ bản nào, set status bản dư) trước khi có thể dọn — đây là quyết định của đội phát triển/chủ dự án, không tự thực hiện.
3. **Race-condition fix chưa có hiệu lực đầy đủ ở tầng DB** — chỉ có app-level P2002 catch, chưa có unique index thật bảo vệ.
4. Lỗi hạ tầng test/lint toàn dự án (ngoài Listening) vẫn còn tồn tại — không chặn riêng Listening nhưng ảnh hưởng độ tin cậy CI chung, nên cân nhắc 1 chặng riêng.

**Không bắt đầu Chặng 7 (Notifications/Achievements) trong cùng lượt này.**

---

## Việc cần làm tiếp theo (đề xuất, không tự thực hiện)

1. Quyết định nghiệp vụ: dọn 13 session `IN_PROGRESS` trùng lặp — khuyến nghị giữ bản `startedAt`/`updatedAt` mới nhất mỗi nhóm, set các bản dư sang `'COMPLETED'` (theo đúng comment trong migration).
2. Sau khi dọn sạch, chạy lại đúng audit query ở mục 4 để xác nhận `DUPLICATE_GROUPS_COUNT=0`, rồi mới cân nhắc `npx prisma migrate dev` (dev) / `migrate deploy` (staging/production) — cần xác nhận rõ ràng từ người dùng trước khi apply, cùng lúc với 3 migration pending khác.
3. Xoá file tạm `backend/scripts/stage6d4-duplicate-audit.js` sau khi không cần dùng nữa.
4. Cân nhắc 1 chặng hạ tầng riêng (không phải Listening) để xử lý: (a) các spec file cũ thiếu mock `PrismaService`, (b) cấu hình ESLint không resolve type Jest cho linter.
