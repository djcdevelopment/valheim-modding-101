/* ==========================================================================
   Viking Mod Foundry — Valheim 1.0.20 (Deep North) Application Controller
   Single-Chamber Stage, Inline Header Drawers (HC-1), Stoplight Verification,
   Synchronized 3-Tab Companion, and 1-Click Self-Tap AI Prompt Capsule.
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "valheim_modding_101_state_v3_1";
  var DATA = window.WORKBENCH_DATA;

  var STEPPER_LABELS = {
    "0": "0. Overview",
    "1": "1. Folders",
    "2": "2. Setup",
    "3": "3. Build",
    "4": "4. Test",
    "5": "5. Config",
    "6": "6. Hooks",
    "7": "7. Debug",
    "8": "8. Share"
  };

  var STEPPER_PHASES = {
    "0": { num: "0", name: "Picture Overview", overline: "PHASE 0 · START", time: "2m" },
    "1": { num: "1", name: "Folders & Setup", overline: "PHASE 1 · FOLDERS & SETUP", time: "3m" },
    "2": { num: "1", name: "Folders & Setup", overline: "PHASE 1 · FOLDERS & SETUP", time: "2m" },
    "3": { num: "2", name: "First 15m Win", overline: "PHASE 2 · FIRST 15M WIN", time: "3m" },
    "4": { num: "2", name: "First 15m Win", overline: "PHASE 2 · FIRST 15M WIN", time: "4m" },
    "5": { num: "2", name: "First 15m Win", overline: "PHASE 2 · FIRST 15M WIN", time: "3m" },
    "6": { num: "3", name: "Leveling Up", overline: "PHASE 3 · LEVELING UP", time: "8m" },
    "7": { num: "3", name: "Leveling Up", overline: "PHASE 3 · LEVELING UP", time: "5m" },
    "8": { num: "3", name: "Leveling Up", overline: "PHASE 3 · LEVELING UP", time: "7m" }
  };

  var STEPPER_TOOLTIPS = {
    "0": "Step 0 (2 mins): Visual 4-panel picture guide to mods, folders, and tools — zero code",
    "1": "Step 1 (3 mins): Find your Steam folder vs. Thunderstore/r2modman/Gale profiles",
    "2": "Step 2 (2 mins): Run the 1-line setup check (doctor) to verify .NET 8 and BepInEx",
    "3": "Step 3 (3 mins): Compile HelloValheim.dll in 2 seconds and deploy automatically",
    "4": "Step 4 (4 mins): Launch Valheim, press F5, and run your custom vikingping command",
    "5": "Step 5 (3 mins): Edit your carry weight in Notepad while Valheim is running!",
    "6": "Step 6 (8 mins): How Harmony patches work and the 6 Valheim 1.0.20 code changes",
    "7": "Step 7 (5 mins): Read LogOutput.log stack traces, add null guards, and attach a debugger",
    "8": "Step 8 (7 mins): Search game code, multiplayer rules, and package your .zip for Thunderstore"
  };

  function detectDefaultOS() {
    try {
      var ua = (navigator.userAgent || "") + " " + (navigator.platform || "");
      if (/Linux|X11|SteamOS/i.test(ua) && !/Android/i.test(ua)) {
        return "linux";
      }
    } catch (e) {}
    return "win";
  }

  var state = {
    os: detectDefaultOS(),      // 'win' | 'linux'
    persona: "P1",              // 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
    actionTab: "cli",           // 'cli' | 'code' | 'ai'
    companionTab: "diagram",    // 'diagram' | 'files' | 'table'
    inspectorTab: "plugin",     // 'plugin' | 'csproj' | 'cfg' | 'manifest'
    theme: "dark",              // 'dark' | 'light'
    activeChamberId: "0",       // '0' | '1' | '2' | '3' | '3.5' | '4' | '4.5' | '5'
    completed: {},              // { [chamberId]: true }
    tailorOpen: false,
    resetOpen: false,
    aiDrawerOpen: false,
    aiPreset: "explain",        // 'explain' | 'diagnose' | 'customize'
    aiUserError: ""
  };

  function getChamberById(id) {
    for (var i = 0; i < DATA.chambers.length; i++) {
      if (DATA.chambers[i].id === String(id)) return DATA.chambers[i];
    }
    return null;
  }

  function getChamberIndex(id) {
    for (var i = 0; i < DATA.chambers.length; i++) {
      if (DATA.chambers[i].id === String(id)) return i;
    }
    return 0;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.os === "win" || parsed.os === "linux") state.os = parsed.os;
        if (DATA.personas[parsed.persona]) state.persona = parsed.persona;
        if (["cli", "code", "ai"].indexOf(parsed.actionTab) !== -1) state.actionTab = parsed.actionTab;
        if (["diagram", "files", "table"].indexOf(parsed.companionTab) !== -1) state.companionTab = parsed.companionTab;
        if (DATA.inspectorFiles[parsed.inspectorTab]) state.inspectorTab = parsed.inspectorTab;
        if (parsed.theme === "dark" || parsed.theme === "light") state.theme = parsed.theme;
        if (getChamberById(parsed.activeChamberId)) state.activeChamberId = String(parsed.activeChamberId);
        if (parsed.completed && typeof parsed.completed === "object") state.completed = parsed.completed;
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        os: state.os,
        persona: state.persona,
        actionTab: state.actionTab,
        companionTab: state.companionTab,
        inspectorTab: state.inspectorTab,
        theme: state.theme,
        activeChamberId: state.activeChamberId,
        completed: state.completed
      }));
    } catch (e) {}
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripBackticks(str) {
    return String(str == null ? "" : str).replace(/`/g, "");
  }

  function normalizeCodeBlock(str) {
    return String(str == null ? "" : str)
      .replace(/^\r?\n+/, "")
      .replace(/\s+$/, "");
  }

  function formatInlineMarkup(str) {
    var safe = escapeHtml(str);
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    return safe;
  }

  function copyToClipboard(text, btnEl, copiedLabel) {
    var label = copiedLabel || "✓ Copied";
    var origHtml = btnEl ? btnEl.innerHTML : "";
    function showFeedback() {
      if (!btnEl) return;
      btnEl.classList.add("copied");
      btnEl.innerHTML = label;
      setTimeout(function () {
        btnEl.classList.remove("copied");
        btnEl.innerHTML = origHtml;
      }, 1600);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showFeedback).catch(function () {
        fallbackCopy(text);
        showFeedback();
      });
    } else {
      fallbackCopy(text);
      showFeedback();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------- Build 1-Click Self-Tap AI Prompt (Includes Embedded AGENTS.md Rules) ---------- */
  function buildSelfTapPrompt(chamberId, preset, userErrorText) {
    var ch = getChamberById(chamberId) || DATA.chambers[0];
    var personaObj = DATA.personas[state.persona] || DATA.personas.P1;
    var osName = state.os === "win" ? "Windows 10/11 (PowerShell)" : "Linux / SteamOS (Bash)";
    var cmd = ch.commands[state.os] || ch.commands.win;

    if (preset === "repo_setup") {
      return (
        "# HOW TO USE AI WITH THIS GUIDE (2 OPTIONS — ZERO SETUP NEEDED FOR BROWSER CHAT)\n\n" +
        "Option A — Free Browser Chat (ChatGPT, Claude, Gemini in your web browser):\n" +
        "  1. Switch to 'Explain This Step', 'Diagnose My Error', or 'Customize Mod' above.\n" +
        "  2. Click 'Copy Prompt' — our workbench AUTOMATICALLY embeds the AGENTS.md Valheim 1.0.20 rules,\n" +
        "     your OS (" + osName + "), and this step's code directly into your clipboard!\n" +
        "  3. Paste directly into ChatGPT or Claude. You do NOT need to upload or configure AGENTS.md.\n\n" +
        "Option B — Local Coding Agent (Cursor, Claude Code, VS Code Copilot, OpenAI Codex):\n" +
        "  1. Download or clone this tutorial repository onto your computer:\n" +
        "       git clone https://github.com/djcdevelopment/valheim-modding-101.git\n" +
        "       cd valheim-modding-101\n" +
        "  2. The root folder already contains AGENTS.md and CLAUDE.md pre-configured!\n" +
        "     Open the valheim-modding-101/ folder in Cursor / VS Code, or run `claude` / `codex` in that folder.\n" +
        "  3. Your coding agent automatically loads AGENTS.md on startup. Then paste this short task:\n\n" +
        "LOCAL REPO AGENT TASK FOR " + ch.numberLabel.toUpperCase() + ":\n" +
        ch.agentTask
      );
    }

    var taskInstruction = "";
    if (preset === "diagnose") {
      taskInstruction =
        "TASK: I hit an unexpected error or behavior during " + ch.numberLabel + " (" + ch.title + "). " +
        "Analyze my error output below against the embedded AGENTS.md Valheim 1.0.20 rules and give me the exact root cause and a 10-second copy-paste fix for " + osName + ".\n\n" +
        "MY TERMINAL / LOGOUTPUT.LOG ERROR:\n" +
        (userErrorText && userErrorText.trim()
          ? userErrorText.trim()
          : "[Paste your compiler error, terminal output, or BepInEx/LogOutput.log snippet here]");
    } else if (preset === "customize") {
      taskInstruction =
        "TASK: I have completed " + ch.numberLabel + " (" + ch.title + ") and want to customize `HelloValheimPlugin.cs` for my own mod idea (" + ch.agentTask + "). " +
        "Show me the cleanest C# code changes while strictly obeying all embedded AGENTS.md Valheim 1.0.20 signature rules and `<Private>false</Private>` build constraints.";
    } else {
      taskInstruction =
        "TASK: " + ch.agentTask + "\n" +
        "Explain what is happening in " + ch.numberLabel + " (" + ch.title + ") tailored to my background (" + personaObj.title + "), " +
        "and tell me how to verify everything is working on " + osName + " before I move to the next step.";
    }

    return (
      "You are an expert Valheim 1.0.20 (Deep North) BepInEx 5.4.2202 & HarmonyX modding mentor.\n" +
      "(Note: All required Valheim 1.0.20 rules from AGENTS.md are embedded below — no external files needed.)\n\n" +
      "=== MY ACTIVE WORKBENCH SETUP ===\n" +
      "• Operating System: " + osName + "\n" +
      "• My Background: " + personaObj.title + "\n" +
      "• Current Step: " + ch.numberLabel + " — " + ch.title + "\n" +
      "• Step Summary: " + (ch.aiContext || ch.summary) + "\n\n" +
      DATA.pinnedGroundTruth + "\n\n" +
      "=== CURRENT STEP COMMANDS (" + osName + ") ===\n" +
      cmd + "\n\n" +
      "=== CURRENT STEP C# / CONFIG SNIPPET ===\n" +
      ch.codeSnippet + "\n\n" +
      "=== YOUR MISSION ===\n" +
      taskInstruction
    );
  }

  /* ---------- Sync Body Attributes, Header Pill, and Inline Drawers ---------- */
  function syncHeaderAndDrawers() {
    document.body.setAttribute("data-theme", state.theme);
    document.body.setAttribute("data-os", state.os);
    document.body.setAttribute("data-persona", state.persona);

    var personaObj = DATA.personas[state.persona] || DATA.personas.P1;
    var personaClean = String(personaObj.shortLabel || "Cross-Game Modder").replace(/^[^A-Za-z0-9]+/, "");

    var summaryTextEl = document.getElementById("loadout-summary-text");
    if (summaryTextEl) {
      summaryTextEl.textContent = "Goal: " + personaClean;
    }

    var osIconBadgeEl = document.getElementById("os-icon-badge");
    if (osIconBadgeEl) {
      osIconBadgeEl.textContent = state.os === "win" ? "🪟" : "🐧";
    }

    var themeBtn = document.getElementById("toggle-theme-btn");
    if (themeBtn) {
      themeBtn.textContent = state.theme === "dark" ? "☀️" : "🌙";
    }

    // Tailor Drawer
    var tailorDrawer = document.getElementById("tailor-drawer");
    var tailorBtn = document.getElementById("toggle-tailor-btn");
    if (tailorDrawer && tailorBtn) {
      var osLabelFull = state.os === "win" ? "Windows (PowerShell)" : "Linux / SteamOS (Bash)";
      tailorBtn.setAttribute(
        "data-tooltip",
        "Setup & Profile (" + osLabelFull + " · " + personaClean + ") — Click to change OS, goal, or default view."
      );
      if (state.tailorOpen) {
        tailorDrawer.removeAttribute("hidden");
        tailorBtn.classList.add("active");
        tailorBtn.setAttribute("aria-expanded", "true");
      } else {
        tailorDrawer.setAttribute("hidden", "");
        tailorBtn.classList.remove("active");
        tailorBtn.setAttribute("aria-expanded", "false");
      }
    }

    // Reset Drawer & Progress Counter
    var doneCount = 0;
    for (var cIdx = 0; cIdx < DATA.chambers.length; cIdx++) {
      if (state.completed[DATA.chambers[cIdx].id]) doneCount++;
    }

    var metaEl = document.getElementById("stepper-meta");
    if (metaEl) {
      metaEl.textContent = doneCount + "/" + DATA.chambers.length + " DONE";
    }

    var resetDrawer = document.getElementById("reset-drawer");
    var resetBtn = document.getElementById("toggle-reset-drawer-btn");
    if (resetDrawer && resetBtn) {
      resetBtn.setAttribute(
        "data-tooltip",
        "See the 1-line command to remove the tutorial mod from Valheim, or clear your " + doneCount + "/" + DATA.chambers.length + " step checkmarks."
      );
      if (state.resetOpen) {
        resetDrawer.removeAttribute("hidden");
        resetBtn.classList.add("active");
        resetBtn.setAttribute("aria-expanded", "true");
      } else {
        resetDrawer.setAttribute("hidden", "");
        resetBtn.classList.remove("active");
        resetBtn.setAttribute("aria-expanded", "false");
      }
    }

    var resetProgressBtn = document.getElementById("reset-guide-progress-btn");
    if (resetProgressBtn && !resetProgressBtn.classList.contains("copied")) {
      resetProgressBtn.textContent = "Reset Completed Steps (" + doneCount + "/" + DATA.chambers.length + ")";
    }

    var resetOsLabel = document.getElementById("reset-drawer-os-label");
    var resetCmdCode = document.getElementById("reset-drawer-cmd-code");
    if (resetOsLabel && resetCmdCode) {
      if (state.os === "win") {
        resetOsLabel.textContent = "Windows 10/11 (PowerShell) — Uninstall Tutorial Mod";
        resetCmdCode.textContent = "powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1 -Reset";
      } else {
        resetOsLabel.textContent = "Linux / SteamOS (Bash) — Uninstall Tutorial Mod";
        resetCmdCode.textContent = "bash ./tools/build-and-deploy.sh --reset";
      }
    }

    // Sync active option buttons inside top header and #tailor-drawer
    var osBtns = document.querySelectorAll("[data-set-os]");
    for (var i = 0; i < osBtns.length; i++) {
      var isOs = osBtns[i].getAttribute("data-set-os") === state.os;
      osBtns[i].classList.toggle("active", isOs);
      osBtns[i].setAttribute("aria-pressed", isOs ? "true" : "false");
    }

    var pBtns = document.querySelectorAll("[data-set-persona]");
    for (var j = 0; j < pBtns.length; j++) {
      var isP = pBtns[j].getAttribute("data-set-persona") === state.persona;
      pBtns[j].classList.toggle("active", isP);
    }

    var tabBtns = document.querySelectorAll("[data-set-action-tab]");
    for (var k = 0; k < tabBtns.length; k++) {
      var isTab = tabBtns[k].getAttribute("data-set-action-tab") === state.actionTab;
      tabBtns[k].classList.toggle("active", isTab);
    }
  }

  /* ---------- Render Horizontal 9-Step Progress Bar (4 Phases) ---------- */
  function renderStepperBar() {
    var trackEl = document.getElementById("stepper-track");
    var metaEl = document.getElementById("stepper-meta");
    if (!trackEl) return;

    var doneCount = 0;
    var html = "";
    var currentPhaseNum = null;

    for (var i = 0; i < DATA.chambers.length; i++) {
      var ch = DATA.chambers[i];
      var isCurr = state.activeChamberId === ch.id;
      var isDone = !!state.completed[ch.id];
      if (isDone) doneCount++;

      var phaseInfo = STEPPER_PHASES[ch.id] || {
        num: String(ch.phase != null ? ch.phase : (ch.sprint || 0)),
        name: ch.phaseLabel || ch.sprintLabel || "Steps",
        overline: "PHASE " + String(ch.phase != null ? ch.phase : 0) + " · STEPS",
        time: (ch.minutes || 2) + "m"
      };

      if (phaseInfo.num !== currentPhaseNum) {
        if (currentPhaseNum !== null) {
          html += "</div></div>";
        }
        currentPhaseNum = phaseInfo.num;
        var overlineLabel = phaseInfo.overline || ("PHASE " + phaseInfo.num + " · " + phaseInfo.name.toUpperCase());
        html +=
          '<div class="stepper-phase-group" data-phase="' + escapeHtml(phaseInfo.num) + '">' +
            '<span class="stepper-phase-label">' + escapeHtml(overlineLabel) + "</span>" +
            '<div class="stepper-phase-steps">';
      }

      var shortLabel = STEPPER_LABELS[ch.id] || (ch.id + ". " + ch.shortTitle);
      var baseTooltip = STEPPER_TOOLTIPS[ch.id] || (ch.numberLabel + " (" + ch.minutes + " mins): " + stripBackticks(ch.title));
      var stepTooltip = baseTooltip + (isDone ? " [Completed ✓]" : "");
      var timeLabel = phaseInfo.time || ((ch.minutes || 2) + "m");

      html +=
        '<button type="button" class="stepper-node' +
        (isCurr ? " active" : "") +
        (isDone ? " completed" : "") +
        '" data-goto-chamber="' + escapeHtml(ch.id) + '"' +
        ' data-tooltip="' + escapeHtml(stepTooltip) + '"' +
        (isCurr ? ' aria-current="step"' : "") +
        ">" +
          '<span class="step-label">' + escapeHtml(shortLabel) + "</span>" +
          '<span class="step-time">' + escapeHtml(timeLabel) + "</span>" +
          (isDone ? '<span class="step-check">✓</span>' : "") +
        "</button>";
    }

    if (currentPhaseNum !== null) {
      html += "</div></div>";
    }

    trackEl.innerHTML = html;
    if (metaEl) {
      metaEl.textContent = doneCount + "/" + DATA.chambers.length + " DONE";
      metaEl.setAttribute("data-tooltip", "Your step checkmarks are saved in this browser. Phases 0–2 (Steps 0–5) take about 15 minutes.");
    }
  }

  /* ---------- Zero-CORS file://-Compatible Multimedia Detector ---------- */
  var MEDIA_CANDIDATES = [
    { type: "audio", src: "media/audio/notebooklm-audio-overview.mp3", label: "🎧 NotebookLM Audio Overview (.mp3)" },
    { type: "audio", src: "media/audio/notebooklm-audio-overview.wav", label: "🎧 NotebookLM Audio Overview (.wav)" },
    { type: "video", src: "media/video/overview-video.mp4", label: "🎬 Visual Overview Video (.mp4)" }
  ];

  function buildStoryboardHubHtml(ch) {
    if (!ch || !ch.storyboard) return "";
    var sb = ch.storyboard;
    var heading = sb.heading || sb.title || "Visual 4-Panel Modding Overview";
    var subhead = sb.subhead || sb.subtitle || "Hover or tap any term chip on the cards below for a plain-English explanation — zero coding required in Step 0.";
    var panels = sb.panels || [];

    var panelsHtml = "";
    for (var p = 0; p < panels.length; p++) {
      var panel = panels[p];
      var rawNum = panel.num != null ? String(panel.num) : String(p + 1);
      var panelBadge = /^panel\s+/i.test(rawNum) ? rawNum : ("Panel " + rawNum);
      var panelTitle = panel.title || panel.heading || "";
      var panelImg = panel.image || panel.img || panel.src || "";
      var panelCaption = panel.caption || panel.desc || "";
      var chips = panel.chips || panel.terms || [];

      var chipsHtml = "";
      for (var c = 0; c < chips.length; c++) {
        var chip = chips[c];
        var chipLabel = chip.label || chip.term || chip.name || "";
        var chipTip = chip.tooltip || chip.tip || chip.desc || "";
        chipsHtml +=
          '<span class="term-chip" tabindex="0" data-tooltip="' + escapeHtml(chipTip) + '">' +
            escapeHtml(chipLabel) +
          "</span>";
      }

      panelsHtml +=
        '<article class="storyboard-panel">' +
          '<div class="storyboard-img-wrap">' +
            '<img src="' + escapeHtml(panelImg) + '" alt="' + escapeHtml(panelTitle) + '" class="storyboard-img" loading="eager" onerror="this.parentElement.classList.add(\'img-fallback\')" />' +
          "</div>" +
          '<div class="storyboard-panel-title">' +
            '<span class="storyboard-num">' + escapeHtml(panelBadge) + "</span> " +
            escapeHtml(panelTitle) +
          "</div>" +
          '<p class="storyboard-panel-caption">' + formatInlineMarkup(panelCaption) + "</p>" +
          (chipsHtml ? '<div class="storyboard-chips">' + chipsHtml + "</div>" : "") +
        "</article>";
    }

    return (
      '<section class="storyboard-hub" id="storyboard-hub" aria-label="Step 0 Visual Storyboard and Media Hub">' +
        '<div class="storyboard-header">' +
          '<div class="storyboard-header-left">' +
            '<h2 class="storyboard-title">' + escapeHtml(heading) + "</h2>" +
            '<p class="storyboard-subhead">' + formatInlineMarkup(subhead) + "</p>" +
          "</div>" +
          '<button type="button" id="copy-notebooklm-btn" class="btn-secondary btn-action-tool" data-tooltip="Copy a ready-made overview script to paste into Google NotebookLM to generate your own Audio Podcast or Video Overview">📋 Copy NotebookLM Source Script</button>' +
        "</div>" +
        '<div id="notebooklm-media-bar" class="notebooklm-media-bar" data-tooltip="Drop a generated NotebookLM audio (.mp3/.wav) or video (.mp4) file into site/media/ to activate the embedded player automatically.">' +
          '<span class="media-bar-status" id="notebooklm-media-status">🎧 Optional Audio / Video Slot: Drop a NotebookLM .mp3/.wav or .mp4 into site/media/ to enable the built-in player, or click "📋 Copy NotebookLM Source Script" above.</span>' +
          '<div class="media-player-slot" id="notebooklm-media-slot" hidden></div>' +
          '<div class="media-probe-sandbox" id="notebooklm-probe-sandbox" hidden></div>' +
        "</div>" +
        '<div class="storyboard-grid">' +
          panelsHtml +
        "</div>" +
      "</section>"
    );
  }

  function probeNotebookLmMedia() {
    var barEl = document.getElementById("notebooklm-media-bar");
    var statusEl = document.getElementById("notebooklm-media-status");
    var slotEl = document.getElementById("notebooklm-media-slot");
    var sandboxEl = document.getElementById("notebooklm-probe-sandbox");
    if (!barEl || !statusEl || !slotEl || !sandboxEl) return;

    sandboxEl.innerHTML = "";
    var activeMediaFound = false;

    for (var i = 0; i < MEDIA_CANDIDATES.length; i++) {
      (function (candidate) {
        var probeEl = document.createElement(candidate.type);
        probeEl.setAttribute("preload", "metadata");
        probeEl.setAttribute("hidden", "");
        probeEl.src = candidate.src;

        probeEl.addEventListener("loadedmetadata", function () {
          if (probeEl.duration && probeEl.duration > 0 && isFinite(probeEl.duration)) {
            if (!activeMediaFound) {
              activeMediaFound = true;
              statusEl.setAttribute("hidden", "");
              slotEl.removeAttribute("hidden");
              slotEl.innerHTML = "";
            }
            var wrap = document.createElement("div");
            wrap.className = "media-player-item";
            var labelSpan = document.createElement("span");
            labelSpan.className = "media-player-label";
            labelSpan.textContent = candidate.label;

            var player = document.createElement(candidate.type);
            player.controls = true;
            player.preload = "metadata";
            player.src = candidate.src;
            player.className = "notebooklm-live-player";

            wrap.appendChild(labelSpan);
            wrap.appendChild(player);
            slotEl.appendChild(wrap);
          }
        });

        probeEl.addEventListener("error", function () {
          // 0-byte placeholder or missing media file; keep default status banner
        });

        sandboxEl.appendChild(probeEl);
      })(MEDIA_CANDIDATES[i]);
    }
  }

  /* ---------- Build 5-Part Series Fallback Table for Reference Tab ---------- */
  function buildSeriesReferenceTableHtml() {
    var rows = "";
    for (var i = 0; i < DATA.seriesTeaser.length; i++) {
      var item = DATA.seriesTeaser[i];
      rows +=
        "<tr>" +
          "<td><strong>" + escapeHtml(item.part) + "</strong></td>" +
          "<td><strong>" + escapeHtml(item.title) + "</strong></td>" +
          "<td>" + escapeHtml(item.desc) + "</td>" +
        "</tr>";
    }
    return (
      '<div class="chamber-table-wrap">' +
        '<table class="chamber-table">' +
          "<thead>" +
            "<tr>" +
              "<th>Part</th>" +
              "<th>Engineering Topic</th>" +
              "<th>What You Will Build</th>" +
            "</tr>" +
          "</thead>" +
          "<tbody>" + rows + "</tbody>" +
        "</table>" +
      "</div>"
    );
  }

  /* ---------- Build Full-Width Inline Companion Block (.companion-inline-card) ---------- */
  function buildCompanionBlockHtml(ch) {
    ch = ch || getChamberById(state.activeChamberId) || DATA.chambers[0];
    var fileObj = DATA.inspectorFiles[state.inspectorTab] || DATA.inspectorFiles.plugin;

    var html =
      '<section class="companion-inline-card" id="stage-companion-card" aria-label="Step Visual Map, Starter Mod Files, and Reference Table">' +
        '<div class="companion-header">' +
          '<div class="companion-tabs" role="tablist" aria-label="Companion Views">' +
            '<button type="button" class="companion-tab' + (state.companionTab === "diagram" ? " active" : "") + '" data-companion-tab="diagram" data-tooltip="Interactive diagram for this step. Hover over any box inside the map to see what it does!">🗺️ Visual Map</button>' +
            '<button type="button" class="companion-tab' + (state.companionTab === "files" ? " active" : "") + '" data-companion-tab="files" data-tooltip="View and copy the working files in starter-mod/ (HelloValheimPlugin.cs, HelloValheim.csproj, .cfg, manifest.json, and AGENTS.md).">📁 Starter Mod Files</button>' +
            '<button type="button" class="companion-tab' + (state.companionTab === "table" ? " active" : "") + '" data-companion-tab="table" data-tooltip="Quick-reference cheat sheet and comparison table for this step.">📊 Reference Table</button>' +
          "</div>" +
        "</div>";

    if (state.companionTab === "diagram") {
      html +=
        '<div class="ai-drawer-title">' + escapeHtml(ch.diagramTitle) + "</div>" +
        '<div class="diagram-stage">' + ch.svgDiagram + "</div>" +
        '<p class="diagram-caption">' + escapeHtml(ch.diagramCaption) + "</p>";
    } else if (state.companionTab === "files") {
      var filePills = [
        { key: "plugin", label: "HelloValheimPlugin.cs", tip: "Main C# mod code: plugin header, ConfigEntry settings, and Harmony patches." },
        { key: "csproj", label: "HelloValheim.csproj", tip: "Build configuration file telling dotnet where your Valheim and BepInEx DLLs live." },
        { key: "cfg", label: ".cfg", tip: "Live settings file in BepInEx/config/ that you can edit with F1 or a text editor." },
        { key: "manifest", label: "manifest.json", tip: "Thunderstore & r2modman package file with your mod name, version, and dependencies." },
        { key: "agents", label: "AGENTS.md (AI Rulebook)", tip: "Pre-installed AI rulebook in the root of this repo for Cursor/Claude Code (and embedded automatically in browser AI prompts)." }
      ];
      html += '<div class="file-subtabs"><div class="file-subtab-group">';
      for (var i = 0; i < filePills.length; i++) {
        var fp = filePills[i];
        html +=
          '<button type="button" class="file-pill' + (state.inspectorTab === fp.key ? " active" : "") + '" data-inspector-tab="' + fp.key + '" data-tooltip="' + escapeHtml(fp.tip) + '">' +
            escapeHtml(fp.label) +
          "</button>";
      }
      var highlightNote = state.inspectorTab === "agents"
        ? "Pre-installed in the root of valheim-modding-101/ for local coding agents (Cursor, Claude Code, Copilot), and automatically embedded whenever you copy from the 💬 AI Prompt tab below."
        : ch.inspectorHighlightNote;
      html +=
        "</div>" +
        '<button type="button" class="btn-action-tool" id="copy-inspector-file-btn" data-tooltip="Copy the full contents of this file to your clipboard.">Copy File</button>' +
        "</div>" +
        '<p class="diagram-caption">' + escapeHtml(highlightNote) + "</p>" +
        '<div class="inspector-code-scroll"><pre><code>' + escapeHtml(normalizeCodeBlock(fileObj.content)) + "</code></pre></div>";
    } else {
      var hasCustomTable = ch.tableHtml && ch.tableHtml.trim().length > 0;
      html +=
        '<div class="ai-drawer-title">' +
          escapeHtml(hasCustomTable ? (ch.numberLabel + " Reference Table") : "What Comes Next: 5-Part Valheim Modding Series") +
        "</div>" +
        (hasCustomTable ? ch.tableHtml : buildSeriesReferenceTableHtml());
    }

    html += "</section>";
    return html;
  }

  /* ---------- Render Single Active Chamber Stage (#chamber-stage) ---------- */
  function renderCenterStage() {
    var stageEl = document.getElementById("chamber-stage");
    if (!stageEl) return;

    var idx = getChamberIndex(state.activeChamberId);
    var ch = DATA.chambers[idx] || DATA.chambers[0];
    var prevChamber = idx > 0 ? DATA.chambers[idx - 1] : null;
    var nextChamber = idx + 1 < DATA.chambers.length ? DATA.chambers[idx + 1] : null;
    var isDone = !!state.completed[ch.id];

    var personaObj = DATA.personas[state.persona] || DATA.personas.P1;
    var personaNote = (ch.personaNotes && ch.personaNotes[state.persona]) || ch.personaNotes.P1;
    var osShort = state.os === "win" ? "PowerShell" : "Bash";
    var cmdText = normalizeCodeBlock(ch.commands[state.os] || ch.commands.win);
    var outText = normalizeCodeBlock(ch.expectedOutput[state.os] || ch.expectedOutput.win);

    var activeCodeText = cmdText;
    if (state.actionTab === "code") {
      activeCodeText = normalizeCodeBlock(ch.codeSnippet);
    } else if (state.actionTab === "ai") {
      activeCodeText = normalizeCodeBlock(buildSelfTapPrompt(ch.id, state.aiPreset, state.aiUserError));
    }

    var liftShort = /Medium|Intermediate/i.test(ch.liftBadge) ? "INTERMEDIATE" : "EASY";
    var phaseInfo = STEPPER_PHASES[ch.id] || {
      num: String(ch.phase != null ? ch.phase : (ch.sprint || 0)),
      name: ch.phaseLabel || ch.sprintLabel || "Guide"
    };
    var kickerText =
      "PHASE " + phaseInfo.num + " (" + phaseInfo.name.toUpperCase() + ")" +
      " · STEP " + (idx + 1) + " OF " + DATA.chambers.length +
      " · " + ch.minutes + " MIN · " + liftShort;

    var html = "";

    // 1. Header Block (.chamber-header-block) — Kicker, H1, Lead, Persona Note
    html +=
      '<div class="chamber-header-block">' +
        '<div class="chamber-kicker-row">' +
          '<span class="chamber-kicker">' + escapeHtml(kickerText) + "</span>" +
          (ch.safeStop ? '<span class="checkpoint-pill" data-tooltip="Your mod is in a working state here—safe to take a break or stop for today.">🟢 GOOD PLACE TO PAUSE</span>' : "") +
        "</div>" +
        '<h1 class="chamber-h1">' +
          escapeHtml(ch.numberLabel + ": " + ch.title) +
        "</h1>" +
        '<p class="chamber-lead">' +
          formatInlineMarkup(ch.summary) +
        "</p>" +
        '<div class="persona-inline-note">' +
          "<strong>Tailored for " + escapeHtml(personaObj.shortLabel) + ":</strong> " +
          formatInlineMarkup(personaNote) +
          ' <a href="#tailor-drawer" data-open-tailor="1" data-tooltip="Open the setup drawer to switch Windows/Linux or your background">[Change Setup ▾]</a>' +
        "</div>" +
      "</div>";

    // 2. Step 0 Storyboard & NotebookLM Media Hub (.storyboard-hub) when present
    if (ch.storyboard) {
      html += buildStoryboardHubHtml(ch);
    }

    // 3. Full-Width Inline Companion Card (.companion-inline-card) — Visual Map / Starter Mod Files / Reference Table
    html += buildCompanionBlockHtml(ch);

    // 4. Ordered Step List (.chamber-steps-card / .step-list)
    html += '<ol class="step-list chamber-steps-card">';
    for (var s = 0; s < ch.steps.length; s++) {
      html +=
        '<li class="step-list-item">' +
          '<span class="step-num">' + (s + 1) + "</span>" +
          '<div class="step-text">' + formatInlineMarkup(ch.steps[s]) + "</div>" +
        "</li>";
    }
    html += "</ol>";

    // 5. Single Tabbed Action Box (.action-box / .action-switcher) — Unifies CLI, Code & Self-Contained AI Prompt
    var copyBtnLabel = state.actionTab === "ai" ? "Copy Full AI Prompt" : "Copy";
    var copyBtnTip = state.actionTab === "ai"
      ? "Copy this complete, self-contained AI prompt (includes the AGENTS.md Valheim 1.0.20 rules + this step's code) to paste into free ChatGPT, Claude, or Cursor."
      : "Copy the code or command shown in the box below.";

    var aiSubbarHtml = "";
    if (state.actionTab === "ai") {
      aiSubbarHtml =
        '<div class="ai-inline-controls">' +
          '<div class="ai-preset-row">' +
            '<button type="button" class="ai-preset-pill' + (state.aiPreset === "explain" ? " active" : "") + '" data-ai-preset="explain" data-tooltip="Self-contained prompt for ChatGPT/Claude: embeds AGENTS.md rules + this step and asks for a plain-English walkthrough.">🌐 Explain This Step (Rules Included)</button>' +
            '<button type="button" class="ai-preset-pill' + (state.aiPreset === "diagnose" ? " active" : "") + '" data-ai-preset="diagnose" data-tooltip="Self-contained troubleshooting prompt: paste any error below and copy into ChatGPT/Claude.">🩺 Diagnose My Error</button>' +
            '<button type="button" class="ai-preset-pill' + (state.aiPreset === "customize" ? " active" : "") + '" data-ai-preset="customize" data-tooltip="Self-contained prompt asking AI to help customize HelloValheimPlugin.cs for your own mod idea.">✨ Customize Mod</button>' +
            '<button type="button" class="ai-preset-pill' + (state.aiPreset === "repo_setup" ? " active" : "") + '" data-ai-preset="repo_setup" data-tooltip="Using Cursor, Claude Code, or Copilot? See how the pre-installed AGENTS.md file in this repo works.">🤖 How Local Agents (AGENTS.md) Work</button>' +
            '<button type="button" class="ai-preset-pill" data-open-agents-file="1" data-tooltip="Open the full AGENTS.md rulebook in the Starter Mod Files card above.">📄 View AGENTS.md File →</button>' +
          "</div>" +
          (state.aiPreset === "diagnose"
            ? '<textarea id="ai-error-textarea" class="ai-error-input" placeholder="Paste your terminal error or BepInEx/LogOutput.log snippet here — it will be added directly into the prompt below...">' + escapeHtml(state.aiUserError) + "</textarea>"
            : "") +
        "</div>";
    }

    html +=
      '<div class="action-box action-switcher" id="stage-action-box">' +
        '<div class="action-box-bar">' +
          '<div class="action-tabs">' +
            '<button type="button" class="action-tab' + (state.actionTab === "cli" ? " active" : "") + '" data-action-tab="cli" data-tooltip="Show the terminal command to run in ' + escapeHtml(osShort) + ' for this step.">Terminal (Bash/PowerShell)</button>' +
            '<button type="button" class="action-tab' + (state.actionTab === "code" ? " active" : "") + '" data-action-tab="code" data-tooltip="Show the C# code or folder layout used in this step.">C# / Code</button>' +
            '<button type="button" class="action-tab' + (state.actionTab === "ai" ? " active" : "") + '" data-action-tab="ai" data-tooltip="View and copy a complete, self-contained AI prompt that already embeds the AGENTS.md Valheim 1.0.20 rules and this step\'s code—works in free ChatGPT, Claude, or Cursor with zero setup!">💬 AI Prompt (Rules Included)</button>' +
          "</div>" +
          '<div class="action-box-tools">' +
            '<button type="button" class="btn-action-tool" id="stage-copy-active-btn" data-tooltip="' + escapeHtml(copyBtnTip) + '">' + escapeHtml(copyBtnLabel) + "</button>" +
          "</div>" +
        "</div>" +
        aiSubbarHtml +
        '<pre><code id="stage-action-code">' + escapeHtml(activeCodeText) + "</code></pre>" +
      "</div>";

    // 6. Stoplight Verification Stack (Yield -> Go -> Stop)
    var yieldBodyHtml = ch.yieldNote
      ? formatInlineMarkup(ch.yieldNote)
      : ("Undo / Reset anytime: <code>" + escapeHtml(ch.undoBadge) + "</code>");

    var whyText = ch.cliffEdge.why || ch.cliffEdge.cause || "";

    html +=
      '<div class="stoplight-stack">' +
        '<div class="stoplight-card stoplight-yield">' +
          '<div class="stoplight-header">🟡 QUICK CHECK BEFORE YOU RUN THIS</div>' +
          '<div class="stoplight-body">' +
            yieldBodyHtml +
            ' <a href="#reset-drawer" data-open-reset="1" data-tooltip="See how to remove the tutorial mod in 1 second">[🛡️ How to uninstall / undo ▾]</a>' +
          "</div>" +
        "</div>" +
        '<div class="stoplight-card stoplight-go">' +
          '<div class="stoplight-header">🟢 HOW YOU KNOW IT WORKED</div>' +
          '<div class="stoplight-body">' + formatInlineMarkup(ch.onTrack) + "</div>" +
          "<pre><code>" + escapeHtml(outText) + "</code></pre>" +
        "</div>" +
        '<details class="stoplight-card stoplight-stop">' +
          '<summary data-tooltip="Click to expand or hide the cause and quick fix for this common issue.">' +
            "<span>🔴 COMMON ISSUE: " + escapeHtml(stripBackticks(ch.cliffEdge.symptom)) + "</span>" +
            "<span>Show Quick Fix ▾</span>" +
          "</summary>" +
          '<div class="stoplight-stop-content">' +
            "<div><strong>Why this happens:</strong> " + formatInlineMarkup(whyText) + "</div>" +
            "<div><strong>Quick fix:</strong> " + formatInlineMarkup(ch.cliffEdge.fix) + "</div>" +
            '<div><strong>Need help?</strong> <a href="#stage-action-box" data-open-ai-diagnose="1" data-tooltip="Open the AI helper above to diagnose your error">[💬 Ask AI to diagnose your error ▾]</a> · <a href="#reset-drawer" data-open-reset="1" data-tooltip="See the 1-line command to uninstall the mod">[🛡️ Uninstall mod ▾]</a></div>' +
          "</div>" +
        "</details>" +
      "</div>";

    // 7. Chamber Footer Navigation (.chamber-footer-nav / .chamber-nav-footer)
    var leftFooterBtn = prevChamber
      ? '<button type="button" class="btn-nav-prev" data-goto-chamber="' + escapeHtml(prevChamber.id) + '" data-tooltip="Go back to ' + escapeHtml(prevChamber.numberLabel + " (" + stripBackticks(prevChamber.title) + ")") + '">← Previous: ' + escapeHtml(prevChamber.numberLabel) + "</button>"
      : '<button type="button" class="btn-nav-prev" data-toggle-complete-btn="' + escapeHtml(ch.id) + '" data-tooltip="Mark or unmark this step as completed.">' + (isDone ? "✓ Completed " + escapeHtml(ch.numberLabel) : "Mark Complete") + "</button>";

    var rightFooterBtn = nextChamber
      ? '<button type="button" class="btn-nav-next-go" data-complete-and-next="' + escapeHtml(ch.id) + '" data-tooltip="Mark this step done and continue to ' + escapeHtml(nextChamber.numberLabel + " (" + stripBackticks(nextChamber.title) + ")") + '">🟢 Complete &amp; Continue to ' + escapeHtml(nextChamber.numberLabel) + " →</button>"
      : '<button type="button" class="btn-nav-next-go" data-complete-and-next="' + escapeHtml(ch.id) + '" data-tooltip="Mark the final step done and complete the guide!">' + (isDone ? "🟢 All " + DATA.chambers.length + " Steps Completed ✓" : "🟢 Complete " + escapeHtml(ch.numberLabel) + " &amp; Finish ✓") + "</button>";

    html +=
      '<footer class="chamber-footer-nav chamber-nav-footer">' +
        leftFooterBtn +
        rightFooterBtn +
      "</footer>";

    stageEl.innerHTML = html;

    if (ch.storyboard) {
      probeNotebookLmMedia();
    }
  }

  var renderChamberStage = renderCenterStage;

  /* ---------- Update Inline Companion Card & Clear Legacy #companion-pane ---------- */
  function renderCompanionPane() {
    var compEl = document.getElementById("companion-pane");
    if (compEl) {
      compEl.innerHTML = "";
    }
    var inlineCard = document.querySelector(".companion-inline-card");
    if (inlineCard) {
      var ch = getChamberById(state.activeChamberId) || DATA.chambers[0];
      inlineCard.outerHTML = buildCompanionBlockHtml(ch);
    }
  }

  /* ---------- Navigate to Chamber ---------- */
  function setActiveChamber(chamberId, scrollToTop) {
    var ch = getChamberById(chamberId);
    if (!ch) return;
    state.activeChamberId = ch.id;
    if (ch.defaultInspectorTab && DATA.inspectorFiles[ch.defaultInspectorTab]) {
      state.inspectorTab = ch.defaultInspectorTab;
    }
    saveState();
    renderAll();

    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /* ---------- Instant Viking Hearth Hover Tooltip System ---------- */
  var activeTooltipTarget = null;

  function showTooltip(el) {
    var tipEl = document.getElementById("hearth-tooltip");
    if (!tipEl || !el) return;
    var text = el.getAttribute("data-tooltip");
    if (!text) {
      hideTooltip();
      return;
    }
    activeTooltipTarget = el;
    tipEl.textContent = text;
    tipEl.removeAttribute("hidden");

    var rect = el.getBoundingClientRect();
    var tipRect = tipEl.getBoundingClientRect();
    var gap = 8;

    var top = rect.top - tipRect.height - gap;
    if (top < 8) {
      top = rect.bottom + gap;
    }

    var left = rect.left + (rect.width / 2) - (tipRect.width / 2);
    var maxLeft = window.innerWidth - tipRect.width - 12;
    if (left < 12) left = 12;
    if (left > maxLeft) left = Math.max(12, maxLeft);

    tipEl.style.top = Math.round(top) + "px";
    tipEl.style.left = Math.round(left) + "px";
  }

  function hideTooltip() {
    activeTooltipTarget = null;
    var tipEl = document.getElementById("hearth-tooltip");
    if (tipEl) {
      tipEl.setAttribute("hidden", "");
    }
  }

  /* ---------- Full Re-Render ---------- */
  function renderAll() {
    hideTooltip();
    syncHeaderAndDrawers();
    renderStepperBar();
    renderCenterStage();
    renderCompanionPane();
  }

  /* ---------- Event Delegation & Keyboard Shortcuts ---------- */
  function bindEvents() {
    var suppressTooltipUntilMove = false;
    var lastClickX = 0;
    var lastClickY = 0;

    window.addEventListener("mousemove", function (ev) {
      if (suppressTooltipUntilMove) {
        if (Math.abs(ev.clientX - lastClickX) > 3 || Math.abs(ev.clientY - lastClickY) > 3) {
          suppressTooltipUntilMove = false;
        }
      }
    }, { passive: true });

    document.addEventListener("mouseover", function (ev) {
      if (suppressTooltipUntilMove) return;
      var target = ev.target && ev.target.closest ? ev.target.closest("[data-tooltip]") : null;
      if (target) {
        showTooltip(target);
      } else if (activeTooltipTarget) {
        hideTooltip();
      }
    });

    document.addEventListener("mouseout", function (ev) {
      if (!activeTooltipTarget) return;
      var related = ev.relatedTarget;
      if (related && related.closest && related.closest("[data-tooltip]") === activeTooltipTarget) {
        return;
      }
      hideTooltip();
    });

    document.addEventListener("focusin", function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest("[data-tooltip]") : null;
      if (target && (!target.matches || target.matches(":focus-visible"))) {
        showTooltip(target);
      }
    });

    document.addEventListener("focusout", function () {
      hideTooltip();
    });

    window.addEventListener("scroll", function () {
      if (activeTooltipTarget) hideTooltip();
    }, { passive: true });

    document.addEventListener("click", function (ev) {
      suppressTooltipUntilMove = true;
      lastClickX = ev.clientX || 0;
      lastClickY = ev.clientY || 0;
      hideTooltip();
      var target = ev.target;
      if (!target) return;

      // 1. Toggle Tailor Drawer
      if (target.closest("#toggle-tailor-btn")) {
        state.tailorOpen = !state.tailorOpen;
        if (state.tailorOpen) {
          state.resetOpen = false;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        syncHeaderAndDrawers();
        return;
      }

      // 2. Open Tailor Drawer from Stage Link ([Change Setup ▾])
      if (target.closest("[data-open-tailor]")) {
        ev.preventDefault();
        state.tailorOpen = true;
        state.resetOpen = false;
        syncHeaderAndDrawers();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // 3. Toggle Reset Drawer
      if (target.closest("#toggle-reset-drawer-btn")) {
        state.resetOpen = !state.resetOpen;
        if (state.resetOpen) {
          state.tailorOpen = false;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        syncHeaderAndDrawers();
        return;
      }

      // 3b. Open Reset Drawer from Stage Link ([🛡️ How to uninstall / undo ▾])
      if (target.closest("[data-open-reset]")) {
        ev.preventDefault();
        state.resetOpen = true;
        state.tailorOpen = false;
        syncHeaderAndDrawers();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // 3c. Open Stage Action Box in AI Diagnose Mode ([💬 Ask AI to diagnose your error ▾])
      if (target.closest("[data-open-ai-diagnose]")) {
        ev.preventDefault();
        state.actionTab = "ai";
        state.aiPreset = "diagnose";
        saveState();
        renderCenterStage();
        syncHeaderAndDrawers();
        var actionBoxEl = document.getElementById("stage-action-box");
        if (actionBoxEl && actionBoxEl.scrollIntoView) {
          actionBoxEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        var errInput = document.getElementById("ai-error-textarea");
        if (errInput) errInput.focus();
        return;
      }

      // 4. Close Header Drawers
      if (target.closest("[data-close-drawers]")) {
        state.tailorOpen = false;
        state.resetOpen = false;
        syncHeaderAndDrawers();
        return;
      }

      // 5. Toggle Theme (Dark / Light)
      if (target.closest("#toggle-theme-btn")) {
        state.theme = state.theme === "dark" ? "light" : "dark";
        saveState();
        syncHeaderAndDrawers();
        return;
      }

      // 6. Reset Webpage Step Checkmarks
      if (target.closest("#reset-guide-progress-btn")) {
        var rpBtn = target.closest("#reset-guide-progress-btn");
        state.completed = {};
        state.activeChamberId = "0";
        saveState();
        renderAll();
        if (rpBtn) {
          rpBtn.classList.add("copied");
          rpBtn.textContent = "✓ Progress Reset (0/" + DATA.chambers.length + ")";
          setTimeout(function () {
            rpBtn.classList.remove("copied");
            syncHeaderAndDrawers();
          }, 1400);
        }
        return;
      }

      // 7. Copy Reset Command in Reset Drawer
      if (target.closest("#copy-reset-cmd-btn")) {
        var rBtn = target.closest("#copy-reset-cmd-btn");
        var resetCmd = state.os === "win"
          ? "powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1 -Reset"
          : "bash ./tools/build-and-deploy.sh --reset";
        copyToClipboard(resetCmd, rBtn, "✓ Command Copied");
        return;
      }

      // 8. Top Bar Segmented Switch & Tailor Drawer: Set OS
      var osBtn = target.closest("[data-set-os]");
      if (osBtn) {
        state.os = osBtn.getAttribute("data-set-os");
        saveState();
        renderAll();
        return;
      }

      // 9. Tailor Drawer: Set Persona
      var pBtn = target.closest("[data-set-persona]");
      if (pBtn) {
        state.persona = pBtn.getAttribute("data-set-persona");
        saveState();
        renderAll();
        return;
      }

      // 10. Tailor Drawer: Set Preferred Action Tab
      var prefTabBtn = target.closest("[data-set-action-tab]");
      if (prefTabBtn) {
        state.actionTab = prefTabBtn.getAttribute("data-set-action-tab");
        saveState();
        renderAll();
        return;
      }

      // 11. Stage Action Box Tabs (cli | code | ai)
      var actTabBtn = target.closest("[data-action-tab]");
      if (actTabBtn) {
        state.actionTab = actTabBtn.getAttribute("data-action-tab");
        saveState();
        hideTooltip();
        renderCenterStage();
        syncHeaderAndDrawers();
        return;
      }

      // 12. Copy Active Stage Action Code (CLI Command, C# Code, or Full Self-Contained AI Prompt)
      if (target.closest("#stage-copy-active-btn")) {
        var cBtn = target.closest("#stage-copy-active-btn");
        var ch = getChamberById(state.activeChamberId) || DATA.chambers[0];
        var txt = ch.commands[state.os] || ch.commands.win;
        var copiedLabel = "✓ Copied";
        if (state.actionTab === "code") {
          txt = ch.codeSnippet;
        } else if (state.actionTab === "ai") {
          txt = buildSelfTapPrompt(ch.id, state.aiPreset, state.aiUserError);
          copiedLabel = "✓ Full AI Prompt Copied";
        }
        copyToClipboard(txt, cBtn, copiedLabel);
        return;
      }

      // 13. Toggle Inline Self-Tap AI Drawer in Stage
      if (target.closest("#stage-toggle-ai-drawer-btn")) {
        state.aiDrawerOpen = !state.aiDrawerOpen;
        hideTooltip();
        renderCenterStage();
        return;
      }

      // 14. Switch AI Preset Pill inside AI Sub-bar
      var presetBtn = target.closest("[data-ai-preset]");
      if (presetBtn) {
        state.aiPreset = presetBtn.getAttribute("data-ai-preset");
        hideTooltip();
        renderCenterStage();
        return;
      }

      // 14b. Open AGENTS.md File in Inline Companion Card ([📄 View AGENTS.md File →])
      if (target.closest("[data-open-agents-file]")) {
        ev.preventDefault();
        state.companionTab = "files";
        state.inspectorTab = "agents";
        saveState();
        hideTooltip();
        renderCenterStage();
        var compCardEl = document.querySelector(".companion-inline-card");
        if (compCardEl && compCardEl.scrollIntoView) {
          compCardEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      // 15. Copy Prompt inside Inline AI Drawer
      if (target.closest("#drawer-copy-ai-prompt-btn")) {
        var dBtn = target.closest("#drawer-copy-ai-prompt-btn");
        var fullPrompt = buildSelfTapPrompt(state.activeChamberId, state.aiPreset, state.aiUserError);
        copyToClipboard(fullPrompt, dBtn, "✓ Prompt Copied");
        return;
      }

      // 16. Navigate to Chamber (Stepper Bar or Previous Button)
      var gotoBtn = target.closest("[data-goto-chamber]");
      if (gotoBtn) {
        setActiveChamber(gotoBtn.getAttribute("data-goto-chamber"), true);
        return;
      }

      // 17. Toggle Complete on Chamber 0 Left Footer Button
      var toggleCompBtn = target.closest("[data-toggle-complete-btn]");
      if (toggleCompBtn) {
        var cid = toggleCompBtn.getAttribute("data-toggle-complete-btn");
        state.completed[cid] = !state.completed[cid];
        saveState();
        renderAll();
        return;
      }

      // 18. Complete & Continue to Next Chamber CTA
      var compNextBtn = target.closest("[data-complete-and-next]");
      if (compNextBtn) {
        var currId = compNextBtn.getAttribute("data-complete-and-next");
        state.completed[currId] = true;
        var currIdx = getChamberIndex(currId);
        if (currIdx + 1 < DATA.chambers.length) {
          setActiveChamber(DATA.chambers[currIdx + 1].id, true);
        } else {
          saveState();
          renderAll();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }

      // 19. Companion Card Tabs (diagram | files | table)
      var compTabBtn = target.closest("[data-companion-tab]");
      if (compTabBtn) {
        state.companionTab = compTabBtn.getAttribute("data-companion-tab");
        saveState();
        hideTooltip();
        if (document.querySelector(".companion-inline-card")) {
          renderCompanionPane();
        } else {
          renderCenterStage();
        }
        return;
      }

      // 20. Starter Mod File Subtabs (plugin | csproj | cfg | manifest | agents)
      var filePillBtn = target.closest("[data-inspector-tab]");
      if (filePillBtn) {
        state.inspectorTab = filePillBtn.getAttribute("data-inspector-tab");
        saveState();
        hideTooltip();
        if (document.querySelector(".companion-inline-card")) {
          renderCompanionPane();
        } else {
          renderCenterStage();
        }
        return;
      }

      // 21. Copy Starter Mod File
      if (target.closest("#copy-inspector-file-btn")) {
        var fBtn = target.closest("#copy-inspector-file-btn");
        var fObj = DATA.inspectorFiles[state.inspectorTab] || DATA.inspectorFiles.plugin;
        copyToClipboard(fObj.content, fBtn, "✓ Copied " + fObj.label);
        return;
      }

      // 22. Copy NotebookLM Source Script in Step 0 Storyboard Hub
      if (target.closest("#copy-notebooklm-btn")) {
        var nlmBtn = target.closest("#copy-notebooklm-btn");
        var currCh = getChamberById(state.activeChamberId) || DATA.chambers[0];
        var nlmScript = (currCh.storyboard && (currCh.storyboard.notebookLmPrompt || currCh.storyboard.notebookLmScript)) || "";
        copyToClipboard(nlmScript, nlmBtn, "✓ Script Copied");
        return;
      }
    });

    // Live Error Textarea Input Delegation
    document.addEventListener("input", function (ev) {
      if (ev.target && ev.target.id === "ai-error-textarea") {
        state.aiUserError = ev.target.value;
        var codeEl = document.getElementById("stage-action-code");
        if (codeEl) {
          codeEl.textContent = normalizeCodeBlock(
            buildSelfTapPrompt(state.activeChamberId, state.aiPreset, state.aiUserError)
          );
        }
      }
    });

    // Keyboard Shortcuts ([ / ] for prev/next chamber, Escape to close tooltip)
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        hideTooltip();
      }
      var tag = ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (ev.key === "[" || (ev.altKey && ev.key === "ArrowLeft")) {
        var idx = getChamberIndex(state.activeChamberId);
        if (idx > 0) setActiveChamber(DATA.chambers[idx - 1].id, true);
      } else if (ev.key === "]" || (ev.altKey && ev.key === "ArrowRight")) {
        var idx2 = getChamberIndex(state.activeChamberId);
        if (idx2 + 1 < DATA.chambers.length) setActiveChamber(DATA.chambers[idx2 + 1].id, true);
      }
    });
  }

  /* ---------- Initialize ---------- */
  function init() {
    loadState();
    renderAll();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
