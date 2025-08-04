#!/bin/bash

# Test script to verify the build works locally before deploying to Render

set -e

echo "🧪 Testing local build process..."

# Save current directory
ORIGINAL_DIR=$(pwd)

# Test client build
echo "📦 Testing client build..."
cd client

# Check if vite is installed
if [ -f "node_modules/.bin/vite" ]; then
    echo "✅ Vite is installed"
    echo "Vite version: $(node -p "require('./node_modules/vite/package.json').version" 2>/dev/null || echo 'unknown')"
else
    echo "❌ Vite not found, installing..."
    npm install
fi

# Test the build
echo "🏗️  Running vite build..."
if npx vite build; then
    echo "✅ Client build successful!"
    echo "Build output size: $(du -sh dist | cut -f1)"
else
    echo "❌ Client build failed"
    exit 1
fi

# Clean up
rm -rf dist

# Return to original directory
cd "$ORIGINAL_DIR"

echo "✅ All tests passed! The build should work on Render."
echo ""
echo "📋 Next steps:"
echo "1. Commit and push these changes"
echo "2. Update Render build command to: ./render-build.sh"
echo "3. Trigger a new deployment"