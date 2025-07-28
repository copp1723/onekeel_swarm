#!/bin/bash

# Build script for Render deployment
set -e

echo "🚀 Starting build process..."

# Skip root dependencies for now (has dependency conflicts)
echo "📦 Skipping root dependencies (client-only build)..."

# Build only the client for now (backend has dependency issues)
echo "🔨 Building client application..."
npm run build:client

# Copy client build to dist for deployment
echo "📁 Copying client build to dist..."
mkdir -p dist
cp -r client/dist/* dist/

echo "✅ Build completed successfully!"
