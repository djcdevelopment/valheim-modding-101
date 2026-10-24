#!/usr/bin/env node
/**
 * Zero-Prompt Azure Static Web Apps Provisioner & Deployer
 * - Opens browser SSO login (http://localhost:31337) or Device Code fallback
 * - Provisions Resource Group `rg-valheim-modding-101` (West US 2)
 * - Provisions Static Web App `valheim-modding-101` (Free SKU)
 * - Configures server-side DISCORD_FEEDBACK_WEBHOOK_URL app setting for /api/feedback
 * - Deploys ./site + ./api (Node 20) to Production via `swa deploy`
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const HOME_DIR = os.homedir();

const SWA_NM = path.join(HOME_DIR, ".local/node/lib/node_modules/@azure/static-web-apps-cli/node_modules");
const requireSwa = createRequire(path.join(SWA_NM, "noop.js"));

const {
  InteractiveBrowserCredential,
  DeviceCodeCredential,
  ChainedTokenCredential
} = requireSwa("@azure/identity");
const { SubscriptionClient } = requireSwa("@azure/arm-subscriptions");
const { ResourceManagementClient } = requireSwa("@azure/arm-resources");
const { WebSiteManagementClient } = requireSwa("@azure/arm-appservice");

const RESOURCE_GROUP = process.env.AZURE_RESOURCE_GROUP || "rg-valheim-modding-101";
const APP_NAME = process.env.AZURE_SWA_NAME || "valheim-modding-101";
const LOCATION = process.env.AZURE_LOCATION || "West US 2";
const ARM_SCOPE = "https://management.azure.com/.default";

function readDecodedWebhookFromConfig() {
  try {
    const cfgPath = path.join(REPO_ROOT, "site", "config.js");
    const src = fs.readFileSync(cfgPath, "utf8");
    const m = src.match(/discordWebhookB64:\s*"([^"]+)"/);
    if (m && m[1]) {
      return Buffer.from(m[1], "base64")
        .toString("utf8")
        .trim()
        .replace(/^https:\/\/(?:ptb\.|canary\.)?discordapp\.com\/api\/webhooks\//i, "https://discord.com/api/webhooks/");
    }
  } catch (_) {}
  return "";
}

async function loginViaLocalhostPkce(tenantId = "common") {
  const clientId = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";
  const port = 31337;
  const redirectUri = `http://localhost:${port}`;
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, redirectUri);
      const authCode = u.searchParams.get("code");
      const err = u.searchParams.get("error_description") || u.searchParams.get("error");
      if (authCode) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Connection": "close" });
        res.end("<html><body style='background:#12151c;color:#f3efea;font-family:sans-serif;padding:40px;text-align:center'><h2>✅ Azure Connected!</h2><p>Deploying Valheim Modding 101 to Azure Static Web Apps now — you can close this tab.</p><script>setTimeout(()=>window.close(),1000)</script></body></html>");
        if (typeof server.closeAllConnections === "function") server.closeAllConnections();
        server.close();
        resolve(authCode);
      } else if (err) {
        res.writeHead(400, { "Content-Type": "text/plain", "Connection": "close" });
        res.end(`Azure Auth Error: ${err}`);
        if (typeof server.closeAllConnections === "function") server.closeAllConnections();
        server.close();
        reject(new Error(err));
      } else {
        res.writeHead(204, { "Connection": "close" });
        res.end();
      }
    });

    server.listen(port, "127.0.0.1", () => {
      const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
      authUrl.searchParams.set("client_id", clientId);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", `${ARM_SCOPE} offline_access`);
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      try {
        const defTokFile = path.join(REPO_ROOT, ".env.azure-token-default.json");
        if (fs.existsSync(defTokFile)) {
          const defTok = JSON.parse(fs.readFileSync(defTokFile, "utf8"));
          const jwtPayload = JSON.parse(Buffer.from(defTok.token.split(".")[1], "base64").toString("utf8"));
          const hint = jwtPayload.email || (jwtPayload.unique_name || "").replace(/^live\.com#/, "");
          if (hint) authUrl.searchParams.set("login_hint", hint);
        }
      } catch (_) {}

      console.log(`🔐 Opening browser SSO for tenant ${tenantId}...`);
      try {
        const openBrowser = spawn("xdg-open", [authUrl.toString()], {
          detached: true,
          stdio: "ignore"
        });
        openBrowser.unref();
      } catch (_) {}
    });
  });

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    scope: `${ARM_SCOPE} offline_access`
  });

  const resp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(`Token exchange failed: ${data.error_description || data.error || resp.status}`);
  }
  if (data.refresh_token) {
    try {
      fs.writeFileSync(path.join(REPO_ROOT, ".env.azure-refresh-token"), data.refresh_token, { mode: 0o600 });
    } catch (_) {}
  }
  return {
    token: data.access_token,
    refreshToken: data.refresh_token || "",
    expiresOnTimestamp: Date.now() + (Number(data.expires_in) || 3599) * 1000
  };
}

async function tryRefreshTokenForTenant(tenantId) {
  const rtPath = path.join(REPO_ROOT, ".env.azure-refresh-token");
  if (!fs.existsSync(rtPath)) return null;
  const refreshToken = fs.readFileSync(rtPath, "utf8").trim();
  if (!refreshToken) return null;

  const body = new URLSearchParams({
    client_id: "04b07795-8ddb-461a-bbee-02f9e1bf7b46",
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: `${ARM_SCOPE} offline_access`
  });
  const resp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) return null;
  if (data.refresh_token) {
    try {
      fs.writeFileSync(rtPath, data.refresh_token, { mode: 0o600 });
    } catch (_) {}
  }
  return {
    token: data.access_token,
    expiresOnTimestamp: Date.now() + (Number(data.expires_in) || 3599) * 1000
  };
}

async function getAzureCredential(tenantId) {
  const cacheFile = path.join(REPO_ROOT, `.env.azure-token-${tenantId || "default"}.json`);
  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (cached && cached.token && cached.expiresOnTimestamp > Date.now() + 120000) {
        console.log(`✅ Reusing cached Azure token${tenantId ? ` (tenant ${tenantId})` : ""}!`);
        return {
          getToken: async () => cached
        };
      }
    } catch (_) {}
  }

  const refreshed = await tryRefreshTokenForTenant(tenantId || "common");
  if (refreshed) {
    fs.writeFileSync(cacheFile, JSON.stringify(refreshed), { mode: 0o600 });
    console.log(`✅ Silently exchanged refresh token for tenant ${tenantId || "common"}!`);
    return {
      getToken: async () => refreshed
    };
  }

  const tokenResp = await loginViaLocalhostPkce(tenantId || "common");
  fs.writeFileSync(cacheFile, JSON.stringify(tokenResp), { mode: 0o600 });
  console.log("✅ Authenticated with Azure (token cached for all API calls)!");
  return {
    getToken: async () => tokenResp
  };
}

async function resolveCredentialAndSubscription() {
  let credential = await getAzureCredential(process.env.AZURE_TENANT_ID);
  let subClient = new SubscriptionClient(credential);
  let subs = [];
  for await (const s of subClient.subscriptions.list()) {
    subs.push(s);
  }
  if (subs.length === 0) {
    const tenants = [];
    for await (const t of subClient.tenants.list()) {
      tenants.push(t);
    }
    for (const t of tenants) {
      if (!t.tenantId) continue;
      console.log(`🔄 Checking Azure tenant ${t.displayName || t.tenantId}...`);
      const tenantCred = await getAzureCredential(t.tenantId);
      const tSubClient = new SubscriptionClient(tenantCred);
      const tSubs = [];
      for await (const s of tSubClient.subscriptions.list()) {
        tSubs.push(s);
      }
      if (tSubs.length > 0) {
        credential = tenantCred;
        subs = tSubs;
        break;
      }
    }
  }
  if (subs.length === 0) {
    throw new Error("No Azure subscriptions found in your Microsoft account. Make sure your account has an active Azure Subscription (e.g., Pay-As-You-Go or Free Trial) in portal.azure.com.");
  }
  const enabledSub = subs.find((s) => s.state === "Enabled") || subs[0];
  console.log(`📌 Using Azure Subscription: ${enabledSub.displayName} (${enabledSub.subscriptionId})`);
  return { credential, subscriptionId: enabledSub.subscriptionId };
}

function runSwaDeploy(deploymentToken) {
  return new Promise((resolve, reject) => {
    const swaBin = path.join(HOME_DIR, ".local/bin/swa");
    const args = [
      "deploy",
      "./site",
      "--api-location",
      "./api",
      "--api-language",
      "node",
      "--api-version",
      "20",
      "--env",
      "production",
      "--deployment-token",
      deploymentToken
    ];
    console.log(`\n🚀 Deploying ./site + ./api to Azure Static Web Apps (${APP_NAME})...`);
    const child = spawn(swaBin, args, {
      cwd: REPO_ROOT,
      stdio: "inherit",
      env: { ...process.env }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`swa deploy exited with code ${code}`));
    });
  });
}

async function main() {
  const { credential, subscriptionId } = await resolveCredentialAndSubscription();

  const resourceClient = new ResourceManagementClient(credential, subscriptionId);
  console.log(`📦 Ensuring Resource Group '${RESOURCE_GROUP}' in ${LOCATION}...`);
  await resourceClient.resourceGroups.createOrUpdate(RESOURCE_GROUP, {
    location: LOCATION
  });

  const websiteClient = new WebSiteManagementClient(credential, subscriptionId);
  console.log(`🌐 Ensuring Azure Static Web App '${APP_NAME}' (Free SKU) in ${LOCATION}...`);
  const siteResult = await websiteClient.staticSites.beginCreateOrUpdateStaticSiteAndWait(
    RESOURCE_GROUP,
    APP_NAME,
    {
      location: LOCATION,
      sku: { name: "Free", tier: "Free" },
      buildProperties: {
        appLocation: "/site",
        apiLocation: "/api",
        outputLocation: "."
      }
    }
  );

  const defaultHostname = siteResult.defaultHostname || `${APP_NAME}.azurestaticapps.net`;
  const liveUrl = `https://${defaultHostname}`;
  console.log(`✅ Static Web App ready: ${liveUrl}`);

  const webhookUrl = readDecodedWebhookFromConfig();
  if (webhookUrl) {
    try {
      console.log("🔒 Configuring server-side DISCORD_FEEDBACK_WEBHOOK_URL on Azure Static Web App...");
      await websiteClient.staticSites.createOrUpdateStaticSiteAppSettings(RESOURCE_GROUP, APP_NAME, {
        properties: {
          DISCORD_FEEDBACK_WEBHOOK_URL: webhookUrl
        }
      });
      console.log("✅ Server-side DISCORD_FEEDBACK_WEBHOOK_URL configured on /api/feedback!");
    } catch (appSetErr) {
      console.warn("⚠️ Note: Could not set StaticSiteAppSettings prior to first functions deploy:", appSetErr.message);
    }
  }

  console.log("🔑 Fetching Static Web App deployment token...");
  const secrets = await websiteClient.staticSites.listStaticSiteSecrets(RESOURCE_GROUP, APP_NAME);
  const deploymentToken = secrets?.properties?.apiKey;
  if (!deploymentToken) {
    throw new Error("Could not retrieve deployment token from Azure Static Web App.");
  }

  // Save non-secret metadata + gitignored .env
  const envPath = path.join(REPO_ROOT, ".env");
  fs.writeFileSync(
    envPath,
    `AZURE_SUBSCRIPTION_ID=${subscriptionId}\nAZURE_RESOURCE_GROUP=${RESOURCE_GROUP}\nAZURE_SWA_NAME=${APP_NAME}\nAZURE_SWA_DEFAULT_HOSTNAME=${defaultHostname}\nSWA_CLI_DEPLOYMENT_TOKEN=${deploymentToken}\n`,
    { mode: 0o600 }
  );

  // Sync deployment token to GitHub Actions secret if repo remote exists
  try {
    const ghSecret = spawn(path.join(HOME_DIR, ".local/bin/gh"), ["secret", "set", "AZURE_STATIC_WEB_APPS_API_TOKEN", "--body", deploymentToken], {
      cwd: REPO_ROOT,
      stdio: "ignore"
    });
    ghSecret.on("error", () => {});
  } catch (_) {}

  await runSwaDeploy(deploymentToken);

  if (webhookUrl) {
    try {
      await websiteClient.staticSites.createOrUpdateStaticSiteAppSettings(RESOURCE_GROUP, APP_NAME, {
        properties: {
          DISCORD_FEEDBACK_WEBHOOK_URL: webhookUrl
        }
      });
    } catch (_) {}

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Viking Mod Foundry — Azure Deploy",
          embeds: [
            {
              title: "🚀 Valheim Modding 101 Published to Azure Static Web Apps",
              url: liveUrl,
              color: 0x3fb950,
              description: `Your interactive workbench (**v3.7**) and serverless feedback proxy (\`/api/feedback\`) are now live on Azure!`,
              fields: [
                { name: "🌐 Production URL", value: liveUrl, inline: false },
                { name: "📊 Microsoft Clarity", value: "`z2pmitur1t` (Session Replays + Heatmaps Active)", inline: true },
                { name: "💬 Feedback Endpoint", value: `\`${liveUrl}/api/feedback\` (Connected)`, inline: true }
              ],
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    } catch (_) {}
  }

  console.log("\n========================================================");
  console.log(`🎉 LIVE ON AZURE STATIC WEB APPS: ${liveUrl}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("❌ Azure deployment failed:", err);
  process.exit(1);
});
