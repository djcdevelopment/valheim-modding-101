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

  var COMPANION_SLIDES = ["diagram", "files", "table"];
  var CAROUSEL_INTERVAL_MS = 7000;
  var carouselElapsedMs = 0;
  var isCompanionHovered = false;
  var carouselTimerId = null;

  var state = {
    os: detectDefaultOS(),      // 'win' | 'linux'
    persona: "P1",              // 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
    actionTab: "cli",           // 'cli' | 'code' | 'ai'
    companionTab: "diagram",    // 'diagram' | 'files' | 'table'
    companionAutoplay: true,    // auto-rotate 3-slide companion carousel
    inspectorTab: "plugin",     // 'plugin' | 'csproj' | 'cfg' | 'manifest' | 'agents'
    theme: "dark",              // 'dark' | 'light'
    activeChamberId: "0",       // '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
    completed: {},              // { [chamberId]: true }
    tailorOpen: false,
    resetOpen: false,
    feedbackOpen: false,
    feedbackCat: "confusing",   // 'confusing' | 'helpful' | 'bug' | 'topic'
    mediaMode: "video",         // 'video' | 'audio'
    aiDrawerOpen: false,
    aiPreset: "explain",        // 'explain' | 'diagnose' | 'customize'
    aiUserError: ""
  };

  function trackTelemetry(eventName, props) {
    try {
      if (window.FOUNDRY_TELEMETRY && typeof window.FOUNDRY_TELEMETRY.track === "function") {
        var merged = props && typeof props === "object" ? props : {};
        if (!merged.state) merged.state = state;
        window.FOUNDRY_TELEMETRY.track(eventName, merged);
      }
    } catch (e) {}
    refreshFeedbackBreadcrumbPreview();
  }

  function refreshFeedbackBreadcrumbPreview() {
    var prevEl = document.getElementById("feedback-breadcrumb-preview");
    if (!prevEl) return;
    try {
      if (window.FOUNDRY_TELEMETRY && typeof window.FOUNDRY_TELEMETRY.getUsabilitySummary === "function") {
        var sum = window.FOUNDRY_TELEMETRY.getUsabilitySummary(state);
        prevEl.textContent = (sum && (sum.text || sum.summary)) || "No usability breadcrumbs recorded yet.";
      }
    } catch (e) {}
  }

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
        if (typeof parsed.companionAutoplay === "boolean") state.companionAutoplay = parsed.companionAutoplay;
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
        companionAutoplay: state.companionAutoplay,
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

  var INSPECTOR_FILE_NAMES = {
    plugin: "HelloValheimPlugin.cs",
    csproj: "HelloValheim.csproj",
    cfg: "com.valheim101.hellovalheim.cfg",
    manifest: "manifest.json",
    agents: "AGENTS.md"
  };

  function getInspectorSingleFileName(tabKey) {
    return INSPECTOR_FILE_NAMES[tabKey] || "HelloValheimPlugin.cs";
  }

  function getInspectorSingleFileContent(tabKey) {
    var fObj = DATA.inspectorFiles[tabKey] || DATA.inspectorFiles.plugin;
    var raw = normalizeCodeBlock(fObj.content || "");
    if (tabKey === "manifest") {
      var parts = raw.split(/\/\/\s*===\s*starter-mod\/thunderstore\.toml\s*===/i);
      var jsonPart = parts[0] || raw;
      jsonPart = jsonPart.replace(/^\/\/\s*===\s*starter-mod\/manifest\.json\s*===\s*/i, "").trim();
      return jsonPart + "\n";
    }
    return raw + "\n";
  }

  function triggerBlobDownload(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
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

    // Feedback Drawer
    var feedbackDrawer = document.getElementById("feedback-drawer");
    var feedbackBtn = document.getElementById("toggle-feedback-drawer-btn");
    if (feedbackDrawer && feedbackBtn) {
      if (state.feedbackOpen) {
        feedbackDrawer.removeAttribute("hidden");
        feedbackBtn.classList.add("active");
        feedbackBtn.setAttribute("aria-expanded", "true");
        refreshFeedbackBreadcrumbPreview();
        var whInput = document.getElementById("feedback-webhook-url-input");
        if (whInput && window.FOUNDRY_TELEMETRY && typeof window.FOUNDRY_TELEMETRY.getWebhookOverride === "function") {
          var savedWh = window.FOUNDRY_TELEMETRY.getWebhookOverride();
          if (savedWh && !whInput.value) {
            whInput.value = savedWh;
          }
        }
      } else {
        feedbackDrawer.setAttribute("hidden", "");
        feedbackBtn.classList.remove("active");
        feedbackBtn.setAttribute("aria-expanded", "false");
      }
    }

    var catBtns = document.querySelectorAll("[data-feedback-cat]");
    for (var fIdx = 0; fIdx < catBtns.length; fIdx++) {
      var isCat = catBtns[fIdx].getAttribute("data-feedback-cat") === state.feedbackCat;
      catBtns[fIdx].classList.toggle("active", isCat);
      catBtns[fIdx].setAttribute("aria-pressed", isCat ? "true" : "false");
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

    var isAudioMode = state.mediaMode === "audio";

    return (
      '<section class="storyboard-hub" id="storyboard-hub" aria-label="Step 0 Visual Storyboard and Media Hub">' +
        '<div class="storyboard-header">' +
          '<div class="storyboard-header-left">' +
            '<h2 class="storyboard-title">' + escapeHtml(heading) + "</h2>" +
            '<p class="storyboard-subhead">' + formatInlineMarkup(subhead) + "</p>" +
          "</div>" +
          '<button type="button" id="copy-notebooklm-btn" class="btn-secondary btn-action-tool" data-tooltip="Copy a ready-made overview script to paste into Google NotebookLM to generate your own Audio Podcast or Video Overview">📋 Copy NotebookLM Source Script</button>' +
        "</div>" +
        '<div id="notebooklm-media-bar" class="notebooklm-cinema-card">' +
          '<div class="notebooklm-cinema-header">' +
            '<span class="notebooklm-cinema-title">🎬 3-Minute Visual &amp; Audio Overview: Why Valheim 1.0 Modding Is 100% Safe</span>' +
            '<div class="notebooklm-mode-pills" role="group" aria-label="Overview Media Mode">' +
              '<button type="button" class="media-mode-pill' + (!isAudioMode ? " active" : "") + '" data-media-mode="video" data-tooltip="Watch the 3m 15s visual slides and audio walkthrough.">🎬 Watch Video (3m 15s)</button>' +
              '<button type="button" class="media-mode-pill' + (isAudioMode ? " active" : "") + '" data-media-mode="audio" data-tooltip="Listen to the audio-only (.mp3) overview.">🎧 Audio Only (.mp3)</button>' +
            "</div>" +
          "</div>" +
          '<div class="notebooklm-cinema-body">' +
            '<video id="notebooklm-video-player" class="notebooklm-video-player" controls preload="metadata" poster="media/video/overview-poster.jpg" src="media/video/overview-video.mp4"' + (isAudioMode ? " hidden" : "") + "></video>" +
            '<audio id="notebooklm-audio-player" class="notebooklm-audio-player" controls preload="metadata" src="media/audio/notebooklm-audio-overview.mp3"' + (isAudioMode ? "" : " hidden") + "></audio>" +
          "</div>" +
        "</div>" +
        '<div class="storyboard-grid">' +
          panelsHtml +
        "</div>" +
      "</section>"
    );
  }

  function probeNotebookLmMedia() {
    var players = [
      { el: document.getElementById("notebooklm-video-player"), kind: "video" },
      { el: document.getElementById("notebooklm-audio-player"), kind: "audio" }
    ];
    for (var i = 0; i < players.length; i++) {
      (function (item) {
        var mediaEl = item.el;
        if (!mediaEl || mediaEl._telemetryBound) return;
        mediaEl._telemetryBound = true;
        mediaEl._milestonesHit = {};

        mediaEl.addEventListener("play", function () {
          trackTelemetry(item.kind + "_play", {
            stepId: state.activeChamberId,
            detail: item.kind + "_overview"
          });
        });

        mediaEl.addEventListener("timeupdate", function () {
          if (!mediaEl.duration || !isFinite(mediaEl.duration) || mediaEl.duration <= 0) return;
          var pct = Math.min(100, Math.round((mediaEl.currentTime / mediaEl.duration) * 100));
          var targets = [25, 50, 75];
          for (var t = 0; t < targets.length; t++) {
            var ms = targets[t];
            if (pct >= ms && !mediaEl._milestonesHit[ms]) {
              mediaEl._milestonesHit[ms] = true;
              trackTelemetry(item.kind + "_progress", {
                stepId: state.activeChamberId,
                detail: ms + "%",
                videoPct: pct
              });
            }
          }
        });

        mediaEl.addEventListener("ended", function () {
          trackTelemetry(item.kind + "_ended", {
            stepId: state.activeChamberId,
            detail: "100%",
            videoPct: 100
          });
        });
      })(players[i]);
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
        '<div class="companion-carousel-body">';

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
      html +=
        '<div class="ai-drawer-title">Starter Mod Files &amp; AI Rulebook (Click Any File Pill Below)</div>' +
        '<div class="file-subtabs"><div class="file-subtab-group">';
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
      var singleFileName = getInspectorSingleFileName(state.inspectorTab);
      html +=
        "</div>" +
        '<div class="file-action-group">' +
          '<a href="downloads/valheim-modding-101-starter-files.zip" download="valheim-modding-101-starter-files.zip" class="btn-action-tool btn-download-archive" data-download-bundle="zip" data-tooltip="Download all starter mod files (HelloValheimPlugin.cs, HelloValheim.csproj, .cfg, manifest.json, thunderstore.toml, AGENTS.md, and tools/ scripts) in a single .zip with all filenames and folders ready to use!">📦 Download All (.zip)</a>' +
          '<a href="downloads/valheim-modding-101-starter-files.tar.gz" download="valheim-modding-101-starter-files.tar.gz" class="btn-action-tool btn-download-archive" data-download-bundle="tar" data-tooltip="Download all starter mod files and tools/ scripts as a .tar.gz archive with all filenames and folders preserved.">📦 .tar.gz</a>' +
          '<button type="button" class="btn-action-tool" id="download-inspector-file-btn" data-tooltip="Save this file directly to your computer with its exact filename (' + escapeHtml(singleFileName) + ') — no need to create or rename a blank file!">⬇️ Save ' + escapeHtml(singleFileName) + "</button>" +
          '<button type="button" class="btn-action-tool" id="copy-inspector-file-btn" data-tooltip="Copy the text of this file to your clipboard.">Copy Text</button>' +
        "</div>" +
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

    html +=
        "</div>" +
        '<div class="companion-carousel-dock">' +
          '<button type="button" class="carousel-ctrl-btn" data-companion-nav="prev" data-tooltip="Previous slide in carousel (◀)">◀</button>' +
          '<div class="companion-tabs" role="tablist" aria-label="Carousel Slide Indicators and Direct Links">' +
            '<button type="button" class="companion-tab' + (state.companionTab === "diagram" ? " active" : "") + '" data-companion-tab="diagram" data-tooltip="Slide 1 of 3 — Interactive Visual Map. Click to jump directly here.">🗺️ Visual Map' + (state.companionTab === "diagram" ? '<span class="companion-tab-progress" id="companion-tab-progress"></span>' : '') + '</button>' +
            '<button type="button" class="companion-tab' + (state.companionTab === "files" ? " active" : "") + '" data-companion-tab="files" data-tooltip="Slide 2 of 3 — Starter Mod Files (HelloValheimPlugin.cs, .csproj, .cfg, manifest.json, AGENTS.md). Click to jump directly here.">📁 Starter Mod Files' + (state.companionTab === "files" ? '<span class="companion-tab-progress" id="companion-tab-progress"></span>' : '') + '</button>' +
            '<button type="button" class="companion-tab' + (state.companionTab === "table" ? " active" : "") + '" data-companion-tab="table" data-tooltip="Slide 3 of 3 — Quick-Reference Cheat Sheet &amp; Table for this step. Click to jump directly here.">📊 Reference Table' + (state.companionTab === "table" ? '<span class="companion-tab-progress" id="companion-tab-progress"></span>' : '') + '</button>' +
          "</div>" +
          '<button type="button" class="carousel-ctrl-btn" data-companion-nav="next" data-tooltip="Next slide in carousel (▶)">▶</button>' +
          '<button type="button" class="carousel-ctrl-btn' + (state.companionAutoplay ? " active" : "") + '" id="companion-autoplay-btn" data-tooltip="' + (state.companionAutoplay ? "Auto-rotating through all 3 slides every 7 seconds (automatically pauses while your mouse hovers inside this card). Click to pause." : "Auto-rotation is paused. Click to resume rotating through all 3 slides.") + '">' + (state.companionAutoplay ? "⏸ Auto" : "▶ Paused") + '</button>' +
        "</div>" +
      "</section>";
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

    var stageArchiveToolsHtml = "";
    if (state.actionTab === "code" || state.actionTab === "cli") {
      stageArchiveToolsHtml =
        '<a href="downloads/valheim-modding-101-starter-files.zip" download="valheim-modding-101-starter-files.zip" class="btn-action-tool btn-download-archive" data-download-bundle="zip" data-tooltip="Don\'t want to copy-paste and name files by hand? Download all starter mod files and scripts (.zip) with exact filenames!">📦 Download Files (.zip)</a>' +
        '<a href="downloads/valheim-modding-101-starter-files.tar.gz" download="valheim-modding-101-starter-files.tar.gz" class="btn-action-tool btn-download-archive" data-download-bundle="tar" data-tooltip="Download all starter mod files and scripts (.tar.gz) with exact filenames and folders.">📦 .tar.gz</a>';
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
            stageArchiveToolsHtml +
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

    // 6b. Step Usability Micro-Feedback Strip (.step-feedback-strip)
    html +=
      '<div class="step-feedback-strip" aria-label="Step Usability Feedback">' +
        '<span class="step-feedback-prompt">Was ' + escapeHtml(ch.numberLabel) + " clear and easy to follow?</span>" +
        '<div class="step-feedback-actions">' +
          '<button type="button" class="btn-action-tool" data-quick-feedback="helpful" data-tooltip="Log a quick thumbs-up for this step (or add a note).">👍 Yes, clear!</button>' +
          '<button type="button" class="btn-action-tool" data-quick-feedback="confusing" data-tooltip="Open the Discord feedback box pre-tagged to this step so Derek knows what to improve.">🤔 Something was confusing / Send Feedback ▾</button>' +
        "</div>" +
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

    var stopDetailsEl = stageEl.querySelector("details.stoplight-stop");
    if (stopDetailsEl) {
      stopDetailsEl.addEventListener("toggle", function () {
        if (stopDetailsEl.open) {
          trackTelemetry("stop_issue_expand", {
            stepId: ch.id,
            detail: stripBackticks(ch.cliffEdge.symptom)
          });
        }
      });
    }
  }

  var renderChamberStage = renderCenterStage;

  /* ---------- Update Inline Companion Card & Clear Legacy #companion-pane ---------- */
  function updateCarouselProgressBar() {
    var progEl = document.getElementById("companion-tab-progress");
    if (progEl) {
      progEl.style.width = Math.min(100, Math.round((carouselElapsedMs / CAROUSEL_INTERVAL_MS) * 100)) + "%";
    }
  }

  function renderCompanionPane() {
    var compEl = document.getElementById("companion-pane");
    if (compEl) {
      compEl.innerHTML = "";
    }
    var inlineCard = document.querySelector(".companion-inline-card");
    if (inlineCard) {
      var ch = getChamberById(state.activeChamberId) || DATA.chambers[0];
      inlineCard.outerHTML = buildCompanionBlockHtml(ch);
      updateCarouselProgressBar();
    }
  }

  function startCompanionCarouselTimer() {
    if (carouselTimerId) {
      clearInterval(carouselTimerId);
    }
    carouselTimerId = setInterval(function () {
      if (!state.companionAutoplay || isCompanionHovered || document.hidden) {
        updateCarouselProgressBar();
        return;
      }
      carouselElapsedMs += 100;
      updateCarouselProgressBar();
      if (carouselElapsedMs >= CAROUSEL_INTERVAL_MS) {
        carouselElapsedMs = 0;
        var currIdx = COMPANION_SLIDES.indexOf(state.companionTab);
        if (currIdx === -1) currIdx = 0;
        state.companionTab = COMPANION_SLIDES[(currIdx + 1) % COMPANION_SLIDES.length];
        renderCompanionPane();
      }
    }, 100);
  }

  /* ---------- Navigate to Chamber ---------- */
  function setActiveChamber(chamberId, scrollToTop) {
    var ch = getChamberById(chamberId);
    if (!ch) return;
    state.activeChamberId = ch.id;
    if (ch.defaultInspectorTab && DATA.inspectorFiles[ch.defaultInspectorTab]) {
      state.inspectorTab = ch.defaultInspectorTab;
    }
    carouselElapsedMs = 0;
    saveState();
    renderAll();
    trackTelemetry("step_view", { stepId: ch.id, detail: ch.numberLabel });

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
      isCompanionHovered = !!(ev.target && ev.target.closest && ev.target.closest("#stage-companion-card"));
    }, { passive: true });

    document.addEventListener("mouseover", function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest("#stage-companion-card")) {
        isCompanionHovered = true;
      }
      if (suppressTooltipUntilMove) return;
      var target = ev.target && ev.target.closest ? ev.target.closest("[data-tooltip]") : null;
      if (target) {
        showTooltip(target);
      } else if (activeTooltipTarget) {
        hideTooltip();
      }
    });

    document.addEventListener("mouseout", function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest("#stage-companion-card")) {
        var relCard = ev.relatedTarget;
        if (!relCard || !relCard.closest || !relCard.closest("#stage-companion-card")) {
          isCompanionHovered = false;
        }
      }
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
          state.feedbackOpen = false;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        syncHeaderAndDrawers();
        return;
      }

      // 1b. Toggle Private Discord Feedback Drawer
      if (target.closest("#toggle-feedback-drawer-btn")) {
        state.feedbackOpen = !state.feedbackOpen;
        if (state.feedbackOpen) {
          state.tailorOpen = false;
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
        state.feedbackOpen = false;
        syncHeaderAndDrawers();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // 3. Toggle Reset Drawer
      if (target.closest("#toggle-reset-drawer-btn")) {
        state.resetOpen = !state.resetOpen;
        if (state.resetOpen) {
          state.tailorOpen = false;
          state.feedbackOpen = false;
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
        state.feedbackOpen = false;
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
        state.feedbackOpen = false;
        syncHeaderAndDrawers();
        return;
      }

      // 4b. Step 0 Cinema Card Media Mode Switcher (video | audio)
      var mediaModeBtn = target.closest("[data-media-mode]");
      if (mediaModeBtn) {
        var newMode = mediaModeBtn.getAttribute("data-media-mode") === "audio" ? "audio" : "video";
        state.mediaMode = newMode;
        var vidPlayer = document.getElementById("notebooklm-video-player");
        var audPlayer = document.getElementById("notebooklm-audio-player");
        if (newMode === "audio") {
          if (vidPlayer) {
            try { vidPlayer.pause(); } catch (e) {}
            vidPlayer.setAttribute("hidden", "");
          }
          if (audPlayer) {
            audPlayer.removeAttribute("hidden");
          }
        } else {
          if (audPlayer) {
            try { audPlayer.pause(); } catch (e) {}
            audPlayer.setAttribute("hidden", "");
          }
          if (vidPlayer) {
            vidPlayer.removeAttribute("hidden");
          }
        }
        var modePills = document.querySelectorAll("[data-media-mode]");
        for (var mIdx = 0; mIdx < modePills.length; mIdx++) {
          modePills[mIdx].classList.toggle("active", modePills[mIdx].getAttribute("data-media-mode") === newMode);
        }
        trackTelemetry("media_mode_switch", { stepId: state.activeChamberId, detail: newMode });
        return;
      }

      // 4c. Feedback Category Pill Selection
      var fbCatBtn = target.closest("[data-feedback-cat]");
      if (fbCatBtn) {
        state.feedbackCat = fbCatBtn.getAttribute("data-feedback-cat") || "confusing";
        syncHeaderAndDrawers();
        return;
      }

      // 4d. Save Local Discord Webhook Override
      if (target.closest("#save-webhook-url-btn")) {
        var saveWhBtn = target.closest("#save-webhook-url-btn");
        var whInputEl = document.getElementById("feedback-webhook-url-input");
        var whVal = whInputEl ? whInputEl.value.trim() : "";
        if (window.FOUNDRY_TELEMETRY && typeof window.FOUNDRY_TELEMETRY.setWebhookOverride === "function") {
          window.FOUNDRY_TELEMETRY.setWebhookOverride(whVal);
        }
        var origWhText = saveWhBtn.textContent;
        saveWhBtn.classList.add("copied");
        saveWhBtn.textContent = whVal ? "✓ Webhook Saved" : "✓ Cleared";
        setTimeout(function () {
          saveWhBtn.classList.remove("copied");
          saveWhBtn.textContent = origWhText;
        }, 1400);
        return;
      }

      // 4e. Submit Private Discord Feedback Form
      if (target.closest("#submit-feedback-btn")) {
        var subBtn = target.closest("#submit-feedback-btn");
        var msgInputEl = document.getElementById("feedback-message-input");
        var contactInputEl = document.getElementById("feedback-contact-input");
        var whOverrideInputEl = document.getElementById("feedback-webhook-url-input");
        var statusBannerEl = document.getElementById("feedback-status-msg");
        var msgVal = msgInputEl ? msgInputEl.value.trim() : "";
        var contactVal = contactInputEl ? contactInputEl.value.trim() : "";
        var whOverrideVal = whOverrideInputEl ? whOverrideInputEl.value.trim() : "";
        var currChFb = getChamberById(state.activeChamberId) || DATA.chambers[0];

        if (!msgVal) {
          if (statusBannerEl) {
            statusBannerEl.removeAttribute("hidden");
            statusBannerEl.className = "feedback-status-banner status-warn";
            statusBannerEl.textContent = "Please write a brief note above before sending.";
          }
          if (msgInputEl) msgInputEl.focus();
          return;
        }

        subBtn.disabled = true;
        var origSubText = subBtn.textContent;
        subBtn.textContent = "Sending...";

        var fbPayload = {
          category: state.feedbackCat,
          message: msgVal,
          contact: contactVal,
          stepId: currChFb.id,
          stepTitle: currChFb.numberLabel + ": " + stripBackticks(currChFb.title),
          webhookOverride: whOverrideVal
        };

        if (window.FOUNDRY_TELEMETRY && typeof window.FOUNDRY_TELEMETRY.sendFeedback === "function") {
          window.FOUNDRY_TELEMETRY.sendFeedback(fbPayload, state).then(function (res) {
            subBtn.disabled = false;
            subBtn.textContent = origSubText;
            if (statusBannerEl) {
              statusBannerEl.removeAttribute("hidden");
              statusBannerEl.className = "feedback-status-banner " + (res && res.ok ? "status-ok" : "status-warn");
              statusBannerEl.textContent = (res && res.reason) || "Feedback recorded.";
            }
            if (msgInputEl) msgInputEl.value = "";
            refreshFeedbackBreadcrumbPreview();
          });
        } else {
          subBtn.disabled = false;
          subBtn.textContent = origSubText;
          if (statusBannerEl) {
            statusBannerEl.removeAttribute("hidden");
            statusBannerEl.className = "feedback-status-banner status-ok";
            statusBannerEl.textContent = "Feedback saved locally.";
          }
        }
        return;
      }

      // 4f. Quick Step Micro-Feedback Strip Buttons (helpful | confusing)
      var qfBtn = target.closest("[data-quick-feedback]");
      if (qfBtn) {
        var qfType = qfBtn.getAttribute("data-quick-feedback") || "helpful";
        var qfCh = getChamberById(state.activeChamberId) || DATA.chambers[0];
        trackTelemetry("step_quick_feedback", {
          stepId: qfCh.id,
          detail: qfType
        });

        if (qfType === "helpful") {
          var origQfHtml = qfBtn.innerHTML;
          qfBtn.classList.add("copied");
          qfBtn.textContent = "✓ Thanks! Logged for " + qfCh.numberLabel;
          setTimeout(function () {
            qfBtn.classList.remove("copied");
            qfBtn.innerHTML = origQfHtml;
          }, 2000);
          if (window.FOUNDRY_TELEMETRY && typeof window.FOUNDRY_TELEMETRY.sendFeedback === "function") {
            window.FOUNDRY_TELEMETRY.sendFeedback({
              category: "helpful",
              rating: "👍 Clear",
              message: "Quick thumbs-up on " + qfCh.numberLabel + " (" + stripBackticks(qfCh.title) + ")",
              stepId: qfCh.id,
              stepTitle: qfCh.numberLabel + ": " + stripBackticks(qfCh.title)
            }, state);
          }
        } else {
          state.feedbackCat = "confusing";
          state.feedbackOpen = true;
          state.tailorOpen = false;
          state.resetOpen = false;
          syncHeaderAndDrawers();
          var fbMsgEl = document.getElementById("feedback-message-input");
          if (fbMsgEl) {
            fbMsgEl.placeholder = "What felt confusing or got in your way on " + qfCh.numberLabel + " (" + stripBackticks(qfCh.title) + ")?";
            fbMsgEl.focus();
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
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
        trackTelemetry("copy_action", { stepId: state.activeChamberId, detail: "reset_cmd", category: "copy" });
        return;
      }

      // 8. Top Bar Segmented Switch & Tailor Drawer: Set OS
      var osBtn = target.closest("[data-set-os]");
      if (osBtn) {
        state.os = osBtn.getAttribute("data-set-os");
        saveState();
        renderAll();
        trackTelemetry("setup_change", { stepId: state.activeChamberId, detail: "os:" + state.os });
        return;
      }

      // 9. Tailor Drawer: Set Persona
      var pBtn = target.closest("[data-set-persona]");
      if (pBtn) {
        state.persona = pBtn.getAttribute("data-set-persona");
        saveState();
        renderAll();
        trackTelemetry("setup_change", { stepId: state.activeChamberId, detail: "persona:" + state.persona });
        return;
      }

      // 10. Tailor Drawer: Set Preferred Action Tab
      var prefTabBtn = target.closest("[data-set-action-tab]");
      if (prefTabBtn) {
        state.actionTab = prefTabBtn.getAttribute("data-set-action-tab");
        saveState();
        renderAll();
        trackTelemetry("setup_change", { stepId: state.activeChamberId, detail: "actionTab:" + state.actionTab });
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
        trackTelemetry("copy_action", { stepId: state.activeChamberId, detail: "stage_" + state.actionTab, category: "copy" });
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
        carouselElapsedMs = 0;
        saveState();
        hideTooltip();
        renderCenterStage();
        trackTelemetry("file_inspect", { stepId: state.activeChamberId, detail: "agents", category: "carousel" });
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
        trackTelemetry("copy_action", { stepId: state.activeChamberId, detail: "ai_drawer", category: "copy" });
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
        trackTelemetry("step_complete", { stepId: cid, detail: state.completed[cid] ? "completed" : "uncompleted" });
        return;
      }

      // 18. Complete & Continue to Next Chamber CTA
      var compNextBtn = target.closest("[data-complete-and-next]");
      if (compNextBtn) {
        var currId = compNextBtn.getAttribute("data-complete-and-next");
        state.completed[currId] = true;
        trackTelemetry("step_complete", { stepId: currId, detail: "complete_and_next" });
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

      // 19a. Companion Carousel Prev / Next Controls
      var compNavBtn = target.closest("[data-companion-nav]");
      if (compNavBtn) {
        var dir = compNavBtn.getAttribute("data-companion-nav");
        var slideIdx = COMPANION_SLIDES.indexOf(state.companionTab);
        if (slideIdx === -1) slideIdx = 0;
        if (dir === "prev") {
          slideIdx = (slideIdx - 1 + COMPANION_SLIDES.length) % COMPANION_SLIDES.length;
        } else {
          slideIdx = (slideIdx + 1) % COMPANION_SLIDES.length;
        }
        state.companionTab = COMPANION_SLIDES[slideIdx];
        carouselElapsedMs = 0;
        saveState();
        hideTooltip();
        renderCompanionPane();
        trackTelemetry("carousel_slide", { stepId: state.activeChamberId, detail: state.companionTab, category: "carousel" });
        return;
      }

      // 19b. Companion Carousel Autoplay Toggle Button
      if (target.closest("#companion-autoplay-btn")) {
        state.companionAutoplay = !state.companionAutoplay;
        carouselElapsedMs = 0;
        saveState();
        hideTooltip();
        renderCompanionPane();
        return;
      }

      // 19. Companion Card Tabs (diagram | files | table)
      var compTabBtn = target.closest("[data-companion-tab]");
      if (compTabBtn) {
        state.companionTab = compTabBtn.getAttribute("data-companion-tab");
        carouselElapsedMs = 0;
        saveState();
        hideTooltip();
        if (document.querySelector(".companion-inline-card")) {
          renderCompanionPane();
        } else {
          renderCenterStage();
        }
        trackTelemetry("carousel_slide", { stepId: state.activeChamberId, detail: state.companionTab, category: "carousel" });
        return;
      }

      // 20. Starter Mod File Subtabs (plugin | csproj | cfg | manifest | agents)
      var filePillBtn = target.closest("[data-inspector-tab]");
      if (filePillBtn) {
        state.inspectorTab = filePillBtn.getAttribute("data-inspector-tab");
        carouselElapsedMs = 0;
        saveState();
        hideTooltip();
        if (document.querySelector(".companion-inline-card")) {
          renderCompanionPane();
        } else {
          renderCenterStage();
        }
        trackTelemetry("file_inspect", { stepId: state.activeChamberId, detail: state.inspectorTab, category: "carousel" });
        return;
      }

      // 21a. Save Single Starter Mod File with Exact Filename
      if (target.closest("#download-inspector-file-btn")) {
        var dlFileBtn = target.closest("#download-inspector-file-btn");
        var singleFileName = getInspectorSingleFileName(state.inspectorTab);
        var cleanContent = getInspectorSingleFileContent(state.inspectorTab);
        triggerBlobDownload(singleFileName, cleanContent, "text/plain;charset=utf-8");
        trackTelemetry("save_single_file", { stepId: state.activeChamberId, detail: singleFileName, category: "download" });
        var origDlHtml = dlFileBtn.innerHTML;
        dlFileBtn.classList.add("copied");
        dlFileBtn.textContent = "✓ Saved " + singleFileName;
        setTimeout(function () {
          dlFileBtn.classList.remove("copied");
          dlFileBtn.innerHTML = origDlHtml;
        }, 1400);
        return;
      }

      // 21b. Download Full Archive Bundle (.zip / .tar.gz) Feedback
      if (target.closest("[data-download-bundle]")) {
        var bundleBtn = target.closest("[data-download-bundle]");
        var bundleFmt = bundleBtn.getAttribute("data-download-bundle") || "zip";
        trackTelemetry("download_bundle", { stepId: state.activeChamberId, detail: bundleFmt, category: "download" });
        var origBundleHtml = bundleBtn.innerHTML;
        bundleBtn.classList.add("copied");
        bundleBtn.textContent = "✓ Downloading...";
        setTimeout(function () {
          bundleBtn.classList.remove("copied");
          bundleBtn.innerHTML = origBundleHtml;
        }, 1400);
        return;
      }

      // 21. Copy Starter Mod File
      if (target.closest("#copy-inspector-file-btn")) {
        var fBtn = target.closest("#copy-inspector-file-btn");
        var fObj = DATA.inspectorFiles[state.inspectorTab] || DATA.inspectorFiles.plugin;
        copyToClipboard(fObj.content, fBtn, "✓ Copied " + fObj.label);
        trackTelemetry("copy_action", { stepId: state.activeChamberId, detail: "file_" + state.inspectorTab, category: "copy" });
        return;
      }

      // 22. Copy NotebookLM Source Script in Step 0 Storyboard Hub
      if (target.closest("#copy-notebooklm-btn")) {
        var nlmBtn = target.closest("#copy-notebooklm-btn");
        var currCh = getChamberById(state.activeChamberId) || DATA.chambers[0];
        var nlmScript = (currCh.storyboard && (currCh.storyboard.notebookLmPrompt || currCh.storyboard.notebookLmScript)) || "";
        copyToClipboard(nlmScript, nlmBtn, "✓ Script Copied");
        trackTelemetry("copy_action", { stepId: state.activeChamberId, detail: "notebooklm_script", category: "copy" });
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
    startCompanionCarouselTimer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
