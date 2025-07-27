#!/bin/bash

# Security Hardening Script - Apply Agent 1's Fixes with Additional Hardening
# This script backs up current files and applies the security fixes

set -e

echo "=== OneKeel Swarm Security Hardening Script ==="
echo "This script will apply security fixes to your codebase"
echo ""

# Create backup directory
BACKUP_DIR="server.backup.$(date +%Y%m%d_%H%M%S)"
echo "Creating backup at: $BACKUP_DIR"
cp -r server "$BACKUP_DIR"

# Apply fixes
echo ""
echo "Applying security fixes..."

# Fix 1: Remove hardcoded credentials
echo "1. Applying authentication security fix..."
cp security-fixes/fix-1-remove-hardcoded-credentials.ts server/routes/auth.ts

# Fix 2: Remove auth bypass
echo "2. Applying middleware security fix..."
cp security-fixes/fix-2-remove-auth-bypass.ts server/middleware/auth.ts

# Fix 3: Secure JWT config
echo "3. Applying JWT security fix..."
cp security-fixes/fix-3-secure-jwt-config.ts server/services/token-service.ts

# Fix 4: SQL injection prevention
echo "4. Applying SQL injection prevention..."
# This requires manual integration as it updates existing routes

# Fix 5: Input validation
echo "5. Applying input validation middleware..."
cp security-fixes/fix-5-input-validation-mass-assignment.ts server/middleware/validation.ts

echo ""
echo "✅ Security fixes applied!"
echo "Backup saved at: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Install required dependencies: npm install bcryptjs isomorphic-dompurify @types/bcryptjs"
echo "2. Update your .env file with secure secrets"
echo "3. Run tests to ensure everything works"
echo "4. Apply SQL injection fixes manually to route files"