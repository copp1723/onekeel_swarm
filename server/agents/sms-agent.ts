import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import twilio from 'twilio';
import { CCLLogger } from '../utils/logger';
import { executeWithTwilioBreaker } from '../utils/circuit-breaker';

export class SMSAgent extends BaseAgent {
  private twilioClient: any;
  private fromNumber: string;

  constructor() {
    super('sms');
    
    // Initialize Twilio only if credentials are available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    } else {
      CCLLogger.info('SMS agent using Twilio fallback - No credentials found, SMS sending will be simulated', { reason: 'No credentials found' });
      this.twilioClient = null;
      this.fromNumber = '';
    }
  }

  // Override getMockResponse for SMS-specific mock behavior
  protected getMockResponse(prompt: string): string {
    if (prompt.includes('initial SMS') || prompt.includes('first contact')) {
      return `Hi! Thanks for your interest. We'd love to help with your needs. Reply YES to learn more or call us at 1-800-EXAMPLE.`;
    }
    
    if (prompt.includes('SMS response')) {
      return `Thanks for your reply! We can definitely help with that. When would be a good time for a quick call to discuss?`;
    }
    
    return super.getMockResponse(prompt);
  }

  async processMessage(message: string, context: AgentContext): Promise<string> {
    const { lead, campaign } = context;
    
    // Store incoming SMS in supermemory
    await this.storeMemory(`SMS from ${lead.firstName || ''} ${lead.lastName || ''}: ${message}`, {
      leadId: lead.id,
      type: 'sms_received',
      phone: lead.phone
    });

    // Search for previous SMS interactions
    const memories = await this.searchMemory(`SMS ${lead.firstName || ''} ${lead.lastName || ''} ${lead.phone}`);
    const smsHistory = memories.filter(m => m.metadata?.type?.includes('sms')).slice(0, 2);
    
    const systemPrompt = `You are an SMS Agent communicating with a potential customer via text message.
Keep responses brief, friendly, and focused on the campaign goals.
Campaign Goals: ${campaign?.goals?.join(', ') || 'General engagement'}
SMS messages should be under 160 characters when possible.

Previous SMS: ${smsHistory.map(h => h.content).join('\n')}`;

    const prompt = `Generate a brief SMS response:
Customer Name: ${lead.firstName || ''} ${lead.lastName || ''}
Their Message: "${message}"

Context:
- Source: ${lead.source}
- Campaign: ${lead.campaign || 'General'}

Create a concise, friendly text that:
1. Addresses their message
2. Moves towards campaign goals
3. Uses conversational language
4. Stays under 160 characters if possible`;

    const response = await this.callOpenRouter(prompt, systemPrompt);
    
    // Store outgoing SMS in supermemory
    await this.storeMemory(`SMS response to ${lead.firstName || ''} ${lead.lastName || ''}: ${response}`, {
      leadId: lead.id,
      type: 'sms_sent',
      campaign: campaign?.name
    });

    return response;
  }

  async makeDecision(_context: AgentContext): Promise<AgentDecision> {
    return {
      action: 'send_sms',
      reasoning: 'SMS agent executing communication task',
      data: {}
    };
  }

  async sendSMS(to: string, body: string): Promise<any> {
    try {
      // Check if Twilio is configured
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !this.fromNumber) {
        CCLLogger.info('SMS agent simulated send - Twilio not configured', { to, reason: 'Twilio not configured' });
        const mockResponse = {
          sid: `mock-sms-${Date.now()}`,
          to: to,
          from: this.fromNumber || '+1234567890',
          body: body,
          status: 'sent',
          message: 'Simulated SMS send (Twilio not configured)'
        };
        CCLLogger.info('SMS communication sent (mock)', { recipient: to, body, mock: true });
        return mockResponse;
      }

      // Wrap Twilio API call with circuit breaker protection
      const message = await executeWithTwilioBreaker(async () => {
        return await this.twilioClient.messages.create({
          body: body,
          from: this.fromNumber,
          to: to
        });
      });
      
      // Store successful SMS send in supermemory
      await this.storeMemory(`SMS sent to ${to}: ${body}`, {
        recipient: to,
        type: 'sms_delivery',
        status: 'sent',
        externalId: message.sid
      });
      
      CCLLogger.info('SMS communication sent', { recipient: to, externalId: message.sid });
      return message;
    } catch (error) {
      CCLLogger.error('SMS communication failed', { recipient: to, error: (error as Error).message });
      // Return mock response instead of throwing
      return {
        sid: `mock-error-${Date.now()}`,
        to: to,
        from: this.fromNumber || '+1234567890',
        body: body,
        status: 'failed',
        message: 'SMS send failed, returning mock response',
        error: (error as Error).message
      };
    }
  }

  async generateInitialSMS(context: AgentContext, focus: string): Promise<string> {
    const { lead } = context;
    
    // Search for successful initial SMS patterns
    const memories = await this.searchMemory(`initial SMS ${focus}`);
    const successfulPatterns = memories.slice(0, 2).map(m => m.content).join('\n');
    
    const systemPrompt = `You are crafting the first SMS to a potential customer.
Keep it very brief, friendly, and engaging. Maximum 160 characters.

Successful patterns: ${successfulPatterns}`;

    const prompt = `Create an initial SMS for:
Customer Name: ${lead.firstName || ''} ${lead.lastName || ''}
Focus: ${focus}

The SMS should:
1. Greet them by name
2. Mention the focus area
3. Ask a simple engaging question
4. Be under 160 characters
5. Sound conversational, not robotic`;

    const sms = await this.callOpenRouter(prompt, systemPrompt);
    
    // Store initial SMS in supermemory
    await this.storeMemory(`Initial SMS to ${lead.firstName || ''} ${lead.lastName || ''}: ${sms}`, {
      leadId: lead.id,
      type: 'initial_sms',
      focus,
      phone: lead.phone
    });

    return sms;
  }
}