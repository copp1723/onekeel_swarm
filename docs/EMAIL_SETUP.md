# Email Setup Guide

This guide will help you configure and test email functionality in OneKeel Swarm.

## Prerequisites

1. A Mailgun account (sign up at https://www.mailgun.com)
2. A verified domain in Mailgun
3. Your Mailgun API key

## Configuration Steps

### 1. Get Your Mailgun Credentials

1. Log in to your [Mailgun Dashboard](https://app.mailgun.com/app/dashboard)
2. Navigate to **Sending** → **Domain settings**
3. Copy your domain name (e.g., `mail.yourdomain.com`)
4. Go to **Settings** → **API Keys**
5. Copy your **Private API Key**

### 2. Configure Environment Variables

Add these to your `.env` file:

```bash
# Email Services (Mailgun)
MAILGUN_API_KEY=your-private-api-key-here
MAILGUN_DOMAIN=mail.yourdomain.com
MAIL_FROM=support@yourdomain.com
```

### 3. Verify Your Domain (if not already done)

1. In Mailgun, go to **Sending** → **Domains**
2. Click **Add New Domain**
3. Follow the DNS verification steps provided by Mailgun
4. Wait for DNS propagation (can take up to 48 hours)

## Testing Email Functionality

### Using the UI

1. Navigate to **Intelligence Hub** in the application
2. Click on the **Email Settings** tab
3. Use the Email Test Suite to send test emails:
   - **Simple Test**: Basic connectivity test
   - **Template Test**: Tests variable replacement
   - **Campaign Test**: Sample marketing email

### Using the API

Send a test email via API:

```bash
curl -X POST http://localhost:5000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "to": "test@example.com",
    "type": "simple"
  }'
```

### Available Test Types

1. **Simple** - Basic test email to verify configuration
2. **Template** - Tests variable replacement with `{{firstName}}`, `{{lastName}}`, etc.
3. **Campaign** - Sample campaign-style email with HTML formatting and CTA

## Sending Emails Programmatically

### Send a Single Email

```javascript
// POST /api/email/send
{
  "to": "recipient@example.com",
  "subject": "Your Subject Here",
  "html": "<h1>Hello World</h1>",
  "text": "Plain text version"
}
```

### Send with Template Variables

```javascript
// POST /api/email/send
{
  "to": "john@example.com",
  "subject": "Welcome {{firstName}}!",
  "html": "<h1>Hi {{firstName}} {{lastName}}</h1>",
  "variables": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## Troubleshooting

### Common Issues

1. **"Email service is not properly configured"**
   - Check that `MAILGUN_API_KEY` and `MAILGUN_DOMAIN` are set in `.env`
   - Restart your server after updating environment variables

2. **"Failed to send email"**
   - Verify your Mailgun API key is correct
   - Check that your domain is verified in Mailgun
   - Ensure you're not hitting rate limits

3. **Emails not being delivered**
   - Check Mailgun logs in the dashboard
   - Verify recipient email addresses are valid
   - Check spam folders
   - Ensure your domain has proper SPF/DKIM records

### Checking Email Service Status

The test panel will show:
- Whether the service is configured
- The configured domain
- If the API key is present

## Webhook Configuration

To track email events (opens, clicks, bounces):

1. Go to Mailgun Dashboard → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/email/webhooks/mailgun`
3. Select events to track:
   - Delivered
   - Opened
   - Clicked
   - Failed
   - Complained
   - Unsubscribed

## Production Considerations

1. **Rate Limits**: Mailgun has rate limits based on your plan
2. **Domain Reputation**: Monitor your domain reputation in Mailgun
3. **Bounce Handling**: Implement proper bounce handling
4. **Unsubscribe Links**: Always include unsubscribe links in marketing emails
5. **SPF/DKIM**: Ensure proper email authentication is configured

## Support

For Mailgun-specific issues, refer to the [Mailgun Documentation](https://documentation.mailgun.com/).

For application-specific issues, check the server logs or contact your system administrator.