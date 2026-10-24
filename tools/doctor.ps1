#Requires -Version 5.1
<#
.SYNOPSIS
    Valheim 1.0.20 Modding 101 (v3.0) — Chamber 1 Environment Preflight ("The Safety Check")
.DESCRIPTION
    100% READ-ONLY: Never modifies files, game saves, or Steam configuration.
    Features:
      - [1/4] .NET SDK (>= 8.0) check
      - [2/4] Multi-Drive Steam Auto-Discovery (parses libraryfolders.vdf across C:\, D:\, E:\, etc.)
      - [3/4] BepInEx 5.4.2202 & Mod Manager Profile Auto-Discovery (r2modman, Thunderstore, Gale)
      - [4/4] Save Vault Location (Untouched by Mods) + Clear Folder Summary Table
      - Optional -Open switch to open the active BepInEx\plugins (or Valheim) folder in Explorer
#>
[CmdletBinding()]
param(
    [switch]$Open,
    [string]$ValheimDir = ""
)

$ErrorActionPreference = "Stop"
$PassCount = 0
$WarnCount = 0
$FailCount = 0

function Write-Pass([string]$Message) {
    Write-Host "  [OK]   " -ForegroundColor Green -NoNewline
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
Write-Host "  Valheim 1.0.20 Modding Doctor v3.0 (Windows PowerShell Preflight)   " -ForegroundColor White
Write-Host "  Mode: 100% Read-Only Safety Check (Multi-Drive + Mod Profiles)      " -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor White
Write-Host ""

# -----------------------------------------------------------------------------
# [1/4] .NET SDK (>= 8.0)
# -----------------------------------------------------------------------------
Write-Host "[1/4] .NET SDK (>= 8.0)" -ForegroundColor White
$dotnetCmd = Get-Command dotnet -ErrorAction SilentlyContinue
if ($null -ne $dotnetCmd) {
    $dotnetVer = (& $dotnetCmd.Source --version 2>$null)
    $majorVer = 0
    if ($dotnetVer -match '^(\d+)\.') {
        $majorVer = [int]$Matches[1]
    }
    if ($majorVer -ge 8) {
        Write-Pass ".NET SDK found: v$dotnetVer ($($dotnetCmd.Source))"
    } else {
        Write-Warn ".NET SDK v$dotnetVer found at $($dotnetCmd.Source), but .NET 8.0+ is recommended."
        Write-Hint "Upgrade command: winget install Microsoft.DotNet.SDK.8"
    }
} else {
    Write-Fix ".NET SDK ('dotnet') was not found on your PATH."
    Write-Hint "Copy-paste fix: winget install Microsoft.DotNet.SDK.8"
}
Write-Host ""

# -----------------------------------------------------------------------------
# [2/4] Valheim 1.0.20 Install & Managed DLLs (Multi-Drive libraryfolders.vdf)
# -----------------------------------------------------------------------------
Write-Host "[2/4] Valheim 1.0.20 Install & Managed DLLs" -ForegroundColor White

function Get-SteamLibraryFolders {
    $steamRoots = New-Object System.Collections.Generic.List[string]

    # 1. Registry Steam paths
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

    # 2. Default & Multi-Drive Steam roots across C:\, D:\, E:\, etc.
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

if ($null -ne $ResolvedValheim) {
    Write-Pass "Discovered Steam Valheim folder: $ResolvedValheim"
    $assemblyValheim = Join-Path $ResolvedValheim "valheim_Data\Managed\assembly_valheim.dll"
    $unityEngineDll  = Join-Path $ResolvedValheim "valheim_Data\Managed\UnityEngine.dll"
    if ((Test-Path -LiteralPath $assemblyValheim -PathType Leaf) -and (Test-Path -LiteralPath $unityEngineDll -PathType Leaf)) {
        Write-Pass "Valheim 1.0.20 Managed DLLs verified (assembly_valheim.dll & UnityEngine.dll)"
    } else {
        Write-Fix "assembly_valheim.dll is missing under $ResolvedValheim\valheim_Data\Managed\"
        Write-Hint "Verify integrity of game files in Steam -> Valheim -> Properties -> Installed Files."
    }
} else {
    Write-Fix "Could not auto-detect your Steam Valheim installation across any drive."
    Write-Hint "Pass -ValheimDir 'D:\Your\SteamLibrary\steamapps\common\Valheim' or set `$env:VALHEIM_DIR."
}
Write-Host ""

# -----------------------------------------------------------------------------
# [3/4] BepInEx 5.4.2202 & Mod Manager Profiles
# -----------------------------------------------------------------------------
Write-Host "[3/4] BepInEx 5.4.2202 & Mod Manager Profiles" -ForegroundColor White

$SteamHasBepInEx = $false
$SteamStatusLabel = "NOT FOUND"
$SteamLogTimestamp = $null

if ($null -ne $ResolvedValheim) {
    $steamBepDll = Join-Path $ResolvedValheim "BepInEx\core\BepInEx.dll"
    $steamHarmonyDll = Join-Path $ResolvedValheim "BepInEx\core\0Harmony.dll"
    if ((Test-Path -LiteralPath $steamBepDll -PathType Leaf) -and (Test-Path -LiteralPath $steamHarmonyDll -PathType Leaf)) {
        $SteamHasBepInEx = $true
        $SteamStatusLabel = "MODDED (Direct BepInEx)"
        $steamLog = Join-Path $ResolvedValheim "BepInEx\LogOutput.log"
        if (Test-Path -LiteralPath $steamLog -PathType Leaf) {
            $SteamLogTimestamp = (Get-Item -LiteralPath $steamLog).LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        }
    } else {
        $SteamStatusLabel = "CLEAN VANILLA (Safe for Mod Manager Profiles)"
    }
}

# Scan known Mod Manager roots for Valheim profiles containing BepInEx\core\BepInEx.dll
$ProfileRoots = @()
if ($env:APPDATA) {
    $ProfileRoots += [PSCustomObject]@{ Manager = "r2modman";     Root = Join-Path $env:APPDATA "r2modmanPlus-local\Valheim\profiles" }
    $ProfileRoots += [PSCustomObject]@{ Manager = "Thunderstore"; Root = Join-Path $env:APPDATA "Thunderstore Mod Manager\DataFolder\Valheim\profiles" }
    $ProfileRoots += [PSCustomObject]@{ Manager = "Gale";         Root = Join-Path $env:APPDATA "com.kesomannen.gale\valheim\profiles" }
}
if ($env:LOCALAPPDATA) {
    $ProfileRoots += [PSCustomObject]@{ Manager = "Gale (Local)"; Root = Join-Path $env:LOCALAPPDATA "com.kesomannen.gale\valheim\profiles" }
}

$DiscoveredProfiles = New-Object System.Collections.Generic.List[PSObject]
foreach ($entry in $ProfileRoots) {
    if (Test-Path -LiteralPath $entry.Root -PathType Container) {
        $subDirs = Get-ChildItem -LiteralPath $entry.Root -Directory -ErrorAction SilentlyContinue
        foreach ($dir in $subDirs) {
            $profBepDll = Join-Path $dir.FullName "BepInEx\core\BepInEx.dll"
            if (Test-Path -LiteralPath $profBepDll -PathType Leaf) {
                $profLog = Join-Path $dir.FullName "BepInEx\LogOutput.log"
                $logTime = "No LogOutput.log yet"
                if (Test-Path -LiteralPath $profLog -PathType Leaf) {
                    $logTime = (Get-Item -LiteralPath $profLog).LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                }
                $DiscoveredProfiles.Add([PSCustomObject]@{
                    Manager      = $entry.Manager
                    ProfileName  = $dir.Name
                    ProfilePath  = $dir.FullName
                    PluginsPath  = Join-Path $dir.FullName "BepInEx\plugins"
                    LogTimestamp = $logTime
                })
            }
        }
    }
}

if ($null -ne $ResolvedValheim) {
    Write-Host "  Steam Valheim Status : $SteamStatusLabel" -ForegroundColor Cyan
    if ($SteamLogTimestamp) {
        Write-Host "  Steam LogOutput.log  : Last modified $SteamLogTimestamp" -ForegroundColor Gray
    }
}

if ($DiscoveredProfiles.Count -gt 0) {
    Write-Pass "Discovered $($DiscoveredProfiles.Count) Mod Manager profile(s) with BepInEx:"
    foreach ($prof in $DiscoveredProfiles) {
        Write-Host "         - [$($prof.Manager)] '$($prof.ProfileName)' -> $($prof.ProfilePath) (LogOutput.log: $($prof.LogTimestamp))" -ForegroundColor Gray
    }
} else {
    Write-Host "  Mod Manager Profiles : None detected in r2modman / Thunderstore / Gale roots" -ForegroundColor Gray
}

if ($SteamHasBepInEx -or ($DiscoveredProfiles.Count -gt 0)) {
    if ($SteamHasBepInEx -and ($DiscoveredProfiles.Count -gt 0)) {
        Write-Pass "BepInEx 5.4.2202 ready in BOTH Steam Valheim and $($DiscoveredProfiles.Count) Mod Manager profile(s)!"
    } elseif ($SteamHasBepInEx) {
        Write-Pass "BepInEx 5.4.2202 ready in Steam Valheim folder ($ResolvedValheim\BepInEx\core)"
        $winhttpDll = Join-Path $ResolvedValheim "winhttp.dll"
        $doorstopIni = Join-Path $ResolvedValheim "doorstop_config.ini"
        if ((Test-Path -LiteralPath $winhttpDll) -and (Test-Path -LiteralPath $doorstopIni)) {
            Write-Pass "Windows Doorstop proxy verified (winhttp.dll + doorstop_config.ini present)"
        } else {
            Write-Warn "winhttp.dll or doorstop_config.ini missing in $ResolvedValheim (required when launching direct Steam BepInEx)."
        }
    } else {
        Write-Pass "BepInEx 5.4.2202 ready via Mod Manager profile(s) while Steam folder stays CLEAN VANILLA!"
    }
} else {
    Write-Fix "BepInEx 5.4.2202 was not found in Steam Valheim OR in any Mod Manager profile (r2modman / Thunderstore / Gale)."
    Write-Hint "Option A (Mod Manager - Recommended): Install r2modman or Gale, create a Valheim profile, and install BepInExPack_Valheim."
    Write-Hint "Option B (Direct Steam): Extract denikson-BepInExPack_Valheim (v5.4.2202+) directly into $ResolvedValheim."
}

$runningValheim = Get-Process -Name "valheim" -ErrorAction SilentlyContinue
if ($null -ne $runningValheim) {
    Write-Warn "valheim.exe is currently running (PID $($runningValheim.Id)) - close Valheim before replacing DLLs (hot-reloading .cfg files still works live!)."
}
Write-Host ""

# -----------------------------------------------------------------------------
# [4/4] Save Vault Location (Untouched by Mods)
# -----------------------------------------------------------------------------
Write-Host "[4/4] Save Vault Location (Untouched by Mods)" -ForegroundColor White
$SaveVaultPath = Join-Path $env:USERPROFILE "AppData\LocalLow\IronGate\Valheim"
if (Test-Path -LiteralPath $SaveVaultPath -PathType Container) {
    Write-Pass "Save Vault verified (separate from game & mod files): $SaveVaultPath"
} else {
    Write-Pass "Save Vault location (created on first Valheim launch): $SaveVaultPath"
}
Write-Hint "Your characters (.fch) and worlds (.db/.fwl) live here and are NEVER touched by build-and-deploy or -Reset."
Write-Host ""

# -----------------------------------------------------------------------------
# Determine Active Plugins Folder & Print Folder Summary Table
# -----------------------------------------------------------------------------
$ActivePluginsFolder = $null
if ($DiscoveredProfiles.Count -gt 0) {
    $ActivePluginsFolder = $DiscoveredProfiles[0].PluginsPath
} elseif ($SteamHasBepInEx -and $null -ne $ResolvedValheim) {
    $ActivePluginsFolder = Join-Path $ResolvedValheim "BepInEx\plugins"
} elseif ($null -ne $ResolvedValheim) {
    $ActivePluginsFolder = $ResolvedValheim
}

Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  FOLDER SUMMARY TABLE (3 Places on Your PC)" -ForegroundColor White
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ("  1. Steam Valheim   : {0}" -f $(if ($ResolvedValheim) { "$ResolvedValheim [$SteamStatusLabel]" } else { "Not found" }))
Write-Host ("  2. Mod Profiles    : {0}" -f $(if ($DiscoveredProfiles.Count -gt 0) { "$($DiscoveredProfiles.Count) profile(s) detected ($($DiscoveredProfiles[0].Manager): $($DiscoveredProfiles[0].ProfileName))" } else { "None (Direct Steam mode)" }))
Write-Host ("  3. Active Plugins  : {0}" -f $(if ($ActivePluginsFolder) { $ActivePluginsFolder } else { "N/A" }))
Write-Host ("  4. Save Vault      : {0} [100% Untouched]" -f $SaveVaultPath)
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# -----------------------------------------------------------------------------
# Optional -Open Switch: Open Active Plugins (or Valheim) Folder in Explorer
# -----------------------------------------------------------------------------
if ($Open) {
    $folderToOpen = $ActivePluginsFolder
    if (-not [string]::IsNullOrWhiteSpace($folderToOpen) -and -not (Test-Path -LiteralPath $folderToOpen -PathType Container)) {
        $folderToOpen = $ResolvedValheim
    }
    if (-not [string]::IsNullOrWhiteSpace($folderToOpen) -and (Test-Path -LiteralPath $folderToOpen -PathType Container)) {
        Write-Host "  [OPEN] Opening folder in Windows Explorer: $folderToOpen" -ForegroundColor Cyan
        try {
            Start-Process explorer.exe -ArgumentList "`"$folderToOpen`""
        } catch {
            Write-Warn "Could not launch explorer.exe automatically. Path: $folderToOpen"
        }
    } else {
        Write-Warn "Cannot open folder because neither BepInEx\plugins nor Valheim root exists yet."
    }
    Write-Host ""
}

# -----------------------------------------------------------------------------
# Summary Banner
# -----------------------------------------------------------------------------
Write-Host "======================================================================" -ForegroundColor White
if ($FailCount -eq 0) {
    Write-Host "  PREFLIGHT PASSED! ($PassCount OK, $WarnCount warnings, 0 blockers)" -ForegroundColor Green
    Write-Host "  Next Step (Chamber 2): Run .\tools\build-and-deploy.ps1 -DryRun" -ForegroundColor Cyan
    Write-Host "  Tip: Run .\tools\doctor.ps1 -Open anytime to pop open your plugins folder!" -ForegroundColor Gray
    Write-Host "======================================================================" -ForegroundColor White
    exit 0
} else {
    Write-Host "  ACTION NEEDED: $FailCount item(s) marked [FIX] above need attention." -ForegroundColor Red
    Write-Host "  Apply the copy-paste fix shown under [FIX] and re-run .\tools\doctor.ps1" -ForegroundColor Yellow
    Write-Host "======================================================================" -ForegroundColor White
    exit 1
}
