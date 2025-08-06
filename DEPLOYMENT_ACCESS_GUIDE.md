# OneKeel Swarm - Deployment Access Guide

## 🌐 Production URL
https://ccl-3-final.onrender.com

## 🔐 Accessing the Application

### 1. Initial Login
Since the JWT token has expired, you'll need to log in again:

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**Login URL:** https://ccl-3-final.onrender.com/login

### 2. Common Issues & Solutions

#### JWT Expired Error
This is normal after deployment. Simply log in again to get a fresh token.

#### "No tenant context established" Warning
This warning appears because the system supports multi-tenancy but is running in single-tenant mode. This is expected and doesn't affect functionality.

## 🚀 Quick Start Testing

### 1. Test Authentication
```bash
# Login to get a new token
curl -X POST https://ccl-3-final.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Save the token from the response
export TOKEN="your-jwt-token-here"
```

### 2. Test Campaign Creation
```bash
# Create a test campaign
curl -X POST https://ccl-3-final.onrender.com/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "context": "Testing the deployed system",
    "handover_goals": "Verify deployment is working"
  }'
```

### 3. Access the Web Interface
1. Navigate to https://ccl-3-final.onrender.com
2. You should see the login page
3. Log in with admin credentials
4. Create and execute campaigns through the UI

## 📊 Monitoring the Deployment

### Check Service Health
```bash
curl https://ccl-3-final.onrender.com/api/health
```

### View Logs
Logs are visible in the Render dashboard and show:
- Request/response information
- Authentication attempts
- API calls
- Any errors

## 🔧 Configuration on Render

### Environment Variables to Verify
Make sure these are set in Render's environment settings:

```env
# Database
DATABASE_URL=<your-postgres-url>

# Authentication
JWT_SECRET=<your-secret-key>

# Email Service (if enabled)
MAILGUN_API_KEY=<your-key>
MAILGUN_DOMAIN=<your-domain>

# SMS Service (if enabled)
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_PHONE_NUMBER=<your-number>

# AI Service
OPENROUTER_API_KEY=<your-key>

# Application
NODE_ENV=production
PORT=10000
```

## 🎯 Testing the MVP Features

### 1. Campaign Wizard
- Click "Create Campaign" 
- Follow the 7-step wizard
- Upload a test CSV with emails/phones
- Execute the campaign

### 2. Email Sending
- Requires Mailgun configuration
- Test with your own email first
- Check spam folder if needed

### 3. SMS Capability
- Requires Twilio configuration
- Test with your own phone
- Verify two-way messaging

### 4. Campaign Execution Tracking
- After executing a campaign
- Navigate to the execution status page
- Watch real-time progress updates

### 5. Reporting Dashboard
- View campaign metrics
- Check response rates
- Monitor handover events

## 🐛 Troubleshooting

### Can't Log In
1. Clear browser cache/cookies
2. Try incognito mode
3. Verify credentials are correct
4. Check if database is connected

### API Calls Failing
1. Ensure you're using HTTPS
2. Include Authorization header
3. Check CORS is configured
4. Verify API endpoint paths

### UI Not Loading
1. Check browser console for errors
2. Verify static files are served
3. Try hard refresh (Ctrl+Shift+R)
4. Check network tab for 404s

## 📱 Mobile Access
The application is responsive and works on mobile devices:
- Use Chrome or Safari
- Landscape mode recommended for Campaign Wizard
- All features accessible on mobile

## 🔄 Next Steps

1. **Change Admin Password**
   - Log in as admin
   - Navigate to Settings
   - Update password immediately

2. **Configure Email/SMS Services**
   - Add your Mailgun API keys
   - Add your Twilio credentials
   - Test with small batches first

3. **Create Real Campaigns**
   - Start with test recipients
   - Verify all features work
   - Scale up gradually

## 📞 Support

If you encounter issues:
1. Check the logs in Render dashboard
2. Verify all environment variables are set
3. Ensure database migrations have run
4. Check that Redis is available (if using workers)

The application is now live and ready for use at https://ccl-3-final.onrender.com!