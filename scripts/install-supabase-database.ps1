<#
.SYNOPSIS
Apply the CHO-Talents Supabase schema and seed data to a new database.

.EXAMPLE
. .\scripts\load-env.ps1
.\scripts\install-supabase-database.ps1

.EXAMPLE
.\scripts\install-supabase-database.ps1 `
  -ConnectionString "postgresql://postgres:..." `
  -SupabaseUrl "https://YOUR_PROJECT_REF.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLISHABLE_OR_ANON_KEY"

.EXAMPLE
.\scripts\install-supabase-database.ps1 `
  -GenerateOnly `
  -OutputSqlPath .\docs\INITIAL_DATABASE_SETUP.generated.sql `
  -SupabaseUrl "https://YOUR_PROJECT_REF.supabase.co" `
  -SupabaseAnonKey "YOUR_PUBLISHABLE_OR_ANON_KEY"
#>

[CmdletBinding()]
param(
  [string]$ConnectionString = $env:SUPABASE_DB_CONNECTION_STRING,
  [string]$SqlPath,
  [string]$AppConfigEnv = $env:APP_CONFIG_ENV,
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$SupabaseAnonKey = $env:SUPABASE_ANON_KEY,
  [string]$AuthEmailDomain = $env:SUPABASE_AUTH_EMAIL_DOMAIN,
  [string]$KakaoMapKey = $env:KAKAO_MAP_KEY,
  [string]$GithubOwner = $env:GITHUB_OWNER,
  [string]$GithubRepo = $env:GITHUB_REPO,
  [string]$GithubBranch = $env:GITHUB_BRANCH,
  [string]$PsqlPath = 'psql',
  [string]$OutputSqlPath,
  [switch]$GenerateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ScriptRoot)) {
  $ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

if ([string]::IsNullOrWhiteSpace($SqlPath)) {
  $SqlPath = Join-Path $ScriptRoot '..\docs\INITIAL_DATABASE_SETUP.sql'
}

function Use-Default {
  param(
    [string]$Value,
    [string]$DefaultValue
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $DefaultValue
  }

  return $Value
}

function Sql-Literal {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return 'NULL'
  }

  return "'" + ($Value -replace "'", "''") + "'"
}

function Sql-Bool {
  param([bool]$Value)

  if ($Value) {
    return 'true'
  }

  return 'false'
}

$AppConfigEnv = Use-Default $AppConfigEnv 'production'
$AuthEmailDomain = Use-Default $AuthEmailDomain '@cho-talents.app'
$GithubOwner = Use-Default $GithubOwner 'CHO-Talents'
$GithubRepo = Use-Default $GithubRepo 'CHO-Talents'
$GithubBranch = Use-Default $GithubBranch 'develop'

if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
  throw 'SupabaseUrl is required. Pass -SupabaseUrl or set SUPABASE_URL in .env.local.'
}

if ([string]::IsNullOrWhiteSpace($SupabaseAnonKey)) {
  throw 'SupabaseAnonKey is required. Pass -SupabaseAnonKey or set SUPABASE_ANON_KEY in .env.local.'
}

if (-not (Test-Path -LiteralPath $SqlPath)) {
  throw "SQL file not found: $SqlPath"
}

$resolvedSqlPath = (Resolve-Path -LiteralPath $SqlPath).Path
$baseSql = Get-Content -LiteralPath $resolvedSqlPath -Raw -Encoding UTF8

$configRows = @(
  [pscustomobject]@{ Key = 'SUPABASE_URL'; Value = $SupabaseUrl; IsSecret = $false; UseYn = $true; Description = 'Browser Supabase client bootstrap URL' },
  [pscustomobject]@{ Key = 'SUPABASE_ANON_KEY'; Value = $SupabaseAnonKey; IsSecret = $false; UseYn = $true; Description = 'Browser publishable/anon key. Access is restricted by RLS/RPC.' },
  [pscustomobject]@{ Key = 'SUPABASE_AUTH_EMAIL_DOMAIN'; Value = $AuthEmailDomain; IsSecret = $false; UseYn = $true; Description = 'Internal email domain for username-based login' },
  [pscustomobject]@{ Key = 'KAKAO_MAP_KEY'; Value = $KakaoMapKey; IsSecret = $false; UseYn = $true; Description = 'Browser-safe Kakao Maps JavaScript key' },
  [pscustomobject]@{ Key = 'GITHUB_OWNER'; Value = $GithubOwner; IsSecret = $false; UseYn = $true; Description = 'GitHub repository owner metadata' },
  [pscustomobject]@{ Key = 'GITHUB_REPO'; Value = $GithubRepo; IsSecret = $false; UseYn = $true; Description = 'GitHub repository name metadata' },
  [pscustomobject]@{ Key = 'GITHUB_BRANCH'; Value = $GithubBranch; IsSecret = $false; UseYn = $true; Description = 'Default deployment/source branch metadata' },
  [pscustomobject]@{ Key = 'GITHUB_PAT'; Value = 'env:GITHUB_PAT'; IsSecret = $true; UseYn = $false; Description = 'Secret reference only. Store the real value in local, CI, server, or Edge Function environment variables.' },
  [pscustomobject]@{ Key = 'SUPABASE_ACCESS_TOKEN'; Value = 'env:SUPABASE_ACCESS_TOKEN'; IsSecret = $true; UseYn = $false; Description = 'Secret reference only. Used by Supabase CLI or Management API automation.' },
  [pscustomobject]@{ Key = 'SUPABASE_SERVICE_ROLE_KEY'; Value = 'env:SUPABASE_SERVICE_ROLE_KEY'; IsSecret = $true; UseYn = $false; Description = 'Server-only key. Never expose this value to browser code.' },
  [pscustomobject]@{ Key = 'SUPABASE_DB_CONNECTION_STRING'; Value = 'env:SUPABASE_DB_CONNECTION_STRING'; IsSecret = $true; UseYn = $false; Description = 'Database migration/admin connection string reference.' }
)

$envSql = Sql-Literal $AppConfigEnv
$values = @(
  $configRows |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_.Value) } |
    ForEach-Object {
      $keySql = Sql-Literal $_.Key
      $valueSql = Sql-Literal $_.Value
      $secretSql = Sql-Bool $_.IsSecret
      $useYnSql = Sql-Bool $_.UseYn
      $descriptionSql = Sql-Literal $_.Description

      "  ($envSql, $keySql, $valueSql, $secretSql, $useYnSql, $descriptionSql)"
    }
)

$appConfigPatch = @"

-- ============================================================
-- Runtime config override for the target Supabase project
-- ============================================================

INSERT INTO public.app_config (env, key_name, key_value, is_secret, use_yn, description)
VALUES
$($values -join ",`r`n")
ON CONFLICT (env, key_name) DO UPDATE
SET key_value = EXCLUDED.key_value,
    is_secret = EXCLUDED.is_secret,
    use_yn = EXCLUDED.use_yn,
    description = EXCLUDED.description,
    updated_at = now();

NOTIFY pgrst, 'reload schema';
"@

$combinedSql = $baseSql.TrimEnd() + "`r`n" + $appConfigPatch + "`r`n"
$writtenOutputPath = $null

if ($GenerateOnly -and [string]::IsNullOrWhiteSpace($OutputSqlPath)) {
  throw 'OutputSqlPath is required when using -GenerateOnly.'
}

if (-not [string]::IsNullOrWhiteSpace($OutputSqlPath)) {
  $resolvedOutputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputSqlPath)
  $outputDir = Split-Path -Parent $resolvedOutputPath

  if (-not [string]::IsNullOrWhiteSpace($outputDir) -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
  }

  [System.IO.File]::WriteAllText(
    $resolvedOutputPath,
    $combinedSql,
    (New-Object System.Text.UTF8Encoding($false))
  )

  $writtenOutputPath = $resolvedOutputPath
  Write-Host "Generated SQL: $resolvedOutputPath"
}

if ($GenerateOnly) {
  return
}

if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
  throw 'ConnectionString is required to apply SQL. Pass -ConnectionString or set SUPABASE_DB_CONNECTION_STRING in .env.local.'
}

if (-not (Get-Command $PsqlPath -ErrorAction SilentlyContinue)) {
  throw "psql was not found. Install PostgreSQL client tools or pass -PsqlPath."
}

$runSqlPath = $writtenOutputPath
if ([string]::IsNullOrWhiteSpace($runSqlPath)) {
  $runSqlPath = Join-Path ([System.IO.Path]::GetTempPath()) ("cho-talents-supabase-setup-{0}.sql" -f ([guid]::NewGuid().ToString('N')))
  [System.IO.File]::WriteAllText(
    $runSqlPath,
    $combinedSql,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

Write-Host "Applying SQL to Supabase database..."
& $PsqlPath $ConnectionString -v ON_ERROR_STOP=1 -f $runSqlPath

if ($LASTEXITCODE -ne 0) {
  throw "psql failed with exit code $LASTEXITCODE."
}

Write-Host 'Supabase database setup completed.'
