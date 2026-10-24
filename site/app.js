/* ==========================================================================
   Valheim 1.0.20 Interactive Modding Workbench — Application Controller
   Synchronizes OS, Persona, Traction Mode, Prosumer Layout, Sightline,
   Battery Meter, and 1-Click Self-Tap AI Prompt Generator.
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "valheim_modding_101_state_v2";
  var DATA = window.WORKBENCH_DATA;

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
    os: detectDefaultOS(), // 'win' | 'linux'
    persona: "P1",         // 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
    traction: "all",       // 'all' | 'cli' | 'visual' | 'ai'
    layout: "auto",        // 'auto' | 'ultrawide' | 'halfsnap' | 'reading'
    theme: "dark",         // 'dark' | 'light'
    activeChamberId: "0",  // '0' | '1' | '2' | '3' | '3.5' | '4' | '4.5' | '5'
    inspectorTab: "plugin",// 'plugin' | 'csproj' | 'cfg' | 'manifest'
    completed: {},         // { [chamberId]: true }
    aiPreset: "explain",   // 'explain' | 'diagnose' | 'customize'
    aiUserError: ""
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.os === "win" || parsed.os === "linux") state.os = parsed.os;
        if (DATA.personas[parsed.persona]) state.persona = parsed.persona;
        if (["all", "cli", "visual", "ai"].indexOf(parsed.traction) !== -1) state.traction = parsed.traction;
        if (["auto", "ultrawide", "halfsnap", "reading"].indexOf(parsed.layout) !== -1) state.layout = parsed.layout;
        if (parsed.theme === "dark" || parsed.theme === "light") state.theme = parsed.theme;
        if (getChamberById(parsed.activeChamberId)) state.activeChamberId = parsed.activeChamberId;
        if (DATA.inspectorFiles[parsed.inspectorTab]) state.inspectorTab = parsed.inspectorTab;
        if (parsed.completed && typeof parsed.completed === "object") state.completed = parsed.completed;
      }
    } catch (e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        os: state.os,
        persona: state.persona,
        traction: state.traction,
        layout: state.layout,
        theme: state.theme,
        activeChamberId: state.activeChamberId,
        inspectorTab: state.inspectorTab,
        completed: state.completed
      }));
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

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function copyToClipboard(text, btnEl, copiedLabel) {
    var label = copiedLabel || "✔ Copied!";
    var origHtml = btnEl ? btnEl.innerHTML : "";
    function showFeedback() {
      if (!btnEl) return;
      btnEl.classList.add("copied");
      btnEl.innerHTML = label;
      setTimeout(function () {
        btnEl.classList.remove("copied");
        btnEl.innerHTML = origHtml;
      }, 1800);
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

  /* ---------- Apply Theme & Layout Attributes ---------- */
  function applyBodyAttributes() {
    document.body.setAttribute("data-theme", state.theme);
    document.body.setAttribute("data-os", state.os);
    document.body.setAttribute("data-persona", state.persona);
    document.body.setAttribute("data-traction", state.traction);
    if (state.layout === "auto") {
      document.body.removeAttribute("data-layout");
    } else {
      document.body.setAttribute("data-layout", state.layout);
    }
  }

  /* ---------- Render Top Loadout Bar Active Pills ---------- */
  function syncLoadoutBar() {
    var buttons = document.querySelectorAll("[data-control][data-value]");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var ctrl = btn.getAttribute("data-control");
      var val = btn.getAttribute("data-value");
      var isActive = state[ctrl] === val;
      if (isActive) {
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      }
    }

    // Update Compact Chamber Strip (used in 50% Half-Snap and Reading modes)
    var stripEl = document.getElementById("compact-chamber-strip");
    if (stripEl) {
      var html = "";
      for (var j = 0; j < DATA.chambers.length; j++) {
        var ch = DATA.chambers[j];
        var isDone = !!state.completed[ch.id];
        var isCurr = state.activeChamberId === ch.id;
        html +=
          '<button type="button" class="compact-chamber-pill' +
          (isCurr ? " active" : "") +
          (isDone ? " completed" : "") +
          '" data-goto-chamber="' + escapeHtml(ch.id) + '">' +
          (isDone ? '<span class="check-dot">✔</span>' : "") +
          "<span>" + escapeHtml(ch.numberLabel) + ": " + escapeHtml(ch.shortTitle) + "</span>" +
          "</button>";
      }
      stripEl.innerHTML = html;
    }
  }

  /* ---------- Render Left Mission Rail ---------- */
  function renderLeftRail() {
    var railEl = document.getElementById("left-rail");
    if (!railEl) return;

    var totalChambers = DATA.chambers.length;
    var doneCount = 0;
    var sprint1Remaining = 0;
    var sprint2Remaining = 0;

    for (var i = 0; i < DATA.chambers.length; i++) {
      var c = DATA.chambers[i];
      if (state.completed[c.id]) {
        doneCount++;
      } else {
        if (c.sprint === 1) sprint1Remaining += c.minutes;
        else sprint2Remaining += c.minutes;
      }
    }

    var pct = Math.round((doneCount / totalChambers) * 100);

    var html = "";

    // 1. Tonight's Energy & Time Meter
    html +=
      '<div class="rail-card">' +
        '<div class="rail-section-title">' +
          '<span>⚡ Tonight\'s Energy &amp; Time Meter</span>' +
          '<span>' + doneCount + "/" + totalChambers + " Done</span>" +
        "</div>" +
        '<div class="battery-meter-box">' +
          '<div class="battery-header">' +
            '<span>Sprint 1 Left: <strong>' + sprint1Remaining + 'm</strong></span>' +
            '<span>Sprint 2 Left: <strong>' + sprint2Remaining + 'm</strong></span>' +
          "</div>" +
          '<div class="battery-bar-track">' +
            '<div class="battery-bar-fill" style="width:' + pct + '%"></div>' +
          "</div>" +
          '<div class="battery-meta">' +
            '<span>🛑 3 Safe Stopping Points</span>' +
            '<span>' + pct + '% Complete</span>' +
          "</div>" +
        "</div>" +
        '<button type="button" class="btn-reset-header" style="width:100%;justify-content:center;" id="rail-open-reset-btn">' +
          "↩️ 1-Click Emergency Reset to Vanilla" +
        "</button>" +
      "</div>";

    // 2. Sprint 1 & Sprint 2 Chamber Navigation
    html += '<div class="rail-card">';
    var sprints = [
      { num: 1, title: "Sprint 1 · First Safe Win", time: "14 mins" },
      { num: 2, title: "Sprint 2 · Real Engineering", time: "31 mins" }
    ];

    for (var s = 0; s < sprints.length; s++) {
      var sp = sprints[s];
      html +=
        '<div class="sprint-group">' +
          '<div class="sprint-header">' +
            "<span>" + escapeHtml(sp.title) + "</span>" +
            '<span class="sprint-time">' + escapeHtml(sp.time) + "</span>" +
          "</div>" +
          '<ul class="rail-nav-list">';

      for (var k = 0; k < DATA.chambers.length; k++) {
        var ch = DATA.chambers[k];
        if (ch.sprint !== sp.num) continue;
        var isCurr = state.activeChamberId === ch.id;
        var isDone = !!state.completed[ch.id];

        html +=
          '<li class="rail-step-item' + (isCurr ? " active" : "") + (isDone ? " completed" : "") + '" data-goto-chamber="' + escapeHtml(ch.id) + '">' +
            '<input type="checkbox" class="rail-step-check" data-toggle-complete="' + escapeHtml(ch.id) + '" ' + (isDone ? "checked" : "") + ' title="Mark ' + escapeHtml(ch.numberLabel) + ' complete" />' +
            '<div class="rail-step-body">' +
              '<div class="rail-step-top">' +
                '<span class="rail-step-num">' + escapeHtml(ch.numberLabel) + "</span>" +
                '<span class="rail-step-time">' + escapeHtml(ch.timeBadge) + "</span>" +
              "</div>" +
              '<div class="rail-step-title">' + escapeHtml(ch.shortTitle) + "</div>" +
              (ch.safeStop ? '<span class="rail-safe-stop-badge">' + escapeHtml(ch.safeStop) + "</span>" : "") +
            "</div>" +
          "</li>";
      }

      html += "</ul></div>";
    }
    html += "</div>";

    // 3. Behind the Curtain: 5-Part Advanced Series Teaser
    html +=
      '<div class="series-teaser-card">' +
        "<h4>🔭 Behind the Curtain: 5-Part Series</h4>" +
        "<p>Once you finish Chamber 5, explore our advanced sovereign engineering series:</p>" +
        '<ul class="series-list-mini">';
    for (var p = 0; p < DATA.seriesTeaser.length; p++) {
      var item = DATA.seriesTeaser[p];
      html +=
        "<li>" +
          '<span class="part-idx">' + escapeHtml(item.part) + ":</span>" +
          "<span>" + escapeHtml(item.title) + "</span>" +
        "</li>";
    }
    html +=
        "</ul>" +
        '<button type="button" class="copy-btn" style="width:100%;justify-content:center;" id="open-series-modal-btn">' +
          "📚 Preview Full 5-Part Series Roadmap" +
        "</button>" +
      "</div>";

    railEl.innerHTML = html;
  }

  /* ---------- Render Center Action Stage (All 8 Chambers) ---------- */
  function renderCenterStage() {
    var stageEl = document.getElementById("center-stage");
    if (!stageEl) return;

    var personaObj = DATA.personas[state.persona] || DATA.personas.P1;
    var osLabel = state.os === "win" ? "🪟 Windows (PowerShell)" : "🐧 Linux / SteamOS (Bash)";

    var html = "";

    // Executive Welcome / Safety Banner
    html +=
      '<section class="workbench-hero">' +
        '<div class="hero-top-row">' +
          '<span class="hero-kicker">VALHEIM 1.0.20 (DEEP NORTH) · TRI-MODAL MODDING WORKBENCH</span>' +
          '<span class="exp-badge">Active Lens: ' + escapeHtml(personaObj.shortLabel) + " · " + escapeHtml(osLabel) + "</span>" +
        "</div>" +
        "<h1>From Zero to a Live Valheim 1.0.20 Mod in 15 Minutes</h1>" +
        '<p class="hero-lede">' +
          "Designed for distracted, tired weeknight sessions and deep weekend sprints alike. " +
          "Switch between <strong>Windows PowerShell</strong> and <strong>Linux Bash</strong>, inspect live <code>1.0.20</code> C# assemblies, or click <strong>🤖 Self-Tap AI Prompt</strong> on any step to unblock yourself in Free Web ChatGPT/Claude without 2022 API hallucinations." +
        "</p>" +
        '<div class="safety-guarantees-strip">' +
          '<div class="safety-pill"><strong>🛡️ Zero Save Risk</strong>Characters &amp; worlds live in AppData / .config outside Steam.</div>' +
          '<div class="safety-pill"><strong>⚡ Zero Unity Editor Bloat</strong>Pure C# class library (~12 KB) compiled via dotnet build.</div>' +
          '<div class="safety-pill"><strong>↩️ 1-Second Vanilla Undo</strong>Run build-and-deploy --reset anytime to return to 100% vanilla.</div>' +
        "</div>" +
      "</section>";

    // Render each of the 8 Chambers
    for (var i = 0; i < DATA.chambers.length; i++) {
      var ch = DATA.chambers[i];
      var isCurr = state.activeChamberId === ch.id;
      var isDone = !!state.completed[ch.id];
      var personaNote = (ch.personaNotes && ch.personaNotes[state.persona]) || ch.personaNotes.P1;
      var cmdText = ch.commands[state.os] || ch.commands.win;
      var outText = ch.expectedOutput[state.os] || ch.expectedOutput.win;
      var nextChamber = i + 1 < DATA.chambers.length ? DATA.chambers[i + 1] : null;

      var showCli = state.traction === "all" || state.traction === "cli";
      var showVisual = state.traction === "all" || state.traction === "visual";
      var showAi = state.traction === "all" || state.traction === "ai";

      html +=
        '<article class="chamber-card' + (isCurr ? " active-chamber" : "") + '" id="chamber-' + escapeHtml(ch.id) + '" data-chamber-card="' + escapeHtml(ch.id) + '">' +
          '<div class="chamber-header">' +
            '<div class="chamber-top-bar">' +
              '<span class="chamber-sprint-tag">' + escapeHtml(ch.sprintLabel) + " · " + escapeHtml(ch.numberLabel) + "</span>" +
              '<div class="chamber-header-actions">' +
                '<button type="button" class="btn-ai-header" data-open-ai-chamber="' + escapeHtml(ch.id) + '">' +
                  "🤖 Ask AI / Self-Tap Prompt" +
                "</button>" +
                '<button type="button" class="copy-btn" data-quick-copy-ai="' + escapeHtml(ch.id) + '" title="Instantly copy the 1.0.20 grounded AI prompt for this chamber">' +
                  "📋 1-Click Copy AI Prompt" +
                "</button>" +
              "</div>" +
            "</div>" +
            '<div class="chamber-title-row">' +
              '<h2 class="chamber-title">' + escapeHtml(ch.numberLabel) + ": " + escapeHtml(ch.title) + "</h2>" +
            "</div>" +
            '<div class="expectation-badges">' +
              '<span class="exp-badge">' + escapeHtml(ch.timeBadge) + "</span>" +
              '<span class="exp-badge">' + escapeHtml(ch.liftBadge) + "</span>" +
              (ch.safeStop ? '<span class="exp-badge badge-stop">' + escapeHtml(ch.safeStop) + "</span>" : "") +
              '<span class="exp-badge badge-undo">' + escapeHtml(ch.undoBadge) + "</span>" +
            "</div>" +
          "</div>" +

          // Persona Context Callout
          '<div class="persona-callout">' +
            '<div class="persona-callout-header">' +
              "<span>🎯 Tailored Lens: " + escapeHtml(personaObj.title) + "</span>" +
              "<span>" + escapeHtml(personaObj.badge) + "</span>" +
            "</div>" +
            "<div>" + escapeHtml(personaNote) + "</div>" +
          "</div>" +

          // Summary + Action Checklist
          '<p class="chamber-summary">' + ch.summary + "</p>" +
          '<ol class="step-checklist">';

      for (var s = 0; s < ch.steps.length; s++) {
        html += "<li>" + ch.steps[s] + "</li>";
      }
      html += "</ol>";

      // Optional Reference Table (Taxonomy, Linux vs Win, Stack Trace, 6 Breaking Shifts, Multiplayer Authority)
      if (ch.tableHtml) {
        html += ch.tableHtml;
      }

      // Modality Section
      if (showCli) {
        html +=
          '<div class="action-panel">' +
            '<div class="action-panel-header">' +
              '<span class="action-panel-title">⌨️ Step Commands · ' + escapeHtml(osLabel) + "</span>" +
              '<button type="button" class="copy-btn" data-copy-cmd="' + escapeHtml(ch.id) + '">📋 Copy Commands</button>' +
            "</div>" +
            "<pre><code>" + escapeHtml(cmdText) + "</code></pre>" +
            '<div class="action-panel-header" style="margin-top:10px;margin-bottom:6px;">' +
              '<span class="action-panel-title" style="color:var(--emerald);">📟 Expected Terminal / Log Output</span>' +
            "</div>" +
            "<pre><code>" + escapeHtml(outText) + "</code></pre>" +
          "</div>";
      }

      if (showVisual) {
        html +=
          '<div class="action-panel">' +
            '<div class="action-panel-header">' +
              '<span class="action-panel-title">🖼️ ' + escapeHtml(ch.codeTitle) + "</span>" +
              '<div style="display:flex;gap:6px;">' +
                '<button type="button" class="copy-btn" data-sync-sightline="' + escapeHtml(ch.id) + '">👁️ Focus in Right Sightline</button>' +
                '<button type="button" class="copy-btn" data-copy-snippet="' + escapeHtml(ch.id) + '">📋 Copy Snippet</button>' +
              "</div>" +
            "</div>" +
            "<pre><code>" + escapeHtml(ch.codeSnippet) + "</code></pre>" +
          "</div>";
      }

      if (showAi) {
        html +=
          '<div class="action-panel" style="border-color:var(--purple-border);">' +
            '<div class="action-panel-header">' +
              '<span class="action-panel-title" style="color:var(--purple);">🤖 Autonomous CLI Agent Task (Claude Code / Codex / Cursor / Antigravity)</span>' +
              '<button type="button" class="copy-btn" data-copy-agent="' + escapeHtml(ch.id) + '">📋 Copy Agent Prompt</button>' +
            "</div>" +
            "<pre><code>" + escapeHtml(ch.agentTask) + "</code></pre>" +
          "</div>";
      }

      // Cliff-Edge Telemetry Guard Box
      html +=
        '<div class="telemetry-grid">' +
          '<div class="telemetry-box on-track">' +
            '<div class="telemetry-title">✔ How You Know You\'re On Track</div>' +
            "<div>" + ch.onTrack + "</div>" +
          "</div>" +
          '<div class="telemetry-box cliff-edge">' +
            '<div class="telemetry-title">⚠️ Cliff-Edge Radar: Where Missteps Go Poorly</div>' +
            "<div><strong>Symptom:</strong> " + ch.cliffEdge.symptom + "</div>" +
            '<div style="margin-top:4px;"><strong>Why:</strong> ' + ch.cliffEdge.cause + "</div>" +
            '<div class="telemetry-fix"><strong>⚡ 10-Second Fix:</strong> ' + ch.cliffEdge.fix + "</div>" +
          "</div>" +
        "</div>";

      // Inline Sightline Slot (Displayed automatically in Single-Column Reading Mode < 960px)
      html +=
        '<div class="inline-sightline-slot">' +
          '<div class="sightline-header">' +
            '<span class="sightline-title">📐 ' + escapeHtml(ch.diagramTitle) + "</span>" +
          "</div>" +
          '<div class="svg-diagram-stage">' + ch.svgDiagram + "</div>" +
          '<p class="diagram-caption">' + escapeHtml(ch.diagramCaption) + "</p>" +
        "</div>";

      // Chamber Footer
      html +=
        '<div class="chamber-card-footer">' +
          '<button type="button" class="complete-toggle-btn' + (isDone ? " is-done" : "") + '" data-toggle-complete-btn="' + escapeHtml(ch.id) + '">' +
            (isDone ? "✔ Completed " + escapeHtml(ch.numberLabel) : "☐ Mark " + escapeHtml(ch.numberLabel) + " Complete") +
          "</button>" +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            (nextChamber
              ? '<button type="button" class="copy-btn" data-goto-chamber="' + escapeHtml(nextChamber.id) + '">' +
                  "Next: " + escapeHtml(nextChamber.numberLabel) + " (" + escapeHtml(nextChamber.shortTitle) + ") ›" +
                "</button>"
              : '<button type="button" class="copy-btn" id="footer-open-series-btn">🎉 All 8 Chambers Reviewed · View 5-Part Series ›</button>') +
          "</div>" +
        "</div>" +
      "</article>";
    }

    stageEl.innerHTML = html;
  }

  /* ---------- Render Right Synchronized Sightline ---------- */
  function renderRightSightline() {
    var sightEl = document.getElementById("right-sightline");
    if (!sightEl) return;

    var ch = getChamberById(state.activeChamberId) || DATA.chambers[0];
    var fileObj = DATA.inspectorFiles[state.inspectorTab] || DATA.inspectorFiles.plugin;
    var osLabel = state.os === "win" ? "Windows PowerShell" : "Linux Bash";
    var outText = ch.expectedOutput[state.os] || ch.expectedOutput.win;

    var html = "";

    // Card 1: Synchronized Architecture Diagram
    html +=
      '<div class="sightline-card">' +
        '<div class="sightline-header">' +
          '<span class="sightline-title">📐 Synchronized Sightline · ' + escapeHtml(ch.numberLabel) + "</span>" +
          '<span class="sightline-live-pill">LIVE SYNC</span>' +
        "</div>" +
        '<div style="font-size:13px;font-weight:700;color:var(--text-strong);margin-bottom:8px;">' +
          escapeHtml(ch.diagramTitle) +
        "</div>" +
        '<div class="svg-diagram-stage">' + ch.svgDiagram + "</div>" +
        '<p class="diagram-caption">' + escapeHtml(ch.diagramCaption) + "</p>" +
      "</div>";

    // Card 2: Interactive Live Code & File Inspector
    html +=
      '<div class="sightline-card">' +
        '<div class="sightline-header">' +
          '<span class="sightline-title">🔍 Live Starter-Mod File Inspector</span>' +
          '<button type="button" class="copy-btn" id="copy-inspector-file-btn">📋 Copy ' + escapeHtml(fileObj.label) + "</button>" +
        "</div>" +
        '<div class="inspector-tabs">';

    var fileKeys = ["plugin", "csproj", "cfg", "manifest"];
    for (var i = 0; i < fileKeys.length; i++) {
      var k = fileKeys[i];
      var f = DATA.inspectorFiles[k];
      html +=
        '<button type="button" class="inspector-tab' + (state.inspectorTab === k ? " active" : "") + '" data-inspector-tab="' + k + '">' +
          escapeHtml(f.label) +
        "</button>";
    }

    html +=
        "</div>" +
        '<div style="font-size:11.5px;color:var(--cyan);margin-bottom:6px;">' +
          "💡 <strong>" + escapeHtml(ch.numberLabel) + " Focus:</strong> " + escapeHtml(ch.inspectorHighlightNote) +
        "</div>" +
        '<pre class="inspector-code-box"><code>' + escapeHtml(fileObj.content) + "</code></pre>" +
      "</div>";

    // Card 3: Expected Terminal / Log Sightline for Active Chamber
    html +=
      '<div class="sightline-card">' +
        '<div class="sightline-header">' +
          '<span class="sightline-title">📟 Expected Telemetry (' + escapeHtml(osLabel) + ")</span>" +
        "</div>" +
        '<pre style="font-size:12px;"><code>' + escapeHtml(outText) + "</code></pre>" +
      "</div>";

    sightEl.innerHTML = html;
  }

  /* ---------- Render Sticky Bottom Bar for Reading Mode ---------- */
  function renderReadingBottomBar() {
    var navEl = document.getElementById("reading-bottom-nav");
    if (!navEl) return;

    var idx = getChamberIndex(state.activeChamberId);
    var ch = DATA.chambers[idx];
    var prevCh = idx > 0 ? DATA.chambers[idx - 1] : null;
    var nextCh = idx + 1 < DATA.chambers.length ? DATA.chambers[idx + 1] : null;

    navEl.innerHTML =
      (prevCh
        ? '<button type="button" class="reading-nav-btn" data-goto-chamber="' + escapeHtml(prevCh.id) + '">‹ ' + escapeHtml(prevCh.numberLabel) + "</button>"
        : '<button type="button" class="reading-nav-btn" disabled style="opacity:0.4;">‹ Start</button>') +
      '<button type="button" class="btn-ai-header" data-open-ai-chamber="' + escapeHtml(ch.id) + '">' +
        "🤖 AI Prompt (" + escapeHtml(ch.numberLabel) + ")" +
      "</button>" +
      (nextCh
        ? '<button type="button" class="reading-nav-btn primary" data-goto-chamber="' + escapeHtml(nextCh.id) + '">' + escapeHtml(nextCh.numberLabel) + " ›</button>"
        : '<button type="button" class="reading-nav-btn primary" id="reading-finish-btn">🎉 Done</button>');
  }

  /* ---------- Build 1-Click Self-Tap AI Prompt Text ---------- */
  function buildSelfTapPrompt(chamberId, preset, userErrorText) {
    var ch = getChamberById(chamberId) || DATA.chambers[0];
    var personaObj = DATA.personas[state.persona] || DATA.personas.P1;
    var osName = state.os === "win" ? "Windows 11 (PowerShell)" : "Linux / SteamOS / CachyOS (Bash)";
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

  /* ---------- Open & Sync Self-Tap AI Prompt Modal ---------- */
  function openAiModal(chamberId) {
    if (chamberId && getChamberById(chamberId)) {
      state.activeChamberId = String(chamberId);
    }
    var modal = document.getElementById("ai-modal");
    if (!modal) return;
    modal.classList.add("open");
    renderAiModalContent();
  }

  function renderAiModalContent() {
    var ch = getChamberById(state.activeChamberId) || DATA.chambers[0];
    var titleEl = document.getElementById("ai-modal-chamber-label");
    if (titleEl) {
      titleEl.textContent = ch.numberLabel + ": " + ch.title;
    }

    var presetBtns = document.querySelectorAll("[data-ai-preset]");
    for (var i = 0; i < presetBtns.length; i++) {
      var b = presetBtns[i];
      if (b.getAttribute("data-ai-preset") === state.aiPreset) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    }

    var errorWrap = document.getElementById("ai-error-input-wrap");
    if (errorWrap) {
      errorWrap.style.display = state.aiPreset === "diagnose" ? "block" : "none";
    }

    var promptBox = document.getElementById("ai-prompt-preview-code");
    if (promptBox) {
      promptBox.textContent = buildSelfTapPrompt(state.activeChamberId, state.aiPreset, state.aiUserError);
    }
  }

  /* ---------- Set Active Chamber & Sync Sightline ---------- */
  var programmaticScrollUntil = 0;

  function setActiveChamber(chamberId, scrollIntoView) {
    var ch = getChamberById(chamberId);
    if (!ch) return;
    state.activeChamberId = ch.id;
    if (ch.defaultInspectorTab && DATA.inspectorFiles[ch.defaultInspectorTab]) {
      state.inspectorTab = ch.defaultInspectorTab;
    }
    saveState();

    // Update active classes on chamber cards without re-creating DOM if possible
    var cards = document.querySelectorAll("[data-chamber-card]");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute("data-chamber-card") === ch.id) {
        cards[i].classList.add("active-chamber");
      } else {
        cards[i].classList.remove("active-chamber");
      }
    }

    syncLoadoutBar();
    renderLeftRail();
    renderRightSightline();
    renderReadingBottomBar();

    if (scrollIntoView) {
      programmaticScrollUntil = Date.now() + 950;
      var targetEl = document.getElementById("chamber-" + ch.id);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  /* ---------- Full Re-Render ---------- */
  function renderAll() {
    applyBodyAttributes();
    syncLoadoutBar();
    renderLeftRail();
    renderCenterStage();
    renderRightSightline();
    renderReadingBottomBar();
  }

  /* ---------- Event Delegation & Scroll-Spy ---------- */
  function bindEvents() {
    document.addEventListener("click", function (ev) {
      var target = ev.target;
      if (!target) return;

      // 1. Loadout Bar Controls (os, persona, traction, layout, theme)
      var ctrlBtn = target.closest("[data-control][data-value]");
      if (ctrlBtn) {
        var ctrl = ctrlBtn.getAttribute("data-control");
        var val = ctrlBtn.getAttribute("data-value");
        state[ctrl] = val;
        saveState();
        renderAll();
        return;
      }

      // 2. Completion Checkbox on Rail
      if (target.matches("[data-toggle-complete]")) {
        ev.stopPropagation();
        var cid = target.getAttribute("data-toggle-complete");
        state.completed[cid] = !!target.checked;
        saveState();
        renderAll();
        return;
      }

      // 3. Completion Button in Chamber Footer
      var compBtn = target.closest("[data-toggle-complete-btn]");
      if (compBtn) {
        var cid2 = compBtn.getAttribute("data-toggle-complete-btn");
        state.completed[cid2] = !state.completed[cid2];
        saveState();
        renderAll();
        return;
      }

      // 4. Navigate to Chamber (Left Rail, Compact Strip, Next Button)
      var gotoBtn = target.closest("[data-goto-chamber]");
      if (gotoBtn) {
        var targetId = gotoBtn.getAttribute("data-goto-chamber");
        setActiveChamber(targetId, true);
        return;
      }

      // 5. Sync Sightline Button
      var syncBtn = target.closest("[data-sync-sightline]");
      if (syncBtn) {
        var sId = syncBtn.getAttribute("data-sync-sightline");
        setActiveChamber(sId, false);
        return;
      }

      // 6. Inspector File Tabs in Right Sightline
      var inspTab = target.closest("[data-inspector-tab]");
      if (inspTab) {
        state.inspectorTab = inspTab.getAttribute("data-inspector-tab");
        saveState();
        renderRightSightline();
        return;
      }

      // 7. Copy Inspector File
      if (target.closest("#copy-inspector-file-btn")) {
        var btn = target.closest("#copy-inspector-file-btn");
        var fObj = DATA.inspectorFiles[state.inspectorTab] || DATA.inspectorFiles.plugin;
        copyToClipboard(fObj.content, btn, "✔ Copied " + fObj.label);
        return;
      }

      // 8. Copy CLI Commands
      var copyCmdBtn = target.closest("[data-copy-cmd]");
      if (copyCmdBtn) {
        var chCmd = getChamberById(copyCmdBtn.getAttribute("data-copy-cmd"));
        if (chCmd) {
          copyToClipboard(chCmd.commands[state.os] || chCmd.commands.win, copyCmdBtn, "✔ Commands Copied!");
        }
        return;
      }

      // 9. Copy Code Snippet
      var copySnipBtn = target.closest("[data-copy-snippet]");
      if (copySnipBtn) {
        var chSnip = getChamberById(copySnipBtn.getAttribute("data-copy-snippet"));
        if (chSnip) {
          copyToClipboard(chSnip.codeSnippet, copySnipBtn, "✔ Snippet Copied!");
        }
        return;
      }

      // 10. Copy CLI Agent Prompt
      var copyAgentBtn = target.closest("[data-copy-agent]");
      if (copyAgentBtn) {
        var chAg = getChamberById(copyAgentBtn.getAttribute("data-copy-agent"));
        if (chAg) {
          copyToClipboard(chAg.agentTask, copyAgentBtn, "✔ Agent Task Copied!");
        }
        return;
      }

      // 11. 1-Click Quick Copy Self-Tap AI Prompt
      var quickAiBtn = target.closest("[data-quick-copy-ai]");
      if (quickAiBtn) {
        var qId = quickAiBtn.getAttribute("data-quick-copy-ai");
        var promptStr = buildSelfTapPrompt(qId, "explain", "");
        copyToClipboard(promptStr, quickAiBtn, "✔ 1.0.20 AI Prompt Copied!");
        return;
      }

      // 12. Open Self-Tap AI Prompt Modal
      var openAiBtn = target.closest("[data-open-ai-chamber]");
      if (openAiBtn) {
        openAiModal(openAiBtn.getAttribute("data-open-ai-chamber"));
        return;
      }
      if (target.closest("#header-open-ai-btn")) {
        openAiModal(state.activeChamberId);
        return;
      }

      // 13. AI Modal Preset Switch
      var presetBtn = target.closest("[data-ai-preset]");
      if (presetBtn) {
        state.aiPreset = presetBtn.getAttribute("data-ai-preset");
        renderAiModalContent();
        return;
      }

      // 14. Copy Full AI Prompt inside Modal
      if (target.closest("#modal-copy-ai-prompt-btn")) {
        var mBtn = target.closest("#modal-copy-ai-prompt-btn");
        var fullPrompt = buildSelfTapPrompt(state.activeChamberId, state.aiPreset, state.aiUserError);
        copyToClipboard(fullPrompt, mBtn, "✔ Copied! Paste into ChatGPT / Claude / Ollama");
        return;
      }

      // 15. Emergency Reset Modal
      if (target.closest("#header-open-reset-btn") || target.closest("#rail-open-reset-btn")) {
        var rModal = document.getElementById("reset-modal");
        if (rModal) rModal.classList.add("open");
        return;
      }
      if (target.closest("#copy-reset-win-btn")) {
        copyToClipboard("powershell -ExecutionPolicy Bypass -File .\\tools\\build-and-deploy.ps1 -Reset", target.closest("#copy-reset-win-btn"), "✔ Copied PS1 Reset!");
        return;
      }
      if (target.closest("#copy-reset-linux-btn")) {
        copyToClipboard("bash ./tools/build-and-deploy.sh --reset", target.closest("#copy-reset-linux-btn"), "✔ Copied Bash Reset!");
        return;
      }

      // 16. 5-Part Series Modal
      if (target.closest("#open-series-modal-btn") || target.closest("#footer-open-series-btn") || target.closest("#reading-finish-btn")) {
        var sModal = document.getElementById("series-modal");
        if (sModal) sModal.classList.add("open");
        return;
      }

      // 17. Close Modals
      if (target.closest("[data-close-modal]") || target.classList.contains("modal-scrim")) {
        var scrims = document.querySelectorAll(".modal-scrim.open");
        for (var m = 0; m < scrims.length; m++) {
          scrims[m].classList.remove("open");
        }
        return;
      }

      // 18. Clicking inside a Chamber Card activates it in the Right Sightline
      var cardEl = target.closest("[data-chamber-card]");
      if (cardEl) {
        var cId = cardEl.getAttribute("data-chamber-card");
        if (cId && state.activeChamberId !== cId) {
          setActiveChamber(cId, false);
        }
      }
    });

    // Live Error Textarea in AI Modal
    var errInput = document.getElementById("ai-error-textarea");
    if (errInput) {
      errInput.addEventListener("input", function () {
        state.aiUserError = errInput.value;
        var promptBox = document.getElementById("ai-prompt-preview-code");
        if (promptBox) {
          promptBox.textContent = buildSelfTapPrompt(state.activeChamberId, state.aiPreset, state.aiUserError);
        }
      });
    }

    // IntersectionObserver to auto-synchronize Right Sightline as user scrolls through Chambers 0 -> 5
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (Date.now() < programmaticScrollUntil) return;
          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
              var cid = entry.target.getAttribute("data-chamber-card");
              if (cid && cid !== state.activeChamberId) {
                setActiveChamber(cid, false);
              }
              break;
            }
          }
        },
        { rootMargin: "-120px 0px -45% 0px", threshold: [0.35, 0.6] }
      );

      setTimeout(function () {
        var cards = document.querySelectorAll("[data-chamber-card]");
        for (var i = 0; i < cards.length; i++) {
          observer.observe(cards[i]);
        }
      }, 150);
    }
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
