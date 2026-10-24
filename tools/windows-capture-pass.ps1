#Requires -Version 5.1
<#
.SYNOPSIS
    Turn-Key Windows Verification & Screenshot Pass for Valheim Modding 101
.DESCRIPTION
    Run this script when booted into Windows to execute:
      1. tools\doctor.ps1 (Windows PowerShell Preflight)
      2. tools\build-and-deploy.ps1 -Deploy (Compile & deploy HelloValheim.dll)
      3. Optional fast-boot launch (-LaunchGame) for capturing Windows 11 screenshots
         of the F5 'vikingping' and 'vikinginspect' console outputs.
#>
[CmdletBinding()]
param(
    [string]$ValheimDir = "C:\Program Files (x86)\Steam\steamapps\common\Valheim",
    [switch]$LaunchGame,
    [switch]$ResetAfter
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Valheim 1.0 Modding 101 — Windows Native Capture & Verification Pass" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Run Doctor
Write-Host "[Step 1/3] Running Windows Preflight Doctor..." -ForegroundColor White
& (Join-Path $ScriptDir "doctor.ps1") -ValheimDir $ValheimDir
if ($LASTEXITCODE -ne 0) {
    throw "doctor.ps1 reported preflight blockers. Fix above issues before continuing."
}

# Step 2: Build & Deploy HelloValheim.dll
Write-Host ""
Write-Host "[Step 2/3] Compiling & Deploying HelloValheim.dll..." -ForegroundColor White
& (Join-Path $ScriptDir "build-and-deploy.ps1") -Deploy -ValheimDir $ValheimDir
if ($LASTEXITCODE -ne 0) {
    throw "build-and-deploy.ps1 failed."
}

# Step 3: Optional Fast-Boot Launch for Screenshot Capture
Write-Host ""
if ($LaunchGame) {
    $valheimExe = Join-Path $ValheimDir "valheim.exe"
    Write-Host "[Step 3/3] Launching Valheim with -console for screenshot capture..." -ForegroundColor Green
    Write-Host "  -> Once at the Main Menu, press F5 and run: vikingping" -ForegroundColor Yellow
    Write-Host "  -> Then run: vikinginspect" -ForegroundColor Yellow
    Start-Process -FilePath $valheimExe -ArgumentList "-console -screen-fullscreen 0 -screen-width 1920 -screen-height 1080" -WorkingDirectory $ValheimDir
} else {
    Write-Host "[Step 3/3] Ready for manual launch (or re-run with -LaunchGame to auto-launch valheim.exe -console)." -ForegroundColor Green
}

if ($ResetAfter) {
    Write-Host ""
    Write-Host "Cleaning up HelloValheim deployment (-ResetAfter)..." -ForegroundColor Cyan
    & (Join-Path $ScriptDir "build-and-deploy.ps1") -Reset -ValheimDir $ValheimDir
}
