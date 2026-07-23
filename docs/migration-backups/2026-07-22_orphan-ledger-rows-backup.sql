-- Backup of 3 orphan _prisma_migrations ledger rows before deletion.
-- Reason: their migration folders were never committed to git and no
-- longer exist on disk; their schema effects are already fully
-- represented by the properly git-tracked, separately-applied
-- migrations 20260722021500_add_arena_realtime_revision,
-- 20260722033358_add_arena_battle_mechanics,
-- 20260722065530_add_arena_mode_team_format (see
-- docs/arena-phase-f1-migration-reconciliation.md for the original fix).
-- Backed up 2026-07-22T14:32:31.276Z before deletion during Phase F2.1.

-- To restore (NOT expected to ever be needed), run each INSERT below:

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES ('70f35663-e553-4fcd-aa67-c772f598308a', '9a73faf9c7170ffe142b5f2f7908b4a0bc0a93f4221ece7284b81614f576981e', '2026-07-21T16:02:35.146Z', '20260721150000_separate_arena_mode_team_format', NULL, NULL, '2026-07-21T16:02:35.101Z', 1);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES ('f2657778-ce79-4a1d-8a70-e98f7e5458f3', 'e7f1c357817a5e2981e81c388131d78b4d123327b9a2b598e526fa49ea879227', '2026-07-21T16:43:38.768Z', '20260721180000_arena_question_pipeline', NULL, NULL, '2026-07-21T16:43:38.675Z', 1);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES ('ac8cc784-302e-4e58-b9c7-9d77cda01d6c', '3292f450683040bd0d6823e1663dd9a965845059b7727ab4051b428e003eb69e', '2026-07-21T17:17:41.551Z', '20260722090000_arena_realtime_revision', NULL, NULL, '2026-07-21T17:17:41.515Z', 1);

