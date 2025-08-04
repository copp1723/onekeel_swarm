# Multi-Tenant Architecture Documentation

## Overview

The OneKeel Swarm platform implements a robust multi-tenant architecture that ensures complete data isolation, scalability, and security for each client organization.

## Architecture Patterns

### Tenant Isolation Strategy

We use a **Shared Database with Row-Level Security** approach:
- Single database instance with tenant isolation at the row level
- Every table includes a `clientId` column for tenant identification
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

```sql
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
```

### Tenant Table

```sql
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
```

## API Request Flow

### 1. Request Authentication
```typescript
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
```

### 2. Query Isolation
```typescript
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
```

### 3. Subdomain Routing
```typescript
// Extract tenant from subdomain
export const subdomainMiddleware = (req, res, next) => {
  const host = req.get('host');
  const subdomain = host.split('.')[0];
  
  if (subdomain && subdomain !== 'www') {
    req.tenantDomain = subdomain;
  }
  
  next();
};
```

## Caching Strategy

### Tenant-Specific Caching

```typescript
class TenantCache {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      keyPrefix: 'onekeel:',
    });
  }
  
  async get(clientId: string, key: string) {
    return this.redis.get(`${clientId}:${key}`);
  }
  
  async set(clientId: string, key: string, value: any, ttl?: number) {
    const data = JSON.stringify(value);
    if (ttl) {
      return this.redis.setex(`${clientId}:${key}`, ttl, data);
    }
    return this.redis.set(`${clientId}:${key}`, data);
  }
  
  async invalidate(clientId: string, pattern?: string) {
    const keys = await this.redis.keys(`${clientId}:${pattern || '*'}`);
    if (keys.length > 0) {
      return this.redis.del(...keys);
    }
  }
}
```

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

```typescript
// Verify resource ownership
export const verifyResourceOwnership = async (
  resourceType: string,
  resourceId: string,
  clientId: string
) => {
  const result = await db.query(
    `SELECT client_id FROM ${resourceType} WHERE id = $1`,
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
```

## Resource Allocation

### Tenant Limits Configuration

```typescript
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
```

### Resource Enforcement

```typescript
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
```

## Deployment Patterns

### Multi-Region Deployment

```yaml
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
```

### Database Sharding Strategy

For extreme scale, implement database sharding:

```typescript
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
```

## Monitoring and Observability

### Tenant-Specific Metrics

```typescript
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
```

### Tenant Dashboard

Create tenant-specific monitoring dashboards showing:
- API usage and rate limits
- Resource consumption
- Error rates
- Performance metrics
- Cost allocation

## Migration and Backup

### Tenant Data Export

```typescript
export async function exportTenantData(clientId: string) {
  const tables = ['leads', 'campaigns', 'agents', 'conversations'];
  const exportData: Record<string, any[]> = {};
  
  for (const table of tables) {
    const data = await db.query(
      `SELECT * FROM ${table} WHERE client_id = $1`,
      [clientId]
    );
    exportData[table] = data.rows;
  }
  
  return exportData;
}
```

### Tenant-Specific Backups

```bash
#!/bin/bash
# Backup specific tenant data
CLIENT_ID=$1
BACKUP_FILE="backup-${CLIENT_ID}-$(date +%Y%m%d-%H%M%S).sql"

pg_dump $DATABASE_URL \
  --table="leads" \
  --table="campaigns" \
  --table="agents" \
  --where="client_id='${CLIENT_ID}'" \
  > ${BACKUP_FILE}
```

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

```typescript
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
```

This architecture ensures secure, scalable, and maintainable multi-tenant operations for the OneKeel Swarm platform.