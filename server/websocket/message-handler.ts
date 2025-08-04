import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { LeadProcessor } from '../services/lead-processor';
import { logger } from '../utils/logger';

// Performance monitoring for WebSocket connections
interface ConnectionMetrics {
  connectTime: number;
  messageCount: number;
  lastActivity: number;
  memoryUsage?: number;
}

interface ExtendedWebSocket {
  connectionId: string;
  sessionId: string | null;
  leadId: string | null;
  userId: string | null;
  metrics: ConnectionMetrics;
  pingTimer?: NodeJS.Timeout;
  cleanupHandlers: Array<() => void>;
}

export class WebSocketMessageHandler {
  private wss: WebSocketServer;
  private leadProcessor: LeadProcessor;
  private broadcastCallback: (data: any) => void;
  private connections: Map<string, ExtendedWebSocket> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private memoryMonitorInterval: NodeJS.Timeout;

  constructor(wss: WebSocketServer, leadProcessor: LeadProcessor, broadcastCallback: (data: any) => void) {
    this.wss = wss;
    this.leadProcessor = leadProcessor;
    this.broadcastCallback = broadcastCallback;
    
    // Start cleanup and monitoring intervals
    this.startPerformanceMonitoring();
    this.setupGlobalCleanup();
  }

  setupConnection(ws: any, req: any) {
    logger.info('New WebSocket connection established');
    
    // Store connection metadata with performance tracking
    const connectionId = nanoid();
    const extendedWs = ws as ExtendedWebSocket;
    extendedWs.connectionId = connectionId;
    extendedWs.sessionId = null;
    extendedWs.leadId = null;
    extendedWs.userId = null;
    extendedWs.metrics = {
      connectTime: Date.now(),
      messageCount: 0,
      lastActivity: Date.now()
    };
    extendedWs.cleanupHandlers = [];
    
    // Track connection
    this.connections.set(connectionId, extendedWs);
    
    // Set up ping/pong heartbeat
    this.setupHeartbeat(extendedWs);

    ws.on('message', async (message: Buffer) => {
      try {
        // Update activity tracking
        const extendedWs = ws as ExtendedWebSocket;
        extendedWs.metrics.messageCount++;
        extendedWs.metrics.lastActivity = Date.now();
        
        const data = JSON.parse(message.toString());
        logger.debug('WebSocket message received', { 
          connectionId: extendedWs.connectionId,
          messageCount: extendedWs.metrics.messageCount,
          data 
        });

        // Handle different message types
        switch (data.type) {
          case 'auth':
            await this.handleAuth(ws, data);
            break;
            
          case 'mark_notification_read':
            await this.handleMarkNotificationRead(ws, data);
            break;
            
          case 'mark_all_notifications_read':
            await this.handleMarkAllNotificationsRead(ws);
            break;
            
          case 'delete_notification':
            await this.handleDeleteNotification(ws, data);
            break;
            
          case 'agent_update':
            await this.handleAgentUpdate(data);
            break;
        
          case 'lead_update':
            await this.handleLeadUpdate(data);
            break;
            
          case 'process_lead':
            await this.handleProcessLead(data);
            break;
            
          case 'chat:init':
            await this.handleChatInit(ws, data);
            break;
            
          case 'chat:message':
            await this.handleChatMessage(ws, data);
            break;
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error as Error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });

    ws.on('close', () => {
      this.handleConnectionClose(ws);
    });
    
    // Handle pong messages for heartbeat
    ws.on('pong', () => {
      const extendedWs = ws as ExtendedWebSocket;
      extendedWs.metrics.lastActivity = Date.now();
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      logger.error('WebSocket connection error', {
        connectionId: (ws as ExtendedWebSocket).connectionId,
        error: error.message
      });
      this.handleConnectionClose(ws);
    });
  }

  private async handleAuth(ws: any, data: any) {
    // Associate user with WebSocket connection
    if (data.userId) {
      (ws as ExtendedWebSocket).userId = data.userId;
      // Register connection with feedback service if available
      logger.info('User authenticated', { userId: data.userId });
    }
  }

  private async handleMarkNotificationRead(ws: any, data: any) {
    if ((ws as ExtendedWebSocket).userId && data.notificationId) {
      logger.info('Marking notification as read', { 
        userId: (ws as ExtendedWebSocket).userId, 
        notificationId: data.notificationId 
      });
    }
  }

  private async handleMarkAllNotificationsRead(ws: any) {
    if ((ws as ExtendedWebSocket).userId) {
      logger.info('Marking all notifications as read', { 
        userId: (ws as ExtendedWebSocket).userId 
      });
    }
  }

  private async handleDeleteNotification(ws: any, data: any) {
    if ((ws as ExtendedWebSocket).userId && data.notificationId) {
      logger.info('Deleting notification', { 
        userId: (ws as ExtendedWebSocket).userId, 
        notificationId: data.notificationId 
      });
    }
  }

  private async handleAgentUpdate(data: any) {
    // Broadcast agent updates to all clients
    this.broadcastCallback({
      type: 'agent_update',
      agent: data.agent,
      message: data.message
    });
  }

  private async handleLeadUpdate(data: any) {
    // Handle lead status updates
    this.broadcastCallback({
      type: 'lead_update',
      leadId: data.leadId,
      status: data.status
    });
  }

  private async handleProcessLead(data: any) {
    // Manual trigger to process a lead
    if (data.leadId) {
      try {
        // Process lead if leadProcessor is available
        logger.info('Processing lead', { leadId: data.leadId });
        // Note: Lead processing would require repository access
      } catch (error) {
        logger.error('Error processing lead:', error as Error);
      }
    }
  }

  private async handleChatInit(ws: any, data: any) {
    // Initialize chat session
    (ws as ExtendedWebSocket).sessionId = data.sessionId;
    (ws as ExtendedWebSocket).leadId = data.leadId || 'anonymous';
    
    logger.info('Chat session initialized', { 
      sessionId: data.sessionId, 
      leadId: (ws as ExtendedWebSocket).leadId 
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'chat:connected',
      leadId: (ws as ExtendedWebSocket).leadId,
      conversationId: nanoid(),
      welcomeMessage: 'Hello! How can I help you today?'
    }));
  }

  private async handleChatMessage(ws: any, data: any) {
    // Show typing indicator
    ws.send(JSON.stringify({ type: 'chat:typing' }));
    
    // Find lead and conversation
    const leadId = (ws as ExtendedWebSocket).leadId;
    if (!leadId) {
      ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
      return;
    }
    
    logger.info('Processing chat message', { 
      leadId, 
      content: data.content 
    });
    
    // Simple echo response for now
    const response = `I received your message: "${data.content}". This is a basic response.`;
    
    // Send response
    ws.send(JSON.stringify({
      type: 'chat:message',
      id: nanoid(),
      content: response,
      sender: 'agent',
      timestamp: new Date(),
      quickReplies: []
    }));
    
    // Stop typing indicator
    ws.send(JSON.stringify({ type: 'chat:stopTyping' }));
  }

  private handleConnectionClose(ws: any) {
    const extendedWs = ws as ExtendedWebSocket;
    const connectionId = extendedWs.connectionId;
    const connectionDuration = Date.now() - extendedWs.metrics.connectTime;
    
    logger.info('WebSocket connection closed', {
      connectionId,
      duration: connectionDuration,
      messageCount: extendedWs.metrics.messageCount
    });
    
    // Run all cleanup handlers
    if (extendedWs.cleanupHandlers) {
      extendedWs.cleanupHandlers.forEach(handler => {
        try {
          handler();
        } catch (error) {
          logger.error('Error in cleanup handler', { error });
        }
      });
    }
    
    // Clear ping timer
    if (extendedWs.pingTimer) {
      clearInterval(extendedWs.pingTimer);
    }
    
    // Remove from connections map
    this.connections.delete(connectionId);
    
    // Notify if this was an active chat
    if (extendedWs.sessionId) {
      this.broadcastCallback({
        type: 'chat:disconnected',
        sessionId: extendedWs.sessionId,
        leadId: extendedWs.leadId
      });
    }
    
    // Force garbage collection if available
    if (global.gc && this.connections.size % 10 === 0) {
      global.gc();
    }
  }
  
  /**
   * Setup heartbeat mechanism to detect dead connections
   */
  private setupHeartbeat(ws: ExtendedWebSocket) {
    ws.pingTimer = setInterval(() => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.ping();
        
        // Check if connection is stale (no activity for 2 minutes)
        const timeSinceActivity = Date.now() - ws.metrics.lastActivity;
        if (timeSinceActivity > 120000) {
          logger.warn('Closing stale WebSocket connection', {
            connectionId: ws.connectionId,
            timeSinceActivity
          });
          ws.close(1001, 'Connection timeout');
        }
      }
    }, 30000); // Ping every 30 seconds
  }
  
  /**
   * Start performance monitoring for connections
   */
  private startPerformanceMonitoring() {
    this.memoryMonitorInterval = setInterval(() => {
      const connectionCount = this.connections.size;
      const totalMessages = Array.from(this.connections.values())
        .reduce((sum, conn) => sum + conn.metrics.messageCount, 0);
      
      logger.debug('WebSocket performance metrics', {
        activeConnections: connectionCount,
        totalMessages,
        memoryUsage: process.memoryUsage()
      });
      
      // Alert if too many connections
      if (connectionCount > 100) {
        logger.warn('High WebSocket connection count', { connectionCount });
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Setup global cleanup handlers
   */
  private setupGlobalCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleConnections: string[] = [];
      
      this.connections.forEach((ws, connectionId) => {
        const timeSinceActivity = now - ws.metrics.lastActivity;
        
        // Mark connections inactive for more than 5 minutes as stale
        if (timeSinceActivity > 300000 && ws.readyState !== 1) {
          staleConnections.push(connectionId);
        }
      });
      
      // Clean up stale connections
      staleConnections.forEach(connectionId => {
        const ws = this.connections.get(connectionId);
        if (ws) {
          logger.info('Cleaning up stale WebSocket connection', { connectionId });
          this.handleConnectionClose(ws);
        }
      });
    }, 120000); // Check every 2 minutes
  }
  
  /**
   * Get connection statistics
   */
  public getConnectionStats() {
    const connections = Array.from(this.connections.values());
    const now = Date.now();
    
    return {
      totalConnections: connections.length,
      totalMessages: connections.reduce((sum, conn) => sum + conn.metrics.messageCount, 0),
      averageConnectionAge: connections.length > 0 
        ? connections.reduce((sum, conn) => sum + (now - conn.metrics.connectTime), 0) / connections.length 
        : 0,
      staleConnections: connections.filter(conn => (now - conn.metrics.lastActivity) > 300000).length
    };
  }
  
  /**
   * Cleanup all resources
   */
  public cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    // Close all connections
    this.connections.forEach((ws) => {
      this.handleConnectionClose(ws);
    });
    
    this.connections.clear();
  }
}