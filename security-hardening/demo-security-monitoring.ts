/**
 * Security Monitoring Demo
 * Demonstrates the security monitoring system in action
 */

import express from 'express';
import {
  securityMonitor,
  SecurityEventType,
  SecuritySeverity,
} from './security-monitor';
import { RateLimitPresets } from './advanced-rate-limiter';
import { securityHeaders } from './security-headers';

// Create a demo Express app
const app = express();
app.use(express.json());

// Apply security headers
app.use(securityHeaders('strict'));

// Apply security monitoring
app.use(securityMonitor.scanRequest());

// Demo endpoints to test security features
app.get('/test/sql-injection', (req, res) => {
  const search = req.query.search as string;

  // This would trigger SQL injection detection
  if (search) {
    console.log(`Search query: ${search}`);
  }

  res.json({ message: 'SQL injection test endpoint' });
});

app.post('/test/xss', (req, res) => {
  const { content } = req.body;

  // This would trigger XSS detection
  if (content) {
    console.log(`Content: ${content}`);
  }

  res.json({ message: 'XSS test endpoint' });
});

app.post('/test/login', RateLimitPresets.auth.middleware(), (req, res) => {
  const { username, password } = req.body;

  // Simulate failed login
  if (username !== 'valid@example.com' || password !== 'ValidPassword123!') {
    securityMonitor.logEvent(
      SecurityEventType.AUTHENTICATION_FAILURE,
      SecuritySeverity.MEDIUM,
      req,
      { message: `Failed login attempt for ${username}` }
    );

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ message: 'Login successful' });
});

// Security event listeners
securityMonitor.on('security-event', event => {
  console.log('\n🚨 SECURITY EVENT DETECTED:');
  console.log(`Type: ${event.type}`);
  console.log(`Severity: ${event.severity}`);
  console.log(`Source IP: ${event.source.ip}`);
  console.log(`Message: ${event.details.message}`);
  console.log(`Endpoint: ${event.details.endpoint}`);
  console.log('---');
});

securityMonitor.on('ip-blocked', data => {
  console.log('\n🛑 IP BLOCKED:');
  console.log(`IP: ${data.ip}`);
  console.log(`Duration: ${data.duration}ms`);
  console.log(`Time: ${data.timestamp}`);
  console.log('---');
});

// Start the demo server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🔒 Security Monitoring Demo running on port ${PORT}`);
  console.log('\nTry these commands to test security features:\n');

  console.log('1. SQL Injection attempt:');
  console.log(
    `   curl "http://localhost:${PORT}/test/sql-injection?search=' OR '1'='1"`
  );

  console.log('\n2. XSS attempt:');
  console.log(
    `   curl -X POST http://localhost:${PORT}/test/xss -H "Content-Type: application/json" -d '{"content":"<script>alert(1)</script>"}'`
  );

  console.log('\n3. Brute force login (run multiple times):');
  console.log(
    `   for i in {1..10}; do curl -X POST http://localhost:${PORT}/test/login -H "Content-Type: application/json" -d '{"username":"test@example.com","password":"wrong"}'; done`
  );

  console.log('\n4. Check security metrics:');
  console.log(`   curl http://localhost:${PORT}/security/metrics`);

  console.log('\nWatch the console for security events!\n');
});

// Endpoint to view security metrics
app.get('/security/metrics', (req, res) => {
  const metrics = securityMonitor.getMetrics();
  res.json(metrics);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📊 Final Security Metrics:');
  console.log(JSON.stringify(securityMonitor.getMetrics(), null, 2));
  process.exit(0);
});
