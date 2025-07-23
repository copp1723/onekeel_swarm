import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { mailgunService } from '../../email-system/services/mailgun-service';
import { CCLLogger } from '../utils/logger';

export class EmailAgent extends BaseAgent {
  constructor() {
    super('email');
  }

  // Override getMockResponse for email-specific mock behavior
  protected getMockResponse(prompt: string): string {
    if (prompt.includes('initial email') || prompt.includes('first contact')) {
      return `Hello! Thank you for your interest in our services. We're excited to learn more about your needs and how we can help you. 

I noticed you're interested in getting more information. Could you tell me a bit more about what you're looking for?

Best regards,
CCL-3 Team`;
    }
    
    if (prompt.includes('response to this customer email')) {
      return `Thank you for your message! I understand your interest and I'm here to help. Let me address your questions and provide you with the information you need.

Based on what you've shared, I believe we can definitely assist you. Would you like to schedule a brief call to discuss your specific requirements?

Looking forward to hearing from you!`;
    }
    
    return super.getMockResponse(prompt);
  }

  async processMessage(message: string, context: AgentContext): Promise<string> {
    const { lead, campaign } = context;
    
    // Store incoming message in supermemory
    await this.storeMemory(`Email from ${lead.firstName || ''} ${lead.lastName || ''}: ${message}`, {
      leadId: lead.id,
      type: 'email_received',
      source: lead.source
    });

    // Search for previous email interactions
    const memories = await this.searchMemory(`email ${lead.firstName || ''} ${lead.lastName || ''} ${lead.id}`);
    const emailHistory = memories.filter(m => m.metadata?.type?.includes('email')).slice(0, 3);
    
    const systemPrompt = `You are an Email Agent communicating with a potential customer.
Your goal is to engage them professionally and move them towards the campaign goals.
Campaign Goals: ${campaign?.goals?.join(', ') || 'General engagement'}
Be friendly, helpful, and focus on understanding their needs.

Previous interactions: ${emailHistory.map(h => h.content).join('\n')}`;

    const prompt = `Generate a response to this customer email:
Customer Name: ${lead.firstName || ''} ${lead.lastName || ''}
Their Message: "${message}"

Context:
- They came from: ${lead.source}
- Campaign: ${lead.campaign || 'General inquiry'}

Create a professional, engaging email response that:
1. Addresses their message directly
2. Moves towards campaign goals
3. Asks relevant qualifying questions
4. Maintains a helpful, non-pushy tone`;

    const response = await this.generateResponse(
      prompt,
      systemPrompt,
      {
        leadId: lead.id,
        leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        type: 'email_sent',
        metadata: { campaign: campaign?.name }
      }
    );

    return response;
  }

  async makeDecision(_context: AgentContext): Promise<AgentDecision> {
    // Email agent doesn't make strategic decisions, that's Overlord's job
    return {
      action: 'send_email',
      reasoning: 'Email agent executing communication task',
      data: {}
    };
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<any> {
    try {
      // Check if Mailgun is configured
      if (!mailgunService.isConfigured()) {
        CCLLogger.info('Email agent simulated send - Mailgun not configured', { to, subject, reason: 'Mailgun not configured' });
        const mockResponse = {
          id: `mock-${Date.now()}@example.com`,
          message: 'Simulated email send (Mailgun not configured)'
        };
        CCLLogger.info('Email communication sent (mock)', { recipient: to, subject, mock: true });
        return mockResponse;
      }

      // Use centralized mailgun service
      const response = await mailgunService.sendEmail({
        to,
        subject,
        text: text || '',
        html: html || text
      });
      
      // Store successful email send in supermemory
      await this.storeMemory(`Email sent to ${to}: ${subject}`, {
        recipient: to,
        subject,
        type: 'email_delivery',
        status: 'sent',
        externalId: response.id
      });
      
      CCLLogger.info('Email communication sent', { recipient: to, subject, externalId: response.id });
      return response;
    } catch (error) {
      CCLLogger.error('Email communication failed', { recipient: to, subject, error: (error as Error).message });
      // Return mock response instead of throwing
      return {
        id: `mock-error-${Date.now()}@example.com`,
        message: 'Email send failed, returning mock response',
        error: (error as Error).message
      };
    }
  }

  async generateInitialEmail(context: AgentContext, focus: string): Promise<string> {
    const { lead } = context;
    
    // Search for similar leads or previous campaigns for context
    const memories = await this.searchMemory(`initial email ${lead.source} ${focus}`);
    const similarInteractions = memories.slice(0, 2).map(m => m.content).join('\n');
    
    const systemPrompt = `You are crafting the first email to a potential customer.
Make it welcoming, professional, and focused on understanding their needs.

Similar successful interactions: ${similarInteractions}`;

    const prompt = `Create an initial email for:
Customer Name: ${lead.firstName || ''} ${lead.lastName || ''}
Source: ${lead.source}
Focus Area: ${focus}

The email should:
1. Thank them for their interest
2. Briefly introduce how you can help
3. Ask an engaging question related to the focus area
4. Be concise (under 150 words)
5. End with a clear call-to-action`;

    const email = await this.generateResponse(
      prompt,
      systemPrompt,
      {
        leadId: lead.id,
        leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
        type: 'initial_email',
        metadata: { focus, source: lead.source }
      }
    );

    return email;
  }
}