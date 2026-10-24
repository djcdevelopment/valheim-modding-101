#!/usr/bin/env bash
# =============================================================================
# Valheim 1.0.20 Modding 101 (v3.0) — Chamber 2 & 3 Build, Verify & Deploy Tool
# =============================================================================
# Supports Multi-Drive Steam (libraryfolders.vdf) + Mod Manager Profiles:
#   bash tools/build-and-deploy.sh --dry-run                 # Compile & verify DLL only
#   bash tools/build-and-deploy.sh --deploy                  # Compile & deploy to Steam + Profiles
#   bash tools/build-and-deploy.sh --deploy --profile <Name> # Deploy to specific profile
#   bash tools/build-and-deploy.sh --reset                   # Remove DLL + .cfg from Steam + Profiles
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${REPO_ROOT}/starter-mod/HelloValheim/HelloValheim.csproj" ]]; then
  CSPROJ_PATH="${REPO_ROOT}/starter-mod/HelloValheim/HelloValheim.csproj"
else
  CSPROJ_PATH="${REPO_ROOT}/starter-mod/HelloValheim.csproj"
fi
PROJECT_DIR="$(dirname "${CSPROJ_PATH}")"
OUT_DIR="${PROJECT_DIR}/bin/Release"
DLL_PATH="${OUT_DIR}/HelloValheim.dll"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

MODE="deploy"
TARGET_PROFILE=""
CLI_VALHEIM_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      MODE="dry-run"
      shift
      ;;
    --deploy)
      MODE="deploy"
      shift
      ;;
    --reset)
      MODE="reset"
      shift
      ;;
    --profile)
      if [[ $# -lt 2 ]]; then
        echo -e "${RED}[ERROR] --profile requires a profile name.${RESET}"
        exit 1
      fi
      TARGET_PROFILE="$2"
      shift 2
      ;;
    --profile=*)
      TARGET_PROFILE="${1#*=}"
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
      echo "Usage: bash tools/build-and-deploy.sh [--dry-run | --deploy | --reset] [--profile <Name>] [--valheim-dir <path>]"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $1${RESET}"
      echo "Usage: bash tools/build-and-deploy.sh [--dry-run | --deploy | --reset] [--profile <Name>] [--valheim-dir <path>]"
      exit 1
      ;;
  esac
done

# -----------------------------------------------------------------------------
# 1. Multi-Drive Steam Auto-Discovery (libraryfolders.vdf)
# -----------------------------------------------------------------------------
EXPLICIT_VALHEIM="${CLI_VALHEIM_DIR:-${VALHEIM_DIR:-}}"

STEAM_ROOTS=(
  "/home/derek/.local/share/Steam"
  "${HOME}/.local/share/Steam"
  "${HOME}/.steam/steam"
  "${HOME}/.steam/root"
  "${HOME}/.var/app/com.valvesoftware.Steam/.local/share/Steam"
  "/mnt/omen-c-read/Program Files (x86)/Steam"
)

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

# -----------------------------------------------------------------------------
# 2. Mod Manager Profile Auto-Discovery (r2modman, Gale)
# -----------------------------------------------------------------------------
PROFILE_ROOT_SPECS=(
  "r2modman:${HOME}/.config/r2modmanPlus-local/Valheim/profiles"
  "Gale:${HOME}/.config/Gale/valheim/profiles"
  "Gale:${HOME}/.local/share/com.kesomannen.gale/valheim/profiles"
)

ALL_PROFILE_DIRS=()
MATCHING_PROFILE_DIRS=()

for spec in "${PROFILE_ROOT_SPECS[@]}"; do
  mgr_root="${spec#*:}"
  [[ -d "${mgr_root}" ]] || continue
  for prof_dir in "${mgr_root}"/*; do
    [[ -d "${prof_dir}" ]] || continue
    if [[ -f "${prof_dir}/BepInEx/core/BepInEx.dll" ]]; then
      ALL_PROFILE_DIRS+=("${prof_dir}")
      prof_name="$(basename "${prof_dir}")"
      if [[ -z "${TARGET_PROFILE}" || "${prof_name,,}" == "${TARGET_PROFILE,,}" ]]; then
        MATCHING_PROFILE_DIRS+=("${prof_dir}")
      fi
    fi
  done
done

# -----------------------------------------------------------------------------
# Mode: --reset (1-Second Return to Vanilla State Across Steam + Mod Profiles)
# -----------------------------------------------------------------------------
if [[ "${MODE}" == "reset" ]]; then
  echo -e "${BOLD}======================================================================${RESET}"
  echo -e "${BOLD}  Resetting HelloValheim Across Steam & Mod Manager Profiles          ${RESET}"
  echo -e "${BOLD}======================================================================${RESET}"

  BEPINEX_ROOTS_TO_CLEAN=()
  if [[ -n "${RESOLVED_VALHEIM}" && -d "${RESOLVED_VALHEIM}/BepInEx" ]]; then
    BEPINEX_ROOTS_TO_CLEAN+=("${RESOLVED_VALHEIM}/BepInEx")
  fi
  for prof_dir in "${MATCHING_PROFILE_DIRS[@]}"; do
    if [[ -d "${prof_dir}/BepInEx" ]]; then
      BEPINEX_ROOTS_TO_CLEAN+=("${prof_dir}/BepInEx")
    fi
  done

  if [[ "${#BEPINEX_ROOTS_TO_CLEAN[@]}" -eq 0 && -z "${RESOLVED_VALHEIM}" ]]; then
    echo -e "${RED}[ERROR] Could not locate Valheim directory or Mod Manager profiles to reset.${RESET}"
    exit 1
  fi

  REMOVED_COUNT=0
  for bep_root in "${BEPINEX_ROOTS_TO_CLEAN[@]}"; do
    plugin_subdir="${bep_root}/plugins/HelloValheim"
    plugin_subdll="${bep_root}/plugins/HelloValheim/HelloValheim.dll"
    plugin_flatdll="${bep_root}/plugins/HelloValheim.dll"
    cfg_v3="${bep_root}/config/com.valheim101.hellovalheim.cfg"
    cfg_legacy="${bep_root}/config/com.example.hellovalheim.cfg"

    for file_target in "${plugin_subdll}" "${plugin_flatdll}" "${cfg_v3}" "${cfg_legacy}"; do
      if [[ -f "${file_target}" || -L "${file_target}" ]]; then
        rm -f "${file_target}"
        echo -e "  ${GREEN}[REMOVED]${RESET} ${file_target}"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
      fi
    done

    if [[ -d "${plugin_subdir}" || -L "${plugin_subdir}" ]]; then
      rm -rf "${plugin_subdir}"
      echo -e "  ${GREEN}[REMOVED]${RESET} ${plugin_subdir}"
      REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
  done

  if [[ "${REMOVED_COUNT}" -eq 0 ]]; then
    echo -e "  ${CYAN}[INFO] All Steam & Mod Manager profile folders were already clean.${RESET}"
  fi
  echo -e "${GREEN}${BOLD}100% Reset Complete:${RESET} HelloValheim (.dll & .cfg) removed from your game and profiles."
  exit 0
fi

# -----------------------------------------------------------------------------
# 3. Locate dotnet & Profile-Aware Compilation (-p:ValheimDir & -p:BepInExCoreDir)
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
  if [[ ! -f "${RESOLVED_VALHEIM}/BepInEx/core/BepInEx.dll" ]]; then
    COMPILE_PROFILE=""
    if [[ "${#MATCHING_PROFILE_DIRS[@]}" -gt 0 ]]; then
      COMPILE_PROFILE="${MATCHING_PROFILE_DIRS[0]}"
    elif [[ "${#ALL_PROFILE_DIRS[@]}" -gt 0 ]]; then
      COMPILE_PROFILE="${ALL_PROFILE_DIRS[0]}"
    fi
    if [[ -n "${COMPILE_PROFILE}" ]]; then
      echo -e "  ${CYAN}[INFO] Steam folder is CLEAN VANILLA; compiling against profile BepInEx core:${RESET}"
      echo -e "         ${GRAY}${COMPILE_PROFILE}/BepInEx/core${RESET}"
      BUILD_ARGS+=("-p:BepInExCoreDir=${COMPILE_PROFILE}/BepInEx/core")
    fi
  fi
fi

"${DOTNET_BIN}" build "${CSPROJ_PATH}" "${BUILD_ARGS[@]}"

# -----------------------------------------------------------------------------
# 4. Artifact & Cliff-Edge Verification (<Private>false</Private> Guard)
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

if [[ "${MODE}" == "dry-run" ]]; then
  echo ""
  echo -e "${GREEN}${BOLD}DRY-RUN SUCCEEDED!${RESET} Artifact verified at:"
  echo -e "  ${CYAN}${DLL_PATH}${RESET} (${DLL_BYTES} bytes)"
  echo -e "When ready to install into Valheim, run: ${BOLD}bash tools/build-and-deploy.sh --deploy${RESET}"
  exit 0
fi

# -----------------------------------------------------------------------------
# 5. Multi-Target Deployment (Steam + Mod Manager Profiles)
# -----------------------------------------------------------------------------
if [[ -n "${TARGET_PROFILE}" && "${#MATCHING_PROFILE_DIRS[@]}" -eq 0 ]]; then
  echo -e "${RED}[ERROR] Requested Mod Manager profile '${TARGET_PROFILE}' was not found.${RESET}"
  exit 1
fi

DEPLOY_DEST_DIRS=()
STEAM_HAS_BEPINEX=0
if [[ -n "${RESOLVED_VALHEIM}" && -f "${RESOLVED_VALHEIM}/BepInEx/core/BepInEx.dll" ]]; then
  STEAM_HAS_BEPINEX=1
fi

if [[ -z "${TARGET_PROFILE}" ]]; then
  if [[ "${STEAM_HAS_BEPINEX}" -eq 1 || ( "${#MATCHING_PROFILE_DIRS[@]}" -eq 0 && -n "${RESOLVED_VALHEIM}" ) ]]; then
    DEPLOY_DEST_DIRS+=("${RESOLVED_VALHEIM}/BepInEx/plugins/HelloValheim")
  fi
fi

for prof_dir in "${MATCHING_PROFILE_DIRS[@]}"; do
  DEPLOY_DEST_DIRS+=("${prof_dir}/BepInEx/plugins/HelloValheim")
done

if [[ "${#DEPLOY_DEST_DIRS[@]}" -eq 0 ]]; then
  echo -e "${RED}[ERROR] Cannot deploy because neither a Steam Valheim directory nor a Mod Manager profile was found.${RESET}"
  exit 1
fi

echo ""
echo -e "${BOLD}Deploying HelloValheim.dll to ${#DEPLOY_DEST_DIRS[@]} target(s)...${RESET}"
for dest_dir in "${DEPLOY_DEST_DIRS[@]}"; do
  mkdir -p "${dest_dir}"
  cp -f "${DLL_PATH}" "${dest_dir}/HelloValheim.dll"
  echo -e "  ${GREEN}[DEPLOYED]${RESET} ${dest_dir}/HelloValheim.dll"
done

echo ""
echo -e "${BOLD}======================================================================${RESET}"
echo -e "  ${GREEN}${BOLD}DEPLOY COMPLETE!${RESET} (${#DEPLOY_DEST_DIRS[@]} destination(s) updated)"
echo -e "  Next Step (Chamber 3): Boot & Verify"
echo -e "  1. Launch Valheim (via Mod Manager or Steam with ${CYAN}./start_game_bepinex.sh %command% -console${RESET})"
echo -e "  2. Watch your log live:"
echo -e "     ${BOLD}grep -E 'HelloValheim|vikingping' \"${RESOLVED_VALHEIM}/BepInEx/LogOutput.log\"${RESET}"
echo -e "  3. Press ${BOLD}F5${RESET} at the Main Menu and type: ${BOLD}vikingping${RESET} or ${BOLD}vikinginspect${RESET}"
echo -e "  4. Undo anytime in 1 second: ${BOLD}bash tools/build-and-deploy.sh --reset${RESET}"
echo -e "${BOLD}======================================================================${RESET}"
