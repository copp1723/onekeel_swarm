import { WebSocketMessageHandler } from './message-handler';
import { WebSocketServer } from 'ws';
import { SecureWebSocketServer } from '../../security-hardening/websocket-security';
import { LeadProcessor } from '../services/lead-processor';
import { logger } from '../utils/logger';

/**
 * Secure WebSocket Message Handler
 * Extends the base message handler with additional security features
 */
export class SecureWebSocketMessageHandler extends WebSocketMessageHandler {
  private secureWss?: SecureWebSocketServer;

  constructor() {
    super();
  }

  // Method to upgrade with security features when needed
  public upgradeWithSecurity(wss: WebSocketServer, leadProcessor: LeadProcessor, broadcastCallback: (data: any) => void) {
    // Initialize secure WebSocket server with security configuration
    this.secureWss = new SecureWebSocketServer(wss, {
      maxConnectionsPerUser: 5,
      maxMessageSize: 65536, // 64KB
      maxMessagesPerMinute: 60,
      heartbeatInterval: 30000,
      connectionTimeout: 60000,
      requireAuthentication: true,
      allowedOrigins: process.env.CORS_ORIGIN?.split(',') || []
    });
    
    // Set up message handling
    this.setupSecureMessageHandlers();
  }
  
  private setupSecureMessageHandlers() {
    if (!this.secureWss) return;
    
    // Override the default message handler to integrate with existing functionality
    const originalHandleMessage = this.secureWss['handleMessage'].bind(this.secureWss);
    
    this.secureWss['handleMessage'] = async (ws: any, message: any, request: any) => {
      // Call original security checks
      await originalHandleMessage(ws, message, request);
      
      // Handle our application-specific message types
      try {
        switch (message.type) {
          case 'mark_notification_read':
            await this.handleMarkNotificationRead(ws, message);
            break;
            
          case 'mark_all_notifications_read':
            await this.handleMarkAllNotificationsRead(ws);
            break;
            
          case 'delete_notification':
            await this.handleDeleteNotification(ws, message);
            break;
            
          case 'agent_update':
            await this.handleAgentUpdate(message);
            break;
        
          case 'lead_update':
            await this.handleLeadUpdate(message);
            break;
            
          case 'process_lead':
            await this.handleProcessLead(message);
            break;
            
          case 'chat:init':
            await this.handleChatInit(ws, message);
            break;
            
          case 'chat:message':
            await this.handleChatMessage(ws, message);
            break;
        }
      } catch (error) {
        logger.error('Error processing secure WebSocket message:', error as Error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    };
  }
  
  private async handleMarkNotificationRead(ws: any, data: any) {
    if (ws.userId && data.notificationId) {
      logger.info('Marking notification as read', { 
        userId: ws.userId, 
        notificationId: data.notificationId 
      });
      // Implement notification marking logic
    }
  }

  private async handleMarkAllNotificationsRead(ws: any) {
    if (ws.userId) {
      logger.info('Marking all notifications as read', { 
        userId: ws.userId 
      });
      // Implement notification marking logic
    }
  }

  private async handleDeleteNotification(ws: any, data: any) {
    if (ws.userId && data.notificationId) {
      logger.info('Deleting notification', { 
        userId: ws.userId, 
        notificationId: data.notificationId 
      });
      // Implement notification deletion logic
    }
  }

  private async handleAgentUpdate(data: any) {
    // Broadcast agent updates to authenticated clients only
    if (this.secureWss) {
      this.secureWss.broadcast({
        type: 'agent_update',
        agent: data.agent,
        message: data.message
      });
    }
  }

  private async handleLeadUpdate(data: any) {
    // Handle lead status updates
    if (this.secureWss) {
      this.secureWss.broadcast({
        type: 'lead_update',
        leadId: data.leadId,
        status: data.status
      });
    }
  }

  private async handleProcessLead(data: any) {
    // Manual trigger to process a lead
    if (data.leadId) {
      try {
        logger.info('Processing lead', { leadId: data.leadId });
        // Lead processing logic here
      } catch (error) {
        logger.error('Error processing lead:', error as Error);
      }
    }
  }

  private async handleChatInit(ws: any, data: any) {
    // Initialize chat session for authenticated user
    const sessionId = data.sessionId;
    const leadId = data.leadId || `user_${ws.userId}`;
    
    logger.info('Chat session initialized', { 
      sessionId, 
      leadId,
      userId: ws.userId 
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'chat:connected',
      leadId,
      conversationId: `conv_${Date.now()}`,
      welcomeMessage: 'Hello! How can I help you today?'
    }));
  }

  private async handleChatMessage(ws: any, data: any) {
    // Show typing indicator
    ws.send(JSON.stringify({ type: 'chat:typing' }));
    
    const leadId = `user_${ws.userId}`;
    
    logger.info('Processing chat message', { 
      leadId, 
      userId: ws.userId,
      content: data.content 
    });
    
    // Process message (integrate with your chat agent)
    const response = `I received your message: "${data.content}". This is a secure response.`;
    
    // Send response
    ws.send(JSON.stringify({
      type: 'chat:message',
      id: `msg_${Date.now()}`,
      content: response,
      sender: 'agent',
      timestamp: new Date(),
      quickReplies: []
    }));
    
    // Stop typing indicator
    ws.send(JSON.stringify({ type: 'chat:stopTyping' }));
  }
  
  // Public methods for external use
  public broadcast(message: any) {
    if (this.secureWss) {
      this.secureWss.broadcast(message);
    } else {
      super.broadcast(message);
    }
  }
  
  public sendToUser(userId: string, message: any) {
    if (this.secureWss) {
      this.secureWss.sendToUser(userId, message);
    }
  }
  
  public getMetrics() {
    if (this.secureWss) {
      return this.secureWss.getMetrics();
    }
    return null;
  }
}