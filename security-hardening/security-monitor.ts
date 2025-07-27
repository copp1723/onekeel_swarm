/**
 * Enhanced Security Monitoring System
 * Provides real-time security event monitoring, alerting, and automated response
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Security event types
export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'AUTH_FAILURE',
  AUTHORIZATION_FAILURE = 'AUTHZ_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION',
  XSS_ATTEMPT = 'XSS',
  CSRF_ATTEMPT = 'CSRF',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK',
  FILE_ACCESS_VIOLATION = 'FILE_ACCESS',
  API_ABUSE = 'API_ABUSE',
  DATA_EXFILTRATION_ATTEMPT = 'DATA_EXFIL'
}

// Security event severity levels
export enum SecuritySeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Security event interface
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
  };
  details: {
    message: string;
    endpoint?: string;
    method?: string;
    payload?: any;
    stackTrace?: string;
  };
  metadata?: Record<string, any>;
}

// Threat intelligence cache
interface ThreatIntelligence {
  blacklistedIPs: Set<string>;
  suspiciousPatterns: RegExp[];
  knownAttackSignatures: string[];
  riskScores: Map<string, number>;
}

export class SecurityMonitor extends EventEmitter {
  private events: SecurityEvent[] = [];
  private threatIntel: ThreatIntelligence;
  private alertThresholds: Map<SecurityEventType, number>;
  private timeWindows: Map<string, number[]>;
  private blockedIPs: Set<string>;
  private securityLogPath: string;

  constructor() {
    super();
    
    this.threatIntel = {
      blacklistedIPs: new Set(),
      suspiciousPatterns: [
        // SQL Injection patterns
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|where|table|database)\b)/i,
        /(\'|\"|\`)\s*(or|and)\s*(\'|\"|\`)\s*=\s*(\'|\"|\`)/i,
        /(\b(script|javascript|vbscript|onload|onerror|onclick)\b)/i,
        // Path traversal
        /(\.\.[\/\\]){2,}/,
        /(\/etc\/passwd|\/windows\/system32)/i,
        // Command injection
        /(\||;|&|`|\$\(|\${)/,
      ],
      knownAttackSignatures: [],
      riskScores: new Map()
    };

    this.alertThresholds = new Map([
      [SecurityEventType.AUTHENTICATION_FAILURE, 5],
      [SecurityEventType.RATE_LIMIT_EXCEEDED, 10],
      [SecurityEventType.SQL_INJECTION_ATTEMPT, 1],
      [SecurityEventType.XSS_ATTEMPT, 1],
      [SecurityEventType.BRUTE_FORCE_ATTEMPT, 3]
    ]);

    this.timeWindows = new Map();
    this.blockedIPs = new Set();
    this.securityLogPath = process.env.SECURITY_LOG_PATH || './logs/security';

    // Ensure log directory exists
    this.ensureLogDirectory();

    // Initialize monitoring
    this.initializeMonitoring();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.securityLogPath)) {
      fs.mkdirSync(this.securityLogPath, { recursive: true });
    }
  }

  private initializeMonitoring() {
    // Set up event handlers
    this.on('security-event', this.handleSecurityEvent.bind(this));
    
    // Periodic cleanup of old events
    setInterval(() => this.cleanupOldEvents(), 3600000); // 1 hour
    
    // Periodic threat intel update
    setInterval(() => this.updateThreatIntelligence(), 1800000); // 30 minutes
  }

  // Log security event
  public logEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    req: Request,
    details: Partial<SecurityEvent['details']>,
    metadata?: Record<string, any>
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      severity,
      source: {
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        userId: (req as any).user?.id,
        sessionId: (req as any).session?.id
      },
      details: {
        message: details.message || 'Security event occurred',
        endpoint: req.path,
        method: req.method,
        ...details
      },
      metadata
    };

    this.events.push(event);
    this.emit('security-event', event);
    
    // Persist to file
    this.persistEvent(event);

    return event;
  }

  // Handle security event
  private async handleSecurityEvent(event: SecurityEvent) {
    // Update risk score
    this.updateRiskScore(event.source.ip, event.severity);

    // Check if threshold exceeded
    if (this.isThresholdExceeded(event)) {
      this.escalateEvent(event);
    }

    // Check for patterns
    if (this.detectAttackPattern(event.source.ip)) {
      this.blockIP(event.source.ip, 3600000); // Block for 1 hour
    }

    // Real-time alerting for critical events
    if (event.severity >= SecuritySeverity.HIGH) {
      await this.sendAlert(event);
    }
  }

  // Update risk score for an IP
  private updateRiskScore(ip: string, severity: SecuritySeverity) {
    const currentScore = this.threatIntel.riskScores.get(ip) || 0;
    const newScore = currentScore + (severity * 10);
    this.threatIntel.riskScores.set(ip, newScore);

    // Auto-block high risk IPs
    if (newScore >= 100) {
      this.blockIP(ip, 86400000); // Block for 24 hours
    }
  }

  // Check if event threshold is exceeded
  private isThresholdExceeded(event: SecurityEvent): boolean {
    const threshold = this.alertThresholds.get(event.type);
    if (!threshold) return false;

    const key = `${event.type}-${event.source.ip}`;
    const window = this.timeWindows.get(key) || [];
    const now = Date.now();
    
    // Keep only events in the last 15 minutes
    const recentEvents = window.filter(time => now - time < 900000);
    recentEvents.push(now);
    this.timeWindows.set(key, recentEvents);

    return recentEvents.length >= threshold;
  }

  // Detect attack patterns
  private detectAttackPattern(ip: string): boolean {
    const recentEvents = this.events.filter(
      e => e.source.ip === ip && 
      Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    );

    // Multiple different attack types from same IP
    const attackTypes = new Set(recentEvents.map(e => e.type));
    if (attackTypes.size >= 3) return true;

    // High frequency of events
    if (recentEvents.length >= 20) return true;

    // Critical severity events
    const criticalEvents = recentEvents.filter(e => e.severity === SecuritySeverity.CRITICAL);
    if (criticalEvents.length >= 2) return true;

    return false;
  }

  // Block an IP address
  public blockIP(ip: string, duration: number) {
    this.blockedIPs.add(ip);
    console.warn(`[SECURITY] Blocked IP: ${ip} for ${duration}ms`);

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      console.info(`[SECURITY] Unblocked IP: ${ip}`);
    }, duration);

    // Emit block event
    this.emit('ip-blocked', { ip, duration, timestamp: new Date() });
  }

  // Check if IP is blocked
  public isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip) || this.threatIntel.blacklistedIPs.has(ip);
  }

  // Escalate security event
  private escalateEvent(event: SecurityEvent) {
    console.error(`[SECURITY ESCALATION] ${event.type} threshold exceeded for ${event.source.ip}`);
    
    // Automated responses based on event type
    switch (event.type) {
      case SecurityEventType.BRUTE_FORCE_ATTEMPT:
        this.blockIP(event.source.ip, 7200000); // 2 hours
        break;
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
      case SecurityEventType.XSS_ATTEMPT:
        this.blockIP(event.source.ip, 86400000); // 24 hours
        break;
      case SecurityEventType.DATA_EXFILTRATION_ATTEMPT:
        // Immediate permanent block
        this.threatIntel.blacklistedIPs.add(event.source.ip);
        break;
    }
  }

  // Send security alert
  private async sendAlert(event: SecurityEvent) {
    // In production, this would send to:
    // - Email
    // - Slack/Discord
    // - PagerDuty
    // - SIEM system
    
    console.error(`[SECURITY ALERT] ${event.type} - Severity: ${event.severity}`);
    console.error(`Source: ${event.source.ip} - ${event.details.message}`);
    
    // Log to separate alert file
    const alertLog = path.join(this.securityLogPath, 'alerts.log');
    const alertData = `${new Date().toISOString()} [${event.severity}] ${event.type} - ${event.source.ip} - ${event.details.message}\n`;
    fs.appendFileSync(alertLog, alertData);
  }

  // Persist event to file
  private persistEvent(event: SecurityEvent) {
    const date = new Date();
    const filename = `security-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.jsonl`;
    const filepath = path.join(this.securityLogPath, filename);
    
    fs.appendFileSync(filepath, JSON.stringify(event) + '\n');
  }

  // Clean up old events
  private cleanupOldEvents() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.events = this.events.filter(e => e.timestamp.getTime() > cutoff);
    
    // Clean up time windows
    for (const [key, times] of this.timeWindows.entries()) {
      const recentTimes = times.filter(t => t > cutoff);
      if (recentTimes.length === 0) {
        this.timeWindows.delete(key);
      } else {
        this.timeWindows.set(key, recentTimes);
      }
    }
  }

  // Update threat intelligence
  private async updateThreatIntelligence() {
    // In production, this would:
    // - Fetch known bad IPs from threat feeds
    // - Update attack signatures
    // - Sync with external threat intelligence APIs
    
    console.log('[SECURITY] Threat intelligence updated');
  }

  // Get client IP with proxy support
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  // Middleware to check for malicious patterns
  public scanRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIP(req);

      // Check if IP is blocked
      if (this.isIPBlocked(ip)) {
        this.logEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          SecuritySeverity.HIGH,
          req,
          { message: 'Blocked IP attempted access' }
        );
        return res.status(403).json({ error: 'Access denied' });
      }

      // Scan for suspicious patterns
      const suspiciousContent = this.scanForThreats(req);
      if (suspiciousContent) {
        this.logEvent(
          suspiciousContent.type,
          suspiciousContent.severity,
          req,
          { message: suspiciousContent.message, payload: suspiciousContent.payload }
        );

        if (suspiciousContent.severity >= SecuritySeverity.HIGH) {
          return res.status(400).json({ error: 'Invalid request' });
        }
      }

      next();
    };
  }

  // Scan request for threats
  private scanForThreats(req: Request): { type: SecurityEventType, severity: SecuritySeverity, message: string, payload?: any } | null {
    const contentToScan = [
      JSON.stringify(req.body),
      JSON.stringify(req.query),
      req.path,
      req.headers['user-agent'] || ''
    ].join(' ');

    // Check for SQL injection patterns
    for (const pattern of this.threatIntel.suspiciousPatterns) {
      if (pattern.test(contentToScan)) {
        return {
          type: SecurityEventType.SQL_INJECTION_ATTEMPT,
          severity: SecuritySeverity.HIGH,
          message: 'Potential SQL injection detected',
          payload: { pattern: pattern.toString() }
        };
      }
    }

    // Check for XSS patterns
    if (/<script|javascript:|onerror=|onclick=/i.test(contentToScan)) {
      return {
        type: SecurityEventType.XSS_ATTEMPT,
        severity: SecuritySeverity.HIGH,
        message: 'Potential XSS attempt detected'
      };
    }

    // Check for path traversal
    if (/\.\.[\/\\]/.test(req.path)) {
      return {
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        message: 'Path traversal attempt detected'
      };
    }

    return null;
  }

  // Get security metrics
  public getMetrics() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last1h = now - (60 * 60 * 1000);

    const events24h = this.events.filter(e => e.timestamp.getTime() > last24h);
    const events1h = this.events.filter(e => e.timestamp.getTime() > last1h);

    return {
      totalEvents: this.events.length,
      events24h: events24h.length,
      events1h: events1h.length,
      blockedIPs: this.blockedIPs.size,
      blacklistedIPs: this.threatIntel.blacklistedIPs.size,
      highRiskIPs: Array.from(this.threatIntel.riskScores.entries())
        .filter(([_, score]) => score > 50)
        .map(([ip, score]) => ({ ip, score })),
      eventsByType: this.groupEventsByType(events24h),
      eventsBySeverity: this.groupEventsBySeverity(events24h)
    };
  }

  private groupEventsByType(events: SecurityEvent[]) {
    const grouped: Record<string, number> = {};
    events.forEach(e => {
      grouped[e.type] = (grouped[e.type] || 0) + 1;
    });
    return grouped;
  }

  private groupEventsBySeverity(events: SecurityEvent[]) {
    const grouped: Record<number, number> = {};
    events.forEach(e => {
      grouped[e.severity] = (grouped[e.severity] || 0) + 1;
    });
    return grouped;
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

// Export middleware
export const securityMiddleware = securityMonitor.scanRequest();