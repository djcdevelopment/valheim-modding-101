/* ==========================================================================
   Viking Mod Foundry — Valheim 1.0.20 (Deep North)
   Analytics & Private Discord Feedback Configuration
   ==========================================================================
   - Leave any analytics ID blank ("") to keep that provider disabled.
   - Works out-of-the-box on file://, localhost, GitHub Pages, and Azure Static Web Apps.
   - On Azure Static Web Apps, /api/feedback forwards feedback to your private
     DISCORD_WEBHOOK_URL app setting so the webhook URL never appears in client source.
   ========================================================================== */

window.FOUNDRY_CONFIG = {
  version: "1.0.20",
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
    // Optional Direct Webhook URL (for static hosting / GitHub Pages or local testing without /api/feedback)
    discordWebhookUrl: "",
    includeUsabilityBreadcrumbs: true
  }
};
