/**
 * Secure WebSocket Service
 * 
 * Always-on secure WebSocket implementation that enforces:
 * - Authentication for all connections
 * - Rate limiting
 * - Input validation
 * - Proper error handling
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../utils/logger';
import { securityConfig } from '../config/security';
import { verifyToken } from '../services/token-service';
import { z } from 'zod';
import crypto from 'crypto';

// WebSocket message schema
const WebSocketMessageSchema = z.object({
  type: z.string().min(1).max(50),
  payload: z.any(),
  timestamp: z.number().optional(),
  id: z.string().optional()
});

// Connection metadata
interface SecureWebSocketClient extends WebSocket {
  userId?: string;
  isAuthenticated: boolean;
  connectionId: string;
  lastActivity: number;
  messageCount: number;
  messageWindow: number;
}

export class SecureWebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, SecureWebSocketClient> = new Map();
  private messageHandlers: Map<string, (client: SecureWebSocketClient, payload: any) => Promise<void>> = new Map();
  private broadcastHandler?: (data: any) => void;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupConnectionHandler();
    this.startCleanupInterval();
  }

  /**
   * Setup WebSocket connection handler
   */
  private setupConnectionHandler() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const client = ws as SecureWebSocketClient;
      client.connectionId = crypto.randomUUID();
      client.isAuthenticated = false;
      client.lastActivity = Date.now();
      client.messageCount = 0;
      client.messageWindow = Date.now();

      // Log new connection
      logger.info('New WebSocket connection', {
        connectionId: client.connectionId,
        ip: req.socket.remoteAddress
      });

      // Set connection timeout
      const authTimeout = setTimeout(() => {
        if (!client.isAuthenticated) {
          logger.warn('WebSocket authentication timeout', {
            connectionId: client.connectionId
          });
          this.closeConnection(client, 1008, 'Authentication timeout');
        }
      }, 30000); // 30 seconds to authenticate

      // Setup client handlers
      client.on('message', async (data: Buffer) => {
        try {
          await this.handleMessage(client, data);
        } catch (error) {
          logger.error('WebSocket message handling error', error as Error);
          this.sendError(client, 'Message processing failed');
        }
      });

      client.on('pong', () => {
        client.lastActivity = Date.now();
      });

      client.on('close', (code, reason) => {
        clearTimeout(authTimeout);
        this.handleDisconnection(client, code, reason.toString());
      });

      client.on('error', (error) => {
        logger.error('WebSocket client error', {
          connectionId: client.connectionId,
          error: error.message
        });
      });

      // Send authentication request
      this.sendMessage(client, {
        type: 'auth_required',
        payload: {
          message: 'Please authenticate within 30 seconds'
        }
      });

      // Store client
      this.clients.set(client.connectionId, client);
    });
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(client: SecureWebSocketClient, data: Buffer) {
    // Update activity
    client.lastActivity = Date.now();

    // Rate limiting
    if (!this.checkRateLimit(client)) {
      logger.warn('WebSocket rate limit exceeded', {
        connectionId: client.connectionId,
        userId: client.userId
      });
      this.sendError(client, 'Rate limit exceeded');
      return;
    }

    // Parse and validate message
    let message: any;
    try {
      message = JSON.parse(data.toString());
      message = WebSocketMessageSchema.parse(message);
    } catch (error) {
      this.sendError(client, 'Invalid message format');
      return;
    }

    // Add timestamp and ID if not present
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }
    if (!message.id) {
      message.id = crypto.randomUUID();
    }

    // Handle authentication
    if (message.type === 'auth' && !client.isAuthenticated) {
      await this.handleAuthentication(client, message.payload);
      return;
    }

    // Require authentication for all other messages
    if (!client.isAuthenticated) {
      this.sendError(client, 'Authentication required');
      return;
    }

    // Log message
    logger.debug('WebSocket message received', {
      connectionId: client.connectionId,
      userId: client.userId,
      type: message.type
    });

    // Handle message based on type
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      await handler(client, message.payload);
    } else {
      this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuthentication(client: SecureWebSocketClient, payload: any) {
    try {
      // Validate token
      if (!payload.token) {
        this.sendError(client, 'Token required');
        return;
      }

      const decoded = await verifyToken(payload.token);
      if (!decoded || !decoded.userId) {
        this.sendError(client, 'Invalid token');
        return;
      }

      // Mark as authenticated
      client.isAuthenticated = true;
      client.userId = decoded.userId;

      logger.info('WebSocket client authenticated', {
        connectionId: client.connectionId,
        userId: client.userId
      });

      // Send success message
      this.sendMessage(client, {
        type: 'auth_success',
        payload: {
          userId: client.userId,
          connectionId: client.connectionId
        }
      });

      // Notify handlers of new authenticated connection
      this.messageHandlers.forEach((handler, type) => {
        if (type === 'connection_established') {
          handler(client, {});
        }
      });
    } catch (error) {
      logger.error('WebSocket authentication error', error as Error);
      this.sendError(client, 'Authentication failed');
      this.closeConnection(client, 1008, 'Authentication failed');
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(client: SecureWebSocketClient): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    
    // Reset window if needed
    if (now - client.messageWindow > windowMs) {
      client.messageCount = 0;
      client.messageWindow = now;
    }

    client.messageCount++;
    
    const maxMessages = securityConfig.websocket.rateLimit.maxMessagesPerMinute;
    return client.messageCount <= maxMessages;
  }

  /**
   * Send message to client
   */
  private sendMessage(client: SecureWebSocketClient, message: any) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          ...message,
          timestamp: message.timestamp || Date.now(),
          id: message.id || crypto.randomUUID()
        }));
      } catch (error) {
        logger.error('Failed to send WebSocket message', error as Error);
      }
    }
  }

  /**
   * Send error message
   */
  private sendError(client: SecureWebSocketClient, error: string) {
    this.sendMessage(client, {
      type: 'error',
      payload: { error }
    });
  }

  /**
   * Close connection
   */
  private closeConnection(client: SecureWebSocketClient, code: number, reason: string) {
    try {
      client.close(code, reason);
    } catch (error) {
      logger.error('Error closing WebSocket connection', error as Error);
    }
    this.clients.delete(client.connectionId);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(client: SecureWebSocketClient, code: number, reason: string) {
    logger.info('WebSocket client disconnected', {
      connectionId: client.connectionId,
      userId: client.userId,
      code,
      reason
    });

    this.clients.delete(client.connectionId);

    // Notify handlers
    this.messageHandlers.forEach((handler, type) => {
      if (type === 'connection_closed') {
        handler(client, { code, reason });
      }
    });
  }

  /**
   * Broadcast to all authenticated clients
   */
  public broadcast(data: any, excludeClient?: string) {
    const message = {
      type: 'broadcast',
      payload: data,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };

    this.clients.forEach((client) => {
      if (client.isAuthenticated && 
          client.connectionId !== excludeClient &&
          client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    });
  }

  /**
   * Send to specific user
   */
  public sendToUser(userId: string, data: any) {
    const message = {
      type: 'direct',
      payload: data,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };

    this.clients.forEach((client) => {
      if (client.isAuthenticated && 
          client.userId === userId &&
          client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    });
  }

  /**
   * Register message handler
   */
  public registerHandler(type: string, handler: (client: SecureWebSocketClient, payload: any) => Promise<void>) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Start cleanup interval for inactive connections
   */
  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 300000; // 5 minutes

      this.clients.forEach((client) => {
        if (now - client.lastActivity > timeout) {
          logger.info('Closing inactive WebSocket connection', {
            connectionId: client.connectionId,
            userId: client.userId
          });
          this.closeConnection(client, 1001, 'Idle timeout');
        } else {
          // Send ping to check if connection is alive
          try {
            client.ping();
          } catch (error) {
            logger.error('Failed to ping client', error as Error);
          }
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    let authenticated = 0;
    let unauthenticated = 0;

    this.clients.forEach((client) => {
      if (client.isAuthenticated) {
        authenticated++;
      } else {
        unauthenticated++;
      }
    });

    return {
      total: this.clients.size,
      authenticated,
      unauthenticated,
      uptime: process.uptime()
    };
  }
}