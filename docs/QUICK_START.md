# Quick Start Guide

## Get Your AI Agent System Running in 5 Minutes

### 1. First-Time Setup

```bash
# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env

# Run the quick setup script (creates database, starts services)
npm run setup:quick
```

### 2. Start the Application

Open two terminal windows:

**Option 1 - Both servers (recommended):**

```bash
npm run dev:full
```

This starts both backend (http://localhost:5001) and frontend (http://localhost:5173)

**Option 2 - Separate terminals:**

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

### 3. Open Your Browser

Go to http://localhost:5173 and you should see your dashboard!

## What Works Right Now

- ✅ Dashboard with real-time stats
- ✅ Lead management (create, view, edit)
- ✅ Multi-agent system (Chat, Email, SMS, Overlord)
- ✅ Campaign management and scheduling
- ✅ Activity feed and monitoring
- ✅ Chat widget integration
- ✅ Email template editor

## Environment Configuration

Edit your `.env` file with these essential variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/swarm_db

# AI Processing
OPENAI_API_KEY=your-openai-key-here

# Email Service (Mailgun)
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-domain.com

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Authentication
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here
```

## Creating Your First Agent

### 1. Navigate to Agent Management

1. Open dashboard at `http://localhost:5173`
2. Click "**Agents**" in the sidebar
3. Click "**Add Agent**" button

### 2. Configure Agent Example

```json
{
  "name": "Sarah - Sales Expert",
  "description": "Specializes in lead qualification and customer engagement",
  "type": "email",
  "configuration": {
    "personality": {
      "tone": "friendly and professional",
      "expertise": "sales and customer service",
      "communication_style": "empathetic but goal-oriented"
    },
    "goals": [
      "assess_customer_needs",
      "determine_budget_range",
      "understand_timeline",
      "capture_contact_info",
      "schedule_appointment"
    ],
    "instructions": {
      "do_rules": [
        "Always ask about their specific needs",
        "Focus on building rapport first",
        "Provide helpful information",
        "Ask open-ended questions"
      ],
      "dont_rules": [
        "Never be pushy or aggressive",
        "Don't make unrealistic promises",
        "Avoid technical jargon",
        "Don't rush the conversation"
      ]
    }
  }
}
```

## Setting Up Your First Campaign

### 1. Create Campaign

1. Navigate to "**Campaigns**" tab
2. Click "**New Campaign**"
3. Fill in campaign details:

```json
{
  "name": "Lead Qualification Campaign",
  "description": "Automatically qualify incoming leads",
  "agentId": "sarah-sales-expert",
  "settings": {
    "maxConversationLength": 10,
    "qualificationThreshold": 70,
    "handoverCriteria": [
      "budget_confirmed",
      "timeline_established",
      "contact_info_captured"
    ]
  },
  "triggers": {
    "keywords": ["ready to buy", "interested", "schedule call"],
    "scoreThreshold": 75
  }
}
```

## Lead Intake Methods

### Method 1: API Integration

```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "555-123-4567",
    "source": "website_form",
    "campaignId": "lead-qualification"
  }'
```

### Method 2: CSV Upload

1. Go to "**Leads**" → "**Import**"
2. Upload CSV with columns: `email`, `firstName`, `lastName`, `phone`
3. Map fields and select target campaign
4. Click "**Start Import**"

### Method 3: Chat Widget

Add to your website:

```html
<script>
  window.SWARM_CONFIG = {
    apiUrl: 'http://localhost:5000',
    agentId: 'sarah-sales-expert',
  };
</script>
<script src="http://localhost:5000/chat-widget.js"></script>
```

## System Monitoring

### Health Check

```bash
curl http://localhost:5000/api/system/health
```

### Agent Status

```bash
curl http://localhost:5000/api/agents/status
```

### View Logs

Check the terminal running your backend server for real-time logs.

## Next Steps

1. **Configure External Services**: Add your API keys for full functionality
2. **Create Custom Agents**: Build agents for different use cases
3. **Set Up Campaigns**: Configure qualification criteria and handover rules
4. **Import Leads**: Start with a small batch to test the flow
5. **Monitor Performance**: Use the dashboard to track agent effectiveness

## Troubleshooting

- **Port 5000 already in use?** Change the PORT in `.env`
- **Database connection errors?** Verify your DATABASE_URL
- **API key errors?** Check your service configurations in `.env`
- **Frontend not loading?** Ensure both terminals are running

For complete setup with production data, see `TECHNICAL_ARCHITECTURE.md` and `DEPLOYMENT.md`.
