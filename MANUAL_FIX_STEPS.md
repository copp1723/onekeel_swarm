# Manual Database Fix Steps

Since the Render CLI needs interactive mode, please run these commands manually in your terminal:

## 1. Set Your Workspace
```bash
render workspace set
```
Select your workspace when prompted.

## 2. Connect to Your Database
```bash
render psql ccl-3
```

## 3. Apply the Fix
Once connected to psql, copy and paste the ENTIRE contents of:
```
scripts/production-complete-schema-fix.sql
```

The file is located at:
`/Users/joshcopp/Desktop/onekeel_swarm/scripts/production-complete-schema-fix.sql`

## 4. Exit psql
After the script runs successfully:
```
\q
```

## 5. Verify the Fix
```bash
npm run test:prod-db
```

You should see:
- ✅ All tables created
- ✅ All columns added
- ✅ Feature flags inserted

## Alternative: Direct psql Command
If you know your database ID, you can run:
```bash
render psql DATABASE_ID < scripts/production-complete-schema-fix.sql
```

## What This Fixes
- Creates 6 missing tables
- Adds 2 missing columns
- Sets up migration tracking
- Creates performance indexes
- Inserts default feature flags