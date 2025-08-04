# Email Watchdog Implementation Guide

## Overview

This is a **strict email validation system** designed to block typos and invalid emails BEFORE they enter your campaign system. The philosophy is: **Better to be too strict than inflate numbers with bad emails**.

## Features

### 1. **Typo Detection & Correction**
Catches common email typos:
- `gmial.com` → `gmail.com`
- `yahooo.com` → `yahoo.com`
- `hotmial.com` → `hotmail.com`
- `gmail.co` → `gmail.com`
- And 40+ more common typos

### 2. **Strict Format Validation**
- Proper email structure
- No consecutive dots
- Valid domain with TLD
- No test/fake patterns

### 3. **Blocks By Default**
- ❌ Disposable emails (10minutemail, etc.)
- ❌ Role emails (info@, support@, admin@)
- ❌ Test emails (test123@, asdf@)
- ❌ Single character usernames
- ❌ All-number usernames

## Quick Integration

### 1. Add Email Validation Route
```typescript
// server/routes/index.ts
import emailValidationRoutes from './email-validation';

router.use('/email', emailValidationRoutes);
```

### 2. Update Your Email Service
Replace current email service usage:
```typescript
// OLD
import { mailgunService } from './services/email/mailgun';

// NEW - with watchdog protection
import { mailgunServiceWithWatchdog } from './services/email/mailgun-with-watchdog';
```

### 3. Test the Validation
```bash
# Test single email
curl -X POST http://localhost:5000/api/email/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@gmial.com"}'

# Response:
{
  "success": false,
  "email": "user@gmial.com",
  "isValid": false,
  "reason": "Possible typo in domain: gmial.com",
  "suggestion": "user@gmail.com",
  "confidence": "high"
}
```

## API Endpoints

### 1. **Validate Single Email**
```http
POST /api/email/validate
{
  "email": "user@example.com"
}
```

### 2. **Validate Batch**
```http
POST /api/email/validate-batch
{
  "emails": ["email1@gmail.com", "email2@yahoo.com", ...]
}
```

### 3. **Pre-Validate Campaign**
```http
POST /api/email/pre-validate-campaign
{
  "campaignId": "camp_123",
  "emails": ["email1@gmail.com", "email2@yahoo.com", ...]
}
```

Response includes:
- Valid emails list
- Invalid emails with reasons
- Typo suggestions
- Summary statistics

### 4. **Get Corrections**
```http
POST /api/email/suggest-corrections
{
  "emails": ["user@gmial.com", "admin@yahooo.com"]
}

Response:
{
  "success": true,
  "corrections": {
    "user@gmial.com": "user@gmail.com",
    "admin@yahooo.com": "admin@yahoo.com"
  },
  "count": 2
}
```

## Usage in Campaigns

### Before Sending Campaign
```typescript
// In your campaign service
async function startCampaign(campaignId: string, leads: Lead[]) {
  // Extract emails
  const emails = leads.map(lead => lead.email);
  
  // Pre-validate
  const validation = await mailgunServiceWithWatchdog.preValidateCampaignList(emails);
  
  // Handle validation results
  if (validation.summary.blocked > 0) {
    logger.warn(`Campaign ${campaignId}: ${validation.summary.blocked} emails blocked`);
    
    // Option 1: Strict mode - don't send campaign
    if (validation.summary.blocked > emails.length * 0.1) { // >10% invalid
      throw new Error(`Too many invalid emails: ${validation.summary.blocked}/${emails.length}`);
    }
    
    // Option 2: Send only to valid emails
    const validLeads = leads.filter(lead => 
      validation.valid.includes(lead.email)
    );
    
    // Log invalid emails for review
    await logInvalidEmails(campaignId, validation.invalid);
    
    // Proceed with valid emails only
    return sendToValidLeads(campaignId, validLeads);
  }
  
  // All emails valid, proceed normally
  return sendToAllLeads(campaignId, leads);
}
```

### In Lead Import
```typescript
// When importing CSV or adding leads
async function importLeads(csvData: any[]) {
  const results = {
    imported: 0,
    rejected: 0,
    corrected: 0
  };
  
  for (const row of csvData) {
    const validation = await emailWatchdog.validateEmail(row.email);
    
    if (!validation.isValid) {
      // Check if we have a suggestion
      if (validation.suggestion) {
        // Option 1: Auto-correct (risky)
        row.email = validation.suggestion;
        results.corrected++;
        
        // Option 2: Flag for manual review (safer)
        await flagForReview(row, validation.reason, validation.suggestion);
        results.rejected++;
        continue;
      } else {
        // No suggestion, reject
        await logRejectedLead(row, validation.reason);
        results.rejected++;
        continue;
      }
    }
    
    // Valid email, import
    await createLead(row);
    results.imported++;
  }
  
  return results;
}
```

## Configuration Options

### Adjust Strictness
```typescript
// For specific use cases, you can adjust validation
const validation = await emailWatchdog.validateEmail(email, {
  allowRoleEmails: true,    // Allow info@, support@, etc.
  allowDisposable: false,   // Still block temporary emails
  autoCorrect: true         // Provide suggestions
});
```

### Bulk Operations
```typescript
// Clean an entire list
const emails = await getEmailsFromDatabase();
const validation = await emailWatchdog.validateBatch(emails);

console.log(`
  Total: ${validation.summary.total}
  Valid: ${validation.summary.valid}
  Typos: ${validation.summary.typos}
  Disposable: ${validation.summary.disposable}
  Role Emails: ${validation.summary.roleEmails}
`);

// Export results
await exportValidationReport(validation);
```

## Client Communication

When emails are rejected, communicate clearly:

```typescript
// Example rejection messages
const rejectionMessages = {
  typo: "We noticed a possible typo in the email address. Did you mean {suggestion}?",
  disposable: "Temporary email addresses are not accepted. Please use a permanent email.",
  role: "Generic email addresses (like info@ or support@) are not accepted. Please use a personal email.",
  format: "The email address format is invalid. Please check and try again.",
  test: "This appears to be a test email. Please provide a real email address."
};
```

## Monitoring & Metrics

Track validation effectiveness:
```typescript
// Log validation metrics
async function trackValidationMetrics(validation: ValidationResult) {
  await metrics.increment('email.validation.total');
  
  if (!validation.isValid) {
    await metrics.increment('email.validation.blocked');
    await metrics.increment(`email.validation.blocked.${validation.reason}`);
    
    if (validation.suggestion) {
      await metrics.increment('email.validation.typos_detected');
    }
  }
}
```

## Best Practices

1. **Pre-validate Before Campaigns**
   - Always validate email lists before sending
   - Set a threshold for acceptable invalid rate (e.g., <5%)

2. **Log Everything**
   - Keep records of blocked emails
   - Track typo corrections
   - Monitor false positives

3. **Review Periodically**
   - Check blocked emails monthly
   - Update typo dictionary
   - Adjust rules based on data

4. **Communicate with Users**
   - Clear error messages
   - Offer corrections when possible
   - Explain why emails are blocked

## Testing

Test the watchdog with known bad emails:
```bash
# Run validation test
curl -X GET http://localhost:5000/api/email/test-validation \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This will validate a set of test emails and show you exactly what gets blocked and why.

## ROI Tracking

Monitor the impact:
- **Before**: Track bounce rate, complaint rate
- **After**: Compare improvement
- **Savings**: Calculate cost saved from not sending to bad emails
- **Quality**: Monitor engagement rates of validated vs. non-validated

Remember: **It's better to have a smaller, high-quality list than a large list full of bad emails**.