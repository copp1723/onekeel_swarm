# OneKeel Swarm - User Testing Onboarding Guide

Welcome to OneKeel Swarm beta testing! This guide will help you get started and provide valuable feedback on our AI-powered multi-agent system.

## Getting Started

### System Access
- **Frontend URL**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **System Requirements**: Modern web browser (Chrome, Firefox, Safari, Edge)

### Initial Login Process
1. Navigate to the frontend URL in your browser
2. Use the credentials provided by your administrator
3. Complete the initial login process
4. Update your profile information if needed

### Account Setup Steps
1. **Profile Completion**: Add your name, email, and contact information
2. **Password Update**: Change from temporary password to secure personal password
3. **Notification Preferences**: Configure email and system notifications
4. **Dashboard Familiarization**: Take the guided tour when prompted

## User Roles & Permissions

### Admin Role
**Access Level**: Full system access
- Create and manage all users
- Configure system settings and feature flags
- Access all campaigns, leads, and analytics
- Manage agent configurations and templates
- View audit logs and system monitoring
- Export all data and reports

### Manager Role
**Access Level**: Team and campaign management
- Create and manage campaigns
- Assign agents to campaigns
- View team performance analytics
- Manage leads within assigned campaigns
- Configure email templates
- Access reporting dashboards
- Limited user management (view only)

### Agent Role
**Access Level**: Campaign execution and lead management
- Execute assigned campaigns
- Manage assigned leads
- Access campaign-specific analytics
- Use email and chat interfaces
- View assigned templates
- Update lead status and notes
- Limited reporting access

### Viewer Role
**Access Level**: Read-only access
- View dashboard and basic analytics
- See campaign results (assigned only)
- Access lead information (limited)
- View templates (read-only)
- No editing or creation capabilities

## Key Features to Test

### 1. Campaign Creation and Management
**Location**: Campaigns tab → New Campaign

**Test Scenarios**:
- Create a new drip campaign with multiple steps
- Set up trigger-based campaigns
- Configure campaign targeting criteria
- Schedule campaign start/end dates
- Test campaign activation/deactivation

**What to Look For**:
- Intuitive campaign wizard flow
- Clear validation messages
- Proper saving and loading of settings
- Responsive interface on different screen sizes

### 2. Lead Management
**Location**: Leads tab

**Test Scenarios**:
- Manual lead creation
- CSV import functionality (use provided sample files)
- Lead qualification scoring
- Status updates and assignment
- Lead notes and communication history

**What to Look For**:
- Bulk operations efficiency
- Search and filtering capabilities
- Data validation and error handling
- Export functionality

### 3. Email Templates
**Location**: Templates tab → Email Templates

**Test Scenarios**:
- Create new email templates
- Use variable placeholders ({{firstName}}, {{company}}, etc.)
- Preview templates with sample data
- Template categorization and tagging
- Clone existing templates

**What to Look For**:
- Rich text editor functionality
- Variable insertion helpers
- Preview accuracy
- Template organization features

### 4. Agent Configuration
**Location**: Agents tab → Agent Management

**Test Scenarios**:
- Create custom AI agents with different personalities
- Configure agent response settings
- Test agent templates and customization
- Agent assignment to campaigns
- Monitor agent performance metrics

**What to Look For**:
- Configuration complexity vs. usability
- Agent response quality and consistency
- Performance monitoring clarity
- Template library usefulness

### 5. Dashboard and Analytics
**Location**: Dashboard tab

**Test Scenarios**:
- Real-time metric updates
- Campaign performance tracking
- Lead conversion funnel analysis
- Agent efficiency metrics
- Custom date range filtering

**What to Look For**:
- Data accuracy and refresh rates
- Visual clarity of charts and graphs
- Mobile responsiveness
- Export and sharing capabilities

## Testing Guidelines

### What Feedback to Provide

**Usability Issues**:
- Confusing interface elements
- Unclear instructions or labels
- Difficult navigation flows
- Performance or loading issues

**Feature Requests**:
- Missing functionality you expected
- Workflow improvements
- Integration suggestions
- Automation opportunities

**Data & Logic Issues**:
- Incorrect calculations or metrics
- Data not saving or loading properly
- Agent behavior inconsistencies
- Campaign execution problems

### How to Report Issues

**Method 1: Built-in Feedback**
- Use the feedback button in the bottom-right corner
- Select issue category and priority
- Include screenshots when possible
- Provide step-by-step reproduction steps

**Method 2: Email Reports**
Send detailed reports to: `testing@onekeel.com`

**Include**:
- Your role and login credentials
- Browser and OS information
- Detailed steps to reproduce
- Expected vs. actual behavior
- Screenshots or screen recordings
- Timestamp of when issue occurred

### Expected System Behavior

**Performance Standards**:
- Page loads under 3 seconds
- Real-time updates within 5 seconds
- Bulk operations progress indicators
- Graceful error handling with clear messages

**Data Integrity**:
- All changes saved automatically or with clear save confirmation
- No data loss during navigation
- Consistent data across different views
- Accurate audit trails for changes

**Security Features**:
- Session timeout warnings
- Role-based access enforcement
- Secure password requirements
- Activity logging for sensitive operations

## Admin Setup Guide

### Creating New Test Users

**Step 1: Access User Management**
1. Navigate to Admin panel → Users
2. Click "Add New User" button

**Step 2: User Configuration**
```
Email: testuser@company.com
Username: unique_username
First Name: Test
Last Name: User
Role: [Select appropriate role]
Temporary Password: [System generated]
Active: Yes
```

**Step 3: Initial Setup**
- Send credentials via secure channel
- Require password change on first login
- Assign to appropriate test campaigns

### Role Assignment Process

**Role Assignment Matrix**:
- **Testers new to the system**: Start with Viewer role
- **Functional testers**: Agent or Manager role
- **Technical testers**: Admin role for full access
- **Security testers**: Admin role with audit access

**Best Practices**:
- Create test users for each role type
- Use realistic names and scenarios
- Document user credentials securely
- Rotate test data regularly

### System Monitoring Basics

**Health Checks**:
- Monitor system uptime and response times
- Check database connection status
- Verify external service integrations (email, SMS)
- Review error logs for critical issues

**User Activity Monitoring**:
- Track login attempts and session duration
- Monitor feature usage patterns
- Review feedback submissions
- Check for security anomalies

**Performance Metrics**:
- Page load times and API response speeds
- Database query performance
- Memory and CPU usage trends
- External service dependency status

## Test Data and Scenarios

### Sample Lead Data
```csv
firstName,lastName,email,phone,source,company
John,Smith,john.smith@email.com,555-123-4567,website,Acme Corp
Jane,Doe,jane.doe@email.com,555-987-6543,referral,Beta Inc
Mike,Johnson,mike.j@email.com,555-456-7890,social,Gamma LLC
```

### Test Campaign Scenarios
1. **Welcome Series**: 3-step email sequence for new leads
2. **Re-engagement**: Target inactive leads from last 30 days
3. **Product Demo**: Schedule and follow-up automation
4. **Support Follow-up**: Post-interaction satisfaction survey

### Common Test Workflows
1. Lead import → Campaign assignment → Email sequence → Conversion tracking
2. Manual lead creation → Agent interaction → Qualification → Handoff
3. Chat widget interaction → Lead capture → Agent assignment → Follow-up
4. Bulk campaign launch → Performance monitoring → Optimization

## Support and Resources

**Getting Help**:
- In-app help documentation
- Video tutorials (available in Help section)
- Live chat support during testing hours (9 AM - 5 PM EST)
- Weekly testing feedback sessions (Fridays 3 PM EST)

**Additional Resources**:
- Technical documentation: `/docs` folder
- API reference: `API_REFERENCE.md`
- FAQ and troubleshooting: Help section
- Best practices guide: Coming soon

## Next Steps After Testing

1. **Feedback Review**: We'll process your feedback within 48 hours
2. **Follow-up Questions**: Expect clarification requests via email
3. **Feature Updates**: Receive notifications about improvements
4. **Production Readiness**: Participate in final acceptance testing
5. **Launch Preparation**: Training on production environment

---

**Thank you for participating in OneKeel Swarm beta testing!**

Your feedback is crucial for creating a system that truly serves your needs. Don't hesitate to reach out with questions or suggestions.

**Testing Period**: [Insert dates]
**Feedback Deadline**: [Insert deadline]
**Contact**: testing@onekeel.com