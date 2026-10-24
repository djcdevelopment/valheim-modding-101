/* ==========================================================================
   Valheim 1.0.20 Interactive Modding Workbench — Complete 8-Chamber Dataset
   Zero external dependencies; compatible with file:// and static hosting.
   ========================================================================== */

window.WORKBENCH_DATA = {
  version: "1.0.20 (Deep North)",
  pinnedGroundTruth: `=== PINNED VALHEIM 1.0.20 (DEEP NORTH) GROUND-TRUTH CONSTRAINTS ===
Do NOT suggest outdated 2021-2023 (0.217/0.218) Valheim signatures. Enforce these 6 verified Valheim 1.0.20 API rules:
1. Spatial Sector Partitioning: ZDOMan.FindSectorObjects uses 16-bit Vector2s (from assembly_utils.dll) + SimulationDistance enum, NOT Vector2i + int radius.
2. Status Effects: SEMan.AddStatusEffect requires a 5th parameter (short variant = 0): typeof(int), typeof(bool), typeof(int), typeof(float), typeof(short).
3. Ambiguous Method Overloads: PieceTable.SetCategory has TWO overloads in 1.0.20: SetCategory(int) and SetCategory(Piece.PieceCategory). Always pass explicit parameter types in [HarmonyPatch(nameof(PieceTable.SetCategory), typeof(int))] to avoid AmbiguousMatchException.
4. Chat Callback Naming: Inner callbacks like Chat.OnNewChatMessage compile as C# local functions (<OnNewChatMessage>g__OnCheckPermissionAsyncCompleted|0) rather than legacy <OnNewChatMessage>b__0 lambdas.
5. UI & Input Refactoring: InventoryGui.Show(Container, int activeGroup = 1) takes a second parameter; container hold checks use private static InventoryGui.UseButtonHeld().
6. Early SaveDataPath Error: Never call Utils.GetSaveDataPath() inside BaseUnityPlugin.Awake() without a try/catch fallback to Utils.persistantDataPath because PlatformManager.DistributionPlatform is null during early boot.
7. Clean Build Rule: Every Unity/BepInEx/Valheim <Reference> in .csproj MUST set <Private>false</Private> so UnityEngine.dll and 0Harmony.dll are never copied into BepInEx/plugins/.`,

  personas: {
    P1: {
      id: "P1",
      shortLabel: "🧱 Modded Other Games",
      title: "Modded Other Games (Minecraft, Skyrim, or RimWorld)",
      badge: "Knows how mods work · Wants the current 1.0.20 setup"
    },
    P2: {
      id: "P2",
      shortLabel: "💻 Software Developer",
      title: "Software Developer (Knows C# or Similar Languages)",
      badge: "Wants a clean CLI build, fast testing, and IDE debugging"
    },
    P3: {
      id: "P3",
      shortLabel: "🎯 Have a Specific Idea",
      title: "Goal-Driven Tinkerer ('I want to change one thing tonight')",
      badge: "Skip the theory · Show the fastest safe edit and live reload"
    },
    P4: {
      id: "P4",
      shortLabel: "🧭 Brand-New Explorer",
      title: "Curious Explorer (First Time Making a Game Mod)",
      badge: "Zero risk to saves · Guided 15-minute first win"
    },
    P5: {
      id: "P5",
      shortLabel: "🛡️ Returning Modder",
      title: "Returning Valheim Modder & Server Admin",
      badge: "Updating older mods for Valheim 1.0.20 & multiplayer servers"
    }
  },

  seriesTeaser: [
    {
      part: "Part 1",
      title: "Instant Mod Profile Switcher",
      desc: "Switch between Vanilla Valheim and a 50-mod profile in milliseconds without copying files."
    },
    {
      part: "Part 2",
      title: "Fast-Boot Testing & Intro Skip",
      desc: "Skip startup logos and menu delays so you can test code changes in under 8 seconds."
    },
    {
      part: "Part 3",
      title: "Automatic Game-Update Compatibility Scanner",
      desc: "Scan an entire folder of mod DLLs against a new Valheim patch in under 3 seconds."
    },
    {
      part: "Part 4",
      title: "Update-Proof Advanced Harmony Patches",
      desc: "Write advanced method patches that survive Valheim game updates without breaking."
    },
    {
      part: "Part 5",
      title: "One-Click Thunderstore Publishing & Server Testing",
      desc: "Automate mod packaging, version checks, and Dedicated Server testing."
    }
  ],

  inspectorFiles: {
    plugin: {
      label: "HelloValheimPlugin.cs",
      path: "starter-mod/HelloValheimPlugin.cs",
      lang: "csharp",
      content: `using System;
using System.IO;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Logging;
using HarmonyLib;
using UnityEngine;

namespace HelloValheim;

[BepInPlugin(PluginGuid, PluginName, PluginVersion)]
public sealed class HelloValheimPlugin : BaseUnityPlugin
{
    public const string PluginGuid = "com.valheim101.hellovalheim";
    public const string PluginName = "HelloValheim";
    public const string PluginVersion = "1.0.0";

    internal static ManualLogSource Log = null!;
    internal static ConfigEntry<bool> EnableMod = null!;
    internal static ConfigEntry<float> CarryWeightBonus = null!;

    private Harmony? _harmony;
    private FileSystemWatcher? _configWatcher;

    private void Awake()
    {
        Log = Logger;

        // Lesson 2 (Chamber 4.5): BepInEx Config.Bind with AcceptableValueRange slider
        EnableMod = Config.Bind(
            "1. General",
            "EnableMod",
            true,
            new ConfigDescription("Master switch for HelloValheim patches."));

        CarryWeightBonus = Config.Bind(
            "2. Gameplay",
            "CarryWeightBonus",
            150f,
            new ConfigDescription(
                "Extra carry weight added to Player.GetMaxCarryWeight (live hot-reloadable).",
                new AcceptableValueRange<float>(0f, 1000f)));

        CarryWeightBonus.SettingChanged += (_, _) =>
            Log.LogInfo($"[LiveConfig] CarryWeightBonus updated to +{CarryWeightBonus.Value} ({GetEffectiveMaxWeightPreview()} total)");

        SetupLiveConfigWatcher();

        // Lesson 3 & 4 (Chamber 3.5 & 4): Apply Harmony Patches
        _harmony = Harmony.CreateAndPatchAll(typeof(HelloValheimPlugin).Assembly, PluginGuid);

        Log.LogInfo($"========================================================");
        Log.LogInfo($"[{PluginName} {PluginVersion}] Ready on Valheim 1.0.20! BonusCarry=+{CarryWeightBonus.Value}");
        Log.LogInfo($"Type 'vikingping' or 'vikinginspect' in the F5 console.");
        Log.LogInfo($"========================================================");
    }

    private void SetupLiveConfigWatcher()
    {
        string? configDir = Path.GetDirectoryName(Config.ConfigFilePath);
        string configFile = Path.GetFileName(Config.ConfigFilePath);
        if (string.IsNullOrEmpty(configDir) || string.IsNullOrEmpty(configFile)) return;

        _configWatcher = new FileSystemWatcher(configDir, configFile)
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
            SynchronizingObject = ThreadingHelper.SynchronizingObject,
            EnableRaisingEvents = true
        };
        _configWatcher.Changed += (_, _) =>
        {
            try { Config.Reload(); }
            catch (Exception ex) { Log.LogWarning($"Config reload retry: {ex.Message}"); }
        };
    }

    private static float GetEffectiveMaxWeightPreview()
    {
        return Player.m_localPlayer != null ? Player.m_localPlayer.GetMaxCarryWeight() : 300f + CarryWeightBonus.Value;
    }

    private void OnDestroy()
    {
        _configWatcher?.Dispose();
        _harmony?.UnpatchSelf();
    }
}

// Lesson 1 (Chamber 3 & 3.5): F5 Console Commands (vikingping + vikinginspect)
[HarmonyPatch(typeof(Terminal), nameof(Terminal.InitTerminal))]
public static class TerminalCommandsPatch
{
    [HarmonyPostfix]
    private static void Postfix()
    {
        _ = new Terminal.ConsoleCommand(
            "vikingping",
            "[HelloValheim] Verify your mod is loaded and print carry weight status",
            args =>
            {
                float bonus = HelloValheimPlugin.CarryWeightBonus.Value;
                args.Context?.AddString($"<color=#00f0ff>[HelloValheim 1.0.0]</color> Pong! Active carry bonus: +{bonus} (Mod Enabled: {HelloValheimPlugin.EnableMod.Value})");
            });

        _ = new Terminal.ConsoleCommand(
            "vikinginspect",
            "[HelloValheim] Inspect local Player, ZDO ownership, and Dedicated Server state",
            args =>
            {
                Player? p = Player.m_localPlayer;
                bool isDedicated = ZNet.instance != null && ZNet.instance.IsDedicated();
                string playerState = p == null
                    ? "null (Main Menu / Unspawned)"
                    : $"Spawned (MaxCarry={p.GetMaxCarryWeight()}, IsOwner={p.m_nview?.IsOwner()})";
                args.Context?.AddString($"[vikinginspect] LocalPlayer={playerState} | IsDedicated={isDedicated}");
            });
    }
}

// Lesson 3 (Chamber 3.5 & 4): Postfix + Defensive Finalizer on Player.GetMaxCarryWeight
[HarmonyPatch(typeof(Player), nameof(Player.GetMaxCarryWeight))]
public static class PlayerCarryWeightPatch
{
    [HarmonyPostfix]
    private static void Postfix(Player __instance, ref float __result)
    {
        if (!HelloValheimPlugin.EnableMod.Value || __instance == null) return;
        __result += HelloValheimPlugin.CarryWeightBonus.Value;
    }

    [HarmonyFinalizer]
    private static Exception? Finalizer(Exception? __exception)
    {
        if (__exception != null)
        {
            HelloValheimPlugin.Log.LogError($"[FaultGuard] Trapped exception in GetMaxCarryWeight: {__exception}");
        }
        return null; // Swallow exception so the player loop never crashes
    }
}

// Lesson 4 (Chamber 4): Scoped State-Passing Pattern on Achievements.IsCheatedAtAll
[HarmonyPatch(typeof(Achievements), nameof(Achievements.IsCheatedAtAll))]
public static class AchievementsSafetyPatch
{
    [HarmonyPostfix]
    private static void Postfix(ref bool __result)
    {
        if (HelloValheimPlugin.EnableMod.Value)
        {
            __result = false; // Keep Steam achievements intact while learning
        }
    }
}

// Lesson 5 (Chamber 5): Dedicated Server Guard & ZRoutedRpc Registration
[HarmonyPatch(typeof(Game), nameof(Game.Start))]
public static class MultiplayerRpcPatch
{
    [HarmonyPostfix]
    private static void Postfix()
    {
        if (ZRoutedRpc.instance == null) return;

        ZRoutedRpc.instance.Register<string>("HelloValheim_Ping", (senderUid, message) =>
        {
            HelloValheimPlugin.Log.LogInfo($"[ZRoutedRpc] Received ping from peer {senderUid}: {message}");
        });

        // CRITICAL Headless Dedicated Server Guard:
        if (ZNet.instance != null && ZNet.instance.IsDedicated())
        {
            HelloValheimPlugin.Log.LogInfo("[DedicatedServer] Headless mode detected; skipping client HUD/Audio hooks.");
            return;
        }
    }
}`
    },
    csproj: {
      label: "HelloValheim.csproj",
      path: "starter-mod/HelloValheim.csproj",
      lang: "xml",
      content: `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net48</TargetFramework>
    <LangVersion>12.0</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>disable</ImplicitUsings>
    <AssemblyName>HelloValheim</AssemblyName>
    <RootNamespace>HelloValheim</RootNamespace>
    <Version>1.0.0</Version>
    <AppendTargetFrameworkToOutputPath>false</AppendTargetFrameworkToOutputPath>
  </PropertyGroup>

  <!-- Auto-detect Valheim 1.0.20 install path across Linux & Windows -->
  <PropertyGroup>
    <ValheimDir Condition="'$(ValheimDir)' == '' And Exists('$(HOME)/.local/share/Steam/steamapps/common/Valheim')">$(HOME)/.local/share/Steam/steamapps/common/Valheim</ValheimDir>
    <ValheimDir Condition="'$(ValheimDir)' == '' And Exists('C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim')">C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim</ValheimDir>
    <BepInExCoreDir Condition="'$(BepInExCoreDir)' == ''">$(ValheimDir)/BepInEx/core</BepInExCoreDir>
    <ManagedDir Condition="'$(ManagedDir)' == ''">$(ValheimDir)/valheim_Data/Managed</ManagedDir>
  </PropertyGroup>

  <!-- CRITICAL RULE: <Private>false</Private> prevents copying Unity/Harmony DLLs into plugins/ -->
  <ItemGroup>
    <Reference Include="BepInEx">
      <HintPath>$(BepInExCoreDir)/BepInEx.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="0Harmony">
      <HintPath>$(BepInExCoreDir)/0Harmony.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="assembly_valheim">
      <HintPath>$(ManagedDir)/assembly_valheim.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="assembly_utils">
      <HintPath>$(ManagedDir)/assembly_utils.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="UnityEngine">
      <HintPath>$(ManagedDir)/UnityEngine.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="UnityEngine.CoreModule">
      <HintPath>$(ManagedDir)/UnityEngine.CoreModule.dll</HintPath>
      <Private>false</Private>
    </Reference>
  </ItemGroup>
</Project>`
    },
    cfg: {
      label: "com.valheim101.hellovalheim.cfg",
      path: "BepInEx/config/com.valheim101.hellovalheim.cfg",
      lang: "ini",
      content: `## Settings file was created by plugin HelloValheim v1.0.0
## Plugin GUID: com.valheim101.hellovalheim

[1. General]

## Master switch for HelloValheim patches.
# Setting type: Boolean
# Default value: true
EnableMod = true

[2. Gameplay]

## Extra carry weight added to Player.GetMaxCarryWeight (live hot-reloadable).
# Setting type: Single
# Default value: 150
# Acceptable value range: From 0 to 1000
CarryWeightBonus = 150`
    },
    manifest: {
      label: "manifest.json + thunderstore.toml",
      path: "starter-mod/manifest.json",
      lang: "json",
      content: `// === starter-mod/manifest.json ===
{
  "name": "HelloValheim",
  "version_number": "1.0.0",
  "website_url": "https://github.com/djcdevelopment/valheim-modding-101",
  "description": "Valheim 1.0.20 (Deep North) starter mod with F5 console commands, live hot-reloadable carry weight config, and Dedicated Server guard.",
  "dependencies": [
    "denikson-BepInExPack_Valheim-5.4.2202"
  ]
}

// === starter-mod/thunderstore.toml ===
[config]
schemaVersion = "0.0.1"

[package]
namespace = "YourThunderstoreTeam"
name = "HelloValheim"
versionNumber = "1.0.0"
description = "Valheim 1.0.20 starter mod built with the Valheim Modding 101 Workbench."
websiteUrl = "https://github.com/djcdevelopment/valheim-modding-101"
containsNsfwContent = false

[package.dependencies]
denikson-BepInExPack_Valheim = "5.4.2202"

[build]
icon = "./icon.png"
readme = "../README.md"
outdir = "./build"

[[build.copy]]
source = "./bin/Release/HelloValheim.dll"
target = "plugins/HelloValheim/HelloValheim.dll"`
    }
  },

  chambers: [
    /* ======================================================================
       CHAMBER 0: How Valheim Mods Work (And Why Your Saves Are Safe)
       ====================================================================== */
    {
      id: "0",
      sprint: 1,
      sprintLabel: "Sprint 1 · 15-Min First Safe Win",
      numberLabel: "Chamber 0",
      shortTitle: "How Mods Work & Safety",
      title: "How Valheim Mods Work (And Why Your Saves Are Safe)",
      minutes: 2,
      timeBadge: "⏱️ 2 mins",
      liftBadge: "🟢 Easy",
      safeStop: null,
      undoBadge: "↩️ 100% Read-Only Step",
      yieldNote: "Read-only orientation — zero files are modified on your computer in this step.",
      summary: "Three quick facts before you start: (1) Valheim has no ban system for mods, and your save files live in a separate folder we never touch. (2) Most mods are tiny C# files that don't need the massive Unity Editor. (3) Every mod fits into one of three simple categories.",
      personaNotes: {
        P1: "If you have modded Minecraft or Skyrim: Doorstop starts the mod loader when Valheim launches, BepInEx loads your `.dll` plugins, and Harmony lets you run code before or after any game method.",
        P2: "Skip the 15 GB Unity Editor. A Valheim mod is a small `net48` C# class library compiled with `dotnet build` against `assembly_valheim.dll` and loaded at startup.",
        P3: "You only need 15 minutes tonight to boost your carry weight and add a custom in-game console command. Your worlds and characters stay 100% safe.",
        P4: "Not sure what to build yet? Check the Reference Table below—we start with Type 1 (Client-Only C#) where you can see your change in-game in 60 seconds.",
        P5: "Updating older mods for Valheim 1.0.20? BepInEx 5.4.2202 and Harmony are still the standard, and Chamber 4 covers the 6 Valheim 1.0.20 method changes."
      },
      steps: [
        "Hover any box in the **`Visual Map` on the right** to see how Doorstop, BepInEx, and Harmony load your mod in memory.",
        "Open the **`Reference Table`** to see which of the 3 mod categories fits your idea.",
        "Click **`Tailor Guide ▾` at the top** to pick your operating system (`🪟 Windows` or `🐧 Linux / SteamOS`) and background."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Mod Category</th>
              <th>What You Can Build</th>
              <th>Unity Editor Needed?</th>
              <th>Multiplayer Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Type 1: Client-Only &amp; Quality-of-Life</strong><br><code>80% of Starter Mods</code></td>
              <td>Carry weight, stamina tweaks, UI clocks, inventory sorting, hotkeys, camera zoom, achievement safety.</td>
              <td><strong>No</strong> — Pure C# (<code>dotnet build</code>, ~12 KB file).</td>
              <td>Works on your PC; optional on servers unless the server locks its mod list.</td>
            </tr>
            <tr>
              <td><strong>Type 2: Server-Synced Gameplay</strong><br><code>Items, Monsters &amp; Balance</code></td>
              <td>Custom crafting recipes, cloning and re-statting existing Valheim weapons or monsters, custom multiplayer events.</td>
              <td><strong>No</strong> — Pure C# cloning existing in-game items at startup.</td>
              <td>Install on both Client and Dedicated Server (covered in Chamber 5).</td>
            </tr>
            <tr>
              <td><strong>Type 3: Custom 3D Models &amp; Art</strong><br><code>AssetBundle Mods</code></td>
              <td>Brand-new 3D weapons or armor, custom animations, custom shaders, new sound effects.</td>
              <td><strong>Yes</strong> — Uses Unity Editor <code>2022.3.x</code> to export an <code>AssetBundle</code> loaded by your C# mod.</td>
              <td>Install on all players and the server so item IDs match.</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Chamber 0 Quick Check (PowerShell — Read-Only)
# See where your Valheim saves live (completely separate from the Steam game folder):
Get-ChildItem "$env:USERPROFILE\\AppData\\LocalLow\\IronGate\\Valheim" | Select-Object Name, LastWriteTime`,
        linux: `# Chamber 0 Quick Check (Bash — Read-Only)
# See where your Valheim saves live (completely separate from the Steam game folder):
ls -la "$HOME/.config/unity3d/IronGate/Valheim"`
      },
      expectedOutput: {
        win: `Name                LastWriteTime
----                -------------
characters_local    10/24/2026 7:15:00 PM
worlds_local        10/24/2026 7:15:00 PM
valheim.log         10/24/2026 7:14:22 PM
# Your characters and worlds live here — untouched by BepInEx or your mod builds.`,
        linux: `drwxr-xr-x characters_local
drwxr-xr-x worlds_local
-rw-r--r-- Player.log
# Your characters and worlds live here — untouched by BepInEx or your mod builds.`
      },
      codeTitle: "How a 15-Line C# Class Becomes a Valheim 1.0.20 Mod",
      codeSnippet: `[BepInPlugin("com.valheim101.hellovalheim", "HelloValheim", "1.0.0")]
public sealed class HelloValheimPlugin : BaseUnityPlugin
{
    private void Awake()
    {
        // Called automatically by BepInEx before Valheim's main menu loads:
        Logger.LogInfo("HelloValheim loaded on Valheim 1.0.20!");
        Harmony.CreateAndPatchAll(typeof(HelloValheimPlugin).Assembly, "com.valheim101.hellovalheim");
    }
}`,
      agentTask: "Read AGENTS.md and explain how starter-mod/HelloValheimPlugin.cs works and which of the 3 mod categories fits my idea.",
      onTrack: "You know which of the 3 categories fits your mod idea and can see that your Valheim saves live in a separate folder outside Steam.",
      cliffEdge: {
        symptom: "Don't download the 15 GB Unity Editor or use broken 2021 starter templates.",
        why: "Older guides tell beginners to install the full Unity game engine or clone outdated 2021 templates before writing a single line of code.",
        cause: "Older guides tell beginners to install the full Unity game engine or clone outdated 2021 templates before writing a single line of code.",
        fix: "Skip Unity for now. Use the `starter-mod/` folder included in this guide—it builds directly against your installed game in 2 seconds."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "See lines 11–52 of HelloValheimPlugin.cs: the [BepInPlugin] header and the Awake() startup method.",
      diagramTitle: "How Valheim Loads Mods in Memory (Hover Any Box)",
      diagramCaption: "Doorstop starts BepInEx at launch, and Harmony patches game methods in memory without altering your game files on disk.",
      svgDiagram: `<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Doorstop to BepInEx to Harmony pipeline">
        <defs>
          <linearGradient id="gBronze0" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#181C23"/>
            <stop offset="100%" stop-color="#212730"/>
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="668" height="238" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="28" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">HOW MODS LOAD AT STARTUP (HOVER ANY BOX FOR DETAILS)</text>

        <g class="map-node" tabindex="0" data-tooltip="1. Unity Doorstop: A tiny launcher file (winhttp.dll on Windows, start_game_bepinex.sh on Linux) that wakes up BepInEx the moment Valheim starts.">
          <rect x="20" y="42" width="144" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
          <text x="30" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">1. Unity Doorstop</text>
          <text x="30" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">Win: winhttp.dll</text>
          <text x="30" y="96" fill="#B6B0A6" font-family="monospace" font-size="11">Linux: doorstop.so</text>
        </g>

        <path d="M 164 78 L 182 78" stroke="#D4A359" stroke-width="2"/>
        <polygon points="176,74 182,78 176,82" fill="#D4A359"/>

        <g class="map-node" tabindex="0" data-tooltip="2. BepInEx Loader: Scans your BepInEx/plugins/ folder, loads every mod .dll file, and writes status messages to BepInEx/LogOutput.log.">
          <rect x="182" y="42" width="150" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
          <text x="192" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">2. BepInEx Loader</text>
          <text x="192" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">Loads plugins/*.dll</text>
          <text x="192" y="96" fill="#22C55E" font-family="monospace" font-size="11">Creates LogOutput</text>
        </g>

        <path d="M 332 78 L 350 78" stroke="#D4A359" stroke-width="2"/>
        <polygon points="344,74 350,78 344,82" fill="#D4A359"/>

        <g class="map-node" tabindex="0" data-tooltip="3. Harmony Patcher: Lets your C# code run right before (Prefix) or right after (Postfix) any Valheim method in memory—without touching game files on disk.">
          <rect x="350" y="42" width="148" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
          <text x="360" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">3. Harmony Patcher</text>
          <text x="360" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">Prefix / Postfix</text>
          <text x="360" y="96" fill="#B6B0A6" font-family="monospace" font-size="11">In-Memory Hooks</text>
        </g>

        <path d="M 498 78 L 516 78" stroke="#22C55E" stroke-width="2"/>
        <polygon points="510,74 516,78 510,82" fill="#22C55E"/>

        <g class="map-node" tabindex="0" data-tooltip="4. Valheim 1.0.20: The game runs normally with your patches active. Your worlds and characters live in a separate save folder that we never touch.">
          <rect x="516" y="42" width="144" height="72" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
          <text x="526" y="63" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">4. Valheim 1.0.20</text>
          <text x="526" y="81" fill="#F3EFEA" font-family="monospace" font-size="11">Game Runs Cleanly</text>
          <text x="526" y="96" fill="#B6B0A6" font-family="monospace" font-size="11">Saves Untouched</text>
        </g>

        <text x="20" y="142" fill="#B6B0A6" font-family="monospace" font-size="11" font-weight="bold">THREE CATEGORIES OF VALHEIM MODS (HOVER TO COMPARE)</text>

        <g class="map-node" tabindex="0" data-tooltip="Type 1 (Client-Only C#): 80% of mods! Tweak carry weight, stamina, UI, camera, and hotkeys using a tiny 12 KB C# file. No Unity Editor needed.">
          <rect x="20" y="152" width="204" height="76" rx="7" fill="#181C23" stroke="#22C55E"/>
          <text x="30" y="171" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">Type 1: Client-Only C#</text>
          <text x="30" y="188" fill="#F3EFEA" font-family="sans-serif" font-size="11">Carry Weight, UI, Hotkeys</text>
          <text x="30" y="205" fill="#B6B0A6" font-family="monospace" font-size="11">No Unity Needed · ~12 KB</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Type 2 (Server-Synced C#): Clone and customize existing weapons, recipes, or monsters in C#. Install on both Client and Server; no Unity Editor needed.">
          <rect x="236" y="152" width="208" height="76" rx="7" fill="#181C23" stroke="#D4A359"/>
          <text x="246" y="171" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">Type 2: Server-Synced C#</text>
          <text x="246" y="188" fill="#F3EFEA" font-family="sans-serif" font-size="11">Items, Monsters &amp; Rules</text>
          <text x="246" y="205" fill="#B6B0A6" font-family="monospace" font-size="11">No Unity · Client + Server</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Type 3 (Custom 3D Assets): Only needed when importing brand-new 3D models, animations, or custom audio packed in Unity 2022.3.">
          <rect x="456" y="152" width="204" height="76" rx="7" fill="#181C23" stroke="#F59E0B"/>
          <text x="466" y="171" fill="#F59E0B" font-family="sans-serif" font-size="12" font-weight="bold">Type 3: Custom 3D Assets</text>
          <text x="466" y="188" fill="#F3EFEA" font-family="sans-serif" font-size="11">New 3D Armor, Audio &amp; Art</text>
          <text x="466" y="205" fill="#B6B0A6" font-family="monospace" font-size="11">Needs Unity 2022.3 Editor</text>
        </g>
      </svg>`,
      aiContext: "The user is in Chamber 0 learning how Doorstop -> BepInEx 5.4.2202 -> Harmony works in Valheim 1.0.20 and choosing between Type 1 (Client-Only C#), Type 2 (Server-Synced C#), and Type 3 (Custom 3D Assets)."
    },

    /* ======================================================================
       CHAMBER 1: The 30-Second Setup Check
       ====================================================================== */
    {
      id: "1",
      sprint: 1,
      sprintLabel: "Sprint 1 · 15-Min First Safe Win",
      numberLabel: "Chamber 1",
      shortTitle: "30s Setup Check",
      title: "The 30-Second Setup Check (doctor.ps1 / doctor.sh)",
      minutes: 3,
      timeBadge: "⏱️ 3 mins",
      liftBadge: "🟢 Easy",
      safeStop: null,
      undoBadge: "↩️ Read-Only Check",
      yieldNote: "Keep your Steam app open in the background before launching Valheim or running setup checks.",
      summary: "Most 'my mod compiled, why didn't it load?' issues happen because a loader file is in the wrong folder or a launch option is missing. Run our read-only `doctor` script to check your `.NET SDK`, Valheim folder, game DLLs, and BepInEx setup in 5 seconds.",
      personaNotes: {
        P1: "Instead of guessing which folder Steam, r2modman, or Gale is using, `doctor` prints your exact active paths right in the terminal.",
        P2: "Think of `tools/doctor` like `brew doctor` or `flutter doctor`: it checks `.NET SDK`, `assembly_valheim.dll`, `BepInEx 5.4.2202`, and launcher permissions.",
        P3: "Run the one command below. As soon as all 4 lines say `[PASS]`, move right on to Chamber 2.",
        P4: "If any check prints `[WARN]`, don't sweat it—the script prints the exact copy-paste fix right in your terminal.",
        P5: "Playing on Linux or Steam Deck? Check the Reference Table for the `chmod +x start_game_bepinex.sh` permission fix and why Proton should stay unchecked for native Linux."
      },
      steps: [
        "Make sure **Steam is open in the background** (Valheim closes immediately on startup if Steam isn't running).",
        "Run the read-only `doctor` command for your operating system below, and check the **`Visual Map` on the right** to see where BepInEx files live.",
        "Confirm `[PASS]` on **`.NET SDK`**, **`Valheim Directory`**, **`Game Assemblies`**, and **`BepInEx + Doorstop`**."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Launcher Hook Files</th>
              <th>Steam Launch Option</th>
              <th>Most Common Setup Mistake</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>🪟 Windows</strong></td>
              <td><code>winhttp.dll</code> + <code>doorstop_config.ini</code> in Valheim folder</td>
              <td><code>-console</code></td>
              <td>Unzipping <code>BepInExPack_Valheim</code> into an extra subfolder instead of placing <code>winhttp.dll</code> right next to <code>valheim.exe</code>.</td>
            </tr>
            <tr>
              <td><strong>🐧 Linux / SteamOS (Native)</strong></td>
              <td><code>start_game_bepinex.sh</code> + <code>doorstop_libs/libdoorstop_x64.so</code></td>
              <td><code>./start_game_bepinex.sh %command% -console</code></td>
              <td>Launching without <code>./start_game_bepinex.sh %command%</code> in Steam Launch Options, or forgetting <code>chmod +x start_game_bepinex.sh</code>.</td>
            </tr>
            <tr>
              <td><strong>🐧 Linux (Proton / Wine)</strong></td>
              <td><code>winhttp.dll</code> + <code>doorstop_config.ini</code></td>
              <td><code>WINEDLLOVERRIDES="winhttp=n,b" %command% -console</code></td>
              <td>Turning on Proton compatibility while still using the Linux <code>start_game_bepinex.sh</code> script (use one mode or the other, not both).</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Run from the repository folder in PowerShell:
powershell -ExecutionPolicy Bypass -File .\\tools\\doctor.ps1`,
        linux: `# Run from the repository folder in Bash:
bash ./tools/doctor.sh`
      },
      expectedOutput: {
        win: `=== Valheim 1.0.20 Modding Doctor (Windows PowerShell) ===
[PASS] .NET SDK          : 10.0.401 (C:\\Program Files\\dotnet\\dotnet.exe)
[PASS] Valheim Directory : C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim
[PASS] Game Assemblies   : assembly_valheim.dll + assembly_utils.dll found
[PASS] BepInEx + Doorstop: BepInEx 5.4.2202 & winhttp.dll ready
=== RESULT: READY FOR CHAMBER 2 ===`,
        linux: `=== Valheim 1.0.20 Modding Doctor (Linux / SteamOS) ===
[PASS] .NET SDK          : 10.0.401 (/home/derek/.local/share/discengine-dotnet/dotnet)
[PASS] Valheim Directory : /home/derek/.local/share/Steam/steamapps/common/Valheim
[PASS] Game Assemblies   : assembly_valheim.dll + assembly_utils.dll found
[PASS] BepInEx + Doorstop: BepInEx 5.4.2202, start_game_bepinex.sh (+x), libdoorstop_x64.so ready
=== RESULT: READY FOR CHAMBER 2 ===`
      },
      codeTitle: "Linux Quick Fix: Making the BepInEx Startup Script Executable",
      codeSnippet: `# If Valheim on Linux launches without loading BepInEx, mark the loader script executable:
chmod +x "$HOME/.local/share/Steam/steamapps/common/Valheim/start_game_bepinex.sh"
chmod +x "$HOME/.local/share/Steam/steamapps/common/Valheim/doorstop_libs"/*.so
# And in Steam -> Right-click Valheim -> Properties -> Launch Options:
./start_game_bepinex.sh %command% -console`,
      agentTask: "Run tools/doctor.sh (or tools/doctor.ps1 on Windows), check the output, and fix any missing setup items before building.",
      onTrack: "The doctor script prints `[PASS]` on all four checks (`.NET SDK`, `Valheim Directory`, `Game Assemblies`, and `BepInEx + Doorstop`).",
      cliffEdge: {
        symptom: "Valheim launches to the main menu, but BepInEx never loads your mod.",
        why: "On Windows, `winhttp.dll` isn't in the same folder as `valheim.exe`. On Linux, Steam didn't run `./start_game_bepinex.sh %command%` or the script isn't marked executable.",
        cause: "On Windows, `winhttp.dll` isn't in the same folder as `valheim.exe`. On Linux, Steam didn't run `./start_game_bepinex.sh %command%` or the script isn't marked executable.",
        fix: "Windows: Put `winhttp.dll`, `doorstop_config.ini`, and `BepInEx/` directly inside `Valheim/`. Linux: Run `chmod +x start_game_bepinex.sh` and set Steam Launch Options to `./start_game_bepinex.sh %command% -console`."
      },
      defaultInspectorTab: "csproj",
      inspectorHighlightNote: "See lines 14–19 of HelloValheim.csproj: automatic Valheim install folder detection on Windows and Linux.",
      diagramTitle: "Where BepInEx Files Live on Windows & Linux (Hover Any Box)",
      diagramCaption: "Windows uses winhttp.dll next to valheim.exe; Linux uses start_game_bepinex.sh in Steam Launch Options.",
      svgDiagram: `<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Windows vs Linux BepInEx File Tree">
        <rect x="6" y="6" width="668" height="238" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="26" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">MOD LOADER FILE LAYOUT (HOVER ANY BOX FOR DETAILS)</text>

        <g class="map-node" tabindex="0" data-tooltip="Windows Folder Layout: Place winhttp.dll, doorstop_config.ini, and the BepInEx/ folder directly next to valheim.exe.">
          <rect x="18" y="36" width="314" height="196" rx="8" fill="#181C23" stroke="#D4A359"/>
          <text x="30" y="57" fill="#D4A359" font-family="sans-serif" font-size="13" font-weight="bold">🪟 Windows Valheim Folder</text>
          <text x="30" y="77" fill="#F3EFEA" font-family="monospace" font-size="11">📁 steamapps/common/Valheim/</text>
          <text x="42" y="96" fill="#F3EFEA" font-family="monospace" font-size="11">├─ 🎮 valheim.exe</text>
          <text x="42" y="114" fill="#22C55E" font-family="monospace" font-size="11">├─ 🔑 winhttp.dll (Loader Hook)</text>
          <text x="42" y="132" fill="#22C55E" font-family="monospace" font-size="11">├─ ⚙️ doorstop_config.ini</text>
          <text x="42" y="150" fill="#D4A359" font-family="monospace" font-size="11">├─ 📁 BepInEx/</text>
          <text x="58" y="168" fill="#B6B0A6" font-family="monospace" font-size="11">│  ├─ core/ (BepInEx &amp; Harmony)</text>
          <text x="58" y="185" fill="#22C55E" font-family="monospace" font-size="11">│  ├─ plugins/HelloValheim.dll</text>
          <text x="58" y="202" fill="#F59E0B" font-family="monospace" font-size="11">│  └─ LogOutput.log</text>
          <text x="42" y="220" fill="#B6B0A6" font-family="monospace" font-size="11">└─ 📁 valheim_Data/Managed/</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Linux &amp; SteamOS Folder Layout: Uses start_game_bepinex.sh and doorstop_libs/ to load BepInEx before starting valheim.x86_64.">
          <rect x="348" y="36" width="314" height="118" rx="8" fill="#181C23" stroke="#D4A359"/>
          <text x="360" y="57" fill="#D4A359" font-family="sans-serif" font-size="13" font-weight="bold">🐧 Linux / SteamOS Valheim Folder</text>
          <text x="360" y="76" fill="#F3EFEA" font-family="monospace" font-size="11">📁 steamapps/common/Valheim/</text>
          <text x="372" y="94" fill="#F3EFEA" font-family="monospace" font-size="11">├─ 🎮 valheim.x86_64</text>
          <text x="372" y="111" fill="#22C55E" font-family="monospace" font-size="11">├─ 🚀 start_game_bepinex.sh (+x)</text>
          <text x="372" y="128" fill="#22C55E" font-family="monospace" font-size="11">├─ 📁 doorstop_libs/libdoorstop.so</text>
          <text x="372" y="145" fill="#D4A359" font-family="monospace" font-size="11">└─ 📁 BepInEx/plugins/HelloValheim.dll</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Linux Launch Rule: Add ./start_game_bepinex.sh %command% -console to Steam Launch Options and leave Force Steam Play (Proton) unchecked.">
          <rect x="348" y="162" width="314" height="70" rx="8" fill="#212730" stroke="#EF4444"/>
          <text x="360" y="182" fill="#EF4444" font-family="sans-serif" font-size="11" font-weight="bold">⚠️ Linux Steam Launch Options Rule:</text>
          <text x="360" y="200" fill="#F3EFEA" font-family="monospace" font-size="11">./start_game_bepinex.sh %command%</text>
          <text x="360" y="218" fill="#EF4444" font-family="monospace" font-size="11">Keep "Force Proton" UNCHECKED!</text>
        </g>
      </svg>`,
      aiContext: "The user is in Chamber 1 running tools/doctor.ps1 or tools/doctor.sh to verify .NET SDK, Valheim install directory, assembly_valheim.dll, and Doorstop/BepInEx files."
    },

    /* ======================================================================
       CHAMBER 2: Build & Install Your First Mod in 60 Seconds
       ====================================================================== */
    {
      id: "2",
      sprint: 1,
      sprintLabel: "Sprint 1 · 15-Min First Safe Win",
      numberLabel: "Chamber 2",
      shortTitle: "Build in 60 Seconds",
      title: "Build & Install Your First Mod in 60 Seconds (HelloValheim.dll)",
      minutes: 4,
      timeBadge: "⏱️ 4 mins",
      liftBadge: "🟢 Easy",
      safeStop: "✓ Safe Checkpoint #1 (Built & Installed Cleanly)",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "Every game <Reference> in HelloValheim.csproj sets <Private>false</Private> so extra game DLLs are never copied into BepInEx/plugins/.",
      summary: "Now we compile `starter-mod/HelloValheim.csproj` against your installed Valheim 1.0.20 game files. Our build script checks that `<Private>false</Private>` kept your output folder clean and copies a single ~12 KB `HelloValheim.dll` file into `BepInEx/plugins/HelloValheim/`.",
      personaNotes: {
        P1: "`HelloValheim.csproj` links directly to your installed `assembly_valheim.dll`—so you never have to hunt for outdated third-party packages.",
        P2: "This is a standard `net48` SDK project using C# 12. Setting `<Private>false</Private>` on each `<Reference>` works just like `compileOnly` in Gradle.",
        P3: "Run the single `build-and-deploy` command below—it compiles your code AND copies the `.dll` into Valheim's plugins folder in one step.",
        P4: "First milestone! When you see `0 Warning(s), 0 Error(s)` and `HelloValheim.dll (~12 KB)`, you have officially built and installed a Valheim mod.",
        P5: "Notice we reference `assembly_utils.dll` right next to `assembly_valheim.dll` because Valheim 1.0 moved `Vector2s` and several helpers into `assembly_utils`."
      },
      steps: [
        "Run the `build-and-deploy` command below for your OS (or run `dotnet build starter-mod/HelloValheim.csproj -c Release`).",
        "Check the **`Visual Map` on the right** and confirm the terminal prints **`0 Warning(s)`**, **`0 Error(s)`**, and outputs **only `HelloValheim.dll` (~12 KB)**.",
        "Need a break after this step? You've reached **✓ Safe Checkpoint #1**—your mod is built and safely installed."
      ],
      tableHtml: "",
      commands: {
        win: `# Compile HelloValheim.dll and copy it to BepInEx/plugins/HelloValheim/:
powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1

# (Optional) Confirm only 1 DLL exists in the build folder:
Get-ChildItem .\\starter-mod\\bin\\Release\\*.dll | Select-Object Name, Length`,
        linux: `# Compile HelloValheim.dll and copy it to BepInEx/plugins/HelloValheim/:
bash ./tools/build-and-deploy.sh

# (Optional) Confirm only 1 DLL exists in the build folder:
ls -lh ./starter-mod/bin/Release/*.dll`
      },
      expectedOutput: {
        win: `Build succeeded.
    0 Warning(s)
    0 Error(s)
[PASS] Clean Build Gate: Only HelloValheim.dll (11,776 bytes) in bin/Release/
[PASS] Deployed to: C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\BepInEx\\plugins\\HelloValheim\\HelloValheim.dll`,
        linux: `Build succeeded.
    0 Warning(s)
    0 Error(s)
[PASS] Clean Build Gate: Only HelloValheim.dll (12K) in bin/Release/
[PASS] Deployed to: /home/derek/.local/share/Steam/steamapps/common/Valheim/BepInEx/plugins/HelloValheim/HelloValheim.dll`
      },
      codeTitle: "Keeping Your Build Clean with <Private>false</Private>",
      codeSnippet: `<ItemGroup>
  <Reference Include="assembly_valheim">
    <HintPath>$(ManagedDir)/assembly_valheim.dll</HintPath>
    <!-- Always keep <Private>false</Private> so MSBuild never copies game DLLs into plugins/ -->
    <Private>false</Private>
  </Reference>
  <Reference Include="assembly_utils">
    <HintPath>$(ManagedDir)/assembly_utils.dll</HintPath>
    <Private>false</Private>
  </Reference>
</ItemGroup>`,
      agentTask: "Build starter-mod/HelloValheim.csproj in Release mode, confirm 0 warnings/errors, and verify only HelloValheim.dll is in bin/Release/.",
      onTrack: "`bin/Release/` contains only one `.dll` file (`HelloValheim.dll`, ~12 KB), and `build-and-deploy` prints `[PASS]`.",
      cliffEdge: {
        symptom: "Extra Unity and Harmony DLL files get copied into your plugins folder.",
        why: "Leaving out `<Private>false</Private>` on a `<Reference>` in `.csproj` tells the compiler to copy Valheim's own engine DLLs into `BepInEx/plugins/`, where BepInEx tries to load them twice.",
        cause: "Leaving out `<Private>false</Private>` on a `<Reference>` in `.csproj` tells the compiler to copy Valheim's own engine DLLs into `BepInEx/plugins/`, where BepInEx tries to load them twice.",
        fix: "Make sure every `<Reference>` in `HelloValheim.csproj` includes `<Private>false</Private>`, then run `dotnet clean && dotnet build -c Release`."
      },
      defaultInspectorTab: "csproj",
      inspectorHighlightNote: "See lines 22–47 of HelloValheim.csproj: every <Reference> includes <Private>false</Private>.",
      diagramTitle: "Clean 1-File Build vs. Duplicate DLL Crash (Hover Any Box)",
      diagramCaption: "Why <Private>false</Private> keeps your plugins folder clean with just one 12 KB mod file.",
      svgDiagram: `<svg viewBox="0 0 680 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Private false clean build gate">
        <rect x="6" y="6" width="668" height="228" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="26" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">CLEAN BUILD COMPARISON (HOVER ANY BOX FOR DETAILS)</text>

        <g class="map-node" tabindex="0" data-tooltip="Clean Build (With <Private>false</Private>): Only your 12 KB HelloValheim.dll is created. BepInEx loads it cleanly in milliseconds.">
          <rect x="20" y="36" width="308" height="184" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
          <text x="34" y="58" fill="#22C55E" font-family="sans-serif" font-size="13" font-weight="bold">✓ WITH &lt;Private&gt;false&lt;/Private&gt;</text>
          <text x="34" y="78" fill="#F3EFEA" font-family="monospace" font-size="11">bin/Release/ (Clean Output)</text>
          <rect x="34" y="88" width="280" height="36" rx="6" fill="#212730" stroke="#22C55E"/>
          <text x="46" y="110" fill="#F3EFEA" font-family="monospace" font-size="12" font-weight="bold">📄 HelloValheim.dll (12 KB)</text>
          <text x="34" y="146" fill="#B6B0A6" font-family="sans-serif" font-size="11">• Zero duplicate engine files</text>
          <text x="34" y="166" fill="#B6B0A6" font-family="sans-serif" font-size="11">• Loads cleanly in BepInEx/plugins/</text>
          <text x="34" y="186" fill="#B6B0A6" font-family="sans-serif" font-size="11">• Ready to share on Thunderstore</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Broken Build (Without <Private>false</Private>): MSBuild copies 15+ game DLLs into your mod folder. BepInEx tries to load Unity and Harmony twice and crashes.">
          <rect x="352" y="36" width="308" height="184" rx="8" fill="#181C23" stroke="#EF4444" stroke-width="1.5"/>
          <text x="366" y="58" fill="#EF4444" font-family="sans-serif" font-size="13" font-weight="bold">✕ WITHOUT &lt;Private&gt;false&lt;/Private&gt;</text>
          <text x="366" y="78" fill="#EF4444" font-family="monospace" font-size="11">bin/Release/ (15+ Extra Files!)</text>
          <text x="374" y="98" fill="#F3EFEA" font-family="monospace" font-size="11">├─ HelloValheim.dll</text>
          <text x="374" y="115" fill="#EF4444" font-family="monospace" font-size="11">├─ UnityEngine.dll       (EXTRA COPY)</text>
          <text x="374" y="132" fill="#EF4444" font-family="monospace" font-size="11">├─ 0Harmony.dll          (EXTRA COPY)</text>
          <text x="374" y="149" fill="#EF4444" font-family="monospace" font-size="11">└─ assembly_valheim.dll  (6.5 MB!)</text>
          <text x="366" y="176" fill="#B6B0A6" font-family="sans-serif" font-size="11">Result: BepInEx loads two copies of</text>
          <text x="366" y="194" fill="#B6B0A6" font-family="sans-serif" font-size="11">Harmony &amp; Unity and crashes on startup!</text>
        </g>
      </svg>`,
      aiContext: "The user is in Chamber 2 compiling starter-mod/HelloValheim.csproj with dotnet build and deploying HelloValheim.dll via build-and-deploy."
    },

    /* ======================================================================
       CHAMBER 3: See Your Mod Running In-Game (15-Min Sprint Complete!)
       ====================================================================== */
    {
      id: "3",
      sprint: 1,
      sprintLabel: "Sprint 1 · 15-Min First Safe Win",
      numberLabel: "Chamber 3",
      shortTitle: "See Your Mod In-Game",
      title: "See Your Mod Running In-Game (LogOutput.log & F5 Console)",
      minutes: 5,
      timeBadge: "⏱️ 5 mins",
      liftBadge: "🟢 Easy",
      safeStop: "✓ Safe Checkpoint #2 (15-Min First Win Complete!)",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "On Linux/SteamOS, make sure your Steam Launch Options include ./start_game_bepinex.sh %command% -console so Steam runs BepInEx.",
      summary: "Time for the payoff! We confirm your mod is live in two quick ways: first by checking `BepInEx/LogOutput.log` in the terminal for `[HelloValheim 1.0.0]`, and second by pressing `F5` at Valheim's main menu and typing your custom `vikingping` command.",
      personaNotes: {
        P1: "`BepInEx/LogOutput.log` is your main log file—just like `latest.log` in Minecraft. Check it first whenever you test a change.",
        P2: "You can confirm your mod loaded in 2 seconds from the terminal (`Select-String` / `grep`) before even loading into a world.",
        P3: "Launch Valheim, press `F5` at the main menu, type `vikingping`, and see your `[HelloValheim 1.0.0] Pong! Active carry bonus: +150` reply!",
        P4: "Congratulations! Once `vikingping` replies in the `F5` console, you have completed your first working Valheim mod.",
        P5: "Our `Terminal.InitTerminal` patch registers both `vikingping` and `vikinginspect` so your test commands work right at the main menu."
      },
      steps: [
        "Launch Valheim through Steam (with `-console` enabled in Launch Options).",
        "At the main menu, press **`F5`** to open the console, type **`vikingping`**, and compare with the **`Visual Map` on the right**.",
        "Run the terminal command below to see your startup message inside `BepInEx/LogOutput.log`.",
        "🎉 **15-Minute First Win Complete!** You can stop right here with a working mod, or continue to Sprint 2 to learn crash reading, Harmony patches, and live config reloads."
      ],
      tableHtml: "",
      commands: {
        win: `# Check BepInEx/LogOutput.log for your mod's startup message (PowerShell):
Select-String -Path "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\BepInEx\\LogOutput.log" -Pattern "HelloValheim|BepInEx 5.4"`,
        linux: `# Check BepInEx/LogOutput.log for your mod's startup message (Bash):
grep -E "HelloValheim|BepInEx 5.4" "$HOME/.local/share/Steam/steamapps/common/Valheim/BepInEx/LogOutput.log"`
      },
      expectedOutput: {
        win: `[Message:   BepInEx] BepInEx 5.4.2202 - valheim
[Info   :   BepInEx] Loading [HelloValheim 1.0.0]
[Info   :HelloValheim] ========================================================
[Info   :HelloValheim] [HelloValheim 1.0.0] Ready on Valheim 1.0.20! BonusCarry=+150
[Info   :HelloValheim] Type 'vikingping' or 'vikinginspect' in the F5 console.
[Info   :HelloValheim] ========================================================`,
        linux: `[Message:   BepInEx] BepInEx 5.4.2202 - valheim
[Info   :   BepInEx] Loading [HelloValheim 1.0.0]
[Info   :HelloValheim] ========================================================
[Info   :HelloValheim] [HelloValheim 1.0.0] Ready on Valheim 1.0.20! BonusCarry=+150
[Info   :HelloValheim] Type 'vikingping' or 'vikinginspect' in the F5 console.
[Info   :HelloValheim] ========================================================`
      },
      codeTitle: "Adding a Custom F5 Console Command (Terminal.InitTerminal)",
      codeSnippet: `[HarmonyPatch(typeof(Terminal), nameof(Terminal.InitTerminal))]
public static class TerminalCommandsPatch
{
    [HarmonyPostfix]
    private static void Postfix()
    {
        _ = new Terminal.ConsoleCommand(
            "vikingping",
            "[HelloValheim] Verify your mod is loaded and print carry weight status",
            args => args.Context?.AddString(
                $"<color=#00f0ff>[HelloValheim 1.0.0]</color> Pong! Active carry bonus: +{HelloValheimPlugin.CarryWeightBonus.Value}"));
    }
}`,
      agentTask: "Check that BepInEx/LogOutput.log shows '[HelloValheim 1.0.0] Ready on Valheim 1.0.20!' and explain how the F5 console command is registered.",
      onTrack: "`LogOutput.log` shows `Loading [HelloValheim 1.0.0]` and typing `vikingping` in the `F5` console prints `[HelloValheim 1.0.0] Pong! Active carry bonus: +150`.",
      cliffEdge: {
        symptom: "Pressing F5 at the main menu does not open the console window.",
        why: "Valheim hides the `F5` developer console unless `-console` is added to Steam's Launch Options.",
        cause: "Valheim hides the `F5` developer console unless `-console` is added to Steam's Launch Options.",
        fix: "In Steam -> Right-click Valheim -> Properties -> General -> Launch Options, add `-console` (Windows: `-console`; Linux: `./start_game_bepinex.sh %command% -console`)."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "See lines 79–106 of HelloValheimPlugin.cs: Terminal.InitTerminal Postfix registering 'vikingping' and 'vikinginspect'.",
      diagramTitle: "In-Game F5 Console & LogOutput.log Verification (Hover Any Box)",
      diagramCaption: "What you see in the F5 console at the main menu and inside BepInEx/LogOutput.log when your mod loads.",
      svgDiagram: `<svg viewBox="0 0 680 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="In-game F5 console and LogOutput verification">
        <rect x="6" y="6" width="668" height="228" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="25" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">TWO WAYS TO VERIFY YOUR MOD (HOVER ANY BOX FOR DETAILS)</text>

        <g class="map-node" tabindex="0" data-tooltip="In-Game F5 Console: Press F5 at the main menu and type vikingping. Your C# command prints your active carry weight bonus right on screen.">
          <rect x="20" y="34" width="640" height="88" rx="8" fill="#181C23" stroke="#D4A359" stroke-width="1.5"/>
          <text x="34" y="53" fill="#D4A359" font-family="monospace" font-size="12" font-weight="bold">1. In-Game F5 Console Window (Main Menu)</text>
          <rect x="34" y="61" width="612" height="48" rx="5" fill="#111418" stroke="#2B323D"/>
          <text x="44" y="79" fill="#B6B0A6" font-family="monospace" font-size="11">&gt; vikingping</text>
          <text x="44" y="98" fill="#22C55E" font-family="monospace" font-size="12" font-weight="bold">[HelloValheim 1.0.0] Pong! Active carry bonus: +150 (Mod Enabled: True)</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="BepInEx/LogOutput.log: Every print statement and error from BepInEx and your mod is saved here in real time.">
          <rect x="20" y="132" width="640" height="90" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
          <text x="34" y="152" fill="#22C55E" font-family="monospace" font-size="12" font-weight="bold">2. BepInEx/LogOutput.log (Live Log File on Disk)</text>
          <text x="34" y="172" fill="#B6B0A6" font-family="monospace" font-size="11">[Message:   BepInEx] BepInEx 5.4.2202 - valheim</text>
          <text x="34" y="190" fill="#F3EFEA" font-family="monospace" font-size="11">[Info   :   BepInEx] Loading [HelloValheim 1.0.0]</text>
          <text x="34" y="208" fill="#22C55E" font-family="monospace" font-size="11">[Info   :HelloValheim] [HelloValheim 1.0.0] Ready on Valheim 1.0.20! BonusCarry=+150</text>
        </g>
      </svg>`,
      aiContext: "The user is in Chamber 3 verifying HelloValheim in-game via the F5 console command 'vikingping' and checking BepInEx/LogOutput.log."
    },

    /* ======================================================================
       CHAMBER 3.5: Reading Crash Logs & Preventing Null Errors
       ====================================================================== */
    {
      id: "3.5",
      sprint: 2,
      sprintLabel: "Sprint 2 · Real Mod Engineering",
      numberLabel: "Chamber 3.5",
      shortTitle: "Crash Logs & Debugging",
      title: "Reading Crash Logs, Null Guards & Breakpoint Debugging",
      minutes: 7,
      timeBadge: "⏱️ 7 mins",
      liftBadge: "🟡 Intermediate",
      safeStop: null,
      undoBadge: "↩️ Undo: debug_enabled = false",
      yieldNote: "Player.m_localPlayer is null at the Main Menu before you enter a world—always start player patches with if (Player.m_localPlayer == null) return;.",
      summary: "Learn how to read a Valheim error log in 10 seconds. When Harmony patches a game method like `Player.GetMaxCarryWeight`, crash logs label that patched method as `DMD<Player::GetMaxCarryWeight>` and list the exact mod that failed right above it. You'll also see how `[HarmonyFinalizer]` prevents crashes and how to connect a code debugger.",
      personaNotes: {
        P1: "Have 40 mods installed and want to know *which* mod caused an error? Find `DMD<Class::Method>` in `LogOutput.log`—the line right above it names the broken mod!",
        P2: "Doorstop includes a built-in debugger server (`debug_enabled = true`, `127.0.0.1:10000`) so you can set live breakpoints in Rider, Visual Studio, or VS Code.",
        P3: "Even if you never use a debugger, adding `if (Player.m_localPlayer == null) return;` at the top of player patches prevents 95% of beginner errors.",
        P4: "Try running `vikinginspect` in the `F5` console at the main menu and again inside a world—watch `LocalPlayer` change from `null` to `Spawned`!",
        P5: "When updating older mods for 1.0.20, startup errors like `AmbiguousMatchException` appear when `Harmony.CreateAndPatchAll` runs, while `DMD<>` lines show in-game errors."
      },
      steps: [
        "Hover the boxes in the **`Visual Map` on the right** and open the **`Reference Table`** to see how to spot a broken mod in `LogOutput.log`.",
        "Run **`vikinginspect`** in the `F5` console at the main menu (where `Player.m_localPlayer` is `null`) and again after entering a world.",
        "Check `[HarmonyFinalizer]` in `PlayerCarryWeightPatch` to see how it catches unexpected errors so the game never freezes.",
        "*(Optional)* Set `debug_enabled = true` in `doorstop_config.ini` to attach VS Code, Visual Studio, or Rider on `127.0.0.1:10000`."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Line in LogOutput.log</th>
              <th>What It Means in Plain English</th>
              <th>How to Fix It</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>(wrapper dynamic-method) Player.DMD&lt;Player::GetMaxCarryWeight&gt;</code></td>
              <td><strong>Patched Game Method:</strong> <code>DMD&lt;...&gt;</code> means Harmony patched <code>Player.GetMaxCarryWeight</code>.</td>
              <td>Look at the line directly above <code>DMD&lt;&gt;</code> to see which mod crashed.</td>
            </tr>
            <tr>
              <td><code>at HelloValheim.PlayerCarryWeightPatch.Postfix(...)</code></td>
              <td>Your mod's Postfix method crashed (usually because the player hasn't spawned into a world yet).</td>
              <td>Add <code>if (__instance == null || Player.m_localPlayer == null) return;</code> on the first line.</td>
            </tr>
            <tr>
              <td><code>HarmonyLib.HarmonyException: Ambiguous match for patch method</code></td>
              <td>Valheim 1.0.20 has two methods with the same name (such as <code>PieceTable.SetCategory</code>).</td>
              <td>List the parameter types in <code>[HarmonyPatch(nameof(Method), typeof(int))]</code> (see Chamber 4).</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Search LogOutput.log for Errors, DMD<> patched methods, or FaultGuard messages (PowerShell):
Select-String -Path "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\BepInEx\\LogOutput.log" -Pattern "Exception|DMD<|FaultGuard" -Context 2,4`,
        linux: `# Search LogOutput.log for Errors, DMD<> patched methods, or FaultGuard messages (Bash):
grep -E -C 3 "Exception|DMD<|FaultGuard" "$HOME/.local/share/Steam/steamapps/common/Valheim/BepInEx/LogOutput.log"`
      },
      expectedOutput: {
        win: `# In F5 Console at Main Menu:
> vikinginspect
[vikinginspect] LocalPlayer=null (Main Menu / Unspawned) | IsDedicated=False

# In F5 Console after spawning into a World:
> vikinginspect
[vikinginspect] LocalPlayer=Spawned (MaxCarry=450, IsOwner=True) | IsDedicated=False`,
        linux: `# In F5 Console at Main Menu:
> vikinginspect
[vikinginspect] LocalPlayer=null (Main Menu / Unspawned) | IsDedicated=False

# In F5 Console after spawning into a World:
> vikinginspect
[vikinginspect] LocalPlayer=Spawned (MaxCarry=450, IsOwner=True) | IsDedicated=False`
      },
      codeTitle: "Catching Errors Safely with [HarmonyFinalizer] & Enabling Breakpoints",
      codeSnippet: `// 1. Safety net in HelloValheimPlugin.cs:
[HarmonyFinalizer]
private static Exception? Finalizer(Exception? __exception)
{
    if (__exception != null)
        HelloValheimPlugin.Log.LogError($"[FaultGuard] Trapped in GetMaxCarryWeight: {__exception}");
    return null; // Returning null catches the error so Valheim keeps running smoothly!
}

// 2. Optional IDE Breakpoints (doorstop_config.ini):
// [UnityMono]
// debug_enabled = true
// debug_address = 127.0.0.1:10000
// debug_suspend = false`,
      agentTask: "Check LogOutput.log for any DMD<> errors or exceptions, and confirm PlayerCarryWeightPatch has null checks and a [HarmonyFinalizer].",
      onTrack: "You can spot `DMD<Class::Method>` in an error log, and `vikinginspect` safely prints `LocalPlayer=null` at the main menu without errors.",
      cliffEdge: {
        symptom: "NullReferenceException errors flood your log file at the Valheim main menu.",
        why: "Your patch tried to read `Player.m_localPlayer` at the main menu before any character has loaded into a world.",
        cause: "Your patch tried to read `Player.m_localPlayer` at the main menu before any character has loaded into a world.",
        fix: "Always add `if (Player.m_localPlayer == null) return;` (or `if (__instance == null) return;`) on the first line of your patch."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "See lines 93–133 of HelloValheimPlugin.cs: the 'vikinginspect' command and [HarmonyFinalizer] safety net.",
      diagramTitle: "How to Read a Crash Log & Stop Errors (Hover Any Box)",
      diagramCaption: "Spot the broken mod right above DMD<Class::Method> in LogOutput.log, or catch errors automatically with [HarmonyFinalizer].",
      svgDiagram: `<svg viewBox="0 0 680 245" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Annotated DMD stack trace and debugger">
        <rect x="6" y="6" width="668" height="233" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="27" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">READING CRASH LOGS &amp; PREVENTING ERRORS (HOVER ANY BOX)</text>

        <g class="map-node" tabindex="0" data-tooltip="Crash Log Breakdown: Line 1 shows the exact mod method that failed. Line 2 (DMD<Player::GetMaxCarryWeight>) shows which Valheim method was patched.">
          <rect x="20" y="36" width="640" height="114" rx="8" fill="#181C23" stroke="#EF4444"/>
          <text x="30" y="55" fill="#EF4444" font-family="monospace" font-size="11">[Error  : Unity Log] NullReferenceException: Object reference not set</text>
          <rect x="28" y="63" width="624" height="24" rx="4" fill="#212730" stroke="#EF4444"/>
          <text x="36" y="79" fill="#EF4444" font-family="monospace" font-size="11">1. at MyBrokenMod.CarryPatch.Postfix ()  &lt;-- 🎯 BROKEN MOD &amp; METHOD</text>
          <rect x="28" y="91" width="624" height="24" rx="4" fill="#212730" stroke="#D4A359"/>
          <text x="36" y="107" fill="#D4A359" font-family="monospace" font-size="11">2. at Player.DMD&lt;Player::GetMaxCarryWeight&gt; &lt;-- 🔍 PATCHED GAME METHOD</text>
          <text x="36" y="135" fill="#B6B0A6" font-family="monospace" font-size="11">3. at InventoryGui.UpdateInventory (Player player) &lt;-- Normal Game Caller</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Safety Net 1 ([HarmonyFinalizer]): Catches unexpected errors inside your patch, logs a clean message, and returns null so the game never freezes.">
          <rect x="20" y="160" width="312" height="66" rx="7" fill="#181C23" stroke="#22C55E"/>
          <text x="32" y="180" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">🛡️ Safety Net 1: [HarmonyFinalizer]</text>
          <text x="32" y="197" fill="#F3EFEA" font-family="monospace" font-size="11">Catches __exception &amp; returns null</text>
          <text x="32" y="213" fill="#B6B0A6" font-family="monospace" font-size="11">Game never freezes if a patch fails</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Safety Net 2 (Live IDE Debugger): Set debug_enabled=true in doorstop_config.ini to pause the game on breakpoints in VS Code, Visual Studio, or Rider.">
          <rect x="348" y="160" width="312" height="66" rx="7" fill="#181C23" stroke="#D4A359"/>
          <text x="360" y="180" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">🐞 Safety Net 2: IDE Breakpoints</text>
          <text x="360" y="197" fill="#F3EFEA" font-family="monospace" font-size="11">doorstop_config.ini: debug_enabled=true</text>
          <text x="360" y="213" fill="#B6B0A6" font-family="monospace" font-size="11">Connect VS Code / Rider -&gt; port 10000</text>
        </g>
      </svg>`,
      aiContext: "The user is in Chamber 3.5 learning how to read DMD<Class::Method> Harmony stack traces in BepInEx/LogOutput.log, prevent Player.m_localPlayer == null errors, use [HarmonyFinalizer], and attach a debugger on 127.0.0.1:10000."
    },

    /* ======================================================================
       CHAMBER 4: Harmony Patches & The 6 Valheim 1.0.20 Changes
       ====================================================================== */
    {
      id: "4",
      sprint: 2,
      sprintLabel: "Sprint 2 · Real Mod Engineering",
      numberLabel: "Chamber 4",
      shortTitle: "Harmony & 1.0.20 Changes",
      title: "Harmony Prefix, Postfix & The 6 Valheim 1.0.20 Changes",
      minutes: 8,
      timeBadge: "⏱️ 8 mins",
      liftBadge: "🟡 Intermediate",
      safeStop: null,
      undoBadge: "↩️ Undo: EnableMod = false",
      yieldNote: "When a Valheim 1.0.20 method has multiple versions with the same name (like PieceTable.SetCategory), always pass typeof(...) parameter types in [HarmonyPatch].",
      summary: "Harmony gives you two main tools: `[HarmonyPrefix]` (runs BEFORE a game method) and `[HarmonyPostfix]` (runs AFTER a game method and can change its return value `ref __result`). Here we inspect our carry-weight and achievement patches, plus the **6 Valheim 1.0.20 Changes** that break older tutorials.",
      personaNotes: {
        P1: "If code from a 2022–2023 guide fails to compile or crashes on startup in Valheim 1.0.20, the 6-row Reference Table below shows the exact fix.",
        P2: "Harmony injects special parameters by name at runtime: `__instance` (the `this` object), `ref __result` (the return value), and `__state` (data passed from Prefix to Postfix).",
        P3: "Check out `PlayerCarryWeightPatch` in the code box: just 4 lines of C# (`__result += CarryWeightBonus.Value;`) adds `+150` carry weight to your Viking!",
        P4: "Look at `AchievementsSafetyPatch`: setting `__result = false` on `Achievements.IsCheatedAtAll` keeps Steam achievements working while you test console commands.",
        P5: "Keep the **6 Valheim 1.0.20 Changes** table handy—these 6 method signature updates fix 95% of older mods moving to Valheim 1.0.20."
      },
      steps: [
        "Hover the pipeline boxes in the **`Visual Map` on the right** to see how `[HarmonyPrefix]`, the original game method, `[HarmonyPostfix]`, and `[HarmonyFinalizer]` run in order.",
        "Inspect `PlayerCarryWeightPatch` (adds `+150` to `Player.GetMaxCarryWeight`) and `AchievementsSafetyPatch` in the code viewer.",
        "Open the **`Reference Table`** to see the **6 Valheim 1.0.20 Changes** before patching `ZDOMan`, `SEMan`, `PieceTable`, `Chat`, `InventoryGui`, or `Utils.GetSaveDataPath`."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Game Area &amp; Method</th>
              <th>Old Pre-1.0 Signature</th>
              <th>Current Valheim 1.0.20 Signature</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1</strong></td>
              <td><strong>World Sector Grid</strong><br><code>ZDOMan.FindSectorObjects</code></td>
              <td><code>(Vector2i sector, int area, int distantArea, ...)</code></td>
              <td>Uses 16-bit <code>Vector2s</code> (in <code>assembly_utils.dll</code>) and <code>SimulationDistance</code> enum.</td>
            </tr>
            <tr>
              <td><strong>2</strong></td>
              <td><strong>Status Effects</strong><br><code>SEMan.AddStatusEffect</code></td>
              <td>4 parameters:<br><code>(int nameHash, bool reset, int level, float skill)</code></td>
              <td><strong>5 parameters</strong> (added <code>short variant = 0</code>):<br><code>typeof(int), typeof(bool), typeof(int), typeof(float), typeof(short)</code></td>
            </tr>
            <tr>
              <td><strong>3</strong></td>
              <td><strong>Hammer Build Menu</strong><br><code>PieceTable.SetCategory</code></td>
              <td>Only one version:<br><code>SetCategory(int index)</code></td>
              <td>Added a second version <code>SetCategory(Piece.PieceCategory)</code>. Always specify <code>typeof(int)</code> in <code>[HarmonyPatch]</code>!</td>
            </tr>
            <tr>
              <td><strong>4</strong></td>
              <td><strong>Chat Callbacks</strong><br><code>Chat.OnNewChatMessage</code></td>
              <td>Compiled as lambda:<br><code>&lt;OnNewChatMessage&gt;b__0</code></td>
              <td>Compiled as local function:<br><code>&lt;OnNewChatMessage&gt;g__OnCheckPermissionAsyncCompleted|0</code></td>
            </tr>
            <tr>
              <td><strong>5</strong></td>
              <td><strong>Inventory Window</strong><br><code>InventoryGui.Show</code></td>
              <td>1 parameter:<br><code>Show(Container)</code></td>
              <td>2 parameters: <code>Show(Container, int activeGroup = 1)</code>, plus helper <code>InventoryGui.UseButtonHeld()</code>.</td>
            </tr>
            <tr>
              <td><strong>6</strong></td>
              <td><strong>Save Folder Path</strong><br><code>Utils.GetSaveDataPath</code></td>
              <td>Worked inside <code>Awake()</code></td>
              <td>Throws a null error if called too early in <code>Awake()</code>! Wrap in <code>try/catch</code> and fall back to <code>Utils.persistantDataPath</code>.</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Rebuild and install after editing a Harmony patch in starter-mod/HelloValheimPlugin.cs:
powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1`,
        linux: `# Rebuild and install after editing a Harmony patch in starter-mod/HelloValheimPlugin.cs:
bash ./tools/build-and-deploy.sh`
      },
      expectedOutput: {
        win: `Build succeeded.
    0 Warning(s)
    0 Error(s)
[PASS] Deployed HelloValheim.dll -> CarryWeightBonus Postfix (+150f) & Achievements Postfix active.`,
        linux: `Build succeeded.
    0 Warning(s)
    0 Error(s)
[PASS] Deployed HelloValheim.dll -> CarryWeightBonus Postfix (+150f) & Achievements Postfix active.`
      },
      codeTitle: "Changing a Method's Return Value with [HarmonyPostfix]",
      codeSnippet: `[HarmonyPatch(typeof(Player), nameof(Player.GetMaxCarryWeight))]
public static class PlayerCarryWeightPatch
{
    [HarmonyPostfix]
    private static void Postfix(Player __instance, ref float __result)
    {
        if (!HelloValheimPlugin.EnableMod.Value || __instance == null) return;
        __result += HelloValheimPlugin.CarryWeightBonus.Value; // Default: 300 + 150 = 450!
    }
}`,
      agentTask: "Help me add or customize a Harmony patch in starter-mod/HelloValheimPlugin.cs following the 6 Valheim 1.0.20 method rules.",
      onTrack: "Your in-game carry weight shows `450` (`300` base + `150` bonus) in your inventory screen and when running `vikinginspect`.",
      cliffEdge: {
        symptom: "Patching an overloaded Valheim 1.0.20 method crashes with an AmbiguousMatchException error.",
        why: "Valheim 1.0.20 has multiple methods with the same name (like `PieceTable.SetCategory`), so Harmony needs to know which parameter types you want to patch.",
        cause: "Valheim 1.0.20 has multiple methods with the same name (like `PieceTable.SetCategory`), so Harmony needs to know which parameter types you want to patch.",
        fix: "Pass the parameter types inside `[HarmonyPatch(nameof(PieceTable.SetCategory), new[] { typeof(int) })]` and use the Copy AI Prompt button so your AI assistant uses 1.0.20 signatures."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "See lines 108–146 of HelloValheimPlugin.cs: PlayerCarryWeightPatch and AchievementsSafetyPatch.",
      diagramTitle: "Harmony Patch Order & The 6 Valheim 1.0.20 Updates (Hover Any Box)",
      diagramCaption: "How Prefix, Original Method, Postfix, and Finalizer run in sequence—plus the 6 method changes in Valheim 1.0.20.",
      svgDiagram: `<svg viewBox="0 0 680 245" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Harmony Prefix Postfix and 1.0.20 changes">
        <rect x="6" y="6" width="668" height="233" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="27" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">HOW HARMONY PATCHES RUN (HOVER ANY BOX FOR DETAILS)</text>

        <g class="map-node" tabindex="0" data-tooltip="[HarmonyPrefix]: Runs BEFORE Valheim's original method. Can change input arguments or return false to skip the original method.">
          <rect x="20" y="38" width="144" height="64" rx="7" fill="#181C23" stroke="#D4A359"/>
          <text x="30" y="58" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">1. [HarmonyPrefix]</text>
          <text x="30" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">Runs BEFORE method</text>
          <text x="30" y="90" fill="#B6B0A6" font-family="monospace" font-size="11">Can change inputs</text>
        </g>

        <path d="M 164 70 L 182 70" stroke="#D4A359" stroke-width="2"/>
        <polygon points="176,66 182,70 176,74" fill="#D4A359"/>

        <g class="map-node" tabindex="0" data-tooltip="Original Game Method: Valheim's normal Player.GetMaxCarryWeight() runs and calculates the base carry weight of 300.">
          <rect x="182" y="38" width="150" height="64" rx="7" fill="#181C23" stroke="#D4A359"/>
          <text x="192" y="58" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">2. Game Method</text>
          <text x="192" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">GetMaxCarryWeight()</text>
          <text x="192" y="90" fill="#B6B0A6" font-family="monospace" font-size="11">Starts at 300f</text>
        </g>

        <path d="M 332 70 L 350 70" stroke="#D4A359" stroke-width="2"/>
        <polygon points="344,66 350,70 344,74" fill="#D4A359"/>

        <g class="map-node" tabindex="0" data-tooltip="[HarmonyPostfix]: Runs AFTER the game method finishes. Our patch adds +150 to ref __result, turning 300 into 450!">
          <rect x="350" y="38" width="148" height="64" rx="7" fill="#181C23" stroke="#D4A359"/>
          <text x="360" y="58" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">3. [HarmonyPostfix]</text>
          <text x="360" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">__result += 150f;</text>
          <text x="360" y="90" fill="#B6B0A6" font-family="monospace" font-size="11">Returns 450f!</text>
        </g>

        <path d="M 498 70 L 516 70" stroke="#22C55E" stroke-width="2"/>
        <polygon points="510,66 516,70 510,74" fill="#22C55E"/>

        <g class="map-node" tabindex="0" data-tooltip="[HarmonyFinalizer]: Optional safety net that wraps the whole call in a try/catch so any error is logged cleanly without crashing.">
          <rect x="516" y="38" width="144" height="64" rx="7" fill="#181C23" stroke="#22C55E"/>
          <text x="526" y="58" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">4. [Finalizer]</text>
          <text x="526" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">Safety net guard</text>
          <text x="526" y="90" fill="#22C55E" font-family="monospace" font-size="11">Catches any error</text>
        </g>

        <text x="20" y="124" fill="#F59E0B" font-family="monospace" font-size="11" font-weight="bold">6 VALHEIM 1.0.20 UPDATES TO KNOW (HOVER ANY BOX)</text>

        <g class="map-node" tabindex="0" data-tooltip="Update 1 (World Sectors): ZDOMan.FindSectorObjects now uses 16-bit Vector2s (from assembly_utils.dll) instead of Vector2i.">
          <rect x="20" y="132" width="206" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
          <text x="28" y="150" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">1. Vector2i -&gt; Vector2s</text>
          <text x="28" y="166" fill="#B6B0A6" font-family="monospace" font-size="11">ZDOMan.FindSectorObjects</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Update 2 (Status Effects): SEMan.AddStatusEffect now takes 5 parameters (added short variant = 0 at the end).">
          <rect x="236" y="132" width="208" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
          <text x="244" y="150" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">2. AddStatusEffect +short</text>
          <text x="244" y="166" fill="#B6B0A6" font-family="monospace" font-size="11">Added 5th short parameter</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Update 3 (SetCategory Overload): PieceTable.SetCategory has two versions (int and PieceCategory). Always pass typeof(int) in [HarmonyPatch].">
          <rect x="454" y="132" width="206" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
          <text x="462" y="150" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">3. SetCategory Overload</text>
          <text x="462" y="166" fill="#B6B0A6" font-family="monospace" font-size="11">Specify typeof(int)</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Update 4 (Chat Callbacks): Inner callbacks in Chat.OnNewChatMessage now compile as C# local functions instead of anonymous lambdas.">
          <rect x="20" y="184" width="206" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
          <text x="28" y="202" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">4. Chat Callback Name</text>
          <text x="28" y="218" fill="#B6B0A6" font-family="monospace" font-size="11">Uses C# local function</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Update 5 (Inventory Window): InventoryGui.Show now takes (Container, int activeGroup = 1).">
          <rect x="236" y="184" width="208" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
          <text x="244" y="202" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">5. InventoryGui.Show</text>
          <text x="244" y="218" fill="#B6B0A6" font-family="monospace" font-size="11">Added int activeGroup = 1</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Update 6 (Save Folder Path): Utils.GetSaveDataPath() fails if called inside Awake() before the platform initializes. Use a try/catch fallback.">
          <rect x="454" y="184" width="206" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
          <text x="462" y="202" fill="#EF4444" font-family="monospace" font-size="11" font-weight="bold">6. SavePath in Awake()</text>
          <text x="462" y="218" fill="#B6B0A6" font-family="monospace" font-size="11">Use try/catch fallback</text>
        </g>
      </svg>`,
      aiContext: "The user is in Chamber 4 writing Harmony Prefix/Postfix patches and applying the 6 Valheim 1.0.20 changes cheat sheet."
    },

    /* ======================================================================
       CHAMBER 4.5: Config Files, Sliders & Live Reload Without Restarting
       ====================================================================== */
    {
      id: "4.5",
      sprint: 2,
      sprintLabel: "Sprint 2 · Real Mod Engineering",
      numberLabel: "Chamber 4.5",
      shortTitle: "Live Config Reload",
      title: "Config Files (Config.Bind), Sliders & Live Reload Without Restarting",
      minutes: 4,
      timeBadge: "⏱️ 4 mins",
      liftBadge: "🟢 Easy",
      safeStop: null,
      undoBadge: "↩️ Undo: Edit .cfg back to 150",
      yieldNote: "BepInEx creates BepInEx/config/com.valheim101.hellovalheim.cfg the first time your mod runs inside Valheim.",
      summary: "Hardcoding `150f` in C# means restarting Valheim every time you want to tweak a number. Instead, `HelloValheimPlugin.cs` creates a setting in `BepInEx/config/com.valheim101.hellovalheim.cfg` using `Config.Bind` and watches the file for changes. Edit the `.cfg` file while Valheim is open and your carry weight updates immediately!",
      personaNotes: {
        P1: "Just like Forge config files in Minecraft, `Config.Bind` automatically creates the `.cfg` file with comments, default values, and min/max limits on first launch.",
        P2: "Passing `ThreadingHelper.SynchronizingObject` to `FileSystemWatcher` ensures file-change events run safely on Unity's main game thread.",
        P3: "Huge time-saver: keep Valheim open, change `CarryWeightBonus = 500` in Notepad or nano, save the file, and your Viking immediately gets `+500` carry weight!",
        P4: "If you install the popular `BepInEx ConfigurationManager` mod, our `AcceptableValueRange<float>(0f, 1000f)` line automatically creates a `0–1000` slider when you press `F1` in-game!",
        P5: "You can pair this same `Config.Bind` + `FileSystemWatcher` setup with server-synced settings in Type 2 mods for live server tuning."
      },
      steps: [
        "Hover the boxes in the **`Visual Map` on the right** to see how saving the `.cfg` file updates your live game.",
        "With Valheim running, open `BepInEx/config/com.valheim101.hellovalheim.cfg` in any text editor (or run the terminal command below) and change `CarryWeightBonus = 150` to `CarryWeightBonus = 500`.",
        "Run `vikingping` in the `F5` console (or check `LogOutput.log`) and see `Active carry bonus: +500` right away—no game restart needed!"
      ],
      tableHtml: "",
      commands: {
        win: `# Update CarryWeightBonus to 500 from PowerShell while Valheim is running:
$cfg = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\BepInEx\\config\\com.valheim101.hellovalheim.cfg"
(Get-Content $cfg) -replace "CarryWeightBonus = .*", "CarryWeightBonus = 500" | Set-Content $cfg
Get-Content $cfg`,
        linux: `# Update CarryWeightBonus to 500 from Bash while Valheim is running:
CFG="$HOME/.local/share/Steam/steamapps/common/Valheim/BepInEx/config/com.valheim101.hellovalheim.cfg"
sed -i 's/^CarryWeightBonus = .*/CarryWeightBonus = 500/' "$CFG"
cat "$CFG"`
      },
      expectedOutput: {
        win: `[Info   :HelloValheim] [LiveConfig] CarryWeightBonus updated to +500 (800 total)
# In F5 Console:
> vikingping
[HelloValheim 1.0.0] Pong! Active carry bonus: +500 (Mod Enabled: True)`,
        linux: `[Info   :HelloValheim] [LiveConfig] CarryWeightBonus updated to +500 (800 total)
# In F5 Console:
> vikingping
[HelloValheim 1.0.0] Pong! Active carry bonus: +500 (Mod Enabled: True)`
      },
      codeTitle: "Binding a Config Slider & Watching the File for Live Edits",
      codeSnippet: `CarryWeightBonus = Config.Bind(
    "2. Gameplay",
    "CarryWeightBonus",
    150f,
    new ConfigDescription(
        "Extra carry weight added to Player.GetMaxCarryWeight (live hot-reloadable).",
        new AcceptableValueRange<float>(0f, 1000f))); // Creates a 0-1000 slider in F1 UI!

_configWatcher = new FileSystemWatcher(configDir, configFile)
{
    NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
    SynchronizingObject = ThreadingHelper.SynchronizingObject, // Runs safely on Unity's main thread!
    EnableRaisingEvents = true
};`,
      agentTask: "Show me how to add a new ConfigEntry setting with a min/max slider to starter-mod/HelloValheimPlugin.cs so it reloads live.",
      onTrack: "Saving `com.valheim101.hellovalheim.cfg` immediately logs `[LiveConfig] CarryWeightBonus updated to +500` and updates `vikingping` in-game.",
      cliffEdge: {
        symptom: "Your config file is missing or live changes cause a thread error.",
        why: "BepInEx creates the `.cfg` file the first time your mod runs in Valheim, and `FileSystemWatcher` needs `ThreadingHelper.SynchronizingObject` to run on Unity's main thread.",
        cause: "BepInEx creates the `.cfg` file the first time your mod runs in Valheim, and `FileSystemWatcher` needs `ThreadingHelper.SynchronizingObject` to run on Unity's main thread.",
        fix: "Launch Valheim once after Chamber 2 so BepInEx creates the `.cfg` file, and keep `SynchronizingObject = ThreadingHelper.SynchronizingObject` on your `FileSystemWatcher`."
      },
      defaultInspectorTab: "cfg",
      inspectorHighlightNote: "Switch between 'com.valheim101.hellovalheim.cfg' and 'HelloValheimPlugin.cs' (lines 28–66) in the code viewer below.",
      diagramTitle: "How Live Config Reload Works (Hover Any Box)",
      diagramCaption: "Saving the .cfg file triggers FileSystemWatcher -> Config.Reload() on Unity's main thread -> instant in-game update.",
      svgDiagram: `<svg viewBox="0 0 680 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Live cfg hot reload flow">
        <rect x="6" y="6" width="668" height="218" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="28" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">LIVE CONFIG RELOAD FLOW (HOVER ANY BOX FOR DETAILS)</text>

        <g class="map-node" tabindex="0" data-tooltip="1. Edit .cfg File: Open BepInEx/config/com.valheim101.hellovalheim.cfg in any text editor while Valheim is running and save a new number.">
          <rect x="20" y="46" width="144" height="82" rx="8" fill="#181C23" stroke="#F59E0B"/>
          <text x="30" y="68" fill="#F59E0B" font-family="sans-serif" font-size="12" font-weight="bold">1. Edit .cfg File</text>
          <text x="30" y="88" fill="#F3EFEA" font-family="monospace" font-size="11">CarryWeightBonus</text>
          <text x="30" y="104" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">= 150 -&gt; 500</text>
        </g>

        <path d="M 164 87 L 182 87" stroke="#F59E0B" stroke-width="2"/>
        <polygon points="176,83 182,87 176,91" fill="#F59E0B"/>

        <g class="map-node" tabindex="0" data-tooltip="2. File Watcher: FileSystemWatcher notices the saved file and uses ThreadingHelper.SynchronizingObject to notify Unity's main thread safely.">
          <rect x="182" y="46" width="150" height="82" rx="8" fill="#181C23" stroke="#D4A359"/>
          <text x="192" y="68" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">2. File Watcher</text>
          <text x="192" y="88" fill="#F3EFEA" font-family="monospace" font-size="11">Detects saved file</text>
          <text x="192" y="104" fill="#B6B0A6" font-family="monospace" font-size="11">Main-thread safe</text>
        </g>

        <path d="M 332 87 L 350 87" stroke="#D4A359" stroke-width="2"/>
        <polygon points="344,83 350,87 344,91" fill="#D4A359"/>

        <g class="map-node" tabindex="0" data-tooltip="3. Config.Reload(): BepInEx reads the updated value from disk and triggers the SettingChanged event.">
          <rect x="350" y="46" width="148" height="82" rx="8" fill="#181C23" stroke="#D4A359"/>
          <text x="360" y="68" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">3. Config.Reload()</text>
          <text x="360" y="88" fill="#F3EFEA" font-family="monospace" font-size="11">Reads new value</text>
          <text x="360" y="104" fill="#B6B0A6" font-family="monospace" font-size="11">Fires update event</text>
        </g>

        <path d="M 498 87 L 516 87" stroke="#22C55E" stroke-width="2"/>
        <polygon points="510,83 516,87 510,91" fill="#22C55E"/>

        <g class="map-node" tabindex="0" data-tooltip="4. Live In-Game: Your carry weight updates to 800 (300 base + 500 bonus) immediately without restarting Valheim!">
          <rect x="516" y="46" width="144" height="82" rx="8" fill="#181C23" stroke="#22C55E"/>
          <text x="526" y="68" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">4. Live In-Game</text>
          <text x="526" y="88" fill="#F3EFEA" font-family="monospace" font-size="11" font-weight="bold">MaxCarry: 800</text>
          <text x="526" y="104" fill="#22C55E" font-family="monospace" font-size="11">No Restart Needed!</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Bonus F1 Slider: Adding AcceptableValueRange<float>(0f, 1000f) to Config.Bind automatically creates an interactive 0-1000 slider if you use BepInEx ConfigurationManager.">
          <rect x="20" y="146" width="640" height="62" rx="7" fill="#181C23" stroke="#2B323D"/>
          <text x="34" y="168" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">💡 Bonus: Automatic In-Game Slider with F1 ConfigurationManager</text>
          <text x="34" y="188" fill="#B6B0A6" font-family="monospace" font-size="11">AcceptableValueRange&lt;float&gt;(0f, 1000f) automatically creates a 0..1000 slider in the F1 menu.</text>
        </g>
      </svg>`,
      aiContext: "The user is in Chamber 4.5 using BepInEx Config.Bind<float> with AcceptableValueRange and FileSystemWatcher for live config reload."
    },

    /* ======================================================================
       CHAMBER 5: Multiplayer Sync, Dedicated Servers, ILSpy & Publishing
       ====================================================================== */
    {
      id: "5",
      sprint: 2,
      sprintLabel: "Sprint 2 · Real Mod Engineering",
      numberLabel: "Chamber 5",
      shortTitle: "Multiplayer, ILSpy & Ship",
      title: "Multiplayer Sync, Dedicated Servers, ILSpy & Thunderstore Publishing",
      minutes: 12,
      timeBadge: "⏱️ 12 mins",
      liftBadge: "🟡 Intermediate",
      safeStop: "✓ Safe Checkpoint #3 (Ready to Publish!)",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "Dedicated Servers run without graphics or a local player—always skip UI and audio code when ZNet.instance.IsDedicated() is true.",
      summary: "To share your mods with friends or publish on Thunderstore, learn three essentials: (1) how Valheim multiplayer decides which player controls nearby creatures (`m_nview.IsOwner()`) vs. what a Dedicated Server runs (`ZNet.instance.IsDedicated()`), (2) how to browse Valheim's code with **ILSpy**, and (3) how to zip your mod for Thunderstore, r2modman, or Gale.",
      personaNotes: {
        P1: "Unlike Minecraft where the server runs every monster, Valheim gives control of each 64×64m map zone to the first player who walks into it (`m_nview.IsOwner()`).",
        P2: "Linux and Windows Dedicated Servers run in headless mode with no screen, audio, or `Player.m_localPlayer`. Always guard client UI/audio patches with `if (ZNet.instance.IsDedicated()) return;`.",
        P3: "Want to find the method for stamina use, boat speed, or workbench range? Search `assembly_valheim.dll` with `ilspycmd` using the command below!",
        P4: "Your `starter-mod/` folder already includes `manifest.json` and `thunderstore.toml`—you can zip your mod and import it into r2modman or Gale right now.",
        P5: "Check the **`Reference Table`**—mixing up `ZNet.instance.IsServer()` and `m_nview.IsOwner()` is the #1 cause of duplicate loot drops in multiplayer."
      },
      steps: [
        "Hover the 3 columns in the **`Visual Map` on the right** and open the **`Reference Table`** to compare `m_nview.IsOwner()`, `IsServer()`, and `IsDedicated()`.",
        "Check `MultiplayerRpcPatch` in `HelloValheimPlugin.cs` to see custom network messages (`ZRoutedRpc`) and the `ZNet.instance.IsDedicated()` server guard.",
        "Use `ilspycmd` (or the ILSpy desktop app) to search `assembly_valheim.dll` for any game class you want to mod next.",
        "Run the zip command below to package your mod (`manifest.json`, `README.md`, `HelloValheim.dll`) for r2modman, Gale, or Thunderstore."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Multiplayer Check</th>
              <th>What It Means in Plain English</th>
              <th>When to Use It</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>m_nview.IsValid() &amp;&amp; m_nview.IsOwner()</code></td>
              <td><strong>Zone Controller:</strong> This player's computer currently controls this creature or object (the first player in that 64×64m area).</td>
              <td><strong>Changing Health or Spawning Loot:</strong> Prevents 4 nearby players from spawning 4 copies of the same loot drop.</td>
            </tr>
            <tr>
              <td><code>ZNet.instance.IsServer()</code></td>
              <td><strong>World Host:</strong> True on a Dedicated Server OR on the host player's PC when hosting a co-op world.</td>
              <td><strong>Global World Rules:</strong> Saving the world, setting boss progression keys (<code>ZoneSystem</code>), and managing connected players.</td>
            </tr>
            <tr>
              <td><code>ZNet.instance.IsDedicated()</code></td>
              <td><strong>Headless Dedicated Server:</strong> True ONLY on a Dedicated Server (which has no screen, no HUD, no audio, and no local player).</td>
              <td><strong>Server Crash Guard:</strong> Skip any code that touches <code>Hud.instance</code>, <code>Player.m_localPlayer</code>, cameras, or keybinds.</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# 1. Search any Valheim 1.0.20 class (e.g., Player) from PowerShell with ilspycmd:
# (Install once via: dotnet tool install -g ilspycmd)
ilspycmd "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\valheim_Data\\Managed\\assembly_valheim.dll" -t Player | Select-String "GetMaxCarryWeight|Update"

# 2. Create a Thunderstore / r2modman / Gale zip package:
Compress-Archive -Path .\\starter-mod\\manifest.json, .\\README.md, .\\starter-mod\\bin\\Release\\HelloValheim.dll -DestinationPath .\\starter-mod\\HelloValheim-1.0.0.zip -Force`,
        linux: `# 1. Search any Valheim 1.0.20 class (e.g., Player) from Bash with ilspycmd:
# (Install once via: dotnet tool install -g ilspycmd)
ilspycmd "$HOME/.local/share/Steam/steamapps/common/Valheim/valheim_Data/Managed/assembly_valheim.dll" -t Player | grep -E "GetMaxCarryWeight|Update"

# 2. Create a Thunderstore / r2modman / Gale zip package:
cd ./starter-mod && zip -j HelloValheim-1.0.0.zip manifest.json ../README.md bin/Release/HelloValheim.dll`
      },
      expectedOutput: {
        win: `public float GetMaxCarryWeight()
private void Update()
# Packaged: starter-mod\\HelloValheim-1.0.0.zip (Ready for r2modman / Gale / Thunderstore Import!)`,
        linux: `public float GetMaxCarryWeight()
private void Update()
# Packaged: starter-mod/HelloValheim-1.0.0.zip (Ready for r2modman / Gale / Thunderstore Import!)`
      },
      codeTitle: "Dedicated Server Guard & Sending Network Messages (ZRoutedRpc)",
      codeSnippet: `[HarmonyPatch(typeof(Game), nameof(Game.Start))]
public static class MultiplayerRpcPatch
{
    [HarmonyPostfix]
    private static void Postfix()
    {
        ZRoutedRpc.instance?.Register<string>("HelloValheim_Ping", (senderUid, msg) =>
            HelloValheimPlugin.Log.LogInfo($"[ZRoutedRpc] Peer {senderUid} says: {msg}"));

        // IMPORTANT: Skip UI, keybind, and local player code on a headless Dedicated Server!
        if (ZNet.instance != null && ZNet.instance.IsDedicated()) return;
    }
}`,
      agentTask: "Check my mod for Dedicated Server safety (ZNet.instance.IsDedicated()), multiplayer zone ownership (m_nview.IsOwner()), and Thunderstore packaging.",
      onTrack: "You know when to check `m_nview.IsOwner()` vs. `ZNet.instance.IsDedicated()`, and you can package `HelloValheim-1.0.0.zip`.",
      cliffEdge: {
        symptom: "Your mod crashes a Dedicated Server or drops duplicate multiplayer loot.",
        why: "Touching `Hud.instance` or `Player.m_localPlayer` on a headless server crashes because no player screen exists, and spawning loot without checking `m_nview.IsOwner()` runs on every nearby player's PC.",
        cause: "Touching `Hud.instance` or `Player.m_localPlayer` on a headless server crashes because no player screen exists, and spawning loot without checking `m_nview.IsOwner()` runs on every nearby player's PC.",
        fix: "Guard all UI and keybind code with `if (ZNet.instance.IsDedicated()) return;` and guard creature/loot changes with `if (!m_nview.IsValid() || !m_nview.IsOwner()) return;`."
      },
      defaultInspectorTab: "manifest",
      inspectorHighlightNote: "See 'manifest.json + thunderstore.toml' or 'HelloValheimPlugin.cs' (lines 148–169) in the code viewer below.",
      diagramTitle: "How Valheim Multiplayer & Dedicated Servers Work (Hover Any Box)",
      diagramCaption: "Player A (first into a map zone) runs the creatures in that zone, while the Dedicated Server relays messages and saves the world.",
      svgDiagram: `<svg viewBox="0 0 680 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ZDO ownership vs Dedicated Server">
        <rect x="6" y="6" width="668" height="228" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="27" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">HOW VALHEIM MULTIPLAYER SYNC WORKS (HOVER ANY BOX)</text>

        <g class="map-node" tabindex="0" data-tooltip="Player A (Zone Owner): Whichever player enters a 64x64m area first controls the creatures and objects there (m_nview.IsOwner() == true). Run loot drops here so they only happen once!">
          <rect x="20" y="42" width="204" height="174" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
          <text x="32" y="64" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">✓ Player A (Zone Owner)</text>
          <text x="32" y="84" fill="#F3EFEA" font-family="monospace" font-size="11">IsOwner()     == TRUE</text>
          <text x="32" y="102" fill="#B6B0A6" font-family="monospace" font-size="11">IsDedicated() == FALSE</text>
          <rect x="32" y="116" width="180" height="86" rx="6" fill="#212730" stroke="#22C55E"/>
          <text x="40" y="135" fill="#22C55E" font-family="sans-serif" font-size="11" font-weight="bold">Controls This Zone:</text>
          <text x="40" y="153" fill="#F3EFEA" font-family="monospace" font-size="11">• Creature AI &amp; Physics</text>
          <text x="40" y="170" fill="#F3EFEA" font-family="monospace" font-size="11">• Spawns Loot Once</text>
          <text x="40" y="187" fill="#F3EFEA" font-family="monospace" font-size="11">• Updates Object Data</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Dedicated Server: Saves the world and passes messages between players, but has NO screen, NO audio, and NO local player (m_localPlayer == null).">
          <rect x="238" y="42" width="204" height="174" rx="8" fill="#181C23" stroke="#F59E0B" stroke-width="1.5"/>
          <text x="250" y="64" fill="#F59E0B" font-family="sans-serif" font-size="12" font-weight="bold">🖥️ Dedicated Server</text>
          <text x="250" y="84" fill="#F3EFEA" font-family="monospace" font-size="11">IsDedicated() == TRUE</text>
          <text x="250" y="102" fill="#EF4444" font-family="monospace" font-size="11">m_localPlayer == NULL!</text>
          <rect x="250" y="116" width="180" height="86" rx="6" fill="#212730" stroke="#F59E0B"/>
          <text x="258" y="135" fill="#F59E0B" font-family="sans-serif" font-size="11" font-weight="bold">World Host &amp; Relay:</text>
          <text x="258" y="153" fill="#F3EFEA" font-family="monospace" font-size="11">• Assigns Zone Owners</text>
          <text x="258" y="170" fill="#F3EFEA" font-family="monospace" font-size="11">• Relays Network RPCs</text>
          <text x="258" y="187" fill="#EF4444" font-family="monospace" font-size="11">• NO HUD or Audio!</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Player B (Nearby Friend): Sees the creatures controlled by Player A and sends action messages (InvokeRPC) when hitting a monster or opening a chest.">
          <rect x="456" y="42" width="204" height="174" rx="8" fill="#181C23" stroke="#D4A359" stroke-width="1.5"/>
          <text x="468" y="64" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">🛡️ Player B (Friend)</text>
          <text x="468" y="84" fill="#F3EFEA" font-family="monospace" font-size="11">IsOwner()     == FALSE</text>
          <text x="468" y="102" fill="#B6B0A6" font-family="monospace" font-size="11">IsDedicated() == FALSE</text>
          <rect x="468" y="116" width="180" height="86" rx="6" fill="#212730" stroke="#D4A359"/>
          <text x="476" y="135" fill="#D4A359" font-family="sans-serif" font-size="11" font-weight="bold">Syncs &amp; Sends Actions:</text>
          <text x="476" y="153" fill="#F3EFEA" font-family="monospace" font-size="11">• Reads Synced Positions</text>
          <text x="476" y="170" fill="#F3EFEA" font-family="monospace" font-size="11">• Sends Hit/Use Messages</text>
          <text x="476" y="187" fill="#F3EFEA" font-family="monospace" font-size="11">• Draws Own Screen HUD</text>
        </g>
      </svg>`,
      aiContext: "The user is in Chamber 5 learning Valheim multiplayer zone ownership (m_nview.IsOwner()), headless Dedicated Server guards (ZNet.instance.IsDedicated()), ZRoutedRpc, ILSpy decompilation, and Thunderstore packaging."
    }
  ]
};
