#!/bin/bash

# Build script for Render deployment
set -e

echo "🚀 Starting build process..."

# Set production environment to skip dev tools
export NODE_ENV=production

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build client application
echo "🔨 Building client application..."
npm run build:client

# Build server application
echo "🔧 Building server application..."
npm run build:server

# Copy client build to dist for static serving
echo "📁 Copying client build to dist..."
mkdir -p dist/client
cp -r client/dist/* dist/client/

echo "✅ Build completed successfully!"
