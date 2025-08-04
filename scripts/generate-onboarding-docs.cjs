#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Simple documentation generator without external dependencies
async function generateDocumentation() {
  console.log('📚 Generating onboarding documentation...\n');
  
  const docsDir = path.join(__dirname, '..', 'docs', 'onboarding');
  
  // Ensure directory exists
  try {
    await fs.mkdir(docsDir, { recursive: true });
  } catch (err) {
    console.error('Error creating directory:', err);
  }

  // Task 1.1: API Integration Guide
  const apiGuide = `# API Integration Guide for Agencies

## Overview
This guide provides comprehensive instructions for integrating with the OneKeel Swarm API platform.

## Authentication

### API Key Authentication
All API requests require authentication using an API key in the header:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

### JWT Token Flow
For user-specific operations, obtain a JWT token:

\`\`\`bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@agency.com",
  "password": "secure_password"
}
\`\`\`

Response:
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "role": "agent",
    "clientId": "client-uuid"
  }
}
\`\`\`

## Core API Endpoints

### Lead Management

#### Create Lead
\`\`\`bash
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
\`\`\`

#### Get Lead
\`\`\`bash
GET /api/leads/:leadId
Authorization: Bearer YOUR_TOKEN
\`\`\`

#### Update Lead Status
\`\`\`bash
PATCH /api/leads/:leadId/status
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "status": "qualified",
  "reason": "Met all criteria"
}
\`\`\`

### Campaign Management

#### Create Campaign
\`\`\`bash
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
\`\`\`

### Agent Configuration

#### List Available Agents
\`\`\`bash
GET /api/agents
Authorization: Bearer YOUR_TOKEN
\`\`\`

#### Configure Agent
\`\`\`bash
PUT /api/agents/:agentId/config
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "systemPrompt": "You are a helpful sales assistant...",
  "temperature": 7,
  "maxTokens": 500,
  "responseDelay": 2
}
\`\`\`

## WebSocket Integration

### Real-time Chat Connection
\`\`\`javascript
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
\`\`\`

## Rate Limiting

- **Default Limits**: 100 requests per minute
- **Bulk Operations**: 10 requests per minute
- **WebSocket Messages**: 50 per minute

Rate limit headers:
\`\`\`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800
\`\`\`

## Error Handling

### Error Response Format
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email",
    "requestId": "req_123456"
  }
}
\`\`\`

### Common Error Codes
- \`AUTH_REQUIRED\` - Missing authentication
- \`INVALID_TOKEN\` - Expired or invalid token
- \`RATE_LIMITED\` - Too many requests
- \`VALIDATION_ERROR\` - Invalid request data
- \`NOT_FOUND\` - Resource not found
- \`INTERNAL_ERROR\` - Server error

## Webhook Configuration

### Setting Up Webhooks
\`\`\`bash
POST /api/webhooks
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["lead.created", "lead.qualified", "conversation.started"],
  "secret": "your-webhook-secret"
}
\`\`\`

### Webhook Payload Example
\`\`\`json
{
  "event": "lead.qualified",
  "timestamp": "2024-03-15T10:30:00Z",
  "data": {
    "leadId": "lead-uuid",
    "status": "qualified",
    "score": 85
  }
}
\`\`\`

## Code Examples

### Node.js/TypeScript
\`\`\`typescript
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
    const response = await api.post(\`/api/campaigns/\${campaignId}/start\`);
    return response.data;
  } catch (error) {
    console.error('Error starting campaign:', error.response?.data);
    throw error;
  }
}
\`\`\`

### Python
\`\`\`python
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
\`\`\`

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
`;

  await fs.writeFile(path.join(docsDir, 'API_INTEGRATION_GUIDE.md'), apiGuide);
  console.log('✅ Generated: API_INTEGRATION_GUIDE.md');

  // Task 1.2: Client Setup Checklist
  const setupChecklist = `# Client Setup Checklist

## Pre-Setup Requirements

### Account Information
- [ ] Company name and details
- [ ] Primary contact information
- [ ] Billing information
- [ ] Preferred subdomain (e.g., acme.onekeel.com)

### Technical Requirements
- [ ] API integration requirements defined
- [ ] Webhook endpoints prepared (if needed)
- [ ] SSL certificates for custom domains (if applicable)
- [ ] Team member list with roles

### Business Requirements
- [ ] Campaign objectives defined
- [ ] Target audience identified
- [ ] Compliance requirements documented
- [ ] Budget and usage expectations set

## Account Creation Steps

### 1. Initial Account Setup
- [ ] Create client account in admin panel
- [ ] Set up subdomain routing
- [ ] Configure billing plan
- [ ] Enable appropriate features based on plan

### 2. User Management
- [ ] Create admin user account
- [ ] Send welcome email with credentials
- [ ] Set up additional team members
- [ ] Assign appropriate roles and permissions

### 3. Security Configuration
- [ ] Generate API keys
- [ ] Set up IP allowlisting (if required)
- [ ] Configure 2FA for admin accounts
- [ ] Review and apply security policies

## Initial Configuration

### Agent Setup
- [ ] Select agent templates based on use case
- [ ] Customize agent personalities
- [ ] Configure response parameters
- [ ] Set up escalation rules

### Campaign Configuration
- [ ] Create first campaign
- [ ] Define campaign goals
- [ ] Set up lead qualification criteria
- [ ] Configure communication channels

### Integration Setup
- [ ] Configure email service (Mailgun)
- [ ] Set up SMS service (Twilio)
- [ ] Test webhook connections
- [ ] Verify API endpoints

## Testing Phase

### Functional Testing
- [ ] Create test leads
- [ ] Run test conversations
- [ ] Verify email delivery
- [ ] Test SMS messaging
- [ ] Check webhook deliveries

### Integration Testing
- [ ] Test API authentication
- [ ] Verify lead creation via API
- [ ] Test campaign triggers
- [ ] Validate data synchronization

### Performance Testing
- [ ] Load test with expected volume
- [ ] Monitor response times
- [ ] Check rate limiting behavior
- [ ] Verify error handling

## Go-Live Checklist

### Final Preparations
- [ ] Review all configurations
- [ ] Confirm integrations are working
- [ ] Set up monitoring alerts
- [ ] Create support tickets if needed

### Data Migration (if applicable)
- [ ] Export existing lead data
- [ ] Format according to import template
- [ ] Run test import with sample data
- [ ] Execute full data import
- [ ] Verify data integrity

### Launch Steps
- [ ] Switch from test to production mode
- [ ] Update DNS records (for custom domains)
- [ ] Enable production API keys
- [ ] Start initial campaigns

### Communication
- [ ] Notify client of go-live
- [ ] Provide documentation links
- [ ] Schedule training session
- [ ] Share support contact information

## Post-Launch Monitoring

### First 24 Hours
- [ ] Monitor system performance
- [ ] Check error logs
- [ ] Verify lead processing
- [ ] Review conversation quality

### First Week
- [ ] Daily performance reviews
- [ ] Address any issues
- [ ] Collect client feedback
- [ ] Optimize agent responses

### First Month
- [ ] Weekly performance reports
- [ ] ROI analysis
- [ ] Usage pattern review
- [ ] Optimization recommendations

## Training and Support

### Documentation Provided
- [ ] API documentation
- [ ] User guide
- [ ] Best practices guide
- [ ] Troubleshooting guide

### Training Sessions
- [ ] Admin panel walkthrough
- [ ] Campaign management training
- [ ] API integration workshop
- [ ] Performance monitoring training

### Ongoing Support
- [ ] Assign dedicated success manager
- [ ] Schedule regular check-ins
- [ ] Provide performance reports
- [ ] Offer optimization suggestions

## Success Metrics

### Technical Metrics
- [ ] API uptime > 99.9%
- [ ] Response time < 200ms
- [ ] Error rate < 0.1%
- [ ] Successful delivery rate > 95%

### Business Metrics
- [ ] Lead engagement rate
- [ ] Qualification rate
- [ ] Conversion rate
- [ ] Customer satisfaction score

## Escalation Procedures

### Technical Issues
1. Check status page
2. Review error logs
3. Contact technical support
4. Escalate to engineering if needed

### Business Issues
1. Review configuration
2. Analyze performance data
3. Contact success manager
4. Schedule optimization session

## Notes Section

### Client-Specific Requirements:
_[Document any unique requirements or customizations]_

### Configuration Decisions:
_[Record key decisions made during setup]_

### Known Issues/Limitations:
_[Note any constraints or workarounds]_

### Future Enhancements:
_[List planned improvements or features]_
`;

  await fs.writeFile(path.join(docsDir, 'CLIENT_SETUP_CHECKLIST.md'), setupChecklist);
  console.log('✅ Generated: CLIENT_SETUP_CHECKLIST.md');

  // Task 1.3: Multi-tenant Architecture
  const architectureDoc = `# Multi-Tenant Architecture Documentation

## Overview

The OneKeel Swarm platform implements a robust multi-tenant architecture that ensures complete data isolation, scalability, and security for each client organization.

## Architecture Patterns

### Tenant Isolation Strategy

We use a **Shared Database with Row-Level Security** approach:
- Single database instance with tenant isolation at the row level
- Every table includes a \`clientId\` column for tenant identification
- Database queries automatically filter by tenant context
- Indexed for optimal performance

### Key Benefits
1. **Cost Efficiency** - Shared infrastructure reduces operational costs
2. **Easy Maintenance** - Single codebase and database to maintain
3. **Scalability** - Can handle thousands of tenants
4. **Flexibility** - Easy to implement tenant-specific features

## Database Schema

### Tenant Identification

Every table includes tenant identification:

\`\`\`sql
-- Example: leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  -- ... other fields
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_leads_client_id (client_id),
  INDEX idx_leads_client_email (client_id, email)
);

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON leads
  FOR ALL
  USING (client_id = current_setting('app.current_client_id')::uuid);
\`\`\`

### Tenant Table

\`\`\`sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  settings JSONB DEFAULT '{}',
  plan VARCHAR(50) DEFAULT 'basic',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## API Request Flow

### 1. Request Authentication
\`\`\`typescript
// Middleware extracts tenant context from JWT
export const tenantMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  // Set tenant context
  req.clientId = decoded.clientId;
  req.userId = decoded.userId;
  
  // Set database session variable
  await db.query('SET LOCAL app.current_client_id = $1', [req.clientId]);
  
  next();
};
\`\`\`

### 2. Query Isolation
\`\`\`typescript
// All queries automatically filtered by tenant
export const LeadsRepository = {
  async findAll(clientId: string) {
    // RLS automatically filters by clientId
    return db.query('SELECT * FROM leads');
  },
  
  async create(clientId: string, data: LeadData) {
    // clientId automatically injected
    return db.query(
      'INSERT INTO leads (client_id, ...) VALUES ($1, ...)',
      [clientId, ...]
    );
  }
};
\`\`\`

### 3. Subdomain Routing
\`\`\`typescript
// Extract tenant from subdomain
export const subdomainMiddleware = (req, res, next) => {
  const host = req.get('host');
  const subdomain = host.split('.')[0];
  
  if (subdomain && subdomain !== 'www') {
    req.tenantDomain = subdomain;
  }
  
  next();
};
\`\`\`

## Caching Strategy

### Tenant-Specific Caching

\`\`\`typescript
class TenantCache {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      keyPrefix: 'onekeel:',
    });
  }
  
  async get(clientId: string, key: string) {
    return this.redis.get(\`\${clientId}:\${key}\`);
  }
  
  async set(clientId: string, key: string, value: any, ttl?: number) {
    const data = JSON.stringify(value);
    if (ttl) {
      return this.redis.setex(\`\${clientId}:\${key}\`, ttl, data);
    }
    return this.redis.set(\`\${clientId}:\${key}\`, data);
  }
  
  async invalidate(clientId: string, pattern?: string) {
    const keys = await this.redis.keys(\`\${clientId}:\${pattern || '*'}\`);
    if (keys.length > 0) {
      return this.redis.del(...keys);
    }
  }
}
\`\`\`

### Cache Isolation Benefits
- Prevents data leakage between tenants
- Allows tenant-specific cache invalidation
- Enables different cache strategies per tenant

## Security Boundaries

### Data Access Controls

1. **Database Level**
   - Row Level Security (RLS) policies
   - Tenant ID validation on every query
   - Prepared statements to prevent SQL injection

2. **Application Level**
   - JWT tokens include clientId
   - Middleware validates tenant context
   - API endpoints verify ownership

3. **Network Level**
   - Subdomain isolation
   - SSL/TLS encryption
   - IP allowlisting per tenant (optional)

### Example Security Implementation

\`\`\`typescript
// Verify resource ownership
export const verifyResourceOwnership = async (
  resourceType: string,
  resourceId: string,
  clientId: string
) => {
  const result = await db.query(
    \`SELECT client_id FROM \${resourceType} WHERE id = $1\`,
    [resourceId]
  );
  
  if (!result.rows[0] || result.rows[0].client_id !== clientId) {
    throw new ForbiddenError('Access denied');
  }
  
  return true;
};

// Usage in API endpoint
router.get('/api/leads/:id', authenticate, async (req, res) => {
  await verifyResourceOwnership('leads', req.params.id, req.clientId);
  const lead = await LeadsRepository.findById(req.params.id);
  res.json(lead);
});
\`\`\`

## Resource Allocation

### Tenant Limits Configuration

\`\`\`typescript
interface TenantLimits {
  maxLeads: number;
  maxCampaigns: number;
  maxAgents: number;
  apiRateLimit: number;
  storageQuota: number; // in GB
}

const PLAN_LIMITS: Record<string, TenantLimits> = {
  basic: {
    maxLeads: 1000,
    maxCampaigns: 5,
    maxAgents: 2,
    apiRateLimit: 100, // per minute
    storageQuota: 1
  },
  professional: {
    maxLeads: 10000,
    maxCampaigns: 20,
    maxAgents: 5,
    apiRateLimit: 500,
    storageQuota: 10
  },
  enterprise: {
    maxLeads: -1, // unlimited
    maxCampaigns: -1,
    maxAgents: -1,
    apiRateLimit: 2000,
    storageQuota: 100
  }
};
\`\`\`

### Resource Enforcement

\`\`\`typescript
export const enforceResourceLimits = async (
  clientId: string,
  resourceType: string
) => {
  const client = await ClientsRepository.findById(clientId);
  const limits = PLAN_LIMITS[client.plan];
  
  if (resourceType === 'leads') {
    const count = await LeadsRepository.count(clientId);
    if (limits.maxLeads !== -1 && count >= limits.maxLeads) {
      throw new Error('Lead limit exceeded for your plan');
    }
  }
  
  // Similar checks for other resources
};
\`\`\`

## Deployment Patterns

### Multi-Region Deployment

\`\`\`yaml
# Kubernetes deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: onekeel-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: onekeel-api
  template:
    metadata:
      labels:
        app: onekeel-api
    spec:
      containers:
      - name: api
        image: onekeel/api:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
\`\`\`

### Database Sharding Strategy

For extreme scale, implement database sharding:

\`\`\`typescript
// Shard key based on clientId
function getShardConnection(clientId: string) {
  const shardId = hashClientId(clientId) % NUM_SHARDS;
  return dbConnections[shardId];
}

// Route queries to appropriate shard
export const ShardedRepository = {
  async query(clientId: string, sql: string, params: any[]) {
    const connection = getShardConnection(clientId);
    return connection.query(sql, params);
  }
};
\`\`\`

## Monitoring and Observability

### Tenant-Specific Metrics

\`\`\`typescript
// Prometheus metrics with tenant labels
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status', 'tenant']
});

// Track metrics per tenant
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || 'unknown', res.statusCode, req.clientId)
      .observe(duration);
  });
  
  next();
});
\`\`\`

### Tenant Dashboard

Create tenant-specific monitoring dashboards showing:
- API usage and rate limits
- Resource consumption
- Error rates
- Performance metrics
- Cost allocation

## Migration and Backup

### Tenant Data Export

\`\`\`typescript
export async function exportTenantData(clientId: string) {
  const tables = ['leads', 'campaigns', 'agents', 'conversations'];
  const exportData: Record<string, any[]> = {};
  
  for (const table of tables) {
    const data = await db.query(
      \`SELECT * FROM \${table} WHERE client_id = $1\`,
      [clientId]
    );
    exportData[table] = data.rows;
  }
  
  return exportData;
}
\`\`\`

### Tenant-Specific Backups

\`\`\`bash
#!/bin/bash
# Backup specific tenant data
CLIENT_ID=$1
BACKUP_FILE="backup-\${CLIENT_ID}-$(date +%Y%m%d-%H%M%S).sql"

pg_dump $DATABASE_URL \\
  --table="leads" \\
  --table="campaigns" \\
  --table="agents" \\
  --where="client_id='\${CLIENT_ID}'" \\
  > \${BACKUP_FILE}
\`\`\`

## Best Practices

1. **Always validate tenant context** before any data operation
2. **Use prepared statements** to prevent SQL injection
3. **Implement rate limiting** per tenant
4. **Monitor resource usage** to prevent noisy neighbors
5. **Test tenant isolation** regularly with automated tests
6. **Document tenant-specific customizations**
7. **Plan for tenant data portability**

## Common Pitfalls to Avoid

1. **Forgetting clientId in queries** - Use repository pattern
2. **Cross-tenant data leaks** - Always verify ownership
3. **Shared caches without tenant keys** - Prefix all cache keys
4. **Missing indexes on clientId** - Critical for performance
5. **Hardcoded tenant information** - Use configuration

## Testing Strategies

### Integration Tests

\`\`\`typescript
describe('Multi-tenant isolation', () => {
  it('should not allow cross-tenant data access', async () => {
    const tenant1 = await createTestTenant();
    const tenant2 = await createTestTenant();
    
    const lead = await createLead(tenant1.id, { email: 'test@example.com' });
    
    // Try to access tenant1's lead with tenant2's context
    await expect(
      LeadsRepository.findById(lead.id, tenant2.id)
    ).rejects.toThrow('Access denied');
  });
});
\`\`\`

This architecture ensures secure, scalable, and maintainable multi-tenant operations for the OneKeel Swarm platform.`;

  await fs.writeFile(path.join(docsDir, 'MULTI_TENANT_ARCHITECTURE.md'), architectureDoc);
  console.log('✅ Generated: MULTI_TENANT_ARCHITECTURE.md');

  // Task 1.4: User Role Permissions Matrix
  const permissionsMatrix = `# User Role Permissions Matrix

## Overview

This document defines the role-based access control (RBAC) system for the OneKeel Swarm platform. Each role has specific permissions that determine what actions users can perform.

## Role Definitions

### 1. **Admin** (Highest Level)
Full system access with ability to manage all aspects of the platform.

### 2. **Manager**
Operational control over campaigns, agents, and team members.

### 3. **Agent**
Day-to-day user focused on lead interaction and campaign execution.

### 4. **Viewer** 
Read-only access for monitoring and reporting.

## Permissions Matrix

### Core Resources

| Resource | Action | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| **Users** | | | | | |
| | Create | ✅ | ✅ | ❌ | ❌ |
| | Read | ✅ | ✅ | Own only | ❌ |
| | Update | ✅ | ✅ | Own only | ❌ |
| | Delete | ✅ | ❌ | ❌ | ❌ |
| | Change Roles | ✅ | ❌ | ❌ | ❌ |

### Lead Management

| Resource | Action | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| **Leads** | | | | | |
| | Create | ✅ | ✅ | ✅ | ❌ |
| | Read | ✅ | ✅ | ✅ | ✅ |
| | Update | ✅ | ✅ | ✅ | ❌ |
| | Delete | ✅ | ✅ | ❌ | ❌ |
| | Export | ✅ | ✅ | ❌ | ❌ |
| | Import | ✅ | ✅ | ❌ | ❌ |
| | Assign | ✅ | ✅ | ❌ | ❌ |

### Campaign Management

| Resource | Action | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| **Campaigns** | | | | | |
| | Create | ✅ | ✅ | ❌ | ❌ |
| | Read | ✅ | ✅ | ✅ | ✅ |
| | Update | ✅ | ✅ | ❌ | ❌ |
| | Delete | ✅ | ✅ | ❌ | ❌ |
| | Start/Stop | ✅ | ✅ | ❌ | ❌ |
| | Clone | ✅ | ✅ | ❌ | ❌ |
| | View Analytics | ✅ | ✅ | ✅ | ✅ |

### Agent Configuration

| Resource | Action | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| **AI Agents** | | | | | |
| | Create | ✅ | ✅ | ❌ | ❌ |
| | Read Config | ✅ | ✅ | ✅ | ✅ |
| | Update Config | ✅ | ✅ | ❌ | ❌ |
| | Delete | ✅ | ❌ | ❌ | ❌ |
| | Test | ✅ | ✅ | ✅ | ❌ |
| | View Logs | ✅ | ✅ | ✅ | ✅ |

### Communication

| Resource | Action | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| **Conversations** | | | | | |
| | View | ✅ | ✅ | ✅ | ✅ |
| | Send Message | ✅ | ✅ | ✅ | ❌ |
| | Take Over | ✅ | ✅ | ✅ | ❌ |
| | Close | ✅ | ✅ | ✅ | ❌ |
| | Export | ✅ | ✅ | ❌ | ❌ |

### System Configuration

| Resource | Action | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| **Settings** | | | | | |
| | View Settings | ✅ | ✅ | ❌ | ❌ |
| | Update Settings | ✅ | ❌ | ❌ | ❌ |
| | API Keys | ✅ | ❌ | ❌ | ❌ |
| | Billing | ✅ | ❌ | ❌ | ❌ |
| | Integrations | ✅ | ✅ | ❌ | ❌ |

### Analytics & Reports

| Resource | Action | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| **Reports** | | | | | |
| | View Dashboard | ✅ | ✅ | ✅ | ✅ |
| | Export Reports | ✅ | ✅ | ❌ | ✅ |
| | Custom Reports | ✅ | ✅ | ❌ | ❌ |
| | Real-time Analytics | ✅ | ✅ | ✅ | ✅ |
| | Historical Data | ✅ | ✅ | Limited | ✅ |

## API Endpoint Permissions

### Authentication Endpoints

| Endpoint | Method | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| /api/auth/login | POST | ✅ | ✅ | ✅ | ✅ |
| /api/auth/logout | POST | ✅ | ✅ | ✅ | ✅ |
| /api/auth/refresh | POST | ✅ | ✅ | ✅ | ✅ |
| /api/auth/reset-password | POST | ✅ | ✅ | ✅ | ✅ |

### Resource Endpoints

| Endpoint | Method | Admin | Manager | Agent | Viewer |
|----------|--------|-------|---------|-------|--------|
| /api/users | GET | ✅ | ✅ | ❌ | ❌ |
| /api/users | POST | ✅ | ✅ | ❌ | ❌ |
| /api/users/:id | PUT | ✅ | ✅ | Own only | ❌ |
| /api/users/:id | DELETE | ✅ | ❌ | ❌ | ❌ |
| | | | | | |
| /api/leads | GET | ✅ | ✅ | ✅ | ✅ |
| /api/leads | POST | ✅ | ✅ | ✅ | ❌ |
| /api/leads/:id | PUT | ✅ | ✅ | ✅ | ❌ |
| /api/leads/:id | DELETE | ✅ | ✅ | ❌ | ❌ |
| | | | | | |
| /api/campaigns | GET | ✅ | ✅ | ✅ | ✅ |
| /api/campaigns | POST | ✅ | ✅ | ❌ | ❌ |
| /api/campaigns/:id | PUT | ✅ | ✅ | ❌ | ❌ |
| /api/campaigns/:id | DELETE | ✅ | ✅ | ❌ | ❌ |

## Special Permissions

### Feature-Specific Permissions

| Feature | Admin | Manager | Agent | Viewer |
|---------|-------|---------|-------|--------|
| Bulk Operations | ✅ | ✅ | ❌ | ❌ |
| Data Export | ✅ | ✅ | ❌ | ❌ |
| System Logs | ✅ | ❌ | ❌ | ❌ |
| Audit Trail | ✅ | ✅ | ❌ | ❌ |
| API Key Management | ✅ | ❌ | ❌ | ❌ |
| Webhook Configuration | ✅ | ✅ | ❌ | ❌ |
| Template Management | ✅ | ✅ | ❌ | ❌ |

### Time-Based Restrictions

Some permissions can be time-restricted:

| Permission | Description | Applicable Roles |
|------------|-------------|------------------|
| After Hours Access | Access system outside business hours | Admin, Manager |
| Weekend Access | Access system on weekends | Admin, Manager |
| Holiday Access | Access during holidays | Admin only |

## Permission Implementation

### Code Example - Middleware

\`\`\`typescript
// Permission middleware
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role;
    const hasPermission = checkPermission(userRole, resource, action);
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: \`\${resource}:\${action}\`,
        userRole
      });
    }
    
    next();
  };
};

// Usage
router.post('/api/campaigns',
  authenticate,
  requirePermission('campaigns', 'create'),
  createCampaign
);
\`\`\`

### Permission Checking Function

\`\`\`typescript
const permissions: PermissionMatrix = {
  admin: {
    users: ['create', 'read', 'update', 'delete'],
    leads: ['create', 'read', 'update', 'delete', 'export', 'import'],
    campaigns: ['create', 'read', 'update', 'delete', 'start', 'stop'],
    agents: ['create', 'read', 'update', 'delete', 'configure'],
    settings: ['read', 'update'],
    reports: ['view', 'export', 'create']
  },
  manager: {
    users: ['create', 'read', 'update'],
    leads: ['create', 'read', 'update', 'delete', 'export', 'import'],
    campaigns: ['create', 'read', 'update', 'delete', 'start', 'stop'],
    agents: ['create', 'read', 'update', 'configure'],
    settings: ['read'],
    reports: ['view', 'export', 'create']
  },
  agent: {
    users: ['read:own', 'update:own'],
    leads: ['create', 'read', 'update'],
    campaigns: ['read'],
    agents: ['read', 'test'],
    settings: [],
    reports: ['view']
  },
  viewer: {
    users: [],
    leads: ['read'],
    campaigns: ['read'],
    agents: ['read'],
    settings: [],
    reports: ['view', 'export']
  }
};

function checkPermission(
  role: string,
  resource: string,
  action: string,
  context?: { ownerId?: string, userId?: string }
): boolean {
  const rolePermissions = permissions[role];
  if (!rolePermissions) return false;
  
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;
  
  // Check for special "own" permissions
  if (action.includes(':own') && context) {
    const baseAction = action.replace(':own', '');
    return resourcePermissions.includes(action) && 
           context.ownerId === context.userId;
  }
  
  return resourcePermissions.includes(action);
}
\`\`\`

## Custom Role Creation

For enterprise clients, custom roles can be created:

\`\`\`typescript
interface CustomRole {
  name: string;
  description: string;
  permissions: {
    [resource: string]: string[];
  };
  inheritsFrom?: string; // Base role to inherit from
}

// Example custom role
const customRole: CustomRole = {
  name: 'campaign_specialist',
  description: 'Focused on campaign management with limited user access',
  inheritsFrom: 'agent',
  permissions: {
    campaigns: ['create', 'read', 'update', 'start', 'stop'],
    leads: ['read', 'update', 'export'],
    reports: ['view', 'export', 'create']
  }
};
\`\`\`

## Best Practices

1. **Principle of Least Privilege** - Users should have minimum permissions needed
2. **Regular Audits** - Review role assignments quarterly
3. **Document Changes** - Keep audit trail of permission changes
4. **Test Permissions** - Automated tests for permission boundaries
5. **Clear Escalation Path** - Define how to request additional permissions

## Security Considerations

1. **No Permission Elevation** - Users cannot grant permissions they don't have
2. **Session Management** - Permissions checked on each request
3. **API Token Scoping** - API tokens can have reduced permissions
4. **Audit Logging** - All permission checks are logged
5. **Two-Factor Authentication** - Required for Admin and Manager roles

This permission matrix ensures secure and controlled access to all platform features while maintaining flexibility for different organizational needs.
`;

  await fs.writeFile(path.join(docsDir, 'USER_ROLE_PERMISSIONS.md'), permissionsMatrix);
  console.log('✅ Generated: USER_ROLE_PERMISSIONS.md');

  console.log('\n📚 Documentation generation complete!');
  console.log(`Generated files in: ${docsDir}`);
}

// Run the generator
generateDocumentation().catch(console.error);