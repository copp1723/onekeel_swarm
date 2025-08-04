# Production Campaign Errors Fix - Deployment Guide

## 🚨 Critical Production Issues Fixed

This deployment addresses three critical production errors:

1. **400 Bad Request** on `/api/agents/email/generate-sequence`
2. **500 Internal Server Error** on `/api/campaigns` 
3. **401 Unauthorized** on `/api/auth/me`

## 📋 Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Verify environment variables are set
- [ ] Ensure maintenance window is scheduled
- [ ] Have rollback plan ready

## 🔧 Deployment Steps

### Step 1: Database Schema Updates

Run the database schema fix script:

```bash
psql $DATABASE_URL -f fix-production-campaign-errors.sql
```

This script will:
- ✅ Add missing columns to campaigns table (description, status, camelCase aliases)
- ✅ Add missing columns to leads table (firstName, lastName, camelCase aliases)  
- ✅ Fix lead_campaign_enrollments table structure
- ✅ Add performance indexes
- ✅ Create default admin user if none exists

### Step 2: Code Deployment

Deploy the following fixed files:

1. **server/routes/agents.ts** - Fixed validation schema for email sequence generation
2. **server/routes/campaigns.ts** - Fixed campaign creation and sorting logic
3. **server/routes/auth.ts** - Enhanced error handling for auth/me endpoint
4. **server/middleware/auth.ts** - Improved authentication middleware logging
5. **server/agents/email-agent.ts** - Handle empty benefits arrays

### Step 3: Environment Variables

Ensure these environment variables are set:

```bash
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=... (optional for AI features)
JWT_SECRET=... (required for authentication)
NODE_ENV=production
```

### Step 4: Service Restart

```bash
# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart your-app-service

# If using Docker
docker-compose restart
```

## 🧪 Post-Deployment Testing

Run the test script to verify all fixes:

```bash
npm install -g ts-node
ts-node test-campaign-fixes.ts
```

Expected results:
- ✅ Login successful
- ✅ Auth/me endpoint working
- ✅ Campaign list loading without 500 errors
- ✅ Campaign creation working
- ✅ Email sequence generation working
- ✅ Campaign with audience data working

## 🐛 Specific Issues Fixed

### Issue 1: 400 Bad Request on Email Sequence Generation

**Root Cause:** Validation schema required non-empty benefits array and valid URL

**Fix Applied:**
- Made benefits array optional with default empty array
- Allow CTAurl to accept any non-empty string as fallback
- Handle empty benefits gracefully in EmailAgent

**Testing:** 
```bash
curl -X POST $API_URL/agents/email/generate-sequence \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignName": "Test",
    "goal": "Test goal",
    "context": "Test context", 
    "product": "Test product",
    "benefits": [],
    "priceAngle": "Test pricing",
    "urgency": "Test urgency",
    "primaryCTA": "Click here",
    "CTAurl": "https://example.com"
  }'
```

### Issue 2: 500 Internal Server Error on Campaigns

**Root Cause:** Database schema mismatches and unsafe sorting logic

**Fix Applied:**
- Added missing columns (description, status, camelCase aliases)
- Fixed sorting logic with safe column access
- Enhanced campaign creation validation
- Handle both snake_case and camelCase column names

**Testing:**
```bash
curl -X GET $API_URL/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -G -d "sort=createdAt&order=desc&limit=10"
```

### Issue 3: 401 Unauthorized on Auth/Me

**Root Cause:** Authentication middleware failures and user lookup issues

**Fix Applied:**
- Enhanced error logging in auth middleware
- Better error messages for debugging
- Improved token validation flow
- Added user existence checks

**Testing:**
```bash
curl -X GET $API_URL/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 🔄 Rollback Procedure

If issues arise after deployment:

1. **Database Rollback:**
   ```sql
   -- The schema changes are additive and backward compatible
   -- No rollback needed unless specific issues occur
   ```

2. **Code Rollback:**
   ```bash
   git checkout [previous-working-commit]
   # Redeploy previous version
   ```

3. **Monitor Logs:**
   ```bash
   # Check application logs
   tail -f /var/log/your-app.log
   
   # Check database logs
   tail -f /var/log/postgresql/postgresql.log
   ```

## 📊 Monitoring & Verification

After deployment, monitor:

1. **API Response Times:**
   - `/api/campaigns` should respond in < 500ms
   - `/api/auth/me` should respond in < 200ms
   - `/api/agents/email/generate-sequence` should respond in < 5s

2. **Error Rates:**
   - 400 errors should drop to 0% for valid requests
   - 500 errors should drop to 0% for campaigns endpoint
   - 401 errors should only occur for invalid tokens

3. **Database Performance:**
   - New indexes should improve query performance
   - No significant increase in database load

## 🚨 Troubleshooting

### Common Issues After Deployment

1. **Still getting 500 errors on campaigns:**
   - Check database connection
   - Verify all columns were added: `\d campaigns`
   - Check application logs for specific errors

2. **Still getting 401 on auth/me:**
   - Verify JWT_SECRET is set correctly
   - Check token format in requests
   - Review auth middleware logs

3. **Still getting 400 on email sequence:**
   - Verify request payload format
   - Check validation error details in response
   - Ensure all required fields are provided

### Database Schema Verification

Run this query to verify schema fixes:

```sql
-- Check campaigns table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
ORDER BY ordinal_position;

-- Check leads table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;

-- Verify indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('campaigns', 'leads', 'lead_campaign_enrollments');
```

## 📞 Support Contacts

- **Technical Lead:** [Your contact info]
- **Database Admin:** [DBA contact info]  
- **DevOps Team:** [DevOps contact info]

## 📝 Change Log

- **Fixed:** 400 Bad Request validation errors
- **Fixed:** 500 Internal Server Error on campaigns API
- **Fixed:** 401 Unauthorized on auth/me endpoint
- **Added:** Database schema improvements
- **Added:** Better error handling and logging
- **Added:** Comprehensive test suite

---

**Deployment Date:** [Date]
**Version:** [Version]
**Deployed By:** [Name]