#!/bin/bash

# Repository Cleanup Verification Script
# Analyzes what will be removed and checks for potential issues
# Run with: bash verify-cleanup.sh

echo "🔍 Repository Cleanup Verification"
echo "=================================="

# Function to check if file exists and show info
check_file() {
    local path="$1"
    local description="$2"
    local category="$3"
    
    if [ -e "$path" ]; then
        local size=$(du -sh "$path" 2>/dev/null | cut -f1)
        echo "✅ [$category] $description: $path ($size)"
        return 0
    else
        echo "❌ [$category] NOT FOUND: $path"
        return 1
    fi
}

# Function to check if file is referenced in code
check_references() {
    local filename="$1"
    local description="$2"
    
    echo "🔍 Checking references to $description..."
    
    # Search for imports or references (excluding the file itself)
    local refs=$(grep -r "$filename" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v "$filename:" | head -5)
    
    if [ -n "$refs" ]; then
        echo "⚠️  Found references:"
        echo "$refs"
        return 1
    else
        echo "✅ No references found - safe to remove"
        return 0
    fi
}

echo ""
echo "📊 Phase 1: Analyzing Duplicate Files"
echo "====================================="

DUPLICATES_FOUND=0
check_file "package 2.json" "duplicate package.json" "DUPLICATE" && ((DUPLICATES_FOUND++))
check_file "package-lock 2.json" "duplicate package-lock.json" "DUPLICATE" && ((DUPLICATES_FOUND++))
check_file "client/package-lock 2.json" "duplicate client package-lock.json" "DUPLICATE" && ((DUPLICATES_FOUND++))
check_file "client/src/views/EnhancedDashboardView 2.tsx" "duplicate dashboard view" "DUPLICATE" && ((DUPLICATES_FOUND++))
check_file "fix-build 2.sh" "duplicate build script" "DUPLICATE" && ((DUPLICATES_FOUND++))

echo ""
echo "🗂️  Phase 2: Analyzing Backup Files"
echo "==================================="

BACKUPS_FOUND=0
check_file ".env.backup.20250730_005136" "environment backup" "BACKUP" && ((BACKUPS_FOUND++))
check_file ".env.bak" "environment backup" "BACKUP" && ((BACKUPS_FOUND++))
check_file "backups/security/.env.backup.20250729_145357" "security backup" "BACKUP" && ((BACKUPS_FOUND++))
check_file "backups/security/.env.backup.20250729_150346" "security backup" "BACKUP" && ((BACKUPS_FOUND++))
check_file "client/src/components/campaign-wizard/CampaignWizard.tsx.backup" "component backup" "BACKUP" && ((BACKUPS_FOUND++))
check_file "server/routes/feature-flags.ts.backup" "route backup" "BACKUP" && ((BACKUPS_FOUND++))
check_file "server/utils/service-health/twilio-health.ts.backup" "service backup" "BACKUP" && ((BACKUPS_FOUND++))
check_file "server.backup.20250725_221701" "server backup directory" "BACKUP" && ((BACKUPS_FOUND++))
check_file "node_modules_backup_1753853305" "node_modules backup" "BACKUP" && ((BACKUPS_FOUND++))

echo ""
echo "🎭 Phase 3: Analyzing Mock Files"
echo "==============================="

MOCKS_FOUND=0
echo "🔍 Checking which mock files are still referenced..."

# Check routes/index.ts to see which mocks are still used
if [ -f "server/routes/index.ts" ]; then
    echo "📄 Current route imports in server/routes/index.ts:"
    grep "import.*Routes from" server/routes/index.ts | head -10
    echo ""
fi

check_file "server/routes/campaigns-mock.ts" "campaigns mock" "MOCK" && ((MOCKS_FOUND++))
check_references "campaigns-mock" "campaigns mock"

check_file "server/routes/leads-mock.ts" "leads mock" "MOCK" && ((MOCKS_FOUND++))
check_references "leads-mock" "leads mock"

check_file "server/routes/users-mock.ts" "users mock" "MOCK" && ((MOCKS_FOUND++))
check_references "users-mock" "users mock"

check_file "server/routes/clients-mock.ts" "clients mock" "MOCK" && ((MOCKS_FOUND++))
check_references "clients-mock" "clients mock"

check_file "server/routes/conversations-mock.ts" "conversations mock" "MOCK" && ((MOCKS_FOUND++))
check_references "conversations-mock" "conversations mock"

check_file "server/routes/email-mock.ts" "email mock" "MOCK" && ((MOCKS_FOUND++))
check_references "email-mock" "email mock"

# Check if agents-mock is still used (should be kept)
echo ""
echo "⚠️  KEEPING: server/routes/agents-mock.ts (still referenced in routes/index.ts)"

echo ""
echo "🧪 Phase 4: Analyzing Development Files"
echo "======================================"

DEV_FILES_FOUND=0
check_file "simple-server.js" "development test server" "DEV" && ((DEV_FILES_FOUND++))
check_file "simple_test_server.cjs" "development test server" "DEV" && ((DEV_FILES_FOUND++))
check_file "test-bundle.js" "test bundle" "DEV" && ((DEV_FILES_FOUND++))
check_file "test-vulnerabilities.js" "vulnerability test" "DEV" && ((DEV_FILES_FOUND++))
check_file "test_auth_fix.js" "auth test file" "DEV" && ((DEV_FILES_FOUND++))
check_file "vscode_mcp_integration.py" "VSCode integration script" "DEV" && ((DEV_FILES_FOUND++))

echo ""
echo "🛠️  Phase 5: Analyzing Cleanup Scripts"
echo "======================================"

SCRIPTS_FOUND=0
check_file "cleanup-imports.js" "import cleanup script" "SCRIPT" && ((SCRIPTS_FOUND++))
check_file "check-missing-imports.sh" "import check script" "SCRIPT" && ((SCRIPTS_FOUND++))
check_file "fix-lucide-imports.ts" "lucide import fix" "SCRIPT" && ((SCRIPTS_FOUND++))
check_file "add-missing-columns.sh" "database migration script" "SCRIPT" && ((SCRIPTS_FOUND++))

echo ""
echo "📁 Phase 6: Analyzing Empty Directories"
echo "======================================"

EMPTY_DIRS=0
for dir in "tools/generators" "tools/utilities" "tools/validators" "tests/e2e" "tests/unit" "security/fixes" "security/monitoring" "security/tests"; do
    if [ -d "$dir" ]; then
        local file_count=$(find "$dir" -type f | wc -l)
        if [ "$file_count" -eq 0 ]; then
            echo "✅ [EMPTY] $dir (0 files)"
            ((EMPTY_DIRS++))
        else
            echo "⚠️  [NOT EMPTY] $dir ($file_count files)"
        fi
    else
        echo "❌ [NOT FOUND] $dir"
    fi
done

echo ""
echo "📊 Verification Summary"
echo "======================"
echo "📄 Duplicate files found: $DUPLICATES_FOUND"
echo "🗂️  Backup files found: $BACKUPS_FOUND"
echo "🎭 Mock files found: $MOCKS_FOUND"
echo "🧪 Development files found: $DEV_FILES_FOUND"
echo "🛠️  Cleanup scripts found: $SCRIPTS_FOUND"
echo "📁 Empty directories found: $EMPTY_DIRS"

TOTAL_ITEMS=$((DUPLICATES_FOUND + BACKUPS_FOUND + MOCKS_FOUND + DEV_FILES_FOUND + SCRIPTS_FOUND + EMPTY_DIRS))
echo "🎯 Total items to remove: $TOTAL_ITEMS"

echo ""
echo "⚠️  Important Checks"
echo "==================="

# Check if any critical files would be affected
echo "🔍 Checking for critical file dependencies..."

# Check package.json scripts
if grep -q "simple-server\|test-bundle\|cleanup-imports" package.json 2>/dev/null; then
    echo "⚠️  WARNING: package.json references files that will be removed"
else
    echo "✅ package.json doesn't reference files to be removed"
fi

# Check for any imports of files to be removed
echo ""
echo "🔍 Final safety check - searching for any remaining references..."
UNSAFE_REFS=0

for file in "EnhancedDashboardView 2" "campaigns-mock" "leads-mock" "users-mock" "clients-mock" "conversations-mock" "email-mock"; do
    refs=$(grep -r "$file" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v "\.backup" | grep -v "node_modules" | head -3)
    if [ -n "$refs" ]; then
        echo "⚠️  Found references to $file:"
        echo "$refs"
        ((UNSAFE_REFS++))
    fi
done

echo ""
if [ $UNSAFE_REFS -eq 0 ]; then
    echo "✅ SAFE TO PROCEED: No unsafe references found"
    echo "🚀 Run: bash cleanup-repository.sh"
else
    echo "⚠️  CAUTION: $UNSAFE_REFS potential issues found"
    echo "📋 Review the references above before proceeding"
fi

echo ""
echo "💾 Estimated space savings:"
TOTAL_SIZE=0
for item in "package 2.json" "package-lock 2.json" "client/package-lock 2.json" "server.backup.20250725_221701" "node_modules_backup_1753853305"; do
    if [ -e "$item" ]; then
        size=$(du -sb "$item" 2>/dev/null | cut -f1)
        TOTAL_SIZE=$((TOTAL_SIZE + size))
    fi
done

if [ $TOTAL_SIZE -gt 0 ]; then
    echo "📦 Estimated cleanup size: $(echo $TOTAL_SIZE | awk '{print $1/1024/1024 " MB"}')"
else
    echo "📦 Unable to calculate size savings"
fi
