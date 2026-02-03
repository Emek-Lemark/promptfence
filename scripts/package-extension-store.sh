#!/bin/bash
# Package PromptFence extension for Chrome Web Store submission
# Zips ONLY the /extension directory, excludes dev/admin artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
EXTENSION_DIR="$ROOT_DIR/extension"
DIST_DIR="$ROOT_DIR/dist"
OUTPUT_FILE="$DIST_DIR/promptfence-store.zip"

# Create dist directory if missing
mkdir -p "$DIST_DIR"

# Remove existing zip if present
rm -f "$OUTPUT_FILE"

# Change to extension directory
cd "$EXTENSION_DIR"

# Create zip excluding dev artifacts and admin-specific files
zip -r "$OUTPUT_FILE" . \
    -x "node_modules/*" \
    -x "node_modules" \
    -x ".DS_Store" \
    -x "**/.DS_Store" \
    -x "dist/*" \
    -x "dist" \
    -x ".env*" \
    -x "*.log" \
    -x ".git/*" \
    -x "promptfence-extension.zip" \
    -x "tests/*" \
    -x "tests" \
    -x "*.test.js"

echo "✔ Store extension packaged"
echo "$OUTPUT_FILE"
