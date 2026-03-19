#!/bin/bash
# quickstart.sh — Full setup and launch of Focus Shield
#
# This script:
#   1. Checks prerequisites (pnpm, node, rust, mingw64)
#   2. Installs dependencies
#   3. Builds all packages
#   4. Builds the browser extension
#   5. Verifies the daemon binary
#   6. Prints Chrome extension install instructions
#   7. Launches the desktop app (Tauri dev mode)
#
# Usage: bash scripts/quickstart.sh

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

step=0
total_steps=7

print_step() {
  step=$((step + 1))
  echo ""
  echo -e "${CYAN}${BOLD}[$step/$total_steps] $1${NC}"
  echo "─────────────────────────────────────────"
}

print_ok() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

print_fail() {
  echo -e "  ${RED}✗${NC} $1"
}

echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}  FOCUS SHIELD — QUICKSTART${NC}"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"

# ──────────────────────────────────────────
# Step 1: Check prerequisites
# ──────────────────────────────────────────
print_step "Checking prerequisites"

HAS_ERROR=0

if command -v pnpm &>/dev/null; then
  print_ok "pnpm $(pnpm --version)"
else
  print_fail "pnpm not found — install with: npm install -g pnpm"
  HAS_ERROR=1
fi

if command -v node &>/dev/null; then
  print_ok "node $(node --version)"
else
  print_fail "node not found — install from https://nodejs.org"
  HAS_ERROR=1
fi

if command -v rustc &>/dev/null; then
  print_ok "rustc $(rustc --version | awk '{print $2}')"
else
  print_fail "rust not found — install from https://rustup.rs"
  HAS_ERROR=1
fi

if command -v cargo &>/dev/null; then
  print_ok "cargo $(cargo --version | awk '{print $2}')"
else
  print_fail "cargo not found — install with: rustup"
  HAS_ERROR=1
fi

# Check MinGW64 (Windows specific)
export PATH="$PATH:/c/msys64/mingw64/bin:/c/Users/maxto/AppData/Roaming/npm"

if command -v gcc &>/dev/null; then
  print_ok "gcc (MinGW64) found"
else
  print_warn "gcc (MinGW64) not found — may be needed for Rust compilation on Windows"
  print_warn "Install MSYS2 from https://www.msys2.org/ then: pacman -S mingw-w64-x86_64-toolchain"
fi

if [ "$HAS_ERROR" -eq 1 ]; then
  echo ""
  echo -e "${RED}Prerequisites missing. Please install them and retry.${NC}"
  exit 1
fi

# ──────────────────────────────────────────
# Step 2: Install dependencies
# ──────────────────────────────────────────
print_step "Installing dependencies (pnpm install)"

pnpm install --frozen-lockfile 2>&1 | tail -3 || pnpm install 2>&1 | tail -3
print_ok "Dependencies installed"

# ──────────────────────────────────────────
# Step 3: Build packages
# ──────────────────────────────────────────
print_step "Building TypeScript packages"

pnpm --filter @focus-shield/shared-types build 2>&1 | tail -3
print_ok "shared-types built"

pnpm --filter @focus-shield/crypto build 2>&1 | tail -3
print_ok "crypto built"

pnpm --filter @focus-shield/blocker-core build 2>&1 | tail -3
print_ok "blocker-core built"

pnpm --filter @focus-shield/session-engine build 2>&1 | tail -3
print_ok "session-engine built"

pnpm --filter @focus-shield/storage build 2>&1 | tail -3
print_ok "storage built"

# ──────────────────────────────────────────
# Step 4: Build browser extension
# ──────────────────────────────────────────
print_step "Building browser extension"

pnpm --filter @focus-shield/browser-extension build 2>&1 | tail -5
print_ok "Chrome extension built in apps/browser-extension/dist/"

# Build Firefox version too
pnpm --filter @focus-shield/browser-extension build:firefox 2>&1 | tail -3 || true
print_ok "Firefox extension built (if applicable)"

# ──────────────────────────────────────────
# Step 5: Verify daemon binary
# ──────────────────────────────────────────
print_step "Verifying daemon binary"

DAEMON_BIN="apps/desktop/src-tauri/binaries/focus-shield-daemon-x86_64-pc-windows-gnu.exe"

if [ -f "$DAEMON_BIN" ]; then
  SIZE=$(du -h "$DAEMON_BIN" | awk '{print $1}')
  print_ok "Daemon binary found ($SIZE)"
else
  print_warn "Daemon binary not found at $DAEMON_BIN"
  echo "  Compiling daemon..."
  (
    cd apps/desktop/src-tauri/daemon
    cargo build --release --target x86_64-pc-windows-gnu 2>&1 | tail -5
    cp target/x86_64-pc-windows-gnu/release/focus-shield-daemon.exe "../binaries/focus-shield-daemon-x86_64-pc-windows-gnu.exe"
  )
  print_ok "Daemon compiled and placed"
fi

# ──────────────────────────────────────────
# Step 6: Chrome extension install instructions
# ──────────────────────────────────────────
print_step "Browser extension setup"

EXTENSION_DIR="$(cd apps/browser-extension && pwd)"
echo ""
echo -e "  ${BOLD}To install the extension in Chrome:${NC}"
echo ""
echo -e "  1. Open Chrome and go to ${CYAN}chrome://extensions${NC}"
echo -e "  2. Enable ${BOLD}Developer mode${NC} (toggle top right)"
echo -e "  3. Click ${BOLD}\"Load unpacked\"${NC}"
echo -e "  4. Select this folder:"
echo -e "     ${CYAN}${EXTENSION_DIR}${NC}"
echo ""
echo -e "  ${BOLD}To install in Firefox:${NC}"
echo ""
echo -e "  1. Open Firefox and go to ${CYAN}about:debugging#/runtime/this-firefox${NC}"
echo -e "  2. Click ${BOLD}\"Load Temporary Add-on\"${NC}"
echo -e "  3. Select: ${CYAN}${EXTENSION_DIR}/manifest.firefox.json${NC}"
echo ""
echo -e "  ${YELLOW}Important:${NC} The extension must be loaded BEFORE starting a session"
echo -e "  so the daemon can send blocking rules to it via WebSocket (port 7532)."
echo ""

# ──────────────────────────────────────────
# Step 7: Launch the desktop app
# ──────────────────────────────────────────
print_step "Launching Focus Shield desktop app"

echo ""
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  QUICKSTART COMPLETE!${NC}"
echo -e "${BOLD}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Starting Tauri dev server...${NC}"
echo -e "  Frontend: ${CYAN}http://localhost:1420${NC}"
echo -e "  Daemon WS: ${CYAN}ws://127.0.0.1:7532${NC}"
echo ""
echo -e "  ${YELLOW}Tip:${NC} Load the extension in Chrome first, then start a session."
echo -e "  ${YELLOW}Tip:${NC} The daemon starts automatically with the desktop app."
echo ""

pnpm --filter @focus-shield/desktop tauri dev
