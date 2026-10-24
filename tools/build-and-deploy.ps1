#Requires -Version 5.1
<#
.SYNOPSIS
    Valheim 1.0.20 Modding 101 (v3.0) — Chamber 2 & 3 Build, Verify & Multi-Target Deploy Tool (Windows)
.DESCRIPTION
    Supports Multi-Drive Steam (libraryfolders.vdf) + Mod Manager Profiles (r2modman, Thunderstore, Gale):
      .\tools\build-and-deploy.ps1 -DryRun                   # Compile & verify DLL without touching game/profiles
      .\tools\build-and-deploy.ps1 -Deploy                   # Compile, verify & deploy to Steam + Mod Profiles
      .\tools\build-and-deploy.ps1 -Deploy -Profile Default  # Deploy to a specific Mod Manager profile
      .\tools\build-and-deploy.ps1 -Reset                    # Remove HelloValheim.dll & .cfg from Steam + Profiles
#>
[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Deploy,
    [switch]$Reset,
    [string]$Profile = "",
    [string]$ValheimDir = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir

$CsprojPath = Join-Path $RepoRoot "starter-mod\HelloValheim\HelloValheim.csproj"
if (-not (Test-Path -LiteralPath $CsprojPath -PathType Leaf)) {
    $CsprojPath = Join-Path $RepoRoot "starter-mod\HelloValheim.csproj"
}
$ProjectDir = Split-Path -Parent $CsprojPath
$OutDir = Join-Path $ProjectDir "bin\Release"
$DllPath = Join-Path $OutDir "HelloValheim.dll"

# -----------------------------------------------------------------------------
# 1. Multi-Drive Steam Auto-Discovery (libraryfolders.vdf)
# -----------------------------------------------------------------------------
function Get-SteamLibraryFolders {
    $steamRoots = New-Object System.Collections.Generic.List[string]
    try {
        $regCu = Get-ItemProperty -Path "HKCU:\Software\Valve\Steam" -Name "SteamPath" -ErrorAction SilentlyContinue
        if ($null -ne $regCu -and $regCu.SteamPath) {
            $steamRoots.Add(($regCu.SteamPath -replace '/', '\'))
        }
    } catch {}
    try {
        $regLm = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam" -Name "InstallPath" -ErrorAction SilentlyContinue
        if ($null -ne $regLm -and $regLm.InstallPath) {
            $steamRoots.Add(($regLm.InstallPath -replace '/', '\'))
        }
    } catch {}

    $steamRoots.Add("C:\Program Files (x86)\Steam")
    $steamRoots.Add("C:\Program Files\Steam")

    try {
        $drives = Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue
        foreach ($d in $drives) {
            if ($d.Root -match '^[A-Za-z]:\\$') {
                $root = $d.Root.TrimEnd('\')
                $steamRoots.Add("$root\Steam")
                $steamRoots.Add("$root\SteamLibrary")
                $steamRoots.Add("$root\Program Files (x86)\Steam")
                $steamRoots.Add("$root\Games\Steam")
                $steamRoots.Add("$root\Games\SteamLibrary")
            }
        }
    } catch {
        foreach ($letter in @('C','D','E','F','G','H')) {
            $steamRoots.Add("${letter}:\Steam")
            $steamRoots.Add("${letter}:\SteamLibrary")
            $steamRoots.Add("${letter}:\Program Files (x86)\Steam")
        }
    }

    $discoveredLibs = New-Object System.Collections.Generic.List[string]
    foreach ($sRoot in ($steamRoots | Select-Object -Unique)) {
        if ([string]::IsNullOrWhiteSpace($sRoot)) { continue }
        if (Test-Path -LiteralPath $sRoot -PathType Container) {
            if (-not $discoveredLibs.Contains($sRoot)) {
                $discoveredLibs.Add($sRoot)
            }
            $vdfCandidates = @(
                (Join-Path $sRoot "steamapps\libraryfolders.vdf"),
                (Join-Path $sRoot "config\libraryfolders.vdf")
            )
            foreach ($vdf in $vdfCandidates) {
                if (Test-Path -LiteralPath $vdf -PathType Leaf) {
                    try {
                        $vdfLines = Get-Content -LiteralPath $vdf -ErrorAction SilentlyContinue
                        foreach ($line in $vdfLines) {
                            if ($line -match '"path"\s+"([^"]+)"') {
                                $parsedPath = $Matches[1] -replace '\\\\', '\'
                                if (-not [string]::IsNullOrWhiteSpace($parsedPath) -and -not $discoveredLibs.Contains($parsedPath)) {
                                    $discoveredLibs.Add($parsedPath)
                                }
                            }
                        }
                    } catch {}
                }
            }
        }
    }
    return $discoveredLibs
}

$explicitValheim = if (-not [string]::IsNullOrWhiteSpace($ValheimDir)) { $ValheimDir } elseif (-not [string]::IsNullOrWhiteSpace($env:VALHEIM_DIR)) { $env:VALHEIM_DIR } else { "" }

$valheimCandidates = New-Object System.Collections.Generic.List[string]
if (-not [string]::IsNullOrWhiteSpace($explicitValheim)) {
    $valheimCandidates.Add($explicitValheim)
}
foreach ($lib in (Get-SteamLibraryFolders)) {
    $valheimCandidates.Add((Join-Path $lib "steamapps\common\Valheim"))
    $valheimCandidates.Add((Join-Path $lib "common\Valheim"))
}

$ResolvedValheim = $null
foreach ($candidate in ($valheimCandidates | Select-Object -Unique)) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate -PathType Container)) {
        $ResolvedValheim = $candidate
        break
    }
}

# -----------------------------------------------------------------------------
# 2. Mod Manager Profile Auto-Discovery (r2modman, Thunderstore, Gale)
# -----------------------------------------------------------------------------
$ProfileRoots = @()
if ($env:APPDATA) {
    $ProfileRoots += [PSCustomObject]@{ Manager = "r2modman";     Root = Join-Path $env:APPDATA "r2modmanPlus-local\Valheim\profiles" }
    $ProfileRoots += [PSCustomObject]@{ Manager = "Thunderstore"; Root = Join-Path $env:APPDATA "Thunderstore Mod Manager\DataFolder\Valheim\profiles" }
    $ProfileRoots += [PSCustomObject]@{ Manager = "Gale";         Root = Join-Path $env:APPDATA "com.kesomannen.gale\valheim\profiles" }
}
if ($env:LOCALAPPDATA) {
    $ProfileRoots += [PSCustomObject]@{ Manager = "Gale (Local)"; Root = Join-Path $env:LOCALAPPDATA "com.kesomannen.gale\valheim\profiles" }
}

$AllProfiles = New-Object System.Collections.Generic.List[PSObject]
foreach ($entry in $ProfileRoots) {
    if (Test-Path -LiteralPath $entry.Root -PathType Container) {
        $subDirs = Get-ChildItem -LiteralPath $entry.Root -Directory -ErrorAction SilentlyContinue
        foreach ($dir in $subDirs) {
            $profBepDll = Join-Path $dir.FullName "BepInEx\core\BepInEx.dll"
            if (Test-Path -LiteralPath $profBepDll -PathType Leaf) {
                $AllProfiles.Add([PSCustomObject]@{
                    Manager     = $entry.Manager
                    ProfileName = $dir.Name
                    ProfilePath = $dir.FullName
                    BepInExRoot = Join-Path $dir.FullName "BepInEx"
                    CoreDir     = Join-Path $dir.FullName "BepInEx\core"
                    PluginsDir  = Join-Path $dir.FullName "BepInEx\plugins"
                })
            }
        }
    }
}

$MatchingProfiles = New-Object System.Collections.Generic.List[PSObject]
foreach ($prof in $AllProfiles) {
    if ([string]::IsNullOrWhiteSpace($Profile) -or ($prof.ProfileName -ieq $Profile)) {
        $MatchingProfiles.Add($prof)
    }
}

# -----------------------------------------------------------------------------
# Mode: -Reset (1-Second Return to Vanilla State Across Steam + Mod Profiles)
# -----------------------------------------------------------------------------
if ($Reset) {
    Write-Host "======================================================================" -ForegroundColor White
    Write-Host "  Resetting HelloValheim Across Steam & Mod Manager Profiles          " -ForegroundColor White
    Write-Host "======================================================================" -ForegroundColor White

    $bepInExRootsToClean = New-Object System.Collections.Generic.List[string]
    if ($null -ne $ResolvedValheim) {
        $steamBepRoot = Join-Path $ResolvedValheim "BepInEx"
        if (Test-Path -LiteralPath $steamBepRoot -PathType Container) {
            $bepInExRootsToClean.Add($steamBepRoot)
        }
    }
    foreach ($prof in $AllProfiles) {
        if (-not [string]::IsNullOrWhiteSpace($Profile) -and ($prof.ProfileName -ine $Profile)) {
            continue
        }
        if (Test-Path -LiteralPath $prof.BepInExRoot -PathType Container) {
            $bepInExRootsToClean.Add($prof.BepInExRoot)
        }
    }

    if ($bepInExRootsToClean.Count -eq 0 -and $null -eq $ResolvedValheim) {
        Write-Host "[ERROR] Could not locate Valheim directory or Mod Manager profiles to reset." -ForegroundColor Red
        exit 1
    }

    $removedCount = 0
    foreach ($bepRoot in ($bepInExRootsToClean | Select-Object -Unique)) {
        $pluginSubDir  = Join-Path $bepRoot "plugins\HelloValheim"
        $pluginSubDll  = Join-Path $bepRoot "plugins\HelloValheim\HelloValheim.dll"
        $pluginFlatDll = Join-Path $bepRoot "plugins\HelloValheim.dll"
        $cfgV3         = Join-Path $bepRoot "config\com.valheim101.hellovalheim.cfg"
        $cfgLegacy     = Join-Path $bepRoot "config\com.example.hellovalheim.cfg"

        foreach ($fileTarget in @($pluginSubDll, $pluginFlatDll, $cfgV3, $cfgLegacy)) {
            if (Test-Path -LiteralPath $fileTarget -PathType Leaf) {
                Remove-Item -LiteralPath $fileTarget -Force
                Write-Host "  [REMOVED] $fileTarget" -ForegroundColor Green
                $removedCount++
            }
        }
        if (Test-Path -LiteralPath $pluginSubDir -PathType Container) {
            Remove-Item -LiteralPath $pluginSubDir -Recurse -Force
            Write-Host "  [REMOVED] $pluginSubDir" -ForegroundColor Green
            $removedCount++
        }
    }

    if ($removedCount -eq 0) {
        Write-Host "  [INFO] All Steam & Mod Manager profile folders were already clean." -ForegroundColor Cyan
    }
    Write-Host "100% Reset Complete: HelloValheim (.dll & .cfg) removed from your game and profiles." -ForegroundColor Green
    exit 0
}

# -----------------------------------------------------------------------------
# 3. Profile-Aware Compilation (-p:ValheimDir & -p:BepInExCoreDir)
# -----------------------------------------------------------------------------
$modeLabel = if ($DryRun) { "dry-run" } else { "deploy" }
Write-Host "======================================================================" -ForegroundColor White
Write-Host "  Building HelloValheim.csproj (Mode: $modeLabel)                     " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor White

$buildArgs = @("build", $CsprojPath, "-c", "Release", "--nologo")
if ($null -ne $ResolvedValheim) {
    $buildArgs += "-p:ValheimDir=$ResolvedValheim"
    $steamBepInExDll = Join-Path $ResolvedValheim "BepInEx\core\BepInEx.dll"
    if (-not (Test-Path -LiteralPath $steamBepInExDll -PathType Leaf)) {
        $compileProfile = if ($MatchingProfiles.Count -gt 0) { $MatchingProfiles[0] } elseif ($AllProfiles.Count -gt 0) { $AllProfiles[0] } else { $null }
        if ($null -ne $compileProfile) {
            Write-Host "  [INFO] Steam folder is CLEAN VANILLA; compiling against profile BepInEx core:" -ForegroundColor Cyan
            Write-Host "         $($compileProfile.CoreDir)" -ForegroundColor Gray
            $buildArgs += "-p:BepInExCoreDir=$($compileProfile.CoreDir)"
        }
    }
}

& dotnet @buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] dotnet build failed with exit code $LASTEXITCODE." -ForegroundColor Red
    exit $LASTEXITCODE
}

# -----------------------------------------------------------------------------
# 4. Artifact & Cliff-Edge Verification (<Private>false</Private> Guard)
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

# -----------------------------------------------------------------------------
# 5. Multi-Target Deployment (Steam + Mod Manager Profiles)
# -----------------------------------------------------------------------------
if (-not [string]::IsNullOrWhiteSpace($Profile) -and $MatchingProfiles.Count -eq 0) {
    Write-Host "[ERROR] Requested Mod Manager profile '$Profile' was not found." -ForegroundColor Red
    exit 1
}

$DeployDestinations = New-Object System.Collections.Generic.List[string]
$steamHasBepInEx = ($null -ne $ResolvedValheim) -and (Test-Path -LiteralPath (Join-Path $ResolvedValheim "BepInEx\core\BepInEx.dll") -PathType Leaf)

if ([string]::IsNullOrWhiteSpace($Profile)) {
    if ($steamHasBepInEx -or ($MatchingProfiles.Count -eq 0 -and $null -ne $ResolvedValheim)) {
        $DeployDestinations.Add((Join-Path $ResolvedValheim "BepInEx\plugins\HelloValheim"))
    }
}

foreach ($prof in $MatchingProfiles) {
    $DeployDestinations.Add((Join-Path $prof.PluginsDir "HelloValheim"))
}

if ($DeployDestinations.Count -eq 0) {
    Write-Host "[ERROR] Cannot deploy because neither a Steam Valheim directory nor a Mod Manager profile was found." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploying HelloValheim.dll to $($DeployDestinations.Count) target(s)..." -ForegroundColor White
$CopiedFiles = New-Object System.Collections.Generic.List[string]
foreach ($destDir in ($DeployDestinations | Select-Object -Unique)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    $destFile = Join-Path $destDir "HelloValheim.dll"
    Copy-Item -LiteralPath $DllPath -Destination $destFile -Force
    $CopiedFiles.Add($destFile)
    Write-Host "  [DEPLOYED] $destFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor White
Write-Host "  DEPLOY COMPLETE! ($($CopiedFiles.Count) destination(s) updated)" -ForegroundColor Green
Write-Host "  Next Step (Chamber 3): Boot & Verify" -ForegroundColor White
Write-Host "  1. Launch Valheim (via your Mod Manager or Steam with -console)"
Write-Host "  2. Press F5 at the Main Menu and type: vikingping or vikinginspect"
Write-Host "  3. Undo anytime in 1 second: .\tools\build-and-deploy.ps1 -Reset"
Write-Host "======================================================================" -ForegroundColor White
