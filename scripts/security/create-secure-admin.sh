#!/bin/bash

# OneKeel Swarm - Secure Admin User Creation Script
# This script creates a secure admin user with proper validation and audit logging
# Author: Security/DevOps Specialist
# Date: 2025-07-29

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}🔐 OneKeel Swarm - Secure Admin User Creation${NC}"
echo "=================================================="

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify required tools
log "Checking required tools..."
if ! command_exists node; then
    error "Node.js is required but not installed"
fi

if ! command_exists npx; then
    error "npx is required but not installed"
fi

# Check if database is accessible
log "Checking database connectivity..."
if [[ -z "${DATABASE_URL:-}" ]]; then
    warn "DATABASE_URL not set in environment"
    warn "Make sure to set DATABASE_URL before running this script"
fi

# Validate environment
log "Validating security environment..."
cd "$PROJECT_ROOT"

# Run security validation first
if [[ -f "scripts/security/validate-security.js" ]]; then
    log "Running security validation..."
    node scripts/security/validate-security.js || warn "Security validation found issues"
else
    warn "Security validation script not found"
fi

# Check if admin creation script exists
ADMIN_SCRIPT="$PROJECT_ROOT/scripts/create-secure-admin.ts"
if [[ ! -f "$ADMIN_SCRIPT" ]]; then
    error "Admin creation script not found at: $ADMIN_SCRIPT"
fi

log "Creating secure admin user..."

# Set environment variables for admin creation
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@onekeel.com}"
export ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

# Run the admin creation script
log "Executing admin creation script..."
if npx tsx "$ADMIN_SCRIPT"; then
    log "Admin user creation completed successfully!"
    
    echo ""
    echo -e "${GREEN}✅ Security Admin User Created${NC}"
    echo "=================================="
    echo -e "${BLUE}📧 Email:${NC} $ADMIN_EMAIL"
    echo -e "${BLUE}👤 Username:${NC} $ADMIN_USERNAME"
    echo ""
    echo -e "${YELLOW}⚠️  SECURITY REMINDERS:${NC}"
    echo "  • Save the generated password securely"
    echo "  • Change password after first login"
    echo "  • Enable 2FA when available"
    echo "  • Monitor audit logs for this account"
    echo ""
    echo -e "${BLUE}🚀 Next Steps:${NC}"
    echo "  1. Test login with the provided credentials"
    echo "  2. Run security validation: node scripts/security/validate-security.js"
    echo "  3. Update production environment if needed"
    
else
    error "Failed to create admin user. Check database connection and permissions."
fi

log "Admin creation process completed."
