#!/bin/bash
# Package Focus Shield extension for Chrome Web Store submission.
#
# Usage:
#   bash scripts/package-chrome.sh
#
# Output:
#   focus-shield-chrome.zip in the browser-extension root directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building extension..."
cd "$EXT_DIR"
pnpm build

echo "Packaging for Chrome Web Store..."
cd "$EXT_DIR/dist"
zip -r "$EXT_DIR/focus-shield-chrome.zip" . -x "*.map"

echo "Chrome package created: $EXT_DIR/focus-shield-chrome.zip"
