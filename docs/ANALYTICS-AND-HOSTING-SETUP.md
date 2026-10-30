# Analytics, Microsoft Clarity, GA4 & Private Discord Feedback Setup Guide

> **Live Production Workbench (Azure Static Web Apps):** `https://delightful-sand-0451e171e.1.azurestaticapps.net/`  
> **GitHub Repository (`main`):** `https://github.com/djcdevelopment/valheim-modding-101`  
> **Microsoft Clarity Project ID:** `z2pmitur1t` (`https://clarity.microsoft.com/projects/view/z2pmitur1t/dashboard`)

This guide walks through the **exact screens** for **Microsoft Clarity** (session replays, heatmaps, and scroll depth), **Google Analytics 4 (GA4)**, **Azure Static Web Apps CI/CD**, and your **Private Discord Feedback Webhook** for the Viking Mod Foundry (`Valheim 1.0.21`).

---

## 1. Completing the Microsoft Clarity Screen You Have Open Right Now (2 Minutes)

On the **"Let's create your Clarity project"** modal card in your browser, fill in the three fields as follows:

| Field | What to Enter | Why / Notes |
| :--- | :--- | :--- |
| **Name** | `Valheim Modding 101 Foundry` | Display label inside your Clarity dashboard. |
| **Website URL** | `https://djcdevelopment.github.io/valheim-modding-101` *(or your Azure Static Web App / custom domain URL)* | Clarity accepts **either** your GitHub Pages URL or your Azure Static Web Apps / custom domain URL. **Importantly, Clarity does NOT block traffic if your domain changes later**—it records sessions from any host where your Project ID is loaded (including `localhost`, GitHub Pages, and Azure). Put `https://djcdevelopment.github.io/valheim-modding-101` (or your domain) right now. |
| **Website industry** | `Gaming` *(or `Technology & Computing`)* | Used only for Clarity's optional benchmark comparisons. |

Click **Add new project**.

### Next Screen: *"How do you want to install Clarity?"*

> **STOP — You do NOT need to copy-paste Microsoft's `<script>` tag into `index.html`!**
>
> Our [`site/telemetry.js`](../site/telemetry.js) already includes the official Microsoft Clarity loader **plus** automatic Valheim session tags (`os`, `persona`, `active_step`, `foundry_version`) and custom event forwarding.

All you need from Clarity is the short alphanumeric **Project ID** (for example, `q1w2e3r4t5`):

1. **Fastest way (from your browser address bar):** Look at the URL right now:
   ```text
   https://clarity.microsoft.com/projects/view/<PROJECT_ID>/gettingstarted
   ```
   Copy that `<PROJECT_ID>` segment.
2. **Or from Project Settings:** Click **Settings** (top bar) → **Overview** → copy **Project ID**.
3. **Activate it in 1 second:** Run:
   ```bash
   bash ./tools/configure-site.sh --clarity <PROJECT_ID>
   ```
   *(Or paste `<PROJECT_ID>` into `clarityProjectId` inside [`site/config.js`](../site/config.js)).*

---

## 2. Connecting Google Analytics 4 (GA4) Inside Clarity (Optional, 1 Click)

You can use Microsoft Clarity on its own, or pair it with **Google Analytics 4 (GA4)** in either (or both) of two ways:

1. **1-Click Clarity ↔ GA4 Integration (Inside Clarity):**
   - In your Clarity project, click **Settings** (gear icon) → **Setup** → under **Google Analytics integration**, click **Get Started**.
   - Sign in with your Google account and select your GA4 property. Clarity will automatically link session playbacks directly to GA4 traffic insights.
2. **Full Custom Event Funnel in `site/config.js`:**
   - If you have a GA4 Measurement ID (`G-XXXXXXXXXX`), pass it to `tools/configure-site.sh` or set `gaMeasurementId: "G-XXXXXXXXXX"` in [`site/config.js`](../site/config.js).
   - [`site/telemetry.js`](../site/telemetry.js) automatically loads `gtag.js` (`anonymize_ip: true`) and forwards every workbench milestone (`step_view`, `step_complete`, `download_bundle`, `save_single_file`, `copy_action`, `video_play`, and more) with `step_id`, `detail`, and `session_id` parameters.

---

## 3. Setting Up Your Private Discord Feedback Channel Webhook (60 Seconds)

The `[💬]` Feedback & Issue Report drawer (and the inline 👍 / 👎 step buttons at the bottom of every step) send rich, color-coded Discord embeds (`🟢 Helpful`, `🔴 Bug / Confusing Step`, `🟡 Idea / Feature Request`) along with the reader's **active step, OS, persona, dwell time, and last 8 click breadcrumbs**.

### Create the Webhook in Your Private Discord Server

1. Open your private Discord server and create a private text channel (for example, `#mod-guide-feedback`) visible only to you.
2. Click the ⚙️ **Edit Channel** gear next to the channel name → **Integrations** → **Webhooks** → **New Webhook**.
3. Name the webhook **`Viking Mod Foundry Bot`**, verify it points to `#mod-guide-feedback`, and click **Copy Webhook URL**.

### Connect Your Webhook URL (Choose Option A or Option B)

#### Option A: Recommended for Azure Static Web Apps (100% Hidden from Public Source)
When deployed to Azure Static Web Apps, the serverless proxy at [`api/feedback/index.js`](../api/feedback/index.js) (`/api/feedback`) forwards feedback server-side so your Discord Webhook URL **never** appears in client JavaScript or DevTools:

1. Open the **Azure Portal** → navigate to your **Static Web App**.
2. In the left sidebar, click **Settings → Environment variables** (or **Configuration**).
3. Click **+ Add** and set:
   - **Name:** `DISCORD_FEEDBACK_WEBHOOK_URL`
   - **Value:** `<your-copied-discord-webhook-url>`
4. Click **Apply / Save**. Our `/api/feedback` endpoint automatically picks up `DISCORD_FEEDBACK_WEBHOOK_URL`, rate-limits requests per IP (5/min), formats the embed, and posts directly to your private Discord channel.

#### Option B: For GitHub Pages or Instant Local Testing
When hosting on static GitHub Pages (which has no `/api/feedback` backend) or testing locally via `file://` / `localhost`:

- **Via CLI (`tools/configure-site.sh`):**
  ```bash
  bash ./tools/configure-site.sh --discord "https://discord.com/api/webhooks/..."
  ```
- **Or in `site/config.js`:** Paste the URL into `feedback.discordWebhookUrl`.
- **Or live in your browser (`localStorage` override):** Click `[💬]` in the top-right bar of the webpage, expand **`⚙️ Operator / Local Webhook Setup (Optional)`** at the bottom of the drawer, and paste your Discord Webhook URL there.

---

## 4. One-Line Command to Configure Everything (`tools/configure-site.sh`)

You can configure Microsoft Clarity, Google Analytics 4, Cloudflare Web Analytics, and the Discord Webhook in one command from the repository root:

```bash
# Configure Clarity + Discord + GA4 in one shot:
bash ./tools/configure-site.sh \
  --clarity "q1w2e3r4t5" \
  --discord "https://discord.com/api/webhooks/123456789/abcdef..." \
  --ga "G-XXXXXXXXXX"
```

Other helpful invocations:

```bash
# Check current active configuration in site/config.js:
bash ./tools/configure-site.sh --status

# Set only Microsoft Clarity Project ID (leaving other settings untouched):
bash ./tools/configure-site.sh --clarity "q1w2e3r4t5"

# Clear a specific setting back to "" (disabled):
bash ./tools/configure-site.sh --discord ""
```

---

## 5. What Custom Tags & Events You Can Filter By in Clarity & GA4

Every session automatically attaches custom metadata and fires granular events so you can filter recordings and funnels by **exact Valheim step, OS, and reader persona**.

### Custom Session Tags (Microsoft Clarity `Filters → Custom tags`)

| Clarity Custom Tag | Example Values | Description |
| :--- | :--- | :--- |
| `os` | `linux`, `win` | Reader's selected operating system (`Linux / SteamOS (Bash)` vs `Windows 10/11 (PowerShell)`). |
| `persona` | `P1`, `P2`, `P3`, `P4`, `P5` | Reader's background (`P1` Cross-Game Modder, `P2` Software Dev, `P3` Hobbyist w/ Goal, `P4` Explorer, `P5` 0.217 Veteran). |
| `active_step` | `step_0` … `step_8` | The current step chamber the reader is viewing when the session/event occurs. |
| `foundry_version` | `1.0.21` | Guide release version from `window.FOUNDRY_CONFIG.version`. |

### Custom Events (Clarity Smart Events & GA4 Event Funnel)

| Event Name | Triggered When | Key `detail` / Payload Values |
| :--- | :--- | :--- |
| `step_view` | Reader switches to a step (0–8) via top stepper, TOC, or Next/Prev buttons | `STEP 0` … `STEP 8` (`step_id`: `0`–`8`) |
| `step_complete` | Reader marks a step completed or clicks **Complete Step & Continue** | `completed`, `uncompleted`, `complete_and_next` |
| `carousel_slide` | Reader switches slides or clicks Prev/Next in the visual architecture carousel | Slide key (`slide_0`, `slide_1`, etc.) |
| `download_bundle` | Reader downloads the full 5-file starter archive in the footer bar | `tar.gz` (Linux) or `zip` (Windows) |
| `save_single_file` | Reader clicks `[💾 Save File]` on a single tab in the 5-File Inspector | Filename (`HelloValheim.cs`, `HelloValheim.csproj`, `AGENTS.md`, etc.) |
| `copy_action` | Reader copies a CLI command, C# snippet, AI prompt, file, or `--reset` command | `stage_cli`, `stage_code`, `stage_ai`, `file_plugin`, `reset_cmd`, `notebooklm_script`, `ai_drawer` |
| `video_play` | Reader plays the Step 0 MP4 walkthrough video | Video filename / `step0_overview` |
| `step_quick_feedback` | Reader clicks 👍 (`Yes, worked`) or 👎 (`Confusing / Bug`) at the bottom of a step | `helpful` or `bug` |
| `stop_issue_expand` | Reader expands a red `STOP` troubleshooting accordion item | Issue summary title |
| `file_inspect` | Reader selects one of the 5 starter file pills (`plugin`, `csproj`, `manifest`, `script`, `agents`) | `plugin`, `csproj`, `manifest`, `script`, `agents` |
| `media_mode_switch` | Reader switches between Video Walkthrough, Audio Podcast, and Visual Slides | `video`, `audio`, `slides` |
| `setup_change` | Reader toggles OS, Persona, or Action Tab (`CLI` / `C#` / `AI Prompt`) | `os:linux`, `os:win`, `persona:P1`, `actionTab:cli` |
| `feedback_submit` | Reader submits the `[💬]` feedback drawer or inline quick rating | `helpful`, `bug`, `idea` |
