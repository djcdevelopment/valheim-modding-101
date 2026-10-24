#!/usr/bin/env bash
# =============================================================================
# Valheim 1.0.20 Modding 101 (v3.0) — Chamber 1 Environment Preflight ("Doctor")
# =============================================================================
# 100% READ-ONLY: Never modifies files, game saves, or Steam configuration.
# Supports:
#   bash tools/doctor.sh                           # Run 4-point preflight check
#   bash tools/doctor.sh --open                    # Also open active BepInEx/plugins folder
#   bash tools/doctor.sh --valheim-dir /path/...   # Override Steam Valheim directory
# =============================================================================
set -euo pipefail

# ANSI Color Tokens
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

OPEN_FOLDER=0
CLI_VALHEIM_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --open|-o)
      OPEN_FOLDER=1
      shift
      ;;
    --valheim-dir)
      if [[ $# -lt 2 ]]; then
        echo -e "${RED}[ERROR] --valheim-dir requires a path argument.${RESET}"
        exit 1
      fi
      CLI_VALHEIM_DIR="$2"
      shift 2
      ;;
    --valheim-dir=*)
      CLI_VALHEIM_DIR="${1#*=}"
      shift
      ;;
    -h|--help)
      echo "Usage: bash tools/doctor.sh [--open] [--valheim-dir <path>]"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $1${RESET}"
      echo "Usage: bash tools/doctor.sh [--open] [--valheim-dir <path>]"
      exit 1
      ;;
  esac
done

pass() {
  echo -e "  ${GREEN}[OK]${RESET}   $1"
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
echo -e "${BOLD}  Valheim 1.0.20 Modding Doctor v3.0 (Linux / SteamOS / CachyOS)      ${RESET}"
echo -e "${BOLD}  Mode: 100% Read-Only Safety Check (Multi-Drive + Mod Profiles)      ${RESET}"
echo -e "${BOLD}======================================================================${RESET}"
echo ""

# -----------------------------------------------------------------------------
# [1/4] .NET SDK (>= 8.0)
# -----------------------------------------------------------------------------
echo -e "${BOLD}[1/4] .NET SDK (>= 8.0)${RESET}"
DOTNET_BIN=""
if command -v dotnet >/dev/null 2>&1; then
  DOTNET_BIN="$(command -v dotnet)"
elif [[ -x "$HOME/.local/share/discengine-dotnet/dotnet" ]]; then
  DOTNET_BIN="$HOME/.local/share/discengine-dotnet/dotnet"
elif [[ -x "${HOME}/.dotnet/dotnet" ]]; then
  DOTNET_BIN="${HOME}/.dotnet/dotnet"
fi

if [[ -n "${DOTNET_BIN}" ]]; then
  DOTNET_VER="$("${DOTNET_BIN}" --version 2>/dev/null || echo "0.0.0")"
  DOTNET_MAJOR="${DOTNET_VER%%.*}"
  if [[ "${DOTNET_MAJOR}" =~ ^[0-9]+$ ]] && [[ "${DOTNET_MAJOR}" -ge 8 ]]; then
    pass ".NET SDK found: v${DOTNET_VER} (${DOTNET_BIN})"
  else
    warn ".NET SDK v${DOTNET_VER} found (${DOTNET_BIN}), but .NET 8.0+ is recommended."
  fi
else
  fix ".NET SDK ('dotnet') was not found on your PATH."
  info "Copy-paste fix (Ubuntu/Debian): sudo apt install -y dotnet-sdk-8.0"
  info "Copy-paste fix (Arch/CachyOS) : sudo pacman -S dotnet-sdk"
fi
echo ""

# -----------------------------------------------------------------------------
# [2/4] Valheim 1.0.20 Install & Managed DLLs (Multi-Drive libraryfolders.vdf)
# -----------------------------------------------------------------------------
echo -e "${BOLD}[2/4] Valheim 1.0.20 Install & Managed DLLs${RESET}"

EXPLICIT_VALHEIM="${CLI_VALHEIM_DIR:-${VALHEIM_DIR:-}}"

STEAM_ROOTS=(
  "$HOME/.local/share/Steam"
  "${HOME}/.local/share/Steam"
  "${HOME}/.steam/steam"
  "${HOME}/.steam/root"
  "${HOME}/.var/app/com.valvesoftware.Steam/.local/share/Steam"
  "/mnt/omen-c-read/Program Files (x86)/Steam"
)

# Also check mounted drives under /mnt, /media, /run/media
for mnt_base in /mnt/* /media/*/* /run/media/*/*; do
  [[ -d "${mnt_base}" ]] || continue
  STEAM_ROOTS+=(
    "${mnt_base}/Steam"
    "${mnt_base}/SteamLibrary"
    "${mnt_base}/Program Files (x86)/Steam"
  )
done

CANDIDATE_VALHEIM_DIRS=()
if [[ -n "${EXPLICIT_VALHEIM}" ]]; then
  CANDIDATE_VALHEIM_DIRS+=("${EXPLICIT_VALHEIM}")
fi

for sroot in "${STEAM_ROOTS[@]}"; do
  [[ -n "${sroot}" && -d "${sroot}" ]] || continue
  CANDIDATE_VALHEIM_DIRS+=("${sroot}/steamapps/common/Valheim")
  CANDIDATE_VALHEIM_DIRS+=("${sroot}/common/Valheim")

  for vdf in "${sroot}/steamapps/libraryfolders.vdf" "${sroot}/config/libraryfolders.vdf"; do
    if [[ -f "${vdf}" ]]; then
      while IFS= read -r lib_path; do
        [[ -n "${lib_path}" ]] || continue
        CANDIDATE_VALHEIM_DIRS+=("${lib_path}/steamapps/common/Valheim")
      done < <(grep -E '"path"[[:space:]]+"[^"]+"' "${vdf}" 2>/dev/null | sed -E 's/.*"path"[[:space:]]+"([^"]+)".*/\1/; s/\\\\/\//g' || true)
    fi
  done
done

RESOLVED_VALHEIM=""
for candidate in "${CANDIDATE_VALHEIM_DIRS[@]}"; do
  if [[ -n "${candidate}" && -d "${candidate}" ]]; then
    RESOLVED_VALHEIM="${candidate}"
    break
  fi
done

if [[ -n "${RESOLVED_VALHEIM}" ]]; then
  pass "Discovered Steam Valheim folder: ${RESOLVED_VALHEIM}"
  if [[ -f "${RESOLVED_VALHEIM}/valheim_Data/Managed/assembly_valheim.dll" && -f "${RESOLVED_VALHEIM}/valheim_Data/Managed/UnityEngine.dll" ]]; then
    pass "Valheim 1.0.20 Managed DLLs verified (assembly_valheim.dll & UnityEngine.dll)"
  else
    fix "assembly_valheim.dll is missing under ${RESOLVED_VALHEIM}/valheim_Data/Managed/"
    info "Verify integrity of game files in Steam -> Valheim -> Properties -> Installed Files."
  fi
else
  fix "Could not auto-detect your Steam Valheim installation across any drive."
  info "Pass --valheim-dir '/path/to/Steam/steamapps/common/Valheim' or set VALHEIM_DIR."
fi
echo ""

# -----------------------------------------------------------------------------
# [3/4] BepInEx 5.4.2202 & Mod Manager Profiles
# -----------------------------------------------------------------------------
echo -e "${BOLD}[3/4] BepInEx 5.4.2202 & Mod Manager Profiles${RESET}"

STEAM_HAS_BEPINEX=0
STEAM_STATUS_LABEL="NOT FOUND"
STEAM_LOG_TIME=""

if [[ -n "${RESOLVED_VALHEIM}" ]]; then
  if [[ -f "${RESOLVED_VALHEIM}/BepInEx/core/BepInEx.dll" && -f "${RESOLVED_VALHEIM}/BepInEx/core/0Harmony.dll" ]]; then
    STEAM_HAS_BEPINEX=1
    STEAM_STATUS_LABEL="MODDED (Direct BepInEx)"
    if [[ -f "${RESOLVED_VALHEIM}/BepInEx/LogOutput.log" ]]; then
      STEAM_LOG_TIME="$(date -r "${RESOLVED_VALHEIM}/BepInEx/LogOutput.log" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'present')"
    fi
  else
    STEAM_STATUS_LABEL="CLEAN VANILLA (Safe for Mod Manager Profiles)"
  fi
fi

# Scan known Mod Manager roots for Valheim profiles containing BepInEx/core/BepInEx.dll
PROFILE_ROOT_SPECS=(
  "r2modman:${HOME}/.config/r2modmanPlus-local/Valheim/profiles"
  "Gale:${HOME}/.config/Gale/valheim/profiles"
  "Gale:${HOME}/.local/share/com.kesomannen.gale/valheim/profiles"
)

DISCOVERED_PROFILES=()
FIRST_PROFILE_PLUGINS=""
FIRST_PROFILE_SUMMARY=""

for spec in "${PROFILE_ROOT_SPECS[@]}"; do
  mgr_name="${spec%%:*}"
  mgr_root="${spec#*:}"
  [[ -d "${mgr_root}" ]] || continue

  for prof_dir in "${mgr_root}"/*; do
    [[ -d "${prof_dir}" ]] || continue
    if [[ -f "${prof_dir}/BepInEx/core/BepInEx.dll" ]]; then
      prof_name="$(basename "${prof_dir}")"
      prof_log_time="No LogOutput.log yet"
      if [[ -f "${prof_dir}/BepInEx/LogOutput.log" ]]; then
        prof_log_time="$(date -r "${prof_dir}/BepInEx/LogOutput.log" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo 'present')"
      fi
      DISCOVERED_PROFILES+=("[${mgr_name}] '${prof_name}' -> ${prof_dir} (LogOutput.log: ${prof_log_time})")
      if [[ -z "${FIRST_PROFILE_PLUGINS}" ]]; then
        FIRST_PROFILE_PLUGINS="${prof_dir}/BepInEx/plugins"
        FIRST_PROFILE_SUMMARY="${mgr_name}: ${prof_name}"
      fi
    fi
  done
done

if [[ -n "${RESOLVED_VALHEIM}" ]]; then
  echo -e "  ${CYAN}Steam Valheim Status : ${STEAM_STATUS_LABEL}${RESET}"
  if [[ -n "${STEAM_LOG_TIME}" ]]; then
    echo -e "  ${GRAY}Steam LogOutput.log  : Last modified ${STEAM_LOG_TIME}${RESET}"
  fi
fi

if [[ "${#DISCOVERED_PROFILES[@]}" -gt 0 ]]; then
  pass "Discovered ${#DISCOVERED_PROFILES[@]} Mod Manager profile(s) with BepInEx:"
  for item in "${DISCOVERED_PROFILES[@]}"; do
    echo -e "         ${GRAY}- ${item}${RESET}"
  done
else
  echo -e "  ${GRAY}Mod Manager Profiles : None detected in r2modman / Gale roots${RESET}"
fi

if [[ "${STEAM_HAS_BEPINEX}" -eq 1 || "${#DISCOVERED_PROFILES[@]}" -gt 0 ]]; then
  if [[ "${STEAM_HAS_BEPINEX}" -eq 1 && "${#DISCOVERED_PROFILES[@]}" -gt 0 ]]; then
    pass "BepInEx 5.4.2202 ready in BOTH Steam Valheim and ${#DISCOVERED_PROFILES[@]} Mod Manager profile(s)!"
  elif [[ "${STEAM_HAS_BEPINEX}" -eq 1 ]]; then
    pass "BepInEx 5.4.2202 ready in Steam Valheim folder (${RESOLVED_VALHEIM}/BepInEx/core)"
    START_SCRIPT="${RESOLVED_VALHEIM}/start_game_bepinex.sh"
    DOORSTOP_SO="${RESOLVED_VALHEIM}/doorstop_libs/libdoorstop_x64.so"
    if [[ -f "${START_SCRIPT}" ]]; then
      if [[ -x "${START_SCRIPT}" ]]; then
        pass "Linux launcher verified: start_game_bepinex.sh is executable (+x)"
      else
        fix "start_game_bepinex.sh exists but is MISSING executable permissions (+x)!"
        info "Copy-paste fix: chmod +x \"${START_SCRIPT}\""
      fi
    fi
    if [[ -f "${DOORSTOP_SO}" ]]; then
      pass "Unix Doorstop library verified (doorstop_libs/libdoorstop_x64.so)"
    fi
  else
    pass "BepInEx 5.4.2202 ready via Mod Manager profile(s) while Steam folder stays CLEAN VANILLA!"
  fi
else
  fix "BepInEx 5.4.2202 was not found in Steam Valheim OR in any Mod Manager profile (r2modman / Gale)."
  info "Option A (Mod Manager - Recommended): Install r2modman or Gale, create a Valheim profile, and install BepInExPack_Valheim."
  info "Option B (Direct Steam): Extract denikson-BepInExPack_Valheim (v5.4.2202+) into ${RESOLVED_VALHEIM}."
fi
echo ""

# -----------------------------------------------------------------------------
# [4/4] Save Vault Location (Untouched by Mods)
# -----------------------------------------------------------------------------
echo -e "${BOLD}[4/4] Save Vault Location (Untouched by Mods)${RESET}"
SAVE_VAULT_PATH="${HOME}/.config/unity3d/IronGate/Valheim"
if [[ -d "${SAVE_VAULT_PATH}" ]]; then
  pass "Save Vault verified (separate from game & mod files): ${SAVE_VAULT_PATH}"
else
  pass "Save Vault location (created on first Valheim launch): ${SAVE_VAULT_PATH}"
fi
info "Your characters (.fch) and worlds (.db/.fwl) live here and are NEVER touched by build-and-deploy or --reset."
echo ""

# -----------------------------------------------------------------------------
# Determine Active Plugins Folder & Print Folder Summary Table
# -----------------------------------------------------------------------------
ACTIVE_PLUGINS_FOLDER=""
if [[ -n "${FIRST_PROFILE_PLUGINS}" ]]; then
  ACTIVE_PLUGINS_FOLDER="${FIRST_PROFILE_PLUGINS}"
elif [[ "${STEAM_HAS_BEPINEX}" -eq 1 && -n "${RESOLVED_VALHEIM}" ]]; then
  ACTIVE_PLUGINS_FOLDER="${RESOLVED_VALHEIM}/BepInEx/plugins"
elif [[ -n "${RESOLVED_VALHEIM}" ]]; then
  ACTIVE_PLUGINS_FOLDER="${RESOLVED_VALHEIM}"
fi

echo -e "${GRAY}----------------------------------------------------------------------${RESET}"
echo -e "${BOLD}  FOLDER SUMMARY TABLE (3 Places on Your PC)${RESET}"
echo -e "${GRAY}----------------------------------------------------------------------${RESET}"
if [[ -n "${RESOLVED_VALHEIM}" ]]; then
  echo -e "  1. Steam Valheim   : ${RESOLVED_VALHEIM} [${STEAM_STATUS_LABEL}]"
else
  echo -e "  1. Steam Valheim   : Not found"
fi
if [[ "${#DISCOVERED_PROFILES[@]}" -gt 0 ]]; then
  echo -e "  2. Mod Profiles    : ${#DISCOVERED_PROFILES[@]} profile(s) detected (${FIRST_PROFILE_SUMMARY})"
else
  echo -e "  2. Mod Profiles    : None (Direct Steam mode)"
fi
echo -e "  3. Active Plugins  : ${ACTIVE_PLUGINS_FOLDER:-N/A}"
echo -e "  4. Save Vault      : ${SAVE_VAULT_PATH} [100% Untouched]"
echo -e "${GRAY}----------------------------------------------------------------------${RESET}"
echo ""

# -----------------------------------------------------------------------------
# Optional --open Flag: Open Active Plugins (or Valheim) Folder
# -----------------------------------------------------------------------------
if [[ "${OPEN_FOLDER}" -eq 1 ]]; then
  FOLDER_TO_OPEN="${ACTIVE_PLUGINS_FOLDER}"
  if [[ -n "${FOLDER_TO_OPEN}" && ! -d "${FOLDER_TO_OPEN}" ]]; then
    FOLDER_TO_OPEN="${RESOLVED_VALHEIM}"
  fi
  if [[ -n "${FOLDER_TO_OPEN}" && -d "${FOLDER_TO_OPEN}" ]]; then
    if [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]] && command -v xdg-open >/dev/null 2>&1; then
      echo -e "  ${CYAN}[OPEN] Opening folder in file manager: ${FOLDER_TO_OPEN}${RESET}"
      xdg-open "${FOLDER_TO_OPEN}" >/dev/null 2>&1 || echo -e "  ${CYAN}[OPEN] Active folder path: ${FOLDER_TO_OPEN}${RESET}"
    else
      echo -e "  ${CYAN}[OPEN] Active folder path (headless/terminal mode): ${FOLDER_TO_OPEN}${RESET}"
    fi
  else
    warn "Cannot open folder because neither BepInEx/plugins nor Valheim root exists yet."
  fi
  echo ""
fi

# -----------------------------------------------------------------------------
# Summary Banner
# -----------------------------------------------------------------------------
echo -e "${BOLD}======================================================================${RESET}"
if [[ "${FAIL_COUNT}" -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}PREFLIGHT PASSED!${RESET} (${PASS_COUNT} OK, ${WARN_COUNT} warnings, 0 blockers)"
  echo -e "  Next Step (Chamber 2): Run ${BOLD}bash tools/build-and-deploy.sh --dry-run${RESET}"
  echo -e "  ${GRAY}Tip: Run 'bash tools/doctor.sh --open' anytime to open your plugins folder!${RESET}"
  echo -e "${BOLD}======================================================================${RESET}"
  exit 0
else
  echo -e "  ${RED}${BOLD}ACTION NEEDED:${RESET} ${FAIL_COUNT} item(s) marked [FIX] above need attention."
  echo -e "  Apply the copy-paste fix shown under [FIX] and re-run ${BOLD}bash tools/doctor.sh${RESET}."
  echo -e "${BOLD}======================================================================${RESET}"
  exit 1
fi
