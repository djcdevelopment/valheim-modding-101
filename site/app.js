/* ==========================================================================
   Viking Mod Foundry — Valheim 1.0.20 (Deep North) Application Controller
   Single-Chamber Stage, Inline Header Drawers (HC-1), Stoplight Verification,
   Synchronized 3-Tab Companion, and 1-Click Self-Tap AI Prompt Capsule.
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "valheim_modding_101_state_v3";
  var DATA = window.WORKBENCH_DATA;

  var STEPPER_LABELS = {
    "0": "0. Start Here",
    "1": "1. Check Setup",
    "2": "2. Build Mod",
    "3": "3. Test In-Game",
    "3.5": "3.5 Fix Crashes",
    "4": "4. Game Hooks",
    "4.5": "4.5 Live Settings",
    "5": "5. Share Mod"
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

  /* ---------- Build 1-Click Self-Tap AI Prompt ---------- */
  function buildSelfTapPrompt(chamberId, preset, userErrorText) {
    var ch = getChamberById(chamberId) || DATA.chambers[0];
    var personaObj = DATA.personas[state.persona] || DATA.personas.P1;
    var osName = state.os === "win" ? "Windows 10/11 (PowerShell)" : "Linux / SteamOS (Bash)";
    var cmd = ch.commands[state.os] || ch.commands.win;

    var taskInstruction = "";
    if (preset === "diagnose") {
      taskInstruction =
        "TASK: I hit an unexpected error or behavior during " + ch.numberLabel + " (" + ch.title + "). " +
        "Analyze my error output below against the Valheim 1.0.20 Ground-Truth Constraints and give me the exact root cause and a 10-second copy-paste fix for " + osName + ".\n\n" +
        "MY TERMINAL / LOGOUTPUT.LOG ERROR:\n" +
        (userErrorText && userErrorText.trim()
          ? userErrorText.trim()
          : "[Paste your compiler error, terminal output, or BepInEx/LogOutput.log snippet here]");
    } else if (preset === "customize") {
      taskInstruction =
        "TASK: I have completed " + ch.numberLabel + " (" + ch.title + ") and want to customize `HelloValheimPlugin.cs` for my own mod idea. " +
        "Show me the cleanest C# code changes while strictly obeying all Valheim 1.0.20 signature rules and `<Private>false</Private>` build constraints.";
    } else {
      taskInstruction =
        "TASK: Explain what is happening in " + ch.numberLabel + " (" + ch.title + ") tailored to my background (" + personaObj.title + "), " +
        "and tell me how to verify everything is working on " + osName + " before I move to the next step.";
    }

    return (
      "You are an expert Valheim 1.0.20 (Deep North) BepInEx 5.4.2202 & HarmonyX modding mentor.\n\n" +
      "=== MY ACTIVE WORKBENCH LOADOUT ===\n" +
      "• Operating System: " + osName + "\n" +
      "• My Background Persona: " + personaObj.title + "\n" +
      "• Current Step: " + ch.numberLabel + " — " + ch.title + "\n" +
      "• Step Context: " + ch.aiContext + "\n\n" +
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
    var osSummary = state.os === "win" ? "Windows (PowerShell)" : "Linux (Bash)";
    var personaClean = String(personaObj.shortLabel || "Cross-Game Modder").replace(/^[^A-Za-z0-9]+/, "");

    var summaryTextEl = document.getElementById("loadout-summary-text");
    if (summaryTextEl) {
      summaryTextEl.textContent = osSummary + " · " + personaClean;
    }

    var themeBtn = document.getElementById("toggle-theme-btn");
    if (themeBtn) {
      themeBtn.textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
    }

    // Tailor Drawer
    var tailorDrawer = document.getElementById("tailor-drawer");
    var tailorBtn = document.getElementById("toggle-tailor-btn");
    if (tailorDrawer && tailorBtn) {
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

    // Reset Drawer
    var doneCount = 0;
    for (var cIdx = 0; cIdx < DATA.chambers.length; cIdx++) {
      if (state.completed[DATA.chambers[cIdx].id]) doneCount++;
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

    // Sync active option buttons inside #tailor-drawer
    var osBtns = document.querySelectorAll("[data-set-os]");
    for (var i = 0; i < osBtns.length; i++) {
      var isOs = osBtns[i].getAttribute("data-set-os") === state.os;
      osBtns[i].classList.toggle("active", isOs);
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

  /* ---------- Render Horizontal 8-Step Progress Bar ---------- */
  function renderStepperBar() {
    var trackEl = document.getElementById("stepper-track");
    var metaEl = document.getElementById("stepper-meta");
    if (!trackEl || !metaEl) return;

    var doneCount = 0;
    var html = "";

    for (var i = 0; i < DATA.chambers.length; i++) {
      var ch = DATA.chambers[i];
      var isCurr = state.activeChamberId === ch.id;
      var isDone = !!state.completed[ch.id];
      if (isDone) doneCount++;

      var shortLabel = STEPPER_LABELS[ch.id] || (ch.id + ". " + ch.shortTitle);
      var stepTooltip = ch.numberLabel + " (" + ch.minutes + " min) — " + stripBackticks(ch.title) + (isDone ? " [Completed ✓]" : "");

      html +=
        '<button type="button" class="stepper-node' +
        (isCurr ? " active" : "") +
        (isDone ? " completed" : "") +
        '" data-goto-chamber="' + escapeHtml(ch.id) + '"' +
        ' data-tooltip="' + escapeHtml(stepTooltip) + '"' +
        (isCurr ? ' aria-current="step"' : "") +
        ">" +
          "<span>" + escapeHtml(shortLabel) + "</span>" +
          (isDone ? '<span class="step-check">✓</span>' : "") +
        "</button>";
    }

    trackEl.innerHTML = html;
    metaEl.textContent = "DONE: " + doneCount + " / " + DATA.chambers.length + " · PART 1: 15 MIN";
    metaEl.setAttribute("data-tooltip", "Your step checkmarks are saved in this browser. Part 1 (Steps 0–3) takes about 15 minutes.");
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
    var cmdText = ch.commands[state.os] || ch.commands.win;
    var outText = ch.expectedOutput[state.os] || ch.expectedOutput.win;

    var activeCodeText = cmdText;
    if (state.actionTab === "code") {
      activeCodeText = ch.codeSnippet;
    } else if (state.actionTab === "ai") {
      activeCodeText = ch.agentTask;
    }

    var liftShort = /Medium|Intermediate/i.test(ch.liftBadge) ? "INTERMEDIATE" : "EASY";
    var kickerText =
      "PART " + ch.sprint +
      " · STEP " + (idx + 1) + " OF " + DATA.chambers.length +
      " · " + ch.minutes + " MIN · " + liftShort;

    var html = "";

    // 1. Kicker Row
    html +=
      '<div class="chamber-kicker-row">' +
        '<span class="chamber-kicker">' + escapeHtml(kickerText) + "</span>" +
        (ch.safeStop ? '<span class="checkpoint-pill" data-tooltip="Your mod is in a working state here—safe to take a break or stop for today.">🟢 GOOD PLACE TO PAUSE</span>' : "") +
      "</div>";

    // 2. Chamber H1
    html +=
      '<h1 class="chamber-h1">' +
        escapeHtml(ch.numberLabel + ": " + ch.title) +
      "</h1>";

    // 3. Chamber Lead Summary
    html +=
      '<p class="chamber-lead">' +
        formatInlineMarkup(ch.summary) +
      "</p>";

    // 4. Persona Inline Note
    html +=
      '<div class="persona-inline-note">' +
        "<strong>Tailored for " + escapeHtml(personaObj.shortLabel) + ":</strong> " +
        formatInlineMarkup(personaNote) +
        ' <a href="#tailor-drawer" data-open-tailor="1" data-tooltip="Open the setup drawer to switch Windows/Linux or your background">[Change Setup ▾]</a>' +
      "</div>";

    // 5. Ordered Step List
    html += '<ol class="step-list">';
    for (var s = 0; s < ch.steps.length; s++) {
      html +=
        '<li class="step-list-item">' +
          '<span class="step-num">' + (s + 1) + "</span>" +
          '<div class="step-text">' + formatInlineMarkup(ch.steps[s]) + "</div>" +
        "</li>";
    }
    html += "</ol>";

    // 6. Single Tabbed Action Box
    html +=
      '<div class="action-box">' +
        '<div class="action-box-bar">' +
          '<div class="action-tabs">' +
            '<button type="button" class="action-tab' + (state.actionTab === "cli" ? " active" : "") + '" data-action-tab="cli" data-tooltip="Show the terminal command to run in ' + escapeHtml(osShort) + ' for this step.">Terminal (Bash/PowerShell)</button>' +
            '<button type="button" class="action-tab' + (state.actionTab === "code" ? " active" : "") + '" data-action-tab="code" data-tooltip="Show the C# code or config file used in this step.">C# / Code</button>' +
            '<button type="button" class="action-tab' + (state.actionTab === "ai" ? " active" : "") + '" data-action-tab="ai" data-tooltip="Show a short instruction you can give to Claude Code, Cursor, or Copilot.">AI Task</button>' +
          "</div>" +
          '<div class="action-box-tools">' +
            '<button type="button" class="btn-action-tool" id="stage-copy-active-btn" data-tooltip="Copy the code or command shown in the box below.">Copy</button>' +
            '<button type="button" class="btn-action-tool" id="stage-toggle-ai-drawer-btn" aria-expanded="' + (state.aiDrawerOpen ? "true" : "false") + '" data-tooltip="Open a ready-to-copy prompt for free ChatGPT, Claude, or Cursor that includes this step and Valheim 1.0.20 rules.">💬 Ask AI for Help ▾</button>' +
          "</div>" +
        "</div>" +
        "<pre><code>" + escapeHtml(activeCodeText) + "</code></pre>" +
      "</div>";

    // 7. Inline Self-Tap AI Prompt Drawer (Hidden by default)
    html +=
      '<div class="ai-inline-drawer" id="chamber-ai-drawer"' + (state.aiDrawerOpen ? "" : " hidden") + ">" +
        '<div class="ai-drawer-top">' +
          '<span class="ai-drawer-title">AI Helper Prompt (Includes This Step &amp; Valheim 1.0.20 Rules)</span>' +
          '<button type="button" class="btn-action-tool" id="drawer-copy-ai-prompt-btn" data-tooltip="Copy this complete prompt to paste into ChatGPT, Claude, or Cursor.">Copy Prompt</button>' +
        "</div>" +
        '<p class="diagram-caption" style="margin:0;"><strong>How to use:</strong> 1. Pick a question below → 2. Click <strong>Copy Prompt</strong> → 3. Paste into free ChatGPT, Claude, or Cursor.</p>' +
        '<div class="ai-preset-row">' +
          '<button type="button" class="ai-preset-pill' + (state.aiPreset === "explain" ? " active" : "") + '" data-ai-preset="explain" data-tooltip="Generate a prompt asking AI to explain this step in plain English for your setup.">Explain This Step</button>' +
          '<button type="button" class="ai-preset-pill' + (state.aiPreset === "diagnose" ? " active" : "") + '" data-ai-preset="diagnose" data-tooltip="Paste any terminal or LogOutput.log error and generate a troubleshooting prompt.">Diagnose My Error</button>' +
          '<button type="button" class="ai-preset-pill' + (state.aiPreset === "customize" ? " active" : "") + '" data-ai-preset="customize" data-tooltip="Generate a prompt asking AI to help you modify this step\'s C# code for your own mod idea.">Customize Mod</button>' +
        "</div>" +
        (state.aiPreset === "diagnose"
          ? '<textarea id="ai-error-textarea" class="ai-error-input" placeholder="Paste your terminal error or BepInEx/LogOutput.log snippet here...">' + escapeHtml(state.aiUserError) + "</textarea>"
          : "") +
        '<pre><code id="ai-prompt-preview-code">' + escapeHtml(buildSelfTapPrompt(ch.id, state.aiPreset, state.aiUserError)) + "</code></pre>" +
      "</div>";

    // 8. Stoplight Verification Stack (Yield -> Go -> Stop)
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
            '<div><strong>Need help?</strong> <a href="#chamber-ai-drawer" data-open-ai-diagnose="1" data-tooltip="Open the AI helper above to diagnose your error">[💬 Ask AI to diagnose your error ▾]</a> · <a href="#reset-drawer" data-open-reset="1" data-tooltip="See the 1-line command to uninstall the mod">[🛡️ Uninstall mod ▾]</a></div>' +
          "</div>" +
        "</details>" +
      "</div>";

    // 9. Chamber Footer Navigation
    var leftFooterBtn = prevChamber
      ? '<button type="button" class="btn-nav-prev" data-goto-chamber="' + escapeHtml(prevChamber.id) + '" data-tooltip="Go back to ' + escapeHtml(prevChamber.numberLabel + " (" + stripBackticks(prevChamber.title) + ")") + '">← Previous: ' + escapeHtml(prevChamber.numberLabel) + "</button>"
      : '<button type="button" class="btn-nav-prev" data-toggle-complete-btn="' + escapeHtml(ch.id) + '" data-tooltip="Mark or unmark this step as completed.">' + (isDone ? "✓ Completed " + escapeHtml(ch.numberLabel) : "Mark Complete") + "</button>";

    var rightFooterBtn = nextChamber
      ? '<button type="button" class="btn-nav-next-go" data-complete-and-next="' + escapeHtml(ch.id) + '" data-tooltip="Mark this step done and continue to ' + escapeHtml(nextChamber.numberLabel + " (" + stripBackticks(nextChamber.title) + ")") + '">🟢 Complete &amp; Continue to ' + escapeHtml(nextChamber.numberLabel) + " →</button>"
      : '<button type="button" class="btn-nav-next-go" data-complete-and-next="' + escapeHtml(ch.id) + '" data-tooltip="Mark the final step done and complete the guide!">' + (isDone ? "🟢 All 8 Steps Completed ✓" : "🟢 Complete " + escapeHtml(ch.numberLabel) + " &amp; Finish ✓") + "</button>";

    html +=
      '<footer class="chamber-footer-nav">' +
        leftFooterBtn +
        rightFooterBtn +
      "</footer>";

    stageEl.innerHTML = html;
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

  /* ---------- Render Right Sticky Companion Card (#companion-pane) ---------- */
  function renderCompanionPane() {
    var compEl = document.getElementById("companion-pane");
    if (!compEl) return;

    var ch = getChamberById(state.activeChamberId) || DATA.chambers[0];
    var fileObj = DATA.inspectorFiles[state.inspectorTab] || DATA.inspectorFiles.plugin;

    var html =
      '<div class="companion-header">' +
        '<div class="companion-tabs" role="tablist" aria-label="Companion Views">' +
          '<button type="button" class="companion-tab' + (state.companionTab === "diagram" ? " active" : "") + '" data-companion-tab="diagram" data-tooltip="Interactive diagram for this step. Hover over any box inside the map to see what it does!">Visual Map</button>' +
          '<button type="button" class="companion-tab' + (state.companionTab === "files" ? " active" : "") + '" data-companion-tab="files" data-tooltip="View and copy the working files in starter-mod/ (HelloValheimPlugin.cs, HelloValheim.csproj, .cfg, and manifest.json).">Starter Mod Files</button>' +
          '<button type="button" class="companion-tab' + (state.companionTab === "table" ? " active" : "") + '" data-companion-tab="table" data-tooltip="Quick-reference cheat sheet and comparison table for this step.">Reference Table</button>' +
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
        { key: "manifest", label: "manifest.json", tip: "Thunderstore & r2modman package file with your mod name, version, and dependencies." }
      ];
      html += '<div class="file-subtabs"><div class="file-subtab-group">';
      for (var i = 0; i < filePills.length; i++) {
        var fp = filePills[i];
        html +=
          '<button type="button" class="file-pill' + (state.inspectorTab === fp.key ? " active" : "") + '" data-inspector-tab="' + fp.key + '" data-tooltip="' + escapeHtml(fp.tip) + '">' +
            escapeHtml(fp.label) +
          "</button>";
      }
      html +=
        "</div>" +
        '<button type="button" class="btn-action-tool" id="copy-inspector-file-btn" data-tooltip="Copy the full contents of this starter-mod file to your clipboard.">Copy File</button>' +
        "</div>" +
        '<p class="diagram-caption">' + escapeHtml(ch.inspectorHighlightNote) + "</p>" +
        '<div class="inspector-code-scroll"><pre><code>' + escapeHtml(fileObj.content) + "</code></pre></div>";
    } else {
      var hasCustomTable = ch.tableHtml && ch.tableHtml.trim().length > 0;
      html +=
        '<div class="ai-drawer-title">' +
          escapeHtml(hasCustomTable ? (ch.numberLabel + " Reference Table") : "What Comes Next: 5-Part Valheim Modding Series") +
        "</div>" +
        (hasCustomTable ? ch.tableHtml : buildSeriesReferenceTableHtml());
    }

    compEl.innerHTML = html;
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
    document.addEventListener("mouseover", function (ev) {
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
      if (target && target.matches && target.matches(":focus-visible")) {
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

      // 3c. Open Stage AI Drawer in Diagnose Mode ([💬 Ask AI to diagnose your error ▾])
      if (target.closest("[data-open-ai-diagnose]")) {
        ev.preventDefault();
        state.aiDrawerOpen = true;
        state.aiPreset = "diagnose";
        renderCenterStage();
        var aiDrawerEl = document.getElementById("chamber-ai-drawer");
        if (aiDrawerEl && aiDrawerEl.scrollIntoView) {
          aiDrawerEl.scrollIntoView({ behavior: "smooth", block: "center" });
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

      // 8. Tailor Drawer: Set OS
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

      // 12. Copy Active Stage Action Code
      if (target.closest("#stage-copy-active-btn")) {
        var cBtn = target.closest("#stage-copy-active-btn");
        var ch = getChamberById(state.activeChamberId) || DATA.chambers[0];
        var txt = ch.commands[state.os] || ch.commands.win;
        if (state.actionTab === "code") txt = ch.codeSnippet;
        else if (state.actionTab === "ai") txt = ch.agentTask;
        copyToClipboard(txt, cBtn, "✓ Copied");
        return;
      }

      // 13. Toggle Inline Self-Tap AI Drawer in Stage
      if (target.closest("#stage-toggle-ai-drawer-btn")) {
        state.aiDrawerOpen = !state.aiDrawerOpen;
        hideTooltip();
        renderCenterStage();
        return;
      }

      // 14. Switch AI Preset Pill inside Inline AI Drawer
      var presetBtn = target.closest("[data-ai-preset]");
      if (presetBtn) {
        state.aiPreset = presetBtn.getAttribute("data-ai-preset");
        hideTooltip();
        renderCenterStage();
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
        renderCompanionPane();
        return;
      }

      // 20. Starter Mod File Subtabs (plugin | csproj | cfg | manifest)
      var filePillBtn = target.closest("[data-inspector-tab]");
      if (filePillBtn) {
        state.inspectorTab = filePillBtn.getAttribute("data-inspector-tab");
        saveState();
        hideTooltip();
        renderCompanionPane();
        return;
      }

      // 21. Copy Starter Mod File
      if (target.closest("#copy-inspector-file-btn")) {
        var fBtn = target.closest("#copy-inspector-file-btn");
        var fObj = DATA.inspectorFiles[state.inspectorTab] || DATA.inspectorFiles.plugin;
        copyToClipboard(fObj.content, fBtn, "✓ Copied " + fObj.label);
        return;
      }
    });

    // Live Error Textarea Input Delegation
    document.addEventListener("input", function (ev) {
      if (ev.target && ev.target.id === "ai-error-textarea") {
        state.aiUserError = ev.target.value;
        var previewEl = document.getElementById("ai-prompt-preview-code");
        if (previewEl) {
          previewEl.textContent = buildSelfTapPrompt(state.activeChamberId, state.aiPreset, state.aiUserError);
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
