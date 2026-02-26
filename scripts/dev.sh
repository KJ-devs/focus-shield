#!/bin/bash
# Script de lancement du dev server Focus Shield
# Fixe le PATH pour inclure dlltool.exe, as.exe, gcc.exe (MinGW64) requis par le toolchain GNU Rust

# MinGW64 à la FIN du PATH pour ne pas casser les outils Unix (grep, head, tail...)
export PATH="$PATH:/c/msys64/mingw64/bin:/c/Users/maxto/AppData/Roaming/npm"

echo "✓ dlltool.exe: $(which dlltool)"
echo "✓ pnpm: $(which pnpm)"
echo "➜ Lancement de tauri dev..."
echo ""

cd "$(dirname "$0")/.." || exit 1
pnpm --filter @focus-shield/desktop tauri dev
