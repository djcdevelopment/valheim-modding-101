#!/usr/bin/env bash
# =============================================================================
# Valheim Modding 101 — Operator-Triggered Patch Revision & Bundle Builder
# =============================================================================
# Rebuilds the downloadable starter archives in site/downloads/ from the live
# starter-mod/, tools/, AGENTS.md, and README.md files, audits version strings,
# and prints a release checklist for pushing to GitHub & Azure Static Web Apps.
#
# Usage:
#   bash ./tools/prepare-patch-update.sh
#   bash ./tools/prepare-patch-update.sh --version 1.0.21
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

TARGET_VERSION="1.0.21"
VERSION_EXPLICIT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version|-v)
      if [[ $# -lt 2 ]]; then
        echo -e "${RED}[ERROR] --version requires a version string (e.g. --version 1.0.21).${RESET}"
        exit 1
      fi
      TARGET_VERSION="$2"
      VERSION_EXPLICIT=1
      shift 2
      ;;
    --version=*)
      TARGET_VERSION="${1#*=}"
      VERSION_EXPLICIT=1
      shift
      ;;
    -h|--help)
      echo "Usage: bash ./tools/prepare-patch-update.sh [--version <valheim-patch-version>]"
      echo ""
      echo "Options:"
      echo "  --version, -v <ver>   Target Valheim patch version to audit against (default: 1.0.21)"
      echo "  --help, -h            Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}[ERROR] Unknown argument: $1${RESET}"
      echo "Usage: bash ./tools/prepare-patch-update.sh [--version <valheim-patch-version>]"
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

DOWNLOADS_DIR="${REPO_ROOT}/site/downloads"
ZIP_OUT="${DOWNLOADS_DIR}/valheim-modding-101-starter-files.zip"
TAR_OUT="${DOWNLOADS_DIR}/valheim-modding-101-starter-files.tar.gz"

echo -e "${BOLD}======================================================================${RESET}"
echo -e "${BOLD}  Valheim Modding 101 — Patch Revision & Starter Bundle Builder       ${RESET}"
echo -e "${BOLD}  Target Valheim Patch : v${TARGET_VERSION}$( [[ ${VERSION_EXPLICIT} -eq 1 ]] && echo " (operator-specified)" || echo " (current baseline)" )${RESET}"
echo -e "${BOLD}======================================================================${RESET}"
echo ""

# -----------------------------------------------------------------------------
# [1/4] Verify Required Source Files
# -----------------------------------------------------------------------------
echo -e "${BOLD}[1/4] Verifying Starter Bundle Source Files${RESET}"

BUNDLE_FILES=(
  "AGENTS.md"
  "README.md"
  "starter-mod/HelloValheimPlugin.cs"
  "starter-mod/HelloValheim.csproj"
  "starter-mod/com.valheim101.hellovalheim.cfg"
  "starter-mod/manifest.json"
  "starter-mod/thunderstore.toml"
  "tools/doctor.ps1"
  "tools/doctor.sh"
  "tools/build-and-deploy.ps1"
  "tools/build-and-deploy.sh"
  "tools/prepare-patch-update.ps1"
  "tools/prepare-patch-update.sh"
)

for rel_path in "${BUNDLE_FILES[@]}"; do
  if [[ ! -f "${REPO_ROOT}/${rel_path}" ]]; then
    echo -e "  ${RED}[MISSING]${RESET} ${rel_path}"
    exit 1
  fi
  echo -e "  ${GREEN}[OK]${RESET}      ${rel_path}"
done
echo ""

# -----------------------------------------------------------------------------
# [2/4] Audit Target Patch Version Across Key Surfaces
# -----------------------------------------------------------------------------
echo -e "${BOLD}[2/4] Auditing Version References for '${TARGET_VERSION}'${RESET}"

AUDIT_SURFACES=(
  "AGENTS.md"
  "README.md"
  "starter-mod/HelloValheimPlugin.cs"
  "site/steps-data.js"
  "site/config.js"
)

for surface in "${AUDIT_SURFACES[@]}"; do
  if [[ -f "${REPO_ROOT}/${surface}" ]]; then
    if grep -Fq "${TARGET_VERSION}" "${REPO_ROOT}/${surface}"; then
      echo -e "  ${GREEN}[MATCH]${RESET}   ${surface} references ${TARGET_VERSION}"
    else
      echo -e "  ${YELLOW}[REVIEW]${RESET}  ${surface} does not yet mention ${TARGET_VERSION}"
    fi
  fi
done
echo ""

# -----------------------------------------------------------------------------
# [3/4] Rebuild site/downloads/valheim-modding-101-starter-files.{zip,tar.gz}
# -----------------------------------------------------------------------------
echo -e "${BOLD}[3/4] Rebuilding Downloadable Starter Archives${RESET}"
mkdir -p "${DOWNLOADS_DIR}"

chmod +x "${REPO_ROOT}/tools/doctor.sh" \
         "${REPO_ROOT}/tools/build-and-deploy.sh" \
         "${REPO_ROOT}/tools/prepare-patch-update.sh"

rm -f "${ZIP_OUT}" "${TAR_OUT}"

if command -v zip >/dev/null 2>&1; then
  zip -q "${ZIP_OUT}" "${BUNDLE_FILES[@]}"
elif command -v python3 >/dev/null 2>&1; then
  python3 - "${ZIP_OUT}" "${BUNDLE_FILES[@]}" <<'PYEOF'
import sys, zipfile
zip_path = sys.argv[1]
files = sys.argv[2:]
with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for f in files:
        zf.write(f, arcname=f)
PYEOF
else
  echo -e "  ${RED}[ERROR] Neither 'zip' nor 'python3' was found to build ${ZIP_OUT}.${RESET}"
  exit 1
fi

tar -czf "${TAR_OUT}" "${BUNDLE_FILES[@]}"

ZIP_SIZE="$(du -h "${ZIP_OUT}" | awk '{print $1}')"
TAR_SIZE="$(du -h "${TAR_OUT}" | awk '{print $1}')"
ZIP_SHA="$(sha256sum "${ZIP_OUT}" | awk '{print substr($1,1,16)}')"
TAR_SHA="$(sha256sum "${TAR_OUT}" | awk '{print substr($1,1,16)}')"

echo -e "  ${GREEN}[BUILT]${RESET}   site/downloads/valheim-modding-101-starter-files.zip    (${ZIP_SIZE}, sha256:${ZIP_SHA}...)"
echo -e "  ${GREEN}[BUILT]${RESET}   site/downloads/valheim-modding-101-starter-files.tar.gz (${TAR_SIZE}, sha256:${TAR_SHA}...)"
echo ""

# -----------------------------------------------------------------------------
# [4/4] Operator Patch Revision & Deployment Checklist
# -----------------------------------------------------------------------------
echo -e "${BOLD}[4/4] Operator Patch Revision Checklist (Valheim v${TARGET_VERSION})${RESET}"
echo -e "  ${CYAN}1. Verify Harmony Target Signatures (if Valheim updated assembly_valheim.dll):${RESET}"
echo -e "     ilspycmd -t Player \"\$VALHEIM_DIR/valheim_Data/Managed/assembly_valheim.dll\" | grep -E \"GetMaxCarryWeight|OnDeath\""
echo -e "     ilspycmd -t Terminal \"\$VALHEIM_DIR/valheim_Data/Managed/assembly_valheim.dll\" | grep -E \"InitTerminal|TryRunCommand\""
echo -e "     ilspycmd -t ZNet \"\$VALHEIM_DIR/valheim_Data/Managed/assembly_valheim.dll\" | grep -E \"IsServer|IsDedicated\""
echo ""
echo -e "  ${CYAN}2. Run Dry-Run Compile Verification:${RESET}"
echo -e "     bash ./tools/build-and-deploy.sh --dry-run"
echo ""
echo -e "  ${CYAN}3. Stage, Commit & Push to GitHub / Azure Static Web Apps:${RESET}"
echo -e "     git status -s"
echo -e "     git add AGENTS.md README.md starter-mod/ tools/ site/ api/"
echo -e "     git commit -m \"chore(patch): prepare Valheim ${TARGET_VERSION} starter bundles and site revision\""
echo -e "     git push origin main"
echo ""
echo -e "${GREEN}${BOLD}✓ Patch bundle preparation complete (${#BUNDLE_FILES[@]} files packaged into .zip and .tar.gz).${RESET}"
