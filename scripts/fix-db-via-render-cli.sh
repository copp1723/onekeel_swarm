#!/bin/bash

# Fix Production Database via Render CLI
# This script uses the Render CLI to apply schema fixes to your production database

echo "🔧 OneKeel Swarm Production Database Fix via Render CLI"
echo "======================================================"

# Check if render CLI is installed
if ! command -v render &> /dev/null; then
    echo "❌ Render CLI is not installed"
    echo ""
    echo "Please install it with:"
    echo "  brew install render"
    echo ""
    echo "Or download from: https://github.com/render-oss/cli/releases"
    exit 1
fi

# Check if logged in
if ! render login --output json &> /dev/null; then
    echo "❌ Not logged in to Render CLI"
    echo ""
    echo "Please run: render login"
    exit 1
fi

echo "✅ Render CLI is installed and authenticated"
echo ""

# Get the database ID
echo "📊 Finding your PostgreSQL database..."
DATABASE_ID=$(render services --output json | jq -r '.[] | select(.type == "postgres" and .name == "ccl-3") | .id')

if [ -z "$DATABASE_ID" ]; then
    echo "❌ Could not find database 'ccl-3'"
    echo ""
    echo "Available databases:"
    render services --output json | jq -r '.[] | select(.type == "postgres") | .name'
    exit 1
fi

echo "✅ Found database: $DATABASE_ID"
echo ""

# Check if the fix script exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIX_SCRIPT="$SCRIPT_DIR/production-complete-schema-fix.sql"

if [ ! -f "$FIX_SCRIPT" ]; then
    echo "❌ Schema fix script not found at: $FIX_SCRIPT"
    exit 1
fi

echo "📝 Will apply schema fixes from: $FIX_SCRIPT"
echo ""
echo "This will:"
echo "  - Create 6 missing tables"
echo "  - Add 2 missing columns"
echo "  - Set up migration tracking"
echo "  - Create performance indexes"
echo "  - Insert default feature flags"
echo ""
echo "⚠️  WARNING: This will modify your production database!"
echo ""
read -p "Do you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo "🚀 Applying database fixes..."
echo ""

# Apply the fix using psql via render CLI
render psql "$DATABASE_ID" < "$FIX_SCRIPT"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database fixes applied successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Verify the fixes: npm run test:prod-db"
    echo "  2. Check application: npm run dev"
    echo "  3. Monitor logs: render logs ccl-3-final"
else
    echo ""
    echo "❌ Error applying database fixes"
    echo ""
    echo "Try running manually:"
    echo "  render psql $DATABASE_ID"
    echo "  Then paste the contents of: $FIX_SCRIPT"
fi