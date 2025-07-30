/**
 * Real-time Monitoring WebSocket Handler
 * 
 * Provides real-time monitoring updates through WebSocket connections,
 * integrating with the existing WebSocket infrastructure.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { unifiedMonitor } from '../monitoring';

export interface MonitoringWebSocketClient extends WebSocket {
  clientId: string;
  subscriptions: Set<string>;
  lastActivity: number;
  isAuthenticated: boolean;
}

export interface MonitoringSubscription {
  type: 'health' | 'performance' | 'business' | 'services' | 'database' | 'all';
  interval?: number; // Update interval in milliseconds
  includeDetails?: boolean;
}

export interface MonitoringMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'ping' | 'pong';
  subscription?: MonitoringSubscription;
  data?: any;
  error?: string;
  timestamp: number;
  clientId?: string;
}

export class MonitoringWebSocketHandler {
  private clients: Map<string, MonitoringWebSocketClient> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly defaultUpdateInterval = 5000; // 5 seconds
  private readonly maxClients = 50;
  private readonly heartbeatInterval = 30000; // 30 seconds
  private heartbeatTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private wss?: WebSocketServer) {
    if (wss) {
      this.setupWebSocketServer(wss);
    }
    this.startHeartbeat();
    this.startPeriodicCleanup();
  }

  /**
   * Setup WebSocket server for monitoring
   */
  setupWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;

    wss.on('connection', (ws: MonitoringWebSocketClient, request) => {
      this.handleConnection(ws, request);
    });

    logger.info('Monitoring WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: MonitoringWebSocketClient, request: any) {
    // Check client limit
    if (this.clients.size >= this.maxClients) {
      ws.close(1008, 'Maximum clients exceeded');
      return;
    }

    // Initialize client
    ws.clientId = this.generateClientId();
    ws.subscriptions = new Set();
    ws.lastActivity = Date.now();
    ws.isAuthenticated = false; // Would implement proper auth in production

    this.clients.set(ws.clientId, ws);

    logger.info('Monitoring client connected', { 
      clientId: ws.clientId,
      totalClients: this.clients.size 
    });

    // Setup message handler
    ws.on('message', (data) => {
      this.handleMessage(ws, data);
    });

    // Setup close handler
    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    // Setup error handler
    ws.on('error', (error) => {
      logger.error('Monitoring WebSocket error:', error);
      this.handleDisconnection(ws);
    });

    // Send welcome message
    this.sendMessage(ws, {
      type: 'data',
      data: {
        message: 'Connected to monitoring service',
        clientId: ws.clientId,
        availableSubscriptions: ['health', 'performance', 'business', 'services', 'database', 'all']
      },
      timestamp: Date.now()
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(ws: MonitoringWebSocketClient, data: Buffer) {
    try {
      ws.lastActivity = Date.now();
      
      const message: MonitoringMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(ws, message.subscription!);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.subscription!);
          break;
          
        case 'ping':
          this.sendMessage(ws, { type: 'pong', timestamp: Date.now() });
          break;
          
        default:
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error handling monitoring message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  /**
   * Handle subscription requests
   */
  private async handleSubscribe(ws: MonitoringWebSocketClient, subscription: MonitoringSubscription) {
    const subscriptionKey = `${subscription.type}:${subscription.interval || this.defaultUpdateInterval}`;
    
    // Add subscription
    ws.subscriptions.add(subscriptionKey);
    
    logger.debug('Client subscribed to monitoring', {
      clientId: ws.clientId,
      subscription: subscription.type,
      interval: subscription.interval || this.defaultUpdateInterval
    });

    // Start sending updates for this subscription
    this.startSubscriptionUpdates(ws, subscription);

    // Send confirmation
    this.sendMessage(ws, {
      type: 'data',
      data: {
        message: `Subscribed to ${subscription.type} monitoring`,
        subscription: subscriptionKey
      },
      timestamp: Date.now()
    });
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscribe(ws: MonitoringWebSocketClient, subscription: MonitoringSubscription) {
    const subscriptionKey = `${subscription.type}:${subscription.interval || this.defaultUpdateInterval}`;
    
    ws.subscriptions.delete(subscriptionKey);
    
    // Stop updates if no other clients are subscribed
    this.stopSubscriptionUpdates(subscriptionKey);

    logger.debug('Client unsubscribed from monitoring', {
      clientId: ws.clientId,
      subscription: subscription.type
    });

    this.sendMessage(ws, {
      type: 'data',
      data: {
        message: `Unsubscribed from ${subscription.type} monitoring`,
        subscription: subscriptionKey
      },
      timestamp: Date.now()
    });
  }

  /**
   * Start sending updates for a subscription
   */
  private startSubscriptionUpdates(ws: MonitoringWebSocketClient, subscription: MonitoringSubscription) {
    const interval = subscription.interval || this.defaultUpdateInterval;
    const subscriptionKey = `${subscription.type}:${interval}`;

    // Don't create duplicate intervals
    if (this.updateIntervals.has(subscriptionKey)) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const data = await this.getMonitoringData(subscription);
        
        // Send to all clients subscribed to this type
        this.clients.forEach(client => {
          if (client.subscriptions.has(subscriptionKey) && client.readyState === WebSocket.OPEN) {
            this.sendMessage(client, {
              type: 'data',
              data: {
                subscription: subscription.type,
                ...data
              },
              timestamp: Date.now()
            });
          }
        });
      } catch (error) {
        logger.error('Error collecting monitoring data:', error);
        
        // Send error to subscribed clients
        this.clients.forEach(client => {
          if (client.subscriptions.has(subscriptionKey) && client.readyState === WebSocket.OPEN) {
            this.sendError(client, `Failed to collect ${subscription.type} data`);
          }
        });
      }
    }, interval);

    this.updateIntervals.set(subscriptionKey, intervalId);
    
    logger.debug('Started monitoring updates', { 
      subscription: subscriptionKey,
      interval 
    });
  }

  /**
   * Stop subscription updates if no clients are subscribed
   */
  private stopSubscriptionUpdates(subscriptionKey: string) {
    // Check if any clients are still subscribed
    const hasSubscribers = Array.from(this.clients.values()).some(
      client => client.subscriptions.has(subscriptionKey)
    );

    if (!hasSubscribers && this.updateIntervals.has(subscriptionKey)) {
      clearInterval(this.updateIntervals.get(subscriptionKey)!);
      this.updateIntervals.delete(subscriptionKey);
      
      logger.debug('Stopped monitoring updates', { subscription: subscriptionKey });
    }
  }

  /**
   * Get monitoring data based on subscription type
   */
  private async getMonitoringData(subscription: MonitoringSubscription) {
    switch (subscription.type) {
      case 'health':
        return await unifiedMonitor.healthChecker.checkSystemHealth({
          includeDetails: subscription.includeDetails
        });
        
      case 'performance':
        return await unifiedMonitor.metricsCollector.collectPerformanceMetrics();
        
      case 'business':
        return await unifiedMonitor.metricsCollector.collectBusinessMetrics();
        
      case 'services':
        return await unifiedMonitor.serviceMonitor.checkAllServices({
          includeDetails: subscription.includeDetails
        });
        
      case 'database':
        return await unifiedMonitor.databaseMonitor.checkHealth({
          includePerformanceDetails: subscription.includeDetails
        });
        
      case 'all':
        return await unifiedMonitor.getSystemStatus();
        
      default:
        throw new Error(`Unknown subscription type: ${subscription.type}`);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: MonitoringWebSocketClient) {
    if (ws.clientId && this.clients.has(ws.clientId)) {
      this.clients.delete(ws.clientId);

      // Clean up subscriptions - ensure all intervals are properly cleared
      const subscriptionsToCleanup = Array.from(ws.subscriptions);
      ws.subscriptions.clear();

      subscriptionsToCleanup.forEach(subscription => {
        this.stopSubscriptionUpdates(subscription);
      });

      logger.info('Monitoring client disconnected', {
        clientId: ws.clientId,
        totalClients: this.clients.size,
        subscriptionsCleanedUp: subscriptionsToCleanup.length
      });
    }
  }

  /**
   * Send message to client
   */
  private sendMessage(ws: MonitoringWebSocketClient, message: MonitoringMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Error sending monitoring message:', error);
      }
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: MonitoringWebSocketClient, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error,
      timestamp: Date.now()
    });
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const clientsToRemove: string[] = [];

      this.clients.forEach((client, clientId) => {
        // Remove inactive clients
        if (now - client.lastActivity > this.heartbeatInterval * 2) {
          logger.warn('Removing inactive monitoring client', { clientId });
          client.terminate();
          clientsToRemove.push(clientId);
        }
      });

      // Clean up inactive clients
      clientsToRemove.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client) {
          this.handleDisconnection(client);
        }
      });
    }, this.heartbeatInterval);
  }

  /**
   * Start periodic cleanup of old data
   */
  private startPeriodicCleanup() {
    // Clean up old data every hour
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Clean up old monitoring data to prevent memory leaks
   */
  private cleanupOldData() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    // Clean up any orphaned intervals
    this.updateIntervals.forEach((interval, key) => {
      const hasSubscribers = Array.from(this.clients.values()).some(
        client => client.subscriptions.has(key)
      );

      if (!hasSubscribers) {
        clearInterval(interval);
        this.updateIntervals.delete(key);
        logger.debug('Cleaned up orphaned monitoring interval', { subscription: key });
      }
    });

    logger.debug('Monitoring data cleanup completed', {
      activeClients: this.clients.size,
      activeIntervals: this.updateIntervals.size
    });
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      activeSubscriptions: this.updateIntervals.size,
      subscriptionTypes: Array.from(this.updateIntervals.keys()),
      uptime: process.uptime()
    };
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(data: any) {
    const message: MonitoringMessage = {
      type: 'data',
      data,
      timestamp: Date.now()
    };

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear heartbeat timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Clear all subscription intervals
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();

    // Close all client connections gracefully
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server shutting down');
      }
    });
    this.clients.clear();

    logger.info('Monitoring WebSocket handler cleaned up completely');
  }
}
