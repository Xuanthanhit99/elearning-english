param(
  [string]$ContainerName = "english_platform_postgres",
  [string]$Database = $env:POSTGRES_DB,
  [string]$User = $env:POSTGRES_USER,
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"

if (-not $Database) { $Database = "beaconvie" }
if (-not $User) { $User = "beaconvie" }

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputPath = Join-Path $OutputDir "$Database-$timestamp.sql"

docker exec $ContainerName pg_dump --clean --if-exists --no-owner --no-privileges -U $User $Database | Set-Content -Encoding UTF8 $outputPath

if (-not (Test-Path $outputPath) -or ((Get-Item $outputPath).Length -le 0)) {
  throw "Backup file was not created or is empty: $outputPath"
}

Write-Host "Backup created: $outputPath"
