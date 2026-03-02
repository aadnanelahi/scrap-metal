#!/bin/bash
# Build Windows Installer Package
# Run this on the development machine to create the distributable package

set -e

echo "========================================"
echo "  Building ScrapOS Windows Installer"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/dist"
PACKAGE_NAME="ScrapOS-Windows-Installer"

# Create output directory
mkdir -p "$OUTPUT_DIR"
rm -rf "$OUTPUT_DIR/$PACKAGE_NAME"
mkdir -p "$OUTPUT_DIR/$PACKAGE_NAME"

echo "1. Copying installer files..."
cp -r "$SCRIPT_DIR/"* "$OUTPUT_DIR/$PACKAGE_NAME/"

echo "2. Copying backend code..."
mkdir -p "$OUTPUT_DIR/$PACKAGE_NAME/app/backend"
cp -r "$PROJECT_ROOT/backend/"* "$OUTPUT_DIR/$PACKAGE_NAME/app/backend/"
# Remove unnecessary files
rm -rf "$OUTPUT_DIR/$PACKAGE_NAME/app/backend/__pycache__"
rm -rf "$OUTPUT_DIR/$PACKAGE_NAME/app/backend/.pytest_cache"
rm -f "$OUTPUT_DIR/$PACKAGE_NAME/app/backend/.env"

echo "3. Building frontend for production..."
cd "$PROJECT_ROOT/frontend"
npm run build 2>/dev/null || yarn build

echo "4. Copying frontend build..."
mkdir -p "$OUTPUT_DIR/$PACKAGE_NAME/app/frontend"
cp -r "$PROJECT_ROOT/frontend/build" "$OUTPUT_DIR/$PACKAGE_NAME/app/frontend/"
cp "$PROJECT_ROOT/frontend/package.json" "$OUTPUT_DIR/$PACKAGE_NAME/app/frontend/"

echo "5. Creating archive..."
cd "$OUTPUT_DIR"
zip -r "$PACKAGE_NAME.zip" "$PACKAGE_NAME"

echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "Output: $OUTPUT_DIR/$PACKAGE_NAME.zip"
echo ""
echo "Package contents:"
du -sh "$OUTPUT_DIR/$PACKAGE_NAME"/*
echo ""
echo "To install on Windows:"
echo "  1. Copy $PACKAGE_NAME.zip to Windows server"
echo "  2. Extract the zip file"
echo "  3. Run PowerShell as Administrator"
echo "  4. Execute: .\\install.ps1"
