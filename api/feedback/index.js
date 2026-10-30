"use strict";

const https = require("https");
const { URL } = require("url");

// Per-instance sliding-window rate limiter (IP -> array of timestamps in ms)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;      // Max 5 submissions per IP per minute
const MAX_PAYLOAD_BYTES = 16 * 1024;    // 16 KB max body size
const ipRequestLog = new Map();

function getClientIp(req) {
  const headers = (req && req.headers) || {};
  const xff = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (xff && typeof xff === "string") {
    return xff.split(",")[0].trim();
  }
  return (
    headers["x-client-ip"] ||
    headers["client-ip"] ||
    "unknown"
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  // Prune stale entries occasionally to keep memory bounded
  if (ipRequestLog.size > 500) {
    for (const [key, timestamps] of ipRequestLog.entries()) {
      const fresh = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) {
        ipRequestLog.delete(key);
      } else {
        ipRequestLog.set(key, fresh);
      }
    }
  }

  const history = (ipRequestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (history.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestLog.set(ip, history);
    return true;
  }
  history.push(now);
  ipRequestLog.set(ip, history);
  return false;
}

function truncate(str, maxLen) {
  const clean = String(str == null ? "" : str).trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + "...";
}

function formatBreadcrumbs(rawBreadcrumbs) {
  if (!rawBreadcrumbs) return "*(No breadcrumb trail attached)*";
  if (typeof rawBreadcrumbs === "string") {
    return truncate(rawBreadcrumbs, 1000) || "*(Empty trail)*";
  }
  if (Array.isArray(rawBreadcrumbs)) {
    if (rawBreadcrumbs.length === 0) return "*(Empty trail)*";
    const lines = rawBreadcrumbs.slice(-15).map((item, idx) => {
      if (typeof item === "string") {
        return `${idx + 1}. ${item}`;
      }
      if (item && typeof item === "object") {
        const timePart = item.time || item.t || item.ts || item.elapsed || "";
        const actionPart = item.action || item.event || item.type || item.label || "event";
        const detailPart = item.detail || item.target || item.step || item.chamber || item.value || "";
        return (
          `${idx + 1}. ` +
          (timePart ? `[${timePart}] ` : "") +
          `${actionPart}` +
          (detailPart ? ` (${detailPart})` : "")
        );
      }
      return `${idx + 1}. ${String(item)}`;
    });
    return truncate("```text\n" + lines.join("\n") + "\n```", 1020);
  }
  return truncate(JSON.stringify(rawBreadcrumbs), 1000);
}

function pickColorForCategory(category) {
  const cat = String(category || "").toLowerCase();
  if (cat.includes("bug") || cat.includes("error") || cat.includes("broken") || cat.includes("stuck")) {
    return 0xe05a47; // Ember red
  }
  if (cat.includes("confus") || cat.includes("question") || cat.includes("friction")) {
    return 0xd99b26; // Hearth amber
  }
  if (cat.includes("win") || cat.includes("praise") || cat.includes("love") || cat.includes("worked")) {
    return 0x4ca771; // Stoplight green
  }
  return 0x5865f2; // Discord blurple default
}

function buildDiscordPayload(body, req) {
  // Extract structured fields sent by site/telemetry.js or generic JSON clients
  const setup = (body && body.setup && typeof body.setup === "object") ? body.setup : {};
  const usability = (body && body.usability && typeof body.usability === "object") ? body.usability : {};

  const rawMessage =
    body.message ||
    body.comment ||
    body.feedback ||
    body.text ||
    body.description ||
    "";

  if (!rawMessage && !body.category && !body.rating) {
    if (body.discordPayload && Array.isArray(body.discordPayload.embeds)) {
      return {
        username: truncate(body.discordPayload.username || "Viking Mod Foundry · Feedback", 80),
        embeds: body.discordPayload.embeds.slice(0, 3)
      };
    }
    if (Array.isArray(body.embeds) && body.embeds.length > 0) {
      return {
        username: truncate(body.username || "Viking Mod Foundry · Feedback", 80),
        embeds: body.embeds.slice(0, 3)
      };
    }
  }

  const category = truncate(
    body.category || body.type || body.sentiment || body.topic || "General Feedback",
    80
  );
  const step = truncate(
    body.stepTitle ||
      setup.stepTitle ||
      body.step ||
      body.stepLabel ||
      (body.stepId != null ? `Step ${body.stepId}` : "") ||
      body.chamberId ||
      body.activeChamberId ||
      "Step 0: Picture Overview",
    100
  );
  const osLabel = truncate(
    setup.osLabel || body.os || setup.os || body.platform || "unknown",
    50
  );
  const personaLabel = truncate(
    setup.personaLabel || body.persona || setup.persona || "P1",
    60
  );
  const dwellSuffix =
    usability.currentStepDwellSec != null ? ` (\`${usability.currentStepDwellSec}s\` dwell)` : "";

  const progress = truncate(
    usability.stepsVisitedFormatted ||
      body.progress ||
      body.completedSummary ||
      (Array.isArray(body.completedSteps)
        ? `${body.completedSteps.length}/9 steps`
        : body.completedCount != null
          ? `${body.completedCount}/9 steps`
          : "Step 0"),
    200
  );
  const contact = truncate(
    body.contact || body.discord || body.handle || body.author || "",
    100
  );
  const rating = body.rating != null ? truncate(String(body.rating), 40) : "";
  const version = truncate(body.version || "1.0.21", 32);
  const sessionId = truncate(usability.sessionId || body.sessionId || "web", 32);
  const pageUrl = truncate(
    body.url || body.pageUrl || (req.headers && req.headers.referer) || "azure-swa",
    200
  );

  const rawTrail =
    body.breadcrumbs ||
    body.usabilityBreadcrumbs ||
    usability.lastBreadcrumbs ||
    usability.breadcrumbs ||
    usability.text ||
    body.trail ||
    body.events;
  const breadcrumbsText = formatBreadcrumbs(rawTrail);

  const fields = [
    {
      name: "📍 Active Step",
      value: `${step}${dwellSuffix}`,
      inline: true
    },
    {
      name: "🖥️ Reader Setup",
      value: `${osLabel}\n${personaLabel}`,
      inline: true
    }
  ];

  if (contact || rating) {
    const metaLines = [];
    if (rating) metaLines.push(`Rating: **${rating}**`);
    if (contact) metaLines.push(`Contact: \`${contact}\``);
    fields.push({
      name: "👤 Reader Meta",
      value: metaLines.join("\n"),
      inline: true
    });
  }

  if (usability.counts && typeof usability.counts === "object") {
    const c = usability.counts;
    const statsVal =
      `**Steps Visited:** ${progress}\n` +
      `**Actions:** \`${c.copies || 0}\` copies · \`${c.downloads || 0}\` downloads · ` +
      `\`${c.aiPrompts || 0}\` AI prompts · \`${c.carouselClicks || 0}\` file/slide clicks · ` +
      `Video max \`${usability.videoMaxPct || c.videoMaxPct || 0}%\``;
    fields.push({
      name: `📊 Session Telemetry (${usability.totalSessionSec || 0}s total)`,
      value: truncate(statsVal, 1020),
      inline: false
    });
  } else {
    fields.push({
      name: "✅ Steps Visited / Progress",
      value: progress,
      inline: true
    });
  }

  if (body.errorSnippet || body.logSnippet) {
    fields.push({
      name: "🩺 Attached Error / LogOutput.log",
      value: truncate("```text\n" + (body.errorSnippet || body.logSnippet) + "\n```", 1020),
      inline: false
    });
  }

  fields.push({
    name: "🧭 Usability Breadcrumb Trail",
    value: breadcrumbsText,
    inline: false
  });

  return {
    username: "Viking Mod Foundry · Feedback",
    embeds: [
      {
        title: `🛡️ [${category}] — ${step}`,
        description: truncate(
          rawMessage || "(Quick rating submitted without extra comment)",
          1800
        ),
        color: pickColorForCategory(category),
        fields,
        footer: {
          text: `Viking Mod Foundry v${version} · Session ${sessionId} · ${pageUrl}`
        },
        timestamp: new Date().toISOString()
      }
    ]
  };
}

function postJsonToWebhook(webhookUrlStr, payloadObj) {
  return new Promise((resolve, reject) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(webhookUrlStr);
    } catch (err) {
      return reject(new Error("Invalid webhook URL syntax"));
    }

    const data = Buffer.from(JSON.stringify(payloadObj), "utf8");
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        "User-Agent": "ValheimModding101-AzureProxy/1.0.21"
      },
      timeout: 8000
    };

    const request = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 500,
          body: responseBody
        });
      });
    });

    request.on("error", (err) => reject(err));
    request.on("timeout", () => {
      request.destroy(new Error("Discord webhook request timed out"));
    });

    request.write(data);
    request.end();
  });
}

module.exports = async function (context, req) {
  const corsHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // Handle CORS preflight
  if (req && req.method && req.method.toUpperCase() === "OPTIONS") {
    context.res = {
      status: 204,
      headers: corsHeaders,
      body: ""
    };
    return;
  }

  // 1. Check rate limit per client IP
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    context.res = {
      status: 429,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "Rate limit exceeded. Please wait a minute before sending another feedback note."
      })
    };
    return;
  }

  // 2. Validate payload size and JSON structure
  const rawBodyStr =
    typeof req.rawBody === "string"
      ? req.rawBody
      : req.body
        ? JSON.stringify(req.body)
        : "";

  if (Buffer.byteLength(rawBodyStr, "utf8") > MAX_PAYLOAD_BYTES) {
    context.res = {
      status: 413,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "Feedback payload exceeds 16 KB limit."
      })
    };
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (err) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: "Invalid JSON payload."
        })
      };
      return;
    }
  }

  if (!body || typeof body !== "object") {
    context.res = {
      status: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "Missing feedback body."
      })
    };
    return;
  }

  const hasText = Boolean(
    (body.message && String(body.message).trim()) ||
      (body.comment && String(body.comment).trim()) ||
      (body.feedback && String(body.feedback).trim()) ||
      (body.text && String(body.text).trim()) ||
      (body.rating && String(body.rating).trim()) ||
      (body.discordPayload && Array.isArray(body.discordPayload.embeds) && body.discordPayload.embeds.length > 0) ||
      (Array.isArray(body.embeds) && body.embeds.length > 0)
  );

  if (!hasText) {
    context.res = {
      status: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "Please include a feedback message before submitting."
      })
    };
    return;
  }

  // 3. Read private Discord webhook URL (or Base64-encoded webhook) from Azure environment settings
  let rawWebhookSetting = (
    process.env.DISCORD_FEEDBACK_WEBHOOK_URL ||
    process.env.DISCORD_WEBHOOK_URL ||
    process.env.DISCORD_FEEDBACK_WEBHOOK_B64 ||
    process.env.DISCORD_WEBHOOK_B64 ||
    ""
  ).trim();

  if (rawWebhookSetting && !rawWebhookSetting.startsWith("https://")) {
    try {
      const decoded = Buffer.from(rawWebhookSetting, "base64").toString("utf8").trim();
      if (decoded.startsWith("https://")) {
        rawWebhookSetting = decoded;
      }
    } catch (e) {}
  }

  const webhookUrl = rawWebhookSetting.replace(
    /^https:\/\/discordapp\.com\/api\/webhooks\//i,
    "https://discord.com/api/webhooks/"
  );

  if (!webhookUrl) {
    if (context.log && context.log.warn) {
      context.log.warn(
        "DISCORD_FEEDBACK_WEBHOOK_URL is not configured in Azure Static Web Apps Application Settings."
      );
    }
    context.res = {
      status: 503,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error:
          "Server feedback webhook is not configured yet (set DISCORD_FEEDBACK_WEBHOOK_URL in Azure Application Settings)."
      })
    };
    return;
  }

  if (
    !webhookUrl.startsWith("https://discord.com/api/webhooks/") &&
    !webhookUrl.startsWith("https://discordapp.com/api/webhooks/")
  ) {
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "Configured DISCORD_FEEDBACK_WEBHOOK_URL is not a valid Discord webhook URL."
      })
    };
    return;
  }

  // 4. Format and send Discord embed
  try {
    const discordPayload = buildDiscordPayload(body, req);
    const result = await postJsonToWebhook(webhookUrl, discordPayload);

    if (result.statusCode >= 200 && result.statusCode < 300) {
      context.res = {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: true,
          message: "Feedback delivered to Discord."
        })
      };
      return;
    }

    if (context.log && context.log.error) {
      context.log.error(
        `Discord webhook returned HTTP ${result.statusCode}: ${result.body}`
      );
    }
    context.res = {
      status: 502,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: `Discord webhook returned HTTP ${result.statusCode}.`
      })
    };
  } catch (err) {
    if (context.log && context.log.error) {
      context.log.error("Failed to send feedback to Discord:", err);
    }
    context.res = {
      status: 502,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "Failed to reach Discord webhook endpoint."
      })
    };
  }
};
