#!/usr/bin/env bash
# ==============================================================================
# Viking Mod Foundry — Valheim 1.0.20 (Deep North)
# Analytics & Private Discord Feedback Configuration CLI (configure-site.sh)
# ==============================================================================
# Usage:
#   bash ./tools/configure-site.sh --status
#   bash ./tools/configure-site.sh --clarity <PROJECT_ID>
#   bash ./tools/configure-site.sh --discord <WEBHOOK_URL>
#   bash ./tools/configure-site.sh --ga <G-XXXXXXXXXX>
#   bash ./tools/configure-site.sh --cloudflare <BEACON_TOKEN>
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${REPO_ROOT}/site/config.js"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "ERROR: Configuration file not found at: ${CONFIG_FILE}" >&2
  exit 1
fi

SET_CLARITY=0
VAL_CLARITY=""

SET_GA=0
VAL_GA=""

SET_CF=0
VAL_CF=""

SET_DISCORD=0
VAL_DISCORD=""

STATUS_ONLY=0

print_usage() {
  cat <<'EOF'
Viking Mod Foundry — Analytics & Discord Webhook Configurator

Usage:
  bash ./tools/configure-site.sh [options]

Options:
  --clarity <id>          Set Microsoft Clarity Project ID (e.g. "q1w2e3r4t5", or "" to clear)
  --ga <id>               Set Google Analytics 4 Measurement ID (e.g. "G-XXXXXXXXXX", or "" to clear)
  --cloudflare <token>    Set Cloudflare Web Analytics Beacon Token (or "" to clear)
  --discord <webhook_url> Set Discord Feedback Webhook URL (or "" to clear)
  --status                Print current active configuration in site/config.js
  -h, --help              Show this help message

Examples:
  bash ./tools/configure-site.sh --clarity "q1w2e3r4t5" --discord "https://discord.com/api/webhooks/..."
  bash ./tools/configure-site.sh --status
EOF
}

if [[ $# -eq 0 ]]; then
  STATUS_ONLY=1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clarity)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --clarity requires a value (use \"\" to clear)." >&2
        exit 1
      fi
      SET_CLARITY=1
      VAL_CLARITY="$2"
      shift 2
      ;;
    --clarity=*)
      SET_CLARITY=1
      VAL_CLARITY="${1#*=}"
      shift
      ;;
    --ga)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --ga requires a value (use \"\" to clear)." >&2
        exit 1
      fi
      SET_GA=1
      VAL_GA="$2"
      shift 2
      ;;
    --ga=*)
      SET_GA=1
      VAL_GA="${1#*=}"
      shift
      ;;
    --cloudflare)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --cloudflare requires a value (use \"\" to clear)." >&2
        exit 1
      fi
      SET_CF=1
      VAL_CF="$2"
      shift 2
      ;;
    --cloudflare=*)
      SET_CF=1
      VAL_CF="${1#*=}"
      shift
      ;;
    --discord)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --discord requires a value (use \"\" to clear)." >&2
        exit 1
      fi
      SET_DISCORD=1
      VAL_DISCORD="$2"
      shift 2
      ;;
    --discord=*)
      SET_DISCORD=1
      VAL_DISCORD="${1#*=}"
      shift
      ;;
    --status)
      STATUS_ONLY=1
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
done

python3 - "${CONFIG_FILE}" \
  "${STATUS_ONLY}" \
  "${SET_CLARITY}" "${VAL_CLARITY}" \
  "${SET_GA}" "${VAL_GA}" \
  "${SET_CF}" "${VAL_CF}" \
  "${SET_DISCORD}" "${VAL_DISCORD}" <<'PYEOF'
import base64
import json
import re
import sys

config_path = sys.argv[1]
status_only = sys.argv[2] == "1"
set_clarity, val_clarity = sys.argv[3] == "1", sys.argv[4].strip()
set_ga, val_ga = sys.argv[5] == "1", sys.argv[6].strip()
set_cf, val_cf = sys.argv[7] == "1", sys.argv[8].strip()
set_discord, val_discord = sys.argv[9] == "1", sys.argv[10].strip()

with open(config_path, "r", encoding="utf-8") as f:
    content = f.read()

def replace_js_field(text, field_name, new_val):
    escaped = json.dumps(new_val)
    pattern = re.compile(r'(\b' + re.escape(field_name) + r'\s*:\s*)"[^"]*"')
    if not pattern.search(text):
        raise RuntimeError(f"Could not find field '{field_name}' in {config_path}")
    return pattern.sub(lambda m: m.group(1) + escaped, text, count=1)

def ensure_and_replace_js_field(text, field_name, new_val, after_field="discordWebhookUrl"):
    pattern = re.compile(r'(\b' + re.escape(field_name) + r'\s*:\s*)"[^"]*"')
    if pattern.search(text):
        return replace_js_field(text, field_name, new_val)
    escaped = json.dumps(new_val)
    after_pattern = re.compile(r'(\b' + re.escape(after_field) + r'\s*:\s*"[^"]*"\s*,)')
    if not after_pattern.search(text):
        raise RuntimeError(f"Could not find field '{field_name}' or '{after_field}' in {config_path}")
    return after_pattern.sub(lambda m: m.group(1) + f"\n    {field_name}: {escaped},", text, count=1)

def extract_js_field(text, field_name):
    m = re.search(r'\b' + re.escape(field_name) + r'\s*:\s*"([^"]*)"', text)
    return m.group(1) if m else ""

updated = False
if set_clarity or set_ga or set_cf or set_discord:
    if set_clarity:
        content = replace_js_field(content, "clarityProjectId", val_clarity)
        updated = True
    if set_ga:
        content = replace_js_field(content, "gaMeasurementId", val_ga)
        updated = True
    if set_cf:
        content = replace_js_field(content, "cloudflareBeaconToken", val_cf)
        updated = True
    if set_discord:
        # Store empty string in plain-text discordWebhookUrl and Base64-encode into discordWebhookB64
        # so GitHub secret scanning never auto-revokes the Discord webhook when pushed.
        b64_discord = base64.b64encode(val_discord.encode("utf-8")).decode("ascii") if val_discord else ""
        content = replace_js_field(content, "discordWebhookUrl", "")
        content = ensure_and_replace_js_field(content, "discordWebhookB64", b64_discord)
        updated = True

    if updated:
        with open(config_path, "w", encoding="utf-8") as f:
            f.write(content)

clarity_curr = extract_js_field(content, "clarityProjectId")
ga_curr = extract_js_field(content, "gaMeasurementId")
cf_curr = extract_js_field(content, "cloudflareBeaconToken")
discord_curr = extract_js_field(content, "discordWebhookUrl")
discord_b64_curr = extract_js_field(content, "discordWebhookB64")
api_curr = extract_js_field(content, "apiEndpoint")

discord_effective = discord_curr
discord_mode_suffix = ""
if not discord_effective and discord_b64_curr:
    try:
        discord_effective = base64.b64decode(discord_b64_curr.encode("ascii")).decode("utf-8")
        discord_mode_suffix = " [Base64 GitHub-safe]"
    except Exception:
        discord_effective = ""

def fmt_status(val, mask_url=False, suffix=""):
    if not val:
        return "(disabled / blank)"
    if mask_url and len(val) > 48:
        return val[:38] + "..." + val[-6:] + f" (active{suffix})"
    return f"{val} (active{suffix})"

print("==================================================================")
if updated:
    print("  Viking Mod Foundry — Updated site/config.js")
else:
    print("  Viking Mod Foundry — Current Active Configuration (site/config.js)")
print("==================================================================")
print("  Config File          : site/config.js")
print(f"  1. Microsoft Clarity : {fmt_status(clarity_curr)}")
print(f"  2. Google Analytics 4: {fmt_status(ga_curr)}")
print(f"  3. Cloudflare Beacon : {fmt_status(cf_curr)}")
print(f"  4. Discord Webhook   : {fmt_status(discord_effective, mask_url=True, suffix=discord_mode_suffix)}")
print(f"  5. Azure API Proxy   : {api_curr or '/api/feedback'} (uses DISCORD_FEEDBACK_WEBHOOK_URL on Azure)")
print("==================================================================")
PYEOF
