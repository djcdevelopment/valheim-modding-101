/* ==========================================================================
   Valheim 1.0.20 Interactive Modding Workbench — Complete 8-Chamber Dataset
   Zero external dependencies; compatible with file:// and static hosting.
   ========================================================================== */

window.WORKBENCH_DATA = {
  version: "1.0.20 (Deep North)",
  pinnedGroundTruth: `=== PINNED VALHEIM 1.0.20 (DEEP NORTH) GROUND-TRUTH CONSTRAINTS ===
Do NOT suggest outdated 2021-2023 (0.217/0.218) Valheim signatures. Enforce these 6 verified Valheim 1.0.20 API rules:
1. Spatial Sector Partitioning: ZDOMan.FindSectorObjects uses 16-bit Vector2s (from assembly_utils.dll) + SimulationDistance enum, NOT Vector2i + int radius. In ZDOMan.RPC_ZDOData transpilers, the ZDO local index shifted from V_13 to V_12.
2. Status Effects: SEMan.AddStatusEffect requires a 5th parameter (short variant = 0): typeof(int), typeof(bool), typeof(int), typeof(float), typeof(short).
3. Ambiguous Method Overloads: PieceTable.SetCategory has TWO overloads in 1.0.20: SetCategory(int) and SetCategory(Piece.PieceCategory). Always pass explicit parameter types in [HarmonyPatch(nameof(PieceTable.SetCategory), typeof(int))] to avoid AmbiguousMatchException.
4. C# Compiler Closure Lowering: Inner callbacks like Chat.OnNewChatMessage compile as local functions (<OnNewChatMessage>g__OnCheckPermissionAsyncCompleted|0) rather than legacy <OnNewChatMessage>b__0 lambdas.
5. UI & Input Refactoring: InventoryGui.Show(Container, int activeGroup = 1) pushes ldc.i4.1 before call; container hold checks use private static InventoryGui.UseButtonHeld().
6. Early SaveDataPath NRE: Never call Utils.GetSaveDataPath() inside BaseUnityPlugin.Awake() without a try/catch fallback to Utils.persistantDataPath because PlatformManager.DistributionPlatform is null during early boot.
7. Clean Build Rule: Every Unity/BepInEx/Valheim <Reference> in .csproj MUST set <Private>false</Private> so UnityEngine.dll and 0Harmony.dll are never copied into BepInEx/plugins/.`,

  personas: {
    P1: {
      id: "P1",
      shortLabel: "🧱 Cross-Game Modder",
      title: "P1 · Cross-Game Modder ('WaitAMinute' — Minecraft / Skyrim / Backend)",
      badge: "Has mental model · Frustrated by stale 2022 tutorials"
    },
    P2: {
      id: "P2",
      shortLabel: "💻 Software Dev",
      title: "P2 · Software Developer (Pro Coder, 0 Unity Editor Bloat)",
      badge: "Wants CLI dotnet build, clean .csproj & Mono debugger"
    },
    P3: {
      id: "P3",
      shortLabel: "🎯 Hobbyist (Have Goal)",
      title: "P3 · Goal-Driven Hobbyist ('I want to tweak 1 thing tonight')",
      badge: "Low theory patience · Fastest safe edit & live .cfg reload"
    },
    P4: {
      id: "P4",
      shortLabel: "🧭 Explorer (No Goal)",
      title: "P4 · Curious Explorer (Wants a Safe Win & Starter Recipes)",
      badge: "Zero save/achievement risk · Guided 15-minute dopamine loop"
    },
    P5: {
      id: "P5",
      shortLabel: "🛡️ 0.217 Veteran",
      title: "P5 · Returning Pre-1.0 Modder / Server Pack Admin",
      badge: "Needs 1.0.20 6-Shift Migration Cheat Sheet & DMD<> stack traces"
    }
  },

  seriesTeaser: [
    {
      part: "Part 1",
      title: "Zero-Copy NTFS Junction & POSIX Symlink Profile Engine",
      desc: "Switch between Vanilla and 50-mod profiles in 40 milliseconds with zero file duplication."
    },
    {
      part: "Part 2",
      title: "Sub-8-Second Fast-Boot Harness & Intro Bypass",
      desc: "Skip FejdStartup & CinematicsManager delays for rapid compile-test-verify loops."
    },
    {
      part: "Part 3",
      title: "Mono.Cecil Reflection Auditing Against Game Patches",
      desc: "Automatically scan 50+ mod DLLs against new assembly_valheim.dll builds in <3 seconds."
    },
    {
      part: "Part 4",
      title: "Resilient Harmony IL Transpilers & CodeMatcher Patterns",
      desc: "Write instruction-stream patches that survive C# compiler local-variable and closure shifts."
    },
    {
      part: "Part 5",
      title: "Deterministic Thunderstore CI/CD & Multi-OS Validation",
      desc: "Automated packaging, semantic version gates, and headless Dedicated Server smoke tests."
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
       CHAMBER 0: Demystifying Valheim 1.0 & The 3-Bucket Mod Taxonomy
       ====================================================================== */
    {
      id: "0",
      sprint: 1,
      sprintLabel: "Sprint 1 · 15-Min First Safe Win",
      numberLabel: "Chamber 0",
      shortTitle: "3-Bucket Taxonomy & Safety",
      title: "Demystifying Valheim 1.0 Modding & The 3-Bucket Mod Taxonomy",
      minutes: 2,
      timeBadge: "⏱️ 2 mins",
      liftBadge: "🟢 Low Cognitive Lift",
      safeStop: null,
      undoBadge: "↩️ 100% Read-Only Step",
      yieldNote: "Read-only orientation — zero files are modified on your PC in this step.",
      summary: "Before touching a terminal, lock in three truths: (1) Valheim has no VAC anti-cheat and your worlds/characters live in a separate AppData/.config folder this repo never touches; (2) 80% of Valheim mods are pure C# class libraries (~12 KB) that require zero Unity Editor install; and (3) every mod idea falls into one of three clear architectural buckets.",
      personaNotes: {
        P1: "If you come from Minecraft Forge/Fabric or Skyrim SKSE: Unity Doorstop is your loader, BepInEx 5.4.2202 is your mod lifecycle host, and HarmonyX (`0Harmony.dll`) is your runtime Mixin/bytecode hook engine.",
        P2: "Forget installing a 15 GB Unity Editor. A Valheim mod is a standard `net48` C# class library compiled via `dotnet build` against `assembly_valheim.dll`, injected at boot via `Harmony.CreateAndPatchAll()`.",
        P3: "You only need 15 minutes tonight to change your carry weight and add a custom in-game command. Nothing you do here can corrupt your worlds or characters.",
        P4: "Not sure what to build yet? Check the 3-Bucket table below—we start in Bucket 1 (Client-Only & QoL) where you get instant visual feedback in 60 seconds.",
        P5: "Upgrading from 0.217/0.218? BepInEx 5.4.2202 + HarmonyX is still the standard for Valheim 1.0.20, but watch for the 6 breaking API shifts in Chamber 4 (especially `Vector2s` and `SEMan.AddStatusEffect`)."
      },
      steps: [
        "Review the **Doorstop → BepInEx → HarmonyX → Valheim 1.0.20** boot pipeline in the Right Sightline diagram.",
        "Locate your mod idea in the **3-Bucket Mod Taxonomy** below so you know whether pure C# (`dotnet build`) is all you need.",
        "Pick your operating system (`🪟 Windows PowerShell` or `🐧 Linux / SteamOS Bash`) in the top Loadout Bar."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Bucket</th>
              <th>What You Can Build</th>
              <th>Unity Editor Needed?</th>
              <th>Multiplayer Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Bucket 1: Client-Only &amp; QoL</strong><br><code>80% of Starter Mods</code></td>
              <td>Carry weight, stamina, HUD clocks, UI sorting, hotkeys, camera zoom, audio filters, achievement guards.</td>
              <td><strong>No</strong> — Pure C# (<code>dotnet build</code>, ~12 KB DLL).</td>
              <td>Runs on your client; optional on servers unless server enforces mod list.</td>
            </tr>
            <tr>
              <td><strong>Bucket 2: Server-Synced &amp; Prefab Cloning</strong><br><code>Gameplay &amp; Balance</code></td>
              <td>Custom recipes, cloning &amp; re-statting existing Valheim weapons/monsters via <code>ObjectDB</code> &amp; <code>ZNetScene</code>, custom <code>ZRoutedRpc</code> events.</td>
              <td><strong>No</strong> — Pure C# cloning existing in-game prefabs at runtime.</td>
              <td>Must be installed on both Client and Dedicated Server (Chamber 5).</td>
            </tr>
            <tr>
              <td><strong>Bucket 3: Custom 3D Meshes &amp; Shaders</strong><br><code>AssetBundle Mods</code></td>
              <td>Brand-new 3D armor models, custom animations, custom terrain shaders, new audio banks.</td>
              <td><strong>Yes</strong> — Requires Unity Editor <code>2022.3.x</code> to pack an <code>AssetBundle</code> embedded into your C# DLL.</td>
              <td>Must be installed on all peers so <code>ZNetScene</code> hashes match.</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Chamber 0 Quick Sanity Check (PowerShell — Read-Only)
# Confirm where your Valheim saves live (completely separate from the Steam game directory):
Get-ChildItem "$env:USERPROFILE\\AppData\\LocalLow\\IronGate\\Valheim" | Select-Object Name, LastWriteTime`,
        linux: `# Chamber 0 Quick Sanity Check (Bash — Read-Only)
# Confirm where your Valheim saves live (completely separate from the Steam game directory):
ls -la "$HOME/.config/unity3d/IronGate/Valheim"`
      },
      expectedOutput: {
        win: `Name                LastWriteTime
----                -------------
characters_local    10/24/2026 7:15:00 PM
worlds_local        10/24/2026 7:15:00 PM
valheim.log         10/24/2026 7:14:22 PM
# Your characters and worlds live here — untouched by BepInEx or starter-mod builds.`,
        linux: `drwxr-xr-x characters_local
drwxr-xr-x worlds_local
-rw-r--r-- Player.log
# Your characters and worlds live here — untouched by BepInEx or starter-mod builds.`
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
      agentTask: "Read AGENTS.md and explain how the starter-mod/HelloValheimPlugin.cs maps to my mod idea using the 3-Bucket Mod Taxonomy.",
      onTrack: "You know which of the 3 buckets your goal falls into and can see that your Valheim save files live in AppData / .config outside the Steam install directory.",
      cliffEdge: {
        symptom: "Downloading a 15 GB Unity Editor or cloning a 2021 GitHub template that references torn/publicized DLLs that no longer compile.",
        cause: "Outdated guides tell beginners to set up full Unity scenes or legacy assembly publicizers before writing a single line of C#.",
        fix: "Stay in this repo's `starter-mod/` — it compiles directly against your installed Valheim 1.0.20 assemblies in 2 seconds with zero Unity Editor required."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "Inspect lines 11–52 of HelloValheimPlugin.cs: [BepInPlugin] metadata and BaseUnityPlugin.Awake() entry point.",
      diagramTitle: "Valheim 1.0.20 Runtime Injection Pipeline & 3-Bucket Boundary",
      diagramCaption: "Doorstop hooks the Mono runtime at launch, boots BepInEx 5.4.2202, and runs HarmonyX patches in memory—never modifying assembly_valheim.dll on disk.",
      svgDiagram: `<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Doorstop to BepInEx to Harmony pipeline">
        <defs>
          <linearGradient id="gBronze0" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#181C23"/>
            <stop offset="100%" stop-color="#212730"/>
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="668" height="238" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="28" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">BOOT PIPELINE (IN-MEMORY PATCHING — ZERO DISK MUTATION)</text>
        
        <rect x="20" y="42" width="142" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
        <text x="32" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">1. Unity Doorstop</text>
        <text x="32" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">Win: winhttp.dll</text>
        <text x="32" y="96" fill="#B6B0A6" font-family="monospace" font-size="11">Lin: libdoorstop.so</text>

        <path d="M 162 78 L 188 78" stroke="#D4A359" stroke-width="2"/>
        <polygon points="185,74 193,78 185,82" fill="#D4A359"/>

        <rect x="194" y="42" width="148" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
        <text x="206" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">2. BepInEx 5.4.2202</text>
        <text x="206" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">Loads plugins/*.dll</text>
        <text x="206" y="96" fill="#22C55E" font-family="monospace" font-size="11">Writes LogOutput.log</text>

        <path d="M 342 78 L 368 78" stroke="#D4A359" stroke-width="2"/>
        <polygon points="365,74 373,78 365,82" fill="#D4A359"/>

        <rect x="374" y="42" width="142" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
        <text x="386" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">3. HarmonyX</text>
        <text x="386" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">Prefix / Postfix</text>
        <text x="386" y="96" fill="#B6B0A6" font-family="monospace" font-size="11">DMD&lt;&gt; Detours</text>

        <path d="M 516 78 L 542 78" stroke="#22C55E" stroke-width="2"/>
        <polygon points="539,74 547,78 539,82" fill="#22C55E"/>

        <rect x="548" y="42" width="112" height="72" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
        <text x="558" y="63" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">4. Valheim 1.0</text>
        <text x="558" y="81" fill="#F3EFEA" font-family="monospace" font-size="11">Player / ZNet</text>
        <text x="558" y="96" fill="#B6B0A6" font-family="monospace" font-size="11">Saves Untouched</text>

        <text x="20" y="142" fill="#B6B0A6" font-family="monospace" font-size="11" font-weight="bold">THE 3-BUCKET MOD TAXONOMY</text>
        <rect x="20" y="152" width="204" height="76" rx="7" fill="#181C23" stroke="#22C55E"/>
        <text x="30" y="171" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">Bucket 1: Client-Only C#</text>
        <text x="30" y="188" fill="#F3EFEA" font-family="sans-serif" font-size="11">UI, Carry Weight, Camera, QoL</text>
        <text x="30" y="205" fill="#B6B0A6" font-family="monospace" font-size="11">Zero Unity Editor · ~12 KB DLL</text>

        <rect x="236" y="152" width="208" height="76" rx="7" fill="#181C23" stroke="#D4A359"/>
        <text x="246" y="171" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">Bucket 2: Server-Synced C#</text>
        <text x="246" y="188" fill="#F3EFEA" font-family="sans-serif" font-size="11">Prefab Cloning, ZDOs, ZRoutedRpc</text>
        <text x="246" y="205" fill="#B6B0A6" font-family="monospace" font-size="11">Zero Unity Editor · Client+Server</text>

        <rect x="456" y="152" width="204" height="76" rx="7" fill="#181C23" stroke="#F59E0B"/>
        <text x="466" y="171" fill="#F59E0B" font-family="sans-serif" font-size="12" font-weight="bold">Bucket 3: AssetBundles</text>
        <text x="466" y="188" fill="#F3EFEA" font-family="sans-serif" font-size="11">New 3D Models, Shaders, Audio</text>
        <text x="466" y="205" fill="#B6B0A6" font-family="monospace" font-size="11">Needs Unity 2022.3 AssetBundle</text>
      </svg>`,
      aiContext: "The user is in Chamber 0 learning how Doorstop -> BepInEx 5.4.2202 -> HarmonyX works in Valheim 1.0.20 and choosing between Bucket 1 (Client-Only C#), Bucket 2 (Server-Synced / Prefab Cloning), and Bucket 3 (Unity AssetBundles)."
    },

    /* ======================================================================
       CHAMBER 1: The 30-Second Preflight Check
       ====================================================================== */
    {
      id: "1",
      sprint: 1,
      sprintLabel: "Sprint 1 · 15-Min First Safe Win",
      numberLabel: "Chamber 1",
      shortTitle: "30s Preflight Doctor",
      title: "The 30-Second Preflight Check (doctor.ps1 / doctor.sh)",
      minutes: 3,
      timeBadge: "⏱️ 3 mins",
      liftBadge: "🟢 Low Cognitive Lift",
      safeStop: null,
      undoBadge: "↩️ Read-Only Preflight",
      yieldNote: "Ensure your Steam client is running in the background before launching Valheim or running preflight checks.",
      summary: "90% of 'my mod compiled but nothing happens in-game' failures happen BEFORE C# is ever reached: missing Doorstop hooks, Linux Steam Runtime container stripping (`#747`), CachyOS forcing Proton on a native shell script, or Steam not running in the background. Run our read-only `doctor` script to verify all 4 pillars in 5 seconds.",
      personaNotes: {
        P1: "This solves the #1 frustration from Discord ('WaitAMinute'): instead of guessing which folder r2modman, Gale, or Steam uses, `doctor` prints your exact active paths.",
        P2: "Think of `tools/doctor` as `flutter doctor` or `brew doctor` for Valheim 1.0.20: it checks `.NET SDK`, `assembly_valheim.dll`, `BepInEx 5.4.2202`, and Doorstop permissions.",
        P3: "Run the one command below. If all 4 checks print `[PASS]`, jump straight to Chamber 2.",
        P4: "Don't worry if a check shows `[WARN]`—the script prints the exact 1-line copy-paste fix right in your terminal.",
        P5: "On Linux (SteamOS / CachyOS / Arch) with Gale or native Steam? Check the FAQ-006 Linux table below for the `chmod +x start_game_bepinex.sh` and `LD_PRELOAD` container fixes."
      },
      steps: [
        "Ensure **Steam is running in the background** (Valheim's `SteamManager` exits immediately with code `1` if the Steam client isn't open).",
        "Run the read-only `doctor` command for your OS below.",
        "Confirm `[PASS]` on **Valheim Install**, **assembly_valheim.dll**, **BepInEx 5.4.2202**, and **.NET SDK**."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Doorstop Entry File</th>
              <th>Required Steam Launch Option</th>
              <th>The #1 Silent Vanilla Trap</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>🪟 Windows (Native)</strong></td>
              <td><code>winhttp.dll</code> + <code>doorstop_config.ini</code> in Valheim root</td>
              <td><code>-console</code></td>
              <td>Extracting <code>BepInExPack_Valheim</code> nested inside a subfolder instead of copying <code>winhttp.dll</code> next to <code>valheim.exe</code>.</td>
            </tr>
            <tr>
              <td><strong>🐧 Linux (Native ELF)</strong></td>
              <td><code>start_game_bepinex.sh</code> + <code>doorstop_libs/libdoorstop_x64.so</code></td>
              <td><code>./start_game_bepinex.sh %command% -console</code></td>
              <td>Clicking Steam <em>Play</em> without <code>./start_game_bepinex.sh %command%</code>, missing <code>chmod +x</code> (FAQ-006 Gale hiccup), or Valve Runtime <code>#747</code> stripping relative <code>LD_PRELOAD</code>.</td>
            </tr>
            <tr>
              <td><strong>🐧 Linux (Proton / Wine)</strong></td>
              <td><code>winhttp.dll</code> + <code>doorstop_config.ini</code></td>
              <td><code>WINEDLLOVERRIDES="winhttp=n,b" %command% -console</code></td>
              <td><strong>CachyOS Proton Collision:</strong> Forcing Proton compatibility while passing <code>start_game_bepinex.sh</code> (Linux <code>.so</code> cannot hook Windows <code>valheim.exe</code>).</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Run from the repository root in PowerShell:
powershell -ExecutionPolicy Bypass -File .\\tools\\doctor.ps1`,
        linux: `# Run from the repository root in Bash:
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
      codeTitle: "Linux FAQ-006: Fixing Gale / Native Doorstop Permissions in 5 Seconds",
      codeSnippet: `# If Linux boots vanilla with zero logs, ensure executable bits & absolute preload path:
chmod +x "$HOME/.local/share/Steam/steamapps/common/Valheim/start_game_bepinex.sh"
chmod +x "$HOME/.local/share/Steam/steamapps/common/Valheim/doorstop_libs"/*.so
# And in Steam -> Valheim -> Properties -> Launch Options:
./start_game_bepinex.sh %command% -console`,
      agentTask: "Run tools/doctor.sh (or tools/doctor.ps1 on Windows), inspect the output, and resolve any missing prerequisites before building.",
      onTrack: "The doctor script prints `[PASS]` on `.NET SDK`, `Valheim Directory`, and `assembly_valheim.dll`.",
      cliffEdge: {
        symptom: "Valheim launches cleanly to the main menu with zero errors, but no `[BepInEx 5.4.2202]` text appears in the top-left corner and `BepInEx/LogOutput.log` is never created.",
        cause: "On Linux, Steam launched `valheim.x86_64` without `./start_game_bepinex.sh %command%`, `start_game_bepinex.sh` lacked `+x` permission (`EACCES` fallback to vanilla), or Proton is forced on a Linux script. On Windows, `winhttp.dll` is not next to `valheim.exe`.",
        fix: "Windows: Place `winhttp.dll`, `doorstop_config.ini`, and `BepInEx/` directly inside the `Valheim/` folder. Linux Native: Run `chmod +x start_game_bepinex.sh` and set Steam Launch Options to `./start_game_bepinex.sh %command% -console` (with Steam Play Compatibility UNCHECKED)."
      },
      defaultInspectorTab: "csproj",
      inspectorHighlightNote: "Inspect lines 14–19 of HelloValheim.csproj: automatic $(ValheimDir) resolution across Windows and Linux.",
      diagramTitle: "Windows (winhttp.dll) vs. Linux (LD_PRELOAD & FAQ-006) File Tree",
      diagramCaption: "Why Linux Native requires ./start_game_bepinex.sh (+x) and why mixing Proton with Linux .so libraries silently boots vanilla.",
      svgDiagram: `<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Windows vs Linux BepInEx File Tree">
        <rect x="6" y="6" width="668" height="238" rx="10" fill="#111418" stroke="#2B323D"/>
        
        <rect x="18" y="20" width="314" height="210" rx="8" fill="#181C23" stroke="#D4A359"/>
        <text x="30" y="42" fill="#D4A359" font-family="sans-serif" font-size="14" font-weight="bold">🪟 Windows Valheim Root</text>
        <text x="30" y="64" fill="#F3EFEA" font-family="monospace" font-size="11">📁 steamapps/common/Valheim/</text>
        <text x="44" y="84" fill="#F3EFEA" font-family="monospace" font-size="11">├─ 🎮 valheim.exe</text>
        <text x="44" y="103" fill="#22C55E" font-family="monospace" font-size="11">├─ 🔑 winhttp.dll        (Doorstop Hook)</text>
        <text x="44" y="122" fill="#22C55E" font-family="monospace" font-size="11">├─ ⚙️ doorstop_config.ini</text>
        <text x="44" y="141" fill="#D4A359" font-family="monospace" font-size="11">├─ 📁 BepInEx/</text>
        <text x="62" y="159" fill="#B6B0A6" font-family="monospace" font-size="11">│  ├─ core/ (BepInEx.dll, 0Harmony.dll)</text>
        <text x="62" y="176" fill="#22C55E" font-family="monospace" font-size="11">│  ├─ plugins/HelloValheim.dll</text>
        <text x="62" y="193" fill="#F59E0B" font-family="monospace" font-size="11">│  └─ LogOutput.log</text>
        <text x="44" y="212" fill="#B6B0A6" font-family="monospace" font-size="11">└─ 📁 valheim_Data/Managed/</text>

        <rect x="348" y="20" width="314" height="210" rx="8" fill="#181C23" stroke="#D4A359"/>
        <text x="360" y="42" fill="#D4A359" font-family="sans-serif" font-size="14" font-weight="bold">🐧 Linux / SteamOS Valheim Root</text>
        <text x="360" y="64" fill="#F3EFEA" font-family="monospace" font-size="11">📁 steamapps/common/Valheim/</text>
        <text x="374" y="84" fill="#F3EFEA" font-family="monospace" font-size="11">├─ 🎮 valheim.x86_64     (Native ELF)</text>
        <text x="374" y="103" fill="#22C55E" font-family="monospace" font-size="11">├─ 🚀 start_game_bepinex.sh (MUST be +x)</text>
        <text x="374" y="122" fill="#22C55E" font-family="monospace" font-size="11">├─ 📁 doorstop_libs/libdoorstop_x64.so</text>
        <text x="374" y="141" fill="#D4A359" font-family="monospace" font-size="11">├─ 📁 BepInEx/plugins/HelloValheim.dll</text>
        <rect x="362" y="156" width="286" height="62" rx="6" fill="#212730" stroke="#EF4444"/>
        <text x="372" y="174" fill="#EF4444" font-family="sans-serif" font-size="11" font-weight="bold">⚠️ FAQ-006 Linux / CachyOS Guard:</text>
        <text x="372" y="191" fill="#F3EFEA" font-family="monospace" font-size="11">Launch Opt: ./start_game_bepinex.sh %command%</text>
        <text x="372" y="207" fill="#EF4444" font-family="monospace" font-size="11">Uncheck "Force Steam Play (Proton)" for Native!</text>
      </svg>`,
      aiContext: "The user is in Chamber 1 running tools/doctor.ps1 or tools/doctor.sh to verify .NET SDK, Valheim install directory, assembly_valheim.dll, and Doorstop/BepInEx hooks (winhttp.dll on Windows vs start_game_bepinex.sh and FAQ-006 on Linux)."
    },

    /* ======================================================================
       CHAMBER 2: Clone & First Compile in 60 Seconds
       ====================================================================== */
    {
      id: "2",
      sprint: 1,
      sprintLabel: "Sprint 1 · 15-Min First Safe Win",
      numberLabel: "Chamber 2",
      shortTitle: "Compile in 60 Seconds",
      title: "Clone & First Compile in 60 Seconds (HelloValheim.dll)",
      minutes: 4,
      timeBadge: "⏱️ 4 mins",
      liftBadge: "🟢 Low Cognitive Lift",
      safeStop: "✓ Safe Checkpoint #1 (Compiled Cleanly)",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "Every game <Reference> in HelloValheim.csproj must keep <Private>false</Private> so Unity DLLs are never copied into BepInEx/plugins/.",
      summary: "Now we compile `starter-mod/HelloValheim.csproj` against your real local Valheim 1.0.20 assemblies (`assembly_valheim.dll` and `assembly_utils.dll`). Our build script verifies that `<Private>false</Private>` kept your output folder 100% free of leaked Unity DLLs and deploys a single ~12 KB `HelloValheim.dll` into `BepInEx/plugins/HelloValheim/`.",
      personaNotes: {
        P1: "Notice how `HelloValheim.csproj` references `$(ValheimDir)/valheim_Data/Managed/assembly_valheim.dll` directly—no broken NuGet packages from 2022.",
        P2: "Standard MSBuild SDK project targeting `net48` with `LangVersion 12.0`. Every `<Reference>` has `<Private>false</Private>` (equivalent to `compileOnly` in Gradle).",
        P3: "Just run the single `build-and-deploy` command below—it compiles AND installs the mod into Valheim in one shot.",
        P4: "This is your first milestone! When you see `0 Warning(s), 0 Error(s)` and `HelloValheim.dll (~12 KB)`, you have officially built a Valheim 1.0.20 mod.",
        P5: "Note that `assembly_utils.dll` is referenced alongside `assembly_valheim.dll` because Valheim 1.0 moved `Vector2s` and several helpers into `assembly_utils`."
      },
      steps: [
        "Run the `build-and-deploy` script for your OS below (or run `dotnet build starter-mod/HelloValheim.csproj -c Release`).",
        "Confirm the build prints **`0 Warning(s)`**, **`0 Error(s)`**, and outputs **only `HelloValheim.dll` (~12 KB)**.",
        "If you need to call it a night after this step, this is **✓ Safe Checkpoint #1**—your mod is built and staged safely."
      ],
      tableHtml: "",
      commands: {
        win: `# Compile HelloValheim.dll and deploy to BepInEx/plugins/HelloValheim/:
powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1

# (Optional) Verify only 1 DLL exists in the output directory:
Get-ChildItem .\\starter-mod\\bin\\Release\\*.dll | Select-Object Name, Length`,
        linux: `# Compile HelloValheim.dll and deploy to BepInEx/plugins/HelloValheim/:
bash ./tools/build-and-deploy.sh

# (Optional) Verify only 1 DLL exists in the output directory:
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
      codeTitle: "The <Private>false</Private> Clean Build Gate in HelloValheim.csproj",
      codeSnippet: `<ItemGroup>
  <Reference Include="assembly_valheim">
    <HintPath>$(ManagedDir)/assembly_valheim.dll</HintPath>
    <!-- NEVER omit <Private>false</Private> or MSBuild copies game DLLs into plugins/ -->
    <Private>false</Private>
  </Reference>
  <Reference Include="assembly_utils">
    <HintPath>$(ManagedDir)/assembly_utils.dll</HintPath>
    <Private>false</Private>
  </Reference>
</ItemGroup>`,
      agentTask: "Build starter-mod/HelloValheim.csproj in Release mode, verify 0 warnings/errors, and confirm zero UnityEngine or 0Harmony DLLs leaked into bin/Release/.",
      onTrack: "`bin/Release/` contains exactly ONE `.dll` file (`HelloValheim.dll`, ~12 KB), and `build-and-deploy` reports `[PASS]`.",
      cliffEdge: {
        symptom: "`bin/Release/` (and `BepInEx/plugins/`) ends up with 15+ files including `UnityEngine.dll`, `0Harmony.dll`, and `assembly_valheim.dll`, causing `TypeLoadException` or black-screen crashes on boot.",
        cause: "`<Private>false</Private>` was omitted on a `<Reference>` in `.csproj`, causing MSBuild to copy Valheim's engine binaries into `BepInEx/plugins/` where BepInEx tries to load them a second time.",
        fix: "Ensure every `<Reference>` in `HelloValheim.csproj` includes `<Private>false</Private>`, then run `dotnet clean && dotnet build -c Release`."
      },
      defaultInspectorTab: "csproj",
      inspectorHighlightNote: "Inspect lines 22–47 of HelloValheim.csproj: every <Reference> enforces <Private>false</Private>.",
      diagramTitle: "The <Private>false</Private> Clean Build Gate",
      diagramCaption: "Why copying UnityEngine.dll or 0Harmony.dll into BepInEx/plugins/ causes duplicate assembly TypeLoadExceptions.",
      svgDiagram: `<svg viewBox="0 0 680 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Private false clean build gate">
        <rect x="6" y="6" width="668" height="228" rx="10" fill="#111418" stroke="#2B323D"/>
        
        <rect x="20" y="22" width="308" height="196" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
        <text x="34" y="46" fill="#22C55E" font-family="sans-serif" font-size="14" font-weight="bold">✓ WITH &lt;Private&gt;false&lt;/Private&gt;</text>
        <text x="34" y="68" fill="#F3EFEA" font-family="monospace" font-size="11">bin/Release/</text>
        <rect x="44" y="80" width="260" height="36" rx="6" fill="#212730" stroke="#22C55E"/>
        <text x="56" y="102" fill="#F3EFEA" font-family="monospace" font-size="12" font-weight="bold">📄 HelloValheim.dll (12 KB)</text>
        <text x="34" y="140" fill="#B6B0A6" font-family="sans-serif" font-size="11">• Zero duplicate engine assemblies</text>
        <text x="34" y="160" fill="#B6B0A6" font-family="sans-serif" font-size="11">• Instant load in BepInEx/plugins/</text>
        <text x="34" y="180" fill="#B6B0A6" font-family="sans-serif" font-size="11">• Ready for Thunderstore packaging</text>

        <rect x="352" y="22" width="308" height="196" rx="8" fill="#181C23" stroke="#EF4444" stroke-width="1.5"/>
        <text x="366" y="46" fill="#EF4444" font-family="sans-serif" font-size="14" font-weight="bold">✕ WITHOUT &lt;Private&gt;false&lt;/Private&gt;</text>
        <text x="366" y="68" fill="#EF4444" font-family="monospace" font-size="11">bin/Release/ (15+ Leaked DLLs!)</text>
        <text x="376" y="90" fill="#F3EFEA" font-family="monospace" font-size="11">├─ HelloValheim.dll</text>
        <text x="376" y="107" fill="#EF4444" font-family="monospace" font-size="11">├─ UnityEngine.dll          (POLLUTION)</text>
        <text x="376" y="124" fill="#EF4444" font-family="monospace" font-size="11">├─ 0Harmony.dll             (POLLUTION)</text>
        <text x="376" y="141" fill="#EF4444" font-family="monospace" font-size="11">└─ assembly_valheim.dll     (6.5 MB!)</text>
        <text x="366" y="172" fill="#B6B0A6" font-family="sans-serif" font-size="11">Result: BepInEx loads two copies of</text>
        <text x="366" y="189" fill="#B6B0A6" font-family="sans-serif" font-size="11">Harmony/Unity -&gt; TypeLoadException crash!</text>
      </svg>`,
      aiContext: "The user is in Chamber 2 compiling starter-mod/HelloValheim.csproj with dotnet build and deploying HelloValheim.dll via build-and-deploy."
    },

    /* ======================================================================
       CHAMBER 3: Seeing Your Code Inside Valheim (15-Min Sprint Complete!)
       ====================================================================== */
    {
      id: "3",
      sprint: 1,
      sprintLabel: "Sprint 1 · 15-Min First Safe Win",
      numberLabel: "Chamber 3",
      shortTitle: "See Your Code In-Game",
      title: "Seeing Your Code Inside Valheim (LogOutput.log & F5 Console)",
      minutes: 5,
      timeBadge: "⏱️ 5 mins",
      liftBadge: "🟢 Low Cognitive Lift",
      safeStop: "✓ Safe Checkpoint #2 (15-Min First Win Complete!)",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "On Linux/SteamOS, launch via ./start_game_bepinex.sh %command% -console (clicking Steam Play without it skips BepInEx under Valve Runtime #747).",
      summary: "Time for the payoff! We verify your mod in two ways: first in the terminal by grepping `BepInEx/LogOutput.log` for `[HelloValheim 1.0.0]`, and second inside Valheim's main menu by pressing `F5` and running your custom `vikingping` console command.",
      personaNotes: {
        P1: "`BepInEx/LogOutput.log` is your single source of truth—just like `latest.log` in Minecraft. Always verify there before spawning into a world.",
        P2: "You can verify load state in 2 seconds via CLI (`Select-String` / `grep`) without even clicking through the main menu UI.",
        P3: "Boot Valheim, press `F5` at the main menu, type `vikingping`, and see your cyan `[HelloValheim 1.0.0] Pong! Active carry bonus: +150` banner!",
        P4: "Congratulations! Once you see `vikingping` reply in the `F5` console, you have completed the 15-Minute First Safe Win.",
        P5: "Notice how `Terminal.InitTerminal` Postfix registers both `vikingping` and `vikinginspect` so your diagnostic commands are available right at the main menu."
      },
      steps: [
        "Launch Valheim through Steam (with `-console` in Launch Options).",
        "At the main menu, press **`F5`** to open the developer console and type **`vikingping`**.",
        "Run the log-check command below in your terminal to see your startup banner inside `BepInEx/LogOutput.log`.",
        "🎉 **15-Minute Sprint Complete!** You can stop right here with a working mod, or continue to Sprint 2 to master stack traces, Harmony hooks, and live `.cfg` hot-reload."
      ],
      tableHtml: "",
      commands: {
        win: `# Inspect BepInEx/LogOutput.log for your mod's startup banner (PowerShell):
Select-String -Path "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\BepInEx\\LogOutput.log" -Pattern "HelloValheim|BepInEx 5.4"`,
        linux: `# Inspect BepInEx/LogOutput.log for your mod's startup banner (Bash):
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
      codeTitle: "Registering Custom F5 Console Commands (Terminal.InitTerminal)",
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
      agentTask: "Verify that BepInEx/LogOutput.log contains '[HelloValheim 1.0.0] Ready on Valheim 1.0.20!' and confirm the F5 console command registration.",
      onTrack: "`LogOutput.log` prints `Loading [HelloValheim 1.0.0]` and typing `vikingping` in the `F5` console prints `[HelloValheim 1.0.0] Pong! Active carry bonus: +150`.",
      cliffEdge: {
        symptom: "Pressing `F5` in-game does nothing (the console window does not open).",
        cause: "`-console` is missing from Steam's Launch Options for Valheim.",
        fix: "In Steam -> Right-click Valheim -> Properties -> General -> Launch Options, append `-console` (Windows: `-console`; Linux: `./start_game_bepinex.sh %command% -console`)."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "Inspect lines 79–106 of HelloValheimPlugin.cs: Terminal.InitTerminal Postfix registering 'vikingping' and 'vikinginspect'.",
      diagramTitle: "In-Game F5 Console & LogOutput.log Dual Sightline",
      diagramCaption: "What you see on screen at the main menu and in BepInEx/LogOutput.log when Chamber 3 succeeds.",
      svgDiagram: `<svg viewBox="0 0 680 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="In-game F5 console and LogOutput sightline">
        <rect x="6" y="6" width="668" height="228" rx="10" fill="#111418" stroke="#2B323D"/>
        <rect x="20" y="20" width="640" height="92" rx="8" fill="#181C23" stroke="#D4A359" stroke-width="1.5"/>
        <text x="34" y="41" fill="#D4A359" font-family="monospace" font-size="12" font-weight="bold">BepInEx 5.4.2202 - Valheim 1.0.20 (Top-Left Main Menu Overlay)</text>
        <rect x="34" y="50" width="612" height="50" rx="5" fill="#111418" stroke="#2B323D"/>
        <text x="44" y="69" fill="#B6B0A6" font-family="monospace" font-size="11">&gt; vikingping</text>
        <text x="44" y="88" fill="#22C55E" font-family="monospace" font-size="12" font-weight="bold">[HelloValheim 1.0.0] Pong! Active carry bonus: +150 (Mod Enabled: True)</text>

        <rect x="20" y="124" width="640" height="96" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
        <text x="34" y="145" fill="#22C55E" font-family="monospace" font-size="12" font-weight="bold">📄 BepInEx/LogOutput.log (Real-Time File Tail)</text>
        <text x="34" y="166" fill="#B6B0A6" font-family="monospace" font-size="11">[Message:   BepInEx] BepInEx 5.4.2202 - valheim</text>
        <text x="34" y="184" fill="#F3EFEA" font-family="monospace" font-size="11">[Info   :   BepInEx] Loading [HelloValheim 1.0.0]</text>
        <text x="34" y="202" fill="#22C55E" font-family="monospace" font-size="11">[Info   :HelloValheim] [HelloValheim 1.0.0] Ready on Valheim 1.0.20! BonusCarry=+150</text>
      </svg>`,
      aiContext: "The user is in Chamber 3 verifying HelloValheim in-game via the F5 console command 'vikingping' and checking BepInEx/LogOutput.log."
    },

    /* ======================================================================
       CHAMBER 3.5: Troubleshooting, 1.0.20 Stack Traces & IDE Debugging
       ====================================================================== */
    {
      id: "3.5",
      sprint: 2,
      sprintLabel: "Sprint 2 · Real Mod Engineering",
      numberLabel: "Chamber 3.5",
      shortTitle: "Stack Traces & Debugger",
      title: "Troubleshooting, 1.0.20 Stack Traces & IDE Breakpoint Debugging",
      minutes: 7,
      timeBadge: "⏱️ 7 mins",
      liftBadge: "🟡 Medium Cognitive Lift",
      safeStop: null,
      undoBadge: "↩️ Undo: debug_enabled = false",
      yieldNote: "Player.m_localPlayer is null at the Main Menu and during world loading—always guard patches with if (Player.m_localPlayer == null) return;.",
      summary: "Before writing deeper Harmony hooks, learn how to read a Valheim crash in 10 seconds. When Harmony patches a method like `Player.GetMaxCarryWeight`, Mono compiles a Dynamic Method Wrapper shown in stack traces as `DMD<Player::GetMaxCarryWeight>`. You can also guards hooks with `[HarmonyFinalizer]` and attach Rider / VS / VS Code breakpoints directly to live Valheim on `127.0.0.1:10000`.",
      personaNotes: {
        P1: "Ever had 40 mods installed and wondered *which* mod caused a `NullReferenceException`? Look for `DMD<Class::Method>` and the wrapper frame right above it in `LogOutput.log`!",
        P2: "Doorstop includes a built-in Mono soft-debugger server (`debug_enabled = true`, `127.0.0.1:10000`). You can step through live Valheim frames in JetBrains Rider or VS Code.",
        P3: "Even if you never attach a debugger, knowing the `if (Player.m_localPlayer == null) return;` rule prevents 95% of beginner crashes.",
        P4: "Try typing `vikinginspect` in the `F5` console at the main menu versus inside a world—watch how `Player.m_localPlayer` transitions from `null` to `Spawned`!",
        P5: "When diagnosing broken 0.217 mods on 1.0.20, `TypeLoadException` or `AmbiguousMatchException` appears during `Harmony.CreateAndPatchAll`, while `DMD<>` frames show runtime hook crashes."
      },
      steps: [
        "Study the **Annotated `DMD<Player::GetMaxCarryWeight>` Stack Trace** in the table and Sightline diagram.",
        "Run **`vikinginspect`** in the `F5` console at the main menu (where `Player.m_localPlayer` is `null`) and again after loading into a world.",
        "Review how `[HarmonyFinalizer]` in `PlayerCarryWeightPatch` traps exceptions so a buggy patch logs cleanly instead of freezing the player update loop.",
        "*(Optional Pro Setup)* Flip `debug_enabled = true` in `doorstop_config.ini` to attach Rider, Visual Studio, or VS Code on `127.0.0.1:10000`."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Stack Trace Frame / Token</th>
              <th>What It Means in Plain English</th>
              <th>Your Immediate Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>(wrapper dynamic-method) Player.DMD&lt;Player::GetMaxCarryWeight&gt;(Player)</code></td>
              <td><strong>Smoking Gun:</strong> <code>DMD&lt;...&gt;</code> proves at least one Harmony patch modified <code>Player.GetMaxCarryWeight</code>.</td>
              <td>Look at the frame immediately above <code>DMD&lt;&gt;</code> to see the exact plugin method that threw.</td>
            </tr>
            <tr>
              <td><code>at HelloValheim.PlayerCarryWeightPatch.Postfix(...)</code></td>
              <td>Your plugin's Postfix threw the exception (almost always an unguarded <code>null</code> reference during scene load).</td>
              <td>Add <code>if (__instance == null || Player.m_localPlayer == null) return;</code> at the top of the patch.</td>
            </tr>
            <tr>
              <td><code>HarmonyLib.HarmonyException: Ambiguous match for patch method...</code></td>
              <td>Valheim 1.0.20 added a new overload (e.g., <code>PieceTable.SetCategory(PieceCategory)</code>).</td>
              <td>Pass explicit parameter types in <code>[HarmonyPatch(nameof(Method), typeof(int))]</code> (see Chamber 4).</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Search LogOutput.log for Exceptions, DMD<> detours, or FaultGuard hits (PowerShell):
Select-String -Path "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\BepInEx\\LogOutput.log" -Pattern "Exception|DMD<|FaultGuard" -Context 2,4`,
        linux: `# Search LogOutput.log for Exceptions, DMD<> detours, or FaultGuard hits (Bash):
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
      codeTitle: "Fault Isolation with [HarmonyFinalizer] & Doorstop Debugger Config",
      codeSnippet: `// 1. Defensive Finalizer in HelloValheimPlugin.cs:
[HarmonyFinalizer]
private static Exception? Finalizer(Exception? __exception)
{
    if (__exception != null)
        HelloValheimPlugin.Log.LogError($"[FaultGuard] Trapped in GetMaxCarryWeight: {__exception}");
    return null; // Returning null swallows the exception so Valheim's Update() loop survives!
}

// 2. Attach Rider / VS Code Breakpoints (doorstop_config.ini):
// [UnityMono]
// debug_enabled = true
// debug_address = 127.0.0.1:10000
// debug_suspend = false`,
      agentTask: "Inspect LogOutput.log for any DMD<> stack trace frames or exceptions, and verify that PlayerCarryWeightPatch includes null guards and a [HarmonyFinalizer].",
      onTrack: "You can spot `DMD<Class::Method>` in any stack trace, and `vikinginspect` cleanly reports `LocalPlayer=null` at the main menu without throwing.",
      cliffEdge: {
        symptom: "`NullReferenceException` floods `LogOutput.log` 60 times per second at the Valheim main menu before any character loads into a world.",
        cause: "Your patch accessed `Player.m_localPlayer` or `ZNet.instance` without checking for `null` during the main-menu / scene-transition state.",
        fix: "Always guard with `if (Player.m_localPlayer == null) return;` (or `if (__instance == null) return;`) at the first line of your Harmony patch."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "Inspect lines 93–133 of HelloValheimPlugin.cs: 'vikinginspect' command and [HarmonyFinalizer] fault isolation.",
      diagramTitle: "Decoding a Harmony DMD<> Stack Trace & Port 10000 Mono Debugger",
      diagramCaption: "How to read a Harmony dynamic-method frame in 5 seconds and where Doorstop exposes the Mono soft debugger.",
      svgDiagram: `<svg viewBox="0 0 680 245" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Annotated DMD stack trace and debugger">
        <rect x="6" y="6" width="668" height="233" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="27" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">ANNOTATED VALHEIM 1.0.20 STACK TRACE (BepInEx/LogOutput.log)</text>
        
        <rect x="20" y="36" width="640" height="114" rx="8" fill="#181C23" stroke="#EF4444"/>
        <text x="30" y="56" fill="#EF4444" font-family="monospace" font-size="11">[Error  : Unity Log] NullReferenceException: Object reference not set to an instance</text>
        
        <rect x="26" y="64" width="628" height="24" rx="4" fill="#212730" stroke="#EF4444"/>
        <text x="34" y="80" fill="#EF4444" font-family="monospace" font-size="11">1. at MyBrokenMod.CarryPatch.Postfix () [0x00007]  &lt;-- 🎯 CULPRIT MOD &amp; METHOD</text>

        <rect x="26" y="92" width="628" height="24" rx="4" fill="#212730" stroke="#D4A359"/>
        <text x="34" y="108" fill="#D4A359" font-family="monospace" font-size="11">2. at (wrapper dynamic-method) Player.DMD&lt;Player::GetMaxCarryWeight&gt;(Player) &lt;-- 🔍 HARMONY HOOKED</text>

        <text x="34" y="136" fill="#B6B0A6" font-family="monospace" font-size="11">3. at InventoryGui.UpdateInventory (Player player) [0x00042] &lt;-- Vanilla Caller</text>

        <rect x="20" y="160" width="312" height="66" rx="7" fill="#181C23" stroke="#22C55E"/>
        <text x="32" y="180" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">🛡️ Layer 1: [HarmonyFinalizer]</text>
        <text x="32" y="197" fill="#F3EFEA" font-family="monospace" font-size="11">Catches __exception &amp; returns null</text>
        <text x="32" y="213" fill="#B6B0A6" font-family="monospace" font-size="11">Player loop never freezes on error</text>

        <rect x="348" y="160" width="312" height="66" rx="7" fill="#181C23" stroke="#D4A359"/>
        <text x="360" y="180" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">🐞 Layer 2: IDE Live Breakpoints</text>
        <text x="360" y="197" fill="#F3EFEA" font-family="monospace" font-size="11">doorstop_config.ini: debug_enabled=true</text>
        <text x="360" y="213" fill="#B6B0A6" font-family="monospace" font-size="11">Attach Rider / VS Code -&gt; 127.0.0.1:10000</text>
      </svg>`,
      aiContext: "The user is in Chamber 3.5 learning how to read DMD<Class::Method> Harmony stack traces in BepInEx/LogOutput.log, prevent Player.m_localPlayer == null scene-transition NREs, use [HarmonyFinalizer], and attach Rider/VS Code to Doorstop's Mono debugger on 127.0.0.1:10000."
    },

    /* ======================================================================
       CHAMBER 4: Harmony Prefix, Postfix & The 6 Valheim 1.0.20 Breaking Shifts
       ====================================================================== */
    {
      id: "4",
      sprint: 2,
      sprintLabel: "Sprint 2 · Real Mod Engineering",
      numberLabel: "Chamber 4",
      shortTitle: "Harmony & 1.0.20 Shifts",
      title: "Harmony Prefix, Postfix & The 6 Valheim 1.0.20 Breaking Shifts",
      minutes: 8,
      timeBadge: "⏱️ 8 mins",
      liftBadge: "🟡 Medium Cognitive Lift",
      safeStop: null,
      undoBadge: "↩️ Undo: EnableMod = false",
      yieldNote: "In Valheim 1.0.20, overloaded methods like PieceTable.SetCategory require explicit typeof(...) parameter types in [HarmonyPatch] to avoid AmbiguousMatchException.",
      summary: "Harmony gives you two surgical hooks: `[HarmonyPrefix]` (runs BEFORE a game method; can modify inputs or skip the original) and `[HarmonyPostfix]` (runs AFTER; modifies `ref __result`). Here we inspect our `Player.GetMaxCarryWeight` and `Achievements.IsCheatedAtAll` patches and lock in the **6 Valheim 1.0.20 Breaking Shifts Cheat Sheet** validated across 51 production mods.",
      personaNotes: {
        P1: "If a tutorial from 2022/2023 fails to compile or throws `AmbiguousMatchException` on Valheim 1.0.20, the 6-Shift Cheat Sheet table below tells you why in 5 seconds.",
        P2: "Notice the parameter conventions injected by HarmonyX at runtime: `__instance` (the `this` reference), `ref __result` (the return value), and `__state` (scoped data passed from Prefix to Postfix).",
        P3: "Look at `PlayerCarryWeightPatch` in the code box: just 4 lines of C# (`__result += CarryWeightBonus.Value;`) adds `+150` carry weight to your Viking!",
        P4: "Notice `AchievementsSafetyPatch` right below it: by setting `__result = false` on `Achievements.IsCheatedAtAll`, you never lose Steam achievements while experimenting with console commands.",
        P5: "Bookmark the **6 Valheim 1.0.20 Architectural Shifts** table below—this single table resolves 95% of 0.217 -> 1.0.20 breakages (`PartyRock`, `LicenseToSkill`, `SearsCatalog`, `Silence`, `Recipedia`, `PaperTrail`)."
      },
      steps: [
        "Examine `PlayerCarryWeightPatch` (`[HarmonyPostfix]` modifying `ref float __result` on `Player.GetMaxCarryWeight`).",
        "Examine `AchievementsSafetyPatch` (`[HarmonyPostfix]` on `Achievements.IsCheatedAtAll` keeping Steam achievements enabled).",
        "Review the **6 Valheim 1.0.20 Breaking Shifts Cheat Sheet** below before writing hooks against `ZDOMan`, `SEMan`, `PieceTable`, `Chat`, `InventoryGui`, or `FileHelpers`."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Subsystem &amp; Target API</th>
              <th>Legacy Pre-1.0 (0.217/0.218)</th>
              <th>Valheim 1.0.20 (Deep North) Ground Truth</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1</strong></td>
              <td><strong>Spatial Sectors</strong><br><code>ZDOMan.FindSectorObjects</code></td>
              <td><code>(Vector2i sector, int area, int distantArea, ...)</code><br><code>RPC_ZDOData</code> local ZDO at <code>V_13</code></td>
              <td><code>(Vector2s sector, SimulationDistance dist, ...)</code> (in <code>assembly_utils.dll</code>).<br><code>RPC_ZDOData</code> ZDO shifted to <code>V_12</code>.</td>
            </tr>
            <tr>
              <td><strong>2</strong></td>
              <td><strong>Status Effects</strong><br><code>SEMan.AddStatusEffect</code></td>
              <td>4 parameters:<br><code>(int nameHash, bool reset, int level, float skill)</code></td>
              <td><strong>5 parameters</strong> (added <code>short variant = 0</code>):<br><code>typeof(int), typeof(bool), typeof(int), typeof(float), typeof(short)</code></td>
            </tr>
            <tr>
              <td><strong>3</strong></td>
              <td><strong>Overload Ambiguity</strong><br><code>PieceTable.SetCategory</code></td>
              <td>Single method:<br><code>SetCategory(int index)</code></td>
              <td>Added <code>SetCategory(Piece.PieceCategory)</code>. Bare <code>[HarmonyPatch("SetCategory")]</code> throws <code>AmbiguousMatchException</code> — always pass <code>typeof(int)</code>!</td>
            </tr>
            <tr>
              <td><strong>4</strong></td>
              <td><strong>Compiler Closures</strong><br><code>Chat.OnNewChatMessage</code></td>
              <td>Anonymous lambda:<br><code>&lt;OnNewChatMessage&gt;b__0</code></td>
              <td>Local function:<br><code>&lt;OnNewChatMessage&gt;g__OnCheckPermissionAsyncCompleted|0</code></td>
            </tr>
            <tr>
              <td><strong>5</strong></td>
              <td><strong>UI &amp; Input</strong><br><code>InventoryGui</code></td>
              <td><code>Show(Container)</code><br>Inline <code>ZInput.GetButton("Use")</code></td>
              <td><code>Show(Container, int activeGroup = 1)</code><br>Extracted to <code>InventoryGui.UseButtonHeld()</code></td>
            </tr>
            <tr>
              <td><strong>6</strong></td>
              <td><strong>Early Boot Save Path</strong><br><code>Utils.GetSaveDataPath</code></td>
              <td>Safe inside <code>Awake()</code></td>
              <td>Calls <code>PlatformManager.DistributionPlatform</code> which is <code>null</code> in <code>Awake()</code>! Wrap in <code>try/catch</code> with fallback to <code>Utils.persistantDataPath</code>.</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Rebuild after customizing a Harmony patch in starter-mod/HelloValheimPlugin.cs:
powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1`,
        linux: `# Rebuild after customizing a Harmony patch in starter-mod/HelloValheimPlugin.cs:
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
      codeTitle: "Harmony Postfix Modifying Return Value (ref float __result)",
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
      agentTask: "Help me add or customize a Harmony patch in starter-mod/HelloValheimPlugin.cs while strictly following the 6 Valheim 1.0.20 breaking shift rules.",
      onTrack: "In-game carry weight shows `450` (`300` base + `150` bonus) in your inventory screen and via `vikinginspect`.",
      cliffEdge: {
        symptom: "`AmbiguousMatchException` on `Harmony.CreateAndPatchAll` or `MissingMethodException` when copying a snippet from an older tutorial or free LLM.",
        cause: "You patched an overloaded 1.0.20 method (`PieceTable.SetCategory` or `SEMan.AddStatusEffect`) without specifying the exact `1.0.20` parameter `typeof(...)` array.",
        fix: "Always include explicit parameter types in `[HarmonyPatch(nameof(Class.Method), new[] { typeof(...) })]` and use the 1-Click Self-Tap AI Prompt so your LLM has the 1.0.20 ground truth."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "Inspect lines 108–146 of HelloValheimPlugin.cs: PlayerCarryWeightPatch and AchievementsSafetyPatch.",
      diagramTitle: "Harmony Prefix / Postfix Execution & The 6 Valheim 1.0.20 Shifts",
      diagramCaption: "How Prefix, Original Method, Postfix, and Finalizer wrap a Valheim method—plus the 6 signature shifts from 0.218 to 1.0.20.",
      svgDiagram: `<svg viewBox="0 0 680 245" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Harmony Prefix Postfix and 1.0.20 shifts">
        <rect x="6" y="6" width="668" height="233" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="27" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">HARMONY DMD&lt;Player::GetMaxCarryWeight&gt; EXECUTION PIPELINE</text>

        <rect x="20" y="38" width="145" height="64" rx="7" fill="#181C23" stroke="#D4A359"/>
        <text x="30" y="58" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">[HarmonyPrefix]</text>
        <text x="30" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">Runs BEFORE original</text>
        <text x="30" y="90" fill="#B6B0A6" font-family="monospace" font-size="11">return false = skip</text>

        <path d="M 165 70 L 185 70" stroke="#D4A359" stroke-width="2"/>
        <polygon points="182,66 190,70 182,74" fill="#D4A359"/>

        <rect x="191" y="38" width="145" height="64" rx="7" fill="#181C23" stroke="#D4A359"/>
        <text x="201" y="58" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">Original Method</text>
        <text x="201" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">GetMaxCarryWeight()</text>
        <text x="201" y="90" fill="#B6B0A6" font-family="monospace" font-size="11">__result = 300f</text>

        <path d="M 336 70 L 356 70" stroke="#D4A359" stroke-width="2"/>
        <polygon points="353,66 361,70 353,74" fill="#D4A359"/>

        <rect x="362" y="38" width="145" height="64" rx="7" fill="#181C23" stroke="#D4A359"/>
        <text x="372" y="58" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">[HarmonyPostfix]</text>
        <text x="372" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">__result += 150f;</text>
        <text x="372" y="90" fill="#B6B0A6" font-family="monospace" font-size="11">Returns 450f!</text>

        <path d="M 507 70 L 527 70" stroke="#22C55E" stroke-width="2"/>
        <polygon points="524,66 532,70 524,74" fill="#22C55E"/>

        <rect x="533" y="38" width="127" height="64" rx="7" fill="#181C23" stroke="#22C55E"/>
        <text x="543" y="58" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">[Finalizer]</text>
        <text x="543" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">try / catch guard</text>
        <text x="543" y="90" fill="#22C55E" font-family="monospace" font-size="11">Traps any throw</text>

        <text x="20" y="124" fill="#F59E0B" font-family="monospace" font-size="11" font-weight="bold">6 VALHEIM 1.0.20 BREAKING API SHIFTS (QUICK RADAR)</text>
        <rect x="20" y="132" width="206" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
        <text x="28" y="150" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">1. Vector2i -&gt; Vector2s</text>
        <text x="28" y="166" fill="#B6B0A6" font-family="monospace" font-size="11">ZDOMan.FindSectorObjects</text>

        <rect x="236" y="132" width="208" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
        <text x="244" y="150" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">2. AddStatusEffect +short</text>
        <text x="244" y="166" fill="#B6B0A6" font-family="monospace" font-size="11">5th param: Int16 variant</text>

        <rect x="454" y="132" width="206" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
        <text x="462" y="150" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">3. SetCategory Overload</text>
        <text x="462" y="166" fill="#B6B0A6" font-family="monospace" font-size="11">int vs Piece.PieceCategory</text>

        <rect x="20" y="184" width="206" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
        <text x="28" y="202" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">4. Closure Lowering</text>
        <text x="28" y="218" fill="#B6B0A6" font-family="monospace" font-size="11">&lt;Method&gt;g__LocalFunc|0</text>

        <rect x="236" y="184" width="208" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
        <text x="244" y="202" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">5. InventoryGui.Show</text>
        <text x="244" y="218" fill="#B6B0A6" font-family="monospace" font-size="11">Added int activeGroup = 1</text>

        <rect x="454" y="184" width="206" height="44" rx="6" fill="#181C23" stroke="#2B323D"/>
        <text x="462" y="202" fill="#EF4444" font-family="monospace" font-size="11" font-weight="bold">6. SaveDataPath in Awake</text>
        <text x="462" y="218" fill="#B6B0A6" font-family="monospace" font-size="11">DistributionPlatform == null</text>
      </svg>`,
      aiContext: "The user is in Chamber 4 writing Harmony Prefix/Postfix patches and applying the 6 Valheim 1.0.20 breaking shifts cheat sheet."
    },

    /* ======================================================================
       CHAMBER 4.5: BepInEx Configuration (Config.Bind) & Live Hot-Reload
       ====================================================================== */
    {
      id: "4.5",
      sprint: 2,
      sprintLabel: "Sprint 2 · Real Mod Engineering",
      numberLabel: "Chamber 4.5",
      shortTitle: "Live .cfg Hot-Reload",
      title: "BepInEx Configuration (Config.Bind), Sliders & Live Hot-Reload",
      minutes: 4,
      timeBadge: "⏱️ 4 mins",
      liftBadge: "🟢 Low Cognitive Lift",
      safeStop: null,
      undoBadge: "↩️ Undo: Edit .cfg back to 150",
      yieldNote: "BepInEx writes config files to BepInEx/config/com.valheim101.hellovalheim.cfg after your plugin runs Awake() for the first time.",
      summary: "Hardcoding `150f` in C# means restarting Valheim every time you want to tune a number. Instead, `HelloValheimPlugin.cs` binds `CarryWeightBonus` via `Config.Bind<float>()` with `AcceptableValueRange<float>(0f, 1000f)` and attaches a `FileSystemWatcher` to `BepInEx/config/com.valheim101.hellovalheim.cfg`. Edit the `.cfg` file while Valheim is running and watch your carry weight update in real time!",
      personaNotes: {
        P1: "Just like Forge's `ForgeConfigSpec`, `Config.Bind` auto-generates comments, default values, and min/max constraints in `BepInEx/config/com.valheim101.hellovalheim.cfg` on first boot.",
        P2: "Note `SynchronizingObject = ThreadingHelper.SynchronizingObject` on the `FileSystemWatcher`: this marshals file-change callbacks onto Unity's main thread so `SettingChanged` handlers are 100% thread-safe.",
        P3: "This is the ultimate time-saver: leave Valheim open, change `CarryWeightBonus = 500` in Notepad/nano, press Save, and your Viking immediately has `800` carry capacity!",
        P4: "If you install `BepInEx ConfigurationManager`, that single `AcceptableValueRange<float>(0f, 1000f)` line automatically renders a draggable `0–1000` slider when you press `F1` in-game!",
        P5: "Combine `FileSystemWatcher` + `ThreadingHelper.SynchronizingObject` with `ServerSync` or custom `ZDO` configs in Bucket 2 mods for zero-restart server tuning."
      },
      steps: [
        "Open `BepInEx/config/com.valheim101.hellovalheim.cfg` in any text editor (or run the one-liner command below) while Valheim is open.",
        "Change `CarryWeightBonus = 150` to `CarryWeightBonus = 500` and save the file.",
        "Check `LogOutput.log` (or run `vikingping` in the `F5` console) and watch it immediately report `Active carry bonus: +500` without restarting the game!"
      ],
      tableHtml: "",
      commands: {
        win: `# Live-edit CarryWeightBonus to 500 from PowerShell while Valheim is running:
$cfg = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\BepInEx\\config\\com.valheim101.hellovalheim.cfg"
(Get-Content $cfg) -replace "CarryWeightBonus = .*", "CarryWeightBonus = 500" | Set-Content $cfg
Get-Content $cfg`,
        linux: `# Live-edit CarryWeightBonus to 500 from Bash while Valheim is running:
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
      codeTitle: "Config.Bind with AcceptableValueRange Slider & Main-Thread FileSystemWatcher",
      codeSnippet: `CarryWeightBonus = Config.Bind(
    "2. Gameplay",
    "CarryWeightBonus",
    150f,
    new ConfigDescription(
        "Extra carry weight added to Player.GetMaxCarryWeight (live hot-reloadable).",
        new AcceptableValueRange<float>(0f, 1000f))); // Auto-renders F1 slider!

_configWatcher = new FileSystemWatcher(configDir, configFile)
{
    NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
    SynchronizingObject = ThreadingHelper.SynchronizingObject, // Unity main-thread marshal!
    EnableRaisingEvents = true
};`,
      agentTask: "Show me how to add a new ConfigEntry<T> with AcceptableValueRange to starter-mod/HelloValheimPlugin.cs so it supports live hot-reloading.",
      onTrack: "Saving `com.valheim101.hellovalheim.cfg` immediately logs `[LiveConfig] CarryWeightBonus updated to +500` and updates `vikingping` in-game.",
      cliffEdge: {
        symptom: "`BepInEx/config/com.valheim101.hellovalheim.cfg` does not exist yet, OR `FileSystemWatcher` throws a cross-thread Unity exception when calling Unity APIs inside `SettingChanged`.",
        cause: "The `.cfg` file is created the first time `HelloValheimPlugin.Awake()` runs inside Valheim. And if `SynchronizingObject = ThreadingHelper.SynchronizingObject` is omitted, `FileSystemWatcher` fires on a background thread pool thread.",
        fix: "Boot Valheim once after Chamber 2 so BepInEx generates the `.cfg` file, and always set `SynchronizingObject = ThreadingHelper.SynchronizingObject` on your `FileSystemWatcher`."
      },
      defaultInspectorTab: "cfg",
      inspectorHighlightNote: "Switch between 'com.valheim101.hellovalheim.cfg' and 'HelloValheimPlugin.cs' (lines 28–66) in the Inspector below.",
      diagramTitle: "Zero-Restart Live .cfg Hot-Reload Pipeline",
      diagramCaption: "Editing the .cfg file on disk triggers FileSystemWatcher -> ThreadingHelper.SynchronizingObject -> Config.Reload() -> live in-game update.",
      svgDiagram: `<svg viewBox="0 0 680 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Live cfg hot reload flow">
        <rect x="6" y="6" width="668" height="218" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="28" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">ZERO-RESTART LIVE CONFIGURATION HOT-RELOAD LOOP</text>

        <rect x="20" y="46" width="146" height="82" rx="8" fill="#181C23" stroke="#F59E0B"/>
        <text x="30" y="68" fill="#F59E0B" font-family="sans-serif" font-size="12" font-weight="bold">1. Edit .cfg File</text>
        <text x="30" y="88" fill="#F3EFEA" font-family="monospace" font-size="11">CarryWeightBonus</text>
        <text x="30" y="104" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">= 150 -&gt; 500</text>

        <path d="M 166 87 L 190 87" stroke="#F59E0B" stroke-width="2"/>
        <polygon points="187,83 195,87 187,91" fill="#F59E0B"/>

        <rect x="196" y="46" width="154" height="82" rx="8" fill="#181C23" stroke="#D4A359"/>
        <text x="206" y="68" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">2. FileSystemWatcher</text>
        <text x="206" y="88" fill="#F3EFEA" font-family="monospace" font-size="11">ThreadingHelper</text>
        <text x="206" y="104" fill="#B6B0A6" font-family="monospace" font-size="11">.SynchronizingObject</text>

        <path d="M 350 87 L 374 87" stroke="#D4A359" stroke-width="2"/>
        <polygon points="371,83 379,87 371,91" fill="#D4A359"/>

        <rect x="380" y="46" width="136" height="82" rx="8" fill="#181C23" stroke="#D4A359"/>
        <text x="390" y="68" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">3. Config.Reload()</text>
        <text x="390" y="88" fill="#F3EFEA" font-family="monospace" font-size="11">Fires SettingChanged</text>
        <text x="390" y="104" fill="#B6B0A6" font-family="monospace" font-size="11">on Unity Main Thread</text>

        <path d="M 516 87 L 540 87" stroke="#22C55E" stroke-width="2"/>
        <polygon points="537,83 545,87 537,91" fill="#22C55E"/>

        <rect x="546" y="46" width="114" height="82" rx="8" fill="#181C23" stroke="#22C55E"/>
        <text x="556" y="68" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">4. Live In-Game</text>
        <text x="556" y="88" fill="#F3EFEA" font-family="monospace" font-size="11" font-weight="bold">MaxCarry: 800</text>
        <text x="556" y="104" fill="#22C55E" font-family="monospace" font-size="11">0s Restart Time!</text>

        <rect x="20" y="146" width="640" height="62" rx="7" fill="#181C23" stroke="#2B323D"/>
        <text x="34" y="168" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">💡 Bonus: Automatic F1 In-Game Slider in ConfigurationManager</text>
        <text x="34" y="188" fill="#B6B0A6" font-family="monospace" font-size="11">Passing new AcceptableValueRange&lt;float&gt;(0f, 1000f) renders an interactive 0..1000 slider in F1 UI automatically.</text>
      </svg>`,
      aiContext: "The user is in Chamber 4.5 using BepInEx Config.Bind<float> with AcceptableValueRange and FileSystemWatcher + ThreadingHelper.SynchronizingObject for live hot-reload."
    },

    /* ======================================================================
       CHAMBER 5: Multiplayer ZDOs, Dedicated Servers, ILSpy & Thunderstore
       ====================================================================== */
    {
      id: "5",
      sprint: 2,
      sprintLabel: "Sprint 2 · Real Mod Engineering",
      numberLabel: "Chamber 5",
      shortTitle: "Multiplayer, ILSpy & Ship",
      title: "Multiplayer ZDO Ownership, Dedicated Servers, ILSpy & Thunderstore",
      minutes: 12,
      timeBadge: "⏱️ 12 mins",
      liftBadge: "🟡 Medium Cognitive Lift",
      safeStop: "✓ Safe Checkpoint #3 (Ready to Publish!)",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "Headless Linux Dedicated Servers have no HUD or local player—always guard client UI/audio code with if (ZNet.instance != null && ZNet.instance.IsDedicated()) return;.",
      summary: "To graduate from personal QoL tweaks to publishing multiplayer-safe mods on Thunderstore, master three pillars: (1) Valheim's distributed **ZDO Zone Ownership** (`m_nview.IsOwner()` vs `ZNet.instance.IsDedicated()`), (2) inspecting any class inside `assembly_valheim.dll` with **ILSpy / `ilspycmd`**, and (3) packaging your `.dll` + `manifest.json` for Thunderstore / r2modman / Gale.",
      personaNotes: {
        P1: "Unlike Minecraft where the Dedicated Server simulates every chunk, Valheim uses **distributed client authority**: whichever player is first to enter a 64×64m zone owns and simulates the ZDOs (`m_nview.IsOwner()`) in that zone!",
        P2: "Headless Linux Dedicated Servers (`valheim_server.x86_64 -batchmode -nographics`) have `AudioMan`, `Hud`, and `Player.m_localPlayer` set to `null`. Always guard client hooks with `if (ZNet.instance.IsDedicated()) return;`.",
        P3: "Want to find out what method controls stamina, boat speed, or workbench radius? Decompile `assembly_valheim.dll` with `ilspycmd` using the command below!",
        P4: "Your `starter-mod/` folder already has `manifest.json` and `thunderstore.toml` pre-configured—you can share your mod zip with friends on r2modman or Gale right now.",
        P5: "Review the Multiplayer Authority Matrix below—mixing up `ZNet.instance.IsServer()` and `m_nview.IsOwner()` is the #1 cause of rubber-banding and duplicate creature drops in multiplayer."
      },
      steps: [
        "Study the **Valheim 1.0.20 Multiplayer Authority Matrix** (`m_nview.IsOwner()` vs `IsServer()` vs `IsDedicated()`).",
        "Review `MultiplayerRpcPatch` in `HelloValheimPlugin.cs` to see `ZRoutedRpc.instance.Register` and the `ZNet.instance.IsDedicated()` headless server guard.",
        "Use `ilspycmd` (or ILSpy GUI / dnSpyEx) to search `assembly_valheim.dll` for any game class you want to mod next.",
        "Package your mod into a Thunderstore-ready `.zip` (`manifest.json`, `README.md`, `icon.png`, `plugins/HelloValheim.dll`)."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Valheim Networking Check</th>
              <th>What It Actually Means</th>
              <th>When to Use It in Your Mod</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>m_nview.IsValid() &amp;&amp; m_nview.IsOwner()</code></td>
              <td><strong>Zone Simulation Owner:</strong> This client currently owns the <code>ZDO</code> for this entity (the first peer in the 64×64m sector).</td>
              <td><strong>Modifying Entity State:</strong> Applying damage, spawning drops, or writing <code>m_nview.GetZDO().Set(...)</code> so drops don't duplicate across 4 players.</td>
            </tr>
            <tr>
              <td><code>ZNet.instance.IsServer()</code></td>
              <td><strong>World Host / Authority:</strong> True on a Dedicated Server OR on the host player in a Listen Server session.</td>
              <td><strong>Global World Rules:</strong> World save events, global boss keys (<code>ZoneSystem</code>), and player connection/ban lists.</td>
            </tr>
            <tr>
              <td><code>ZNet.instance.IsDedicated()</code></td>
              <td><strong>Headless Server Process:</strong> True ONLY on <code>valheim_server</code> (no local player, no GPU HUD, no audio).</td>
              <td><strong>Headless Crash Guard:</strong> Skip any patch that touches <code>Hud.instance</code>, <code>Player.m_localPlayer</code>, <code>Camera</code>, or keybinds.</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# 1. Inspect any Valheim 1.0.20 class (e.g., Player or SEMan) from terminal with ilspycmd:
# (Install once via: dotnet tool install -g ilspycmd)
ilspycmd "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\valheim_Data\\Managed\\assembly_valheim.dll" -t Player | Select-String "GetMaxCarryWeight|Update"

# 2. Package a Thunderstore / r2modman / Gale zip archive:
Compress-Archive -Path .\\starter-mod\\manifest.json, .\\README.md, .\\starter-mod\\bin\\Release\\HelloValheim.dll -DestinationPath .\\starter-mod\\HelloValheim-1.0.0.zip -Force`,
        linux: `# 1. Inspect any Valheim 1.0.20 class (e.g., Player or SEMan) from terminal with ilspycmd:
# (Install once via: dotnet tool install -g ilspycmd)
ilspycmd "$HOME/.local/share/Steam/steamapps/common/Valheim/valheim_Data/Managed/assembly_valheim.dll" -t Player | grep -E "GetMaxCarryWeight|Update"

# 2. Package a Thunderstore / r2modman / Gale zip archive:
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
      codeTitle: "Headless Dedicated Server Guard & ZRoutedRpc Registration",
      codeSnippet: `[HarmonyPatch(typeof(Game), nameof(Game.Start))]
public static class MultiplayerRpcPatch
{
    [HarmonyPostfix]
    private static void Postfix()
    {
        ZRoutedRpc.instance?.Register<string>("HelloValheim_Ping", (senderUid, msg) =>
            HelloValheimPlugin.Log.LogInfo($"[ZRoutedRpc] Peer {senderUid} says: {msg}"));

        // CRITICAL: Never run HUD / Keybind / LocalPlayer UI logic on a headless Dedicated Server!
        if (ZNet.instance != null && ZNet.instance.IsDedicated()) return;
    }
}`,
      agentTask: "Help me audit my mod for Dedicated Server headless safety (ZNet.instance.IsDedicated()), ZDO ownership (m_nview.IsOwner()), and package manifest.json for Thunderstore.",
      onTrack: "You understand the difference between `m_nview.IsOwner()` (zone peer) and `ZNet.instance.IsDedicated()` (headless server), and can package `HelloValheim-1.0.0.zip`.",
      cliffEdge: {
        symptom: "Your mod works in single-player, but crashes a Linux Dedicated Server on boot OR spawns 5x loot when 5 friends stand near a dying Greydwarf.",
        cause: "Touching `Hud.instance` / `Player.m_localPlayer` on a headless server where no local player exists, OR spawning loot inside a method without checking `if (!m_nview.IsOwner()) return;`.",
        fix: "Guard all client UI/Input code with `if (ZNet.instance.IsDedicated()) return;` and guard all entity state/loot mutations with `if (!m_nview.IsValid() || !m_nview.IsOwner()) return;`."
      },
      defaultInspectorTab: "manifest",
      inspectorHighlightNote: "Inspect 'manifest.json + thunderstore.toml' or 'HelloValheimPlugin.cs' (lines 148–169) in the Inspector below.",
      diagramTitle: "Valheim Distributed ZDO Zone Ownership vs. Headless Dedicated Server",
      diagramCaption: "Why Peer A (first in the 64x64m sector) simulates creature ZDOs while the Dedicated Server only relays ZDOMan & ZRoutedRpc packets.",
      svgDiagram: `<svg viewBox="0 0 680 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ZDO ownership vs Dedicated Server">
        <rect x="6" y="6" width="668" height="228" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="27" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">VALHEIM DISTRIBUTED ZDO AUTHORITY &amp; ZROUTEDRPC TOPOLOGY</text>

        <rect x="20" y="42" width="204" height="174" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
        <text x="32" y="64" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">✓ Peer A (First in Sector)</text>
        <text x="32" y="84" fill="#F3EFEA" font-family="monospace" font-size="11">m_nview.IsOwner() == TRUE</text>
        <text x="32" y="102" fill="#B6B0A6" font-family="monospace" font-size="11">IsDedicated()     == FALSE</text>
        <rect x="32" y="116" width="180" height="86" rx="6" fill="#212730" stroke="#22C55E"/>
        <text x="40" y="135" fill="#22C55E" font-family="sans-serif" font-size="11" font-weight="bold">Simulates Sector ZDOs:</text>
        <text x="40" y="153" fill="#F3EFEA" font-family="monospace" font-size="11">• Creature AI &amp; Physics</text>
        <text x="40" y="170" fill="#F3EFEA" font-family="monospace" font-size="11">• Loot Drops (Run Once!)</text>
        <text x="40" y="187" fill="#F3EFEA" font-family="monospace" font-size="11">• ZDO.Set("health", v)</text>

        <rect x="238" y="42" width="204" height="174" rx="8" fill="#181C23" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="250" y="64" fill="#F59E0B" font-family="sans-serif" font-size="12" font-weight="bold">🖥️ Dedicated Server</text>
        <text x="250" y="84" fill="#F3EFEA" font-family="monospace" font-size="11">IsDedicated() == TRUE</text>
        <text x="250" y="102" fill="#EF4444" font-family="monospace" font-size="11">m_localPlayer == NULL!</text>
        <rect x="250" y="116" width="180" height="86" rx="6" fill="#212730" stroke="#F59E0B"/>
        <text x="258" y="135" fill="#F59E0B" font-family="sans-serif" font-size="11" font-weight="bold">Headless Relay &amp; World DB:</text>
        <text x="258" y="153" fill="#F3EFEA" font-family="monospace" font-size="11">• Assigns Sector Owners</text>
        <text x="258" y="170" fill="#F3EFEA" font-family="monospace" font-size="11">• Relays ZRoutedRpc</text>
        <text x="258" y="187" fill="#EF4444" font-family="monospace" font-size="11">• NO Hud / Audio / Camera!</text>

        <rect x="456" y="42" width="204" height="174" rx="8" fill="#181C23" stroke="#D4A359" stroke-width="1.5"/>
        <text x="468" y="64" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">🛡️ Peer B (Nearby Friend)</text>
        <text x="468" y="84" fill="#F3EFEA" font-family="monospace" font-size="11">m_nview.IsOwner() == FALSE</text>
        <text x="468" y="102" fill="#B6B0A6" font-family="monospace" font-size="11">IsDedicated()     == FALSE</text>
        <rect x="468" y="116" width="180" height="86" rx="6" fill="#212730" stroke="#D4A359"/>
        <text x="476" y="135" fill="#D4A359" font-family="sans-serif" font-size="11" font-weight="bold">Replicates &amp; Sends RPCs:</text>
        <text x="476" y="153" fill="#F3EFEA" font-family="monospace" font-size="11">• Reads ZDO state</text>
        <text x="476" y="170" fill="#F3EFEA" font-family="monospace" font-size="11">• Calls m_nview.InvokeRPC</text>
        <text x="476" y="187" fill="#F3EFEA" font-family="monospace" font-size="11">• Renders Local HUD</text>
      </svg>`,
      aiContext: "The user is in Chamber 5 learning Valheim multiplayer ZDO ownership (m_nview.IsOwner()), headless Dedicated Server guards (ZNet.instance.IsDedicated()), ZRoutedRpc, ILSpy decompilation, and Thunderstore packaging."
    }
  ]
};
