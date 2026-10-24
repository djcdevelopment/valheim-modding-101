# Agent Entry Contract — Valheim 1.0 Modding 101 (`valheim-modding-101`)

Welcome, Agent! Whether you are **Claude Code**, **OpenAI Codex CLI**, **Cursor**, **Windsurf**, **Google Antigravity**, or a **local Ollama / vLLM agent** (`qwen2.5-coder`, `deepseek-coder`, `gemma-3`), this document is your operational contract when a user asks you to help them learn Valheim modding or build a mod in this repository.

---

## 1. Your Role & Valve Test Chamber Posture

When a user says *"Walk me through building my first Valheim mod"*, *"Help me get started"*, or *"I want to build a mod that does X"*:

1. **Assume the 11:30 PM Reality:** The user may be tired, distracted, or burned by outdated 2021–2023 Valheim (`0.217`) tutorials. Keep your responses **concise, warm, and action-oriented** (never dump a 1,000-word essay before running a check).
2. **Auto-Detect Before Asking:**
   - First, check the operating system (`uname -s` on Linux/macOS or `$env:OS` on Windows) and immediately run the read-only preflight doctor script:
     - **Linux / SteamOS / CachyOS:** `bash tools/doctor.sh`
     - **Windows (PowerShell):** `powershell -ExecutionPolicy Bypass -File .\tools\doctor.ps1`
3. **Greet & Calibrate in 3 Bullet Points:**
   - Report the green/amber findings from `doctor` (Valheim `1.0.20` path, BepInEx `5.4.2202` status, `.NET SDK`).
   - Ask two quick calibration questions:
     1. **Time Budget Tonight:** Do they want the **⚡ 15-Minute First Safe Win** (`Chambers 0–3`: compile `HelloValheim.dll`, boot, and run `vikingping` in the `F5` console) or the **🛠️ 45-Minute Full Tour** (`Chambers 3.5–5`: stack traces, Harmony patches, live `.cfg` hot-reload, and multiplayer)?
     2. **Goal:** Do they want to start with our pre-wired **Carry Weight + Steam Achievement Preservation (`IsModded`)** starter lessons, or do they have a specific custom mechanic in mind?

---

## 2. The 8-Chamber Guided Progression (Follow This Sequence)

Never skip proving the build-and-load pipeline before writing custom C# logic (**Valve Single-Variable Conditioning**):

| Chamber | Goal & Action | Command You Run or Show the User | Observable Sightline |
| :--- | :--- | :--- | :--- |
| **Chamber 0** | **Demystify & Classify (`2 mins`)** | Explain `Doorstop -> BepInEx -> Harmony -> Valheim 1.0.20`, reassure them that saves/Steam accounts are 100% safe, and classify their idea into **Bucket 1 (Client-Only)**, **Bucket 2 (Server-Synced Logic)**, or **Bucket 3 (Custom 3D Assets / Prefab Cloning)**. | User knows which bucket their mod belongs to and why Unity Editor isn't needed for 80%+ of mods. |
| **Chamber 1** | **30-Second Preflight (`3 mins`)** | `bash tools/doctor.sh` (Linux) or `.\tools\doctor.ps1` (Windows) | All checks `[PASS]`. On Linux, ensure `./start_game_bepinex.sh %command%` is set and executable (`chmod +x`). |
| **Chamber 2** | **First Compile (`4 mins`)** — *🛑 Safe Stop #1* | `bash tools/build-and-deploy.sh` or `.\tools\build-and-deploy.ps1` | `0 Warning(s)`, `0 Error(s)`, single `HelloValheim.dll` (`~12–18 KB`) deployed to `BepInEx/plugins/HelloValheim/`. |
| **Chamber 3** | **First In-Game Proof (`5 mins`)** — *🛑 Safe Stop #2* | Launch Valheim with `-console`, press `F5` at the main menu, type `vikingping`. | Console prints `[HelloValheim] Skål! Your first Valheim 1.0.20 mod is alive!` |
| **Chamber 3.5** | **Stack Traces & IDE Debugging (`7 mins`)** | Run `vikinginspect` in `F5`; explain `DMD<Class::Method>` dynamic method frames in `BepInEx/LogOutput.log`, `[HarmonyFinalizer]`, and Doorstop `debug_enabled=true` (`127.0.0.1:10000`). | User can spot which mod patched a crashing method in 5 seconds. |
| **Chamber 4** | **Harmony Patches & 1.0.20 Shifts (`8 mins`)** | Inspect Lesson 3 (`Player.GetMaxCarryWeight` Postfix) & Lesson 4 (`Achievements.IsCheatedAtAll` Prefix/Postfix/Finalizer state passing) in `starter-mod/HelloValheimPlugin.cs`. | Player carry weight increases by `+150` (`300 -> 450`) while keeping Steam achievements active. |
| **Chamber 4.5** | **BepInEx `Config.Bind` & Hot-Reload (`4 mins`)** — *🛑 Safe Stop #3* | Edit `BepInEx/config/com.valheimmodding101.hellovalheim.cfg` while Valheim is running (`CarryWeightBonus = 500`). | `FileSystemWatcher` reloads the `.cfg` live; carry weight updates in-game without restarting! |
| **Chamber 5** | **Multiplayer, Dedicated Guards & Thunderstore (`12 mins`)** | Inspect Lesson 5 (`ZNet.instance.IsDedicated()`, `ZNetView.IsOwner()`, `ZRoutedRpc`) and `starter-mod/manifest.json` + `thunderstore.toml`. | Mod is headless-server safe and ready for Thunderstore packaging. |

> **1-Command Undo At Any Time:** If the user wants to return their game to 100% vanilla state, run:
> - **Linux:** `bash tools/build-and-deploy.sh --reset`
> - **Windows:** `.\tools\build-and-deploy.ps1 -Reset`

---

## 3. Non-Negotiable Valheim `1.0.20` (*Deep North*) Engineering Rules

When writing or modifying any C# code or `.csproj` file in this repository, you **MUST** enforce these rules (never rely on stale 2021–2023 training data):

### Rule A: `.csproj` Target Framework & Zero DLL Leaks
1. **Target Framework:** Always use `<TargetFramework>net48</TargetFramework>` and `<LangVersion>12</LangVersion>`. Never target `net8.0` or `net9.0` (Valheim's embedded Mono runtime will reject the assembly).
2. **`<Private>false</Private>` on ALL Game & BepInEx References:** Every `<Reference>` to `assembly_*.dll`, `UnityEngine*.dll`, `BepInEx.dll`, and `0Harmony.dll` **MUST** include `<Private>false</Private>`. Copying Unity or Harmony DLLs into `BepInEx/plugins/` causes catastrophic `TypeLoadException` crashes.

### Rule B: The 6 Valheim `1.0.20` Breaking API Signatures
If the user asks to patch any of these Valheim systems, use the **Valheim 1.0.20 signature**, never the pre-1.0 (`0.217`/`0.218`) signature:

| System | ❌ Broken Pre-1.0 Pattern (`0.217`–`0.218`) | ✅ Verified Valheim `1.0.20` Pattern |
| :--- | :--- | :--- |
| **1. Spatial Sectors (`ZDOMan`)** | `FindSectorObjects(Vector2i sector, int area, int distantArea, List<ZDO> ...)` | `FindSectorObjects(Vector2s sector, SimulationDistance simulationDistance, List<ZDO> sectorObjects, List<ZDO> distantSectorObjects)` (`Vector2s` is in `assembly_utils.dll`). Also in `RPC_ZDOData`, local `ZDO` moved from `V_13` to `V_12`. |
| **2. Status Effects (`SEMan`)** | `SEMan.AddStatusEffect(int nameHash, bool resetTime, int itemLevel, float skillLevel)` (4 args) | `SEMan.AddStatusEffect(int nameHash, bool resetTime, int itemLevel, float skillLevel, short variant)` — **5th parameter `typeof(short)` is required** in `[HarmonyPatch]`. |
| **3. Overloaded Methods (`PieceTable`)** | `[HarmonyPatch(typeof(PieceTable), nameof(PieceTable.SetCategory))]` (Throws `AmbiguousMatchException`!) | Always disambiguate parameter types: `[HarmonyPatch(nameof(PieceTable.SetCategory), typeof(int))]` and/or `typeof(Piece.PieceCategory)`. |
| **4. Compiler Closures (`Chat`)** | Targeting anonymous lambda `<OnNewChatMessage>b__0` | Modern C# compiler lowers inner callbacks to local functions: `<OnNewChatMessage>g__OnCheckPermissionAsyncCompleted\|0`. Use fallback lookup in `[HarmonyTargetMethod]`. |
| **5. UI & Input (`InventoryGui` / `GameCamera`)** | `InventoryGui.Show(Container)` (1 arg); inline `ZInput.GetButton("Use")` in `UpdateContainer` | `InventoryGui.Show(Container container, int activeGroup = 1)` (2 args); patch `InventoryGui.UseButtonHeld()` directly via Postfix; always call `.Start()` before each `CodeMatcher` match. |
| **6. Early Save Path (`FileHelpers`)** | Calling `Utils.GetSaveDataPath()` inside `BaseUnityPlugin.Awake()` | Crashes with NRE in `1.0.20` because `PlatformManager.DistributionPlatform` is `null` during `Awake()`. Use `BepInEx.Paths.ConfigPath` or fallback to `Utils.persistantDataPath` in a `try/catch`. |

### Rule C: Runtime Safety & Multiplayer Guards
1. **Null-Guard `Player.m_localPlayer`:** `Player.m_localPlayer` is `null` at the main menu (`FejdStartup`), during loading screens, and while respawning. Always guard with `if (Player.m_localPlayer == null) return;`.
2. **Guard Headless Dedicated Servers:** Dedicated servers (`valheim_server.x86_64` / `valheim_server.exe`) run without graphics or audio (`ZNet.instance.IsDedicated() == true`). Never access `Hud.instance`, `InventoryGui.instance`, `AudioMan`, or `Camera.main` without checking whether the runtime is a dedicated server or ensuring those singletons are non-null.
3. **Fault-Isolate Risky Patches:** Show users how `[HarmonyFinalizer]` can log an error once and suppress or cleanly restore state (`__state`) so a bug in one mod never bricks the player's game loop.

---

## 4. Repository Map

- [`README.md`](file:///home/derek/work/valheim-modding-101/README.md) — Quickstart front door, 3-Bucket Mod Taxonomy, and 8-Chamber overview.
- [`starter-mod/HelloValheim.csproj`](file:///home/derek/work/valheim-modding-101/starter-mod/HelloValheim.csproj) — Cross-platform `.NET 4.8` project file with auto-discovered `$(ValheimDir)` and `<Private>false</Private>` guards.
- [`starter-mod/HelloValheimPlugin.cs`](file:///home/derek/work/valheim-modding-101/starter-mod/HelloValheimPlugin.cs) — 5 self-contained, toggleable lessons (`vikingping`/`vikinginspect`, `Config.Bind` + live `FileSystemWatcher`, `GetMaxCarryWeight` Postfix/Finalizer, `IsCheatedAtAll` scoped state patch, and Dedicated Server + `ZRoutedRpc` guard).
- [`tools/doctor.sh`](file:///home/derek/work/valheim-modding-101/tools/doctor.sh) & [`tools/doctor.ps1`](file:///home/derek/work/valheim-modding-101/tools/doctor.ps1) — Read-only Chamber 1 environment preflight scripts.
- [`tools/build-and-deploy.sh`](file:///home/derek/work/valheim-modding-101/tools/build-and-deploy.sh) & [`tools/build-and-deploy.ps1`](file:///home/derek/work/valheim-modding-101/tools/build-and-deploy.ps1) — Build, artifact size audit (`< 50 KB`), plugin deployment, and `--reset` vanilla restore.
- [`site/index.html`](file:///home/derek/work/valheim-modding-101/site/index.html) — Zero-dependency Ultrawide (`32:9`/`21:9`) & 50% Half-Screen Snap interactive web workbench with 1-click **Self-Tap AI Prompt Capsules**.
- [`product/`](file:///home/derek/work/valheim-modding-101/product/00-PRODUCT-VISION-AND-ROADMAP.md) — Valve playtest design rules, customer personas, user flows, and responsive layout specs.
