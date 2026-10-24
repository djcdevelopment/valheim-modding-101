#!/usr/bin/env bash
# =============================================================================
# Valheim 1.0 Modding 101 — Chamber 2 & 3 Build, Verify & Deploy Tool (Linux)
# =============================================================================
# Usage:
#   bash tools/build-and-deploy.sh --dry-run   # Compile & verify DLL only (safe, no game edits)
#   bash tools/build-and-deploy.sh --deploy    # Compile, verify & copy DLL to BepInEx/plugins/HelloValheim/
#   bash tools/build-and-deploy.sh --reset     # Remove HelloValheim from BepInEx/plugins/ (1-second undo!)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CSPROJ_PATH="${REPO_ROOT}/starter-mod/HelloValheim.csproj"
OUT_DIR="${REPO_ROOT}/starter-mod/bin/Release"
DLL_PATH="${OUT_DIR}/HelloValheim.dll"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

MODE="deploy"
for arg in "$@"; do
  case "${arg}" in
    --dry-run) MODE="dry-run" ;;
    --deploy)  MODE="deploy" ;;
    --reset)   MODE="reset" ;;
    -h|--help)
      echo "Usage: bash tools/build-and-deploy.sh [--dry-run | --deploy | --reset]"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: ${arg}${RESET}"
      echo "Usage: bash tools/build-and-deploy.sh [--dry-run | --deploy | --reset]"
      exit 1
      ;;
  esac
done

# Locate Valheim Directory
VALHEIM_DIR="${VALHEIM_DIR:-}"
CANDIDATE_DIRS=(
  "${VALHEIM_DIR}"
  "/home/derek/.local/share/Steam/steamapps/common/Valheim"
  "${HOME}/.local/share/Steam/steamapps/common/Valheim"
  "${HOME}/.steam/steam/steamapps/common/Valheim"
  "${HOME}/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/common/Valheim"
  "/mnt/omen-c-read/Program Files (x86)/Steam/steamapps/common/Valheim"
)

RESOLVED_VALHEIM=""
for candidate in "${CANDIDATE_DIRS[@]}"; do
  if [[ -n "${candidate}" && -d "${candidate}" ]]; then
    RESOLVED_VALHEIM="${candidate}"
    break
  fi
done

# -----------------------------------------------------------------------------
# Mode: --reset (1-Second Return to Vanilla State)
# -----------------------------------------------------------------------------
if [[ "${MODE}" == "reset" ]]; then
  if [[ -z "${RESOLVED_VALHEIM}" ]]; then
    echo -e "${RED}[ERROR] Could not locate Valheim directory to reset.${RESET}"
    exit 1
  fi
  TARGET_PLUGIN_DIR="${RESOLVED_VALHEIM}/BepInEx/plugins/HelloValheim"
  TARGET_CFG_FILE="${RESOLVED_VALHEIM}/BepInEx/config/com.example.hellovalheim.cfg"

  if [[ -d "${TARGET_PLUGIN_DIR}" || -L "${TARGET_PLUGIN_DIR}" ]]; then
    rm -rf "${TARGET_PLUGIN_DIR}"
    echo -e "${GREEN}[PASS] Removed ${TARGET_PLUGIN_DIR}${RESET}"
  else
    echo -e "${CYAN}[INFO] ${TARGET_PLUGIN_DIR} was already clean.${RESET}"
  fi

  if [[ -f "${TARGET_CFG_FILE}" ]]; then
    rm -f "${TARGET_CFG_FILE}"
    echo -e "${GREEN}[PASS] Removed ${TARGET_CFG_FILE}${RESET}"
  fi

  echo -e "${GREEN}${BOLD}100% Reset Complete:${RESET} HelloValheim has been removed from your game."
  exit 0
fi

# -----------------------------------------------------------------------------
# Locate dotnet binary
# -----------------------------------------------------------------------------
DOTNET_BIN=""
if command -v dotnet >/dev/null 2>&1; then
  DOTNET_BIN="$(command -v dotnet)"
elif [[ -x "/home/derek/.local/share/discengine-dotnet/dotnet" ]]; then
  DOTNET_BIN="/home/derek/.local/share/discengine-dotnet/dotnet"
elif [[ -x "${HOME}/.dotnet/dotnet" ]]; then
  DOTNET_BIN="${HOME}/.dotnet/dotnet"
else
  echo -e "${RED}[FIX] .NET SDK ('dotnet') not found. Run 'bash tools/doctor.sh' first.${RESET}"
  exit 1
fi

echo -e "${BOLD}======================================================================${RESET}"
echo -e "${BOLD}  Building HelloValheim.csproj (Mode: ${MODE})                        ${RESET}"
echo -e "${BOLD}======================================================================${RESET}"

BUILD_ARGS=(-c Release --nologo)
if [[ -n "${RESOLVED_VALHEIM}" ]]; then
  BUILD_ARGS+=("-p:ValheimDir=${RESOLVED_VALHEIM}")
fi

"${DOTNET_BIN}" build "${CSPROJ_PATH}" "${BUILD_ARGS[@]}"

# -----------------------------------------------------------------------------
# Artifact & Cliff-Edge Verification (<Private>false</Private> Guard)
# -----------------------------------------------------------------------------
echo ""
echo -e "${BOLD}Verifying compiled artifact...${RESET}"

if [[ ! -f "${DLL_PATH}" ]]; then
  echo -e "  ${RED}[FAIL] Expected output not found at ${DLL_PATH}${RESET}"
  exit 1
fi

DLL_BYTES="$(stat -c "%s" "${DLL_PATH}")"
DLL_KB=$(( (DLL_BYTES + 1023) / 1024 ))

if [[ "${DLL_BYTES}" -gt 102400 ]]; then
  echo -e "  ${RED}[FAIL] HelloValheim.dll is unexpectedly large (${DLL_BYTES} bytes > 100 KB).${RESET}"
  exit 1
fi
echo -e "  ${GREEN}[PASS]${RESET} HelloValheim.dll compiled cleanly (${DLL_BYTES} bytes / ~${DLL_KB} KB)"

if [[ -f "${OUT_DIR}/UnityEngine.dll" || -f "${OUT_DIR}/0Harmony.dll" || -f "${OUT_DIR}/BepInEx.dll" ]]; then
  echo -e "  ${RED}[FAIL] Cliff-Edge Trap Triggered! Engine DLLs (UnityEngine.dll / 0Harmony.dll) leaked into ${OUT_DIR}!${RESET}"
  echo -e "         Ensure all <Reference> tags in HelloValheim.csproj have <Private>false</Private>."
  exit 1
fi
echo -e "  ${GREEN}[PASS]${RESET} Zero UnityEngine/Harmony DLL bloat in output directory (<Private>false</Private> verified)"

# -----------------------------------------------------------------------------
# Dry-Run Exit or Live Deploy
# -----------------------------------------------------------------------------
if [[ "${MODE}" == "dry-run" ]]; then
  echo ""
  echo -e "${GREEN}${BOLD}DRY-RUN SUCCEEDED!${RESET} Artifact verified at:"
  echo -e "  ${CYAN}${DLL_PATH}${RESET} (${DLL_BYTES} bytes)"
  echo -e "When ready to install into Valheim, run: ${BOLD}bash tools/build-and-deploy.sh --deploy${RESET}"
  exit 0
fi

if [[ -z "${RESOLVED_VALHEIM}" ]]; then
  echo -e "${RED}[ERROR] Cannot deploy because Valheim directory was not found. Set VALHEIM_DIR and retry.${RESET}"
  exit 1
fi

PLUGIN_DEST_DIR="${RESOLVED_VALHEIM}/BepInEx/plugins/HelloValheim"
mkdir -p "${PLUGIN_DEST_DIR}"
cp -f "${DLL_PATH}" "${PLUGIN_DEST_DIR}/HelloValheim.dll"

echo -e "  ${GREEN}[PASS]${RESET} Deployed to: ${PLUGIN_DEST_DIR}/HelloValheim.dll"
echo ""
echo -e "${BOLD}======================================================================${RESET}"
echo -e "  ${GREEN}${BOLD}DEPLOY COMPLETE!${RESET} Next Step (Chamber 3): Boot & Verify"
echo -e "  1. Launch Valheim from Steam (with ${CYAN}./start_game_bepinex.sh %command% -console${RESET})"
echo -e "  2. Watch your log live:"
echo -e "     ${BOLD}grep -E 'HelloValheim|vikingping' \"${RESOLVED_VALHEIM}/BepInEx/LogOutput.log\"${RESET}"
echo -e "  3. Press ${BOLD}F5${RESET} at the Main Menu and type: ${BOLD}vikingping${RESET} or ${BOLD}vikinginspect${RESET}"
echo -e "  4. Undo anytime in 1 second: ${BOLD}bash tools/build-and-deploy.sh --reset${RESET}"
echo -e "${BOLD}======================================================================${RESET}"
