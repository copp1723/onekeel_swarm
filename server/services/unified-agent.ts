import { mailgunService } from './mailgun-enhanced';
import { smsService } from './sms-service';
import { handoverService } from './handover-service';
import { logger } from '../utils/logger';

export interface AgentConfig {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'chat' | 'multi-channel';
  systemPrompt: string;
  responseTemplate?: string;
  maxResponseLength?: number;
  handoverThreshold?: number;
  keywords?: string[];
  goals?: string[];
  personality?: {
    tone: 'professional' | 'friendly' | 'casual' | 'formal';
    style: 'concise' | 'detailed' | 'conversational';
  };
  capabilities?: {
    canSchedule?: boolean;
    canQualify?: boolean;
    canHandover?: boolean;
    canEscalate?: boolean;
  };
}

export interface ConversationContext {
  leadId: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  channel: 'email' | 'sms' | 'chat';
  messages: Array<{
    role: 'agent' | 'lead' | 'system';
    content: string;
    timestamp: string;
  }>;
  metadata?: Record<string, any>;
  qualificationScore?: number;
  campaignId?: string;
  startedAt?: Date;
}

export class UnifiedAgent {
  private config: AgentConfig;
  private openRouterApiKey: string;

  constructor(config: AgentConfig) {
    this.config = config;
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
    
    if (!this.openRouterApiKey) {
      logger.warn('OpenRouter API key not configured - AI responses will use templates');
    }
  }

  /**
   * Process an incoming message and generate a response
   */
  async processMessage(
    message: string,
    context: ConversationContext
  ): Promise<{
    response: string;
    shouldHandover: boolean;
    metadata?: Record<string, any>;
  }> {
    try {
      // Update conversation context
      context.messages.push({
        role: 'lead',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Check for handover triggers
      const handoverCheck = await this.checkHandoverTriggers(message, context);
      if (handoverCheck.shouldHandover) {
        return {
          response: this.generateHandoverMessage(),
          shouldHandover: true,
          metadata: handoverCheck.metadata
        };
      }

      // Generate AI response
      const response = await this.generateResponse(message, context);

      // Update context with agent response
      context.messages.push({
        role: 'agent',
        content: response,
        timestamp: new Date().toISOString()
      });

      // Update qualification score
      const newScore = await this.updateQualificationScore(context);

      return {
        response,
        shouldHandover: false,
        metadata: {
          qualificationScore: newScore,
          messageCount: context.messages.length
        }
      };
    } catch (error) {
      logger.error('Error processing message', { error: error as Error });
      return {
        response: this.getFallbackResponse(),
        shouldHandover: false
      };
    }
  }

  /**
   * Generate a response using AI or templates
   */
  private async generateResponse(
    message: string,
    context: ConversationContext
  ): Promise<string> {
    // If no API key, use template-based responses
    if (!this.openRouterApiKey) {
      return this.generateTemplateResponse(message, context);
    }

    try {
      // Build conversation history
      const conversationHistory = context.messages
        .slice(-5) // Last 5 messages for context
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      // Create prompt
      const prompt = `${this.config.systemPrompt}

Conversation History:
${conversationHistory}

Lead Information:
- Name: ${context.leadName || 'Unknown'}
- Channel: ${context.channel}
- Qualification Score: ${context.qualificationScore || 0}/10

Current Message from Lead: "${message}"

Generate a ${this.config.personality?.style || 'conversational'} response that:
1. Addresses their message directly
2. Moves toward campaign goals: ${this.config.goals?.join(', ') || 'General engagement'}
3. Maintains a ${this.config.personality?.tone || 'friendly'} tone
4. ${this.config.maxResponseLength ? `Stays under ${this.config.maxResponseLength} characters` : ''}

Response:`;

      // Call OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://onekeel-swarm.com',
          'X-Title': 'OneKeel Swarm Agent'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            { role: 'system', content: this.config.systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating AI response', { error: error as Error });
      return this.generateTemplateResponse(message, context);
    }
  }

  /**
   * Generate template-based response when AI is not available
   */
  private generateTemplateResponse(
    message: string,
    context: ConversationContext
  ): string {
    const messageLower = message.toLowerCase();
    const name = context.leadName || 'there';

    // Channel-specific responses
    if (context.channel === 'sms') {
      if (messageLower.includes('yes') || messageLower.includes('interested')) {
        return `Great, ${name}! When would be a good time for a quick call? Reply with your preferred time.`;
      }
      if (messageLower.includes('price') || messageLower.includes('cost')) {
        return `Happy to discuss pricing! Can we schedule a brief call? What time works best for you?`;
      }
      return `Thanks for your message, ${name}. How can I help you today?`;
    }

    // Email responses
    if (context.channel === 'email') {
      if (messageLower.includes('information') || messageLower.includes('details')) {
        return `Hi ${name},\n\nThank you for your interest! I'd be happy to provide more information. Could you let me know specifically what aspects you'd like to learn more about?\n\nLooking forward to your response.\n\nBest regards,\n${this.config.name}`;
      }
      return `Hi ${name},\n\nThank you for reaching out. I've received your message and would love to help. What specific questions can I answer for you?\n\nBest regards,\n${this.config.name}`;
    }

    // Default response
    return `Thank you for your message, ${name}. How can I assist you today?`;
  }

  /**
   * Check if handover should be triggered
   */
  private async checkHandoverTriggers(
    message: string,
    context: ConversationContext
  ): Promise<{ shouldHandover: boolean; metadata?: Record<string, any> }> {
    const messageLower = message.toLowerCase();

    // Check explicit handover requests
    const handoverPhrases = [
      'speak to human',
      'talk to someone',
      'real person',
      'human agent',
      'manager',
      'supervisor'
    ];

    if (handoverPhrases.some(phrase => messageLower.includes(phrase))) {
      return {
        shouldHandover: true,
        metadata: { reason: 'explicit_request' }
      };
    }

    // Check qualification score threshold
    if (this.config.handoverThreshold && context.qualificationScore) {
      if (context.qualificationScore >= this.config.handoverThreshold) {
        return {
          shouldHandover: true,
          metadata: { reason: 'qualification_threshold' }
        };
      }
    }

    // Check conversation length
    if (context.messages.length > 15) {
      return {
        shouldHandover: true,
        metadata: { reason: 'conversation_length' }
      };
    }

    // Check for frustration indicators
    const frustrationIndicators = ['not working', 'frustrated', 'annoyed', 'waste of time'];
    if (frustrationIndicators.some(indicator => messageLower.includes(indicator))) {
      return {
        shouldHandover: true,
        metadata: { reason: 'frustration_detected' }
      };
    }

    return { shouldHandover: false };
  }

  /**
   * Update qualification score based on conversation
   */
  private async updateQualificationScore(context: ConversationContext): Promise<number> {
    let score = context.qualificationScore || 0;
    const latestMessage = context.messages[context.messages.length - 2]; // Lead's latest message

    if (!latestMessage || latestMessage.role !== 'lead') return score;

    const messageLower = latestMessage.content.toLowerCase();

    // Positive indicators
    if (messageLower.includes('interested') || messageLower.includes('yes')) score += 1;
    if (messageLower.includes('budget') || messageLower.includes('afford')) score += 2;
    if (messageLower.includes('when') || messageLower.includes('how soon')) score += 1;
    if (messageLower.includes('buy') || messageLower.includes('purchase')) score += 2;

    // Contact information provided
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
    if (emailRegex.test(latestMessage.content)) score += 1;
    if (phoneRegex.test(latestMessage.content)) score += 1;

    // Cap at 10
    return Math.min(score, 10);
  }

  /**
   * Send a message through the appropriate channel
   */
  async sendMessage(
    recipient: string,
    message: string,
    channel: 'email' | 'sms',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      if (channel === 'email') {
        await mailgunService.sendEmail({
          to: recipient,
          subject: metadata?.subject || 'Message from ' + this.config.name,
          text: message,
          html: message.replace(/\n/g, '<br>')
        });
        return true;
      } else if (channel === 'sms') {
        await smsService.sendSMS({
          to: recipient,
          body: message,
          leadId: metadata?.leadId,
          campaignId: metadata?.campaignId
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error sending message', { error: error as Error, channel, recipient });
      return false;
    }
  }

  /**
   * Trigger handover process
   */
  async triggerHandover(
    context: ConversationContext,
    reason: string
  ): Promise<boolean> {
    try {
      const evaluation = await handoverService.evaluateHandover(context, context.campaignId);
      
      if (evaluation.shouldHandover || reason === 'manual') {
        return await handoverService.executeHandover(
          context.leadId,
          evaluation,
          context,
          context.campaignId
        );
      }
      
      return false;
    } catch (error) {
      logger.error('Error triggering handover', { error: error as Error });
      return false;
    }
  }

  /**
   * Generate handover message
   */
  private generateHandoverMessage(): string {
    return "I'll connect you with a human agent right away who can better assist you. They'll be with you shortly and will have the full context of our conversation. Thank you for your patience!";
  }

  /**
   * Get fallback response on error
   */
  private getFallbackResponse(): string {
    return "I apologize, but I'm having trouble processing your message right now. Could you please try again or let me know if you'd prefer to speak with a human agent?";
  }

  /**
   * Update agent configuration
   */
  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Agent configuration updated', { agentId: this.config.id });
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }
}

// Factory function to create agents with different configurations
export function createAgent(type: 'email' | 'sms' | 'chat', customConfig?: Partial<AgentConfig>): UnifiedAgent {
  const baseConfigs: Record<string, AgentConfig> = {
    email: {
      id: 'email-agent',
      name: 'Email Assistant',
      type: 'email',
      systemPrompt: 'You are a professional email assistant helping customers with their inquiries.',
      maxResponseLength: 1000,
      handoverThreshold: 7,
      personality: {
        tone: 'professional',
        style: 'detailed'
      },
      capabilities: {
        canSchedule: true,
        canQualify: true,
        canHandover: true
      }
    },
    sms: {
      id: 'sms-agent',
      name: 'SMS Assistant',
      type: 'sms',
      systemPrompt: 'You are a friendly SMS assistant. Keep responses brief and conversational.',
      maxResponseLength: 160,
      handoverThreshold: 6,
      personality: {
        tone: 'friendly',
        style: 'concise'
      },
      capabilities: {
        canSchedule: true,
        canQualify: true,
        canHandover: true
      }
    },
    chat: {
      id: 'chat-agent',
      name: 'Chat Assistant',
      type: 'chat',
      systemPrompt: 'You are a helpful chat assistant providing real-time support.',
      maxResponseLength: 500,
      handoverThreshold: 6,
      personality: {
        tone: 'casual',
        style: 'conversational'
      },
      capabilities: {
        canSchedule: true,
        canQualify: true,
        canHandover: true,
        canEscalate: true
      }
    }
  };

  const config = { ...baseConfigs[type], ...customConfig };
  return new UnifiedAgent(config);
}