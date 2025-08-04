# Scripts Directory

This directory contains all scripts and utilities for the OneKeel Swarm platform, organized by purpose.

## Directory Structure

### `/debug/` - Debug and Test Scripts
Scripts for debugging, testing, and troubleshooting:
- `test-imports.ts/js` - Import testing utilities
- `debug-schema-issue.ts` - Database schema debugging
- `test-campaign-fixes.ts` - Campaign system testing
- `test-email-generation.ts` - Email system testing
- `test-campaign-creation.ts` - Campaign creation testing
- `reset-admin-password.ts` - Admin password reset utility
- `connect-campaign-to-ai-emails.ts` - AI email integration testing
- `fix-database-issues.ts` - Database issue resolution
- `fix-missing-imports.js` - Import fix utilities
- `fix-react-imports.js` - React import fixes

### `/sql-fixes/` - Database Fix Scripts
SQL scripts for database fixes and migrations:
- `fix-production-hotfix.sql` - Production hotfixes
- `fix-campaigns-500-error.sql` - Campaign error fixes
- `fix-production-campaign-errors.sql` - Production campaign fixes
- `verify-production-fixes.sql` - Fix verification scripts
- `fix-production-deployment.sql` - Deployment database fixes
- `fix-sessions-last-accessed-at.sql` - Session table fixes
- `fix-schema.sql` - Schema fixes
- `fix-schema-issues.sql` - Schema issue resolution

### `/examples/` - Example and Demo Scripts
Example scripts and demonstrations:
- `mcp_agent_example.py` - MCP agent example
- `mcp_client_advanced.py` - Advanced MCP client example
- `campaign-demo.js` - Campaign system demo

### Root Level Scripts
Main utility and deployment scripts:
- `render-build.sh` - Render deployment build script
- `deploy-build-*.sh` - Various deployment build scripts
- `test-build-local.sh` - Local build testing
- `test-vite-installation.sh` - Vite installation testing
- `build.sh` - Main build script
- `fix-auth-now.sh` - Authentication fixes
- `fix-password-hash.sh` - Password hashing fixes
- `verify-cleanup.sh` - Cleanup verification
- `cleanup-repository.sh` - Repository cleanup
- `fix-production-api-complete.sh` - Production API fixes
- `fix-api-sorting-errors.sh` - API sorting fixes
- `fix-all-api-issues.sh` - Comprehensive API fixes
- `fix-database-schema-complete.sh` - Database schema fixes
- `fix-campaigns-500-error.sh` - Campaign error fixes
- `quick-start.sh` - Quick setup script
- `fresh-setup.sh` - Fresh environment setup
- `fix-build.sh` - Build fix script
- `apply-security-fixes.sh` - Security fix application
- `fix-campaign-wizard-wrapper.js` - Campaign wizard fixes
- `fix-react-imports.js` - React import fixes

## Usage Guidelines

### Running Scripts
```bash
# Debug scripts
node scripts/debug/test-imports.ts

# SQL fixes (run in database)
psql -d your_database -f scripts/sql-fixes/fix-production-hotfix.sql

# Shell scripts
bash scripts/deploy-build.sh

# Python examples
python scripts/examples/mcp_agent_example.py
```

### Script Categories

1. **Debug Scripts** - Use for troubleshooting and testing
2. **SQL Fixes** - Database maintenance and fixes
3. **Build Scripts** - Deployment and build automation
4. **Security Scripts** - Security fixes and hardening
5. **Example Scripts** - Demonstrations and examples

### Best Practices

1. **Always backup** before running database scripts
2. **Test in development** before running in production
3. **Check dependencies** before running scripts
4. **Document changes** when creating new scripts
5. **Use appropriate permissions** for security scripts

## Maintenance

- Keep scripts organized by purpose
- Update documentation when scripts change
- Remove obsolete scripts regularly
- Test scripts after major changes
- Version control all script changes 