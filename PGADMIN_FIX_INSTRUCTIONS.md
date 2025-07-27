# pgAdmin Database Fix Instructions

## Steps to Fix Your Production Database

### 1. Deploy pgAdmin
Click the "Deploy app" button for pgAdmin in your Render dashboard.

### 2. Connect to Your Database
Once pgAdmin is running:
- Open pgAdmin in your browser
- Add a new server connection with these details:
  - **Host**: dpg-d1lvpq6r433s73e9vfu0-a.oregon-postgres.render.com
  - **Port**: 5432
  - **Database**: ccl_3
  - **Username**: ccl_3_user
  - **Password**: P8LUqfkbIB4noaUDthVtZETTWZR668nI
  - **SSL Mode**: Require

### 3. Run the Fix Script
1. Once connected, navigate to your database: `ccl_3`
2. Open the Query Tool (Tools → Query Tool)
3. Copy the entire contents of `scripts/production-complete-schema-fix.sql`
4. Paste it into the query editor
5. Click "Execute" (▶️ button)

### 4. Verify the Fix
After running the script, you should see:
- Success messages for each table created
- A summary showing counts of tables, columns, and feature flags

Run this verification query:
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show 17+ tables including:
-- feature_flags, templates, jobs, whatsapp_messages, 
-- feature_flag_evaluations, api_keys, drizzle_migrations
```

### 5. Test From Your Application
After the fix is applied:
```bash
# Test the production database
npm run test:prod-db

# You should see all green checkmarks!
```

## Alternative: Using Render Shell

If you prefer using the Render shell instead:
1. Click on your database in Render
2. Go to the "Shell" tab
3. Run: `psql $DATABASE_URL`
4. Copy and paste the SQL script
5. Type `\q` to exit when done

## What the Script Does

The complete fix script will:
- ✅ Create 6 missing tables
- ✅ Add 2 missing columns
- ✅ Set up migration tracking
- ✅ Create performance indexes
- ✅ Insert default feature flags

All operations are safe and won't affect existing data!