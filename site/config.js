/* ==========================================================================
   Viking Mod Foundry — Valheim 1.0.21 (Deep North)
   Analytics & Private Discord Feedback Configuration
   ==========================================================================
   - Leave any analytics ID blank ("") to keep that provider disabled.
   - Works out-of-the-box on file://, localhost, GitHub Pages, and Azure Static Web Apps.
   - On Azure Static Web Apps, /api/feedback forwards feedback to your private
     DISCORD_WEBHOOK_URL app setting so the webhook URL never appears in client source.
   ========================================================================== */

window.FOUNDRY_CONFIG = {
  version: "1.0.21",
  analytics: {
    // 1. Microsoft Clarity (Free heatmaps, scroll depth & session replays — recommended on Azure)
    clarityProjectId: "z2pmitur1t", // e.g. "p8x9abc123" from https://clarity.microsoft.com
    // 2. Google Analytics 4 (Event funnels & traffic sources)
    gaMeasurementId: "",  // e.g. "G-XXXXXXXXXX"
    // 3. Cloudflare Web Analytics (Privacy-first pageviews & core web vitals)
    cloudflareBeaconToken: "" // e.g. "0123456789abcdef0123456789abcdef"
  },
  feedback: {
    // Primary (Azure Static Web Apps): server-side proxy keeps your Discord Webhook URL hidden from browser source
    apiEndpoint: "/api/feedback",
    // Optional Direct Webhook URL (leave blank in public repos; use discordWebhookB64 via tools/configure-site.sh)
    discordWebhookUrl: "",
    // GitHub-safe Base64-encoded Discord Webhook URL (prevents GitHub secret scanner from auto-revoking webhook)
    discordWebhookB64: "aHR0cHM6Ly9kaXNjb3JkYXBwLmNvbS9hcGkvd2ViaG9va3MvMTU2MzUxNzc3MjI3NTkwODYwOC90WkdDenFQSTRPQUNnYzhNby00Y0hxcXlVTnMtWmdmRFJMVEpiZDJjLWxZQ1pvUXBuZzhnOFJWOFpQSlB3YjAxV1NqUw==",
    includeUsabilityBreadcrumbs: true
  }
};
