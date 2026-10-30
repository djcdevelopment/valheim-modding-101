# 03 — End-to-End User Flows & The 8-Chamber State Machine

> **Purpose:** This document defines the exact interaction topologies for our three entry modalities (**Flow A: Autonomous CLI Agent**, **Flow B: Manual No-AI CLI & Visual**, and **Flow C: The 1-Click Self-Tap Web AI Recovery Loop**) alongside the **Flow D: 8-Chamber Progression State Machine**.

---

## Flow A: Clone & Point a CLI Agent (`AGENTS.md` Autonomous Guided Loop)

This flow serves **AI-3 (Frontier CLI Agents: Claude Code, Codex, Cursor, Windsurf, Antigravity)** and **AI-2 (Local GPU Agents: Ollama / vLLM with `qwen2.5-coder`)**. The user clones the repository and says a single sentence: *"Walk me through building my first Valheim 1.0 mod."*

```mermaid
sequenceDiagram
    autonumber
    actor User as Modder (11:30 PM)
    participant Agent as CLI Agent (Reads AGENTS.md)
    participant Doctor as tools/doctor.{sh,ps1}
    participant Build as tools/build-and-deploy.{sh,ps1}
    participant Game as Valheim 1.0.21 + BepInEx

    User->>Agent: "Walk me through building my first Valheim 1.0 mod."
    Note over Agent: Loads AGENTS.md contract:\n• Concise Valve Chamber tutor\n• Auto-detects OS before asking
    Agent->>Doctor: Runs doctor.sh / doctor.ps1 automatically
    Doctor-->>Agent: Returns OS, ValheimDir, BepInEx 5.4.2202 status, .NET SDK
    Agent->>User: Shows green preflight summary + asks 2 quick questions:\n1. Time budget tonight (15m First Win vs 45m Deep Dive)?\n2. Any specific mod goal (or use starter CarryWeight + Achievement mod)?
    User->>Agent: "15 mins tonight, let's get the starter working first."
    Agent->>Build: Runs build-and-deploy (compiles HelloValheim.csproj -> 12 KB DLL)
    Build-->>Agent: 0 Warnings, 0 Errors, deployed to BepInEx/plugins/HelloValheim/
    Agent->>User: Explains what just compiled + gives 1-step launch instruction:\n"Press F5 at main menu and type 'vikingping'"
    User->>Game: Launches Valheim (-console), presses F5, types "vikingping"
    Game-->>User: Prints "[HelloValheim] Skål! Your first Valheim 1.0.21 mod is alive!"
    User->>Agent: "It worked! Can I change the carry weight without restarting?"
    Agent->>User: Guides Chamber 4.5: Edits CarryWeightBonus in .cfg -> FileSystemWatcher hot-reloads live in-game!
```

### Why Flow A Works Without Drift
1. **Zero Guessing on Paths:** Instead of hallucinating where Steam or `.NET` is installed, `AGENTS.md` instructs the agent to execute `tools/doctor.sh` or `tools/doctor.ps1` on Turn 1.
2. **Enforced Guardrails:** The agent is explicitly barred from omitting `<Private>false</Private>`, targeting `net8.0`, or using pre-1.0 signatures (`Vector2i`, 4-arg `AddStatusEffect`).
3. **Paced by User Battery:** The agent pauses at **Safe Stop #1 (Chamber 2)** and **Safe Stop #2 (Chamber 3)** rather than dumping 500 lines of unsolicited C# refactoring.

---

## Flow B: Manual No-AI Track (Windows PowerShell & Linux Bash Side-by-Side)

This flow serves **AI-0 ($0 AI Spend / Pure Deterministic CLI & Visual)** users who want rock-solid scripts and zero AI dependencies. Every step in `site/index.html` and `README.md` pairs Windows PowerShell and Linux Bash commands with identical semantics and exit codes:

```mermaid
flowchart TD
    Start["Modder Clones Repo & Opens site/index.html\n(Or Reads README.md)"] --> SelectOS{"Selects OS Toggle in Top Bar"}

    SelectOS -- "🪟 Windows (PowerShell)" --> Win1["Chamber 1: .\tools\doctor.ps1\nChecks Steam Registry, assembly_valheim.dll,\nwinhttp.dll & .NET SDK"]
    SelectOS -- "🐧 Linux / SteamOS (Bash)" --> Lin1["Chamber 1: bash tools/doctor.sh\nChecks ~/.local/share/Steam, start_game_bepinex.sh +x,\nlibdoorstop_x64.so & Proton/Native state"]

    Win1 --> Win2["Chamber 2: .\tools\build-and-deploy.ps1\ndotnet build -c Release -> Verifies < 50 KB single DLL\nDeploys to BepInEx\plugins\HelloValheim\HelloValheim.dll"]
    Lin1 --> Lin2["Chamber 2: bash tools/build-and-deploy.sh\ndotnet build -c Release -> Verifies < 50 KB single DLL\nDeploys to BepInEx/plugins/HelloValheim/HelloValheim.dll"]

    Win2 --> Boot["Chamber 3: Launch Valheim with -console\nVerify LogOutput.log & Run F5 'vikingping'"]
    Lin2 --> Boot

    Boot --> Edit["Chamber 4.5: Edit com.valheimmodding101.hellovalheim.cfg\nChange CarryWeightBonus = 500 -> Instant In-Game Reload"]
    Edit --> Reset["Optional 1-Second Vanilla Undo:\n.\tools\build-and-deploy.ps1 -Reset  |  bash tools/build-and-deploy.sh --reset"]
```

---

## Flow C: The "Self-Tap AI Recovery Loop" ($0 Spend Free Web ChatGPT / Claude)

When a learner without a paid CLI agent hits an unexpected error (e.g., a custom C# edit fails to compile, or another mod in their profile conflicts in `LogOutput.log`), asking standard Free Web ChatGPT usually fails because the browser LLM assumes Valheim `0.217` (2022–2023) APIs.

**Our Solution:** Every chamber in the web workbench (`site/index.html`) features a **🤖 Copy Self-Tap AI Prompt** button that constructs a precision-engineered context capsule on the clipboard:

```mermaid
sequenceDiagram
    autonumber
    actor User as Modder (Hits Friction on Step X)
    participant UI as site/index.html (Self-Tap Capsule)
    participant WebLLM as Free Web ChatGPT / Claude / Local Ollama
    participant Terminal as User Terminal / IDE

    User->>UI: Clicks "🤖 Stuck or Curious? Copy AI Prompt for This Step"
    Note over UI: Assembles Self-Tap Prompt Capsule:\n1. Selected OS (Windows PS1 vs Linux Bash)\n2. Selected Persona Lens & Current Chamber\n3. Pinned Valheim 1.0.21 API Ground Truths\n   (net48, <Private>false</Private>, Vector2s,\n   AddStatusEffect 5th short arg, SetCategory overloads,\n   DMD<> stack trace rules)\n4. Placeholder for user's terminal/LogOutput.log snippet
    UI-->>User: Copies capsule to clipboard & shows 1-line instruction
    User->>WebLLM: Pastes capsule into Free Web ChatGPT + appends their error message
    Note over WebLLM: Locked to Valheim 1.0.21 constraints:\nCannot hallucinate Unity Editor or 0.217 APIs
    WebLLM-->>User: Returns exact, 1.0.21-valid C# or CLI fix in < 60 seconds
    User->>Terminal: Applies fix, runs build-and-deploy, resumes Chamber progression
```

### Anatomy of a Self-Tap Prompt Capsule
Each generated prompt capsule contains four mandatory blocks:
1. **Role & Version Lock:** `"You are assisting me with Valheim 1.0.21 (Deep North) modding using BepInEx 5.4.2202, HarmonyX 2.9.0, and .NET Framework 4.8 (net48). Do NOT suggest Unity Editor workflows or pre-1.0 signatures."`
2. **Step State & File Map:** Exact path (`starter-mod/HelloValheimPlugin.cs`) and the active lesson code for that chamber.
3. **1.0.21 Ground-Truth Guardrails:** Reminders of `<Private>false</Private>`, `Player.m_localPlayer == null` guards, `Utils.persistantDataPath` in `Awake()`, and the 6 architectural shifts.
4. **User Slot:** `"Here is what I am trying to do / the exact output from my terminal or BepInEx/LogOutput.log: [PASTE HERE]"`

---

## Flow D: The 8-Chamber Progression State Machine

The tutorial is structured as an 8-chamber state machine (`0`, `1`, `2`, `3`, `3.5`, `4`, `4.5`, `5`) with three explicit **Safe Stop states** and fast-forward bypass edges for returning `0.217` veterans (`Persona P5`):

```mermaid
stateDiagram-v2
    [*] --> Chamber0

    state "Sprint 1: The 15-Minute First Safe Win" as Sprint1 {
        Chamber0: Chamber 0 — Demystifying 1.0 & 3-Bucket Mod Taxonomy (2m)
        Chamber1: Chamber 1 — 30-Second Preflight Check (doctor.ps1 / doctor.sh) (3m)
        Chamber2: Chamber 2 — Clone & First Compile (HelloValheim.dll ~12 KB) (4m)
        SafeStop1: 🛑 SAFE STOP #1 — Pipeline Proven (Can pause here safely)
        Chamber3: Chamber 3 — Fast Boot & In-Game F5 'vikingping' Proof (5m)
        SafeStop2: 🏆 SAFE STOP #2 — First Win Complete! (15-Min Goal Achieved)

        Chamber0 --> Chamber1: Selects OS & Bucket
        Chamber1 --> Chamber2: [PASS] Preflight Green
        Chamber2 --> SafeStop1: 0 Warnings / 0 Errors
        SafeStop1 --> Chamber3: Ready to boot game
        Chamber3 --> SafeStop2: 'vikingping' responds in F5 console
    }

    state "Sprint 2: Real Mod Engineering & Live Config" as Sprint2 {
        Chamber3_5: Chamber 3.5 — 1.0.21 Stack Traces (DMD<>) & IDE Breakpoints (7m)
        Chamber4: Chamber 4 — Harmony Prefix/Postfix & 1.0.21 6-Shift Map (8m)
        Chamber4_5: Chamber 4.5 — BepInEx Config.Bind & Live .cfg Hot-Reload (4m)
        SafeStop3: 🛑 SAFE STOP #3 — Configurable Mod Running Live
        Chamber5: Chamber 5 — Multiplayer ZDOs, Dedicated Guards, ILSpy & Thunderstore (12m)

        SafeStop2 --> Chamber3_5: Continues to Sprint 2
        Chamber3_5 --> Chamber4: Understands DMD<> & Finalizers
        Chamber4 --> Chamber4_5: Patches CarryWeight & Achievements
        Chamber4_5 --> SafeStop3: Edits .cfg live without restart
        SafeStop3 --> Chamber5: Ready for Multiplayer & Publishing
    }

    Chamber0 --> Chamber3_5: Fast-Forward Track (Persona P5: Returning 0.217 Veteran)
    Chamber5 --> [*]: 🎓 Ready for 5-Part Engineering Series
```

---

## State Persistence & Zero-Friction Resume Contract

In the interactive web workbench (`site/app.js`), user state is persisted automatically to `localStorage` under a clean schema (`valheim_modding_101_state_v2`):
- **`os`:** `"windows"` | `"linux"` (auto-detected from `navigator.userAgent` / `navigator.platform` on first load, overridable with 1 click).
- **`persona`:** `"p1-modder"` | `"p2-dev"` | `"p3-hobbyist"` | `"p4-explorer"` | `"p5-veteran"` (dynamically tailors the *"Why This Matters to You"* callout in every chamber).
- **`traction`:** `"cli"` | `"visual"` | `"agent"` | `"web-ai"` (controls default tab emphasis).
- **`layout`:** `"auto"` | `"ultrawide"` | `"halfsnap"` | `"reading"` (allows manual override of viewport responsive breakpoints).
- **`completedChambers`:** Array of completed chamber IDs (`["0", "1", "2", "3"]`) so a tired user who stops at **Safe Stop #2** on Tuesday night can reopen the page on Saturday morning and resume immediately at **Chamber 3.5**.
