# Chặng 6D.5 — Listening Data Cleanup & Migration Verification Report

**Ngày:** 2026-07-18
**Phương pháp:** Toàn bộ command chạy thật trên máy Windows của người dùng (PowerShell, `D:\elearning-english`), dán lại nguyên văn. Không giả lập bất kỳ kết quả nào.

---

## Executive Summary

Đã dọn sạch 10 `ListeningSession` trùng lặp (chuyển sang status `ABANDONED`, không xoá, không đánh dấu `COMPLETED` giả), xác nhận reward audit sạch tuyệt đối (0 reward từng phát cho bất kỳ session nào bị dọn), apply thành công migration chống race-condition (`20260719120000_add_listening_active_session_unique`) cùng 3 migration pending khác, và chạy lại toàn bộ verification (Prisma, backend build, 36/36 Listening test, frontend build, git diff) — **tất cả PASS thật**.

**Production Decision: `READY`**
**Stage 7: `OPEN`**

---

## Duplicate Audit

Trước cleanup (đối chiếu lại từ Chặng 6D.4, xác minh bằng query chi tiết mới có answer-count + timestamp thật):

| User | Level | Topic | Active Sessions | IDs | Attempted Answers | StartedAt |
|---|---|---|---|---|---|---|
| 3b126a1a... | B1 | Career | 2 | `9ea0aa8a` (16:32:39), `716c0877` (16:33:38) | 0, 0 | 2026-07-05 |
| 3b126a1a... | B1 | Education | 2 | `34a05312` (14:46:17), `ad0366e9` (14:46:40) | 0, **3** | 2026-07-09 |
| 3b126a1a... | B1 | Lifestyle | 9 | `6077a076, eafe375e, dbde94c6, ec69d10a, d242e483, 3e836c10, 1d664844, 35373f36, d6d42a3e` | tất cả 0 | 2026-07-06, 14:36-14:43 |

**Lưu ý kỹ thuật quan trọng:** `ListeningSession` không có cột `createdAt`/`updatedAt` riêng trong schema thật — chỉ có `startedAt`/`completedAt`. Vì vậy 2 tiêu chí tie-break "updatedAt mới nhất" và "createdAt mới nhất" trong spec đều quy về cùng một cột `startedAt` — đã ghi rõ trong code cleanup script, không phải giả định.

---

## Cleanup Strategy

Quy tắc chọn session giữ lại (áp dụng đúng thứ tự ưu tiên đã cho, không đoán):
1. Nhiều `attempted answers` nhất (đếm answer có `selectedAnswer IS NOT NULL OR isSkipped=true`, khớp đúng định nghĩa `attempted` dùng trong `finishSession()`).
2/3. Tie-break bằng `startedAt` mới nhất (do không có `updatedAt`/`createdAt` riêng).

Xử lý session thừa: **đánh dấu `status = 'ABANDONED'`** (giá trị mới, không cần migration vì `status` là String tự do) — theo lựa chọn người dùng xác nhận sau khi được trình bày ưu/nhược điểm so với xoá hẳn. Không đánh dấu `COMPLETED` giả, không xoá dữ liệu.

**Known Issue được ghi nhận (không sửa trong Chặng này, ngoài phạm vi cleanup):** `assertSessionEditable()` và điều kiện trong `finishSession()` hiện chỉ đặc cách xử lý `status === 'COMPLETED'`, chưa đặc cách `'ABANDONED'`. Về lý thuyết một session `ABANDONED` vẫn có thể bị sửa/finish nếu người dùng còn giữ đúng `sessionId` của nó. Đề xuất fix ở một chặng Listening-logic riêng trong tương lai (không phải cleanup).

Script cleanup có thêm 1 lớp an toàn độc lập: trước khi đánh dấu ABANDONED bất kỳ session nào, kiểm tra lại `xpEarned`/`coinsEarned`/`rating`/`completedAt` — nếu có bất kỳ dấu hiệu reward nào, **từ chối xử lý** session đó (dù có nghĩa là để lại duplicate), ưu tiên an toàn hơn triệt để.

---

## Sessions Removed (marked ABANDONED — không xoá)

| Session ID | Group | Attempted Answers | StartedAt |
|---|---|---|---|
| `9ea0aa8a-12f5-4585-a4f7-20d2cd4c8848` | Career | 0 | 2026-07-05 16:32:39 |
| `34a05312-61a8-4a3e-bb0b-f1dbff875ace` | Education | 0 | 2026-07-09 14:46:17 |
| `6077a076-36e0-4417-8e36-152143a00fd7` | Lifestyle | 0 | 2026-07-06 14:36:58 |
| `eafe375e-129a-43fd-9198-6cf056006a1b` | Lifestyle | 0 | 2026-07-06 14:37:42 |
| `dbde94c6-f0a0-4864-892a-d1a85497f8e6` | Lifestyle | 0 | 2026-07-06 14:37:59 |
| `ec69d10a-44b4-43ff-97f2-defe478e6549` | Lifestyle | 0 | 2026-07-06 14:40:03 |
| `d242e483-9d9d-455a-b88a-9e584b6a19f2` | Lifestyle | 0 | 2026-07-06 14:40:15 |
| `3e836c10-7966-42fb-98a1-2dde82b16c0f` | Lifestyle | 0 | 2026-07-06 14:41:13 |
| `1d664844-dfb1-4a91-8e3b-d24de4eedca5` | Lifestyle | 0 | 2026-07-06 14:41:31 |
| `35373f36-fa4a-4e99-862d-c0caa300eccf` | Lifestyle | 0 | 2026-07-06 14:42:44 |

**Tổng: 10 session, tất cả `attempted answers = 0` — không có tương tác người dùng thật nào bị mất.**

## Sessions Kept

| Session ID | Group | Attempted Answers | StartedAt | Lý do giữ |
|---|---|---|---|---|
| `716c0877-a3ad-42f2-9a5a-ed6a7a9fe448` | Career | 0 | 2026-07-05 16:33:38 | Tie-break: startedAt mới nhất |
| `ad0366e9-45b8-48d4-8fa2-3887aa6572a1` | Education | 3 | 2026-07-09 14:46:40 | Nhiều answer nhất |
| `d6d42a3e-655c-4f2d-8cee-b69482455c3c` | Lifestyle | 0 | 2026-07-06 14:43:04 | Tie-break: startedAt mới nhất |

---

## Reward Audit

**Kết quả: PASS — 0 reward bị mất hoặc double-grant.**

Kiểm tra thật trên toàn bộ 13 session (bao gồm 10 session bị dọn):
- `xpTransaction.sourceId` khớp 13 session ID: **0 dòng**.
- `xpTransaction.idempotencyKey` khớp `learning:LISTENING_COMPLETED:<sessionId>`: **0 dòng**.
- `LeaderboardActivity.sourceId` khớp 13 session ID: **0 dòng**.
- `MissionProgressEventV2.sourceId`: bảng **chưa tồn tại tại thời điểm audit** (migration `20260718090000_add_mission_progress_event_v2` khi đó còn pending — không liên quan Listening, đã apply ở Bước 8 của chặng này). Không ảnh hưởng kết luận vì XP/coins thật đã được xác nhận bằng 0 qua `xpTransaction` (nguồn ghi nhận XP thật duy nhất) và các cột `xpEarned`/`coinsEarned` ngay trên bản thân session (đều = 0 cho cả 13 session).
- `session.xpEarned`, `session.coinsEarned`, `session.rating`, `session.completedAt`: đều `0`/`null` cho toàn bộ 13 session.

**Kết luận:** Không session nào trong 13 session từng hoàn thành (`completedAt` luôn `null`), nên không session nào từng đi qua nhánh phát thưởng thật của `finishSession()`. Việc đánh dấu 10 session thừa sang `ABANDONED` không làm mất hay nhân đôi bất kỳ XP/Mission/Coins/Pet/Leaderboard/Learning Path nào.

**Ghi chú phụ (tích cực, ngoài scope cleanup):** Vì `MissionProgressEventV2` giờ đã tồn tại (migration được áp dụng ở Bước 8), `missionV2ProgressService.increase()` — vốn được `updateListeningMissions()` của Listening gọi mỗi khi hoàn thành bài — từ nay sẽ thực sự ghi được dữ liệu thay vì lỗi ngầm bị `catch` nuốt (như mô tả trong code). Đây là cải thiện tự nhiên đi kèm, không phải thay đổi logic cố ý trong chặng này.

---

## Migration Result

```
npx prisma migrate dev
```
**PASS.** 4 migration pending được áp dụng cùng lúc (không thể chọn riêng với `migrate dev`):
- `20260717034435_add_chat_session` (ngoài scope Listening)
- `20260717040228_add_chat_pet_feature` (ngoài scope Listening)
- `20260718090000_add_mission_progress_event_v2` (ngoài scope Listening — nhưng gián tiếp liên quan Listening qua Mission, xem ghi chú trên)
- `20260719120000_add_listening_active_session_unique` (Listening — **migration chính của chặng này**)

`"Your database is now in sync with your schema."` — không có lỗi `CREATE UNIQUE INDEX` (xác nhận cleanup đã đủ sạch trước khi apply).

Có 1 lỗi phụ `EPERM` khi Prisma tự động chạy `generate` ngay sau migrate (do file `.dll.node` bị khoá bởi tiến trình Node khác đang chạy) — đã xử lý bằng cách chạy lại `npx prisma generate` thủ công, PASS sạch ở lần sau.

---

## Prisma Status

```
npx prisma validate    → PASS ("valid 🚀")
npx prisma generate    → PASS (sau khi giải phóng file lock)
npx prisma migrate status → "Database schema is up to date!" — 0 migration pending
```

---

## Backend Build

```
npm run build   (nest build)
```
**PASS** — không lỗi TypeScript.

---

## Frontend Build

```
npm run build   (next build, Turbopack)
```
**PASS** — Next.js 16.2.9, TypeScript OK, 68/68 route generate thành công, đủ toàn bộ route Listening.

---

## Listening Tests

```
npx jest --verbose "src/modules/listening" "src/modules/listening-job" "src/config/static-assets.config.spec.ts" "src/common/guards/roles.guard.spec.ts"

Test Suites: 6 passed, 6 total
Tests:       36 passed, 36 total
```
**PASS — 6/6 suite, 36/36 test, sau khi apply migration, không regression** so với kết quả Chặng 6D.4.

---

## Diff Check

```
git diff --check   → sạch (chỉ cảnh báo CRLF bình thường trên Windows, không phải lỗi whitespace thật)
git status         → khớp đúng scope, không có thay đổi ngoài ý muốn, không commit/push
```

---

## Known Issues

1. **`assertSessionEditable()`/`finishSession()` chưa đặc cách status `'ABANDONED'`** — về lý thuyết session abandoned vẫn có thể bị sửa/finish nếu người dùng giữ đúng sessionId. Rủi ro thấp (sessionId không hiển thị công khai, và 10 session bị abandon đều không có answer thật nên không có động cơ khai thác), nhưng nên fix ở 1 chặng Listening-logic riêng trong tương lai.
2. **3 migration ngoài scope Listening** (`add_chat_session`, `add_chat_pet_feature`, `add_mission_progress_event_v2`) đã được áp dụng cùng lúc do giới hạn kỹ thuật của `prisma migrate dev` (không thể áp dụng chọn lọc từng migration). Không thuộc phạm vi audit Listening — khuyến nghị đội phụ trách các tính năng Chat/Pet/Mission V2 tự xác minh riêng nếu chưa từng verify.
3. Lỗi hạ tầng test/lint toàn dự án (ghi nhận ở Chặng 6D.4: nhiều spec file cũ thiếu mock `PrismaService`) **vẫn còn tồn tại**, không thuộc phạm vi Listening, không chặn Stage 7 của Listening nhưng vẫn nên xử lý ở 1 chặng hạ tầng riêng.
4. File backup (`backend/backups/english_platform_backup_2026-07-18.sql`) và các script audit/cleanup tạm thời (`backend/scripts/*.js`, `.ts`) hiện là untracked — khuyến nghị giữ lại backup ít nhất cho tới khi xác nhận hệ thống ổn định qua vài ngày, các script audit có thể xoá hoặc archive.

---

## Production Decision: `READY`

Tất cả các giới hạn trước đó (migration chưa apply, dữ liệu trùng) đã được giải quyết bằng dữ liệu và quy trình thật, có backup, có audit reward đầy đủ trước khi hành động. Race-condition hiện được bảo vệ ở cả 2 tầng: code (P2002 catch, đã có từ Stage 6D) và DB (partial unique index, vừa apply thành công và verify sạch).

## Stage 7: `OPEN`

Toàn bộ 7 điều kiện đều đạt bằng dữ liệu thật:
- Duplicate = 0 ✓ (audit lại xác nhận)
- Migration apply thành công ✓
- Prisma status sạch ✓ (0 pending)
- Backend build PASS ✓
- Frontend build PASS ✓
- Listening tests PASS ✓ (36/36)
- Reward audit PASS ✓ (0 reward bị ảnh hưởng)

Có thể bắt đầu Chặng 7 (Notifications/Achievements) ở lượt làm việc tiếp theo.
