param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$ContainerName = "english_platform_postgres",
  [string]$User = $env:POSTGRES_USER,
  [string]$RestoreDatabase = "restore_verify"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

if (-not $User) { $User = "poppylingo" }

$dbExists = docker exec $ContainerName psql -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$RestoreDatabase'"
if ($dbExists.Trim() -eq "1") {
  docker exec $ContainerName dropdb -U $User $RestoreDatabase
}

docker exec $ContainerName createdb -U $User $RestoreDatabase

try {
  Get-Content -Raw $BackupPath | docker exec -i $ContainerName psql -U $User -d $RestoreDatabase | Out-Null
  $tableCount = docker exec $ContainerName psql -U $User -d $RestoreDatabase -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"
  if ([int]$tableCount.Trim() -lt 1) {
    throw "Restore finished but no public tables were found."
  }

  Write-Host "Restore verified in isolated database '$RestoreDatabase' with $($tableCount.Trim()) public table(s)."
}
finally {
  docker exec $ContainerName dropdb -U $User $RestoreDatabase | Out-Null
}
