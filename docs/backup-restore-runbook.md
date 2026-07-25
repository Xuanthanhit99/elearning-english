# Backup And Restore Runbook

## Backup Policy

- Create a database backup before every migration.
- Keep at least 7 daily backups and 4 weekly backups.
- Store backups outside the primary database host.
- Encrypt backups at rest when stored outside the local machine.
- Treat backup files as sensitive data.

## Local Backup

```powershell
cd D:\elearning-english
.\scripts\backup\postgres-backup.ps1 -ContainerName english_platform_postgres -Database beaconvie -User beaconvie
```

## Isolated Restore Verification

```powershell
cd D:\elearning-english
.\scripts\backup\postgres-restore-verify.ps1 -BackupPath .\backups\beaconvie-YYYYMMDD-HHMMSS.sql -ContainerName english_platform_postgres -User beaconvie
```

The restore verifier creates a temporary database, restores the dump, checks that public tables exist, and drops the temporary database.

## Production Restore

1. Stop application writes if data is actively corrupt.
2. Create an emergency backup of the current production database.
3. Restore the selected backup into an isolated database first.
4. Validate schema, row counts, and the affected business data.
5. Only restore over production after release owner approval.
6. Run smoke checks immediately after restore.
7. Record backup source, restore time, operator, validation result, and user impact.

## Recovery Targets

- RPO target: 24 hours until managed continuous backups are confirmed.
- RTO target: 2 hours for database restore after backup selection.

These targets must be revisited after Railway/Postgres backup policy is confirmed.

## Release Evidence Required

Before v1.0, record:

- Backup command used and backup artifact location.
- Restore target name proving the test was isolated from production.
- Restore verifier output.
- Row-count or integrity checks for users, learning progress, XP ledger, achievements, and admin configuration.
- Decision on whether Redis remains cache/operational state only, or whether managed Redis persistence is enabled for faster BullMQ recovery.
