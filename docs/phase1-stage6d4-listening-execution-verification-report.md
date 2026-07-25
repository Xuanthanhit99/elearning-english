# Cháº·ng 6D.4 â€” Listening Execution-Only Verification Report

**NgÃ y:** 2026-07-18
**PhÆ°Æ¡ng phÃ¡p xÃ¡c minh:** ToÃ n bá»™ command trong report nÃ y Ä‘Æ°á»£c ngÆ°á»i dÃ¹ng (beacon-dev) cháº¡y trá»±c tiáº¿p trÃªn mÃ¡y Windows tháº­t (PowerShell, `D:\elearning-english`) vÃ  dÃ¡n láº¡i nguyÃªn vÄƒn output do `mcp__workspace__bash` (sandbox) khÃ´ng kháº£ dá»¥ng ("Not enough disk space to set up the workspace") vÃ  computer-use khÃ´ng thá»ƒ gÃµ lá»‡nh vÃ o terminal (tier "click" â€” chá»‰ click Ä‘Æ°á»£c, khÃ´ng type Ä‘Æ°á»£c). KhÃ´ng cÃ³ káº¿t quáº£ nÃ o trong report nÃ y Ä‘Æ°á»£c giáº£ láº­p.

---

## 1. Git state

**Status: PASS**

```
git status
```
- Branch `main`, up to date vá»›i `origin/main`.
- 15 file modified Ä‘Ãºng scope Listening (Stage 6D â†’ 6D.3) + `package.json` (sá»­a má»›i trong 6D.4, xem má»¥c 7).
- Untracked: migration má»›i, `roles.guard.spec.ts`, `src/config/` (static-assets config + spec), `rate-listening-session.dto.ts` + spec, `listening-redis.provider.ts`, 4 report cÅ©, vÃ  `scripts/stage6d4-duplicate-audit.js` (script audit má»›i, xem má»¥c 4 â€” **nÃªn xoÃ¡ sau khi dÃ¹ng xong, khÃ´ng pháº£i code sáº£n pháº©m**).

```
git diff --stat
```
- 16 file thay Ä‘á»•i, 828 insertions(+), 13 deletions(-) â€” khá»›p vá»›i cÃ¡c stage trÆ°á»›c cá»™ng thÃªm `package.json` (+3 dÃ²ng, xem má»¥c 7).

```
git diff --check
```
- KhÃ´ng cÃ³ lá»—i whitespace tháº­t. CÃ¡c dÃ²ng "LF will be replaced by CRLF" chá»‰ lÃ  cáº£nh bÃ¡o line-ending bÃ¬nh thÆ°á»ng trÃªn Windows, khÃ´ng pháº£i lá»—i.

**KhÃ´ng cÃ³ gÃ¬ bá»‹ máº¥t, khÃ´ng cÃ³ thay Ä‘á»•i ngoÃ i Ã½ muá»‘n.**

---

## 2. Prisma checks

**Status: PASS**

```
npx prisma format   â†’ "Formatted prisma\schema.prisma" â€” PASS
npx prisma validate â†’ "The schema... is valid" â€” PASS
npx prisma generate â†’ "Generated Prisma Client (v6.19.3)" â€” PASS
```

```
npx prisma migrate status
```
Káº¿t quáº£ tháº­t, 4 migration pending (Ä‘Ãºng nhÆ° 3 report trÆ°á»›c dá»± Ä‘oÃ¡n, xÃ¡c minh láº¡i â€” khÃ´ng giáº£ Ä‘á»‹nh):
```
20260717034435_add_chat_session
20260717040228_add_chat_pet_feature
20260718090000_add_mission_progress_event_v2
20260719120000_add_listening_active_session_unique
```
ChÆ°a migration nÃ o Ä‘Æ°á»£c apply. Migration Listening (`20260719120000_...`) Ä‘Ãºng nhÆ° thiáº¿t káº¿ á»Ÿ Stage 6D.3 (COALESCE sentinel cho level/topic nullable).

---

## 3. Migration SQL review (Ä‘á»‘i chiáº¿u DB tháº­t)

**Status: PASS (thiáº¿t káº¿), nhÆ°ng KHÃ”NG Ä‘Æ°á»£c apply â€” xem má»¥c 4**

- TÃªn báº£ng `"ListeningSession"`, cá»™t `"userId"`, `"level"`, `"topic"`, `"status"` khá»›p Ä‘Ãºng `schema.prisma` (Ä‘Ã£ Ä‘á»c láº¡i model tháº­t, dÃ²ng 1318-1339).
- Cá»™t tháº­t trong model: `id, userId, level, topic, total, correct, wrong, skipped, score, status, xpEarned, coinsEarned, rating, ratingComment, ratedAt, startedAt, completedAt` â€” **khÃ´ng cÃ³ `createdAt`/`updatedAt`** (phÃ¡t hiá»‡n tháº­t á»Ÿ má»¥c 4, Ä‘Ã£ sá»­a script audit).
- Predicate `WHERE "status" = 'IN_PROGRESS'` khá»›p Ä‘Ãºng giÃ¡ trá»‹ status thá»±c táº¿ dÃ¹ng trong code (`status` lÃ  `String` tá»± do, chá»‰ 2 giÃ¡ trá»‹ `'IN_PROGRESS'`/`'COMPLETED'` Ä‘Æ°á»£c dÃ¹ng).
- Sentinel COALESCE (`__NULL_LEVEL__`, `__NULL_TOPIC__`) type-correct (String), khÃ´ng trÃ¹ng dá»¯ liá»‡u tháº­t (level luÃ´n A1-C2, topic khÃ´ng cÃ³ tiá»n lá»‡ chá»©a chuá»—i nÃ y).
- Index chá»‰ Ã¡p dá»¥ng khi `status='IN_PROGRESS'` â†’ khÃ´ng cháº·n viá»‡c táº¡o session má»›i sau khi Ä‘Ã£ hoÃ n thÃ nh.

---

## 4. Duplicate-data audit (read-only, DB tháº­t)

**Status: BLOCKED_BY_DUPLICATE_DATA â€” cÃ³ dá»¯ liá»‡u vi pháº¡m tháº­t**

Script `backend/scripts/stage6d4-duplicate-audit.js` (chá»‰ `SELECT`, khÃ´ng `UPDATE`/`DELETE`) cháº¡y qua Prisma Client tháº­t, káº¿t quáº£ tháº­t:

| userId | level | topic | active_count | session IDs (rÃºt gá»n) | status | ghi chÃº |
|---|---|---|---|---|---|---|
| 3b126a1a... | B1 | Lifestyle | **9** | dbde94c6, ec69d10a, d242e483, 3e836c10, 1d664844, 35373f36, d6d42a3e, 6077a076, eafe375e | táº¥t cáº£ `IN_PROGRESS` | startedAt tráº£i tá»« 14:36:58 â†’ 14:43:04 ngÃ y 2026-07-06, `completedAt` Ä‘á»u `null` |
| 3b126a1a... | B1 | Career | 2 | 9ea0aa8a, 716c0877 | `IN_PROGRESS` | startedAt 2026-07-05 16:32/16:33 |
| 3b126a1a... | B1 | Education | 2 | ad0366e9, 34a05312 | `IN_PROGRESS` | startedAt 2026-07-09 14:46 |

- Tá»•ng session `IN_PROGRESS` toÃ n báº£ng: **13**.
- `NULL_LEVEL_TOPIC_BREAKDOWN`: 0 row cÃ³ `level`/`topic` NULL trong toÃ n bá»™ 13 row â€” xÃ¡c nháº­n thiáº¿t káº¿ COALESCE á»Ÿ má»¥c 3 hiá»‡n chÆ°a thá»±c sá»± Ä‘Æ°á»£c test báº±ng dá»¯ liá»‡u NULL tháº­t (nhÆ°ng khÃ´ng áº£nh hÆ°á»Ÿng tÃ­nh Ä‘Ãºng Ä‘áº¯n).

**Káº¿t luáº­n:** Náº¿u apply migration `20260719120000_...` ngay bÃ¢y giá», `CREATE UNIQUE INDEX` sáº½ **FAIL** vÃ¬ nhÃ³m `(userId=3b126a1a..., B1, Lifestyle)` cÃ³ 9 row vi pháº¡m constraint. ÄÃ¢y chÃ­nh lÃ  báº±ng chá»©ng thá»±c táº¿ cho lá»— há»•ng race-condition mÃ  migration nÃ y Ä‘Æ°á»£c thiáº¿t káº¿ Ä‘á»ƒ cháº·n â€” dá»¯ liá»‡u duplicate cÃ³ sáºµn trong DB dev hiá»‡n táº¡i lÃ  do lá»—i cÅ© (trÆ°á»›c khi cÃ³ `isUniqueConstraintError`/P2002 catch á»Ÿ Stage 6D) táº¡o ra, migration chÆ°a tá»«ng Ä‘Æ°á»£c apply nÃªn chÆ°a báº£o vá»‡ Ä‘Æ°á»£c cÃ¡c session táº¡o sau Ä‘Ã³.

**KhÃ´ng thá»±c hiá»‡n báº¥t ká»³ UPDATE/DELETE nÃ o.** Viá»‡c dá»n dá»¯ liá»‡u (theo Ä‘Ãºng khuyáº¿n nghá»‹ trong comment migration: giá»¯ láº¡i 1 báº£n má»—i nhÃ³m, set cÃ¡c báº£n dÆ° sang `'COMPLETED'`) cáº§n Ä‘Æ°á»£c quyáº¿t Ä‘á»‹nh bá»Ÿi Ä‘á»™i phÃ¡t triá»ƒn/chá»§ dá»± Ã¡n, khÃ´ng tá»± thá»±c hiá»‡n trong report nÃ y.

---

## 5. Migration Decision

**`BLOCKED_BY_DUPLICATE_DATA`**

KhÃ´ng apply migration trong Cháº·ng 6D.4 nÃ y (Ä‘Ãºng quy táº¯c khÃ´ng tá»± apply). Migration vá» máº·t thiáº¿t káº¿ SQL lÃ  Ä‘Ãºng (má»¥c 3), nhÆ°ng dá»¯ liá»‡u hiá»‡n táº¡i trong DB dev vi pháº¡m constraint má»›i â€” pháº£i dá»n dá»¯ liá»‡u trÆ°á»›c khi apply Ä‘Æ°á»£c, á»Ÿ báº¥t ká»³ mÃ´i trÆ°á»ng nÃ o (dev/staging/production).

---

## 6. Backend build

**Status: PASS**

```
npm run build  (nest build)
```
Cháº¡y xong khÃ´ng cÃ³ lá»—i TypeScript, khÃ´ng cáº£nh bÃ¡o. Real PASS â€” khÃ´ng giáº£ láº­p.

---

## 7. Test discovery + run

**Status: PASS (Listening scope) â€” vá»›i 1 fix háº¡ táº§ng ngoÃ i pháº¡m vi Listening Ä‘Ã£ xin phÃ©p ngÆ°á»i dÃ¹ng**

### 7.1 Test discovery
`npx jest --listTests` liá»‡t kÃª tháº­t 98 file spec, gá»“m Ä‘á»§ 6 file Listening-liÃªn-quan: `listening.service.spec.ts`, `listening.controller.spec.ts`, `listening-job.service.spec.ts`, `rate-listening-session.dto.spec.ts`, `roles.guard.spec.ts`, `static-assets.config.spec.ts`.

### 7.2 Láº§n cháº¡y Ä‘áº§u tiÃªn â€” phÃ¡t hiá»‡n lá»—i háº¡ táº§ng ngoÃ i scope
`npx jest` vá»›i pattern nháº¯m Ä‘Ãºng 6 file trÃªn: **3/6 suite FAIL** vá»›i `Cannot find module 'src/...'`.

**NguyÃªn nhÃ¢n xÃ¡c minh tháº­t:** `package.json` jest config cÃ³ `"rootDir": "src"` nhÆ°ng thiáº¿u `modulePaths`/`moduleDirectories` Ä‘á»ƒ resolve import kiá»ƒu tuyá»‡t Ä‘á»‘i `from 'src/common/...'` â€” dÃ¹ `tsconfig.json` (`baseUrl: "./"`) khiáº¿n `nest build` hiá»ƒu Ä‘Ãºng, Jest's resolver (khÃ¡c `tsc`) thÃ¬ khÃ´ng.

**Báº±ng chá»©ng Ä‘Ã¢y lÃ  lá»—i TOÃ€N Dá»° ÃN, khÃ´ng do Stage 6D:** grep `from 'src/` trÃªn toÃ n `backend/src` â†’ **157 láº§n, 119 file**, bao gá»“m cÃ¡c module hoÃ n toÃ n chÆ°a tá»«ng bá»‹ Ä‘á»¥ng tá»›i (vd. `courses.service.ts`, `courses.controller.ts`). Cháº¡y `npm test` toÃ n bá»™ project (trÆ°á»›c khi fix): **71/98 suite FAIL** vá»›i cÃ¹ng lá»—i â€” xÃ¡c nháº­n Ä‘Ã¢y lÃ  lá»—i háº¡ táº§ng test cÃ³ sáºµn tá»« trÆ°á»›c, áº£nh hÆ°á»Ÿng gáº§n nhÆ° toÃ n bá»™ codebase, hoÃ n toÃ n khÃ´ng liÃªn quan Listening/Stage 6D.

**Xá»­ lÃ½:** ÄÃ£ há»i Ã½ kiáº¿n ngÆ°á»i dÃ¹ng (AskUserQuestion) â€” ngÆ°á»i dÃ¹ng chá»n fix ngay báº±ng 1 dÃ²ng cáº¥u hÃ¬nh tá»‘i thiá»ƒu: thÃªm `"modulePaths": ["<rootDir>/.."]` vÃ o `jest` block trong `package.json`. ÄÃ¢y lÃ  thay Ä‘á»•i rá»§i ro tháº¥p (chá»‰ áº£nh hÆ°á»Ÿng module resolution, khÃ´ng Ä‘á»•i logic), nhÆ°ng vá» máº·t ká»¹ thuáº­t náº±m ngoÃ i pháº¡m vi thuáº§n Listening â€” Ä‘Ã£ Ä‘Æ°á»£c ngÆ°á»i dÃ¹ng xÃ¡c nháº­n cho phÃ©p.

### 7.3 Sau khi fix jest config
`npm test` toÃ n dá»± Ã¡n: **67/98 suite fail, 31 pass** (giáº£m tá»« 71 fail). CÃ¡c lá»—i cÃ²n láº¡i Ä‘á»u thuá»™c 1 loáº¡i lá»—i háº¡ táº§ng KHÃC, cÅ©ng pre-existing, cÅ©ng ngoÃ i scope Listening: ráº¥t nhiá»u file spec cÅ© (`courses`, `orders`, `missions`, `wallet`, `speaking`, `placement`, v.v. â€” khÃ´ng pháº£i Listening) chá»‰ viáº¿t `providers: [XyzService]` mÃ  khÃ´ng mock `PrismaService`, nÃªn NestJS DI khÃ´ng compile Ä‘Æ°á»£c test module (`Nest can't resolve dependencies... PrismaService`). ÄÃ¢y lÃ  bug cÃ³ sáºµn cá»§a cÃ¡c spec file khÃ¡c, y há»‡t loáº¡i lá»—i tÃ´i Ä‘Ã£ fix cho `ListeningService`/`ListeningController` á»Ÿ cÃ¡c Cháº·ng 6D trÆ°á»›c â€” khÃ´ng sá»­a trong report nÃ y vÃ¬ ngoÃ i pháº¡m vi Listening.

### 7.4 Káº¿t quáº£ tháº­t, riÃªng scope Listening
```
npx jest --verbose "src/modules/listening" "src/modules/listening-job" "src/config/static-assets.config.spec.ts" "src/common/guards/roles.guard.spec.ts"

Test Suites: 6 passed, 6 total
Tests:       36 passed, 36 total
```
**ToÃ n bá»™ 6 suite, 36 test Listening: PASS tháº­t.** (1 dÃ²ng log `ERROR ... ECONNREFUSED` xuáº¥t hiá»‡n trong output â€” Ä‘Ã¢y lÃ  log CHá»¦ ÄÃCH tá»« test "Redis lá»—i/unavailable: khÃ´ng throw, tráº£ false", khÃ´ng pháº£i lá»—i tháº­t, test Ä‘Ã³ PASS.)

---

## 8. Required test categories checklist (tháº­t, khÃ´ng giáº£ Ä‘á»‹nh)

| NhÃ³m | Test | Káº¿t quáº£ |
|---|---|---|
| Transcript security | resume session chá»‰ lá»™ transcript/correctAnswer cho cÃ¢u Ä‘Ã£ tráº£ lá»i | PASS |
| Admin authorization | RolesGuard Ä‘á»c Ä‘Ãºng metadata `@Roles(ADMIN)` tá»« `ListeningJobController`, cháº·n STUDENT/TEACHER, cho ADMIN, khÃ´ng throw khi thiáº¿u user | PASS (6 test) |
| Reward farming | khÃ´ng phÃ¡t Mission/XP khi `attempted===0`; cÃ³ phÃ¡t khi >0; skip-only váº«n tÃ­nh; Ä‘Ã£ COMPLETED khÃ´ng phÃ¡t láº¡i; loser cá»§a race khÃ´ng phÃ¡t láº¡i | PASS (5 test) |
| Rating DTO validation | rating 1-5 há»£p lá»‡, reject 0/6/non-int, comment â‰¤500 kÃ½ tá»±, reject thiáº¿u rating | PASS (7 test) |
| Concurrent start (cold-start lock) | request Ä‘áº§u nháº­n lock, request 2 trong cooldown bá»‹ tá»« chá»‘i, TTL=60s, scope theo level/topic, Redis lá»—i â†’ false an toÃ n, enqueue job Ä‘á»™c láº­p vá»›i lock | PASS (6 test) |
| Audio config | default path, custom `STATIC_ROOT_DIR`/`LISTENING_AUDIO_SUBDIR`, path traversal reject, absolute path reject, URL khÃ´ng lá»™ physical path | PASS (8 test) |
| Redis cooldown runtime | xem má»¥c 9 | PASS |

---

## 9. Redis runtime verification

**Status: PASS**

Container tháº­t: `english_platform_redis` (`redis:7-alpine`).
```
redis-cli ping                              â†’ PONG
redis-cli INFO server                       â†’ redis_version:7.4.9  (thá»a >=5)
redis-cli set test:stage6d4 1 EX 5 NX       â†’ OK
redis-cli ttl test:stage6d4                 â†’ 2   (Ä‘ang Ä‘áº¿m ngÆ°á»£c Ä‘Ãºng trong cá»­a sá»• 5s)
```
Pattern `SET NX EX` hoáº¡t Ä‘á»™ng Ä‘Ãºng tháº­t trÃªn Redis tháº­t, khÃ´ng chá»‰ trÃªn mock. KhÃ´ng log password (khÃ´ng dÃ¹ng).

---

## 10. Audio storage runtime verification

**Status: PASS**

- `dir public\listening-audio` (tháº­t): cÃ³ sáºµn hÃ ng trÄƒm file `.mp3`, bao gá»“m file má»›i táº¡o **cÃ¹ng ngÃ y hÃ´m nay** (7/18/2026, 10:23 AM) â€” xÃ¡c nháº­n writer hiá»‡n táº¡i Ä‘ang ghi Ä‘Ãºng vÃ o `<cwd>/public/listening-audio` theo config há»£p nháº¥t tá»« Stage 6D.3.
- `curl.exe -I http://localhost:3002/listening-audio/09a97fb5ef0a21a950c63993.mp3` (backend Ä‘ang cháº¡y tháº­t, port 3002 theo `.env`):
  ```
  HTTP/1.1 200 OK
  Content-Type: audio/mpeg
  Content-Length: 105024   (khá»›p Ä‘Ãºng kÃ­ch thÆ°á»›c file trÃªn Ä‘Ä©a)
  ```
- URL khÃ´ng lá»™ physical path (`D:\elearning-english\...`) â€” chá»‰ `/listening-audio/<filename>`.
- XÃ¡c nháº­n trá»±c tiáº¿p: bug writer/server-config-mismatch (phÃ¡t hiá»‡n Stage 6D.2, fix Stage 6D.3) hoáº¡t Ä‘á»™ng Ä‘Ãºng trong thá»±c táº¿ â€” náº¿u cÃ²n lá»‡ch, request nÃ y Ä‘Ã£ tráº£ 404.
- **Giá»›i háº¡n cáº§n ghi nháº­n:** cáº¥u hÃ¬nh hiá»‡n táº¡i há»— trá»£ **single-instance storage** (Ä‘Ä©a cá»¥c bá»™). Náº¿u scale nhiá»u instance backend, cáº§n shared storage (S3/NFS/volume dÃ¹ng chung) â€” chÆ°a implement, ngoÃ i pháº¡m vi Cháº·ng 6D.

---

## 11. Frontend build

**Status: PASS**

```
cd english-web-build && npm run build   (next build, Turbopack)
```
- Next.js 16.2.9, TypeScript compile PASS, 68/68 route generate thÃ nh cÃ´ng.
- Äá»§ toÃ n bá»™ route Listening: `/listening`, `/listening/dialogue`, `/listening/dictation`, `/listening/history`, `/listening/practice/[sessionId]`, `/listening/sessions/[sessionId]/result`, `/listening/topics`.
- KhÃ´ng cÃ³ lá»—i.

---

## 12. Regression (cÃ¡c module khÃ¡c)

**Status: PASS (build-level), NOT RUN (test-level ngoÃ i scope)**

- Backend build tá»•ng thá»ƒ PASS (má»¥c 6) â€” khÃ´ng cÃ³ lá»—i biÃªn dá»‹ch nÃ o á»Ÿ báº¥t ká»³ module nÃ o khÃ¡c do thay Ä‘á»•i Listening gÃ¢y ra.
- Frontend build tá»•ng thá»ƒ PASS (má»¥c 11) â€” 68 route khÃ¡c Listening Ä‘á»u build Ä‘Æ°á»£c.
- Test-level regression cho Mission V2/Reward/Learning XP/Learning Path/Vocabulary/Grammar/Reading/Writing/Speaking: cÃ¡c suite pass Ä‘Æ°á»£c cá»§a cÃ¡c module nÃ y (`grammar`, `reading`, `writing`, `vocabulary`, `learning-path`, `missions-v2`, `auth`...) Ä‘á»u **PASS** trong láº§n cháº¡y `npm test` toÃ n dá»± Ã¡n (má»¥c 7.3, pháº§n "31 passed"/sau Ä‘Ã³ nhiá»u hÆ¡n). CÃ¡c suite fail lÃ  do bug DI-mock pre-existing khÃ´ng liÃªn quan Listening (má»¥c 7.3) â€” khÃ´ng pháº£i regression do Cháº·ng 6D gÃ¢y ra.

---

## 13. Lint / diff

**Status: PASS (0 lá»—i má»›i do Stage 6D)**

- **KhÃ´ng dÃ¹ng `npm run lint`** vÃ¬ script Ä‘Ã³ cÃ³ sáºµn `--fix` (vi pháº¡m quy táº¯c khÃ´ng auto-fix). DÃ¹ng `npx eslint <danh sÃ¡ch file cá»¥ thá»ƒ>` khÃ´ng `--fix`.
- Láº§n cháº¡y Ä‘áº§u: 527 lá»—i/2 warning trÃªn 18 file Listening-scope.
- **Äá»‘i chá»©ng:** cháº¡y cÃ¹ng eslint trÃªn `auth.service.spec.ts` â€” file hoÃ n toÃ n chÆ°a tá»«ng bá»‹ Ä‘á»¥ng â€” cho lá»—i **y há»‡t pattern** (`Unsafe call... trÃªn describe/it/expect`) â†’ xÃ¡c nháº­n Ä‘Ã¢y lÃ  lá»—i cáº¥u hÃ¬nh ESLint/Jest-type toÃ n dá»± Ã¡n, pre-existing, khÃ´ng do Stage 6D.
- Kiá»ƒm tra thá»§ cÃ´ng tá»«ng vá»‹ trÃ­ lá»—i `no-unsafe-*` cÃ²n láº¡i trong code nghiá»‡p vá»¥ (`roles.guard.ts`, `listening.service.ts` cÃ¡c dÃ²ng dÃ¹ng `any`) â€” Ä‘á»‘i chiáº¿u vá»›i Ä‘Ãºng nhá»¯ng dÃ²ng tÃ´i thá»±c sá»± sá»­a á»Ÿ cÃ¡c Cháº·ng 6D trÆ°á»›c, xÃ¡c nháº­n cÃ¡c hÃ m `mapCompletedSession(session: any)`, `toQuestionPayload(question: any, ...)`, `request.user` (any) Ä‘á»u **cÃ³ `any` tá»« trÆ°á»›c**, tÃ´i khÃ´ng Ä‘á»•i kiá»ƒu dá»¯ liá»‡u cá»§a chÃºng.
- **Lá»—i prettier tháº­t (8 vá»‹ trÃ­, thuá»™c code tÃ´i viáº¿t á»Ÿ cÃ¡c Cháº·ng 6D trÆ°á»›c, chÆ°a tá»«ng cháº¡y prettier)** â€” Ä‘Ã£ sá»­a thá»§ cÃ´ng (khÃ´ng dÃ¹ng `--fix`), khÃ´ng Ä‘á»•i logic: `static-assets.config.ts` (2), `rate-listening-session.dto.ts` (1), `listening.service.ts` (3 vá»‹ trÃ­), `listening.service.spec.ts` (1).
- Sau khi sá»­a: cháº¡y láº¡i, cÃ²n **498 lá»—i/2 warning**, toÃ n bá»™ Ä‘á»u thuá»™c 2 nhÃ³m pre-existing Ä‘Ã£ xÃ¡c minh á»Ÿ trÃªn. **0 lá»—i má»›i do Stage 6D.**
- Frontend: `npx eslint` 3 file Ä‘Ã£ sá»­a â†’ 3 lá»—i, cáº£ 3 Ä‘á»u náº±m trong code KHÃ”NG do tÃ´i sá»­a (useEffect wrapper gá»i `load()`, hÃ m `startAction()` dÃ¹ng `any`) â€” xÃ¡c nháº­n qua Ä‘á»‘i chiáº¿u Ä‘Ãºng pháº¡m vi thay Ä‘á»•i Ä‘Ã£ ghi trong report cÅ©.

---

## 14. File Ä‘Ã£ sá»­a thÃªm trong Cháº·ng 6D.4

| File | Thay Ä‘á»•i |
|---|---|
| `backend/package.json` | ThÃªm `"modulePaths": ["<rootDir>/.."]` vÃ o jest config (fix lá»—i háº¡ táº§ng toÃ n dá»± Ã¡n, Ä‘Ã£ xin phÃ©p ngÆ°á»i dÃ¹ng) |
| `backend/src/config/static-assets.config.ts` | Format láº¡i 2 vá»‹ trÃ­ theo prettier (khÃ´ng Ä‘á»•i logic) |
| `backend/src/modules/listening/dto/rate-listening-session.dto.ts` | Format láº¡i import theo prettier |
| `backend/src/modules/listening/listening.service.ts` | Format láº¡i 3 vá»‹ trÃ­ theo prettier (ternary, findFirst call, method chain) â€” khÃ´ng Ä‘á»•i logic |
| `backend/src/modules/listening/listening.service.spec.ts` | Format láº¡i 1 vá»‹ trÃ­ theo prettier |
| `backend/scripts/stage6d4-duplicate-audit.js` | **File má»›i, táº¡m thá»i** â€” script audit read-only, nÃªn xoÃ¡ sau khi dÃ¹ng xong (khÃ´ng pháº£i code sáº£n pháº©m) |

KhÃ´ng cÃ³ thay Ä‘á»•i nÃ o khÃ¡c vá» logic nghiá»‡p vá»¥ trong Cháº·ng 6D.4 â€” Ä‘Ãºng yÃªu cáº§u "chá»‰ cháº¡y lá»‡nh tháº­t vÃ  sá»­a lá»—i build/test trá»±c tiáº¿p phÃ¡t sinh".

---

## 15. Command Ä‘Ã£ cháº¡y vÃ  káº¿t quáº£ tháº­t (tÃ³m táº¯t)

| Lá»‡nh | Káº¿t quáº£ |
|---|---|
| `git status`, `git diff --stat`, `git diff --check` | PASS, sáº¡ch |
| `npx prisma format/validate/generate` | PASS |
| `npx prisma migrate status` | 4 migration pending (tháº­t) |
| Duplicate audit SQL (read-only) | BLOCKED_BY_DUPLICATE_DATA â€” 3 nhÃ³m, 13 session, nhÃ³m lá»›n nháº¥t 9 |
| `npm run build` (backend) | PASS |
| `npx jest --listTests` | 98 file, Ä‘á»§ 6 file Listening |
| `npm test` (toÃ n dá»± Ã¡n, trÆ°á»›c fix) | 71/98 suite fail (lá»—i háº¡ táº§ng pre-existing) |
| `npm test` (toÃ n dá»± Ã¡n, sau fix jest config) | 67/98 suite fail (lá»—i DI-mock pre-existing khÃ¡c, khÃ´ng pháº£i Listening) |
| `npx jest` (6 file Listening) | **6/6 suite PASS, 36/36 test PASS** |
| `redis-cli ping/INFO/set/ttl` | PASS tháº­t trÃªn Redis 7.4.9 |
| `curl -I` audio file | HTTP 200 tháº­t |
| `npm run build` (frontend) | PASS, 68/68 route |
| `npx eslint` (18 file backend) | 0 lá»—i má»›i, 498 lá»—i pre-existing Ä‘Ã£ phÃ¢n loáº¡i |
| `npx eslint` (3 file frontend) | 0 lá»—i má»›i, 3 lá»—i pre-existing Ä‘Ã£ phÃ¢n loáº¡i |

---

## 16. Migration Decision & Listening Production Decision

**Migration Decision: `BLOCKED_BY_DUPLICATE_DATA`**
KhÃ´ng apply. Cáº§n dá»n dá»¯ liá»‡u trÃ¹ng (13 session `IN_PROGRESS`, 3 nhÃ³m) trÆ°á»›c khi apply Ä‘Æ°á»£c á»Ÿ báº¥t ká»³ mÃ´i trÆ°á»ng nÃ o.

**Listening Production Decision: `READY_WITH_LIMITATIONS`**

LÃ½ do:
- ToÃ n bá»™ fix báº£o máº­t/reward/rating/leak transcript Ä‘Ã£ verify PASS tháº­t báº±ng test tháº­t + Ä‘á»‘i chiáº¿u logic (má»¥c 7-8).
- Redis cooldown + audio storage Ä‘Ã£ verify PASS tháº­t báº±ng runtime check tháº­t trÃªn mÃ¡y tháº­t (má»¥c 9-10), khÃ´ng chá»‰ mock.
- Backend + frontend build PASS tháº­t.
- **NhÆ°ng:** race-condition fix á»Ÿ táº§ng DB (partial unique index) **CHÆ¯A cÃ³ hiá»‡u lá»±c** vÃ¬ migration chÆ°a apply Ä‘Æ°á»£c (do chÃ­nh dá»¯ liá»‡u duplicate â€” báº±ng chá»©ng tháº­t lÃ  DB hiá»‡n cÃ³ 9 session trÃ¹ng nhau). á»¨ng dá»¥ng hiá»‡n chá»‰ Ä‘Æ°á»£c báº£o vá»‡ bá»Ÿi P2002-catch á»Ÿ táº§ng code (Ä‘Ã£ cÃ³ sáºµn, hoáº¡t Ä‘á»™ng khi migration Ä‘Æ°á»£c apply) â€” nhÆ°ng KHÃ”NG cÃ³ báº£o vá»‡ táº§ng DB tháº­t cho tá»›i khi migration apply thÃ nh cÃ´ng.
- Audio storage giá»›i háº¡n single-instance (Ä‘Ã£ ghi nháº­n, khÃ´ng pháº£i bug, lÃ  giá»›i háº¡n kiáº¿n trÃºc).
- Lá»—i háº¡ táº§ng test/lint toÃ n dá»± Ã¡n (ngoÃ i Listening) váº«n tá»“n táº¡i, khÃ´ng thuá»™c trÃ¡ch nhiá»‡m sá»­a cá»§a Cháº·ng 6D nhÆ°ng áº£nh hÆ°á»Ÿng kháº£ nÄƒng cháº¡y CI toÃ n dá»± Ã¡n nÃ³i chung â€” nÃªn Ä‘Æ°á»£c xá»­ lÃ½ á»Ÿ 1 cháº·ng háº¡ táº§ng riÃªng trong tÆ°Æ¡ng lai.

---

## 17. Stage 7 Gate: **CLOSED**

Äiá»u kiá»‡n KHÃ”NG Ä‘áº¡t (danh sÃ¡ch chÃ­nh xÃ¡c):

1. **Migration chÆ°a Ä‘Æ°á»£c apply** á»Ÿ báº¥t ká»³ mÃ´i trÆ°á»ng nÃ o (ká»ƒ cáº£ dev) â€” bá»‹ cháº·n bá»Ÿi dá»¯ liá»‡u duplicate tháº­t.
2. **Duplicate data chÆ°a Ä‘Æ°á»£c dá»n** â€” 3 nhÃ³m, 13 session `IN_PROGRESS` cÃ¹ng userId, cáº§n quyáº¿t Ä‘á»‹nh nghiá»‡p vá»¥ (giá»¯ báº£n nÃ o, set status báº£n dÆ°) trÆ°á»›c khi cÃ³ thá»ƒ dá»n â€” Ä‘Ã¢y lÃ  quyáº¿t Ä‘á»‹nh cá»§a Ä‘á»™i phÃ¡t triá»ƒn/chá»§ dá»± Ã¡n, khÃ´ng tá»± thá»±c hiá»‡n.
3. **Race-condition fix chÆ°a cÃ³ hiá»‡u lá»±c Ä‘áº§y Ä‘á»§ á»Ÿ táº§ng DB** â€” chá»‰ cÃ³ app-level P2002 catch, chÆ°a cÃ³ unique index tháº­t báº£o vá»‡.
4. Lá»—i háº¡ táº§ng test/lint toÃ n dá»± Ã¡n (ngoÃ i Listening) váº«n cÃ²n tá»“n táº¡i â€” khÃ´ng cháº·n riÃªng Listening nhÆ°ng áº£nh hÆ°á»Ÿng Ä‘á»™ tin cáº­y CI chung, nÃªn cÃ¢n nháº¯c 1 cháº·ng riÃªng.

**KhÃ´ng báº¯t Ä‘áº§u Cháº·ng 7 (Notifications/Achievements) trong cÃ¹ng lÆ°á»£t nÃ y.**

---

## Viá»‡c cáº§n lÃ m tiáº¿p theo (Ä‘á» xuáº¥t, khÃ´ng tá»± thá»±c hiá»‡n)

1. Quyáº¿t Ä‘á»‹nh nghiá»‡p vá»¥: dá»n 13 session `IN_PROGRESS` trÃ¹ng láº·p â€” khuyáº¿n nghá»‹ giá»¯ báº£n `startedAt`/`updatedAt` má»›i nháº¥t má»—i nhÃ³m, set cÃ¡c báº£n dÆ° sang `'COMPLETED'` (theo Ä‘Ãºng comment trong migration).
2. Sau khi dá»n sáº¡ch, cháº¡y láº¡i Ä‘Ãºng audit query á»Ÿ má»¥c 4 Ä‘á»ƒ xÃ¡c nháº­n `DUPLICATE_GROUPS_COUNT=0`, rá»“i má»›i cÃ¢n nháº¯c `npx prisma migrate dev` (dev) / `migrate deploy` (staging/production) â€” cáº§n xÃ¡c nháº­n rÃµ rÃ ng tá»« ngÆ°á»i dÃ¹ng trÆ°á»›c khi apply, cÃ¹ng lÃºc vá»›i 3 migration pending khÃ¡c.
3. XoÃ¡ file táº¡m `backend/scripts/stage6d4-duplicate-audit.js` sau khi khÃ´ng cáº§n dÃ¹ng ná»¯a.
4. CÃ¢n nháº¯c 1 cháº·ng háº¡ táº§ng riÃªng (khÃ´ng pháº£i Listening) Ä‘á»ƒ xá»­ lÃ½: (a) cÃ¡c spec file cÅ© thiáº¿u mock `PrismaService`, (b) cáº¥u hÃ¬nh ESLint khÃ´ng resolve type Jest cho linter.
