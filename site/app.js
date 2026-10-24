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
    "0": "0. Overview",
    "1": "1. Doctor",
    "2": "2. Compile",
    "3": "3. In-Game",
    "3.5": "3.5 Debug",
    "4": "4. Harmony",
    "4.5": "4.5 Config",
    "5": "5. Ship"
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
    var resetDrawer = document.getElementById("reset-drawer");
    var resetBtn = document.getElementById("toggle-reset-drawer-btn");
    if (resetDrawer && resetBtn) {
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

    var resetOsLabel = document.getElementById("reset-drawer-os-label");
    var resetCmdCode = document.getElementById("reset-drawer-cmd-code");
    if (resetOsLabel && resetCmdCode) {
      if (state.os === "win") {
        resetOsLabel.textContent = "Windows 10/11 (PowerShell) — 1-Second Vanilla Reset";
        resetCmdCode.textContent = "powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1 -Reset";
      } else {
        resetOsLabel.textContent = "Linux / SteamOS (Bash) — 1-Second Vanilla Reset";
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

      html +=
        '<button type="button" class="stepper-node' +
        (isCurr ? " active" : "") +
        (isDone ? " completed" : "") +
        '" data-goto-chamber="' + escapeHtml(ch.id) + '"' +
        (isCurr ? ' aria-current="step"' : "") +
        ">" +
          "<span>" + escapeHtml(shortLabel) + "</span>" +
          (isDone ? '<span class="step-check">✓</span>' : "") +
        "</button>";
    }

    trackEl.innerHTML = html;
    metaEl.textContent = "COMPLETED: " + doneCount + " / " + DATA.chambers.length + " · SPRINT 1: 14M";
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

    var liftShort = /Medium/i.test(ch.liftBadge) ? "MEDIUM LIFT" : "LOW LIFT";
    var kickerText =
      "SPRINT " + ch.sprint +
      " · CHAMBER " + (idx + 1) + " OF " + DATA.chambers.length +
      " · " + ch.minutes + " MINS · " + liftShort;

    var html = "";

    // 1. Kicker Row
    html +=
      '<div class="chamber-kicker-row">' +
        '<span class="chamber-kicker">' + escapeHtml(kickerText) + "</span>" +
        (ch.safeStop ? '<span class="checkpoint-pill">🟢 SAFE CHECKPOINT</span>' : "") +
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
        ' <a href="#tailor-drawer" data-open-tailor="1">[Change Setup ▾]</a>' +
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
            '<button type="button" class="action-tab' + (state.actionTab === "cli" ? " active" : "") + '" data-action-tab="cli">Terminal (' + escapeHtml(osShort) + ")</button>" +
            '<button type="button" class="action-tab' + (state.actionTab === "code" ? " active" : "") + '" data-action-tab="code">C# Hook</button>' +
            '<button type="button" class="action-tab' + (state.actionTab === "ai" ? " active" : "") + '" data-action-tab="ai">CLI Agent Prompt</button>' +
          "</div>" +
          '<div class="action-box-tools">' +
            '<button type="button" class="btn-action-tool" id="stage-copy-active-btn">Copy</button>' +
            '<button type="button" class="btn-action-tool" id="stage-toggle-ai-drawer-btn" aria-expanded="' + (state.aiDrawerOpen ? "true" : "false") + '">Ask AI / Self-Tap ▾</button>' +
          "</div>" +
        "</div>" +
        "<pre><code>" + escapeHtml(activeCodeText) + "</code></pre>" +
      "</div>";

    // 7. Inline Self-Tap AI Prompt Drawer (Hidden by default)
    html +=
      '<div class="ai-inline-drawer" id="chamber-ai-drawer"' + (state.aiDrawerOpen ? "" : " hidden") + ">" +
        '<div class="ai-drawer-top">' +
          '<span class="ai-drawer-title">Self-Tap AI Prompt Capsule (Pinned 1.0.20 Ground Truth)</span>' +
          '<button type="button" class="btn-action-tool" id="drawer-copy-ai-prompt-btn">Copy AI Prompt</button>' +
        "</div>" +
        '<div class="ai-preset-row">' +
          '<button type="button" class="ai-preset-pill' + (state.aiPreset === "explain" ? " active" : "") + '" data-ai-preset="explain">Explain This Step</button>' +
          '<button type="button" class="ai-preset-pill' + (state.aiPreset === "diagnose" ? " active" : "") + '" data-ai-preset="diagnose">Diagnose My Error</button>' +
          '<button type="button" class="ai-preset-pill' + (state.aiPreset === "customize" ? " active" : "") + '" data-ai-preset="customize">Customize Hook</button>' +
        "</div>" +
        (state.aiPreset === "diagnose"
          ? '<textarea id="ai-error-textarea" class="ai-error-input" placeholder="Paste compiler error, PowerShell/Bash output, or BepInEx/LogOutput.log snippet...">' + escapeHtml(state.aiUserError) + "</textarea>"
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
          '<div class="stoplight-header">🟡 YIELD — CHECK BEFORE CONTINUING</div>' +
          '<div class="stoplight-body">' + yieldBodyHtml + "</div>" +
        "</div>" +
        '<div class="stoplight-card stoplight-go">' +
          '<div class="stoplight-header">🟢 GO — HOW YOU KNOW IT WORKED</div>' +
          '<div class="stoplight-body">' + formatInlineMarkup(ch.onTrack) + "</div>" +
          "<pre><code>" + escapeHtml(outText) + "</code></pre>" +
        "</div>" +
        '<details class="stoplight-card stoplight-stop">' +
          "<summary>" +
            "<span>🔴 STOP — IF SOMETHING GOES WRONG: " + escapeHtml(stripBackticks(ch.cliffEdge.symptom)) + "</span>" +
            "<span>Show 10s Fix ▾</span>" +
          "</summary>" +
          '<div class="stoplight-stop-content">' +
            "<div><strong>Why it happens:</strong> " + formatInlineMarkup(whyText) + "</div>" +
            "<div><strong>10-Second Fix:</strong> " + formatInlineMarkup(ch.cliffEdge.fix) + "</div>" +
          "</div>" +
        "</details>" +
      "</div>";

    // 9. Chamber Footer Navigation
    var leftFooterBtn = prevChamber
      ? '<button type="button" class="btn-nav-prev" data-goto-chamber="' + escapeHtml(prevChamber.id) + '">← Previous: ' + escapeHtml(prevChamber.numberLabel) + "</button>"
      : '<button type="button" class="btn-nav-prev" data-toggle-complete-btn="' + escapeHtml(ch.id) + '">' + (isDone ? "✓ Completed " + escapeHtml(ch.numberLabel) : "Mark Complete") + "</button>";

    var rightFooterBtn = nextChamber
      ? '<button type="button" class="btn-nav-next-go" data-complete-and-next="' + escapeHtml(ch.id) + '">🟢 Complete &amp; Continue to ' + escapeHtml(nextChamber.numberLabel) + " →</button>"
      : '<button type="button" class="btn-nav-next-go" data-complete-and-next="' + escapeHtml(ch.id) + '">' + (isDone ? "🟢 All 8 Chambers Completed ✓" : "🟢 Complete " + escapeHtml(ch.numberLabel) + " &amp; Finish ✓") + "</button>";

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
          '<button type="button" class="companion-tab' + (state.companionTab === "diagram" ? " active" : "") + '" data-companion-tab="diagram">Visual Map</button>' +
          '<button type="button" class="companion-tab' + (state.companionTab === "files" ? " active" : "") + '" data-companion-tab="files">Starter Mod Files</button>' +
          '<button type="button" class="companion-tab' + (state.companionTab === "table" ? " active" : "") + '" data-companion-tab="table">Reference Table</button>' +
        "</div>" +
      "</div>";

    if (state.companionTab === "diagram") {
      html +=
        '<div class="ai-drawer-title">' + escapeHtml(ch.diagramTitle) + "</div>" +
        '<div class="diagram-stage">' + ch.svgDiagram + "</div>" +
        '<p class="diagram-caption">' + escapeHtml(ch.diagramCaption) + "</p>";
    } else if (state.companionTab === "files") {
      var filePills = [
        { key: "plugin", label: "HelloValheimPlugin.cs" },
        { key: "csproj", label: "HelloValheim.csproj" },
        { key: "cfg", label: ".cfg" },
        { key: "manifest", label: "manifest.json" }
      ];
      html += '<div class="file-subtabs"><div class="file-subtab-group">';
      for (var i = 0; i < filePills.length; i++) {
        var fp = filePills[i];
        html +=
          '<button type="button" class="file-pill' + (state.inspectorTab === fp.key ? " active" : "") + '" data-inspector-tab="' + fp.key + '">' +
            escapeHtml(fp.label) +
          "</button>";
      }
      html +=
        "</div>" +
        '<button type="button" class="btn-action-tool" id="copy-inspector-file-btn">Copy File</button>' +
        "</div>" +
        '<p class="diagram-caption">' + escapeHtml(ch.inspectorHighlightNote) + "</p>" +
        '<div class="inspector-code-scroll"><pre><code>' + escapeHtml(fileObj.content) + "</code></pre></div>";
    } else {
      var hasCustomTable = ch.tableHtml && ch.tableHtml.trim().length > 0;
      html +=
        '<div class="ai-drawer-title">' +
          escapeHtml(hasCustomTable ? (ch.numberLabel + " Reference Matrix") : "Behind the Curtain: 5-Part Engineering Series") +
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

  /* ---------- Full Re-Render ---------- */
  function renderAll() {
    syncHeaderAndDrawers();
    renderStepperBar();
    renderCenterStage();
    renderCompanionPane();
  }

  /* ---------- Event Delegation & Keyboard Shortcuts ---------- */
  function bindEvents() {
    document.addEventListener("click", function (ev) {
      var target = ev.target;
      if (!target) return;

      // 1. Toggle Tailor Drawer
      if (target.closest("#toggle-tailor-btn")) {
        state.tailorOpen = !state.tailorOpen;
        if (state.tailorOpen) state.resetOpen = false;
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
        if (state.resetOpen) state.tailorOpen = false;
        syncHeaderAndDrawers();
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

      // 6. Header 1-Click Copy AI Prompt
      if (target.closest("#header-copy-ai-btn")) {
        var hBtn = target.closest("#header-copy-ai-btn");
        var promptText = buildSelfTapPrompt(state.activeChamberId, state.aiPreset, state.aiUserError);
        copyToClipboard(promptText, hBtn, "✓ Prompt Copied");
        return;
      }

      // 7. Copy Reset Command in Reset Drawer
      if (target.closest("#copy-reset-cmd-btn")) {
        var rBtn = target.closest("#copy-reset-cmd-btn");
        var resetCmd = state.os === "win"
          ? "powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1 -Reset"
          : "bash ./tools/build-and-deploy.sh --reset";
        copyToClipboard(resetCmd, rBtn, "✓ Reset Copied");
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
        renderCenterStage();
        return;
      }

      // 14. Switch AI Preset Pill inside Inline AI Drawer
      var presetBtn = target.closest("[data-ai-preset]");
      if (presetBtn) {
        state.aiPreset = presetBtn.getAttribute("data-ai-preset");
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
        renderCompanionPane();
        return;
      }

      // 20. Starter Mod File Subtabs (plugin | csproj | cfg | manifest)
      var filePillBtn = target.closest("[data-inspector-tab]");
      if (filePillBtn) {
        state.inspectorTab = filePillBtn.getAttribute("data-inspector-tab");
        saveState();
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

    // Keyboard Shortcuts ([ / ] for prev/next chamber)
    document.addEventListener("keydown", function (ev) {
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
