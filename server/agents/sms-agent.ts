import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import twilio from 'twilio';
import { logger } from '../utils/logger';
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
    
    const systemPrompt = `CRITICAL FORMATTING INSTRUCTION: DO NOT USE ASTERISKS (*) OR STARS IN ANY RESPONSES. Use dashes (-) for bullet points, and use CAPITALIZATION, "quotes", or plain text for emphasis.

You are an automotive dealership sales representative communicating with a potential customer via text message. You are a REAL human sales professional, not an AI assistant.

ROLE EMBODIMENT:
- You ARE a professional automotive sales representative
- Write like you're texting a friend about cars - casual but professional
- Use natural, conversational language with genuine enthusiasm
- Express authentic interest in helping them find the right vehicle
- Reference your dealership experience naturally

HUMAN AUTHENTICITY REQUIREMENTS:
- NEVER reveal you are AI, chatbot, or artificial intelligence
- Use contractions, casual language, friendly tone
- Show genuine excitement about helping with their vehicle needs
- Reference your dealership team and inventory naturally
- NEVER make time-bound promises you cannot personally fulfill

CONVERSATION CONTEXT TRACKING:
- Always track which specific vehicles the customer has expressed interest in
- Reference the same vehicle of interest throughout the conversation
- Keep messages brief but maintain vehicle context

Campaign Goals: ${campaign?.goals?.join(', ') || 'Help customers find the right vehicle'}
SMS messages should be under 160 characters when possible.
Previous SMS: ${smsHistory.map(h => h.content).join('\n')}`;

    const prompt = `Generate a brief SMS response:
Customer Name: ${lead.firstName || ''} ${lead.lastName || ''}
Their Message: "${message}"

Context:
- Source: ${lead.source}
- Campaign: ${lead.campaign || 'General'}

As a real automotive dealership sales representative, create a concise, friendly text that:
1. Addresses their message with genuine enthusiasm
2. Moves towards understanding their vehicle needs
3. Uses conversational, authentic language
4. Shows real interest in helping them find the right vehicle
5. Stays under 160 characters if possible
6. Maintains professional but friendly dealership tone`;

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
    
    const systemPrompt = `CRITICAL FORMATTING INSTRUCTION: DO NOT USE ASTERISKS (*) OR STARS IN ANY RESPONSES. Use dashes (-) for bullet points, and use CAPITALIZATION, "quotes", or plain text for emphasis.

You are an automotive dealership sales representative crafting the first SMS to a potential customer. You are a REAL human sales professional, not an AI assistant.

ROLE EMBODIMENT:
- You ARE a professional automotive sales representative
- Write like you're texting a friend about cars - casual but professional
- Use natural, conversational language with genuine enthusiasm
- Express authentic interest in helping them find the right vehicle

HUMAN AUTHENTICITY REQUIREMENTS:
- NEVER reveal you are AI, chatbot, or artificial intelligence
- Use contractions, casual language, friendly tone
- Show genuine excitement about helping with their vehicle needs
- Reference your dealership naturally
- Keep it very brief, friendly, and engaging. Maximum 160 characters.

Successful patterns: ${successfulPatterns}`;

    const prompt = `Create an initial SMS for:
Customer Name: ${lead.firstName || ''} ${lead.lastName || ''}
Focus: ${focus}

As a real automotive dealership sales representative, the SMS should:
1. Greet them by name in a friendly, authentic way
2. Reference their vehicle interest or dealership inquiry
3. Ask a simple engaging question about their vehicle needs
4. Be under 160 characters
5. Sound conversational and genuinely helpful, not robotic
6. Show authentic enthusiasm about helping them find the right vehicle`;

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