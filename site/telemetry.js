/* ==========================================================================
   Viking Mod Foundry — Valheim 1.0.21 (Deep North)
   Usability Telemetry, Click Breadcrumb Tracker & Private Discord Feedback
   ==========================================================================
   - Zero-error operation across file://, localhost, GitHub Pages, and Azure SWA.
   - Auto-injects Microsoft Clarity, Google Analytics 4, and Cloudflare Web
     Analytics when configured in window.FOUNDRY_CONFIG (or localStorage).
   - Tracks per-step dwell time, video progress %, copy/download/AI actions,
     and a rolling 20-item click breadcrumb buffer with relative timestamps.
   - Sends rich color-coded Discord Webhook embeds directly or via /api/feedback,
     and persists all submissions in localStorage outbox.
   ========================================================================== */

(function () {
  "use strict";

  var SESSION_STORAGE_KEY = "valheim_modding_101_telemetry_session_v1";
  var OUTBOX_STORAGE_KEY = "valheim_modding_101_feedback_outbox";
  var WEBHOOK_OVERRIDE_KEY = "valheim_modding_101_webhook_override";
  var CLARITY_OVERRIDE_KEY = "valheim_modding_101_clarity_id";
  var GA_OVERRIDE_KEY = "valheim_modding_101_ga_id";
  var CF_OVERRIDE_KEY = "valheim_modding_101_cf_token";
  var APP_STATE_KEY = "valheim_modding_101_state_v3_1";

  var MAX_BREADCRUMBS = 20;
  var MAX_OUTBOX_ITEMS = 30;

  var STEP_TITLES = {
    "0": "Step 0: Picture Overview",
    "1": "Step 1: Game Folders & Mod Managers",
    "2": "Step 2: 1-Line Setup Check (Doctor)",
    "3": "Step 3: Build & Deploy HelloValheim.dll",
    "4": "Step 4: Launch Valheim & Test F5 Console",
    "5": "Step 5: Live Config Reload (.cfg)",
    "6": "Step 6: HarmonyX Hooks & 1.0.21 Shifts",
    "7": "Step 7: Fix Crashes & Stack Traces",
    "8": "Step 8: Decompile, Multiplayer & Thunderstore"
  };

  var PERSONA_NAMES = {
    "P1": "P1 · Cross-Game Modder",
    "P2": "P2 · Software Dev",
    "P3": "P3 · Hobbyist (Have Goal)",
    "P4": "P4 · Explorer (No Goal)",
    "P5": "P5 · 0.217 Veteran"
  };

  function getConfig() {
    var cfg = window.FOUNDRY_CONFIG || {};
    return {
      version: cfg.version || "1.0.21",
      analytics: cfg.analytics || {},
      feedback: cfg.feedback || {
        apiEndpoint: "/api/feedback",
        discordWebhookUrl: "",
        discordWebhookB64: "",
        includeUsabilityBreadcrumbs: true
      }
    };
  }

  function safeGetStorage(storageObj, key) {
    try {
      return storageObj ? storageObj.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function safeSetStorage(storageObj, key, val) {
    try {
      if (storageObj) storageObj.setItem(key, val);
    } catch (e) {}
  }

  function safeRemoveStorage(storageObj, key) {
    try {
      if (storageObj) storageObj.removeItem(key);
    } catch (e) {}
  }

  function generateSessionId() {
    var chars = "abcdefghjkmnpqrstuvwxyz23456789";
    var out = "vmf-";
    for (var i = 0; i < 6; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  function detectCurrentStepId(stateHint) {
    if (stateHint && stateHint.activeChamberId != null) {
      return String(stateHint.activeChamberId);
    }
    try {
      var activeBtn = document.querySelector(".stepper-node.active[data-goto-chamber]");
      if (activeBtn) {
        return String(activeBtn.getAttribute("data-goto-chamber") || "0");
      }
      var raw = safeGetStorage(window.localStorage, APP_STATE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.activeChamberId != null) {
          return String(parsed.activeChamberId);
        }
      }
    } catch (e) {}
    return "0";
  }

  function detectCurrentSetup(stateHint) {
    var os = (stateHint && stateHint.os) || "";
    var persona = (stateHint && stateHint.persona) || "";
    var actionTab = (stateHint && stateHint.actionTab) || "";
    var stepId = detectCurrentStepId(stateHint);

    try {
      if (!os && document.body) {
        os = document.body.getAttribute("data-os") || "";
      }
      if (!persona && document.body) {
        persona = document.body.getAttribute("data-persona") || "";
      }
      var raw = safeGetStorage(window.localStorage, APP_STATE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed) {
          if (!os && parsed.os) os = parsed.os;
          if (!persona && parsed.persona) persona = parsed.persona;
          if (!actionTab && parsed.actionTab) actionTab = parsed.actionTab;
        }
      }
    } catch (e) {}

    os = os === "win" ? "win" : "linux";
    persona = persona || "P1";
    actionTab = actionTab || "cli";

    return {
      os: os,
      osLabel: os === "win" ? "Windows 10/11 (PowerShell)" : "Linux / SteamOS (Bash)",
      persona: persona,
      personaLabel: PERSONA_NAMES[persona] || persona,
      actionTab: actionTab,
      stepId: stepId,
      stepTitle: STEP_TITLES[stepId] || ("Step " + stepId)
    };
  }

  /* ---------- Session State Management ---------- */
  var nowMs = Date.now();
  var session = {
    sessionId: generateSessionId(),
    startedAt: nowMs,
    activeStepId: "0",
    stepEnteredAt: nowMs,
    stepsVisited: ["0"],
    stepDwellSec: { "0": 0 },
    counts: {
      copies: 0,
      aiPrompts: 0,
      downloads: 0,
      carouselClicks: 0,
      videoMaxPct: 0
    },
    breadcrumbs: [],
    videoMilestones: {}
  };

  function loadSession() {
    try {
      var raw = safeGetStorage(window.sessionStorage, SESSION_STORAGE_KEY);
      if (!raw) {
        var initialStep = detectCurrentStepId();
        session.activeStepId = initialStep;
        session.stepsVisited = [initialStep];
        session.stepDwellSec = {};
        session.stepDwellSec[initialStep] = 0;
        saveSession();
        return;
      }
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (parsed.sessionId) session.sessionId = String(parsed.sessionId);
        if (typeof parsed.startedAt === "number" && parsed.startedAt > 0) session.startedAt = parsed.startedAt;
        if (parsed.activeStepId != null) session.activeStepId = String(parsed.activeStepId);
        session.stepEnteredAt = Date.now();
        if (Array.isArray(parsed.stepsVisited) && parsed.stepsVisited.length > 0) {
          session.stepsVisited = parsed.stepsVisited.map(String);
        }
        if (parsed.stepDwellSec && typeof parsed.stepDwellSec === "object") {
          session.stepDwellSec = parsed.stepDwellSec;
        }
        if (parsed.counts && typeof parsed.counts === "object") {
          session.counts.copies = Number(parsed.counts.copies) || 0;
          session.counts.aiPrompts = Number(parsed.counts.aiPrompts) || 0;
          session.counts.downloads = Number(parsed.counts.downloads) || 0;
          session.counts.carouselClicks = Number(parsed.counts.carouselClicks) || 0;
          session.counts.videoMaxPct = Number(parsed.counts.videoMaxPct) || 0;
        }
        if (Array.isArray(parsed.breadcrumbs)) {
          session.breadcrumbs = parsed.breadcrumbs.slice(-MAX_BREADCRUMBS);
        }
        if (parsed.videoMilestones && typeof parsed.videoMilestones === "object") {
          session.videoMilestones = parsed.videoMilestones;
        }
      }
    } catch (e) {}
  }

  function saveSession() {
    safeSetStorage(window.sessionStorage, SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  function accrueStepDwell(nextStepId) {
    var now = Date.now();
    var curr = String(session.activeStepId || "0");
    var elapsedSec = Math.max(0, Math.round((now - (session.stepEnteredAt || now)) / 1000));
    if (elapsedSec > 0) {
      session.stepDwellSec[curr] = (Number(session.stepDwellSec[curr]) || 0) + elapsedSec;
    } else if (session.stepDwellSec[curr] == null) {
      session.stepDwellSec[curr] = 0;
    }
    session.stepEnteredAt = now;

    if (nextStepId != null) {
      var nextStr = String(nextStepId);
      session.activeStepId = nextStr;
      if (session.stepsVisited.indexOf(nextStr) === -1) {
        session.stepsVisited.push(nextStr);
      }
      if (session.stepDwellSec[nextStr] == null) {
        session.stepDwellSec[nextStr] = 0;
      }
    }
    saveSession();
  }

  function formatRelTime(timestampMs) {
    var diffSec = Math.max(0, Math.round(((timestampMs || Date.now()) - session.startedAt) / 1000));
    if (diffSec < 60) {
      return "+" + diffSec + "s";
    }
    var mins = Math.floor(diffSec / 60);
    var rem = diffSec % 60;
    return "+" + mins + "m" + (rem < 10 ? "0" : "") + rem + "s";
  }

  /* ---------- External Analytics Providers (Clarity / GA4 / Cloudflare) ---------- */
  var providersInjected = {
    clarity: false,
    ga: false,
    cloudflare: false
  };

  function getEffectiveAnalyticsIds() {
    var cfg = getConfig().analytics;
    return {
      clarityProjectId: (safeGetStorage(window.localStorage, CLARITY_OVERRIDE_KEY) || cfg.clarityProjectId || "").trim(),
      gaMeasurementId: (safeGetStorage(window.localStorage, GA_OVERRIDE_KEY) || cfg.gaMeasurementId || "").trim(),
      cloudflareBeaconToken: (safeGetStorage(window.localStorage, CF_OVERRIDE_KEY) || cfg.cloudflareBeaconToken || "").trim()
    };
  }

  function syncClarityTags(stateHint) {
    if (typeof window.clarity !== "function") return;
    try {
      var setup = detectCurrentSetup(stateHint);
      window.clarity("set", "os", setup.os);
      window.clarity("set", "persona", setup.persona);
      window.clarity("set", "active_step", "step_" + setup.stepId);
      window.clarity("set", "foundry_version", getConfig().version);
    } catch (e) {}
  }

  function injectExternalAnalytics() {
    var ids = getEffectiveAnalyticsIds();

    // 1. Microsoft Clarity
    if (ids.clarityProjectId && !providersInjected.clarity) {
      providersInjected.clarity = true;
      try {
        (function (c, l, a, r, i, t, y) {
          c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
          t = l.createElement(r);
          t.async = 1;
          t.src = "https://www.clarity.ms/tag/" + encodeURIComponent(i);
          y = l.getElementsByTagName(r)[0];
          if (y && y.parentNode) {
            y.parentNode.insertBefore(t, y);
          } else if (l.head) {
            l.head.appendChild(t);
          }
        })(window, document, "clarity", "script", ids.clarityProjectId);
        syncClarityTags();
      } catch (e) {}
    }

    // 2. Google Analytics 4 (gtag.js)
    if (ids.gaMeasurementId && !providersInjected.ga) {
      providersInjected.ga = true;
      try {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        window.gtag("js", new Date());
        window.gtag("config", ids.gaMeasurementId, {
          anonymize_ip: true,
          send_page_view: true
        });
        var gaScript = document.createElement("script");
        gaScript.async = true;
        gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ids.gaMeasurementId);
        if (document.head) document.head.appendChild(gaScript);
      } catch (e) {}
    }

    // 3. Cloudflare Web Analytics
    if (ids.cloudflareBeaconToken && !providersInjected.cloudflare) {
      providersInjected.cloudflare = true;
      try {
        var cfScript = document.createElement("script");
        cfScript.defer = true;
        cfScript.src = "https://static.cloudflareinsights.com/beacon.min.js";
        cfScript.setAttribute("data-cf-beacon", JSON.stringify({ token: ids.cloudflareBeaconToken }));
        if (document.head) document.head.appendChild(cfScript);
      } catch (e) {}
    }
  }

  /* ---------- Granular Usability & Click Breadcrumb Tracker ---------- */
  var lastTrackedSignature = "";
  var lastTrackedTimeMs = 0;

  function track(eventName, props) {
    if (!eventName) return;
    props = props && typeof props === "object" ? props : {};

    var now = Date.now();
    var stepId = props.stepId != null ? String(props.stepId) : detectCurrentStepId(props.state);

    // Deduplicate rapid identical events fired by both explicit call and delegated click listener
    var detailStr = props.detail || props.target || props.tab || props.bundle || props.file || props.preset || props.os || props.persona || "";
    var sig = stepId + ":" + eventName + ":" + detailStr;
    if (sig === lastTrackedSignature && (now - lastTrackedTimeMs) < 65) {
      return;
    }
    lastTrackedSignature = sig;
    lastTrackedTimeMs = now;

    // Update step dwell & visited list if step changed
    if (stepId !== session.activeStepId) {
      accrueStepDwell(stepId);
    } else {
      accrueStepDwell(null);
    }

    // Increment interaction counters
    var evLower = String(eventName).toLowerCase();
    if (
      evLower.indexOf("copy") !== -1 ||
      props.category === "copy"
    ) {
      session.counts.copies = (Number(session.counts.copies) || 0) + 1;
    }
    if (
      evLower.indexOf("ai_") === 0 ||
      evLower.indexOf("ai_prompt") !== -1 ||
      props.tab === "ai" ||
      props.category === "ai"
    ) {
      session.counts.aiPrompts = (Number(session.counts.aiPrompts) || 0) + 1;
    }
    if (
      evLower.indexOf("download") !== -1 ||
      props.category === "download"
    ) {
      session.counts.downloads = (Number(session.counts.downloads) || 0) + 1;
    }
    if (
      evLower.indexOf("carousel") !== -1 ||
      evLower.indexOf("companion") !== -1 ||
      evLower.indexOf("file_pill") !== -1 ||
      evLower.indexOf("inspector_tab") !== -1 ||
      props.category === "carousel"
    ) {
      session.counts.carouselClicks = (Number(session.counts.carouselClicks) || 0) + 1;
    }
    if (typeof props.videoPct === "number" && isFinite(props.videoPct)) {
      var clampedPct = Math.max(0, Math.min(100, Math.round(props.videoPct)));
      if (clampedPct > (session.counts.videoMaxPct || 0)) {
        session.counts.videoMaxPct = clampedPct;
      }
    }

    // Build human-readable breadcrumb entry
    var relStamp = formatRelTime(now);
    var suffix = detailStr ? (" (" + String(detailStr).slice(0, 40) + ")") : "";
    var crumbLine = relStamp + " [Step " + stepId + "] " + eventName + suffix;

    session.breadcrumbs.push(crumbLine);
    if (session.breadcrumbs.length > MAX_BREADCRUMBS) {
      session.breadcrumbs = session.breadcrumbs.slice(session.breadcrumbs.length - MAX_BREADCRUMBS);
    }

    saveSession();

    // Forward to Microsoft Clarity & GA4 when active
    try {
      syncClarityTags(props.state);
      if (typeof window.clarity === "function") {
        window.clarity("event", eventName);
      }
      if (typeof window.gtag === "function") {
        var gaParams = {
          step_id: stepId,
          detail: String(detailStr || ""),
          session_id: session.sessionId
        };
        window.gtag("event", eventName, gaParams);
      }
    } catch (e) {}
  }

  /* ---------- Build Concise Usability Summary (Structured + String) ---------- */
  function getUsabilitySummary(currentState) {
    var activeStep = detectCurrentStepId(currentState);
    if (activeStep !== session.activeStepId) {
      accrueStepDwell(activeStep);
    } else {
      accrueStepDwell(null);
    }

    var setup = detectCurrentSetup(currentState);
    var totalSessionSec = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
    var currentStepDwellSec = Number(session.stepDwellSec[activeStep]) || 0;

    var stepsWithDwell = [];
    for (var i = 0; i < session.stepsVisited.length; i++) {
      var sid = String(session.stepsVisited[i]);
      var dwell = Number(session.stepDwellSec[sid]) || 0;
      stepsWithDwell.push({
        stepId: sid,
        dwellSec: dwell,
        label: "Step " + sid + " (" + dwell + "s)"
      });
    }

    var stepsFormatted = stepsWithDwell.map(function (item) {
      return item.label;
    }).join(" → ") || ("Step " + activeStep + " (" + currentStepDwellSec + "s)");

    var last8 = session.breadcrumbs.slice(-8);

    var lines = [
      "• Session: " + session.sessionId + " (" + totalSessionSec + "s total) · Setup: " + setup.osLabel + " · " + setup.personaLabel,
      "• Current Step: " + setup.stepTitle + " (" + currentStepDwellSec + "s dwell)",
      "• Steps Visited: " + stepsFormatted,
      "• Interactions: " +
        session.counts.copies + " copies, " +
        session.counts.downloads + " downloads, " +
        session.counts.aiPrompts + " AI actions, " +
        session.counts.carouselClicks + " companion/file clicks, " +
        "video max " + (session.counts.videoMaxPct || 0) + "%",
      "• Recent Trail (" + last8.length + "): " + (last8.length ? last8.join(" | ") : "No clicks recorded yet")
    ];

    var summaryText = lines.join("\n");

    var result = {
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      totalSessionSec: totalSessionSec,
      setup: setup,
      currentStepId: activeStep,
      currentStepTitle: setup.stepTitle,
      currentStepDwellSec: currentStepDwellSec,
      stepsVisited: session.stepsVisited.slice(),
      stepsVisitedDetailed: stepsWithDwell,
      stepsVisitedFormatted: stepsFormatted,
      stepDwellSec: Object.assign ? Object.assign({}, session.stepDwellSec) : session.stepDwellSec,
      counts: {
        copies: session.counts.copies,
        aiPrompts: session.counts.aiPrompts,
        downloads: session.counts.downloads,
        carouselClicks: session.counts.carouselClicks,
        videoMaxPct: session.counts.videoMaxPct
      },
      videoMaxPct: session.counts.videoMaxPct || 0,
      breadcrumbs: session.breadcrumbs.slice(),
      lastBreadcrumbs: last8,
      summary: summaryText,
      text: summaryText
    };

    Object.defineProperty(result, "toString", {
      value: function () {
        return summaryText;
      },
      enumerable: false
    });

    return result;
  }

  /* ---------- Discord Webhook & Feedback Formatting ---------- */
  function resolveCategoryMeta(categoryRaw) {
    var c = String(categoryRaw || "helpful").toLowerCase();
    if (c.indexOf("bug") !== -1 || c.indexOf("confus") !== -1 || c.indexOf("error") !== -1 || c.indexOf("stuck") !== -1 || c.indexOf("issue") !== -1) {
      return {
        key: "bug",
        label: "🔴 Bug / Confusing Step",
        color: 0xe05246 // Crimson red
      };
    }
    if (c.indexOf("idea") !== -1 || c.indexOf("request") !== -1 || c.indexOf("suggest") !== -1 || c.indexOf("feature") !== -1) {
      return {
        key: "idea",
        label: "🟡 Idea / Feature Request",
        color: 0xd4882a // Hearth amber/gold
      };
    }
    return {
      key: "helpful",
      label: "🟢 Helpful / Worked Great",
      color: 0x3fb950 // Pine green
    };
  }

  function buildFormattedMarkdownReport(payload, summaryObj) {
    var catMeta = resolveCategoryMeta(payload.category);
    var stepLabel = payload.stepTitle || summaryObj.currentStepTitle || ("Step " + (payload.stepId || summaryObj.currentStepId));
    var msg = String(payload.message || "(No comment text provided)").trim();
    var contact = payload.contact ? String(payload.contact).trim() : "";
    var rating = payload.rating ? (" · Rating: " + payload.rating) : "";

    var out = [
      "### Viking Mod Foundry Feedback — " + catMeta.label + rating,
      "- **Step:** " + stepLabel,
      "- **Setup:** " + summaryObj.setup.osLabel + " · " + summaryObj.setup.personaLabel,
      contact ? ("- **Contact / Discord:** " + contact) : null,
      "",
      "**Reader Message:**",
      "> " + msg.replace(/\r?\n/g, "\n> "),
      "",
      "**Usability & Click Breadcrumb Trail:**",
      "```text",
      summaryObj.text,
      "```"
    ];

    var filtered = [];
    for (var i = 0; i < out.length; i++) {
      if (out[i] !== null) filtered.push(out[i]);
    }
    return filtered.join("\n");
  }

  function buildDiscordWebhookPayload(payload, summaryObj) {
    var catMeta = resolveCategoryMeta(payload.category);
    var stepLabel = payload.stepTitle || summaryObj.currentStepTitle || ("Step " + (payload.stepId || summaryObj.currentStepId));
    var userMsg = String(payload.message || "(Quick rating submitted without extra comment)").trim();
    if (userMsg.length > 1800) {
      userMsg = userMsg.slice(0, 1797) + "...";
    }

    var includeCrumbs = payload.includeBreadcrumbs !== false && getConfig().feedback.includeUsabilityBreadcrumbs !== false;

    var fields = [
      {
        name: "📍 Active Step",
        value: stepLabel + " (`" + summaryObj.currentStepDwellSec + "s` dwell)",
        inline: true
      },
      {
        name: "🖥️ Reader Setup",
        value: summaryObj.setup.osLabel + "\n" + summaryObj.setup.personaLabel,
        inline: true
      }
    ];

    if (payload.contact || payload.rating) {
      var metaBits = [];
      if (payload.rating) metaBits.push("Rating: **" + String(payload.rating) + "**");
      if (payload.contact) metaBits.push("Contact: `" + String(payload.contact).slice(0, 80) + "`");
      fields.push({
        name: "👤 Reader Meta",
        value: metaBits.join("\n"),
        inline: true
      });
    }

    if (includeCrumbs) {
      var statsValue =
        "**Steps Visited:** " + (summaryObj.stepsVisitedFormatted || "Step 0") + "\n" +
        "**Actions:** `" + summaryObj.counts.copies + "` copies · `" +
        summaryObj.counts.downloads + "` downloads · `" +
        summaryObj.counts.aiPrompts + "` AI prompts · `" +
        summaryObj.counts.carouselClicks + "` file/slide clicks · " +
        "Video max `" + summaryObj.videoMaxPct + "%`";

      fields.push({
        name: "📊 Session Telemetry (" + summaryObj.totalSessionSec + "s total)",
        value: statsValue.slice(0, 1020),
        inline: false
      });

      var trailLines = summaryObj.lastBreadcrumbs && summaryObj.lastBreadcrumbs.length
        ? summaryObj.lastBreadcrumbs.join("\n")
        : "(No clicks recorded before feedback)";

      fields.push({
        name: "🧭 Click Breadcrumbs (Last " + (summaryObj.lastBreadcrumbs ? summaryObj.lastBreadcrumbs.length : 0) + ")",
        value: "```text\n" + trailLines.slice(0, 950) + "\n```",
        inline: false
      });
    }

    var hostLabel = "local-file";
    try {
      hostLabel = window.location.protocol === "file:"
        ? "file:// (offline)"
        : (window.location.host || window.location.hostname || "web");
    } catch (e) {}

    return {
      username: "Viking Mod Foundry · Feedback",
      embeds: [
        {
          title: catMeta.label + " — " + stepLabel,
          description: userMsg,
          color: catMeta.color,
          fields: fields,
          footer: {
            text: "Viking Mod Foundry v" + getConfig().version + " · Session " + summaryObj.sessionId + " · " + hostLabel
          },
          timestamp: new Date().toISOString()
        }
      ]
    };
  }

  function getOutbox() {
    try {
      var raw = safeGetStorage(window.localStorage, OUTBOX_STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveToOutbox(entry) {
    var list = getOutbox();
    list.push(entry);
    if (list.length > MAX_OUTBOX_ITEMS) {
      list = list.slice(list.length - MAX_OUTBOX_ITEMS);
    }
    safeSetStorage(window.localStorage, OUTBOX_STORAGE_KEY, JSON.stringify(list));
    return list;
  }

  function updateOutboxEntryStatus(entryId, deliveryResult) {
    var list = getOutbox();
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i].id === entryId) {
        list[i].delivered = !!deliveryResult.ok;
        list[i].deliveryMode = deliveryResult.mode;
        list[i].deliveryReason = deliveryResult.reason;
        break;
      }
    }
    safeSetStorage(window.localStorage, OUTBOX_STORAGE_KEY, JSON.stringify(list));
  }

  function normalizeDiscordWebhookUrl(rawUrl) {
    var clean = String(rawUrl || "").trim();
    if (!clean) return "";
    return clean.replace(
      /^https:\/\/discordapp\.com\/api\/webhooks\//i,
      "https://discord.com/api/webhooks/"
    );
  }

  function decodeBase64Url(b64Str) {
    var clean = String(b64Str || "").trim();
    if (!clean) return "";
    try {
      if (typeof window !== "undefined" && typeof window.atob === "function") {
        return window.atob(clean).trim();
      }
      if (typeof atob === "function") {
        return atob(clean).trim();
      }
      if (typeof Buffer !== "undefined") {
        return Buffer.from(clean, "base64").toString("utf8").trim();
      }
    } catch (e) {}
    return "";
  }

  function getWebhookOverride() {
    return normalizeDiscordWebhookUrl(safeGetStorage(window.localStorage, WEBHOOK_OVERRIDE_KEY) || "");
  }

  function setWebhookOverride(url) {
    var clean = normalizeDiscordWebhookUrl(url || "");
    if (clean) {
      safeSetStorage(window.localStorage, WEBHOOK_OVERRIDE_KEY, clean);
    } else {
      safeRemoveStorage(window.localStorage, WEBHOOK_OVERRIDE_KEY);
    }
    return clean;
  }

  function getEffectiveWebhookUrl(explicitOverride) {
    var cfgFeedback = getConfig().feedback || {};
    var candidate = "";
    if (explicitOverride && String(explicitOverride).trim()) {
      candidate = String(explicitOverride).trim();
    } else {
      var storedOverride = getWebhookOverride();
      if (storedOverride) {
        candidate = storedOverride;
      } else if (cfgFeedback.discordWebhookUrl && String(cfgFeedback.discordWebhookUrl).trim()) {
        candidate = String(cfgFeedback.discordWebhookUrl).trim();
      } else if (cfgFeedback.discordWebhookB64 && String(cfgFeedback.discordWebhookB64).trim()) {
        candidate = decodeBase64Url(cfgFeedback.discordWebhookB64);
      }
    }
    return normalizeDiscordWebhookUrl(candidate);
  }

  function sendFeedback(payload, currentState) {
    payload = payload && typeof payload === "object" ? payload : {};
    track("feedback_submit", {
      stepId: payload.stepId,
      detail: payload.category || "helpful",
      state: currentState
    });

    var summaryObj = getUsabilitySummary(currentState);
    var discordPayload = buildDiscordWebhookPayload(payload, summaryObj);
    var formattedReport = buildFormattedMarkdownReport(payload, summaryObj);

    if (typeof payload.webhookOverride === "string" && payload.webhookOverride.trim()) {
      setWebhookOverride(payload.webhookOverride.trim());
    }

    var entryId = "fb-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    var outboxEntry = {
      id: entryId,
      createdAt: new Date().toISOString(),
      category: payload.category || "helpful",
      rating: payload.rating || null,
      message: payload.message || "",
      contact: payload.contact || "",
      stepId: payload.stepId || summaryObj.currentStepId,
      stepTitle: payload.stepTitle || summaryObj.currentStepTitle,
      setup: summaryObj.setup,
      usability: {
        sessionId: summaryObj.sessionId,
        totalSessionSec: summaryObj.totalSessionSec,
        currentStepDwellSec: summaryObj.currentStepDwellSec,
        stepsVisitedFormatted: summaryObj.stepsVisitedFormatted,
        counts: summaryObj.counts,
        lastBreadcrumbs: summaryObj.lastBreadcrumbs
      },
      formattedReport: formattedReport,
      discordPayload: discordPayload,
      delivered: false,
      deliveryMode: "local_saved",
      deliveryReason: "Pending delivery"
    };

    saveToOutbox(outboxEntry);

    var cfgFeedback = getConfig().feedback;
    var directWebhookUrl = getEffectiveWebhookUrl(payload.webhookOverride);

    // 1. Direct Discord Webhook URL (configured or overridden in drawer)
    if (directWebhookUrl && typeof window.fetch === "function") {
      return window.fetch(directWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordPayload)
      }).then(function (res) {
        if (res && (res.ok || res.status === 204)) {
          var okRes = {
            ok: true,
            mode: "discord",
            reason: "Sent directly to Discord channel via webhook.",
            formattedReport: formattedReport,
            discordPayload: discordPayload,
            entry: outboxEntry
          };
          updateOutboxEntryStatus(entryId, okRes);
          return okRes;
        }
        var errRes = {
          ok: false,
          mode: "local_saved",
          reason: "Discord webhook returned HTTP " + (res ? res.status : "error") + ". Saved in local outbox.",
          formattedReport: formattedReport,
          discordPayload: discordPayload,
          entry: outboxEntry
        };
        updateOutboxEntryStatus(entryId, errRes);
        return errRes;
      }).catch(function (err) {
        var failRes = {
          ok: false,
          mode: "local_saved",
          reason: "Could not reach Discord webhook (" + (err && err.message ? err.message : "network error") + "). Saved locally.",
          formattedReport: formattedReport,
          discordPayload: discordPayload,
          entry: outboxEntry
        };
        updateOutboxEntryStatus(entryId, failRes);
        return failRes;
      });
    }

    // 2. Server-side Proxy Endpoint (/api/feedback on Azure Static Web Apps)
    var isHttp = false;
    try {
      isHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
    } catch (e) {}

    var apiEndpoint = (cfgFeedback.apiEndpoint || "/api/feedback").trim();
    if (isHttp && apiEndpoint && typeof window.fetch === "function") {
      var apiBody = {
        category: outboxEntry.category,
        rating: outboxEntry.rating,
        message: outboxEntry.message,
        contact: outboxEntry.contact,
        stepId: outboxEntry.stepId,
        stepTitle: outboxEntry.stepTitle,
        setup: summaryObj.setup,
        usability: summaryObj,
        discordPayload: discordPayload
      };

      return window.fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody)
      }).then(function (res) {
        if (res && res.ok) {
          var apiOk = {
            ok: true,
            mode: "api",
            reason: "Delivered to Discord via server proxy (" + apiEndpoint + ").",
            formattedReport: formattedReport,
            discordPayload: discordPayload,
            entry: outboxEntry
          };
          updateOutboxEntryStatus(entryId, apiOk);
          return apiOk;
        }
        var apiFallback = {
          ok: false,
          mode: "local_saved",
          reason: "Saved to browser outbox (no live " + apiEndpoint + " proxy or Discord webhook configured on this host).",
          formattedReport: formattedReport,
          discordPayload: discordPayload,
          entry: outboxEntry
        };
        updateOutboxEntryStatus(entryId, apiFallback);
        return apiFallback;
      }).catch(function () {
        var netFallback = {
          ok: false,
          mode: "local_saved",
          reason: "Saved to browser outbox (offline or static host without " + apiEndpoint + ").",
          formattedReport: formattedReport,
          discordPayload: discordPayload,
          entry: outboxEntry
        };
        updateOutboxEntryStatus(entryId, netFallback);
        return netFallback;
      });
    }

    // 3. Offline / file:// without webhook override -> save locally and return immediately
    var localRes = {
      ok: false,
      mode: "local_saved",
      reason: "Saved to browser outbox. Paste a Discord Webhook URL in settings or copy the formatted Discord report below.",
      formattedReport: formattedReport,
      discordPayload: discordPayload,
      entry: outboxEntry
    };
    updateOutboxEntryStatus(entryId, localRes);
    return Promise.resolve(localRes);
  }

  /* ---------- Automatic Delegated Usability & Media Event Listeners ---------- */
  function bindAutoTelemetryListeners() {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") {
      return;
    }
    // 1. Delegated Click Listener for Key Workbench Controls
    document.addEventListener("click", function (ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== "function") return;

      var gotoBtn = target.closest("[data-goto-chamber]");
      if (gotoBtn) {
        var toStep = gotoBtn.getAttribute("data-goto-chamber");
        track("step_view", { stepId: toStep, detail: "Step " + toStep });
        return;
      }

      var compNextBtn = target.closest("[data-complete-and-next]");
      if (compNextBtn) {
        var doneStep = compNextBtn.getAttribute("data-complete-and-next");
        track("step_complete_next", { stepId: doneStep, detail: "Step " + doneStep });
        return;
      }

      var toggleCompBtn = target.closest("[data-toggle-complete-btn]");
      if (toggleCompBtn) {
        var togStep = toggleCompBtn.getAttribute("data-toggle-complete-btn");
        track("step_toggle_complete", { stepId: togStep, detail: "Step " + togStep });
        return;
      }

      var bundleBtn = target.closest("[data-download-bundle]");
      if (bundleBtn) {
        var fmt = bundleBtn.getAttribute("data-download-bundle") || "archive";
        track("download_bundle", { detail: fmt, category: "download" });
        return;
      }

      if (target.closest("#download-inspector-file-btn")) {
        var activeFilePill = document.querySelector(".file-pill.active[data-inspector-tab]");
        var fKey = activeFilePill ? activeFilePill.getAttribute("data-inspector-tab") : "file";
        track("download_file", { detail: fKey, category: "download" });
        return;
      }

      if (target.closest("#copy-inspector-file-btn")) {
        var activeFilePill2 = document.querySelector(".file-pill.active[data-inspector-tab]");
        var fKey2 = activeFilePill2 ? activeFilePill2.getAttribute("data-inspector-tab") : "file";
        track("copy_file", { detail: fKey2, category: "copy" });
        return;
      }

      if (target.closest("#stage-copy-active-btn")) {
        var activeActTab = document.querySelector(".action-tab.active[data-action-tab]");
        var actType = activeActTab ? activeActTab.getAttribute("data-action-tab") : "cli";
        if (actType === "ai") {
          track("ai_prompt_copy", { detail: "self_tap_prompt", category: "copy", tab: "ai" });
        } else if (actType === "code") {
          track("copy_code", { detail: "csharp_snippet", category: "copy" });
        } else {
          track("copy_command", { detail: "cli_command", category: "copy" });
        }
        return;
      }

      if (target.closest("#copy-notebooklm-btn")) {
        track("copy_notebooklm_script", { detail: "step0_script", category: "copy" });
        return;
      }

      if (target.closest("#copy-reset-cmd-btn")) {
        track("copy_reset_cmd", { detail: "--reset", category: "copy" });
        return;
      }

      var compTabBtn = target.closest("[data-companion-tab]");
      if (compTabBtn) {
        track("carousel_slide", {
          detail: compTabBtn.getAttribute("data-companion-tab") || "slide",
          category: "carousel"
        });
        return;
      }

      var compNavBtn = target.closest("[data-companion-nav]");
      if (compNavBtn) {
        track("carousel_nav", {
          detail: compNavBtn.getAttribute("data-companion-nav") || "nav",
          category: "carousel"
        });
        return;
      }

      if (target.closest("#companion-autoplay-btn")) {
        track("carousel_autoplay_toggle", { category: "carousel" });
        return;
      }

      var filePillBtn = target.closest("[data-inspector-tab]");
      if (filePillBtn) {
        track("inspector_file_select", {
          detail: filePillBtn.getAttribute("data-inspector-tab") || "plugin",
          category: "carousel"
        });
        return;
      }

      var actTabBtn = target.closest("[data-action-tab]");
      if (actTabBtn) {
        var chosenTab = actTabBtn.getAttribute("data-action-tab") || "cli";
        track("action_tab_select", {
          detail: chosenTab,
          category: chosenTab === "ai" ? "ai" : "ui"
        });
        return;
      }

      var presetBtn = target.closest("[data-ai-preset]");
      if (presetBtn) {
        track("ai_preset_select", {
          detail: presetBtn.getAttribute("data-ai-preset") || "explain",
          category: "ai"
        });
        return;
      }

      if (target.closest("[data-open-ai-diagnose]")) {
        track("ai_diagnose_open", { detail: "stoplight_stop", category: "ai" });
        return;
      }

      if (target.closest("[data-open-agents-file]")) {
        track("view_agents_md", { detail: "AGENTS.md", category: "carousel" });
        return;
      }

      var osBtn = target.closest("[data-set-os]");
      if (osBtn) {
        track("set_os", { detail: osBtn.getAttribute("data-set-os") || "linux" });
        return;
      }

      var personaBtn = target.closest("[data-set-persona]");
      if (personaBtn) {
        track("set_persona", { detail: personaBtn.getAttribute("data-set-persona") || "P1" });
        return;
      }

      if (target.closest("#toggle-tailor-btn") || target.closest("[data-open-tailor]")) {
        track("open_tailor_drawer");
        return;
      }

      if (target.closest("#toggle-reset-drawer-btn") || target.closest("[data-open-reset]")) {
        track("open_reset_drawer");
        return;
      }

      if (target.closest("#toggle-theme-btn")) {
        track("toggle_theme");
        return;
      }

      if (target.closest(".stoplight-stop summary")) {
        track("stoplight_issue_toggle");
      }
    });

    // 2. Capturing Media Listeners (<video> and <audio>) for Play, Progress %, and Completion
    document.addEventListener("play", function (ev) {
      var el = ev.target;
      if (!el || !el.tagName) return;
      var tag = el.tagName.toLowerCase();
      if (tag === "video" || tag === "audio") {
        track(tag + "_play", {
          detail: (el.currentSrc || el.src || tag).split("/").pop()
        });
      }
    }, true);

    document.addEventListener("timeupdate", function (ev) {
      var el = ev.target;
      if (!el || !el.tagName) return;
      var tag = el.tagName.toLowerCase();
      if ((tag === "video" || tag === "audio") && el.duration && isFinite(el.duration) && el.duration > 0) {
        var pct = Math.min(100, Math.round((el.currentTime / el.duration) * 100));
        if (pct > (session.counts.videoMaxPct || 0)) {
          session.counts.videoMaxPct = pct;
          saveSession();
        }
        var milestones = [25, 50, 75, 95];
        for (var m = 0; m < milestones.length; m++) {
          var ms = milestones[m];
          if (pct >= ms && !session.videoMilestones[tag + "_" + ms]) {
            session.videoMilestones[tag + "_" + ms] = true;
            track(tag + "_progress", { detail: ms + "%", videoPct: pct });
          }
        }
      }
    }, true);

    document.addEventListener("ended", function (ev) {
      var el = ev.target;
      if (!el || !el.tagName) return;
      var tag = el.tagName.toLowerCase();
      if (tag === "video" || tag === "audio") {
        session.counts.videoMaxPct = 100;
        track(tag + "_complete", { detail: "100%", videoPct: 100 });
      }
    }, true);

    // 3. Accrue dwell time when user hides tab or closes page
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        accrueStepDwell(null);
      } else {
        session.stepEnteredAt = Date.now();
      }
    });

    if (typeof window.addEventListener === "function") {
      window.addEventListener("beforeunload", function () {
        accrueStepDwell(null);
      });
    }
  }

  /* ---------- Initialize Telemetry Module ---------- */
  function initTelemetry() {
    loadSession();
    injectExternalAnalytics();
    bindAutoTelemetryListeners();
    var initStep = detectCurrentStepId();
    track("session_ready", {
      stepId: initStep,
      detail: detectCurrentSetup().os + "/" + detectCurrentSetup().persona
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTelemetry);
  } else {
    initTelemetry();
  }

  /* ---------- Public API on window.FOUNDRY_TELEMETRY ---------- */
  window.FOUNDRY_TELEMETRY = {
    track: track,
    getUsabilitySummary: getUsabilitySummary,
    sendFeedback: sendFeedback,
    getSession: function () {
      accrueStepDwell(null);
      return session;
    },
    getOutbox: getOutbox,
    clearOutbox: function () {
      safeRemoveStorage(window.localStorage, OUTBOX_STORAGE_KEY);
    },
    getWebhookOverride: getWebhookOverride,
    setWebhookOverride: setWebhookOverride,
    getEffectiveWebhookUrl: getEffectiveWebhookUrl,
    buildDiscordWebhookPayload: buildDiscordWebhookPayload,
    buildFormattedMarkdownReport: buildFormattedMarkdownReport,
    syncClarityTags: syncClarityTags,
    injectExternalAnalytics: injectExternalAnalytics
  };
})();
