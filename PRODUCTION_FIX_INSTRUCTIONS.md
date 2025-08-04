# Production Deployment Fix Instructions

## Overview
This guide will help you fix the campaign creation and AI enhancement issues on your production deployment at https://ccl-3-final.onrender.com

## Issues Addressed
1. ✅ "column 'last_accessed_at' does not exist" error
2. ✅ "column 'user_agent' does not exist" error  
3. ✅ "null value in column 'id' of relation 'campaigns' violates not-null constraint"
4. ✅ "operator does not exist: uuid = text" errors
5. ✅ "memory.addMemory is not a function" error in EmailAgent

## Step 1: Apply Database Fixes

### Option A: Using Render Dashboard
1. Go to your Render dashboard
2. Navigate to your PostgreSQL database service
3. Click on "Connect" → "PSQL Command"
4. Copy and paste the contents of `fix-production-deployment.sql`
5. Execute the script

### Option B: Using psql from terminal
```bash
psql "postgresql://ccl_3_user:P8LUqfkbIB4noaUDthVtZETTWZR668nI@dpg-d1lvpq6r433s73e9vfu0-a/ccl_3?sslmode=require" -f fix-production-deployment.sql
```

## Step 2: Deploy Code Updates

The EmailAgent memory fix is already in the codebase. Deploy the latest code:

```bash
git add .
git commit -m "Fix EmailAgent memory interface and database schema issues"
git push origin main
```

Render will automatically deploy the changes.

## Step 3: Verify the Fixes

### Test Campaign Creation
```bash
curl -X POST https://ccl-3-final.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "YOUR_ADMIN_PASSWORD"}'

# Use the accessToken from the response for the next request

curl -X POST https://ccl-3-final.onrender.com/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Production Test Campaign",
    "type": "drip",
    "status": "draft",
    "campaignType": "drip",
    "strategy": {
      "goal": "Test campaign creation in production",
      "offer": {
        "cta": {
          "primary": "Learn More",
          "link": "https://example.com"
        }
      }
    }
  }'
```

### Test AI Enhancement
```bash
curl -X POST https://ccl-3-final.onrender.com/api/agents/enhance-campaign-field \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "field": "context",
    "campaignData": {
      "name": "Production Test Campaign",
      "type": "drip",
      "strategy": {
        "goal": "Test AI enhancement in production"
      }
    }
  }'
```

## Step 4: Monitor Logs

Watch the Render logs for any errors:
1. Go to Render dashboard
2. Click on your web service
3. Go to "Logs" tab
4. Look for any error messages

## Expected Results

After applying these fixes:
- ✅ Users can log in without session errors
- ✅ Campaigns can be created successfully with auto-generated IDs
- ✅ AI enhancement works with OpenRouter API
- ✅ No more PostgreSQL type mismatch errors

## Troubleshooting

### If campaigns still fail to create:
1. Check that the campaigns table has the updated default value:
   ```sql
   SELECT column_default FROM information_schema.columns 
   WHERE table_name = 'campaigns' AND column_name = 'id';
   ```
   Should show: `gen_random_uuid()::text`

2. Verify sessions table has all columns:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'sessions' ORDER BY ordinal_position;
   ```

### If AI enhancement fails:
1. Verify OPENROUTER_API_KEY is set in Render environment variables
2. Check that the EmailAgent has the updated memory interface methods

## Environment Variables Confirmed

Your production environment has all required variables:
- ✅ OPENROUTER_API_KEY is set
- ✅ DATABASE_URL is configured
- ✅ JWT secrets are in place
- ✅ Email providers (Mailgun, Twilio) are configured

## Next Steps

After fixes are applied:
1. Test campaign creation through the UI
2. Test email template generation
3. Monitor for any new errors in production logs
4. Consider adding automated tests for these scenarios