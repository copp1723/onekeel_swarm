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
      CCLLogger.info(
        'SMS agent using Twilio fallback - No credentials found, SMS sending will be simulated',
        { reason: 'No credentials found' }
      );
      this.twilioClient = null;
      this.fromNumber = '';
    }
  }

  // Override getMockResponse for SMS-specific mock behavior
  protected getMockResponse(prompt: string): string {
    if (prompt.includes('initial SMS') || prompt.includes('first contact')) {
      return `Hey! Saw you're looking at vehicles. What's driving the search? Text back or call 1-800-EXAMPLE.`;
    }

    if (prompt.includes('SMS response')) {
      return `Got it. When works for a quick call to figure out what you need?`;
    }

    return super.getMockResponse(prompt);
  }

  async processMessage(
    message: string,
    context: AgentContext
  ): Promise<string> {
    const { lead, campaign } = context;

    // Store incoming SMS in supermemory
    await this.storeMemory(
      `SMS from ${lead.firstName || ''} ${lead.lastName || ''}: ${message}`,
      {
        leadId: lead.id,
        type: 'sms_received',
        phone: lead.phone,
      }
    );

    // Search for previous SMS interactions
    const memories = await this.searchMemory(
      `SMS ${lead.firstName || ''} ${lead.lastName || ''} ${lead.phone}`
    );
    const smsHistory = memories
      .filter(m => m.metadata?.type?.includes('sms'))
      .slice(0, 2);

    const systemPrompt = `You are a straight-talking automotive sales professional responding via SMS.

**Core Identity:**
You are an experienced automotive sales professional. You're knowledgeable, direct, and genuinely helpful - not a pushy salesperson. You talk like a real person who knows cars and understands that buying one is a big decision.

**SMS Communication Style:**
- **Be real.** Text like you would to a friend who's asking for car advice
- **Be direct.** No fluff, no corporate speak
- **Be helpful.** Figure out what they actually need
- **Be brief.** SMS should be under 160 characters when possible

**What You DON'T Do:**
- Don't use marketing speak
- Don't ask multiple questions in one text
- Don't sound like a robot
- Don't be overly enthusiastic about everything

Campaign Goals: ${campaign?.goals?.join(', ') || 'Help customers find the right vehicle'}
Previous SMS: ${smsHistory.map(h => h.content).join('\n')}`;

    const prompt = `Text response to:
Customer: ${lead.firstName || ''} ${lead.lastName || ''}
Their Message: "${message}"

Context:
- Source: ${lead.source}
- Campaign: ${lead.campaign || 'General'}

Write like a real person. Address what they said, be helpful, keep it short.`;

    const response = await this.callOpenRouter(prompt, systemPrompt);

    // Store outgoing SMS in supermemory
    await this.storeMemory(
      `SMS response to ${lead.firstName || ''} ${lead.lastName || ''}: ${response}`,
      {
        leadId: lead.id,
        type: 'sms_sent',
        campaign: campaign?.name,
      }
    );

    return response;
  }

  async makeDecision(_context: AgentContext): Promise<AgentDecision> {
    return {
      action: 'send_sms',
      reasoning: 'SMS agent executing communication task',
      data: {},
    };
  }

  async sendSMS(to: string, body: string): Promise<any> {
    try {
      // Check if Twilio is configured
      if (
        !process.env.TWILIO_ACCOUNT_SID ||
        !process.env.TWILIO_AUTH_TOKEN ||
        !this.fromNumber
      ) {
        CCLLogger.info('SMS agent simulated send - Twilio not configured', {
          to,
          reason: 'Twilio not configured',
        });
        const mockResponse = {
          sid: `mock-sms-${Date.now()}`,
          to: to,
          from: this.fromNumber || '+1234567890',
          body: body,
          status: 'sent',
          message: 'Simulated SMS send (Twilio not configured)',
        };
        CCLLogger.info('SMS communication sent (mock)', {
          recipient: to,
          body,
          mock: true,
        });
        return mockResponse;
      }

      // Wrap Twilio API call with circuit breaker protection
      const message = await executeWithTwilioBreaker(async () => {
        return await this.twilioClient.messages.create({
          body: body,
          from: this.fromNumber,
          to: to,
        });
      });

      // Store successful SMS send in supermemory
      await this.storeMemory(`SMS sent to ${to}: ${body}`, {
        recipient: to,
        type: 'sms_delivery',
        status: 'sent',
        externalId: message.sid,
      });

      CCLLogger.info('SMS communication sent', {
        recipient: to,
        externalId: message.sid,
      });
      return message;
    } catch (error) {
      CCLLogger.error('SMS communication failed', {
        recipient: to,
        error: (error as Error).message,
      });
      // Return mock response instead of throwing
      return {
        sid: `mock-error-${Date.now()}`,
        to: to,
        from: this.fromNumber || '+1234567890',
        body: body,
        status: 'failed',
        message: 'SMS send failed, returning mock response',
        error: (error as Error).message,
      };
    }
  }

  async generateInitialSMS(
    context: AgentContext,
    focus: string
  ): Promise<string> {
    const { lead } = context;

    // Search for successful initial SMS patterns
    const memories = await this.searchMemory(`initial SMS ${focus}`);
    const successfulPatterns = memories
      .slice(0, 2)
      .map(m => m.content)
      .join('\n');

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
    await this.storeMemory(
      `Initial SMS to ${lead.firstName || ''} ${lead.lastName || ''}: ${sms}`,
      {
        leadId: lead.id,
        type: 'initial_sms',
        focus,
        phone: lead.phone,
      }
    );

    return sms;
  }
}
