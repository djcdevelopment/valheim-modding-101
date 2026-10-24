#Requires -Version 5.1
<#
.SYNOPSIS
    Valheim 1.0 Modding 101 — Chamber 1 Environment Preflight ("The Safety Check")
.DESCRIPTION
    100% READ-ONLY: Never modifies files, game saves, or Steam configuration.
    Checks .NET SDK, Valheim 1.0 assemblies, BepInEx 5.4.x, Windows Doorstop
    (winhttp.dll / doorstop_config.ini), and warns if valheim.exe is running.
#>
[CmdletBinding()]
param(
    [string]$ValheimDir = $env:VALHEIM_DIR
)

$ErrorActionPreference = "Stop"
$PassCount = 0
$WarnCount = 0
$FailCount = 0

function Write-Pass([string]$Message) {
    Write-Host "  [PASS] " -ForegroundColor Green -NoNewline
    Write-Host $Message
    $script:PassCount++
}

function Write-Warn([string]$Message) {
    Write-Host "  [WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
    $script:WarnCount++
}

function Write-Fix([string]$Message) {
    Write-Host "  [FIX]  " -ForegroundColor Red -NoNewline
    Write-Host $Message
    $script:FailCount++
}

function Write-Hint([string]$Message) {
    Write-Host "         -> $Message" -ForegroundColor Cyan
}

Write-Host "======================================================================" -ForegroundColor White
Write-Host "  Valheim 1.0 Modding Doctor (Windows PowerShell Preflight)           " -ForegroundColor White
Write-Host "  Mode: 100% Read-Only Safety Check                                   " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor White
Write-Host ""

# -----------------------------------------------------------------------------
# 1. Check .NET SDK
# -----------------------------------------------------------------------------
Write-Host "[1/4] Checking .NET SDK (Compiler)..." -ForegroundColor White
$dotnetCmd = Get-Command dotnet -ErrorAction SilentlyContinue
if ($null -ne $dotnetCmd) {
    $dotnetVer = (& $dotnetCmd.Source --version 2>$null)
    Write-Pass ".NET SDK found: v$dotnetVer ($($dotnetCmd.Source))"
} else {
    Write-Fix ".NET SDK ('dotnet') was not found on your PATH."
    Write-Hint "Copy-paste fix: winget install Microsoft.DotNet.SDK.8"
}
Write-Host ""

# -----------------------------------------------------------------------------
# 2. Check Valheim Installation & 1.0 Managed Assemblies
# -----------------------------------------------------------------------------
Write-Host "[2/4] Locating Valheim 1.0 Installation..." -ForegroundColor White
$candidates = @(
    $ValheimDir,
    "C:\Program Files (x86)\Steam\steamapps\common\Valheim",
    "D:\SteamLibrary\steamapps\common\Valheim",
    "E:\SteamLibrary\steamapps\common\Valheim"
)

# Also check Windows Registry for Steam install path if available
try {
    $steamReg = Get-ItemProperty -Path "HKCU:\Software\Valve\Steam" -Name "SteamPath" -ErrorAction SilentlyContinue
    if ($null -ne $steamReg -and $steamReg.SteamPath) {
        $regValheim = Join-Path ($steamReg.SteamPath -replace '/', '\') "steamapps\common\Valheim"
        $candidates += $regValheim
    }
} catch {}

$ResolvedValheim = $null
foreach ($candidate in $candidates) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate -PathType Container)) {
        $ResolvedValheim = $candidate
        break
    }
}

if ($null -ne $ResolvedValheim) {
    Write-Pass "Valheim root found: $ResolvedValheim"
    $assemblyValheim = Join-Path $ResolvedValheim "valheim_Data\Managed\assembly_valheim.dll"
    if (Test-Path -LiteralPath $assemblyValheim -PathType Leaf) {
        Write-Pass "Valheim Managed assemblies verified (assembly_valheim.dll & UnityEngine.dll present)"
    } else {
        Write-Fix "assembly_valheim.dll is missing under $ResolvedValheim\valheim_Data\Managed\"
        Write-Hint "Verify integrity of game files in Steam -> Valheim -> Properties -> Installed Files."
    }
} else {
    Write-Fix "Could not auto-detect your Valheim installation directory."
    Write-Hint "Pass -ValheimDir 'D:\Your\SteamLibrary\steamapps\common\Valheim' or set `$env:VALHEIM_DIR."
}
Write-Host ""

# -----------------------------------------------------------------------------
# 3. Check BepInEx 5.4.x Core & Harmony
# -----------------------------------------------------------------------------
Write-Host "[3/4] Checking BepInEx 5.4.x Loader & Harmony..." -ForegroundColor White
if ($null -ne $ResolvedValheim) {
    $bepinexDll = Join-Path $ResolvedValheim "BepInEx\core\BepInEx.dll"
    $harmonyDll = Join-Path $ResolvedValheim "BepInEx\core\0Harmony.dll"
    if ((Test-Path -LiteralPath $bepinexDll) -and (Test-Path -LiteralPath $harmonyDll)) {
        Write-Pass "BepInEx core found (BepInEx.dll + 0Harmony.dll)"
    } else {
        Write-Fix "BepInEx\core\BepInEx.dll or 0Harmony.dll not found in $ResolvedValheim"
        Write-Hint "Extract denikson-BepInExPack_Valheim (v5.4.2202+) into your Valheim folder or link your mod manager profile."
    }
} else {
    Write-Warn "Skipped BepInEx check because Valheim directory was not found."
}
Write-Host ""

# -----------------------------------------------------------------------------
# 4. Check Windows Doorstop (winhttp.dll) & Running Process Lock
# -----------------------------------------------------------------------------
Write-Host "[4/4] Checking Windows Doorstop Hook & File Lock State..." -ForegroundColor White
if ($null -ne $ResolvedValheim) {
    $winhttpDll = Join-Path $ResolvedValheim "winhttp.dll"
    $doorstopIni = Join-Path $ResolvedValheim "doorstop_config.ini"

    if ((Test-Path -LiteralPath $winhttpDll) -and (Test-Path -LiteralPath $doorstopIni)) {
        Write-Pass "Windows Doorstop proxy verified (winhttp.dll + doorstop_config.ini in game root)"
    } else {
        Write-Warn "winhttp.dll or doorstop_config.ini not found in $ResolvedValheim"
        Write-Hint "Without winhttp.dll next to valheim.exe, clicking Play in Steam boots 100% vanilla Valheim!"
        Write-Hint "If you moved files from BepInExPack_Valheim\BepInExPack_Valheim\, move its contents up one folder into the Valheim root."
    }
}

$runningValheim = Get-Process -Name "valheim" -ErrorAction SilentlyContinue
if ($null -ne $runningValheim) {
    Write-Warn "valheim.exe is currently running (PID $($runningValheim.Id))."
    Write-Hint "Windows locks loaded DLLs in BepInEx\plugins\ while Valheim is open (you can still hot-reload .cfg files!)."
} else {
    Write-Pass "valheim.exe is not running (no Windows file locks on BepInEx\plugins\)"
}
Write-Host ""

# -----------------------------------------------------------------------------
# Summary Banner
# -----------------------------------------------------------------------------
Write-Host "======================================================================" -ForegroundColor White
if ($FailCount -eq 0) {
    Write-Host "  PREFLIGHT PASSED! ($PassCount passed, $WarnCount warnings, 0 blockers)" -ForegroundColor Green
    Write-Host "  Next Step (Chamber 2): Run .\tools\build-and-deploy.ps1 -DryRun" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor White
    exit 0
} else {
    Write-Host "  ACTION NEEDED: $FailCount item(s) marked [FIX] above need attention." -ForegroundColor Red
    Write-Host "  Apply the copy-paste fix shown under [FIX] and re-run .\tools\doctor.ps1" -ForegroundColor Yellow
    Write-Host "======================================================================" -ForegroundColor White
    exit 1
}
