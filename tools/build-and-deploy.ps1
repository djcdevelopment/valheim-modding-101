#Requires -Version 5.1
<#
.SYNOPSIS
    Valheim 1.0 Modding 101 — Chamber 2 & 3 Build, Verify & Deploy Tool (Windows)
.DESCRIPTION
    Supports:
      .\tools\build-and-deploy.ps1 -DryRun   # Compile & verify DLL without touching Valheim folder
      .\tools\build-and-deploy.ps1 -Deploy   # Compile, verify & copy DLL to BepInEx\plugins\HelloValheim\
      .\tools\build-and-deploy.ps1 -Reset    # Remove HelloValheim from BepInEx\plugins\ in 1 second
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Deploy,
    [switch]$Reset,
    [string]$ValheimDir = $env:VALHEIM_DIR
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$CsprojPath = Join-Path $RepoRoot "starter-mod\HelloValheim.csproj"
$OutDir = Join-Path $RepoRoot "starter-mod\bin\Release"
$DllPath = Join-Path $OutDir "HelloValheim.dll"

# Resolve Valheim Directory
$candidates = @(
    $ValheimDir,
    "C:\Program Files (x86)\Steam\steamapps\common\Valheim",
    "D:\SteamLibrary\steamapps\common\Valheim",
    "E:\SteamLibrary\steamapps\common\Valheim"
)
$ResolvedValheim = $null
foreach ($candidate in $candidates) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate -PathType Container)) {
        $ResolvedValheim = $candidate
        break
    }
}

# -----------------------------------------------------------------------------
# Mode: -Reset (1-Second Return to Vanilla State)
# -----------------------------------------------------------------------------
if ($Reset) {
    if ($null -eq $ResolvedValheim) {
        Write-Host "[ERROR] Could not locate Valheim directory to reset." -ForegroundColor Red
        exit 1
    }
    $targetPluginDir = Join-Path $ResolvedValheim "BepInEx\plugins\HelloValheim"
    $targetCfgFile = Join-Path $ResolvedValheim "BepInEx\config\com.example.hellovalheim.cfg"

    if (Test-Path -LiteralPath $targetPluginDir) {
        Remove-Item -LiteralPath $targetPluginDir -Recurse -Force
        Write-Host "[PASS] Removed $targetPluginDir" -ForegroundColor Green
    } else {
        Write-Host "[INFO] $targetPluginDir was already clean." -ForegroundColor Cyan
    }

    if (Test-Path -LiteralPath $targetCfgFile) {
        Remove-Item -LiteralPath $targetCfgFile -Force
        Write-Host "[PASS] Removed $targetCfgFile" -ForegroundColor Green
    }

    Write-Host "100% Reset Complete: HelloValheim has been removed from your game." -ForegroundColor Green
    exit 0
}

$modeLabel = if ($DryRun) { "dry-run" } else { "deploy" }
Write-Host "======================================================================" -ForegroundColor White
Write-Host "  Building HelloValheim.csproj (Mode: $modeLabel)                     " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor White

$buildArgs = @("build", $CsprojPath, "-c", "Release", "--nologo")
if ($null -ne $ResolvedValheim) {
    $buildArgs += "-p:ValheimDir=$ResolvedValheim"
}

& dotnet @buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] dotnet build failed with exit code $LASTEXITCODE." -ForegroundColor Red
    exit $LASTEXITCODE
}

# -----------------------------------------------------------------------------
# Artifact & Cliff-Edge Verification (<Private>false</Private> Guard)
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "Verifying compiled artifact..." -ForegroundColor White

if (-not (Test-Path -LiteralPath $DllPath -PathType Leaf)) {
    Write-Host "  [FAIL] Expected output not found at $DllPath" -ForegroundColor Red
    exit 1
}

$dllItem = Get-Item -LiteralPath $DllPath
$dllBytes = $dllItem.Length
$dllKb = [math]::Ceiling($dllBytes / 1024.0)

if ($dllBytes -gt 102400) {
    Write-Host "  [FAIL] HelloValheim.dll is unexpectedly large ($dllBytes bytes > 100 KB)." -ForegroundColor Red
    exit 1
}
Write-Host "  [PASS] HelloValheim.dll compiled cleanly ($dllBytes bytes / ~$dllKb KB)" -ForegroundColor Green

$leakedUnity = Join-Path $OutDir "UnityEngine.dll"
$leakedHarmony = Join-Path $OutDir "0Harmony.dll"
$leakedBepInEx = Join-Path $OutDir "BepInEx.dll"
if ((Test-Path -LiteralPath $leakedUnity) -or (Test-Path -LiteralPath $leakedHarmony) -or (Test-Path -LiteralPath $leakedBepInEx)) {
    Write-Host "  [FAIL] Cliff-Edge Trap Triggered! Engine DLLs leaked into $OutDir!" -ForegroundColor Red
    Write-Host "         Ensure all <Reference> tags in HelloValheim.csproj have <Private>false</Private>." -ForegroundColor Yellow
    exit 1
}
Write-Host "  [PASS] Zero UnityEngine/Harmony DLL bloat in output directory (<Private>false</Private> verified)" -ForegroundColor Green

if ($DryRun) {
    Write-Host ""
    Write-Host "DRY-RUN SUCCEEDED! Artifact verified at:" -ForegroundColor Green
    Write-Host "  $DllPath ($dllBytes bytes)" -ForegroundColor Cyan
    Write-Host "When ready to install into Valheim, run: .\tools\build-and-deploy.ps1 -Deploy" -ForegroundColor White
    exit 0
}

if ($null -eq $ResolvedValheim) {
    Write-Host "[ERROR] Cannot deploy because Valheim directory was not found. Pass -ValheimDir and retry." -ForegroundColor Red
    exit 1
}

$pluginDestDir = Join-Path $ResolvedValheim "BepInEx\plugins\HelloValheim"
New-Item -ItemType Directory -Path $pluginDestDir -Force | Out-Null
Copy-Item -LiteralPath $DllPath -Destination (Join-Path $pluginDestDir "HelloValheim.dll") -Force

Write-Host "  [PASS] Deployed to: $pluginDestDir\HelloValheim.dll" -ForegroundColor Green
Write-Host ""
Write-Host "======================================================================" -ForegroundColor White
Write-Host "  DEPLOY COMPLETE! Next Step (Chamber 3): Boot & Verify" -ForegroundColor Green
Write-Host "  1. Launch Valheim from Steam (with -console in Launch Options)"
Write-Host "  2. Check your log:"
Write-Host "     Select-String -Path `"$ResolvedValheim\BepInEx\LogOutput.log`" -Pattern 'HelloValheim|vikingping'" -ForegroundColor Cyan
Write-Host "  3. Press F5 at the Main Menu and type: vikingping or vikinginspect"
Write-Host "  4. Undo anytime in 1 second: .\tools\build-and-deploy.ps1 -Reset"
Write-Host "======================================================================" -ForegroundColor White
