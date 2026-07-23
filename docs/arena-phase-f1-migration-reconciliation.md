# Arena Phase F1 — Migration Ledger Reconciliation

**Status:** Record of a one-time environment repair performed during the Phase F1 mid-implementation audit. Not a design document — see `docs/arena-phase-f-design.md` and `docs/arena-progression-sequence.md` for the actual Phase F architecture.

**Scope:** This document explains a pre-existing, F1-unrelated local-database drift discovered while auditing Phase F1, exactly what was changed to resolve it, and the evidence that no data was lost. It does not describe any Phase F1 feature.

---

## 1. What was found

The local development Postgres database (`english_platform` on `localhost:5432`) had drifted from the committed migration history in `backend/prisma/migrations/`. Three migration directories existed on disk but were **empty** (no `migration.sql`) and had **never been committed to git** (confirmed via `git log --all` and `git ls-files` returning zero hits for all three):

- `20260721150000_separate_arena_mode_team_format/`
- `20260721180000_arena_question_pipeline/`
- `20260722090000_arena_realtime_revision/`

The database's `_prisma_migrations` ledger recorded these three orphan names as applied and finished. Meanwhile, the git-committed migrations that actually contain the equivalent (and, in the battle-mechanics case, additional) schema changes — `20260722021500_add_arena_realtime_revision`, `20260722033358_add_arena_battle_mechanics`, `20260722065530_add_arena_mode_team_format` — had **never** been recorded as applied. Critically, this same drift meant the two Phase F1 migrations, `20260722100118_add_arena_progression_f1` and `20260722101213_add_arena_bonus_tracking_fields`, had **also never been applied** — `ArenaSeason`, `ArenaRatingHistory`, `ArenaProgressionRecord` did not exist in the live database, and `ArenaProfile` was missing `tier`/`seasonWinCount`/`seasonLoseCount`/`lastDailyBonusAt`/`lastFirstWinBonusAt`, even though the already-written F1 application code assumed all of it existed.

This was environment drift, not a Phase F1 defect — most likely the result of an earlier local `prisma migrate dev` run whose generated folders were later renamed/regenerated for the git commit without the database ever being brought back in sync.

## 2. What was removed

The three orphan folders listed in §1 were deleted. They contained no SQL (confirmed via directory listing — only `.`/`..` entries) and were not referenced by git in any commit, so their removal is not a modification of any historical migration.

## 3. What was applied

A `prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script` was generated and reviewed line-by-line before execution. It was DDL-only:

- 6 `CreateEnum` (including `ArenaTier`, `ArenaSeasonStatus`, `ArenaProgressionStatus` — Phase F1's new enums)
- 8 `CreateTable` (including `ArenaSeason`, `ArenaRatingHistory`, `ArenaProgressionRecord` — Phase F1's new tables)
- 5 `AlterTable` (column adds/drops/nullability changes only)
- 16 `CreateIndex`, 15 `AddForeignKey`
- 1 `DropTable` (`ArenaQuestionHistory` — a legacy, already-superseded table; see §4)
- 1 `DropForeignKey`, 2 `DropIndex` (all against the same legacy table/column set being dropped)

Zero `DROP DATABASE`, `TRUNCATE`, `DELETE FROM`, or data-mutating `UPDATE` statements were present (verified by grep before execution).

## 4. Every dropped object, and why it was safe

| Object | Rows/data affected | Why safe | Verification performed |
|---|---|---|---|
| `ArenaQuestionHistory` table | 0 rows | Legacy table, already replaced in code by `ArenaUserQuestionHistory` (a different model with additional fields: `contentHash`, `matchId`, `mode`, `topic`). `ArenaQuestionHistoryService` — the only class with a similar name — already exclusively calls `this.prisma.arenaUserQuestionHistory.findMany/createMany`, confirmed by reading `arena-question-history.service.ts`. | `grep` across `backend/src/` for `ArenaQuestionHistory` (the model name) and the Prisma accessor `arenaQuestionHistory`: zero hits outside the unrelated service *class name* `ArenaQuestionHistoryService`, which targets the new table. `schema.prisma` has no `model ArenaQuestionHistory` at all. |
| `ArenaMatch.mode` / `ArenaMatch.teamFormat` columns | 0 non-null rows | Mode/team-format live on `ArenaRoom` only, per the Phase BC-Reconciliation redesign; no `arenaMatch.create`/`update` call anywhere sets these fields (checked every call site: `arena.service.ts:613,618,760,1316,1463`). | `SELECT count(*) WHERE mode IS NOT NULL` → 0. Grep of every `arenaMatch.create`/`update` call site. |
| `ArenaParticipant.disconnectedAt` column | 0 non-null rows | Superseded by Gate D-Recovery's `ArenaPresenceService` disconnect-grace mechanism; zero code references anywhere. | `SELECT count(*) WHERE disconnectedAt IS NOT NULL` → 0. Grep for `disconnectedAt`: zero hits in `backend/src/`. |
| `ArenaQueue.mode` / `ArenaQueue.teamFormat` columns | 0 non-null rows, 0 total rows | `arenaQueue.upsert` only ever writes `gameMode/skill/difficulty/topic/mmr/searchMinMmr/searchMaxMmr`; mode/team-format are resolved at matchmaking time via `resolveRequestedArenaMode()`, never persisted on the queue row. | `SELECT count(*)` on the table → 0 rows total at the time of the fix. Grep of the `arenaQueue.upsert` call site. |

## 5. The one data-touching statement: `ArenaRoom.gameMode` backfill

Applying the diff's `ALTER COLUMN "gameMode" SET NOT NULL` failed against one pre-existing row: the same single real, user-created `ArenaRoom` row referenced by an earlier phase's migration comment ("exactly 1 row in the dev database... real user-created room, not test data"), which had `gameMode = NULL` but already had `mode = 'RANKED'` and `teamFormat = 'SOLO_1V1'` populated.

**Legacy mapping used**: the application's own `mapLegacyGameMode()` (`backend/src/modules/arena/mode/arena-mode-resolver.util.ts`) defines the canonical mapping `RANKED + SOLO_1V1 ⇄ gameMode: 'SOLO_1V1'`. The backfill used exactly that existing mapping — no new value was invented:

```sql
UPDATE "ArenaRoom" SET "gameMode" = 'SOLO_1V1'
WHERE id = '749461ef-4f9c-4ae2-b62a-5f5675833664' AND "gameMode" IS NULL;
```

This was the only row affected (verified `count = 1` before, matching row confirmed by id), and it made the row's redundant legacy field consistent with its own already-populated canonical fields — no information was invented, changed in meaning, or lost.

## 6. Confirmation no progression/reward data was lost

At the time of this fix, the database had zero `ArenaMatch` rows (`SELECT count(*) FROM "ArenaMatch"` → 0) — no match had ever been finalized against this database, so there was no `ArenaRewardLog`, `ArenaRatingHistory`, `XpTransaction`, or `ArenaProgressionRecord` data of any kind to lose. Row counts for `User` (5), `ArenaRoom` (1), `ArenaProfile` (4) were confirmed identical before and after the entire fix (migration diff + ledger reconciliation + subsequent test runs), via direct `information_schema`/`count(*)` queries.

## 7. Ledger reconciliation

After the diff script applied cleanly, five migrations were marked applied in `_prisma_migrations` via `prisma migrate resolve --applied <name>` (metadata-only — no SQL re-executed, since the diff script above already brought the schema to exactly the state these five migrations would have produced):

```
prisma migrate resolve --applied 20260722021500_add_arena_realtime_revision
prisma migrate resolve --applied 20260722033358_add_arena_battle_mechanics
prisma migrate resolve --applied 20260722065530_add_arena_mode_team_format
prisma migrate resolve --applied 20260722100118_add_arena_progression_f1
prisma migrate resolve --applied 20260722101213_add_arena_bonus_tracking_fields
```

**Why `prisma migrate resolve --applied` was the valid tool here** (not `db push`, not editing history): `migrate resolve --applied` only writes a row to `_prisma_migrations` recording that a migration's SQL has already taken effect — it does not execute the migration's `migration.sql` again. This is exactly correct here because the diff script in §3 was hand-verified to produce the union of everything those five migrations would have created; running `migrate resolve` afterward brings Prisma's own bookkeeping in line with schema reality without re-running any `CREATE`/`ALTER` statement a second time (which would have failed with "already exists" errors) and without touching any `migration.sql` file's committed content.

The three orphan-named rows already in `_prisma_migrations` (`20260721150000_...`, `20260721180000_...`, `20260722090000_...`) were left untouched — they reference migration folders that no longer exist locally, which Prisma's `migrate status`/`migrate deploy` do not treat as blocking once the corresponding folders are gone; they remain as harmless historical ledger entries.

## 8. Current state (at time of writing)

```
$ npx prisma migrate status
87 migrations found in prisma/migrations
Database schema is up to date!

$ npx prisma migrate deploy
No pending migrations to apply.
```

`npx prisma validate` passes. `npx prisma generate` succeeds. No historical `migration.sql` file was edited at any point in this process.
