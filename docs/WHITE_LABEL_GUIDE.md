# White Label Implementation Guide

## Overview
This white label system allows you to create customized, branded instances of the CCL3 platform for different clients. Each client can have their own domain, branding, and isolated data.

## Architecture

### Database Design
- **Multi-tenant architecture**: Uses `client_id` columns throughout the schema
- **Row-level security**: All queries are automatically scoped to the authenticated client
- **Clients table**: Stores client configuration and branding settings

### Key Components

#### 1. Database Schema (`server/db/schema.ts`)
```typescript
// Clients table stores white label configurations
const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain').unique(),
  brandingConfig: jsonb('branding_config').notNull().$type<BrandingConfig>(),
  plan: text('plan').notNull().default('basic'),
  active: boolean('active').notNull().default(true),
  // ... timestamps
});

// All main tables have client_id for isolation
const users = pgTable('users', {
  // ... other fields
  clientId: uuid('client_id').references(() => clients.id),
});
```

#### 2. Tenant Middleware (`server/middleware/tenant.ts`)
Handles:
- **Tenant identification** via JWT, subdomain, header, or API key
- **Resource ownership validation**
- **Branding header injection**
- **Request context setup**

#### 3. Client Management API (`server/routes/clients.ts`)
- CRUD operations for clients
- API key management
- Branding configuration updates

#### 4. Branding API (`server/routes/branding.ts`)
- Domain-based branding lookup
- Default branding fallback
- Client identification

#### 5. Frontend Components (`client/src/components/`)
- **WhiteLabelRouter**: Main routing component
- **WhiteLabelClients**: Client listing and management
- **WhiteLabelManagement**: Branding configuration interface
- **useBranding**: React hook for branding context

## Setup Instructions

### 1. Database Migration
Run the white label migration:
```bash
# Apply the migration
npm run migrate

# Or manually run the SQL file
psql -d your_database -f migrations/0002_white_label_multi_tenant.sql
```

### 2. Environment Variables
Add these to your `.env` file:
```env
# JWT secret for tenant authentication
JWT_SECRET=your-secure-jwt-secret

# Default admin client ID (optional)
DEFAULT_CLIENT_ID=your-default-client-uuid

# Domain configuration
PLATFORM_DOMAIN=ccl3-platform.com
```

### 3. Frontend Integration
Wrap your app with the branding provider:
```tsx
import { BrandingProvider } from './hooks/useBranding';

function App() {
  return (
    <BrandingProvider>
      {/* Your app components */}
      <WhiteLabelRouter />
    </BrandingProvider>
  );
}
```

## Usage Guide

### Creating a New White Label Client

1. **Via API**:
```bash
curl -X POST https://your-api.com/api/clients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "domain": "acme.com", 
    "brandingConfig": {
      "companyName": "Acme Corp",
      "primaryColor": "#ff6b35",
      "secondaryColor": "#f7931e",
      "emailFromName": "Acme Support",
      "supportEmail": "support@acme.com",
      "logoUrl": "https://acme.com/logo.png"
    },
    "plan": "professional"
  }'
```

2. **Via Frontend**:
   - Navigate to the White Label management interface
   - Click "Create Client"
   - Fill in branding configuration
   - Save and generate API keys

### Configuring Custom Domains

1. **DNS Setup**:
   - Create a CNAME record: `acme.com` → `ccl3-platform.com`
   - Or use a subdomain: `platform.acme.com` → `ccl3-platform.com`

2. **SSL Configuration**:
   - Use a wildcard certificate for `*.ccl3-platform.com`
   - Or configure individual certificates per domain

3. **Update Client Record**:
```sql
UPDATE clients 
SET domain = 'acme.com' 
WHERE id = 'client-uuid';
```

### API Key Management

Generate API keys for programmatic access:
```bash
curl -X POST https://your-api.com/api/clients/{clientId}/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "Production API Key",
    "permissions": ["read", "write"]
  }'
```

### Branding Configuration

The branding system supports:
- **Colors**: Primary and secondary brand colors
- **Logo**: Custom logo URL
- **Company info**: Name, support email, website
- **Custom CSS**: Advanced styling overrides
- **Favicon**: Custom favicon URL

## Security Considerations

### 1. Tenant Isolation
- All database queries are automatically scoped by `client_id`
- Middleware validates resource ownership
- API keys are bound to specific clients

### 2. Data Protection
- Sensitive data is encrypted at rest
- API keys are hashed and salted
- JWT tokens include client context

### 3. Access Control
- Role-based permissions within tenants
- Admin vs. user access levels
- API key permission scoping

## Monitoring & Analytics

### 1. Usage Tracking
```sql
-- Track API usage by client
SELECT 
  c.name,
  COUNT(*) as api_calls,
  DATE_TRUNC('day', created_at) as date
FROM api_logs al
JOIN clients c ON al.client_id = c.id
GROUP BY c.name, DATE_TRUNC('day', created_at);
```

### 2. Performance Monitoring
- Monitor response times by tenant
- Track resource usage per client
- Alert on abnormal usage patterns

## Customization Examples

### 1. Custom CSS
```css
/* Example custom CSS for a client */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-primary {
  background-color: var(--brand-primary-color);
  border-color: var(--brand-primary-color);
}

.logo {
  max-height: 40px;
}
```

### 2. Email Templates
Email templates automatically use client branding:
```html
<div style="color: {{brandingConfig.primaryColor}}">
  <h1>Welcome to {{brandingConfig.companyName}}</h1>
  <p>Thanks for joining {{brandingConfig.companyName}}!</p>
  <footer>
    <p>{{brandingConfig.supportEmail}}</p>
  </footer>
</div>
```

## Troubleshooting

### Common Issues

1. **Domain not resolving**:
   - Check DNS CNAME record
   - Verify SSL certificate
   - Ensure domain is added to client record

2. **Branding not loading**:
   - Check `/api/branding?domain=example.com` endpoint
   - Verify client is active
   - Check browser console for errors

3. **Permission denied errors**:
   - Verify JWT token includes client context
   - Check API key permissions
   - Ensure user belongs to the client

### Debug Commands
```bash
# Check client configuration
curl https://your-api.com/api/clients/{clientId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test branding endpoint
curl https://your-api.com/api/branding?domain=acme.com

# Verify tenant middleware
curl https://your-api.com/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Client-ID: client-uuid"
```

## Best Practices

1. **Security**:
   - Rotate API keys regularly
   - Use HTTPS for all custom domains
   - Implement rate limiting per client

2. **Performance**:
   - Cache branding configurations
   - Optimize database queries with proper indexes
   - Use CDN for static assets (logos, CSS)

3. **Maintenance**:
   - Regular backups of client configurations
   - Monitor resource usage per tenant
   - Keep white label documentation updated

## Future Enhancements

- **Advanced theming**: Support for multiple theme variants
- **Custom domains**: Automated SSL certificate management
- **White label mobile**: Branded mobile app configurations
- **Analytics dashboard**: Per-client usage and performance metrics
- **Marketplace**: Allow clients to install additional features
