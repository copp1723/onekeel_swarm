// Email Injection Prevention for email-conversation-manager.ts

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Email validation schema
const emailReplySchema = z.object({
  from: z.string().email().max(255),
  to: z.string().email().max(255),
  subject: z.string().max(998), // RFC 2822 limit
  body: z.string().max(1000000), // 1MB limit
  messageId: z.string().max(255),
  inReplyTo: z.string().max(255).optional(),
  references: z.array(z.string().max(255)).optional()
});

// Sanitize email headers to prevent injection
function sanitizeEmailHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    // Remove any newline characters that could be used for header injection
    sanitized[key] = value
      .replace(/[\r\n]/g, ' ')
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
      .trim();
  }
  
  return sanitized;
}

// Sanitize email content
function sanitizeEmailContent(content: string): string {
  // First, sanitize HTML to prevent XSS
  const cleanHtml = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false
  });
  
  // Then remove any potential email injection patterns
  return cleanHtml
    .replace(/^\.+/gm, '.') // Prevent SMTP command injection
    .replace(/^\s*$/gm, '') // Remove empty lines
    .trim();
}

// Updated processEmailReply method with security measures
async processEmailReply(replyData: EmailReply): Promise<void> {
  try {
    // 1. Validate input data
    const validationResult = emailReplySchema.safeParse(replyData);
    if (!validationResult.success) {
      logger.error('Invalid email reply data', { 
        errors: validationResult.error.errors,
        from: replyData.from 
      });
      return;
    }
    
    const validatedData = validationResult.data;
    
    // 2. Sanitize headers
    const sanitizedHeaders = sanitizeEmailHeaders({
      from: validatedData.from,
      to: validatedData.to,
      subject: validatedData.subject,
      messageId: validatedData.messageId,
      inReplyTo: validatedData.inReplyTo || ''
    });
    
    // 3. Check for suspicious patterns
    if (this.detectSuspiciousEmailPatterns(validatedData)) {
      logger.warn('Suspicious email pattern detected', {
        from: validatedData.from,
        subject: validatedData.subject
      });
      // Optionally quarantine or flag the email
      await this.quarantineEmail(validatedData);
      return;
    }
    
    // 4. Sanitize email content
    const sanitizedContent = sanitizeEmailContent(validatedData.body);
    
    // Continue with existing logic using sanitized data...
    const lead = await this.findLeadByEmail(sanitizedHeaders.from);
    // ... rest of the method
  } catch (error) {
    logger.error('Error processing email reply', { error });
  }
}

// Detect suspicious email patterns
private detectSuspiciousEmailPatterns(email: any): boolean {
  const suspiciousPatterns = [
    /^HELO\s/i,
    /^MAIL FROM:/i,
    /^RCPT TO:/i,
    /^DATA\s/i,
    /^QUIT\s/i,
    /\r\n\.\r\n/, // SMTP end-of-data marker
    /<script[\s\S]*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i // Event handlers
  ];
  
  const content = `${email.subject} ${email.body}`;
  return suspiciousPatterns.some(pattern => pattern.test(content));
}

// Rate limiting for email processing
const emailRateLimiter = new Map<string, { count: number; resetTime: number }>();

private async checkEmailRateLimit(email: string): Promise<boolean> {
  const now = Date.now();
  const limit = 50; // Max 50 emails per hour per sender
  const window = 3600000; // 1 hour
  
  const record = emailRateLimiter.get(email);
  
  if (!record || now > record.resetTime) {
    emailRateLimiter.set(email, {
      count: 1,
      resetTime: now + window
    });
    return true;
  }
  
  if (record.count >= limit) {
    logger.warn('Email rate limit exceeded', { email, count: record.count });
    return false;
  }
  
  record.count++;
  return true;
}