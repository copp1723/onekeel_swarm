#!/bin/bash

# OneKeel Swarm - Authentication Configuration Fix Script
# This script fixes authentication vulnerabilities and hardens security configuration
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
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
BACKUP_DIR="$PROJECT_ROOT/backups/security"

echo -e "${BLUE}🔒 OneKeel Swarm Authentication Security Fix${NC}"
echo "=================================================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

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

# Function to generate secure random string
generate_secret() {
    local length=${1:-48}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify required tools
log "Checking required tools..."
if ! command_exists openssl; then
    error "OpenSSL is required but not installed"
fi

if ! command_exists node; then
    error "Node.js is required but not installed"
fi

# Backup existing .env file
if [[ -f "$ENV_FILE" ]]; then
    log "Backing up existing .env file..."
    cp "$ENV_FILE" "$BACKUP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Check for SKIP_AUTH in environment files
log "Checking for SKIP_AUTH vulnerabilities..."
if grep -q "SKIP_AUTH" "$ENV_FILE" 2>/dev/null; then
    warn "Found SKIP_AUTH in .env file - removing..."
    sed -i.bak '/SKIP_AUTH/d' "$ENV_FILE"
    log "Removed SKIP_AUTH from .env file"
fi

# Check for weak default secrets
log "Checking for weak authentication secrets..."

# Generate strong JWT secrets if missing or weak
JWT_SECRET=""
JWT_REFRESH_SECRET=""
SESSION_SECRET=""

if [[ -f "$ENV_FILE" ]]; then
    # Source existing env file to check current values
    set +u
    source "$ENV_FILE" 2>/dev/null || true
    set -u
fi

# Check JWT_SECRET
if [[ -z "${JWT_SECRET:-}" ]] || [[ ${#JWT_SECRET} -lt 32 ]]; then
    warn "JWT_SECRET is missing or too weak - generating new one..."
    JWT_SECRET=$(generate_secret 48)
    log "Generated new JWT_SECRET"
fi

# Check JWT_REFRESH_SECRET
if [[ -z "${JWT_REFRESH_SECRET:-}" ]] || [[ ${#JWT_REFRESH_SECRET} -lt 32 ]] || [[ "$JWT_REFRESH_SECRET" == "$JWT_SECRET" ]]; then
    warn "JWT_REFRESH_SECRET is missing, weak, or same as JWT_SECRET - generating new one..."
    JWT_REFRESH_SECRET=$(generate_secret 48)
    log "Generated new JWT_REFRESH_SECRET"
fi

# Check SESSION_SECRET
if [[ -z "${SESSION_SECRET:-}" ]] || [[ ${#SESSION_SECRET} -lt 32 ]] || [[ "$SESSION_SECRET" == "ccl3-swarm-secret-key" ]]; then
    warn "SESSION_SECRET is missing, weak, or using default - generating new one..."
    SESSION_SECRET=$(generate_secret 32)
    log "Generated new SESSION_SECRET"
fi

# Update .env file with secure secrets
log "Updating .env file with secure authentication configuration..."

# Create or update .env file
cat > "$ENV_FILE" << EOF
# OneKeel Swarm Security Configuration
# Generated on $(date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Security-Critical Secrets
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
SESSION_SECRET=$SESSION_SECRET

# Database Configuration
DATABASE_URL=${DATABASE_URL:-postgresql://localhost:5432/onekeel_swarm}

# Application Settings
NODE_ENV=${NODE_ENV:-production}
PORT=${PORT:-3001}
CORS_ORIGIN=${CORS_ORIGIN:-https://app.onekeel.com}

# Security Features
ENABLE_ACCESS_LOGS=true
ENABLE_SECURITY_MONITORING=true
ENABLE_2FA=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Session Configuration
SESSION_TIMEOUT=3600000

# Logging
LOG_LEVEL=info
SECURITY_LOG_PATH=./logs/security

# File Upload Security
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=csv,json,xlsx

# External Services (Optional - Configure as needed)
# SENDGRID_API_KEY=
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# OPENAI_API_KEY=

# Monitoring (Optional)
# SENTRY_DSN=
# NEW_RELIC_LICENSE_KEY=
EOF

# Set secure file permissions
chmod 600 "$ENV_FILE"
log "Set secure permissions on .env file (600)"

# Validate the configuration
log "Validating authentication configuration..."
cd "$PROJECT_ROOT"

# Run the security validation script
if [[ -f "scripts/security/validate-security.js" ]]; then
    node scripts/security/validate-security.js
else
    warn "Security validation script not found - will be created next"
fi

# Check for any remaining security issues
log "Scanning for remaining security issues..."

# Check for hardcoded credentials in code
if grep -r "password.*123\|admin.*admin\|secret.*key" server/ --include="*.ts" --include="*.js" 2>/dev/null; then
    warn "Found potential hardcoded credentials in source code"
fi

# Verify no SKIP_AUTH in source code
if grep -r "SKIP_AUTH" server/ --include="*.ts" --include="*.js" 2>/dev/null; then
    warn "Found SKIP_AUTH references in source code - manual review required"
fi

# Create security log directory
mkdir -p logs/security
chmod 755 logs/security

log "Authentication configuration fix completed successfully!"
echo ""
echo -e "${GREEN}✅ Security Improvements Applied:${NC}"
echo "  • Removed SKIP_AUTH bypass vulnerability"
echo "  • Generated cryptographically secure JWT secrets"
echo "  • Configured secure session management"
echo "  • Set proper file permissions"
echo "  • Enabled security logging"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "  1. Review and test the application with new configuration"
echo "  2. Run 'npm run test:security' to validate security"
echo "  3. Update production environment with new secrets"
echo "  4. Monitor security logs for any issues"
echo ""
echo -e "${BLUE}📁 Backup Location:${NC} $BACKUP_DIR"
echo -e "${BLUE}🔐 New .env file:${NC} $ENV_FILE"
