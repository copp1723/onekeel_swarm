# Render CLI Database Fix Quick Start

## Prerequisites

### 1. Install Render CLI
```bash
brew install render
```

### 2. Login to Render
```bash
render login
```

## Fix Your Database (Two Options)

### Option A: Automated Script (Recommended)
```bash
# Run the automated fix script
./scripts/fix-db-via-render-cli.sh
```

### Option B: Manual Steps
```bash
# 1. List your databases
render services

# 2. Connect to your database
render psql ccl-3

# 3. Once connected, paste the entire contents of:
#    scripts/production-complete-schema-fix.sql

# 4. Exit psql
\q
```

## Verify the Fix
```bash
# Test that everything worked
npm run test:prod-db
```

## Additional Useful Commands

```bash
# View your service logs
render logs ccl-3-final

# SSH into your service
render ssh ccl-3-final

# Trigger a new deploy
render deploys create ccl-3-final

# List recent deploys
render deploys list ccl-3-final
```

## What Gets Fixed

The script will:
- ✅ Create feature_flags table
- ✅ Create templates table
- ✅ Create jobs table
- ✅ Create whatsapp_messages table
- ✅ Create feature_flag_evaluations table
- ✅ Create api_keys table
- ✅ Add campaigns.description column
- ✅ Add agent_configurations.context_note column
- ✅ Set up migration tracking
- ✅ Create performance indexes
- ✅ Insert default feature flags

All operations are safe and use IF NOT EXISTS clauses!