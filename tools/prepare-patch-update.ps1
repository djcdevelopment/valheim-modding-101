#Requires -Version 5.1
<#
.SYNOPSIS
    Valheim Modding 101 — Operator-Triggered Patch Revision & Bundle Builder
.DESCRIPTION
    Rebuilds site/downloads/valheim-modding-101-starter-files.zip and .tar.gz
    from the live starter-mod/, tools/, AGENTS.md, and README.md files, audits
    version strings across key surfaces, and prints a release checklist for
    pushing to GitHub and Azure Static Web Apps.
.EXAMPLE
    .\tools\prepare-patch-update.ps1
    .\tools\prepare-patch-update.ps1 -Version 1.0.21
#>
[CmdletBinding()]
param(
    [string]$Version = "1.0.21",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

if ($Help) {
    Write-Host "Usage: .\tools\prepare-patch-update.ps1 [-Version <valheim-patch-version>]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Version <ver>   Target Valheim patch version to audit against (default: 1.0.21)"
    Write-Host "  -Help            Show this help message"
    exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $RepoRoot

$DownloadsDir = Join-Path $RepoRoot "site\downloads"
$ZipOut = Join-Path $DownloadsDir "valheim-modding-101-starter-files.zip"
$TarOut = Join-Path $DownloadsDir "valheim-modding-101-starter-files.tar.gz"

Write-Host "======================================================================" -ForegroundColor White
Write-Host "  Valheim Modding 101 — Patch Revision & Starter Bundle Builder       " -ForegroundColor White
Write-Host "  Target Valheim Patch : v$Version" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor White
Write-Host ""

# -----------------------------------------------------------------------------
# [1/4] Verify Required Source Files
# -----------------------------------------------------------------------------
Write-Host "[1/4] Verifying Starter Bundle Source Files" -ForegroundColor White

$BundleFiles = @(
    "AGENTS.md",
    "README.md",
    "starter-mod/HelloValheimPlugin.cs",
    "starter-mod/HelloValheim.csproj",
    "starter-mod/com.valheim101.hellovalheim.cfg",
    "starter-mod/manifest.json",
    "starter-mod/thunderstore.toml",
    "tools/doctor.ps1",
    "tools/doctor.sh",
    "tools/build-and-deploy.ps1",
    "tools/build-and-deploy.sh",
    "tools/prepare-patch-update.ps1",
    "tools/prepare-patch-update.sh"
)

foreach ($relPath in $BundleFiles) {
    $fullPath = Join-Path $RepoRoot ($relPath -replace '/', '\')
    if (-not (Test-Path -LiteralPath $fullPath)) {
        Write-Host "  [MISSING] $relPath" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK]      " -ForegroundColor Green -NoNewline
    Write-Host $relPath
}
Write-Host ""

# -----------------------------------------------------------------------------
# [2/4] Audit Target Patch Version Across Key Surfaces
# -----------------------------------------------------------------------------
Write-Host "[2/4] Auditing Version References for '$Version'" -ForegroundColor White

$AuditSurfaces = @(
    "AGENTS.md",
    "README.md",
    "starter-mod/HelloValheimPlugin.cs",
    "site/steps-data.js",
    "site/config.js"
)

foreach ($surface in $AuditSurfaces) {
    $surfacePath = Join-Path $RepoRoot ($surface -replace '/', '\')
    if (Test-Path -LiteralPath $surfacePath) {
        $rawText = Get-Content -LiteralPath $surfacePath -Raw
        if ($rawText.Contains($Version)) {
            Write-Host "  [MATCH]   " -ForegroundColor Green -NoNewline
            Write-Host "$surface references $Version"
        } else {
            Write-Host "  [REVIEW]  " -ForegroundColor Yellow -NoNewline
            Write-Host "$surface does not yet mention $Version"
        }
    }
}
Write-Host ""

# -----------------------------------------------------------------------------
# [3/4] Rebuild site/downloads/valheim-modding-101-starter-files.{zip,tar.gz}
# -----------------------------------------------------------------------------
Write-Host "[3/4] Rebuilding Downloadable Starter Archives" -ForegroundColor White

if (-not (Test-Path -LiteralPath $DownloadsDir)) {
    New-Item -ItemType Directory -Path $DownloadsDir -Force | Out-Null
}

if (Test-Path -LiteralPath $ZipOut) { Remove-Item -LiteralPath $ZipOut -Force }
if (Test-Path -LiteralPath $TarOut) { Remove-Item -LiteralPath $TarOut -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipArchive = [System.IO.Compression.ZipFile]::Open($ZipOut, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($relPath in $BundleFiles) {
        $fullPath = Join-Path $RepoRoot ($relPath -replace '/', '\')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zipArchive,
            $fullPath,
            $relPath,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
} finally {
    $zipArchive.Dispose()
}

$tarCmd = Get-Command tar -ErrorAction SilentlyContinue
if ($null -ne $tarCmd) {
    & $tarCmd.Source -czf $TarOut @BundleFiles
} else {
    Write-Host "  [WARN]    'tar' command not found on PATH; skipped .tar.gz generation." -ForegroundColor Yellow
}

$zipSizeKB = [math]::Round((Get-Item -LiteralPath $ZipOut).Length / 1KB, 1)
$zipHash = (Get-FileHash -LiteralPath $ZipOut -Algorithm SHA256).Hash.Substring(0, 16).ToLower()
Write-Host "  [BUILT]   " -ForegroundColor Green -NoNewline
Write-Host "site/downloads/valheim-modding-101-starter-files.zip    (${zipSizeKB} KB, sha256:${zipHash}...)"

if (Test-Path -LiteralPath $TarOut) {
    $tarSizeKB = [math]::Round((Get-Item -LiteralPath $TarOut).Length / 1KB, 1)
    $tarHash = (Get-FileHash -LiteralPath $TarOut -Algorithm SHA256).Hash.Substring(0, 16).ToLower()
    Write-Host "  [BUILT]   " -ForegroundColor Green -NoNewline
    Write-Host "site/downloads/valheim-modding-101-starter-files.tar.gz (${tarSizeKB} KB, sha256:${tarHash}...)"
}
Write-Host ""

# -----------------------------------------------------------------------------
# [4/4] Operator Patch Revision & Deployment Checklist
# -----------------------------------------------------------------------------
Write-Host "[4/4] Operator Patch Revision Checklist (Valheim v$Version)" -ForegroundColor White
Write-Host "  1. Verify Harmony Target Signatures (if Valheim updated assembly_valheim.dll):" -ForegroundColor Cyan
Write-Host "     ilspycmd -t Player `"<ValheimDir>\valheim_Data\Managed\assembly_valheim.dll`" | Select-String `"GetMaxCarryWeight|OnDeath`""
Write-Host "     ilspycmd -t Terminal `"<ValheimDir>\valheim_Data\Managed\assembly_valheim.dll`" | Select-String `"InitTerminal|TryRunCommand`""
Write-Host ""
Write-Host "  2. Run Dry-Run Compile Verification:" -ForegroundColor Cyan
Write-Host "     powershell -ExecutionPolicy Bypass -File .\tools\build-and-deploy.ps1 -DryRun"
Write-Host ""
Write-Host "  3. Stage, Commit & Push to GitHub / Azure Static Web Apps:" -ForegroundColor Cyan
Write-Host "     git status -s"
Write-Host "     git add AGENTS.md README.md starter-mod/ tools/ site/ api/"
Write-Host "     git commit -m `"chore(patch): prepare Valheim $Version starter bundles and site revision`""
Write-Host "     git push origin main"
Write-Host ""
Write-Host "✓ Patch bundle preparation complete ($($BundleFiles.Count) files packaged)." -ForegroundColor Green
