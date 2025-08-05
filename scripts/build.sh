#!/bin/bash

# Build script for Render deployment
set -e

echo "🚀 Starting build process..."

# Set production environment to skip dev tools
export NODE_ENV=production

# Install root dependencies
echo "📦 Installing root dependencies..."
npm ci --verbose

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Clean npm cache to avoid any corruption issues
npm cache clean --force

# Install dependencies with verbose output (including devDependencies)
npm ci --verbose --include=dev

echo "✅ Client dependencies installed"
echo "Checking if vite is available..."
if [ -f "node_modules/.bin/vite" ]; then
    echo "✅ Vite binary found at node_modules/.bin/vite"
    ls -la node_modules/.bin/vite
else
    echo "❌ Vite binary not found"
    echo "Listing node_modules/.bin directory:"
    ls -la node_modules/.bin/ || echo "node_modules/.bin directory not found"
    exit 1
fi

# Build client application
echo "🔨 Building client application..."
npm run build

echo "✅ Client build completed"
echo "Checking build output..."
if [ -d "dist" ]; then
    echo "✅ Client dist directory created"
    ls -la dist/
else
    echo "❌ Client dist directory not found"
    exit 1
fi

cd ..

# Ensure dist/client directory exists and copy build
echo "📁 Setting up client build directory..."
mkdir -p dist/client
cp -r client/dist/* dist/client/

echo "✅ Client build copied to dist/client"

# Build server application
echo "🔧 Building server application..."
npm run build:server

echo "✅ Build completed successfully!"
