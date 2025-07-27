# Feature Flags ID Column Fix - Deployment Instructions

## Problem Summary
The production deployment is failing with PostgreSQL error:
```
PostgresError: column "id" does not exist
Error code: 42703
```

This occurs when the application tries to evaluate feature flags like `ui.contacts-terminology` and `ui.new-navigation`.

## Root Cause
The feature_flags table in production either:
1. Doesn't exist
2. Exists but is missing the `id` column (most likely)
3. Was created with an incorrect schema

## Fix Instructions

### Option 1: Quick Fix (Recommended for Production)

1. **Connect to your production database**:
   ```bash
   # If using Render CLI
   render db:connect
   
   # Or with psql directly
   psql $DATABASE_URL
   ```

2. **Run this SQL directly**:
   ```sql
   -- Check current state
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'feature_flags' ORDER BY ordinal_position;
   
   -- If ID column is missing, fix it
   BEGIN;
   
   -- Drop malformed table
   DROP TABLE IF EXISTS feature_flag_user_overrides CASCADE;
   DROP TABLE IF EXISTS feature_flags CASCADE;
   
   -- Create with proper structure
   CREATE TABLE feature_flags (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       key VARCHAR(255) UNIQUE NOT NULL,
       name VARCHAR(255) NOT NULL,
       description TEXT,
       enabled BOOLEAN DEFAULT FALSE NOT NULL,
       rollout_percentage INTEGER DEFAULT 0,
       user_roles JSONB DEFAULT '["admin"]'::jsonb,
       environments JSONB DEFAULT '["development", "staging", "production"]'::jsonb,
       conditions JSONB DEFAULT '{}'::jsonb,
       category VARCHAR(50) DEFAULT 'experimental',
       complexity VARCHAR(20) DEFAULT 'basic',
       risk_level VARCHAR(20) DEFAULT 'low',
       created_by UUID,
       last_modified_by UUID,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Insert essential flags
   INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, environments) VALUES
   ('ui.contacts-terminology', 'Contacts Terminology', 'Use Contacts instead of Leads', true, 100, '["production"]'::jsonb),
   ('ui.new-navigation', 'New Navigation', 'New navigation UI', true, 100, '["production"]'::jsonb),
   ('ui.enhanced-dashboard', 'Enhanced Dashboard', 'Enhanced dashboard', true, 100, '["production"]'::jsonb);
   
   COMMIT;
   ```

3. **Verify the fix**:
   ```sql
   SELECT id, key, enabled FROM feature_flags;
   ```

4. **Restart your application**

### Option 2: Using the Script

1. **Set your database URL**:
   ```bash
   export DATABASE_URL="your-production-database-url"
   ```

2. **Run the quick fix script**:
   ```bash
   ./scripts/quick-feature-flags-fix.sh
   ```

### Option 3: Using TypeScript Fix

1. **Install dependencies** (if not already):
   ```bash
   npm install
   ```

2. **Run the TypeScript fix**:
   ```bash
   npx tsx scripts/apply-feature-flags-fix.ts
   ```

## Verification Steps

After applying the fix:

1. **Check table structure**:
   ```sql
   \d feature_flags
   ```

2. **Verify ID column exists**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'feature_flags' 
   AND column_name = 'id';
   ```

3. **Test a query**:
   ```sql
   SELECT id, key FROM feature_flags WHERE key = 'ui.contacts-terminology';
   ```

## Prevention

To prevent this issue in the future:

1. **Always use migrations** instead of CREATE TABLE IF NOT EXISTS
2. **Test migrations on a staging environment** before production
3. **Use proper migration tracking** to ensure all migrations run in order
4. **Validate schema after deployments**

## If the Fix Doesn't Work

1. **Check for views**: The error might be from a view, not the table:
   ```sql
   SELECT viewname FROM pg_views WHERE viewname LIKE '%feature%';
   ```

2. **Check for functions**: Look for stored procedures that might be querying incorrectly:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%feature%';
   ```

3. **Enable query logging** to see the exact query causing the error

## Emergency Rollback

If needed, you can disable feature flags entirely by modifying the feature flag service to return default values:

```typescript
// In server/services/feature-flag-service.ts
async isEnabled(flagKey: string, context: FeatureFlagContext): Promise<boolean> {
  // Emergency override
  if (process.env.DISABLE_FEATURE_FLAGS === 'true') {
    return true; // or false, depending on safe defaults
  }
  // ... rest of the code
}
```

## Contact for Help

If you continue to experience issues:
1. Check the application logs for the exact query causing the error
2. Look for any custom SQL queries that might be accessing feature_flags
3. Verify that all application instances have been restarted after the fix