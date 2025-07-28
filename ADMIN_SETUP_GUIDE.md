# OneKeel Swarm - Admin Setup Guide

Comprehensive guide for administrators setting up and managing the OneKeel Swarm beta testing environment.

## Pre-Testing Setup Checklist

### System Prerequisites
- [ ] PostgreSQL database running and accessible
- [ ] Redis server for session management
- [ ] Node.js 18+ and npm installed
- [ ] Environment variables configured
- [ ] External services configured (Mailgun, Twilio, OpenAI)
- [ ] SSL certificates (if using HTTPS)

### Database Setup
```bash
# Create database and apply migrations
npm run db:setup
npm run db:migrate

# Seed with initial data
npm run db:seed

# Create admin user
npm run create-admin
```

### Environment Configuration
```env
# Core Settings
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/swarm_db

# Authentication
JWT_SECRET=your-secure-jwt-secret-here
SESSION_SECRET=your-secure-session-secret-here
BCRYPT_ROUNDS=12

# Feature Flags
ENABLE_CHAT_WIDGET=true
ENABLE_SMS_CAMPAIGNS=true
ENABLE_ADVANCED_ANALYTICS=true

# External Services
OPENAI_API_KEY=sk-your-openai-key
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=yourdomain.mailgun.org
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Monitoring
LOG_LEVEL=info
ENABLE_AUDIT_LOGS=true
ENABLE_PERFORMANCE_MONITORING=true
```

## User Management

### Creating Test Users

**Method 1: Admin Interface**
1. Login as admin
2. Navigate to Admin → User Management
3. Click "Create User"
4. Fill required information:
   ```
   Email: testuser@example.com
   Username: testuser
   First Name: Test
   Last Name: User
   Role: agent|manager|viewer|admin
   Generate Password: Yes
   Send Welcome Email: Yes
   ```

**Method 2: Command Line**
```bash
# Create single user
npm run create-user -- --email="test@example.com" --role="agent" --name="Test User"

# Bulk create from CSV
npm run bulk-create-users -- --file="test-users.csv"
```

**Method 3: Database Script**
```sql
INSERT INTO users (email, username, password_hash, first_name, last_name, role, active)
VALUES 
  ('admin@test.com', 'admin', '$2b$12$hash_here', 'Admin', 'User', 'admin', true),
  ('manager@test.com', 'manager', '$2b$12$hash_here', 'Manager', 'User', 'manager', true),
  ('agent@test.com', 'agent', '$2b$12$hash_here', 'Agent', 'User', 'agent', true),
  ('viewer@test.com', 'viewer', '$2b$12$hash_here', 'Viewer', 'User', 'viewer', true);
```

### Role-Based Test Accounts

**Admin Test Account**
- **Purpose**: Full system testing, configuration management
- **Username**: `admin_tester`
- **Permissions**: All features, user management, system configuration
- **Test Focus**: System administration, security, user management

**Manager Test Account**
- **Purpose**: Campaign and team management testing
- **Username**: `manager_tester`
- **Permissions**: Campaign CRUD, team oversight, reporting
- **Test Focus**: Campaign workflows, team coordination, analytics

**Agent Test Account**
- **Purpose**: Day-to-day operation testing
- **Username**: `agent_tester`
- **Permissions**: Lead management, campaign execution, limited analytics
- **Test Focus**: User experience, efficiency, agent workflows

**Viewer Test Account**
- **Purpose**: Read-only access testing
- **Username**: `viewer_tester`
- **Permissions**: Dashboard view, basic reporting
- **Test Focus**: Information access, dashboard usability

## Test Data Setup

### Sample Campaigns
```bash
# Load sample campaigns
npm run seed:campaigns

# Or create manually via API
curl -X POST http://localhost:5000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Welcome Series Test",
    "description": "3-step welcome campaign for new leads",
    "type": "drip",
    "active": true,
    "settings": {
      "maxSteps": 3,
      "stepDelayHours": 24,
      "autoEnrollment": true
    }
  }'
```

### Sample Lead Data
```bash
# Import test leads
npm run import-leads -- --file="sample-leads.csv"

# Generate random test data
npm run generate-test-data -- --leads=100 --campaigns=5 --agents=3
```

### Email Templates Setup
```bash
# Load default templates
npm run seed:templates

# Verify templates loaded
curl http://localhost:5000/api/templates | jq '.[] | {id, name, channel}'
```

## Feature Flag Configuration

### Essential Feature Flags for Testing
```sql
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, user_roles, environments, category) VALUES
  ('enhanced_dashboard', 'Enhanced Dashboard', 'New dashboard with advanced metrics', true, 100, '["admin", "manager"]', '["development"]', 'ui-progressive'),
  ('multi_agent_campaigns', 'Multi-Agent Campaigns', 'Campaigns with multiple AI agents', true, 50, '["admin", "manager", "agent"]', '["development"]', 'agent-tuning'),
  ('advanced_analytics', 'Advanced Analytics', 'Detailed performance analytics', true, 100, '["admin", "manager"]', '["development"]', 'campaign-advanced'),
  ('chat_widget_v2', 'Chat Widget V2', 'Improved chat widget interface', false, 0, '["admin"]', '["development"]', 'experimental'),
  ('bulk_operations', 'Bulk Operations', 'Bulk lead and campaign operations', true, 100, '["admin", "manager"]', '["development"]', 'system-config');
```

### Managing Feature Flags
```bash
# Enable feature for testing
npm run feature-flag -- --key="chat_widget_v2" --enable

# Set rollout percentage
npm run feature-flag -- --key="multi_agent_campaigns" --rollout=75

# Add user override
npm run feature-flag -- --key="advanced_analytics" --user="agent_tester" --enable
```

## System Monitoring Setup

### Health Check Endpoints
```bash
# System health
curl http://localhost:5000/api/system/health

# Database connectivity
curl http://localhost:5000/api/system/health/database

# External services
curl http://localhost:5000/api/system/health/services

# Feature flags status
curl http://localhost:5000/api/system/health/features
```

### Log Configuration
```javascript
// config/logging.js
module.exports = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  transports: [
    {
      type: 'console',
      colorize: true
    },
    {
      type: 'file',
      filename: 'logs/application.log',
      maxSize: '10m',
      maxFiles: 5
    },
    {
      type: 'file',
      filename: 'logs/error.log',
      level: 'error'
    }
  ]
};
```

### Performance Monitoring
```bash
# Enable performance metrics
export ENABLE_PERFORMANCE_MONITORING=true

# Monitor database queries
export LOG_SLOW_QUERIES=true
export SLOW_QUERY_THRESHOLD=1000

# Monitor API response times
export LOG_API_PERFORMANCE=true
```

## Testing Environment Management

### Database Reset Between Tests
```bash
# Reset database to clean state
npm run db:reset

# Reload test data
npm run db:seed
npm run load-test-data
```

### User Session Management
```bash
# Clear all active sessions
npm run clear-sessions

# Reset specific user
npm run reset-user -- --email="test@example.com"

# Force password reset
npm run force-password-reset -- --email="test@example.com"
```

### Campaign State Management
```bash
# Pause all campaigns
npm run pause-campaigns

# Reset campaign statistics
npm run reset-campaign-stats

# Clear communication history
npm run clear-communications -- --before="2024-01-01"
```

## Security Configuration

### Authentication Settings
```env
# Session configuration
SESSION_TIMEOUT=3600000
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_HTTP_ONLY=true

# Password requirements
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_REQUIRE_NUMBERS=true

# Account lockout
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000
```

### API Security
```env
# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS configuration
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# API key configuration
API_KEY_ROTATION_DAYS=30
API_KEY_LENGTH=32
```

## Troubleshooting Common Issues

### Database Connection Issues
```bash
# Test database connection
npm run test-db-connection

# Check database migrations
npm run db:status

# Reset migrations if needed
npm run db:reset && npm run db:migrate
```

### Authentication Problems
```bash
# Reset JWT secret (will log out all users)
npm run reset-jwt-secret

# Clear all sessions
npm run clear-sessions

# Reset specific user password
npm run reset-password -- --email="user@example.com"
```

### Performance Issues
```bash
# Check slow queries
npm run analyze-slow-queries

# Monitor memory usage
npm run memory-report

# Database performance analysis
npm run db:analyze
```

### External Service Issues
```bash
# Test Mailgun connection
npm run test-mailgun

# Test Twilio connection
npm run test-twilio

# Test OpenAI API
npm run test-openai

# Test all external services
npm run test-services
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
npm run backup:create

# Restore from backup
npm run backup:restore -- --file="backup-2024-01-01.sql"

# Automated daily backups
npm run backup:schedule
```

### Configuration Backup
```bash
# Export configuration
npm run export-config

# Import configuration
npm run import-config -- --file="config-backup.json"
```

## Post-Testing Cleanup

### Data Cleanup
```bash
# Remove test data
npm run cleanup:test-data

# Remove test users
npm run cleanup:test-users

# Reset to production state
npm run prepare:production
```

### Security Cleanup
```bash
# Rotate all API keys
npm run rotate-api-keys

# Clear all test sessions
npm run clear-test-sessions

# Reset admin passwords
npm run reset-admin-passwords
```

## Support and Escalation

### Contact Information
- **Technical Issues**: tech-support@onekeel.com
- **Security Concerns**: security@onekeel.com
- **Testing Coordination**: testing@onekeel.com
- **Emergency**: [Phone number]

### Escalation Procedures
1. **Level 1**: Self-service using this guide
2. **Level 2**: Email technical support with logs
3. **Level 3**: Schedule emergency support call
4. **Level 4**: On-site support (if applicable)

### Required Information for Support
- System environment details
- Error logs and timestamps
- Steps to reproduce issue
- Impact assessment
- Temporary workarounds tried

---

**Remember**: This is a testing environment. Do not use production data or credentials.

**Testing Period**: [Insert dates]
**Admin Contact**: admin@onekeel.com