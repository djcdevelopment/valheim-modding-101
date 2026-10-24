/* ==========================================================================
   Valheim 1.0.20 Interactive Modding Workbench — Complete 9-Step (0–8) Dataset
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

        // Lesson 2 (Step 5): BepInEx Config.Bind with AcceptableValueRange slider
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

        // Lesson 3 & 4 (Step 6 & 7): Apply Harmony Patches
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

// Lesson 1 (Step 4 & 7): F5 Console Commands (vikingping + vikinginspect)
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

// Lesson 3 (Step 6 & 7): Postfix + Defensive Finalizer on Player.GetMaxCarryWeight
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

// Lesson 4 (Step 6): Scoped State-Passing Pattern on Achievements.IsCheatedAtAll
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

// Lesson 5 (Step 8): Dedicated Server Guard & ZRoutedRpc Registration
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
    },
    agents: {
      label: "AGENTS.md (AI Rulebook)",
      path: "AGENTS.md",
      lang: "markdown",
      content: `# AGENTS.md — How AI Works With This Tutorial (Zero Setup Required)

There are TWO ways to use AI with Valheim Modding 101:

1. 🌐 BROWSER CHAT AI (Free ChatGPT, Claude, Gemini — Zero Setup Needed):
   • You do NOT need to configure or upload AGENTS.md!
   • Whenever you click the "💬 AI Prompt (Includes Rules)" tab on any step and click "Copy Prompt",
     the workbench automatically embeds all Valheim 1.0.20 rules from AGENTS.md, your OS, and
     the current step's code directly inside your clipboard. Just paste into your browser chat!

2. 🤖 LOCAL CODING AGENT (Cursor, Claude Code, VS Code Copilot, Codex, Windsurf):
   • This file (AGENTS.md) and CLAUDE.md are ALREADY pre-installed in the root of the
     valheim-modding-101/ tutorial folder.
   • Step A: Download or clone the tutorial folder:
       git clone https://github.com/djcdevelopment/valheim-modding-101.git
       cd valheim-modding-101
   • Step B: Open the valheim-modding-101/ folder in Cursor, VS Code, or run "claude" / "codex"
     in your terminal inside that folder.
   • Step C: Your coding agent automatically reads AGENTS.md on startup so it knows all
     Valheim 1.0.20 rules, multi-profile deployment, and safe undo commands!

===========================================================================
=== VALHEIM 1.0.20 (DEEP NORTH) ENGINEERING RULES IN AGENTS.MD ===
===========================================================================
1. Target Framework & Clean Build Gate:
   • Always target <TargetFramework>net48</TargetFramework> and <LangVersion>12.0</LangVersion>.
   • Every <Reference> to assembly_*.dll, UnityEngine*.dll, BepInEx.dll, and 0Harmony.dll MUST
     set <Private>false</Private> so Unity/Harmony DLLs are never copied into BepInEx/plugins/.

2. The 6 Valheim 1.0.20 Breaking API Signatures (Never Use 2021-2023 Signatures):
   • Spatial Sectors: ZDOMan.FindSectorObjects uses 16-bit Vector2s (from assembly_utils.dll)
     + SimulationDistance enum, NOT Vector2i + int radius.
   • Status Effects: SEMan.AddStatusEffect requires a 5th parameter (short variant = 0):
     typeof(int), typeof(bool), typeof(int), typeof(float), typeof(short).
   • Overloaded Methods: PieceTable.SetCategory has TWO overloads in 1.0.20: SetCategory(int)
     and SetCategory(Piece.PieceCategory). Always pass explicit parameter types in [HarmonyPatch].
   • Compiler Closures: Inner callbacks like Chat.OnNewChatMessage compile as C# local functions
     (<OnNewChatMessage>g__OnCheckPermissionAsyncCompleted|0) rather than legacy <b__0> lambdas.
   • UI & Input: InventoryGui.Show(Container, int activeGroup = 1) takes 2 args; container hold
     checks use private static InventoryGui.UseButtonHeld().
   • Early SaveDataPath: Never call Utils.GetSaveDataPath() inside BaseUnityPlugin.Awake() without
     a try/catch fallback to BepInEx.Paths.ConfigPath or Utils.persistantDataPath.

3. Runtime Safety & Multiplayer Guards:
   • Always guard Player.m_localPlayer == null (it is null at the main menu and loading screens).
   • Guard headless Dedicated Servers with ZNet.instance != null && ZNet.instance.IsDedicated().`
    }
  },

  chambers: [
    /* ======================================================================
       STEP 0: Before You Start: A Picture Guide to Valheim Modding
       ====================================================================== */
    {
      id: "0",
      sprint: 0,
      sprintLabel: "Phase 0 · Picture Overview",
      numberLabel: "Step 0",
      shortTitle: "Picture Overview",
      title: "Before You Start: A Picture Guide to Valheim Modding",
      minutes: 2,
      timeBadge: "⏱️ 2 mins",
      liftBadge: "🟢 Easy (Visual Only)",
      safeStop: null,
      undoBadge: "↩️ 100% Read-Only",
      yieldNote: "Zero code and zero downloads in this step — just a clear picture of what the pieces are and where they live.",
      summary: "Before touching a single file or command, look at the 4 pictures below. You do not need to memorize technical jargon—just see what a mod file actually is (a tiny 12 KB .dll file), where the 3 folders live on your PC, why Mod Manager profiles exist, and which 4 simple tools we use.",
      storyboard: {
        heading: "The 4-Picture Overview (Hover Any Term Chip for Plain-English Details)",
        subhead: "See the big picture first. You can also drop a NotebookLM audio podcast or short video into site/media/ anytime.",
        notebookLmPrompt: `Create an engaging, beginner-friendly 90-second overview of Valheim 1.0 modding based on these 4 facts:\n1. What is a Mod? Valheim is a Viking survival game built in Unity. A code mod is just a tiny 12 KB .dll file placed in a BepInEx/plugins/ folder. You never alter Valheim's own files, and deleting the .dll restores vanilla instantly.\n2. The 3 Folders on Your PC: Your Worlds & Characters live in a protected Save Vault (AppData/LocalLow/IronGate/Valheim on Windows, ~/.config/unity3d/IronGate/Valheim on Linux) completely separate from the Steam game folder and your mods.\n3. Steam Folder vs. Mod Manager Profiles: If you use Thunderstore Mod Manager, r2modman, or Gale, your Steam folder stays 100% vanilla and mods live in isolated Profile folders so you can switch between modded solo play and vanilla co-op with friends in one click.\n4. Your 4 Simple Tools: You do NOT need the 15 GB Unity Editor. You only need Steam, BepInEx 5.4.2202, the lightweight .NET 8 SDK command-line builder, and any text editor.`,
        panels: [
          {
            num: "1",
            title: "What Is a Mod? (A Snap-On .dll File)",
            image: "media/panels/panel-1-what-is-a-mod.png",
            caption: "You never edit Valheim itself. A code mod is a tiny **12 KB `.dll` file** inside a `plugins/` folder. Delete that file and your game is 100% vanilla again.",
            chips: [
              { label: "Valheim 1.0", tooltip: "The base game installed by Steam. We never overwrite or modify its original files." },
              { label: "Mod (.dll)", tooltip: "A tiny compiled C# plugin file (~12 KB) placed in BepInEx/plugins/ that adds features while the game runs." },
              { label: "Config (.cfg)", tooltip: "A plain text file in BepInEx/config/ where you can tweak numbers (like carry weight) in Notepad." }
            ]
          },
          {
            num: "2",
            title: "The 3 Places on Your Computer",
            image: "media/panels/panel-2-three-places-on-pc.png",
            caption: "Your **Save Vault** (worlds & characters) lives in a completely separate folder from **Steam** and your **Mod Plugins**. Code mods cannot erase your saves.",
            chips: [
              { label: "1. Steam Folder", tooltip: "Where Valheim.exe and the game's original code live (steamapps/common/Valheim)." },
              { label: "2. Save Vault", tooltip: "Protected folder (AppData/LocalLow on Windows, ~/.config on Linux) holding your worlds and characters." },
              { label: "3. Plugins Folder", tooltip: "BepInEx/plugins/ — the detachable folder where mod .dll files sit." }
            ]
          },
          {
            num: "3",
            title: "Why Mod Profiles Matter (Solo vs. Friends)",
            image: "media/panels/panel-3-mod-profiles.png",
            caption: "Mod managers (`Thunderstore`, `r2modman`, `Gale`) keep your Steam folder 100% untouched and store each mod list in a separate **Profile** you can swap in 1 click.",
            chips: [
              { label: "Mod Profile", tooltip: "An isolated folder containing its own BepInEx/plugins/ and config/ files for a specific mod list." },
              { label: "Thunderstore / r2modman / Gale", tooltip: "Popular mod manager apps that launch Valheim with a chosen profile while keeping Steam vanilla." },
              { label: "LogOutput.log", tooltip: "A text receipt inside BepInEx/ that updates every time Valheim starts, proving which folder loaded." }
            ]
          },
          {
            num: "4",
            title: "Your 4 Simple Tools (No 15 GB Game Engine)",
            image: "media/panels/panel-4-four-simple-tools.png",
            caption: "Skip the 15 GB Unity Editor. For 80% of mods, you only need **Steam**, **BepInEx**, the **`.NET 8` 2-second builder**, and **any text editor**.",
            chips: [
              { label: "BepInEx 5.4.2202", tooltip: "The standard mod loader for Valheim that wakes up at launch and loads every .dll in plugins/." },
              { label: ".NET 8 SDK", tooltip: "Microsoft's free command-line tool (dotnet build) that turns a .cs text file into a .dll mod in 2 seconds." },
              { label: "Harmony", tooltip: "A helper library bundled inside BepInEx that lets your code run before or after any Valheim method." },
              { label: "Unity / Mono", tooltip: "The engine Valheim was built with—thanks to Mono, we can read game code and patch it in memory." },
              { label: "AI Prompt / AGENTS.md", tooltip: "Browser AI (ChatGPT/Claude): Click 'AI Prompt' on any step to copy a self-contained prompt with all rules included! Coding Agent (Cursor/Claude Code): Open the valheim-modding-101 folder and it reads AGENTS.md automatically." }
            ]
          }
        ]
      },
      personaNotes: {
        P1: "If you have modded Minecraft or Skyrim: BepInEx is your mod loader, `BepInEx/plugins/` is your `mods/` folder, and Mod Manager profiles let you keep separate mod lists.",
        P2: "Skip the 15 GB Unity Editor. A Valheim code mod is just a ~12 KB C# `.dll` built in 2 seconds with `dotnet build` and loaded at runtime by BepInEx.",
        P3: "Scan the 4 picture cards above—in 15 minutes you will build a 12 KB `.dll` mod, test it in-game, and change your carry weight live without restarting.",
        P4: "Zero risk to your worlds or characters! Look at Picture #2 above: your Save Vault lives in a completely separate folder that code mods never touch.",
        P5: "Returning for Valheim 1.0? BepInEx `5.4.2202` is the standard loader, and Step 6 covers the 6 Valheim 1.0 method signature updates."
      },
      steps: [
        "Scan the **4 Picture Cards** above and hover any term chip (`Mod (.dll)`, `Save Vault`, `Mod Profile`) for a 1-sentence explanation.",
        "Click **`Reference Table` on the right** to see the exact folder path for every piece on Windows and Linux.",
        "Click **`Tailor Guide ▾` at the top** to select `🪟 Windows` or `🐧 Linux / SteamOS`, then continue to **Step 1 (`1. Folders & Profiles`)**."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>Piece / Tool</th>
              <th>What It Actually Is</th>
              <th>Where It Lives on Your PC</th>
              <th>How to Test That You Found It</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Valheim Game Folder (Steam)</strong></td>
              <td>The base game installed by Steam (<code>valheim.exe</code> + original game code in <code>assembly_valheim.dll</code>).</td>
              <td><strong>Win:</strong> <code>Steam\\steamapps\\common\\Valheim</code><br><strong>Linux:</strong> <code>~/.local/share/Steam/steamapps/common/Valheim</code></td>
              <td>In Steam: Right-click <strong>Valheim</strong> &rarr; <strong>Manage</strong> &rarr; <strong>Browse local files</strong>.</td>
            </tr>
            <tr>
              <td><strong>2. Your Save Vault (Worlds &amp; Characters)</strong></td>
              <td>Protected folder holding <code>worlds_local/</code> and <code>characters_local/</code> — completely separate from mods.</td>
              <td><strong>Win:</strong> <code>%USERPROFILE%\\AppData\\LocalLow\\IronGate\\Valheim</code><br><strong>Linux:</strong> <code>~/.config/unity3d/IronGate/Valheim</code></td>
              <td>Open the folder and confirm <code>worlds_local</code> and <code>characters_local</code> are inside.</td>
            </tr>
            <tr>
              <td><strong>3. BepInEx Mod Loader (<code>5.4.2202</code>)</strong></td>
              <td>The loader that wakes up when Valheim starts and loads every <code>.dll</code> in <code>BepInEx/plugins/</code>.</td>
              <td>Either in Steam <code>Valheim/BepInEx/</code> <strong>OR</strong> inside a Mod Manager Profile <code>profiles/&lt;Name&gt;/BepInEx/</code>.</td>
              <td>Launch Valheim and check the <code>Date Modified</code> timestamp on <code>BepInEx/LogOutput.log</code>!</td>
            </tr>
            <tr>
              <td><strong>4. Your Mod File (<code>HelloValheim.dll</code>)</strong></td>
              <td>A tiny ~12 KB compiled C# file that adds your custom features while Valheim runs.</td>
              <td><code>BepInEx/plugins/HelloValheim/HelloValheim.dll</code></td>
              <td>Delete <code>HelloValheim.dll</code> and Valheim is immediately 100% vanilla again.</td>
            </tr>
            <tr>
              <td><strong>5. Your Mod Settings (<code>com.valheim101.hellovalheim.cfg</code>)</strong></td>
              <td>A plain text settings file created automatically the first time your mod loads.</td>
              <td><code>BepInEx/config/com.valheim101.hellovalheim.cfg</code></td>
              <td>Open it in Notepad or any text editor — change <code>150</code> to <code>500</code> and save!</td>
            </tr>
            <tr>
              <td><strong>6. <code>.NET 8 SDK</code> (<code>dotnet build</code>)</strong></td>
              <td>Microsoft's free command-line builder that compiles <code>.cs</code> text files into a <code>.dll</code> mod in 2 seconds.</td>
              <td>Installed system-wide (<code>C:\\Program Files\\dotnet</code> or <code>~/.dotnet</code>).</td>
              <td>Open a terminal and run <code>dotnet --version</code> (prints <code>8.0.x</code> or newer).</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# Step 0 Optional Check (PowerShell — 100% Read-Only)
# Confirm your Save Vault lives safely outside Steam in AppData\\LocalLow:
Get-ChildItem "$env:USERPROFILE\\AppData\\LocalLow\\IronGate\\Valheim" | Select-Object Name, LastWriteTime`,
        linux: `# Step 0 Optional Check (Bash — 100% Read-Only)
# Confirm your Save Vault lives safely outside Steam in ~/.config:
ls -la "$HOME/.config/unity3d/IronGate/Valheim"`
      },
      expectedOutput: {
        win: `Name                LastWriteTime
----                -------------
characters_local    10/24/2026 7:15:00 PM
worlds_local        10/24/2026 7:15:00 PM
valheim.log         10/24/2026 7:14:22 PM
# Your characters and worlds live here — completely separate from Steam and your mods.`,
        linux: `drwxr-xr-x characters_local
drwxr-xr-x worlds_local
-rw-r--r-- Player.log
# Your characters and worlds live here — completely separate from Steam and your mods.`
      },
      codeTitle: "What Your Folder Layout Looks Like on Disk (Steam vs. Mod Manager Profile)",
      codeSnippet: `===========================================================================
1. YOUR PROTECTED SAVE VAULT (Never touched by code mods!)
===========================================================================
📁 IronGate/Valheim/
 ├─ 📁 worlds_local/       <-- Your .db and .fwl world saves
 └─ 📁 characters_local/   <-- Your .fch Viking character files

===========================================================================
2. OPTION A: DIRECT STEAM INSTALL (When launching from Steam "Play")
===========================================================================
📁 Steam/steamapps/common/Valheim/
 ├─ 🎮 valheim.exe (or valheim.x86_64 on Linux)
 ├─ 📁 valheim_Data/Managed/assembly_valheim.dll  <-- Valheim's game code
 └─ 📁 BepInEx/
     ├─ 📁 plugins/HelloValheim/HelloValheim.dll  <-- Your ~12 KB mod!
     ├─ 📁 config/com.valheim101.hellovalheim.cfg <-- Plain-text settings
     └─ 📄 LogOutput.log                          <-- Startup receipt log

===========================================================================
3. OPTION B: MOD MANAGER PROFILE (Thunderstore / r2modman / Gale)
===========================================================================
📁 .../Valheim/profiles/Default/
 └─ 📁 BepInEx/
     ├─ 📁 plugins/HelloValheim/HelloValheim.dll  <-- Profile's mod list
     ├─ 📁 config/com.valheim101.hellovalheim.cfg <-- Profile's settings
     └─ 📄 LogOutput.log                          <-- Updates on Modded launch`,
      agentTask: "Explain the 4-picture overview of Valheim modding for my setup, where the 3 folders live on my PC, and how Mod Manager profiles work.",
      onTrack: "You can picture what a `.dll` mod file is, why your Save Vault is 100% safe, and the difference between the Steam folder and a Mod Manager profile.",
      cliffEdge: {
        symptom: "Don't download the 15 GB Unity Editor or worry about breaking your saved worlds.",
        why: "Older guides tell beginners to install the massive Unity game engine before explaining that 80% of mods are tiny 12 KB files and saves live in a separate folder.",
        cause: "Older guides tell beginners to install the massive Unity game engine before explaining that 80% of mods are tiny 12 KB files and saves live in a separate folder.",
        fix: "Skip Unity! Use the 4 simple tools in Picture #4 above and move to Step 1 to pop open your exact Valheim folders."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "Zero code needed in Step 0! When you're ready, Step 1 shows how to find and open your folders in 3 clicks.",
      diagramTitle: "How Mods Snap On & The 3 Mod Categories (Hover Any Box)",
      diagramCaption: "Doorstop wakes up BepInEx at launch, which loads your 12 KB .dll mod in memory without touching your game files or saves.",
      svgDiagram: `<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Picture Guide Overview: How Valheim Mods Load and the 3 Mod Categories">
        <defs>
          <linearGradient id="gBronze0" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#181C23"/>
            <stop offset="100%" stop-color="#212730"/>
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="668" height="238" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="28" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">HOW MODS SNAP ON AT STARTUP (HOVER ANY BOX FOR DETAILS)</text>

        <g class="map-node" tabindex="0" data-tooltip="1. Unity Doorstop: A tiny starter file (winhttp.dll on Windows, start_game_bepinex.sh on Linux) that wakes up BepInEx the moment Valheim starts.">
          <rect x="20" y="42" width="144" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
          <text x="30" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">1. Doorstop Hook</text>
          <text x="30" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">Win: winhttp.dll</text>
          <text x="30" y="96" fill="#B6B0A6" font-family="monospace" font-size="11">Linux: doorstop.so</text>
        </g>

        <path d="M 164 78 L 182 78" stroke="#D4A359" stroke-width="2"/>
        <polygon points="176,74 182,78 176,82" fill="#D4A359"/>

        <g class="map-node" tabindex="0" data-tooltip="2. BepInEx 5.4.2202: Scans your BepInEx/plugins/ folder, loads every mod .dll file, and writes a text receipt to BepInEx/LogOutput.log.">
          <rect x="182" y="42" width="150" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
          <text x="192" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">2. BepInEx Loader</text>
          <text x="192" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">Loads plugins/*.dll</text>
          <text x="192" y="96" fill="#22C55E" font-family="monospace" font-size="11">Writes LogOutput</text>
        </g>

        <path d="M 332 78 L 350 78" stroke="#D4A359" stroke-width="2"/>
        <polygon points="344,74 350,78 344,82" fill="#D4A359"/>

        <g class="map-node" tabindex="0" data-tooltip="3. Your Mod (.dll) + Harmony: Runs your C# code right before or right after Valheim methods in memory—without altering game files on disk.">
          <rect x="350" y="42" width="148" height="72" rx="8" fill="url(#gBronze0)" stroke="#D4A359" stroke-width="1.5"/>
          <text x="360" y="63" fill="#F3EFEA" font-family="sans-serif" font-size="12" font-weight="bold">3. Your Mod (.dll)</text>
          <text x="360" y="81" fill="#B6B0A6" font-family="monospace" font-size="11">~12 KB Snap-On File</text>
          <text x="360" y="96" fill="#B6B0A6" font-family="monospace" font-size="11">Delete = Vanilla!</text>
        </g>

        <path d="M 498 78 L 516 78" stroke="#22C55E" stroke-width="2"/>
        <polygon points="510,74 516,78 510,82" fill="#22C55E"/>

        <g class="map-node" tabindex="0" data-tooltip="4. Valheim + Protected Save Vault: The game runs normally with your mod active, while your worlds and characters stay untouched in a separate Save Vault.">
          <rect x="516" y="42" width="144" height="72" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
          <text x="526" y="63" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">4. Valheim 1.0.20</text>
          <text x="526" y="81" fill="#F3EFEA" font-family="monospace" font-size="11">Game Runs Cleanly</text>
          <text x="526" y="96" fill="#22C55E" font-family="monospace" font-size="11">Saves Untouched</text>
        </g>

        <text x="20" y="142" fill="#B6B0A6" font-family="monospace" font-size="11" font-weight="bold">THREE CATEGORIES OF VALHEIM MODS (HOVER TO COMPARE)</text>

        <g class="map-node" tabindex="0" data-tooltip="Type 1 (Client-Only C#): 80% of mods! Tweak carry weight, stamina, UI, camera, and hotkeys using a tiny 12 KB .dll file. No Unity Editor needed.">
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
      aiContext: "The user is in Step 0 viewing the 4-picture beginner overview of Valheim 1.0.20 modding (what a .dll mod is, the 3 folders on a PC, Mod Manager profiles vs. Steam, and the 4 simple tools)."
    },

    /* ======================================================================
       STEP 1: Find Your Folders: Steam vs. Mod Manager Profiles
       ====================================================================== */
    {
      id: "1",
      sprint: 1,
      sprintLabel: "Phase 1 · Folders & Setup",
      numberLabel: "Step 1",
      shortTitle: "Folders & Profiles",
      title: "Find Your Folders: Steam vs. Mod Manager Profiles (Thunderstore / r2modman / Gale)",
      minutes: 3,
      timeBadge: "⏱️ 3 mins",
      liftBadge: "🟢 Easy",
      safeStop: null,
      undoBadge: "↩️ 100% Read-Only",
      yieldNote: "Why do YouTube videos show different folders? Because Mod Managers keep Steam untouched and store mods in a separate Profile folder.",
      summary: "If you watch three Valheim modding videos, you'll see different folder paths. That's because there are two ways people run mods: **Direct in Steam** (`steamapps/common/Valheim/BepInEx/`) or inside a **Mod Manager Profile** (`Thunderstore`, `r2modman`, or `Gale`). Here is how to find and pop open your exact folders in 3 mouse clicks—or with 1 terminal command—and how files move between them.",
      personaNotes: {
        P1: "Just like Prism/CurseForge instances in Minecraft or MO2 profiles in Skyrim, Thunderstore, r2modman, and Gale pass `--doorstop-target` so each profile has its own isolated `BepInEx/` folder.",
        P2: "Mod Managers leave `steamapps/common/Valheim` untouched and pass `--doorstop-target \"<ProfilePath>/BepInEx/core/BepInEx.Preloader.dll\"` at launch. Our scripts auto-detect both!",
        P3: "Run the `-Open` / `--open` command below to pop open your exact Valheim and Mod Manager profile folders in File Explorer right now.",
        P4: "Not sure if you're using Steam or a Mod Manager? Use the 5-Second `LogOutput.log` Timestamp Trick in Step 3 below!",
        P5: "Using multiple drives (`C:`, `D:`, `E:`) or Steam library folders? Our `doctor` and `build-and-deploy` scripts scan `libraryfolders.vdf` and Mod Manager profile paths automatically."
      },
      steps: [
        "**Find your Steam folder in 3 clicks (Mouse UI):** In Steam, right-click **Valheim** → **Manage** → **Browse local files**. (If you use **Thunderstore / r2modman / Gale**, click **Settings → Browse profile folder** to open your active profile!).",
        "**Or run the 1-line Folder Finder & Opener below:** It scans all your drives (`C:`, `D:`, `E:`), finds both your Steam folder and any Mod Manager profiles, and **pops open File Explorer / File Manager** directly to your folder.",
        "**Use the 5-Second `LogOutput.log` Timestamp Trick:** Whenever you aren't sure which `BepInEx` folder Valheim is actually using, check the `Date Modified` time on `BepInEx/LogOutput.log` right after launching the game."
      ],
      tableHtml: `<div class="chamber-table-wrap">
        <table class="chamber-table">
          <thead>
            <tr>
              <th>How You Launch Valheim</th>
              <th>Where <code>BepInEx/plugins/</code> Lives</th>
              <th>How to Open the Folder in 2 Clicks</th>
              <th>How Our Build Script Handles It</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Steam "Play" Button</strong><br><code>Direct Steam Install</code></td>
              <td>Inside your Steam game folder:<br><code>steamapps/common/Valheim/BepInEx/plugins/</code></td>
              <td>In Steam: Right-click <strong>Valheim</strong> &rarr; <strong>Manage</strong> &rarr; <strong>Browse local files</strong>.</td>
              <td>Automatically copies <code>HelloValheim.dll</code> into <code>Valheim/BepInEx/plugins/HelloValheim/</code>.</td>
            </tr>
            <tr>
              <td><strong>2. Thunderstore Mod Manager</strong><br><code>Click "Modded"</code></td>
              <td>Inside your Thunderstore profile:<br><code>AppData\\Roaming\\Thunderstore Mod Manager\\DataFolder\\Valheim\\profiles\\&lt;Name&gt;\\BepInEx\\plugins\\</code></td>
              <td>In Thunderstore: Click <strong>Settings</strong> &rarr; <strong>Browse profile folder</strong>.</td>
              <td>Auto-detects your Thunderstore profiles and copies <code>HelloValheim.dll</code> into both Steam and your profile!</td>
            </tr>
            <tr>
              <td><strong>3. r2modman</strong><br><code>Click "Start Modded"</code></td>
              <td>Inside your r2modman profile:<br><strong>Win:</strong> <code>AppData\\Roaming\\r2modmanPlus-local\\Valheim\\profiles\\&lt;Name&gt;\\BepInEx\\plugins\\</code><br><strong>Linux:</strong> <code>~/.config/r2modmanPlus-local/Valheim/profiles/&lt;Name&gt;/BepInEx/plugins/</code></td>
              <td>In r2modman: Click <strong>Settings</strong> &rarr; <strong>Browse profile folder</strong>.</td>
              <td>Auto-detects your r2modman profiles (or target a specific one with <code>-Profile &lt;Name&gt;</code> / <code>--profile &lt;Name&gt;</code>).</td>
            </tr>
            <tr>
              <td><strong>4. Gale Mod Manager</strong><br><code>Click "Launch Game"</code></td>
              <td>Inside your Gale profile:<br><strong>Win:</strong> <code>AppData\\Roaming\\com.kesomannen.gale\\valheim\\profiles\\&lt;Name&gt;\\BepInEx\\plugins\\</code><br><strong>Linux:</strong> <code>~/.local/share/com.kesomannen.gale/valheim/profiles/&lt;Name&gt;/BepInEx/plugins/</code></td>
              <td>In Gale: Click <strong>Profile</strong> &rarr; <strong>Open profile folder</strong>.</td>
              <td>Auto-detects your Gale profiles and deploys <code>HelloValheim.dll</code> automatically.</td>
            </tr>
          </tbody>
        </table>
      </div>`,
      commands: {
        win: `# How to open PowerShell right here:
# Right-click the "valheim-modding-101" folder in File Explorer -> Click "Open in Terminal"

# Option 1: Run our Folder Finder & Opener (scans C:, D:, E: + Mod Managers and pops open File Explorer):
powershell -ExecutionPolicy Bypass -File .\\tools\\doctor.ps1 -Open

# Option 2: Standalone 1-Liner (works anywhere, even before downloading this repo!):
explorer.exe "$env:USERPROFILE\\AppData\\LocalLow\\IronGate\\Valheim"`,
        linux: `# Option 1: Run our Folder Finder & Opener (finds Steam + r2modman/Gale profiles and opens File Manager):
bash ./tools/doctor.sh --open

# Option 2: Standalone 1-Liner (works anywhere, even before downloading this repo!):
xdg-open "$HOME/.config/unity3d/IronGate/Valheim"`
      },
      expectedOutput: {
        win: `=== Valheim 1.0.20 Folder & Profile Finder ===
[FOUND] Steam Valheim Folder : C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim
[FOUND] Save Vault (Safe)    : C:\\Users\\Viking\\AppData\\LocalLow\\IronGate\\Valheim
[FOUND] Mod Manager Profile  : r2modman (Profile: Default)
[OPEN]  Opened File Explorer to your active Valheim folder!`,
        linux: `=== Valheim 1.0.20 Folder & Profile Finder ===
[FOUND] Steam Valheim Folder : /home/viking/.local/share/Steam/steamapps/common/Valheim
[FOUND] Save Vault (Safe)    : /home/viking/.config/unity3d/IronGate/Valheim
[FOUND] Mod Manager Profile  : r2modmanPlus-local (Profile: Default)
[OPEN]  Opened File Manager to your active Valheim folder!`
      },
      codeTitle: "Where Every File Goes (And How to Copy Mods Between Profiles)",
      codeSnippet: `===========================================================================
THE 3 FILE DESTINATIONS INSIDE ANY BEPINEX FOLDER
===========================================================================
1. Mod Code (.dll)   --> BepInEx/plugins/HelloValheim/HelloValheim.dll
2. Settings (.cfg)   --> BepInEx/config/com.valheim101.hellovalheim.cfg
3. Startup Receipt   --> BepInEx/LogOutput.log (Check 'Date Modified'!)

===========================================================================
WHICH FOLDER IS ACTIVE WHEN YOU LAUNCH VALHEIM?
===========================================================================
• Click "Play" in Steam          --> Loads Steam/steamapps/common/Valheim/BepInEx/
• Click "Start Modded" in Manager --> Loads profiles/<ProfileName>/BepInEx/
• Click "Start Vanilla"           --> Skips BepInEx completely (100% unmodded)

===========================================================================
HOW TO MOVE YOUR MOD BETWEEN STEAM AND A MOD MANAGER PROFILE
===========================================================================
• Automatic: Run our build-and-deploy script in Step 3 (copies to BOTH!).
• Manual:    Copy BepInEx/plugins/HelloValheim/HelloValheim.dll from one
             BepInEx/plugins/ folder into the other.`,
      agentTask: "Run tools/doctor.sh --open (or tools/doctor.ps1 -Open on Windows) to locate my Steam Valheim install, Save Vault, and any Mod Manager profiles.",
      onTrack: "You know where your Steam Valheim folder and Mod Manager profile folder live, and how to check `LogOutput.log`'s timestamp to see which one is active.",
      cliffEdge: {
        symptom: "I copied my .dll into the Steam folder, clicked 'Start Modded' in Thunderstore/r2modman, and my mod isn't loading!",
        why: "When you click 'Start Modded' in a Mod Manager, it tells Valheim to load mods ONLY from that Mod Manager's profile folder—ignoring the Steam folder completely.",
        cause: "When you click 'Start Modded' in a Mod Manager, it tells Valheim to load mods ONLY from that Mod Manager's profile folder—ignoring the Steam folder completely.",
        fix: "Either copy your .dll into your Mod Manager profile's BepInEx/plugins/ folder (Settings -> Browse profile folder) or run our build-and-deploy script, which automatically copies HelloValheim.dll to BOTH your Steam folder and your Mod Manager profiles."
      },
      defaultInspectorTab: "csproj",
      inspectorHighlightNote: "See lines 14–19 of HelloValheim.csproj: automatic Valheim path detection across Windows and Linux.",
      diagramTitle: "Path A (Direct Steam) vs. Path B (Mod Profile) vs. Save Vault (Hover Any Box)",
      diagramCaption: "Compare how launching from Steam vs. launching from Thunderstore / r2modman / Gale chooses your active BepInEx folder.",
      svgDiagram: `<svg viewBox="0 0 680 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Direct Steam Folder vs Mod Manager Profile Folder vs Protected Save Vault">
        <rect x="6" y="6" width="668" height="238" rx="10" fill="#111418" stroke="#2B323D"/>
        <text x="20" y="26" fill="#D4A359" font-family="monospace" font-size="11" font-weight="bold">WHERE YOUR FOLDERS LIVE: STEAM VS. MOD PROFILES VS. SAVE VAULT (HOVER ANY BOX)</text>

        <g class="map-node" tabindex="0" data-tooltip="Path A (Direct Steam Folder): Used when you click 'Play' directly in Steam. Mods sit inside steamapps/common/Valheim/BepInEx/plugins/.">
          <rect x="18" y="38" width="208" height="142" rx="8" fill="#181C23" stroke="#D4A359" stroke-width="1.5"/>
          <text x="28" y="58" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">🅰️ Path A: Direct Steam</text>
          <text x="28" y="75" fill="#B6B0A6" font-family="sans-serif" font-size="11">Launch via Steam "Play"</text>
          <text x="28" y="95" fill="#F3EFEA" font-family="monospace" font-size="10">📁 steamapps/common/Valheim/</text>
          <text x="36" y="112" fill="#22C55E" font-family="monospace" font-size="10">├─ BepInEx/plugins/*.dll</text>
          <text x="36" y="128" fill="#D4A359" font-family="monospace" font-size="10">├─ BepInEx/config/*.cfg</text>
          <text x="36" y="144" fill="#F59E0B" font-family="monospace" font-size="10">└─ BepInEx/LogOutput.log</text>
          <text x="28" y="166" fill="#B6B0A6" font-family="monospace" font-size="10">Right-click -&gt; Browse local files</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Path B (Mod Manager Profile): Used when clicking 'Start Modded' in Thunderstore, r2modman, or Gale. Passes --doorstop-target so Steam stays 100% vanilla!">
          <rect x="236" y="38" width="212" height="142" rx="8" fill="#181C23" stroke="#22C55E" stroke-width="1.5"/>
          <text x="246" y="58" fill="#22C55E" font-family="sans-serif" font-size="12" font-weight="bold">🅱️ Path B: Mod Profile</text>
          <text x="246" y="75" fill="#B6B0A6" font-family="sans-serif" font-size="11">Thunderstore / r2modman / Gale</text>
          <text x="246" y="95" fill="#F3EFEA" font-family="monospace" font-size="10">📁 .../profiles/Default/</text>
          <text x="254" y="112" fill="#22C55E" font-family="monospace" font-size="10">├─ BepInEx/plugins/*.dll</text>
          <text x="254" y="128" fill="#D4A359" font-family="monospace" font-size="10">├─ BepInEx/config/*.cfg</text>
          <text x="254" y="144" fill="#F59E0B" font-family="monospace" font-size="10">└─ BepInEx/LogOutput.log</text>
          <text x="246" y="166" fill="#22C55E" font-family="monospace" font-size="10">Uses --doorstop-target flag</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="Protected Save Vault: Your worlds_local/ and characters_local/ live in AppData/LocalLow (Windows) or ~/.config (Linux), completely separate from mods!">
          <rect x="458" y="38" width="204" height="142" rx="8" fill="#181C23" stroke="#38BDF8" stroke-width="1.5"/>
          <text x="468" y="58" fill="#38BDF8" font-family="sans-serif" font-size="12" font-weight="bold">🛡️ Protected Save Vault</text>
          <text x="468" y="75" fill="#B6B0A6" font-family="sans-serif" font-size="11">Separate from Steam &amp; Mods</text>
          <text x="468" y="95" fill="#F3EFEA" font-family="monospace" font-size="10">📁 IronGate/Valheim/</text>
          <text x="476" y="112" fill="#38BDF8" font-family="monospace" font-size="10">├─ worlds_local/</text>
          <text x="476" y="128" fill="#38BDF8" font-family="monospace" font-size="10">├─ characters_local/</text>
          <text x="476" y="144" fill="#B6B0A6" font-family="monospace" font-size="10">└─ Automatic Backups</text>
          <text x="468" y="166" fill="#38BDF8" font-family="monospace" font-size="10">Never touched by .dll mods</text>
        </g>

        <g class="map-node" tabindex="0" data-tooltip="The 5-Second LogOutput.log Timestamp Trick: Not sure if Valheim loaded Path A or Path B? Launch Valheim and check which folder's BepInEx/LogOutput.log just updated its 'Date Modified' timestamp!">
          <rect x="18" y="190" width="644" height="44" rx="7" fill="#212730" stroke="#F59E0B"/>
          <text x="30" y="208" fill="#F59E0B" font-family="sans-serif" font-size="11" font-weight="bold">💡 5-Second Timestamp Trick: Which folder is Valheim actually using right now?</text>
          <text x="30" y="224" fill="#F3EFEA" font-family="monospace" font-size="11">Launch Valheim and check 'Date Modified' on BepInEx/LogOutput.log — the active folder updates!</text>
        </g>
      </svg>`,
      aiContext: "The user is in Step 1 learning the difference between Direct Steam folders (steamapps/common/Valheim/BepInEx) and Mod Manager Profile folders (Thunderstore, r2modman, Gale), how to open them in 3 clicks or via doctor --open, and how to check LogOutput.log timestamps."
    },

    /* ======================================================================
       STEP 2: Run the 4-Point Setup Check (doctor)
       ====================================================================== */
    {
      id: "2",
      sprint: 1,
      sprintLabel: "Phase 1 · Folders & Setup",
      numberLabel: "Step 2",
      shortTitle: "Check Setup",
      title: "Run the 4-Point Setup Check (doctor)",
      minutes: 3,
      timeBadge: "⏱️ 3 mins",
      liftBadge: "🟢 Easy",
      safeStop: null,
      undoBadge: "↩️ Read-Only Check",
      yieldNote: "Keep your Steam app open in the background before launching Valheim or running setup checks.",
      summary: "Most 'my mod compiled, why didn't it load?' issues happen because a loader file is in the wrong folder or a launch option is missing. Run our read-only `doctor` script to automatically scan all your drives (`C:`, `D:`, `E:`), detect Mod Manager profiles (`Thunderstore`, `r2modman`, `Gale`), and verify your `.NET SDK`, Valheim folder, game DLLs, and BepInEx setup in 5 seconds.",
      personaNotes: {
        P1: "Instead of guessing which drive or Mod Manager profile is active, `doctor` scans `libraryfolders.vdf` across `C:`, `D:`, `E:` and prints your exact Steam and profile paths.",
        P2: "Think of `tools/doctor` like `brew doctor` or `flutter doctor`: it checks `.NET SDK`, `assembly_valheim.dll`, `BepInEx 5.4.2202`, Mod Manager profiles, and launcher permissions.",
        P3: "Right-click `valheim-modding-101` -> **Open in Terminal**, paste the 1-line command below, and as soon as all 4 lines say `[PASS]`, move right on to Step 3.",
        P4: "If any check prints `[WARN]`, don't sweat it—the script prints the exact copy-paste fix right in your terminal.",
        P5: "Playing on Linux or Steam Deck? Check the Reference Table for the `chmod +x start_game_bepinex.sh` permission fix and why Proton should stay unchecked for native Linux."
      },
      steps: [
        "Make sure **Steam is open in the background** (Valheim closes immediately on startup if Steam isn't running).",
        "Open a terminal in the `valheim-modding-101` folder (Windows: **Right-click the `valheim-modding-101` folder → Open in Terminal**) and run the read-only `doctor` command below.",
        "Confirm `[PASS]` on **`.NET SDK`**, **`Valheim Directory`**, **`Game Assemblies`**, and **`BepInEx + Doorstop`** (plus any detected Mod Manager profiles)."
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
              <td><code>winhttp.dll</code> + <code>doorstop_config.ini</code> in Valheim folder (or Mod Manager profile)</td>
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
        win: `# Tip: Right-click the "valheim-modding-101" folder -> "Open in Terminal", then paste:
powershell -ExecutionPolicy Bypass -File .\\tools\\doctor.ps1`,
        linux: `# Run from the valheim-modding-101 folder in Bash:
bash ./tools/doctor.sh`
      },
      expectedOutput: {
        win: `=== Valheim 1.0.20 Modding Doctor (Windows PowerShell) ===
[PASS] .NET SDK          : 8.0.404 (C:\\Program Files\\dotnet\\dotnet.exe)
[PASS] Valheim Directory : C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim (Multi-drive scan)
[PASS] Game Assemblies   : assembly_valheim.dll + assembly_utils.dll found
[PASS] BepInEx + Doorstop: BepInEx 5.4.2202 & winhttp.dll ready (+ r2modman profile detected)
=== RESULT: READY FOR STEP 3 ===`,
        linux: `=== Valheim 1.0.20 Modding Doctor (Linux / SteamOS) ===
[PASS] .NET SDK          : 8.0.404 (/usr/share/dotnet/dotnet)
[PASS] Valheim Directory : /home/viking/.local/share/Steam/steamapps/common/Valheim
[PASS] Game Assemblies   : assembly_valheim.dll + assembly_utils.dll found
[PASS] BepInEx + Doorstop: BepInEx 5.4.2202, start_game_bepinex.sh (+x), libdoorstop_x64.so ready
=== RESULT: READY FOR STEP 3 ===`
      },
      codeTitle: "Linux Quick Fix: Making the BepInEx Startup Script Executable",
      codeSnippet: `# If Valheim on Linux launches without loading BepInEx, mark the loader script executable:
chmod +x "$HOME/.local/share/Steam/steamapps/common/Valheim/start_game_bepinex.sh"
chmod +x "$HOME/.local/share/Steam/steamapps/common/Valheim/doorstop_libs"/*.so
# And in Steam -> Right-click Valheim -> Properties -> Launch Options:
./start_game_bepinex.sh %command% -console`,
      agentTask: "Run tools/doctor.sh (or tools/doctor.ps1 on Windows), check the 4-point output and detected Mod Manager profiles, and fix any missing setup items before building.",
      onTrack: "The doctor script prints `[PASS]` on all four checks (`.NET SDK`, `Valheim Directory`, `Game Assemblies`, and `BepInEx + Doorstop`).",
      cliffEdge: {
        symptom: "Valheim launches to the main menu, but BepInEx never loads your mod.",
        why: "On Windows, `winhttp.dll` isn't in the same folder as `valheim.exe` (or you launched via Steam instead of your Mod Manager). On Linux, Steam didn't run `./start_game_bepinex.sh %command%` or the script isn't marked executable.",
        cause: "On Windows, `winhttp.dll` isn't in the same folder as `valheim.exe` (or you launched via Steam instead of your Mod Manager). On Linux, Steam didn't run `./start_game_bepinex.sh %command%` or the script isn't marked executable.",
        fix: "Windows: Put `winhttp.dll`, `doorstop_config.ini`, and `BepInEx/` directly inside `Valheim/` (or launch via your Mod Manager). Linux: Run `chmod +x start_game_bepinex.sh` and set Steam Launch Options to `./start_game_bepinex.sh %command% -console`."
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
      aiContext: "The user is in Step 2 running tools/doctor.ps1 or tools/doctor.sh to verify .NET SDK, Valheim install directory across drives, assembly_valheim.dll, Mod Manager profiles, and Doorstop/BepInEx files."
    },

    /* ======================================================================
       STEP 3: Build Your First Mod (.dll) in 2 Seconds
       ====================================================================== */
    {
      id: "3",
      sprint: 2,
      sprintLabel: "Phase 2 · First 15m Win",
      numberLabel: "Step 3",
      shortTitle: "Build Mod",
      title: "Build Your First Mod (.dll) in 2 Seconds",
      minutes: 4,
      timeBadge: "⏱️ 4 mins",
      liftBadge: "🟢 Easy",
      safeStop: "✓ Safe Checkpoint #1 (Built & Installed Cleanly)",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "Every game <Reference> in HelloValheim.csproj sets <Private>false</Private> so extra game DLLs are never copied into BepInEx/plugins/.",
      summary: "Now we compile `starter-mod/HelloValheim.csproj` against your installed Valheim 1.0.20 game files in 2 seconds. Our `build-and-deploy` script verifies that `<Private>false</Private>` kept your output folder clean and automatically copies the ~12 KB `HelloValheim.dll` to **both** your Steam folder and any detected `Thunderstore`, `r2modman`, or `Gale` profile (or a specific `--profile <Name>`).",
      personaNotes: {
        P1: "`build-and-deploy` automatically deploys `HelloValheim.dll` to your Steam `BepInEx/plugins/` folder AND any detected Thunderstore, r2modman, or Gale profile so it works no matter how you launch!",
        P2: "This is a standard `net48` SDK project using C# 12. Setting `<Private>false</Private>` on each `<Reference>` works just like `compileOnly` in Gradle.",
        P3: "Run the single `build-and-deploy` command below—it compiles your code AND copies the `.dll` into your plugins folder in 2 seconds.",
        P4: "First milestone! When you see `0 Warning(s), 0 Error(s)` and `HelloValheim.dll (~12 KB)`, you have officially built and installed a Valheim mod.",
        P5: "Notice we reference `assembly_utils.dll` right next to `assembly_valheim.dll` because Valheim 1.0 moved `Vector2s` and several helpers into `assembly_utils`."
      },
      steps: [
        "Run the `build-and-deploy` command below for your OS (it builds `HelloValheim.dll` and copies it to Steam and any detected Mod Manager profile).",
        "Check the **`Visual Map` on the right** and confirm the terminal prints **`0 Warning(s)`**, **`0 Error(s)`**, and outputs **only `HelloValheim.dll` (~12 KB)**.",
        "Need a break after this step? You've reached **✓ Safe Checkpoint #1**—your mod is built and safely installed."
      ],
      tableHtml: "",
      commands: {
        win: `# Compile HelloValheim.dll and deploy to Steam + detected Thunderstore/r2modman/Gale profiles:
powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1

# (Optional) Target a specific Mod Manager profile by name:
# powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1 -Profile "Default"`,
        linux: `# Compile HelloValheim.dll and deploy to Steam + detected r2modman/Gale profiles:
bash ./tools/build-and-deploy.sh

# (Optional) Target a specific Mod Manager profile by name:
# bash ./tools/build-and-deploy.sh --profile "Default"`
      },
      expectedOutput: {
        win: `Build succeeded.
    0 Warning(s)
    0 Error(s)
[PASS] Clean Build Gate: Only HelloValheim.dll (11,776 bytes) in bin/Release/
[PASS] Deployed to Steam   : C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim\\BepInEx\\plugins\\HelloValheim\\HelloValheim.dll
[PASS] Deployed to Profile : r2modman (Profile: Default)`,
        linux: `Build succeeded.
    0 Warning(s)
    0 Error(s)
[PASS] Clean Build Gate: Only HelloValheim.dll (12K) in bin/Release/
[PASS] Deployed to Steam   : /home/viking/.local/share/Steam/steamapps/common/Valheim/BepInEx/plugins/HelloValheim/HelloValheim.dll
[PASS] Deployed to Profile : r2modmanPlus-local (Profile: Default)`
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
      agentTask: "Build starter-mod/HelloValheim.csproj in Release mode, confirm 0 warnings/errors, verify only HelloValheim.dll is in bin/Release/, and deploy it.",
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
          <text x="34" y="166" fill="#B6B0A6" font-family="sans-serif" font-size="11">• Deploys to Steam + Mod Profiles</text>
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
      aiContext: "The user is in Step 3 compiling starter-mod/HelloValheim.csproj with dotnet build and deploying HelloValheim.dll to Steam and Mod Manager profiles via build-and-deploy."
    },

    /* ======================================================================
       STEP 4: Test Your Mod In-Game (F5 Console: vikingping)
       ====================================================================== */
    {
      id: "4",
      sprint: 2,
      sprintLabel: "Phase 2 · First 15m Win",
      numberLabel: "Step 4",
      shortTitle: "Test In-Game",
      title: "Test Your Mod In-Game (F5 Console: vikingping)",
      minutes: 5,
      timeBadge: "⏱️ 5 mins",
      liftBadge: "🟢 Easy",
      safeStop: "Keep Valheim running at the end of this step! In Step 5 (3 mins), you will edit your carry weight live while the game is still open.",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "On Linux/SteamOS, make sure your Steam Launch Options include ./start_game_bepinex.sh %command% -console so Steam runs BepInEx.",
      summary: "Time for the payoff! We confirm your mod is live in two quick ways: first by pressing `F5` at Valheim's main menu and typing your custom `vikingping` command, and second by checking `BepInEx/LogOutput.log` for `[HelloValheim 1.0.0]`. Keep Valheim open when you finish so you can test live settings in Step 5!",
      personaNotes: {
        P1: "`BepInEx/LogOutput.log` is your main log file—just like `latest.log` in Minecraft. Check it first whenever you test a change.",
        P2: "You can confirm your mod loaded in 2 seconds from the terminal (`Select-String` / `grep`) before even loading into a world.",
        P3: "Launch Valheim, press `F5` at the main menu, type `vikingping`, and see your `[HelloValheim 1.0.0] Pong! Active carry bonus: +150` reply!",
        P4: "Congratulations! Once `vikingping` replies in the `F5` console, your first Valheim mod is officially running. Leave Valheim open for Step 5!",
        P5: "Our `Terminal.InitTerminal` patch registers both `vikingping` and `vikinginspect` so your test commands work right at the main menu."
      },
      steps: [
        "Launch Valheim through Steam or your Mod Manager (with `-console` enabled in Launch Options).",
        "At the main menu, press **`F5`** to open the console, type **`vikingping`**, and compare with the **`Visual Map` on the right**.",
        "Run the terminal command below to see your startup message inside `BepInEx/LogOutput.log`.",
        "🔥 **Keep Valheim running!** Move straight to **Step 5 (`5. Live Settings`)** to change your carry weight from `+150` to `+500` while the game is still open."
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
        why: "Valheim hides the `F5` developer console unless `-console` is added to Steam's Launch Options (or your Mod Manager's launch arguments).",
        cause: "Valheim hides the `F5` developer console unless `-console` is added to Steam's Launch Options (or your Mod Manager's launch arguments).",
        fix: "In Steam -> Right-click Valheim -> Properties -> General -> Launch Options, add `-console` (Windows: `-console`; Linux: `./start_game_bepinex.sh %command% -console`)."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "See lines 89–117 of HelloValheimPlugin.cs: Terminal.InitTerminal Postfix registering 'vikingping' and 'vikinginspect'.",
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
      aiContext: "The user is in Step 4 verifying HelloValheim in-game via the F5 console command 'vikingping' and checking BepInEx/LogOutput.log."
    },

    /* ======================================================================
       STEP 5: Edit Your Mod Settings Live While Valheim Runs (.cfg)
       ====================================================================== */
    {
      id: "5",
      sprint: 2,
      sprintLabel: "Phase 2 · First 15m Win",
      numberLabel: "Step 5",
      shortTitle: "Live Settings",
      title: "Edit Your Mod Settings Live While Valheim Runs (.cfg)",
      minutes: 3,
      timeBadge: "⏱️ 3 mins",
      liftBadge: "🟢 Easy",
      safeStop: "Part 1 Complete! You built a mod, tested it in-game, and changed its settings live without restarting. Great place to take a break or stop for the night.",
      undoBadge: "↩️ Undo: Edit .cfg back to 150",
      yieldNote: "BepInEx creates BepInEx/config/com.valheim101.hellovalheim.cfg automatically the first time your mod loads inside Valheim.",
      summary: "Why restart Valheim every time you want to tweak a number? When you launched Valheim in Step 4, your mod automatically created `BepInEx/config/com.valheim101.hellovalheim.cfg` and started watching it for edits. Change `CarryWeightBonus = 150` to `500` in Notepad or your terminal while Valheim is still open, and watch `vikingping` update to `+500` immediately!",
      personaNotes: {
        P1: "Just like Forge config files in Minecraft, `Config.Bind` automatically creates the `.cfg` file with comments, default values, and min/max limits on first launch.",
        P2: "Passing `ThreadingHelper.SynchronizingObject` to `FileSystemWatcher` ensures file-change events run safely on Unity's main game thread.",
        P3: "Huge time-saver: keep Valheim open, change `CarryWeightBonus = 500` in Notepad or nano, save the file, and your Viking immediately gets `+500` carry weight!",
        P4: "If you install the popular `BepInEx ConfigurationManager` mod, our `AcceptableValueRange<float>(0f, 1000f)` line automatically creates a `0–1000` slider when you press `F1` in-game!",
        P5: "You can pair this same `Config.Bind` + `FileSystemWatcher` setup with server-synced settings in Type 2 mods for live server tuning."
      },
      steps: [
        "Hover the boxes in the **`Visual Map` on the right** to see how saving the `.cfg` file updates your live game without restarting.",
        "With Valheim still running from Step 4, open `BepInEx/config/com.valheim101.hellovalheim.cfg` in any text editor (or run the 1-line command below) and change `CarryWeightBonus = 150` to `CarryWeightBonus = 500`.",
        "Type **`vikingping`** in the in-game `F5` console again and see **`Active carry bonus: +500`** immediately!",
        "🎉 **Part 1 Complete!** You have built a mod, tested it in-game, and hot-reloaded its settings live. Take a well-earned break or continue to Phase 3 whenever you're ready!"
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
# In F5 Console (immediately, without restarting Valheim!):
> vikingping
[HelloValheim 1.0.0] Pong! Active carry bonus: +500 (Mod Enabled: True)`,
        linux: `[Info   :HelloValheim] [LiveConfig] CarryWeightBonus updated to +500 (800 total)
# In F5 Console (immediately, without restarting Valheim!):
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
        fix: "Launch Valheim once in Step 4 so BepInEx creates the `.cfg` file, and keep `SynchronizingObject = ThreadingHelper.SynchronizingObject` on your `FileSystemWatcher`."
      },
      defaultInspectorTab: "cfg",
      inspectorHighlightNote: "Switch between 'com.valheim101.hellovalheim.cfg' and 'HelloValheimPlugin.cs' (lines 28–75) in the code viewer below.",
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
      aiContext: "The user is in Step 5 editing BepInEx/config/com.valheim101.hellovalheim.cfg while Valheim is running to see live hot-reload in action."
    },

    /* ======================================================================
       STEP 6: Hook Game Methods with Harmony & Valheim 1.0 Changes
       ====================================================================== */
    {
      id: "6",
      sprint: 3,
      sprintLabel: "Phase 3 · Leveling Up",
      numberLabel: "Step 6",
      shortTitle: "Game Hooks (C#)",
      title: "Hook Game Methods with Harmony & Valheim 1.0 Changes",
      minutes: 8,
      timeBadge: "⏱️ 8 mins",
      liftBadge: "🟡 Intermediate",
      safeStop: null,
      undoBadge: "↩️ Undo: EnableMod = false",
      yieldNote: "When a Valheim 1.0.20 method has multiple versions with the same name (like PieceTable.SetCategory), always pass typeof(...) parameter types in [HarmonyPatch].",
      summary: "How did your mod actually add `+150` carry weight in Steps 4 & 5? Harmony gives you two main hooks: `[HarmonyPrefix]` (runs BEFORE a Valheim method) and `[HarmonyPostfix]` (runs AFTER a Valheim method and can change its return value `ref __result`). Here we inspect our carry-weight and achievement hooks, plus the **6 Valheim 1.0.20 Changes** that break older tutorials.",
      personaNotes: {
        P1: "If code from a 2022–2023 guide fails to compile or crashes on startup in Valheim 1.0.20, the 6-row Reference Table below shows the exact fix.",
        P2: "Harmony injects special parameters by name at runtime: `__instance` (the `this` object), `ref __result` (the return value), and `__state` (data passed from Prefix to Postfix).",
        P3: "Check out `PlayerCarryWeightPatch` in the code box: just 4 lines of C# (`__result += CarryWeightBonus.Value;`) adds your custom carry weight bonus to your Viking!",
        P4: "Look at `AchievementsSafetyPatch`: setting `__result = false` on `Achievements.IsCheatedAtAll` keeps Steam achievements working while you test console commands.",
        P5: "Keep the **6 Valheim 1.0.20 Changes** table handy—these 6 method signature updates fix 95% of older mods moving to Valheim 1.0.20."
      },
      steps: [
        "Hover the pipeline boxes in the **`Visual Map` on the right** to see how `[HarmonyPrefix]`, the original game method, `[HarmonyPostfix]`, and `[HarmonyFinalizer]` run in order.",
        "Inspect `PlayerCarryWeightPatch` (adds `CarryWeightBonus.Value` to `Player.GetMaxCarryWeight`) and `AchievementsSafetyPatch` in the code viewer.",
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
        win: `# Rebuild and deploy after editing a Harmony patch in starter-mod/HelloValheimPlugin.cs:
powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1`,
        linux: `# Rebuild and deploy after editing a Harmony patch in starter-mod/HelloValheimPlugin.cs:
bash ./tools/build-and-deploy.sh`
      },
      expectedOutput: {
        win: `Build succeeded.
    0 Warning(s)
    0 Error(s)
[PASS] Deployed HelloValheim.dll -> CarryWeightBonus Postfix & Achievements Postfix active.`,
        linux: `Build succeeded.
    0 Warning(s)
    0 Error(s)
[PASS] Deployed HelloValheim.dll -> CarryWeightBonus Postfix & Achievements Postfix active.`
      },
      codeTitle: "Changing a Method's Return Value with [HarmonyPostfix]",
      codeSnippet: `[HarmonyPatch(typeof(Player), nameof(Player.GetMaxCarryWeight))]
public static class PlayerCarryWeightPatch
{
    [HarmonyPostfix]
    private static void Postfix(Player __instance, ref float __result)
    {
        if (!HelloValheimPlugin.EnableMod.Value || __instance == null) return;
        __result += HelloValheimPlugin.CarryWeightBonus.Value; // 300 base + bonus!
    }
}`,
      agentTask: "Help me add or customize a Harmony patch in starter-mod/HelloValheimPlugin.cs following the 6 Valheim 1.0.20 method rules.",
      onTrack: "You understand how `[HarmonyPrefix]` and `[HarmonyPostfix]` hook Valheim methods and how to avoid the 6 Valheim 1.0.20 signature pitfalls.",
      cliffEdge: {
        symptom: "Patching an overloaded Valheim 1.0.20 method crashes with an AmbiguousMatchException error.",
        why: "Valheim 1.0.20 has multiple methods with the same name (like `PieceTable.SetCategory`), so Harmony needs to know which parameter types you want to patch.",
        cause: "Valheim 1.0.20 has multiple methods with the same name (like `PieceTable.SetCategory`), so Harmony needs to know which parameter types you want to patch.",
        fix: "Pass the parameter types inside `[HarmonyPatch(nameof(PieceTable.SetCategory), new[] { typeof(int) })]` and use the Copy AI Prompt button so your AI assistant uses 1.0.20 signatures."
      },
      defaultInspectorTab: "plugin",
      inspectorHighlightNote: "See lines 119–156 of HelloValheimPlugin.cs: PlayerCarryWeightPatch and AchievementsSafetyPatch.",
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

        <g class="map-node" tabindex="0" data-tooltip="[HarmonyPostfix]: Runs AFTER the game method finishes. Our patch adds CarryWeightBonus.Value to ref __result!">
          <rect x="350" y="38" width="148" height="64" rx="7" fill="#181C23" stroke="#D4A359"/>
          <text x="360" y="58" fill="#D4A359" font-family="sans-serif" font-size="12" font-weight="bold">3. [HarmonyPostfix]</text>
          <text x="360" y="75" fill="#F3EFEA" font-family="monospace" font-size="11">__result += Bonus;</text>
          <text x="360" y="90" fill="#B6B0A6" font-family="monospace" font-size="11">Modifies return val</text>
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
      aiContext: "The user is in Step 6 writing Harmony Prefix/Postfix patches and applying the 6 Valheim 1.0.20 changes cheat sheet."
    },

    /* ======================================================================
       STEP 7: Read Crash Logs, Prevent Null Errors & Attach a Debugger
       ====================================================================== */
    {
      id: "7",
      sprint: 3,
      sprintLabel: "Phase 3 · Leveling Up",
      numberLabel: "Step 7",
      shortTitle: "Fix Crashes",
      title: "Read Crash Logs, Prevent Null Errors & Attach a Debugger",
      minutes: 7,
      timeBadge: "⏱️ 7 mins",
      liftBadge: "🟡 Intermediate",
      safeStop: null,
      undoBadge: "↩️ Undo: debug_enabled = false",
      yieldNote: "Player.m_localPlayer is null at the Main Menu before you enter a world—always start player patches with if (Player.m_localPlayer == null) return;.",
      summary: "Now that you know how Harmony hooks work, learn how to read a Valheim error log in 10 seconds! When Harmony patches a method like `Player.GetMaxCarryWeight`, crash logs label that patched method as `DMD<Player::GetMaxCarryWeight>` and list the exact mod that failed right above it. You'll also see how `[HarmonyFinalizer]` prevents crashes and how to connect a code debugger.",
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
              <td>List the parameter types in <code>[HarmonyPatch(nameof(Method), typeof(int))]</code> (see Step 6).</td>
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
[vikinginspect] LocalPlayer=Spawned (MaxCarry=800, IsOwner=True) | IsDedicated=False`,
        linux: `# In F5 Console at Main Menu:
> vikinginspect
[vikinginspect] LocalPlayer=null (Main Menu / Unspawned) | IsDedicated=False

# In F5 Console after spawning into a World:
> vikinginspect
[vikinginspect] LocalPlayer=Spawned (MaxCarry=800, IsOwner=True) | IsDedicated=False`
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
      inspectorHighlightNote: "See lines 104–140 of HelloValheimPlugin.cs: the 'vikinginspect' command and [HarmonyFinalizer] safety net.",
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
      aiContext: "The user is in Step 7 learning how to read DMD<Class::Method> Harmony stack traces in BepInEx/LogOutput.log, prevent Player.m_localPlayer == null errors, use [HarmonyFinalizer], and attach a debugger on 127.0.0.1:10000."
    },

    /* ======================================================================
       STEP 8: Search Game Code, Server Rules & Share Your Mod (.zip)
       ====================================================================== */
    {
      id: "8",
      sprint: 3,
      sprintLabel: "Phase 3 · Leveling Up",
      numberLabel: "Step 8",
      shortTitle: "Share & Servers",
      title: "Search Game Code, Server Rules & Share Your Mod (.zip)",
      minutes: 10,
      timeBadge: "⏱️ 10 mins",
      liftBadge: "🟡 Intermediate",
      safeStop: "✓ Course Complete! (Ready to Share & Publish)",
      undoBadge: "↩️ Undo: build-and-deploy --reset",
      yieldNote: "Dedicated Servers run without graphics or a local player—always skip UI and audio code when ZNet.instance.IsDedicated() is true.",
      summary: "To find any Valheim feature you want to mod next and share your mod with friends, learn three essentials: (1) how to search Valheim's game code (`assembly_valheim.dll`) with **ILSpy**, (2) how multiplayer decides which player controls nearby creatures (`m_nview.IsOwner()`) vs. what a Dedicated Server runs (`ZNet.instance.IsDedicated()`), and (3) how to package a `.zip` and import it directly into `r2modman`, `Thunderstore`, or `Gale` via **Profile → Import local mod**.",
      personaNotes: {
        P1: "Unlike Minecraft where the server runs every monster, Valheim gives control of each 64×64m map zone to the first player who walks into it (`m_nview.IsOwner()`).",
        P2: "Linux and Windows Dedicated Servers run in headless mode with no screen, audio, or `Player.m_localPlayer`. Always guard client UI/audio patches with `if (ZNet.instance.IsDedicated()) return;`.",
        P3: "Want to find the method for stamina use, boat speed, or workbench range? Search `assembly_valheim.dll` with `ilspycmd` using the command below!",
        P4: "Your `starter-mod/` folder already includes `manifest.json` and `thunderstore.toml`—zip your mod and test importing it into r2modman, Thunderstore, or Gale via **Profile → Import local mod**!",
        P5: "Check the **`Reference Table`**—mixing up `ZNet.instance.IsServer()` and `m_nview.IsOwner()` is the #1 cause of duplicate loot drops in multiplayer."
      },
      steps: [
        "Use `ilspycmd` (or the ILSpy desktop app) with the command below to search `assembly_valheim.dll` for any game class you want to mod next (`Player`, `Ship`, `Humanoid`, `CraftingStation`).",
        "Hover the 3 columns in the **`Visual Map` on the right** and open the **`Reference Table`** to compare `m_nview.IsOwner()`, `IsServer()`, and `IsDedicated()`.",
        "Run the `.zip` packaging command below to bundle `manifest.json`, `README.md`, and `HelloValheim.dll` into `HelloValheim-1.0.0.zip`.",
        "**Import your `.zip` into `r2modman` / `Thunderstore` / `Gale`:** Open your Mod Manager, click **Settings (or Profile) → Import local mod**, and select `starter-mod/HelloValheim-1.0.0.zip`!"
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

# 2. Package HelloValheim-1.0.0.zip (for Thunderstore / r2modman / Gale -> "Import local mod"):
Compress-Archive -Path .\\starter-mod\\manifest.json, .\\README.md, .\\starter-mod\\bin\\Release\\HelloValheim.dll -DestinationPath .\\starter-mod\\HelloValheim-1.0.0.zip -Force`,
        linux: `# 1. Search any Valheim 1.0.20 class (e.g., Player) from Bash with ilspycmd:
# (Install once via: dotnet tool install -g ilspycmd)
ilspycmd "$HOME/.local/share/Steam/steamapps/common/Valheim/valheim_Data/Managed/assembly_valheim.dll" -t Player | grep -E "GetMaxCarryWeight|Update"

# 2. Package HelloValheim-1.0.0.zip (for r2modman / Gale / Thunderstore -> "Import local mod"):
cd ./starter-mod && zip -j HelloValheim-1.0.0.zip manifest.json ../README.md bin/Release/HelloValheim.dll`
      },
      expectedOutput: {
        win: `public float GetMaxCarryWeight()
private void Update()
# Packaged: starter-mod\\HelloValheim-1.0.0.zip
# In Thunderstore / r2modman / Gale: Settings (or Profile) -> Import local mod -> Select HelloValheim-1.0.0.zip!`,
        linux: `public float GetMaxCarryWeight()
private void Update()
# Packaged: starter-mod/HelloValheim-1.0.0.zip
# In r2modman / Gale: Settings (or Profile) -> Import local mod -> Select HelloValheim-1.0.0.zip!`
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
      agentTask: "Check my mod for Dedicated Server safety (ZNet.instance.IsDedicated()), multiplayer zone ownership (m_nview.IsOwner()), and Thunderstore .zip packaging.",
      onTrack: "You know when to check `m_nview.IsOwner()` vs. `ZNet.instance.IsDedicated()`, and you can package `HelloValheim-1.0.0.zip` and import it into a Mod Manager.",
      cliffEdge: {
        symptom: "Your mod crashes a Dedicated Server or drops duplicate multiplayer loot.",
        why: "Touching `Hud.instance` or `Player.m_localPlayer` on a headless server crashes because no player screen exists, and spawning loot without checking `m_nview.IsOwner()` runs on every nearby player's PC.",
        cause: "Touching `Hud.instance` or `Player.m_localPlayer` on a headless server crashes because no player screen exists, and spawning loot without checking `m_nview.IsOwner()` runs on every nearby player's PC.",
        fix: "Guard all UI and keybind code with `if (ZNet.instance.IsDedicated()) return;` and guard creature/loot changes with `if (!m_nview.IsValid() || !m_nview.IsOwner()) return;`."
      },
      defaultInspectorTab: "manifest",
      inspectorHighlightNote: "See 'manifest.json + thunderstore.toml' or 'HelloValheimPlugin.cs' (lines 158–178) in the code viewer below.",
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
      aiContext: "The user is in Step 8 learning ILSpy decompilation, Valheim multiplayer zone ownership (m_nview.IsOwner()), headless Dedicated Server guards (ZNet.instance.IsDedicated()), ZRoutedRpc, and Thunderstore/r2modman/Gale local .zip import and publishing."
    }
  ]
};
