# Outbound Email Watchdog 🚫📧

The Outbound Email Watchdog is a security system that **blocks or controls emails before they are sent** to prevent spam, protect your reputation, and ensure compliance.

## 🎯 What It Does

### **BLOCKS Emails Before Sending**
- ❌ **Blocked domains** (spam.com, tempmail.org, etc.)
- ❌ **Blocked email addresses** (specific blacklisted emails)
- ❌ **Forbidden content** (spam words, suspicious patterns)
- ❌ **Volume limits** (too many emails per hour/day)
- ❌ **Time restrictions** (outside business hours)

### **QUARANTINES Suspicious Emails**
- 🔒 **High-risk emails** held for review
- 🔍 **Manual approval** required before sending
- 📊 **Risk scoring** (0-100 scale)

### **MONITORS All Outbound Traffic**
- 📈 **Real-time metrics** (emails blocked, sent, quarantined)
- 🚨 **Admin notifications** for policy violations
- 📝 **Detailed logging** of all decisions

## 🚀 Quick Start

### 1. **Enable the Watchdog**
```bash
# In your .env file
OUTBOUND_EMAIL_ENABLED=true
EMAIL_WATCHDOG_ENABLED=true
MAX_EMAILS_PER_HOUR=100
MAX_EMAILS_PER_DAY=500
EMAIL_BLOCKED_DOMAINS=spam.com,tempmail.org
```

### 2. **Test Email Validation**
```bash
POST /api/email-watchdog/test
{
  "to": "test@spam.com",
  "subject": "Test Email",
  "html": "<p>Hello World</p>"
}
```

### 3. **View Blocked Emails**
```bash
GET /api/email-watchdog/quarantine
GET /api/email-watchdog/pending-approval
```

## 📋 API Endpoints

### **Block Rules Management**
- `GET /api/email-watchdog/rules` - Get all block rules
- `POST /api/email-watchdog/rules` - Add/update block rule
- `DELETE /api/email-watchdog/rules/:ruleId` - Remove block rule

### **Email Queue Management**
- `GET /api/email-watchdog/quarantine` - Get quarantined emails
- `GET /api/email-watchdog/pending-approval` - Get emails pending approval
- `POST /api/email-watchdog/approve/:emailId` - Approve an email
- `POST /api/email-watchdog/block/:emailId` - Permanently block an email

### **Testing & Validation**
- `POST /api/email-watchdog/test` - Test email validation without sending

## 🛡️ Default Block Rules

### **1. Blocked Domains** (Priority: 100)
- Blocks emails to known spam domains
- **Action**: Block immediately
- **Examples**: spam.com, tempmail.org, guerrillamail.com

### **2. Volume Limits** (Priority: 80)
- Prevents email flooding
- **Limits**: 100/hour, 500/day
- **Action**: Quarantine for approval

### **3. Business Hours** (Priority: 60)
- Only allows emails during business hours
- **Hours**: 8 AM - 6 PM, Monday-Friday
- **Action**: Quarantine until business hours

### **4. Forbidden Content** (Priority: 90)
- Blocks emails with spam words
- **Words**: spam, scam, urgent, act now, limited time
- **Action**: Require approval

## 🔧 Configuration Options

### **Block Rule Structure**
```typescript
{
  id: "unique-rule-id",
  name: "Human Readable Name",
  enabled: true,
  priority: 90, // Higher = checked first
  conditions: {
    blockedDomains: ["spam.com"],
    blockedEmails: ["bad@example.com"],
    forbiddenWords: ["spam", "scam"],
    maxEmailsPerHour: 100,
    maxEmailsPerDay: 500,
    allowedHours: { start: 8, end: 18 },
    allowedDays: [1,2,3,4,5] // Mon-Fri
  },
  actions: {
    block: true,           // Block immediately
    quarantine: false,     // Hold for review
    requireApproval: false, // Need manual approval
    notifyAdmin: true,     // Send admin notification
    logOnly: false         // Just log, don't block
  }
}
```

### **Environment Variables**
```bash
# Core Settings
OUTBOUND_EMAIL_ENABLED=true
EMAIL_WATCHDOG_ENABLED=true

# Volume Limits
MAX_EMAILS_PER_HOUR=100
MAX_EMAILS_PER_DAY=500

# Security
EMAIL_BLOCKED_DOMAINS=spam.com,tempmail.org
EMAIL_BLOCKED_EMAILS=bad@example.com
REQUIRE_APPROVAL_HIGH_RISK=false

# Content Filtering
EMAIL_MAX_ATTACHMENT_SIZE=10485760  # 10MB
EMAIL_SANITIZE_CONTENT=true
```

## 📊 How It Works

### **Email Sending Flow**
```
1. 📧 Email created by campaign/user
2. 🔍 Watchdog validates email
3. ✅ Allowed → Send immediately
4. ❌ Blocked → Return error
5. 🔒 Quarantined → Hold for approval
6. 📝 Log all decisions
```

### **Risk Scoring**
- **0-25**: Low risk (send normally)
- **26-50**: Medium risk (log warning)
- **51-75**: High risk (require approval)
- **76-100**: Critical risk (block)

### **Rule Priority**
Rules are processed in priority order (highest first). Once a blocking rule triggers, processing stops.

## 🚨 Admin Notifications

When emails are blocked or quarantined, admins receive notifications with:
- **Email details** (to, subject, content preview)
- **Rule triggered** (which rule caused the action)
- **Risk score** (0-100)
- **Recommended action** (approve, block, modify rule)

## 🔍 Monitoring & Metrics

The watchdog tracks:
- **Emails processed** (total count)
- **Emails blocked** (by rule)
- **Emails quarantined** (pending approval)
- **Risk score distribution** (low/medium/high)
- **Rule effectiveness** (which rules trigger most)

## 🛠️ Troubleshooting

### **Emails Not Being Blocked**
1. Check if watchdog is enabled: `EMAIL_WATCHDOG_ENABLED=true`
2. Verify rules are active: `GET /api/email-watchdog/rules`
3. Test validation: `POST /api/email-watchdog/test`

### **Too Many Emails Blocked**
1. Review rule priorities and conditions
2. Adjust volume limits in environment variables
3. Add exceptions for trusted domains

### **Performance Issues**
1. Reduce number of active rules
2. Optimize rule conditions (avoid complex regex)
3. Monitor rule processing time in logs

## 🔐 Security Benefits

- **Prevents spam** from your domain
- **Protects reputation** with email providers
- **Ensures compliance** with email regulations
- **Reduces bounce rates** from bad addresses
- **Provides audit trail** for all email decisions

---

**🎯 Result**: Your OneKeel Swarm system now has a robust outbound email watchdog that blocks problematic emails before they damage your reputation!
