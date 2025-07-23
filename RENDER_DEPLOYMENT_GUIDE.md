# OneKeel Swarm - Render Deployment Guide

## Quick Setup

1. **Create New Web Service on Render**
   - Repository: `onekeel_swarm`
   - Branch: `main`
   - Build Command: `npm run build`
   - Start Command: `npm start`

2. **Environment Variables**
   Use `.env.production.example` as a template and copy your actual values from your current CCL-3 Render deployment.

## Required Environment Variables

Copy these from your current Render deployment:

### Core Services
- `DATABASE_URL` - Your PostgreSQL connection string
- `REDIS_URL` - Your Redis connection string
- `NODE_ENV` - Set to `production`
- `PORT` - Leave blank (Render provides this)

### Authentication
- `JWT_SECRET` - Your JWT secret
- `JWT_REFRESH_SECRET` - Your JWT refresh secret
- `SESSION_SECRET` - Your session secret
- `ENCRYPTION_KEY` - Your encryption key
- `SKIP_AUTH` - Set to `true` (or `false` to enable auth)

### External APIs
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `MAILGUN_API_KEY` - Your Mailgun API key
- `MAILGUN_DOMAIN` - Your Mailgun domain
- `MAIL_FROM` - Your from email address
- `TWILIO_ACCOUNT_SID` - Your Twilio SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number

### URLs (Update these!)
- `API_BASE_URL` - Your new Render URL
- `CLIENT_URL` - Your new Render URL
- `FRONTEND_URL` - Your new Render URL
- `WEBSOCKET_URL` - Your new Render URL (use wss://)
- `ALLOWED_ORIGINS` - Your new Render URL

### Other Settings
- `VALID_API_KEYS` - Your API keys
- `RATE_LIMIT_WINDOW_MS` - 900000
- `RATE_LIMIT_MAX_REQUESTS` - 100
- `MEMORY_LIMIT` - 1024
- `ENABLE_AGENTS` - true
- `ENABLE_WEBSOCKET` - true
- `ENABLE_REDIS` - true
- `ENABLE_MONITORING` - false

## Post-Deployment

1. The system will use your existing database (no migration needed)
2. All your data will be preserved
3. The UI will be available at your Render URL
4. Check the logs to ensure all services started correctly

## Differences from CCL-3

- 99.6% fewer files (more stable)
- Consolidated routes and services
- Unified email system
- Single agent implementation per type
- All functionality preserved