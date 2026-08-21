#!/usr/bin/env bash

# Creates a native macOS Application shortcut in ~/Applications and Desktop

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$HOME/Applications/GitLab Dashboard.app"
DESKTOP_PATH="$HOME/Desktop/GitLab Dashboard.app"

echo "Creating macOS Application shortcut..."
mkdir -p "$HOME/Applications"

osacompile -o "$APP_PATH" -e "do shell script \"open -a Terminal '$SCRIPT_DIR/start-mac.command'\""
cp -R "$APP_PATH" "$DESKTOP_PATH" 2>/dev/null || true

echo "=================================================================="
echo "✅ Done! 'GitLab Dashboard.app' has been added to:"
echo "   1. Spotlight Search (Press Cmd+Space and type 'GitLab Dashboard')"
echo "   2. Launchpad"
echo "   3. Your Desktop (~/Desktop/GitLab Dashboard.app)"
echo "   4. Your Applications folder (~/Applications)"
echo ""
echo "Tip: You can now drag the icon onto your Dock!"
echo "=================================================================="
