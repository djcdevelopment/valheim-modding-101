#!/usr/bin/env bash
# =============================================================================
# Valheim 1.0 Modding 101 — Chamber 1 Environment Preflight ("The Safety Check")
# =============================================================================
# 100% READ-ONLY: This script never modifies files, game saves, or Steam config.
# Designed for a tired human at 11:30 PM or an autonomous CLI agent.
# =============================================================================
set -euo pipefail

# ANSI Color Tokens
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

pass() {
  echo -e "  ${GREEN}[PASS]${RESET} $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

warn() {
  echo -e "  ${YELLOW}[WARN]${RESET} $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

fix() {
  echo -e "  ${RED}[FIX]${RESET}  $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

info() {
  echo -e "         ${CYAN}↳${RESET} $1"
}

echo -e "${BOLD}======================================================================${RESET}"
echo -e "${BOLD}  Valheim 1.0 Modding Doctor (Linux / SteamOS / CachyOS Preflight)    ${RESET}"
echo -e "${BOLD}  Mode: 100% Read-Only Safety Check                                   ${RESET}"
echo -e "${BOLD}======================================================================${RESET}"
echo ""

# -----------------------------------------------------------------------------
# 1. Check .NET SDK
# -----------------------------------------------------------------------------
echo -e "${BOLD}[1/4] Checking .NET SDK (Compiler)...${RESET}"
DOTNET_BIN=""
if command -v dotnet >/dev/null 2>&1; then
  DOTNET_BIN="$(command -v dotnet)"
elif [[ -x "/home/derek/.local/share/discengine-dotnet/dotnet" ]]; then
  DOTNET_BIN="/home/derek/.local/share/discengine-dotnet/dotnet"
elif [[ -x "${HOME}/.dotnet/dotnet" ]]; then
  DOTNET_BIN="${HOME}/.dotnet/dotnet"
fi

if [[ -n "${DOTNET_BIN}" ]]; then
  DOTNET_VER="$("${DOTNET_BIN}" --version 2>/dev/null || echo "unknown")"
  pass ".NET SDK found: v${DOTNET_VER} (${DOTNET_BIN})"
else
  fix ".NET SDK ('dotnet') was not found on your PATH."
  info "Copy-paste fix (Ubuntu/Debian): sudo apt install -y dotnet-sdk-8.0"
  info "Copy-paste fix (Arch/CachyOS) : sudo pacman -S dotnet-sdk"
fi
echo ""

# -----------------------------------------------------------------------------
# 2. Check Valheim Installation & 1.0 Managed Assemblies
# -----------------------------------------------------------------------------
echo -e "${BOLD}[2/4] Locating Valheim 1.0 Installation...${RESET}"
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

if [[ -n "${RESOLVED_VALHEIM}" ]]; then
  pass "Valheim root found: ${RESOLVED_VALHEIM}"
  if [[ -f "${RESOLVED_VALHEIM}/valheim_Data/Managed/assembly_valheim.dll" ]]; then
    pass "Valheim Managed assemblies verified (assembly_valheim.dll & UnityEngine.dll present)"
  else
    fix "assembly_valheim.dll is missing under ${RESOLVED_VALHEIM}/valheim_Data/Managed/"
    info "Verify integrity of game files in Steam -> Valheim -> Properties -> Installed Files."
  fi
else
  fix "Could not auto-detect your Valheim installation directory."
  info "Set VALHEIM_DIR='/path/to/Steam/steamapps/common/Valheim' and re-run tools/doctor.sh."
fi
echo ""

# -----------------------------------------------------------------------------
# 3. Check BepInEx 5.4.x Core & Harmony
# -----------------------------------------------------------------------------
echo -e "${BOLD}[3/4] Checking BepInEx 5.4.x Loader & Harmony...${RESET}"
if [[ -n "${RESOLVED_VALHEIM}" ]]; then
  BEPINEX_DLL="${RESOLVED_VALHEIM}/BepInEx/core/BepInEx.dll"
  HARMONY_DLL="${RESOLVED_VALHEIM}/BepInEx/core/0Harmony.dll"

  if [[ -f "${BEPINEX_DLL}" && -f "${HARMONY_DLL}" ]]; then
    pass "BepInEx core found (BepInEx.dll + 0Harmony.dll)"
  else
    fix "BepInEx/core/BepInEx.dll or 0Harmony.dll not found in ${RESOLVED_VALHEIM}"
    info "Install denikson-BepInExPack_Valheim (v5.4.2202+) into your Valheim directory or link your Gale/r2modman profile."
  fi
else
  warn "Skipped BepInEx check because Valheim directory was not found."
fi
echo ""

# -----------------------------------------------------------------------------
# 4. Check Linux-Specific Doorstop & Steam Runtime Traps (FAQ-006)
# -----------------------------------------------------------------------------
echo -e "${BOLD}[4/4] Checking Linux Doorstop & Steam Runtime Traps (FAQ-006)...${RESET}"
if [[ -n "${RESOLVED_VALHEIM}" ]]; then
  START_SCRIPT="${RESOLVED_VALHEIM}/start_game_bepinex.sh"
  DOORSTOP_SO="${RESOLVED_VALHEIM}/doorstop_libs/libdoorstop_x64.so"

  if [[ -f "${START_SCRIPT}" ]]; then
    if [[ -x "${START_SCRIPT}" ]]; then
      pass "start_game_bepinex.sh is present and executable (+x)"
    else
      fix "start_game_bepinex.sh exists but is MISSING executable permissions (+x)!"
      info "Without +x, Steam silently ignores BepInEx (EACCES) and boots vanilla Valheim!"
      info "Copy-paste fix: chmod +x \"${START_SCRIPT}\""
    fi
  else
    warn "start_game_bepinex.sh not found in Valheim root (OK if launching via r2modman wrapper)."
  fi

  if [[ -f "${DOORSTOP_SO}" ]]; then
    pass "Unix Doorstop library verified (doorstop_libs/libdoorstop_x64.so)"
  else
    warn "doorstop_libs/libdoorstop_x64.so not found in Valheim root."
    info "If using Gale on Linux, symlink doorstop_libs and BepInEx into the Valheim folder (see FAQ-006)."
  fi
fi

if pgrep -x "steam" >/dev/null 2>&1; then
  pass "Steam client process is running (ready for steam://rungameid/892970 or -console boot)"
else
  warn "Steam client is not currently running (required when you are ready to launch the game in Chamber 3)."
fi

echo ""
echo -e "${CYAN}  Linux / CachyOS / SteamOS Cliff-Edge Reminders:${RESET}"
echo -e "   • ${BOLD}Steam Launch Options (Native Linux):${RESET} ./start_game_bepinex.sh %command% -console"
echo -e "   • ${BOLD}CachyOS / Proton Trap:${RESET} Make sure 'Force the use of a specific Steam Play compatibility"
echo -e "     tool' (Proton) is UNCHECKED when using start_game_bepinex.sh + libdoorstop_x64.so!"
echo -e "   • ${BOLD}Valve Runtime #747:${RESET} Clicking Steam's green Play button without Launch Options"
echo -e "     boots vanilla valheim.x86_64 and skips BepInEx entirely."
echo ""

# -----------------------------------------------------------------------------
# Summary Banner
# -----------------------------------------------------------------------------
echo -e "${BOLD}======================================================================${RESET}"
if [[ "${FAIL_COUNT}" -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}PREFLIGHT PASSED!${RESET} (${PASS_COUNT} passed, ${WARN_COUNT} warnings, 0 blockers)"
  echo -e "  Next Step (Chamber 2): Run ${BOLD}bash tools/build-and-deploy.sh --dry-run${RESET}"
  echo -e "${BOLD}======================================================================${RESET}"
  exit 0
else
  echo -e "  ${RED}${BOLD}ACTION NEEDED:${RESET} ${FAIL_COUNT} item(s) marked [FIX] above need attention."
  echo -e "  Apply the copy-paste fix shown under [FIX] and re-run ${BOLD}bash tools/doctor.sh${RESET}."
  echo -e "${BOLD}======================================================================${RESET}"
  exit 1
fi
