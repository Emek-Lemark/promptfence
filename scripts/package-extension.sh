#!/bin/bash
# Package PromptFence extension for distribution
# Zips ONLY the /extension directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
EXTENSION_DIR="$ROOT_DIR/extension"
OUTPUT_FILE="$EXTENSION_DIR/promptfence-extension.zip"
PUBLIC_DIR="$ROOT_DIR/app/public/extension"

# Remove existing zip if present
rm -f "$OUTPUT_FILE"

# Change to extension directory
cd "$EXTENSION_DIR"

# Create zip excluding dev artifacts
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
    -x "promptfence-extension.zip"

# Copy to public folder for web serving
mkdir -p "$PUBLIC_DIR"
cp "$OUTPUT_FILE" "$PUBLIC_DIR/"

echo "✔ Extension packaged"
echo "$OUTPUT_FILE"
echo "✔ Copied to app/public/extension/ for web serving"
