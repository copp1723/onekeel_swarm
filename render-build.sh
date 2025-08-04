#!/usr/bin/env bash
# Wrapper script for Render build
# This script simply delegates to the main deployment build script located in scripts/deploy-build.sh
# Having this wrapper allows the Render build command to remain './render-build.sh'

set -euo pipefail

# Determine the directory of this file (should be repo root)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the main build script
MAIN_SCRIPT="$ROOT_DIR/scripts/deploy-build.sh"

if [[ ! -f "$MAIN_SCRIPT" ]]; then
  echo "❌ Expected build script not found at $MAIN_SCRIPT"
  exit 1
fi

# Ensure the main script is executable
chmod +x "$MAIN_SCRIPT"

# Execute the main build script
exec "$MAIN_SCRIPT" "$@"
