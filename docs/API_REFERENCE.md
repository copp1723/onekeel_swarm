# API Reference

## Authentication

All API endpoints require authentication via the `Authorization` header:

```bash
curl -H "Authorization: Bearer your-api-key" https://your-domain.com/api/endpoint
```

## Agent Management

### GET /api/agents

Retrieve all configured agents.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "agent_123",
      "name": "Sarah - Sales Expert",
      "type": "email",
      "status": "active",
      "processedToday": 15,
      "configuration": {
        "personality": {
          "tone": "friendly",
          "expertise": "sales"
        }
      }
    }
  ]
}
```

### POST /api/agents

Create a new agent configuration.

**Request:**
```json
{
  "name": "Customer Service Agent",
  "type": "chat",
  "configuration": {
    "personality": {
      "tone": "helpful and patient",
      "expertise": "customer support"
    },
    "goals": ["resolve_issue", "capture_feedback"],
    "instructions": {
      "do_rules": ["Listen actively", "Provide solutions"],
      "dont_rules": ["Don't make promises you can't keep"]
    }
  }
}
```

### GET /api/agents/{id}/status

Get detailed status for a specific agent.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "agent_123",
    "status": "active",
    "lastActivity": "2025-01-15T10:30:00Z",
    "totalProcessed": 156,
    "successRate": 78.5
  }
}
```

## Campaign Management

### GET /api/campaigns

Retrieve all campaigns.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "campaign_123",
      "name": "Lead Qualification Q1",
      "status": "active",
      "agentId": "agent_123",
      "leadsProcessed": 45,
      "qualificationRate": 68.9
    }
  ]
}
```

### POST /api/campaigns

Create a new campaign.

**Request:**
```json
{
  "name": "New Product Launch",
  "description": "Qualify leads for new product",
  "agentId": "agent_123",
  "settings": {
    "maxConversationLength": 8,
    "qualificationThreshold": 75,
    "handoverCriteria": ["budget_confirmed", "interest_high"]
  }
}
```

## Lead Management

### GET /api/leads

Retrieve leads with filtering and pagination.

**Query Parameters:**
- `status`: Filter by lead status (new, contacted, qualified, closed)
- `campaignId`: Filter by campaign
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "lead_123",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "555-123-4567",
      "status": "qualified",
      "source": "website_form",
      "campaignId": "campaign_123",
      "qualificationScore": 82,
      "createdAt": "2025-01-15T10:00:00Z",
      "lastContact": "2025-01-15T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### POST /api/leads

Submit a new lead.

**Request:**
```json
{
  "email": "prospect@company.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "555-987-6543",
  "source": "api_integration",
  "campaignId": "campaign_123",
  "metadata": {
    "company": "Tech Corp",
    "role": "Manager",
    "budget": "50000"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "lead_456",
    "status": "received",
    "campaignAssigned": "campaign_123",
    "agentAssigned": "agent_123",
    "nextAction": "initial_contact_scheduled"
  }
}
```

### GET /api/leads/{id}

Get detailed information for a specific lead.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "lead_123",
    "email": "customer@example.com",
    "status": "qualified",
    "qualificationScore": 82,
    "conversationHistory": [
      {
        "timestamp": "2025-01-15T10:00:00Z",
        "agent": "Sarah",
        "message": "Hi! I'd love to help you find the right solution.",
        "response": "I'm interested in your services."
      }
    ],
    "goalsAchieved": ["budget_confirmed", "timeline_established"],
    "handoverReady": true
  }
}
```

## Conversation Management

### POST /api/chat

Handle real-time chat interactions.

**Request:**
```json
{
  "message": "I'm interested in your services",
  "sessionId": "session_123",
  "leadId": "lead_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Great! I'd love to help you learn more about our solutions. What's your main goal?",
    "sessionId": "session_123",
    "agentId": "agent_123",
    "conversationId": "conv_456"
  }
}
```

### GET /api/conversations/{id}

Retrieve conversation history.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conv_456",
    "leadId": "lead_123",
    "agentId": "agent_123",
    "messages": [
      {
        "timestamp": "2025-01-15T10:00:00Z",
        "sender": "lead",
        "content": "I'm interested in your services"
      },
      {
        "timestamp": "2025-01-15T10:01:00Z",
        "sender": "agent",
        "content": "Great! I'd love to help you learn more."
      }
    ],
    "status": "active",
    "qualificationScore": 65
  }
}
```

## Email Campaigns

### POST /api/email/send

Send email to a lead or list of leads.

**Request:**
```json
{
  "to": ["lead1@example.com", "lead2@example.com"],
  "subject": "Follow-up on your inquiry",
  "template": "follow_up_template",
  "campaignId": "campaign_123",
  "personalization": {
    "firstName": "John",
    "companyName": "Tech Corp"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "emailId": "email_789",
    "sent": 2,
    "failed": 0,
    "scheduled": false
  }
}
```

### GET /api/email/templates

Retrieve available email templates.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "template_123",
      "name": "Welcome Email",
      "subject": "Welcome to {{companyName}}!",
      "content": "Hi {{firstName}}, thanks for your interest...",
      "variables": ["firstName", "companyName"]
    }
  ]
}
```

## System Monitoring

### GET /api/system/health

System health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "memoryUsage": {
      "heapUsed": 120,
      "heapTotal": 150
    },
    "agents": [
      {
        "id": "agent_123",
        "status": "active",
        "lastActivity": "2025-01-15T14:30:00Z"
      }
    ],
    "database": {
      "status": "connected",
      "connections": 5
    },
    "externalServices": {
      "openai": "connected",
      "mailgun": "connected",
      "twilio": "connected"
    }
  }
}
```

### GET /api/system/metrics

Performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": {
      "total": 1250,
      "qualified": 340,
      "qualificationRate": 27.2
    },
    "conversations": {
      "active": 15,
      "completed": 892
    },
    "agents": {
      "active": 4,
      "totalProcessed": 2150
    },
    "performance": {
      "avgResponseTime": 1.2,
      "successRate": 94.5
    }
  }
}
```

## WebSocket API

### Chat WebSocket

Real-time chat connection at `ws://your-domain.com/ws/chat`

**Connection:**
```javascript
const ws = new WebSocket("ws://localhost:5000/ws/chat");

// Send message
ws.send(JSON.stringify({
  type: "message",
  content: "Hello, I need help",
  sessionId: "session_123",
  leadId: "lead_123"
}));

// Receive response
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Agent response:", data.content);
};
```

**Message Formats:**

```json
// Outgoing message
{
  "type": "message",
  "content": "User message here",
  "sessionId": "session_123",
  "leadId": "lead_123"
}

// Incoming response
{
  "type": "response",
  "content": "Agent response here",
  "sessionId": "session_123",
  "agentId": "agent_123",
  "timestamp": "2025-01-15T14:30:00Z"
}
```

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email",
      "reason": "missing_required_field"
    }
  },
  "timestamp": "2025-01-15T14:30:00Z"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_REQUIRED` | Authentication required | 401 |
| `INVALID_TOKEN` | Invalid API token | 401 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `NOT_FOUND` | Resource not found | 404 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

## Rate Limits

- **General API**: 100 requests per minute
- **Chat API**: 60 requests per minute per session  
- **Email API**: 10 requests per minute
- **System Monitoring**: 120 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705329000
```

## Testing

### Health Check
```bash
curl http://localhost:5000/api/system/health
```

### Create Test Lead
```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"email": "test@example.com", "firstName": "Test", "campaignId": "campaign_123"}'
```

### Send Test Message
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "sessionId": "test_session"}'
```