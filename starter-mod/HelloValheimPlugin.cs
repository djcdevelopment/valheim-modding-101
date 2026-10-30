// =============================================================================
// Welcome to HelloValheim — Your Valheim 1.0.21 (Deep North) Starter Mod!
// =============================================================================
// Every section in this file maps 1-to-1 to the Tutorial Chambers in the guide.
// You don't need to understand the whole file at once:
//   - Sprint 1 (15 mins): Read Chamber 2 & Chamber 3 below.
//   - Sprint 2 (30 mins): Explore Chambers 3.5, 4, 4.5, and 5 at your own pace.
// =============================================================================

namespace HelloValheim;

using System;
using System.IO;
using System.Reflection;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Logging;
using HarmonyLib;

/// <summary>
/// ============================================================================
/// CHAMBER 2 & CHAMBER 3 (LESSON 1): Plugin Entry Point & Instant In-Game Proof
/// ============================================================================
/// Every BepInEx 5 plugin is a standard C# class that inherits from BaseUnityPlugin
/// (which itself is a Unity MonoBehaviour attached to a hidden GameObject at boot).
/// </summary>
[BepInPlugin(PluginGuid, PluginName, PluginVersion)]
public sealed class HelloValheimPlugin : BaseUnityPlugin
{
    // Unique identifier in reverse-DNS format. Never change this once published,
    // because BepInEx names your config file "<PluginGuid>.cfg"!
    public const string PluginGuid = "com.example.hellovalheim";
    public const string PluginName = "HelloValheim";
    public const string PluginVersion = "1.0.0";

    // Expose a static logger so our static Harmony patch classes can log safely.
    internal static ManualLogSource Log { get; private set; } = null!;

    // =========================================================================
    // CHAMBER 4.5 (LESSON 2): BepInEx ConfigEntry<T> & AcceptableValueRange
    // =========================================================================
    // Instead of hardcoding magic numbers in C#, bind them to ConfigEntry<T>.
    // BepInEx automatically creates and parses:
    //   BepInEx/config/com.example.hellovalheim.cfg
    public static ConfigEntry<bool> EnableMod { get; private set; } = null!;
    public static ConfigEntry<float> CarryWeightBonus { get; private set; } = null!;
    public static ConfigEntry<bool> EnableModdedAchievements { get; private set; } = null!;

    // Used by our live FileSystemWatcher to debounce rapid file-save events from text editors.
    private FileSystemWatcher? _configWatcher;
    private DateTime _lastConfigReloadUtc = DateTime.MinValue;

    /// <summary>
    /// Awake() is called by Unity/BepInEx once when the game boots to the main menu.
    /// WARNING (Valheim 1.0 Cliff-Edge #6): During Awake(), early game singletons like
    /// Player.m_localPlayer, ZNet.instance, and PlatformManager.DistributionPlatform
    /// are STILL NULL. Do not touch gameplay objects here—bind configs and apply patches!
    /// </summary>
    private void Awake()
    {
        Log = Logger;

        // 1. Bind configuration entries (Chamber 4.5)
        EnableMod = Config.Bind(
            section: "1. General",
            key: "EnableMod",
            defaultValue: true,
            description: "Master switch. Set to false to disable all HelloValheim gameplay hooks immediately."
        );

        // Using AcceptableValueRange<float>(0f, 1000f) does two awesome things:
        //   (a) Clamps out-of-range values if a user types -9999 in the .cfg file.
        //   (b) Automatically renders an interactive 0–1000 slider in the F1 ConfigurationManager UI!
        CarryWeightBonus = Config.Bind(
            section: "2. Gameplay",
            key: "CarryWeightBonus",
            defaultValue: 150f,
            configDescription: new ConfigDescription(
                "Extra carry weight added to your Viking.",
                new AcceptableValueRange<float>(0f, 1000f)
            )
        );

        EnableModdedAchievements = Config.Bind(
            section: "3. Achievements",
            key: "EnableModdedAchievements",
            defaultValue: true,
            description: "Allow earning Steam achievements while BepInEx is loaded (unless real devcommands/cheats are used)."
        );

        // 2. Start watching com.example.hellovalheim.cfg so edits apply live without restarting Valheim!
        SetupConfigWatcher();

        // 3. Scan this assembly for [HarmonyPatch] classes and apply them all.
        Harmony.CreateAndPatchAll(Assembly.GetExecutingAssembly(), harmonyInstanceId: PluginGuid);

        // 4. Print a high-visibility startup banner to BepInEx/LogOutput.log (Chamber 3 Sightline).
        Log.LogInfo("==================================================================");
        Log.LogInfo($" {PluginName} v{PluginVersion} loaded! Welcome to Valheim 1.0 Modding.");
        Log.LogInfo($" -> CarryWeightBonus : +{CarryWeightBonus.Value:0} (Edit {PluginGuid}.cfg live!)");
        Log.LogInfo(" -> In-Game Console  : Press F5 and type 'vikingping' or 'vikinginspect'");
        Log.LogInfo("==================================================================");
    }

    private void OnDestroy()
    {
        _configWatcher?.Dispose();
    }

    /// <summary>
    /// ========================================================================
    /// CHAMBER 4.5 (LESSON 2): Live .cfg File Hot-Reload Watcher
    /// ========================================================================
    /// Watches BepInEx/config/com.example.hellovalheim.cfg while Valheim is running.
    /// When you save the file in VS Code / Notepad, Config.Reload() runs automatically
    /// and your Viking's carry weight updates on the very next frame!
    /// </summary>
    private void SetupConfigWatcher()
    {
        string configFileName = $"{PluginGuid}.cfg";
        if (string.IsNullOrEmpty(Paths.ConfigPath) || !Directory.Exists(Paths.ConfigPath))
        {
            return;
        }

        _configWatcher = new FileSystemWatcher(Paths.ConfigPath, configFileName)
        {
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size | NotifyFilters.FileName,
            SynchronizingObject = ThreadingHelper.SynchronizingObject,
            EnableRaisingEvents = true
        };

        _configWatcher.Changed += OnConfigFileChanged;
        _configWatcher.Created += OnConfigFileChanged;
        _configWatcher.Renamed += OnConfigFileChanged;
    }

    private void OnConfigFileChanged(object sender, FileSystemEventArgs e)
    {
        // Text editors often fire 2-3 write events within a few milliseconds on save.
        // A 250ms debounce ensures we only reload once per save.
        DateTime now = DateTime.UtcNow;
        if ((now - _lastConfigReloadUtc).TotalMilliseconds < 250)
        {
            return;
        }
        _lastConfigReloadUtc = now;

        try
        {
            Config.Reload();
            Log.LogInfo(
                $"[Hot-Reload] Config updated live! CarryWeightBonus is now +{CarryWeightBonus.Value:0} " +
                $"(EnableMod={EnableMod.Value}, EnableModdedAchievements={EnableModdedAchievements.Value})"
            );
        }
        catch (Exception ex)
        {
            Log.LogWarning($"[Hot-Reload] Could not reload {PluginGuid}.cfg yet (file may still be locked by editor): {ex.Message}");
        }
    }

    /// <summary>
    /// ========================================================================
    /// CHAMBER 5 (LESSON 5): Dedicated Server Headless Guard Helper
    /// ========================================================================
    /// On a headless Linux or Windows Dedicated Server (valheim_server.x86_64 -batchmode -nographics),
    /// Player.m_localPlayer, Hud.instance, AudioMan, and GUI textures DO NOT EXIST.
    /// Always guard client-only UI/audio logic with IsDedicatedServerHeadless()!
    /// </summary>
    public static bool IsDedicatedServerHeadless()
    {
        return ZNet.instance != null && ZNet.instance.IsDedicated();
    }
}

/// <summary>
/// ============================================================================
/// CHAMBER 3 & CHAMBER 3.5 (LESSON 1): Custom F5 Console Commands & Inspector
/// ============================================================================
/// Hooks Terminal.InitTerminal so the player can press F5 at the main menu or
/// in-game and run:
///   - vikingping    (Chamber 3: Instant proof your mod is alive)
///   - vikinginspect (Chamber 3.5: Zero-crash live state inspection)
/// </summary>
[HarmonyPatch(typeof(Terminal), "InitTerminal")]
internal static class TerminalCommandsPatch
{
    [HarmonyPostfix]
    private static void InitTerminal_Postfix()
    {
        // Command 1: 'vikingping' — Your 15-minute first win!
        _ = new Terminal.ConsoleCommand(
            "vikingping",
            "[HelloValheim] Print a confirmation banner proving your Valheim 1.0 mod is active",
            args =>
            {
                string valheimVersion = global::Version.GetVersionString();
                float bonus = HelloValheimPlugin.EnableMod.Value
                    ? HelloValheimPlugin.CarryWeightBonus.Value
                    : 0f;

                args.Context.AddString("==========================================================");
                args.Context.AddString($"  SKAL! {HelloValheimPlugin.PluginName} v{HelloValheimPlugin.PluginVersion} is LIVE on Valheim {valheimVersion}!");
                args.Context.AddString($"  Active CarryWeightBonus : +{bonus:0} (Mod Enabled: {HelloValheimPlugin.EnableMod.Value})");
                args.Context.AddString("  Tip: Edit BepInEx/config/com.example.hellovalheim.cfg while playing!");
                args.Context.AddString("==========================================================");

                HelloValheimPlugin.Log.LogInfo($"[vikingping] Executed in F5 console on Valheim {valheimVersion} (+{bonus:0} carry weight).");
            }
        );

        // Command 2: 'vikinginspect' — Chamber 3.5 Live Runtime State Inspector.
        // Demonstrates defensive null-checking so running this at the Main Menu
        // (where Player.m_localPlayer and ZNet.instance are null) never throws a NullReferenceException!
        _ = new Terminal.ConsoleCommand(
            "vikinginspect",
            "[HelloValheim] Safely inspect Player, ZNet, and Environment state (works at Main Menu or In-World)",
            args =>
            {
                args.Context.AddString("----------------------------------------------------------");
                args.Context.AddString("  HelloValheim :: Live Runtime Inspector (Chamber 3.5)    ");
                args.Context.AddString("----------------------------------------------------------");

                // 1. Inspect Local Player safely (NULL at Main Menu or on Dedicated Server!)
                Player? localPlayer = Player.m_localPlayer;
                if (localPlayer == null)
                {
                    args.Context.AddString("  [Player]  Player.m_localPlayer is NULL (You are at the Main Menu or in a scene transition)");
                }
                else
                {
                    float health = localPlayer.GetHealth();
                    float maxHealth = localPlayer.GetMaxHealth();
                    float stamina = localPlayer.GetStamina();
                    float maxCarry = localPlayer.GetMaxCarryWeight();
                    Heightmap.Biome biome = localPlayer.GetCurrentBiome();

                    args.Context.AddString(
                        $"  [Player]  Name: {localPlayer.GetPlayerName()} | HP: {health:0}/{maxHealth:0} | " +
                        $"Stamina: {stamina:0} | MaxCarryWeight: {maxCarry:0} | Biome: {biome}"
                    );
                }

                // 2. Inspect ZNet Networking Mode safely
                ZNet? znet = ZNet.instance;
                if (znet == null)
                {
                    args.Context.AddString("  [ZNet]    ZNet.instance is NULL (No world loaded yet)");
                }
                else
                {
                    string netMode = znet.IsDedicated()
                        ? "Dedicated Server (Headless)"
                        : (znet.IsServer() ? "Local/Listen Server Host" : "Multiplayer Client");
                    args.Context.AddString($"  [ZNet]    Mode: {netMode} | World: {znet.GetWorldName()}");
                }

                // 3. Inspect Environment Manager safely
                EnvMan? envMan = EnvMan.instance;
                if (envMan == null)
                {
                    args.Context.AddString("  [EnvMan]  EnvMan.instance is NULL");
                }
                else
                {
                    string currentEnv = envMan.GetCurrentEnvironment()?.m_name ?? "None";
                    args.Context.AddString($"  [EnvMan]  Current Weather/Environment: {currentEnv}");
                }

                args.Context.AddString("----------------------------------------------------------");
            }
        );
    }
}

/// <summary>
/// ============================================================================
/// CHAMBER 3.5 & CHAMBER 4 (LESSON 3): Gameplay Postfix + [HarmonyFinalizer]
/// ============================================================================
/// Patches Player.GetMaxCarryWeight() to add CarryWeightBonus.Value.
///
/// WHY THIS STACK TRACE LESSON MATTERS (Chamber 3.5):
/// When Harmony patches a method, it compiles a wrapper called a DynamicMethod Definition:
///   (wrapper dynamic-method) Player.DMD<Player::GetMaxCarryWeight>(Player)
/// Whenever you see "DMD<Class::Method>" in BepInEx/LogOutput.log, that is smoking-gun
/// proof that at least one Harmony mod patched that method!
///
/// Adding a [HarmonyFinalizer] below ensures that even if an unexpected exception occurs
/// inside a patch, we log a clean diagnostic once instead of crashing the player's UI frame loop.
/// </summary>
[HarmonyPatch(typeof(Player), nameof(Player.GetMaxCarryWeight))]
internal static class PlayerCarryWeightPatch
{
    private static bool _loggedErrorOnce;

    // __result is passed by 'ref' so we can modify the return value after vanilla Valheim
    // finishes calculating base carry weight (300) + Megingjord belt bonus (+150).
    [HarmonyPostfix]
    private static void GetMaxCarryWeight_Postfix(ref float __result)
    {
        if (!HelloValheimPlugin.EnableMod.Value)
        {
            return;
        }

        __result += HelloValheimPlugin.CarryWeightBonus.Value;
    }

    // [HarmonyFinalizer] wraps the original method and all Prefix/Postfix hooks in a try/catch.
    // Returning 'null' swallows the exception so the game keeps running smoothly!
    [HarmonyFinalizer]
    private static Exception? GetMaxCarryWeight_Finalizer(Exception? __exception)
    {
        if (__exception != null && !_loggedErrorOnce)
        {
            _loggedErrorOnce = true;
            HelloValheimPlugin.Log.LogError(
                $"[Fault Isolation] Caught exception in DMD<Player::GetMaxCarryWeight>: {__exception}"
            );
        }

        return null;
    }
}

/// <summary>
/// ============================================================================
/// CHAMBER 4 (LESSON 4): Valheim 1.0 Scoped State-Passing Pattern (IsModded)
/// ============================================================================
/// In Valheim 1.0, Iron Gate checks Game.isModded inside Achievements.IsCheatedAtAll().
/// Instead of replacing the entire method (which would break future game patches or
/// disable real cheat checks), we use Harmony's '__state' struct to:
///   1. Prefix    : Save original Game.isModded and temporarily set it to false.
///   2. Vanilla   : Let Iron Gate's full 1.0 achievement check run normally.
///   3. Postfix   : Restore Game.isModded back to its original value.
///   4. Finalizer : Guarantee Game.isModded is restored even if an exception occurs!
/// </summary>
[HarmonyPatch(typeof(Achievements), nameof(Achievements.IsCheatedAtAll))]
internal static class AchievementsStatePassingPatch
{
    internal struct ModdedState
    {
        public bool WasMasked;
        public bool OriginalIsModded;
    }

    [HarmonyPrefix]
    private static void IsCheatedAtAll_Prefix(out ModdedState __state)
    {
        __state = default;

        if (!HelloValheimPlugin.EnableMod.Value || !HelloValheimPlugin.EnableModdedAchievements.Value)
        {
            return;
        }

        __state.WasMasked = true;
        __state.OriginalIsModded = Game.isModded;
        Game.isModded = false;
    }

    [HarmonyPostfix]
    private static void IsCheatedAtAll_Postfix(ModdedState __state)
    {
        RestoreState(__state);
    }

    [HarmonyFinalizer]
    private static Exception? IsCheatedAtAll_Finalizer(Exception? __exception, ModdedState __state)
    {
        RestoreState(__state);
        return __exception;
    }

    private static void RestoreState(ModdedState state)
    {
        if (state.WasMasked)
        {
            Game.isModded = state.OriginalIsModded;
        }
    }
}

/// <summary>
/// ============================================================================
/// CHAMBER 5 (LESSON 5): Multiplayer ZDO Authority, Dedicated Server Guard & ZRoutedRpc
/// ============================================================================
/// Valheim uses a distributed "Zone Owner" networking model:
///   - Whichever peer enters a 64x64m zone first becomes the ZDO Owner (m_nview.IsOwner()).
///   - For custom cross-player messages that don't live on a world object, use ZRoutedRpc!
///
/// Here we register a lightweight custom RPC route ("HelloValheim_Ping") whenever
/// ZNetScene initializes, and demonstrate the Dedicated Server headless check.
/// </summary>
[HarmonyPatch(typeof(ZNetScene), "Awake")]
internal static class MultiplayerRoutedRpcPatch
{
    private const string RpcRouteName = "HelloValheim_Ping";

    [HarmonyPostfix]
    private static void ZNetScene_Awake_Postfix()
    {
        if (ZRoutedRpc.instance == null)
        {
            return;
        }

        // Register our custom multiplayer RPC handler on both clients and servers.
        ZRoutedRpc.instance.Register<string>(RpcRouteName, OnHelloValheimPingReceived);

        if (HelloValheimPlugin.IsDedicatedServerHeadless())
        {
            HelloValheimPlugin.Log.LogInfo(
                $"[Multiplayer] Registered '{RpcRouteName}' on Dedicated Server (Headless mode—skipping client HUD/audio hooks)."
            );
        }
        else
        {
            HelloValheimPlugin.Log.LogInfo(
                $"[Multiplayer] Registered '{RpcRouteName}' ZRoutedRpc route for client/host session."
            );
        }
    }

    private static void OnHelloValheimPingReceived(long senderPeerId, string message)
    {
        HelloValheimPlugin.Log.LogInfo($"[ZRoutedRpc] Received '{RpcRouteName}' from peer {senderPeerId}: {message}");

        // Headless Guard: Never touch MessageHud or AudioMan on a Dedicated Server!
        if (HelloValheimPlugin.IsDedicatedServerHeadless())
        {
            return;
        }

        if (MessageHud.instance != null)
        {
            MessageHud.instance.ShowMessage(MessageHud.MessageType.TopLeft, $"[HelloValheim] {message}");
        }
    }
}
