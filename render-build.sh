#!/bin/bash

# Render.com specific build script for OneKeel Swarm
# Fixes Vite installation issues with Node.js v22

set -e

echo "🚀 Starting OneKeel Render deployment build..."

# DON'T set NODE_ENV during build - let Render handle it at runtime
# This ensures devDependencies are installed properly
export CI=true

# Show environment info
echo "📋 Build Environment:"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "NODE_ENV: ${NODE_ENV:-not set}"

# Clean up any existing builds
echo "🧹 Cleaning up previous builds..."
rm -rf dist/
rm -rf client/dist/

# Install root dependencies including devDependencies
echo "📦 Installing root dependencies..."
npm ci --include=dev --verbose

# Build client with proper dependency handling
echo "🔨 Building client application..."
cd client

# Clean npm cache to avoid corruption
npm cache clean --force

# Install ALL client dependencies including devDependencies
echo "📦 Installing client dependencies (including build tools)..."
npm ci --include=dev --verbose

# Verify Vite installation with multiple checks
echo "🔍 Verifying Vite installation..."

# Check 1: npm list
if npm list vite >/dev/null 2>&1; then
    echo "✅ Vite found in npm list"
else
    echo "⚠️  Vite not found in npm list"
fi

# Check 2: Binary existence
if [ -f "node_modules/.bin/vite" ]; then
    echo "✅ Vite binary found at node_modules/.bin/vite"
    ls -la node_modules/.bin/vite
else
    echo "❌ Vite binary not found - attempting to install..."
    npm install vite@^5.4.19 --save-dev --verbose
fi

# Check 3: Direct node_modules check
if [ -d "node_modules/vite" ]; then
    echo "✅ Vite package found in node_modules"
    echo "Vite version: $(node -p "require('./node_modules/vite/package.json').version" 2>/dev/null || echo 'unknown')"
else
    echo "❌ Vite package not found in node_modules"
fi

# Build the client with fallback strategies
echo "🏗️  Building client application..."

# Strategy 1: Try npx (without --verbose since vite doesn't support it)
if npx vite build; then
    echo "✅ Build completed with npx"
elif [ -f "node_modules/.bin/vite" ]; then
    # Strategy 2: Try direct binary execution
    echo "⚠️  npx failed, trying direct binary..."
    ./node_modules/.bin/vite build
elif command -v vite &> /dev/null; then
    # Strategy 3: Try global vite
    echo "⚠️  Direct binary failed, trying global vite..."
    vite build
else
    # Strategy 4: Try node direct execution
    echo "⚠️  All strategies failed, trying direct node execution..."
    node node_modules/vite/bin/vite.js build
fi

# Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Client build failed - no dist directory found"
    
    # Debug information
    echo "🔍 Debug information:"
    echo "Current directory: $(pwd)"
    echo "Directory contents:"
    ls -la
    echo "node_modules/.bin contents:"
    ls -la node_modules/.bin/ || echo "node_modules/.bin not found"
    
    exit 1
fi

echo "✅ Client build completed successfully"
echo "Build size: $(du -sh dist | cut -f1)"

# Go back to root
cd ..

# Copy client build to final location
echo "📁 Organizing build artifacts..."
mkdir -p dist/client
cp -r client/dist/* dist/client/

# Build server
echo "🔧 Building server application..."
npm run build:server

# Verify final build
echo "🔍 Verifying final build..."
if [ -d "dist/client" ] && [ -f "dist/index.js" ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📊 Build Summary:"
    echo "Total size: $(du -sh dist | cut -f1)"
    echo "Client files: $(find dist/client -type f | wc -l)"
    echo "Server bundle: $(du -sh dist/index.js | cut -f1)"
else
    echo "❌ Build verification failed"
    echo "dist contents:"
    ls -la dist/
    exit 1
fi

echo "🎉 Render deployment build completed successfully!"