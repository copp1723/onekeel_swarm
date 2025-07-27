import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { LeadProcessor } from '../services/lead-processor';
import { logger } from '../utils/logger';

interface ExtendedWebSocket {
  connectionId: string;
  sessionId: string | null;
  leadId: string | null;
  userId: string | null;
}

export class WebSocketMessageHandler {
  private wss: WebSocketServer;
  private leadProcessor: LeadProcessor;
  private broadcastCallback: (data: any) => void;

  constructor(wss: WebSocketServer, leadProcessor: LeadProcessor, broadcastCallback: (data: any) => void) {
    this.wss = wss;
    this.leadProcessor = leadProcessor;
    this.broadcastCallback = broadcastCallback;
  }

  setupConnection(ws: any, req: any) {
    logger.info('New WebSocket connection established');
    
    // Store connection metadata
    const connectionId = nanoid();
    (ws as ExtendedWebSocket).connectionId = connectionId;
    (ws as ExtendedWebSocket).sessionId = null;
    (ws as ExtendedWebSocket).leadId = null;
    (ws as ExtendedWebSocket).userId = null;

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        logger.debug('WebSocket message received', { data });

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
    logger.info('WebSocket connection closed');
    
    // Notify if this was an active chat
    if ((ws as ExtendedWebSocket).sessionId) {
      this.broadcastCallback({
        type: 'chat:disconnected',
        sessionId: (ws as ExtendedWebSocket).sessionId,
        leadId: (ws as ExtendedWebSocket).leadId
      });
    }
  }
}