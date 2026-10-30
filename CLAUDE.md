# Claude Code Entry Contract — Valheim 1.0 Modding 101

Please read and follow [`AGENTS.md`](AGENTS.md) in this directory as your primary operational contract.

## Quick Execution Checklist for Claude Code (`claude`)

When the user asks to start the tutorial or build their first Valheim `1.0.21` mod:

1. **Run the Read-Only Preflight Doctor First (Turn 1):**
   - On Linux / SteamOS / macOS:
     ```bash
     bash tools/doctor.sh
     ```
   - On Windows:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\tools\doctor.ps1
     ```
2. **Summarize Status & Ask 2 Quick Calibration Questions:**
   - Show the user their detected Valheim path, BepInEx `5.4.2202` readiness, and `.NET SDK` status.
   - Ask:
     1. **Time budget tonight:** `15 mins` (*Sprint 1: First Safe Win, Chambers 0–3*) or `45 mins` (*Sprint 2: Stack Traces, Harmony, Live Config & Multiplayer, Chambers 3.5–5*)?
     2. **Goal:** Try the built-in **Carry Weight + Steam Achievement Preservation (`HelloValheim`)** starter mod first, or build a custom mechanic right after Chamber 3?
3. **Enforce Valheim `1.0.21` (*Deep North*) Guardrails:**
   - Keep `<TargetFramework>net48</TargetFramework>` and `<Private>false</Private>` on all game/BepInEx references in `starter-mod/HelloValheim.csproj`.
   - Use `bash tools/build-and-deploy.sh` (or `.\tools\build-and-deploy.ps1`) to compile, verify zero leaked Unity DLLs (`< 50 KB`), and deploy to `BepInEx/plugins/HelloValheim/`.
   - Never use deprecated `0.217`/`0.218` signatures (`Vector2i` in `ZDOMan.FindSectorObjects`, 4-arg `SEMan.AddStatusEffect`, untyped `PieceTable.SetCategory`, or `Utils.GetSaveDataPath()` inside `Awake()`).
   - Always guard `Player.m_localPlayer == null` and headless Dedicated Servers (`ZNet.instance.IsDedicated()`).
4. **Offer the 1-Command Vanilla Reset Anytime:**
   - Linux: `bash tools/build-and-deploy.sh --reset`
   - Windows: `.\tools\build-and-deploy.ps1 -Reset`
