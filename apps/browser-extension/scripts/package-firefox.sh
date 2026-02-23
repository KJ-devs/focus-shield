#!/bin/bash
# Package Focus Shield extension for Firefox Add-ons submission.
#
# Usage:
#   bash scripts/package-firefox.sh
#
# Output:
#   focus-shield-firefox.xpi in the browser-extension root directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Building extension..."
cd "$EXT_DIR"
pnpm build

echo "Packaging for Firefox Add-ons..."
cd "$EXT_DIR/dist"
zip -r "$EXT_DIR/focus-shield-firefox.xpi" . -x "*.map"

echo "Firefox package created: $EXT_DIR/focus-shield-firefox.xpi"
