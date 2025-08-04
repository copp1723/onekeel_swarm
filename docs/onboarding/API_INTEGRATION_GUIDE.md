# API Integration Guide for Agencies

## Overview
This guide provides comprehensive instructions for integrating with the OneKeel Swarm API platform.

## Authentication

### API Key Authentication
All API requests require authentication using an API key in the header:

```
Authorization: Bearer YOUR_API_KEY
```

### JWT Token Flow
For user-specific operations, obtain a JWT token:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@agency.com",
  "password": "secure_password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "role": "agent",
    "clientId": "client-uuid"
  }
}
```

## Core API Endpoints

### Lead Management

#### Create Lead
```bash
POST /api/leads
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "source": "website",
  "metadata": {
    "campaign": "summer-2024",
    "utm_source": "google"
  }
}
```

#### Get Lead
```bash
GET /api/leads/:leadId
Authorization: Bearer YOUR_TOKEN
```

#### Update Lead Status
```bash
PATCH /api/leads/:leadId/status
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "status": "qualified",
  "reason": "Met all criteria"
}
```

### Campaign Management

#### Create Campaign
```bash
POST /api/campaigns
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Q4 Outreach",
  "type": "drip",
  "agentId": "agent-uuid",
  "settings": {
    "channels": ["email", "sms"],
    "defaultChannel": "email",
    "schedule": {
      "startDate": "2024-10-01",
      "endDate": "2024-12-31"
    }
  }
}
```

### Agent Configuration

#### List Available Agents
```bash
GET /api/agents
Authorization: Bearer YOUR_TOKEN
```

#### Configure Agent
```bash
PUT /api/agents/:agentId/config
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "systemPrompt": "You are a helpful sales assistant...",
  "temperature": 7,
  "maxTokens": 500,
  "responseDelay": 2
}
```

## WebSocket Integration

### Real-time Chat Connection
```javascript
const socket = io('wss://api.onekeel.com', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected to real-time service');
});

socket.on('message', (data) => {
  console.log('New message:', data);
});

socket.emit('join-conversation', { leadId: 'lead-uuid' });
```

## Rate Limiting

- **Default Limits**: 100 requests per minute
- **Bulk Operations**: 10 requests per minute
- **WebSocket Messages**: 50 per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email",
    "requestId": "req_123456"
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED` - Missing authentication
- `INVALID_TOKEN` - Expired or invalid token
- `RATE_LIMITED` - Too many requests
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

## Webhook Configuration

### Setting Up Webhooks
```bash
POST /api/webhooks
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["lead.created", "lead.qualified", "conversation.started"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload Example
```json
{
  "event": "lead.qualified",
  "timestamp": "2024-03-15T10:30:00Z",
  "data": {
    "leadId": "lead-uuid",
    "status": "qualified",
    "score": 85
  }
}
```

## Code Examples

### Node.js/TypeScript
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.onekeel.com',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

// Create a lead
async function createLead(leadData: any) {
  try {
    const response = await api.post('/api/leads', leadData);
    return response.data;
  } catch (error) {
    console.error('Error creating lead:', error.response?.data);
    throw error;
  }
}

// Start a campaign
async function startCampaign(campaignId: string) {
  try {
    const response = await api.post(`/api/campaigns/${campaignId}/start`);
    return response.data;
  } catch (error) {
    console.error('Error starting campaign:', error.response?.data);
    throw error;
  }
}
```

### Python
```python
import requests

class OneKeelAPI:
    def __init__(self, api_key):
        self.base_url = "https://api.onekeel.com"
        self.headers = {
            "Authorization": f"Bearer {api_key}"
        }
    
    def create_lead(self, lead_data):
        response = requests.post(
            f"{self.base_url}/api/leads",
            json=lead_data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_campaign_stats(self, campaign_id):
        response = requests.get(
            f"{self.base_url}/api/campaigns/{campaign_id}/stats",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
```

## Best Practices

1. **Always use HTTPS** for API calls
2. **Store API keys securely** - Never commit to version control
3. **Implement retry logic** with exponential backoff
4. **Log all API interactions** for debugging
5. **Validate data client-side** before sending
6. **Handle rate limits gracefully**
7. **Use webhook signatures** to verify authenticity

## Support

- Documentation: https://docs.onekeel.com
- API Status: https://status.onekeel.com
- Support Email: api-support@onekeel.com
