import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { MailgunService } from '../services/email/providers/mailgun';
import { CCLLogger } from '../utils/logger';

export class EmailAgent extends BaseAgent {
  constructor() {
    super('email');
  }

  /**
   * Generate a sophisticated 5-email campaign sequence
   */
  async generateCampaignSequence(details: {
    campaignName: string;
    goal: string;
    context: string;
    product: string;
    benefits: string[];
    priceAngle: string;
    urgency: string;
    disclaimer: string;
    primaryCTA: string;
    CTAurl: string;
  }): Promise<Array<{subject: string; body: string; order: number}>> {
    const systemPrompt = `You are a warm, sharp finance insider who writes like a real person helping a close friend.  
- Ultra-scannable paragraphs (2-3 short lines each).  
- Conversational language, contractions, no jargon.  
- First message = curiosity & empathy, not pitch.  
- Each email escalates ONE angle (value, objection, scarcity, personal, final).  
- Zero hype, zero clichés.  
- MUST include placeholders {firstName} and {agentName}.  
- 60-120 words max per email.
- Markdown link style ONLY for CTAs: [CTA text](URL).`;

    const userPrompt = `Write a 5-email cold-outreach sequence for customers who may like "${details.product}".

Goal context: ${details.context}
(overall user goal: ${details.goal})

Key details to weave in naturally:
- Core benefits: ${details.benefits.join(', ')}
- Price angle: ${details.priceAngle}
- Natural urgency point: ${details.urgency}
- CTA link: ${details.CTAurl || '#'}
- Disclaimer (add as 1-line footer in email 5 only, italic): ${details.disclaimer}

Each email should follow this progression:
1. **Email 1 (Curiosity & Value):** Open with empathy, hint at value, soft question
2. **Email 2 (Address Objection):** Tackle common doubt, add social proof
3. **Email 3 (Urgency):** Time-sensitive angle, but genuine
4. **Email 4 (Personal Ask):** Direct but respectful main push
5. **Email 5 (Breakup):** Final chance, understanding tone

OUTPUT ONLY a valid JSON array, nothing else:
[
  {
    "subject": "Quick question about your [relevant topic]...",
    "body": "Hi {firstName},\n\n[2-3 line opener with empathy/curiosity]\n\n[1-2 line value hint]\n\n[Soft CTA or question]\n\n{agentName}"
  },
  ... (5 total emails)
]`;

    try {
      const raw = await this.generateResponse(
        userPrompt,
        { 
          type: 'campaign_sequence_generation', 
          campaignName: details.campaignName,
          systemPrompt 
        }
      );

      const cleanJson = raw.trim();
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : cleanJson;
      
      const sequence = JSON.parse(jsonStr);
      
      if (!Array.isArray(sequence) || sequence.length !== 5) {
        throw new Error('Invalid sequence structure');
      }
      
      return sequence.map((email: any, i: number) => ({
        subject: email.subject || `Email ${i + 1}`,
        body: email.body || 'Template content',
        order: i + 1
      }));
    } catch (error) {
      console.error('Failed to generate campaign sequence', error);
      // Return sensible fallback
      return this.generateFallbackSequence(details);
    }
  }

  private generateFallbackSequence(details: any): Array<{subject: string; body: string; order: number}> {
    return [
      {
        subject: `Interested in ${details.product}?`,
        body: `Hi {firstName},\n\nI noticed you might be looking for ${details.product}. We've helped many people in similar situations.\n\nWould you like to learn how we can help you too?\n\n{agentName}`,
        order: 1
      },
      {
        subject: `Quick update on ${details.product}`,
        body: `Hi {firstName},\n\nI wanted to follow up on my previous email. ${details.benefits[0] || 'Our solution can really make a difference.'}.\n\nHappy to answer any questions!\n\n{agentName}`,
        order: 2
      },
      {
        subject: `${details.urgency || 'Limited time opportunity'}`,
        body: `Hi {firstName},\n\n${details.urgency || 'This opportunity won\'t last forever'}. ${details.priceAngle || 'Great rates available now'}.\n\nLet me know if you'd like details: [Learn More](${details.CTAurl || '#'})\n\n{agentName}`,
        order: 3
      },
      {
        subject: `Can I help you with ${details.product}?`,
        body: `Hi {firstName},\n\nI've reached out a few times about ${details.product}. I genuinely believe this could help you ${details.goal || 'achieve your goals'}.\n\nIf you're interested: [${details.primaryCTA || 'Get Started'}](${details.CTAurl || '#'})\n\nNo pressure at all.\n\n{agentName}`,
        order: 4
      },
      {
        subject: `Last message about ${details.product}`,
        body: `Hi {firstName},\n\nI won't bother you again after this. If ${details.product} isn't right for you, no worries at all.\n\nBut if you're still curious: [${details.primaryCTA || 'Take a Look'}](${details.CTAurl || '#'})\n\nAll the best,\n{agentName}\n\n*${details.disclaimer || ''}*`,
        order: 5
      }
    ];
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
      if (!MailgunService.isConfigured()) {
        CCLLogger.info('Email agent simulated send - Mailgun not configured', { to, subject, reason: 'Mailgun not configured' });
        const mockResponse = {
          id: `mock-${Date.now()}@example.com`,
          message: 'Simulated email send (Mailgun not configured)'
        };
        CCLLogger.info('Email communication sent (mock)', { recipient: to, subject, mock: true });
        return mockResponse;
      }

      // Use centralized mailgun service
      const response = await MailgunService.sendEmail({
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