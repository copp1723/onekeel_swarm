import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { logger } from '../utils/logger';

/**
 * Chat Agent - Handles real-time chat communication
 * This is a stub implementation to restore system connectivity
 */
export class ChatAgent extends BaseAgent {
  private wsConnections: Map<string, any> = new Map();

  constructor() {
    super('chat');
  }

  /**
   * Send a chat message via WebSocket
   */
  async sendChatMessage(leadId: string, content: string, options?: any): Promise<any> {
    try {
      const leadKey = `lead_${leadId}`;
      const wsConnection = this.wsConnections.get(leadKey);

      if (wsConnection && wsConnection.readyState === 1) { // WebSocket.OPEN
        const message = {
          type: 'agent_message',
          content: content,
          timestamp: new Date().toISOString(),
          leadId: leadId,
          agentType: this.agentType,
          ...options
        };

        wsConnection.send(JSON.stringify(message));
        
        logger.info('ChatAgent: Message sent via WebSocket', { 
          leadId, 
          messageLength: content.length 
        });
        
        return {
          id: `chat-${Date.now()}`,
          content: content,
          channel: 'chat',
          status: 'delivered',
          timestamp: new Date().toISOString()
        };
      } else {
        logger.warn('ChatAgent: No active connection for lead', { leadId });
        
        // Return mock response indicating no active connection
        return {
          id: `chat-offline-${Date.now()}`,
          content: content,
          channel: 'chat',
          status: 'no_connection',
          message: 'Chat message queued - no active connection'
        };
      }
    } catch (error) {
      logger.error('ChatAgent: Failed to send chat message', {
        leadId,
        error: (error as Error).message
      });
      
      throw error;
    }
  }

  /**
   * Process incoming chat message
   */
  async processMessage(message: string, context: AgentContext): Promise<string> {
    const { lead } = context;
    
    // Store the message in supermemory
    await this.storeMemory(
      `Chat message from ${lead.firstName || ''} ${lead.lastName || ''}: ${message}`,
      {
        leadId: lead.id,
        type: 'chat_received',
        channel: 'chat'
      }
    );

    // Generate a contextual response
    const response = this.generateChatResponse(message, context);
    
    logger.info('ChatAgent: Processed chat message', {
      leadId: lead.id,
      messageLength: message.length,
      responseLength: response.length
    });

    return response;
  }

  /**
   * Make decision about chat handling
   */
  async makeDecision(context: AgentContext): Promise<AgentDecision> {
    const { lead } = context;
    
    return {
      action: 'send_chat_response',
      reasoning: 'Chat agent handling real-time conversation',
      data: {
        agentType: this.agentType,
        leadId: lead.id,
        channel: 'chat'
      }
    };
  }

  /**
   * Register a WebSocket connection for a lead
   */
  registerConnection(leadId: string, wsConnection: any): void {
    const leadKey = `lead_${leadId}`;
    this.wsConnections.set(leadKey, wsConnection);
    
    logger.info('ChatAgent: Connection registered', { leadId });

    // Clean up connection when it closes
    wsConnection.on('close', () => {
      this.wsConnections.delete(leadKey);
      logger.info('ChatAgent: Connection removed', { leadId });
    });

    // Handle connection errors
    wsConnection.on('error', (error: Error) => {
      logger.error('ChatAgent: WebSocket error', { leadId, error: error.message });
      this.wsConnections.delete(leadKey);
    });
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(leadId: string): void {
    const leadKey = `lead_${leadId}`;
    this.wsConnections.delete(leadKey);
    logger.info('ChatAgent: Connection manually removed', { leadId });
  }

  /**
   * Check if a lead has an active connection
   */
  hasActiveConnection(leadId: string): boolean {
    const leadKey = `lead_${leadId}`;
    const connection = this.wsConnections.get(leadKey);
    return connection && connection.readyState === 1;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): { total: number; active: number } {
    let active = 0;
    this.wsConnections.forEach(connection => {
      if (connection.readyState === 1) active++;
    });
    
    return {
      total: this.wsConnections.size,
      active
    };
  }

  /**
   * Generate contextual chat response
   */
  private generateChatResponse(message: string, context: AgentContext): string {
    const { lead } = context;
    const firstName = lead.firstName || 'there';
    
    // Handle common chat scenarios
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      return `Hi ${firstName}! Thanks for reaching out. How can I help you today?`;
    }
    
    if (message.toLowerCase().includes('price') || message.toLowerCase().includes('cost')) {
      return `Great question about pricing, ${firstName}! Let me connect you with someone who can give you detailed information about our options.`;
    }
    
    if (message.toLowerCase().includes('schedule') || message.toLowerCase().includes('appointment')) {
      return `I'd be happy to help you schedule something, ${firstName}! What type of appointment are you looking for?`;
    }
    
    if (message.toLowerCase().includes('help') || message.toLowerCase().includes('support')) {
      return `I'm here to help, ${firstName}! What specific question can I assist you with?`;
    }
    
    if (message.toLowerCase().includes('thank')) {
      return `You're very welcome, ${firstName}! Is there anything else I can help you with today?`;
    }
    
    // Default response
    return `Thanks for your message, ${firstName}! I want to make sure you get the best help possible. Let me connect you with someone who can assist you further.`;
  }

  /**
   * Mock response for development
   */
  protected getMockResponse(prompt: string): string {
    return `Chat Agent: I'll help you with real-time chat communication. I can manage WebSocket connections, send instant messages, and handle live conversations with leads.`;
  }
}
