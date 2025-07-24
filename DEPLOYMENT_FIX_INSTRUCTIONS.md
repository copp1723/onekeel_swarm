# Deployment Schema Fix Instructions

## Issue Summary
The deployment is experiencing database schema mismatches causing:
- Missing `feature_flags` table (400 errors on `/api/feature-flags/evaluate`)
- Missing `description` column in `campaigns` table
- Missing `context_note` column in `agents` table

## Quick Fix Steps

### Option 1: Using the Shell Script (Recommended)
```bash
# SSH into your deployment server or use Render's shell
cd /opt/render/project/src

# Run the quick fix script
./scripts/quick-db-fix.sh
```

### Option 2: Using the TypeScript Migration Script
```bash
# SSH into your deployment server
cd /opt/render/project/src

# Run the migration
npm run tsx scripts/apply-deployment-fix.ts
```

### Option 3: Manual Database Fix
If the scripts don't work, connect to your PostgreSQL database and run:
```bash
psql $DATABASE_URL < migrations/0010_fix_deployment_schema.sql
```

## Post-Fix Verification

1. Check the application logs - errors should stop appearing
2. Test the following endpoints:
   - `/api/feature-flags/evaluate` - Should return 200
   - `/api/campaigns` - Should load without errors
   - `/api/agents` - Should load without errors

## Prevention
To prevent this in the future:
1. Always run `npm run db:migrate` before deploying
2. Ensure all migration files are committed to the repository
3. Update the deployment scripts to include migration runs

## Deployment Script Update
Add to your Render build command:
```bash
npm install && npm run build && psql $DATABASE_URL < migrations/0010_fix_deployment_schema.sql
```

Or better yet, create a proper migration runner in your deployment process.