#!/bin/bash

# Alternative build script for Render deployment
# This script uses a more conservative approach to avoid common deployment issues

set -e

echo "🚀 Starting OneKeel deployment build..."

# Set environment
export NODE_ENV=production
export CI=true

# Show environment info
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"

# Clean up any existing builds
echo "🧹 Cleaning up previous builds..."
rm -rf dist/
rm -rf client/dist/

# Install root dependencies
echo "📦 Installing root dependencies..."
npm ci --production=false --verbose

# Build client using a safer approach
echo "🔨 Building client application..."

# Navigate to client directory and handle dependencies separately
cd client

# Clean npm cache to avoid corruption
npm cache clean --force

# Install client dependencies
echo "Installing client dependencies..."
npm ci --verbose

# Verify Vite installation
echo "Verifying Vite installation..."
if npm list vite >/dev/null 2>&1; then
    echo "✅ Vite is properly installed"
else
    echo "❌ Vite not found, attempting to install..."
    npm install vite@^5.4.19 --save-dev
fi

# Build the client
echo "Building client application..."
npx vite build --verbose

# Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Client build failed - no dist directory found"
    exit 1
fi

echo "✅ Client build completed successfully"
ls -la dist/

# Go back to root
cd ..

# Copy client build to final location
echo "📁 Copying client build..."
mkdir -p dist/client
cp -r client/dist/* dist/client/

# Build server
echo "🔧 Building server application..."
npm run build:server

# Verify final build
echo "🔍 Verifying final build..."
if [ -d "dist/client" ] && [ -f "dist/index.js" ]; then
    echo "✅ Build completed successfully!"
    echo "Client files:"
    ls -la dist/client/
    echo "Server files:"
    ls -la dist/
else
    echo "❌ Build verification failed"
    exit 1
fi

echo "🎉 Deployment build completed successfully!"
