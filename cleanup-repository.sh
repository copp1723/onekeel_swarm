#!/bin/bash

# Repository Cleanup Script
# Removes duplicate, unused, and dead code files safely
# Run with: bash cleanup-repository.sh

set -e

echo "🧹 Starting Repository Cleanup"
echo "=============================="

# Create backup of current state
BACKUP_DIR="cleanup-backup-$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup in $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Function to safely remove file/directory
safe_remove() {
    local path="$1"
    local description="$2"
    
    if [ -e "$path" ]; then
        echo "🗑️  Removing $description: $path"
        # Create backup before removal
        mkdir -p "$BACKUP_DIR/$(dirname "$path")"
        cp -r "$path" "$BACKUP_DIR/$path" 2>/dev/null || true
        rm -rf "$path"
        echo "   ✅ Removed and backed up"
    else
        echo "   ⚠️  Not found: $path"
    fi
}

echo ""
echo "🔄 Phase 1: Removing Duplicate Files"
echo "===================================="

# Duplicate package files
safe_remove "package 2.json" "duplicate package.json"
safe_remove "package-lock 2.json" "duplicate package-lock.json"
safe_remove "client/package-lock 2.json" "duplicate client package-lock.json"

# Duplicate component files
safe_remove "client/src/views/EnhancedDashboardView 2.tsx" "duplicate dashboard view"

# Duplicate scripts
safe_remove "fix-build 2.sh" "duplicate build script"

echo ""
echo "🗂️  Phase 2: Removing Backup Files"
echo "=================================="

# Environment backups
safe_remove ".env.backup.20250730_005136" "environment backup"
safe_remove ".env.bak" "environment backup"
safe_remove "backups/security/.env.backup.20250729_145357" "security backup"
safe_remove "backups/security/.env.backup.20250729_150346" "security backup"

# Code backups
safe_remove "client/src/components/campaign-wizard/CampaignWizard.tsx.backup" "component backup"
safe_remove "server/routes/feature-flags.ts.backup" "route backup"
safe_remove "server/utils/service-health/twilio-health.ts.backup" "service backup"

# Directory backups
safe_remove "server.backup.20250725_221701" "server backup directory"
safe_remove "node_modules_backup_1753853305" "node_modules backup"

echo ""
echo "🎭 Phase 3: Removing Unused Mock Files"
echo "======================================"

# Mock files that are no longer used (real implementations exist)
safe_remove "server/routes/campaigns-mock.ts" "unused campaigns mock"
safe_remove "server/routes/leads-mock.ts" "unused leads mock"
safe_remove "server/routes/users-mock.ts" "unused users mock"
safe_remove "server/routes/clients-mock.ts" "unused clients mock"
safe_remove "server/routes/conversations-mock.ts" "unused conversations mock"
safe_remove "server/routes/email-mock.ts" "unused email mock"

echo ""
echo "🧪 Phase 4: Removing Development/Testing Files"
echo "=============================================="

# Development servers
safe_remove "simple-server.js" "development test server"
safe_remove "simple_test_server.cjs" "development test server"

# Test files
safe_remove "test-bundle.js" "test bundle"
safe_remove "test-vulnerabilities.js" "vulnerability test"
safe_remove "test_auth_fix.js" "auth test file"

# Development scripts
safe_remove "vscode_mcp_integration.py" "VSCode integration script"

echo ""
echo "🛠️  Phase 5: Removing One-time Cleanup Scripts"
echo "=============================================="

# Scripts that were used for one-time fixes
safe_remove "cleanup-imports.js" "import cleanup script"
safe_remove "check-missing-imports.sh" "import check script"
safe_remove "fix-lucide-imports.ts" "lucide import fix"
safe_remove "add-missing-columns.sh" "database migration script"

echo ""
echo "📁 Phase 6: Removing Empty Directories"
echo "======================================"

# Empty tool directories
safe_remove "tools/generators" "empty generators directory"
safe_remove "tools/utilities" "empty utilities directory"
safe_remove "tools/validators" "empty validators directory"

# Empty test directories
safe_remove "tests/e2e" "empty e2e tests directory"
safe_remove "tests/unit" "empty unit tests directory"

# Empty security directories
safe_remove "security/fixes" "empty security fixes directory"
safe_remove "security/monitoring" "empty security monitoring directory"
safe_remove "security/tests" "empty security tests directory"

echo ""
echo "📊 Cleanup Summary"
echo "=================="

# Count files in backup
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(find "$BACKUP_DIR" -type f | wc -l)
    echo "✅ Cleanup completed successfully"
    echo "📦 $BACKUP_COUNT files backed up to: $BACKUP_DIR"
    echo "💾 Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
else
    echo "⚠️  No files were removed (backup directory not created)"
fi

echo ""
echo "🔍 Repository Status After Cleanup"
echo "=================================="

# Show current repository size
echo "📁 Current repository size: $(du -sh . --exclude='.git' --exclude='node_modules' --exclude='client/node_modules' --exclude='client/dist' --exclude='dist' | cut -f1)"

# Count remaining files
TOTAL_FILES=$(find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -path './client/node_modules/*' -not -path './client/dist/*' -not -path './dist/*' | wc -l)
echo "📄 Total files (excluding git/node_modules/dist): $TOTAL_FILES"

echo ""
echo "✨ Cleanup Complete!"
echo "==================="
echo "🎯 Repository is now cleaner and more maintainable"
echo "🔄 You can restore any file from: $BACKUP_DIR"
echo "🗑️  To permanently delete backup: rm -rf $BACKUP_DIR"

echo ""
echo "📋 Next Steps:"
echo "1. Test the application to ensure nothing is broken"
echo "2. Run 'npm run build' to verify build still works"
echo "3. Commit the cleanup changes"
echo "4. Delete the backup directory when confident"
