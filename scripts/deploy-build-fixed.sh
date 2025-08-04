#!/bin/bash

# Enhanced deployment build script for Render with comprehensive Vite installation handling
# Addresses Node.js v22 compatibility and npm cache issues specifically for Render deployments

set -e

echo "🚀 Starting OneKeel deployment build (Enhanced for Render)..."

# Utility functions for better logging
print_status() {
    echo -e "\033[1;32m$1\033[0m"
}

print_error() {
    echo -e "\033[1;31m$1\033[0m"
}

print_warning() {
    echo -e "\033[1;33m$1\033[0m"
}

# Set environment with Node.js v22 optimizations
export NODE_ENV=production
export CI=true
export NODE_OPTIONS="--max-old-space-size=4096"
export NPM_CONFIG_LOGLEVEL=verbose

# Show detailed environment info
print_status "📋 Environment Information:"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "NODE_ENV: $NODE_ENV"
echo "Available memory: $(node -e "console.log(Math.round(process.memoryUsage().heapTotal / 1024 / 1024)) + 'MB'")"

# Clean up any existing builds
print_status "🧹 Cleaning up previous builds..."
rm -rf dist/ client/dist/ .parcel-cache/

# Install root dependencies with enhanced error handling
print_status "📦 Installing root dependencies..."
npm ci --production=false --verbose --no-audit --prefer-offline

# Build client using a robust approach for Render
print_status "🔨 Building client application..."

# Navigate to client directory and handle dependencies separately
cd client

# Clear npm cache completely to avoid Render-specific cache issues
print_status "🧹 Clearing npm cache (Render compatibility)..."
npm cache clean --force
npm cache verify

# Install client dependencies with retry logic for Node.js v22 compatibility
print_status "📦 Installing client dependencies with Node.js v22 optimizations..."
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if npm ci --verbose --no-audit --prefer-offline --production=false; then
        print_status "✅ Client dependencies installed successfully"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        print_warning "⚠️ Client dependency installation failed (attempt $RETRY_COUNT of $MAX_RETRIES)"
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            print_status "🔄 Clearing cache and retrying..."
            npm cache clean --force
            sleep 2
        else
            print_error "❌ Failed to install client dependencies after $MAX_RETRIES attempts"
            exit 1
        fi
    fi
done

# Enhanced Vite installation verification with multiple fallback strategies
print_status "🔍 Verifying Vite installation (Enhanced for Render)..."

# Strategy 1: Check if vite is properly listed and accessible
if npm list vite >/dev/null 2>&1 && [ -f "node_modules/.bin/vite" ]; then
    print_status "✅ Vite is properly installed and accessible"
    VITE_VERSION=$(npm list vite --depth=0 2>/dev/null | grep vite@ | head -1 | sed 's/.*vite@//' | sed 's/ .*//')
    echo "Vite version: $VITE_VERSION"
else
    print_warning "⚠️ Vite not found or not accessible, implementing fallback strategies..."
    
    # Strategy 2: Force reinstall Vite specifically
    print_status "🔧 Strategy 2: Force reinstalling Vite..."
    npm install vite@^5.4.19 @vitejs/plugin-react@^4.3.2 --save-dev --force
    
    # Strategy 3: If still not working, install globally as fallback
    if ! npm list vite >/dev/null 2>&1; then
        print_warning "🔧 Strategy 3: Installing Vite globally as fallback..."
        npm install -g vite@^5.4.19
    fi
    
    # Final verification
    if npm list vite >/dev/null 2>&1 || command -v vite >/dev/null 2>&1; then
        print_status "✅ Vite installation verified after fallback"
    else
        print_error "❌ Failed to install Vite after all fallback strategies"
        print_error "📋 Debugging information:"
        echo "npm list output:"
        npm list --depth=0 || true
        echo "node_modules/.bin/ contents:"
        ls -la node_modules/.bin/ | head -20 || true
        exit 1
    fi
fi

# Additional verification: Check for required build dependencies
print_status "🔍 Verifying all required build dependencies..."
REQUIRED_DEPS=("@vitejs/plugin-react" "typescript" "tailwindcss" "autoprefixer" "postcss")
MISSING_DEPS=()

for dep in "${REQUIRED_DEPS[@]}"; do
    if ! npm list "$dep" >/dev/null 2>&1; then
        MISSING_DEPS+=("$dep")
    fi
done

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    print_warning "⚠️ Missing dependencies detected: ${MISSING_DEPS[*]}"
    print_status "🔧 Installing missing dependencies..."
    for dep in "${MISSING_DEPS[@]}"; do
        npm install "$dep" --save-dev
    done
fi

# Build the client with enhanced error reporting
print_status "🏗️ Building client application..."

# Use multiple build strategies for maximum compatibility
if npx vite build --verbose; then
    print_status "✅ Vite build completed successfully"
elif [ -f "node_modules/.bin/vite" ] && node_modules/.bin/vite build --verbose; then
    print_status "✅ Vite build completed successfully (direct binary)"
elif command -v vite >/dev/null 2>&1 && vite build --verbose; then
    print_status "✅ Vite build completed successfully (global vite)"
else
    print_error "❌ All Vite build strategies failed"
    print_error "📋 Build debugging information:"
    echo "Vite binary locations:"
    find . -name "vite" -type f 2>/dev/null || true
    echo "node_modules/.bin contents:"
    ls -la node_modules/.bin/ 2>/dev/null || true
    echo "Package.json devDependencies:"
    node -e "console.log(JSON.stringify(require('./package.json').devDependencies, null, 2))"
    exit 1
fi

# Verify build output
if [ ! -d "dist" ]; then
    print_error "❌ Client build failed - no dist directory found"
    exit 1
fi

print_status "✅ Client build completed successfully"
echo "Client build size: $(du -sh dist | cut -f1)"
ls -la dist/

# Go back to root
cd ..

# Copy client build to final location
print_status "📁 Copying client build..."
mkdir -p dist/client
cp -r client/dist/* dist/client/

# Build server with enhanced configuration for Node.js v22
print_status "🔧 Building server application..."
npm run build:server

# Verify final build
print_status "🔍 Verifying final build..."
if [ -d "dist/client" ] && [ -f "dist/index.js" ]; then
    print_status "✅ Build completed successfully!"
    echo "Client files:"
    ls -la dist/client/
    echo "Server files:"
    ls -la dist/
else
    print_error "❌ Build verification failed"
    exit 1
fi

print_status "🎉 Deployment build completed successfully!"
print_status "📋 Build Summary:"
echo "Total build size: $(du -sh dist | cut -f1)"
echo "Node.js version used: $(node --version)"
echo "NPM version used: $(npm --version)"