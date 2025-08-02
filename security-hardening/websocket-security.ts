/**
 * WebSocket Security Hardening
 * Implements comprehensive security for WebSocket connections
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { tokenService } from '../security-fixes/fix-3-secure-jwt-config';
import {
  securityMonitor,
  SecurityEventType,
  SecuritySeverity,
} from './security-monitor';
import { createHash } from 'crypto';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAuthenticated?: boolean;
  connectionId?: string;
  lastActivity?: number;
  messageCount?: number;
}

interface WebSocketSecurityConfig {
  maxConnectionsPerUser?: number;
  maxMessageSize?: number;
  maxMessagesPerMinute?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  requireAuthentication?: boolean;
  allowedOrigins?: string[];
}

export class SecureWebSocketServer {
  private wss: WebSocketServer;
  private config: Required<WebSocketSecurityConfig>;
  private connections: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private connectionRateLimiter: Map<string, number[]> = new Map();
  private messageRateLimiter: Map<string, number[]> = new Map();

  constructor(wss: WebSocketServer, config: WebSocketSecurityConfig = {}) {
    this.wss = wss;
    this.config = {
      maxConnectionsPerUser: config.maxConnectionsPerUser || 5,
      maxMessageSize: config.maxMessageSize || 65536, // 64KB
      maxMessagesPerMinute: config.maxMessagesPerMinute || 60,
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout || 60000, // 1 minute
      requireAuthentication: config.requireAuthentication !== false,
      allowedOrigins: config.allowedOrigins || [],
    };

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    // Handle new connections
    this.wss.on(
      'connection',
      (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
        const ip = this.getClientIP(request);
        ws.connectionId = createHash('sha256')
          .update(`${ip}-${Date.now()}-${Math.random()}`)
          .digest('hex');

        // Check if IP is blocked
        if (securityMonitor.isIPBlocked(ip)) {
          securityMonitor.logEvent(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            SecuritySeverity.HIGH,
            request as any,
            { message: 'Blocked IP attempted WebSocket connection' }
          );
          ws.close(1008, 'Policy Violation');
          return;
        }

        // Validate origin
        if (!this.validateOrigin(request)) {
          securityMonitor.logEvent(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            SecuritySeverity.MEDIUM,
            request as any,
            { message: `Invalid origin: ${request.headers.origin}` }
          );
          ws.close(1008, 'Invalid Origin');
          return;
        }

        // Check connection rate limit
        if (!this.checkConnectionRateLimit(ip)) {
          securityMonitor.logEvent(
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            SecuritySeverity.MEDIUM,
            request as any,
            { message: 'WebSocket connection rate limit exceeded' }
          );
          ws.close(1008, 'Too Many Connections');
          return;
        }

        // Set up connection
        ws.isAuthenticated = false;
        ws.lastActivity = Date.now();
        ws.messageCount = 0;

        // Authentication timeout
        const authTimeout = setTimeout(() => {
          if (!ws.isAuthenticated && this.config.requireAuthentication) {
            ws.close(1008, 'Authentication Timeout');
          }
        }, 10000); // 10 seconds to authenticate

        // Handle messages
        ws.on('message', async (data: Buffer) => {
          try {
            // Update activity
            ws.lastActivity = Date.now();

            // Check message size
            if (data.length > this.config.maxMessageSize) {
              securityMonitor.logEvent(
                SecurityEventType.SUSPICIOUS_ACTIVITY,
                SecuritySeverity.LOW,
                request as any,
                { message: `Oversized WebSocket message: ${data.length} bytes` }
              );
              ws.close(1009, 'Message Too Big');
              return;
            }

            // Parse message
            let message;
            try {
              message = JSON.parse(data.toString());
            } catch (e) {
              ws.send(JSON.stringify({ error: 'Invalid JSON' }));
              return;
            }

            // Handle authentication
            if (message.type === 'auth' && !ws.isAuthenticated) {
              clearTimeout(authTimeout);
              await this.handleAuthentication(ws, message, request);
              return;
            }

            // Require authentication for other messages
            if (this.config.requireAuthentication && !ws.isAuthenticated) {
              ws.send(JSON.stringify({ error: 'Not authenticated' }));
              return;
            }

            // Check message rate limit
            if (!this.checkMessageRateLimit(ws)) {
              securityMonitor.logEvent(
                SecurityEventType.RATE_LIMIT_EXCEEDED,
                SecuritySeverity.LOW,
                request as any,
                { message: `Message rate limit exceeded for user ${ws.userId}` }
              );
              ws.send(JSON.stringify({ error: 'Rate limit exceeded' }));
              return;
            }

            // Validate message structure
            if (!this.validateMessage(message)) {
              ws.send(JSON.stringify({ error: 'Invalid message format' }));
              return;
            }

            // Process message (implement your business logic here)
            await this.handleMessage(ws, message, request);
          } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({ error: 'Internal error' }));
          }
        });

        // Handle close
        ws.on('close', () => {
          this.handleDisconnection(ws);
        });

        // Handle errors
        ws.on('error', error => {
          console.error('WebSocket error:', error);
          securityMonitor.logEvent(
            SecurityEventType.SUSPICIOUS_ACTIVITY,
            SecuritySeverity.LOW,
            request as any,
            { message: `WebSocket error: ${error.message}` }
          );
        });

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: 'welcome',
            requiresAuth: this.config.requireAuthentication,
            timestamp: Date.now(),
          })
        );
      }
    );
  }

  private async handleAuthentication(
    ws: AuthenticatedWebSocket,
    message: any,
    request: IncomingMessage
  ) {
    try {
      const { token } = message;

      if (!token) {
        ws.send(JSON.stringify({ error: 'Missing token' }));
        return;
      }

      // Verify token
      const decoded = tokenService.verifyAccessToken(token);

      if (!decoded) {
        securityMonitor.logEvent(
          SecurityEventType.AUTHENTICATION_FAILURE,
          SecuritySeverity.MEDIUM,
          request as any,
          { message: 'Invalid WebSocket authentication token' }
        );
        ws.send(JSON.stringify({ error: 'Invalid token' }));
        ws.close(1008, 'Authentication Failed');
        return;
      }

      // Check max connections per user
      const userConnections = this.connections.get(decoded.userId) || new Set();
      if (userConnections.size >= this.config.maxConnectionsPerUser) {
        ws.send(JSON.stringify({ error: 'Too many connections' }));
        ws.close(1008, 'Connection Limit Exceeded');
        return;
      }

      // Set authentication
      ws.userId = decoded.userId;
      ws.isAuthenticated = true;

      // Track connection
      userConnections.add(ws);
      this.connections.set(decoded.userId, userConnections);

      // Send success
      ws.send(
        JSON.stringify({
          type: 'auth_success',
          userId: decoded.userId,
          connectionId: ws.connectionId,
        })
      );

      console.log(`WebSocket authenticated: ${decoded.userId}`);
    } catch (error) {
      securityMonitor.logEvent(
        SecurityEventType.AUTHENTICATION_FAILURE,
        SecuritySeverity.MEDIUM,
        request as any,
        {
          message: `WebSocket authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      );
      ws.send(JSON.stringify({ error: 'Authentication failed' }));
      ws.close(1008, 'Authentication Error');
    }
  }

  private async handleMessage(
    ws: AuthenticatedWebSocket,
    message: any,
    request: IncomingMessage
  ) {
    // Increment message count
    ws.messageCount = (ws.messageCount || 0) + 1;

    // Sanitize message content
    const sanitized = this.sanitizeMessage(message);

    // Log suspicious patterns
    if (this.detectSuspiciousPatterns(message)) {
      securityMonitor.logEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecuritySeverity.MEDIUM,
        request as any,
        {
          message: `Suspicious WebSocket message pattern detected for user ${ws.userId}`,
          payload: sanitized,
        }
      );
    }

    // Your message handling logic here
    console.log(`Message from ${ws.userId}:`, sanitized);

    // Echo sanitized message (example)
    ws.send(
      JSON.stringify({
        type: 'message_received',
        data: sanitized,
        timestamp: Date.now(),
      })
    );
  }

  private handleDisconnection(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      const userConnections = this.connections.get(ws.userId);
      if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
          this.connections.delete(ws.userId);
        }
      }
      console.log(`WebSocket disconnected: ${ws.userId}`);
    }
  }

  private validateOrigin(request: IncomingMessage): boolean {
    const origin = request.headers.origin;

    // No origin header (could be non-browser client)
    if (!origin) return true;

    // Check against allowed origins
    if (this.config.allowedOrigins.length > 0) {
      return this.config.allowedOrigins.includes(origin);
    }

    // In production, always validate origin
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigin = process.env.CORS_ORIGIN?.split(',') || [];
      return allowedOrigin.includes(origin);
    }

    return true;
  }

  private checkConnectionRateLimit(ip: string): boolean {
    const now = Date.now();
    const connections = this.connectionRateLimiter.get(ip) || [];

    // Remove old entries (older than 1 minute)
    const recentConnections = connections.filter(time => now - time < 60000);

    // Check limit (max 5 connections per minute per IP)
    if (recentConnections.length >= 5) {
      return false;
    }

    recentConnections.push(now);
    this.connectionRateLimiter.set(ip, recentConnections);
    return true;
  }

  private checkMessageRateLimit(ws: AuthenticatedWebSocket): boolean {
    const key = ws.userId || ws.connectionId!;
    const now = Date.now();
    const messages = this.messageRateLimiter.get(key) || [];

    // Remove old entries (older than 1 minute)
    const recentMessages = messages.filter(time => now - time < 60000);

    // Check limit
    if (recentMessages.length >= this.config.maxMessagesPerMinute) {
      return false;
    }

    recentMessages.push(now);
    this.messageRateLimiter.set(key, recentMessages);
    return true;
  }

  private validateMessage(message: any): boolean {
    // Basic structure validation
    if (!message || typeof message !== 'object') return false;
    if (!message.type || typeof message.type !== 'string') return false;

    // Validate against known message types
    const allowedTypes = [
      'auth',
      'message',
      'ping',
      'subscribe',
      'unsubscribe',
    ];
    if (!allowedTypes.includes(message.type)) return false;

    // Additional validation based on type
    switch (message.type) {
      case 'message':
        return message.data && typeof message.data === 'object';
      case 'subscribe':
      case 'unsubscribe':
        return message.channel && typeof message.channel === 'string';
      default:
        return true;
    }
  }

  private sanitizeMessage(message: any): any {
    // Deep clone and sanitize
    const sanitized = JSON.parse(JSON.stringify(message));

    // Remove potentially dangerous fields
    delete sanitized.__proto__;
    delete sanitized.constructor;
    delete sanitized.prototype;

    // Sanitize string values
    const sanitizeString = (str: string): string => {
      return str
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .substring(0, 1000); // Limit length
    };

    const sanitizeObject = (obj: any): any => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }

  private detectSuspiciousPatterns(message: any): boolean {
    const stringified = JSON.stringify(message);

    // Check for common attack patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers
      /\.\.\//, // Path traversal
      /\${/, // Template injection
      /eval\s*\(/, // Eval usage
      /__proto__/, // Prototype pollution
    ];

    return suspiciousPatterns.some(pattern => pattern.test(stringified));
  }

  private startHeartbeat() {
    setInterval(() => {
      const now = Date.now();

      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        // Check if connection is alive
        if (
          ws.lastActivity &&
          now - ws.lastActivity > this.config.connectionTimeout
        ) {
          ws.terminate();
          return;
        }

        // Send ping
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });

      // Cleanup old rate limit entries
      this.cleanupRateLimiters();
    }, this.config.heartbeatInterval);
  }

  private cleanupRateLimiters() {
    const now = Date.now();
    const cutoff = now - 120000; // 2 minutes

    // Cleanup connection rate limiter
    for (const [ip, times] of this.connectionRateLimiter.entries()) {
      const recent = times.filter(time => time > cutoff);
      if (recent.length === 0) {
        this.connectionRateLimiter.delete(ip);
      } else {
        this.connectionRateLimiter.set(ip, recent);
      }
    }

    // Cleanup message rate limiter
    for (const [key, times] of this.messageRateLimiter.entries()) {
      const recent = times.filter(time => time > cutoff);
      if (recent.length === 0) {
        this.messageRateLimiter.delete(key);
      } else {
        this.messageRateLimiter.set(key, recent);
      }
    }
  }

  private getClientIP(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return request.socket.remoteAddress || 'unknown';
  }

  // Public methods
  public broadcast(
    message: any,
    filter?: (ws: AuthenticatedWebSocket) => boolean
  ) {
    const data = JSON.stringify(message);

    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.readyState === WebSocket.OPEN && ws.isAuthenticated) {
        if (!filter || filter(ws)) {
          ws.send(data);
        }
      }
    });
  }

  public sendToUser(userId: string, message: any) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const data = JSON.stringify(message);
      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    }
  }

  public disconnectUser(userId: string, reason?: string) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.forEach(ws => {
        ws.close(1000, reason || 'Disconnected by server');
      });
    }
  }

  public getMetrics() {
    return {
      totalConnections: this.wss.clients.size,
      authenticatedConnections: Array.from(this.wss.clients).filter(
        (ws: AuthenticatedWebSocket) => ws.isAuthenticated
      ).length,
      connectionsPerUser: Array.from(this.connections.entries()).map(
        ([userId, conns]) => ({
          userId,
          connections: conns.size,
        })
      ),
      rateLimitedIPs: this.connectionRateLimiter.size,
      rateLimitedUsers: this.messageRateLimiter.size,
    };
  }
}

// Export middleware for Express to upgrade HTTP to WebSocket
export function websocketUpgrade(_secureWss: SecureWebSocketServer) {
  return (req: any, res: any, next: any) => {
    if (req.headers.upgrade === 'websocket') {
      // Additional security checks before upgrade
      const ip = req.ip || req.connection.remoteAddress;

      if (securityMonitor.isIPBlocked(ip)) {
        res.status(403).send('Forbidden');
        return;
      }

      // Let the WebSocket server handle the upgrade
      next();
    } else {
      next();
    }
  };
}
