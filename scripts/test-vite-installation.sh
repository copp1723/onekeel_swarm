#!/bin/bash

# Test script to debug Vite installation issues in production environments
# This script replicates the exact conditions that cause Vite to be missing

set -e

echo "🧪 Testing Vite Installation Scenarios"
echo "======================================="

# Test 1: Production environment simulation
echo "📋 Test 1: Simulating production environment..."
export NODE_ENV=production
export CI=true

cd client

echo "Current environment:"
echo "NODE_ENV: $NODE_ENV"
echo "CI: $CI"
echo "Working directory: $(pwd)"

# Test npm ci with different flags
echo ""
echo "🔍 Testing npm ci behavior with different flags:"

# Backup current node_modules
if [ -d "node_modules" ]; then
    mv node_modules node_modules.backup
fi

echo "1. Testing: npm ci (default behavior with NODE_ENV=production)"
npm ci --dry-run 2>&1 | grep -E "(devDependencies|vite)" || echo "No vite/devDependencies mentioned"

echo ""
echo "2. Testing: npm ci --production=false (should include devDependencies)"
npm ci --production=false --dry-run 2>&1 | grep -E "(devDependencies|vite)" || echo "No vite/devDependencies mentioned"

echo ""
echo "3. Testing: npm ci --only=production (should exclude devDependencies)"
npm ci --only=production --dry-run 2>&1 | grep -E "(devDependencies|vite)" || echo "No vite/devDependencies mentioned"

# Restore node_modules
if [ -d "node_modules.backup" ]; then
    mv node_modules.backup node_modules
fi

echo ""
echo "🔧 Recommended fix for deployment scripts:"
echo "Replace: npm ci --verbose"
echo "With:    npm ci --production=false --verbose"
echo ""
echo "This ensures devDependencies (including Vite) are installed even when NODE_ENV=production"

cd ..