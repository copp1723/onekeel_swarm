# User Role Permissions Matrix

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

```typescript
// Permission middleware
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role;
    const hasPermission = checkPermission(userRole, resource, action);
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: `${resource}:${action}`,
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
```

### Permission Checking Function

```typescript
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
```

## Custom Role Creation

For enterprise clients, custom roles can be created:

```typescript
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
```

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
