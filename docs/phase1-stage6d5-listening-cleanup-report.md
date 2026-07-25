# Cháº·ng 6D.5 â€” Listening Data Cleanup & Migration Verification Report

**NgÃ y:** 2026-07-18
**PhÆ°Æ¡ng phÃ¡p:** ToÃ n bá»™ command cháº¡y tháº­t trÃªn mÃ¡y Windows cá»§a ngÆ°á»i dÃ¹ng (PowerShell, `D:\elearning-english`), dÃ¡n láº¡i nguyÃªn vÄƒn. KhÃ´ng giáº£ láº­p báº¥t ká»³ káº¿t quáº£ nÃ o.

---

## Executive Summary

ÄÃ£ dá»n sáº¡ch 10 `ListeningSession` trÃ¹ng láº·p (chuyá»ƒn sang status `ABANDONED`, khÃ´ng xoÃ¡, khÃ´ng Ä‘Ã¡nh dáº¥u `COMPLETED` giáº£), xÃ¡c nháº­n reward audit sáº¡ch tuyá»‡t Ä‘á»‘i (0 reward tá»«ng phÃ¡t cho báº¥t ká»³ session nÃ o bá»‹ dá»n), apply thÃ nh cÃ´ng migration chá»‘ng race-condition (`20260719120000_add_listening_active_session_unique`) cÃ¹ng 3 migration pending khÃ¡c, vÃ  cháº¡y láº¡i toÃ n bá»™ verification (Prisma, backend build, 36/36 Listening test, frontend build, git diff) â€” **táº¥t cáº£ PASS tháº­t**.

**Production Decision: `READY`**
**Stage 7: `OPEN`**

---

## Duplicate Audit

TrÆ°á»›c cleanup (Ä‘á»‘i chiáº¿u láº¡i tá»« Cháº·ng 6D.4, xÃ¡c minh báº±ng query chi tiáº¿t má»›i cÃ³ answer-count + timestamp tháº­t):

| User | Level | Topic | Active Sessions | IDs | Attempted Answers | StartedAt |
|---|---|---|---|---|---|---|
| 3b126a1a... | B1 | Career | 2 | `9ea0aa8a` (16:32:39), `716c0877` (16:33:38) | 0, 0 | 2026-07-05 |
| 3b126a1a... | B1 | Education | 2 | `34a05312` (14:46:17), `ad0366e9` (14:46:40) | 0, **3** | 2026-07-09 |
| 3b126a1a... | B1 | Lifestyle | 9 | `6077a076, eafe375e, dbde94c6, ec69d10a, d242e483, 3e836c10, 1d664844, 35373f36, d6d42a3e` | táº¥t cáº£ 0 | 2026-07-06, 14:36-14:43 |

**LÆ°u Ã½ ká»¹ thuáº­t quan trá»ng:** `ListeningSession` khÃ´ng cÃ³ cá»™t `createdAt`/`updatedAt` riÃªng trong schema tháº­t â€” chá»‰ cÃ³ `startedAt`/`completedAt`. VÃ¬ váº­y 2 tiÃªu chÃ­ tie-break "updatedAt má»›i nháº¥t" vÃ  "createdAt má»›i nháº¥t" trong spec Ä‘á»u quy vá» cÃ¹ng má»™t cá»™t `startedAt` â€” Ä‘Ã£ ghi rÃµ trong code cleanup script, khÃ´ng pháº£i giáº£ Ä‘á»‹nh.

---

## Cleanup Strategy

Quy táº¯c chá»n session giá»¯ láº¡i (Ã¡p dá»¥ng Ä‘Ãºng thá»© tá»± Æ°u tiÃªn Ä‘Ã£ cho, khÃ´ng Ä‘oÃ¡n):
1. Nhiá»u `attempted answers` nháº¥t (Ä‘áº¿m answer cÃ³ `selectedAnswer IS NOT NULL OR isSkipped=true`, khá»›p Ä‘Ãºng Ä‘á»‹nh nghÄ©a `attempted` dÃ¹ng trong `finishSession()`).
2/3. Tie-break báº±ng `startedAt` má»›i nháº¥t (do khÃ´ng cÃ³ `updatedAt`/`createdAt` riÃªng).

Xá»­ lÃ½ session thá»«a: **Ä‘Ã¡nh dáº¥u `status = 'ABANDONED'`** (giÃ¡ trá»‹ má»›i, khÃ´ng cáº§n migration vÃ¬ `status` lÃ  String tá»± do) â€” theo lá»±a chá»n ngÆ°á»i dÃ¹ng xÃ¡c nháº­n sau khi Ä‘Æ°á»£c trÃ¬nh bÃ y Æ°u/nhÆ°á»£c Ä‘iá»ƒm so vá»›i xoÃ¡ háº³n. KhÃ´ng Ä‘Ã¡nh dáº¥u `COMPLETED` giáº£, khÃ´ng xoÃ¡ dá»¯ liá»‡u.

**Known Issue Ä‘Æ°á»£c ghi nháº­n (khÃ´ng sá»­a trong Cháº·ng nÃ y, ngoÃ i pháº¡m vi cleanup):** `assertSessionEditable()` vÃ  Ä‘iá»u kiá»‡n trong `finishSession()` hiá»‡n chá»‰ Ä‘áº·c cÃ¡ch xá»­ lÃ½ `status === 'COMPLETED'`, chÆ°a Ä‘áº·c cÃ¡ch `'ABANDONED'`. Vá» lÃ½ thuyáº¿t má»™t session `ABANDONED` váº«n cÃ³ thá»ƒ bá»‹ sá»­a/finish náº¿u ngÆ°á»i dÃ¹ng cÃ²n giá»¯ Ä‘Ãºng `sessionId` cá»§a nÃ³. Äá» xuáº¥t fix á»Ÿ má»™t cháº·ng Listening-logic riÃªng trong tÆ°Æ¡ng lai (khÃ´ng pháº£i cleanup).

Script cleanup cÃ³ thÃªm 1 lá»›p an toÃ n Ä‘á»™c láº­p: trÆ°á»›c khi Ä‘Ã¡nh dáº¥u ABANDONED báº¥t ká»³ session nÃ o, kiá»ƒm tra láº¡i `xpEarned`/`coinsEarned`/`rating`/`completedAt` â€” náº¿u cÃ³ báº¥t ká»³ dáº¥u hiá»‡u reward nÃ o, **tá»« chá»‘i xá»­ lÃ½** session Ä‘Ã³ (dÃ¹ cÃ³ nghÄ©a lÃ  Ä‘á»ƒ láº¡i duplicate), Æ°u tiÃªn an toÃ n hÆ¡n triá»‡t Ä‘á»ƒ.

---

## Sessions Removed (marked ABANDONED â€” khÃ´ng xoÃ¡)

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

**Tá»•ng: 10 session, táº¥t cáº£ `attempted answers = 0` â€” khÃ´ng cÃ³ tÆ°Æ¡ng tÃ¡c ngÆ°á»i dÃ¹ng tháº­t nÃ o bá»‹ máº¥t.**

## Sessions Kept

| Session ID | Group | Attempted Answers | StartedAt | LÃ½ do giá»¯ |
|---|---|---|---|---|
| `716c0877-a3ad-42f2-9a5a-ed6a7a9fe448` | Career | 0 | 2026-07-05 16:33:38 | Tie-break: startedAt má»›i nháº¥t |
| `ad0366e9-45b8-48d4-8fa2-3887aa6572a1` | Education | 3 | 2026-07-09 14:46:40 | Nhiá»u answer nháº¥t |
| `d6d42a3e-655c-4f2d-8cee-b69482455c3c` | Lifestyle | 0 | 2026-07-06 14:43:04 | Tie-break: startedAt má»›i nháº¥t |

---

## Reward Audit

**Káº¿t quáº£: PASS â€” 0 reward bá»‹ máº¥t hoáº·c double-grant.**

Kiá»ƒm tra tháº­t trÃªn toÃ n bá»™ 13 session (bao gá»“m 10 session bá»‹ dá»n):
- `xpTransaction.sourceId` khá»›p 13 session ID: **0 dÃ²ng**.
- `xpTransaction.idempotencyKey` khá»›p `learning:LISTENING_COMPLETED:<sessionId>`: **0 dÃ²ng**.
- `LeaderboardActivity.sourceId` khá»›p 13 session ID: **0 dÃ²ng**.
- `MissionProgressEventV2.sourceId`: báº£ng **chÆ°a tá»“n táº¡i táº¡i thá»i Ä‘iá»ƒm audit** (migration `20260718090000_add_mission_progress_event_v2` khi Ä‘Ã³ cÃ²n pending â€” khÃ´ng liÃªn quan Listening, Ä‘Ã£ apply á»Ÿ BÆ°á»›c 8 cá»§a cháº·ng nÃ y). KhÃ´ng áº£nh hÆ°á»Ÿng káº¿t luáº­n vÃ¬ XP/coins tháº­t Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n báº±ng 0 qua `xpTransaction` (nguá»“n ghi nháº­n XP tháº­t duy nháº¥t) vÃ  cÃ¡c cá»™t `xpEarned`/`coinsEarned` ngay trÃªn báº£n thÃ¢n session (Ä‘á»u = 0 cho cáº£ 13 session).
- `session.xpEarned`, `session.coinsEarned`, `session.rating`, `session.completedAt`: Ä‘á»u `0`/`null` cho toÃ n bá»™ 13 session.

**Káº¿t luáº­n:** KhÃ´ng session nÃ o trong 13 session tá»«ng hoÃ n thÃ nh (`completedAt` luÃ´n `null`), nÃªn khÃ´ng session nÃ o tá»«ng Ä‘i qua nhÃ¡nh phÃ¡t thÆ°á»Ÿng tháº­t cá»§a `finishSession()`. Viá»‡c Ä‘Ã¡nh dáº¥u 10 session thá»«a sang `ABANDONED` khÃ´ng lÃ m máº¥t hay nhÃ¢n Ä‘Ã´i báº¥t ká»³ XP/Mission/Coins/Pet/Leaderboard/Learning Path nÃ o.

**Ghi chÃº phá»¥ (tÃ­ch cá»±c, ngoÃ i scope cleanup):** VÃ¬ `MissionProgressEventV2` giá» Ä‘Ã£ tá»“n táº¡i (migration Ä‘Æ°á»£c Ã¡p dá»¥ng á»Ÿ BÆ°á»›c 8), `missionV2ProgressService.increase()` â€” vá»‘n Ä‘Æ°á»£c `updateListeningMissions()` cá»§a Listening gá»i má»—i khi hoÃ n thÃ nh bÃ i â€” tá»« nay sáº½ thá»±c sá»± ghi Ä‘Æ°á»£c dá»¯ liá»‡u thay vÃ¬ lá»—i ngáº§m bá»‹ `catch` nuá»‘t (nhÆ° mÃ´ táº£ trong code). ÄÃ¢y lÃ  cáº£i thiá»‡n tá»± nhiÃªn Ä‘i kÃ¨m, khÃ´ng pháº£i thay Ä‘á»•i logic cá»‘ Ã½ trong cháº·ng nÃ y.

---

## Migration Result

```
npx prisma migrate dev
```
**PASS.** 4 migration pending Ä‘Æ°á»£c Ã¡p dá»¥ng cÃ¹ng lÃºc (khÃ´ng thá»ƒ chá»n riÃªng vá»›i `migrate dev`):
- `20260717034435_add_chat_session` (ngoÃ i scope Listening)
- `20260717040228_add_chat_pet_feature` (ngoÃ i scope Listening)
- `20260718090000_add_mission_progress_event_v2` (ngoÃ i scope Listening â€” nhÆ°ng giÃ¡n tiáº¿p liÃªn quan Listening qua Mission, xem ghi chÃº trÃªn)
- `20260719120000_add_listening_active_session_unique` (Listening â€” **migration chÃ­nh cá»§a cháº·ng nÃ y**)

`"Your database is now in sync with your schema."` â€” khÃ´ng cÃ³ lá»—i `CREATE UNIQUE INDEX` (xÃ¡c nháº­n cleanup Ä‘Ã£ Ä‘á»§ sáº¡ch trÆ°á»›c khi apply).

CÃ³ 1 lá»—i phá»¥ `EPERM` khi Prisma tá»± Ä‘á»™ng cháº¡y `generate` ngay sau migrate (do file `.dll.node` bá»‹ khoÃ¡ bá»Ÿi tiáº¿n trÃ¬nh Node khÃ¡c Ä‘ang cháº¡y) â€” Ä‘Ã£ xá»­ lÃ½ báº±ng cÃ¡ch cháº¡y láº¡i `npx prisma generate` thá»§ cÃ´ng, PASS sáº¡ch á»Ÿ láº§n sau.

---

## Prisma Status

```
npx prisma validate    â†’ PASS ("valid ðŸš€")
npx prisma generate    â†’ PASS (sau khi giáº£i phÃ³ng file lock)
npx prisma migrate status â†’ "Database schema is up to date!" â€” 0 migration pending
```

---

## Backend Build

```
npm run build   (nest build)
```
**PASS** â€” khÃ´ng lá»—i TypeScript.

---

## Frontend Build

```
npm run build   (next build, Turbopack)
```
**PASS** â€” Next.js 16.2.9, TypeScript OK, 68/68 route generate thÃ nh cÃ´ng, Ä‘á»§ toÃ n bá»™ route Listening.

---

## Listening Tests

```
npx jest --verbose "src/modules/listening" "src/modules/listening-job" "src/config/static-assets.config.spec.ts" "src/common/guards/roles.guard.spec.ts"

Test Suites: 6 passed, 6 total
Tests:       36 passed, 36 total
```
**PASS â€” 6/6 suite, 36/36 test, sau khi apply migration, khÃ´ng regression** so vá»›i káº¿t quáº£ Cháº·ng 6D.4.

---

## Diff Check

```
git diff --check   â†’ sáº¡ch (chá»‰ cáº£nh bÃ¡o CRLF bÃ¬nh thÆ°á»ng trÃªn Windows, khÃ´ng pháº£i lá»—i whitespace tháº­t)
git status         â†’ khá»›p Ä‘Ãºng scope, khÃ´ng cÃ³ thay Ä‘á»•i ngoÃ i Ã½ muá»‘n, khÃ´ng commit/push
```

---

## Known Issues

1. **`assertSessionEditable()`/`finishSession()` chÆ°a Ä‘áº·c cÃ¡ch status `'ABANDONED'`** â€” vá» lÃ½ thuyáº¿t session abandoned váº«n cÃ³ thá»ƒ bá»‹ sá»­a/finish náº¿u ngÆ°á»i dÃ¹ng giá»¯ Ä‘Ãºng sessionId. Rá»§i ro tháº¥p (sessionId khÃ´ng hiá»ƒn thá»‹ cÃ´ng khai, vÃ  10 session bá»‹ abandon Ä‘á»u khÃ´ng cÃ³ answer tháº­t nÃªn khÃ´ng cÃ³ Ä‘á»™ng cÆ¡ khai thÃ¡c), nhÆ°ng nÃªn fix á»Ÿ 1 cháº·ng Listening-logic riÃªng trong tÆ°Æ¡ng lai.
2. **3 migration ngoÃ i scope Listening** (`add_chat_session`, `add_chat_pet_feature`, `add_mission_progress_event_v2`) Ä‘Ã£ Ä‘Æ°á»£c Ã¡p dá»¥ng cÃ¹ng lÃºc do giá»›i háº¡n ká»¹ thuáº­t cá»§a `prisma migrate dev` (khÃ´ng thá»ƒ Ã¡p dá»¥ng chá»n lá»c tá»«ng migration). KhÃ´ng thuá»™c pháº¡m vi audit Listening â€” khuyáº¿n nghá»‹ Ä‘á»™i phá»¥ trÃ¡ch cÃ¡c tÃ­nh nÄƒng Chat/Pet/Mission V2 tá»± xÃ¡c minh riÃªng náº¿u chÆ°a tá»«ng verify.
3. Lá»—i háº¡ táº§ng test/lint toÃ n dá»± Ã¡n (ghi nháº­n á»Ÿ Cháº·ng 6D.4: nhiá»u spec file cÅ© thiáº¿u mock `PrismaService`) **váº«n cÃ²n tá»“n táº¡i**, khÃ´ng thuá»™c pháº¡m vi Listening, khÃ´ng cháº·n Stage 7 cá»§a Listening nhÆ°ng váº«n nÃªn xá»­ lÃ½ á»Ÿ 1 cháº·ng háº¡ táº§ng riÃªng.
4. File backup (`backend/backups/beaconvie_backup_2026-07-18.sql`) vÃ  cÃ¡c script audit/cleanup táº¡m thá»i (`backend/scripts/*.js`, `.ts`) hiá»‡n lÃ  untracked â€” khuyáº¿n nghá»‹ giá»¯ láº¡i backup Ã­t nháº¥t cho tá»›i khi xÃ¡c nháº­n há»‡ thá»‘ng á»•n Ä‘á»‹nh qua vÃ i ngÃ y, cÃ¡c script audit cÃ³ thá»ƒ xoÃ¡ hoáº·c archive.

---

## Production Decision: `READY`

Táº¥t cáº£ cÃ¡c giá»›i háº¡n trÆ°á»›c Ä‘Ã³ (migration chÆ°a apply, dá»¯ liá»‡u trÃ¹ng) Ä‘Ã£ Ä‘Æ°á»£c giáº£i quyáº¿t báº±ng dá»¯ liá»‡u vÃ  quy trÃ¬nh tháº­t, cÃ³ backup, cÃ³ audit reward Ä‘áº§y Ä‘á»§ trÆ°á»›c khi hÃ nh Ä‘á»™ng. Race-condition hiá»‡n Ä‘Æ°á»£c báº£o vá»‡ á»Ÿ cáº£ 2 táº§ng: code (P2002 catch, Ä‘Ã£ cÃ³ tá»« Stage 6D) vÃ  DB (partial unique index, vá»«a apply thÃ nh cÃ´ng vÃ  verify sáº¡ch).

## Stage 7: `OPEN`

ToÃ n bá»™ 7 Ä‘iá»u kiá»‡n Ä‘á»u Ä‘áº¡t báº±ng dá»¯ liá»‡u tháº­t:
- Duplicate = 0 âœ“ (audit láº¡i xÃ¡c nháº­n)
- Migration apply thÃ nh cÃ´ng âœ“
- Prisma status sáº¡ch âœ“ (0 pending)
- Backend build PASS âœ“
- Frontend build PASS âœ“
- Listening tests PASS âœ“ (36/36)
- Reward audit PASS âœ“ (0 reward bá»‹ áº£nh hÆ°á»Ÿng)

CÃ³ thá»ƒ báº¯t Ä‘áº§u Cháº·ng 7 (Notifications/Achievements) á»Ÿ lÆ°á»£t lÃ m viá»‡c tiáº¿p theo.
