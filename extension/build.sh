#!/bin/bash
# Build script for PromptFence browser extension
# Usage: ./build.sh chrome|firefox|all

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

# Files to include in the extension package
FILES=(
  "rules.js"
  "src/logic.js"
  "content.js"
  "service_worker.js"
  "options.js"
  "options.html"
  "welcome.js"
  "welcome.html"
  "ui.css"
)

build_chrome() {
  echo "Building Chrome extension..."
  rm -rf "$DIST_DIR/chrome"
  mkdir -p "$DIST_DIR/chrome/src"

  cp "$SCRIPT_DIR/manifest.json" "$DIST_DIR/chrome/manifest.json"
  for f in "${FILES[@]}"; do
    cp "$SCRIPT_DIR/$f" "$DIST_DIR/chrome/$f"
  done

  cd "$DIST_DIR/chrome"
  zip -r "$DIST_DIR/promptfence-chrome.zip" . -x ".*"
  echo "✓ Chrome build: $DIST_DIR/promptfence-chrome.zip"
}

build_firefox() {
  echo "Building Firefox extension..."
  rm -rf "$DIST_DIR/firefox"
  mkdir -p "$DIST_DIR/firefox/src"

  cp "$SCRIPT_DIR/manifest-firefox.json" "$DIST_DIR/firefox/manifest.json"
  for f in "${FILES[@]}"; do
    cp "$SCRIPT_DIR/$f" "$DIST_DIR/firefox/$f"
  done

  cd "$DIST_DIR/firefox"
  zip -r "$DIST_DIR/promptfence-firefox.zip" . -x ".*"
  echo "✓ Firefox build: $DIST_DIR/promptfence-firefox.zip"
}

case "${1:-all}" in
  chrome)
    build_chrome
    ;;
  firefox)
    build_firefox
    ;;
  all)
    build_chrome
    build_firefox
    ;;
  *)
    echo "Usage: $0 {chrome|firefox|all}"
    exit 1
    ;;
esac

echo "Done."
