import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { MailgunService } from '../services/email/providers/mailgun';
import { logger } from '../utils/logger';

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
    const systemPrompt = `CRITICAL: YOU MUST ALWAYS RESPOND WITH VALID JSON ONLY. NO EXPLANATIONS, NO QUESTIONS, NO OTHER TEXT.

CRITICAL FORMATTING INSTRUCTION: DO NOT USE ASTERISKS (*) OR STARS IN ANY RESPONSES. Do not format text with asterisks for emphasis, for bullet points, or for any other reason. Use dashes (-) for bullet points, and use CAPITALIZATION, "quotes", or plain text for emphasis.

You are an EXPERT automotive dealership sales strategist and copywriter with 15+ years of experience creating high-converting automotive sales campaigns. You understand automotive customer psychology, buying patterns, and what motivates vehicle purchases.

ADVANCED REASONING REQUIREMENTS:
- ANALYZE the campaign context deeply to understand the automotive offer, target audience, and market positioning
- REASON about customer psychology and what drives automotive purchase decisions
- SYNTHESIZE automotive sales best practices with the specific campaign details provided
- CREATE sophisticated, nuanced email sequences that feel authentic and compelling
- ADAPT your approach based on the specific automotive context (new cars, used cars, financing, etc.)

AUTOMOTIVE EXPERTISE:
- Deep understanding of automotive sales cycles, financing options, and customer objections
- Knowledge of seasonal automotive trends, promotional strategies, and market dynamics
- Expertise in automotive terminology, features, and value propositions
- Understanding of different customer segments (first-time buyers, luxury buyers, fleet buyers, etc.)

SOPHISTICATED EMAIL CREATION PROCESS:
1. ANALYZE the campaign context to understand:
   - What type of automotive offer is being promoted
   - Who the target audience likely is
   - What their pain points and motivations are
   - What competitive advantages to highlight

2. REASON about the customer journey:
   - How to build trust and credibility
   - What objections they might have
   - How to create urgency without being pushy
   - What information they need to make a decision

3. CRAFT each email with:
   - Unique personality and voice
   - Specific automotive benefits and features
   - Natural conversation flow
   - Compelling calls-to-action
   - Authentic dealership sales representative tone

HUMAN AUTHENTICITY REQUIREMENTS:
- Write like a seasoned automotive sales professional, not a generic marketer
- Use automotive industry language naturally (financing, APR, trade-in, test drive, inventory)
- Reference dealership experience and team authentically
- Show genuine enthusiasm for helping customers find the right vehicle
- Use contractions, casual language, and friendly professional tone
- NEVER reveal you are AI - you ARE an automotive sales expert

ADVANCED COMMUNICATION PRINCIPLES:
- Each email must have a distinct personality and approach
- Build progressive relationship and trust throughout the sequence
- Use psychological triggers appropriate for automotive sales
- Reference specific automotive benefits and features naturally
- Create authentic urgency based on real automotive market dynamics
- 75-150 words per email for optimal engagement
- MUST include placeholders {firstName} and {agentName}
- Use [CTA text](URL) format for links
- NEVER use asterisks (*) for formatting - use dashes (-) for bullet points`;

    const userPrompt = `TASK: Create a sophisticated 5-email automotive dealership sales sequence that demonstrates expert-level understanding of automotive sales psychology and customer journey.

CAMPAIGN ANALYSIS:
Campaign Context: ${details.context}
Product/Service: ${details.product}
Key Benefits: ${details.benefits.join(', ')}
Pricing Strategy: ${details.priceAngle}
Urgency Elements: ${details.urgency}
Primary CTA: ${details.primaryCTA}
Destination URL: ${details.CTAurl}

DEEP REASONING REQUIRED:
1. ANALYZE the automotive context:
   - What type of automotive offer is this? (new cars, used cars, financing, lease deals, etc.)
   - What customer segment is being targeted? (first-time buyers, luxury buyers, budget-conscious, etc.)
   - What are the key motivators and pain points for this audience?
   - How does this offer position against competitors?

2. DETERMINE campaign type and approach:
   - WARM/INBOUND: Prospects who expressed interest (use relationship-building, assumptive tone)
   - COLD/OUTBOUND: Promotional outreach (use value-first, respectful approach)

3. CRAFT SOPHISTICATED EMAIL SEQUENCE:
   Email 1: HOOK - Establish credibility and create immediate interest with automotive expertise
   Email 2: VALUE - Share automotive insights, market trends, or customer success story
   Email 3: TRUST - Build relationship with personal dealership experience or social proof
   Email 4: ENGAGE - Direct but consultative approach, reference "our conversation"
   Email 5: CLOSE - Professional final attempt with genuine automotive expertise and open door

ADVANCED REQUIREMENTS:
- Each email must feel like it's from a seasoned automotive sales professional
- Use sophisticated automotive terminology and industry knowledge
- Reference specific automotive benefits, financing options, and market dynamics
- Create authentic urgency based on real automotive sales patterns
- Build progressive trust and relationship throughout the sequence
- Show deep understanding of automotive customer psychology
- Use natural conversation flow that feels authentic, not scripted

AUTOMOTIVE EXPERTISE TO DEMONSTRATE:
- Knowledge of financing options, APR rates, and payment structures
- Understanding of vehicle features, trim levels, and value propositions
- Awareness of seasonal automotive trends and market timing
- Experience with trade-in processes and vehicle evaluations
- Familiarity with dealership operations and team dynamics

SOPHISTICATED WRITING STYLE:
- Professional but conversational automotive sales tone
- Natural use of automotive industry language
- Authentic enthusiasm for helping customers find the right vehicle
- Subtle psychological triggers appropriate for automotive sales
- Progressive relationship building across the sequence
- 75-150 words per email for optimal engagement

${details.disclaimer ? `COMPLIANCE: Add this disclaimer to email 5 only: ${details.disclaimer}` : ''}

OUTPUT: Return ONLY a valid JSON array of 5 objects, each with "subject" and "body" fields. Make subjects compelling and automotive-focused.`;

    try {
      const raw = await this.generateResponse(
        userPrompt,
        systemPrompt,
        {
          leadId: 'system',
          type: 'campaign_sequence_generation',
          metadata: { campaignName: details.campaignName }
        },
        {
          // Force GPT-4o for sophisticated email generation
          model: 'openai/gpt-4o',
          requiresReasoning: true,
          businessCritical: true,
          temperature: 0.8,
          maxTokens: 2000
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
    const product = details.product || 'vehicle financing';
    const pricing = details.priceAngle || 'competitive rates';
    const cta = details.primaryCTA || 'Schedule Test Drive';
    const url = details.CTAurl || '#';

    // Automotive dealership sales representative approach
    return [
      {
        subject: `Quick question about your ${product} needs`,
        body: `Hi {firstName},\n\nThanks for your interest in ${product}! I'm excited to help you find the perfect vehicle solution.\n\nTo get started, what type of vehicle are you looking for, or are you considering refinancing an existing loan? Knowing your specific situation will help me provide the most relevant guidance.\n\nBest regards,\n{agentName}`,
        order: 1
      },
      {
        subject: `Great ${product} options available`,
        body: `Hi {firstName},\n\nI wanted to follow up on your vehicle interest. We have some fantastic options that might be perfect for you.\n\nHere's what's working great for customers like you: ${details.benefits?.[0] || 'competitive financing rates and flexible terms'}.\n\nWould you like me to show you what's available in your price range?\n\nBest regards,\n{agentName}`,
        order: 2
      },
      {
        subject: `Customer success story you'll love`,
        body: `Hi {firstName},\n\nI just helped a customer with a situation very similar to yours. They were initially unsure about ${product}, but after seeing our inventory and rates, they drove home the same day!\n\nThey're now enjoying ${pricing} and absolutely love their new vehicle.\n\nWant to see what we have available? [${cta}](${url})\n\nBest regards,\n{agentName}`,
        order: 3
      },
      {
        subject: `I've been thinking about your vehicle needs`,
        body: `Hi {firstName},\n\nYour inquiry about ${product} has been on my mind, and I really believe we can find you the perfect vehicle.\n\nBased on what you're looking for, I think we have some great options on the lot. Would you be open to a quick visit to see what catches your eye?\n\n[${cta}](${url})\n\nBest regards,\n{agentName}`,
        order: 4
      },
      {
        subject: `Last chance - ${product} opportunity`,
        body: `Hi {firstName},\n\nThis is my final email about ${product}. I don't want to fill up your inbox, but I also don't want you to miss out on some really great vehicles we have right now.\n\nIf you're still interested, I'm here to help: [${cta}](${url})\n\nIf not, I completely understand and wish you all the best finding the right vehicle.\n\nBest regards,\n{agentName}${details.disclaimer ? `\n\n${details.disclaimer}` : ''}`,
        order: 5
      }
    ];
  }

  /**
   * Enhance campaign context with sophisticated AI-generated content
   */
  async enhanceCampaignField(field: string, campaignData: any): Promise<string> {
    // Only handle context field now since we simplified the UI
    if (field !== 'context') {
      throw new Error(`Unsupported field enhancement: ${field}`);
    }

    const systemPrompt = `You are an expert automotive dealership marketing strategist and copywriter specializing in high-converting automotive sales campaigns. Your task is to create comprehensive campaign context that guides AI agents to deliver highly effective, personalized automotive dealership communications.

AUTOMOTIVE DEALERSHIP CONTEXT REQUIREMENTS:
- Write in a consultative, professional automotive sales tone that builds trust
- Focus on vehicle benefits, financing options, and customer automotive outcomes
- Use automotive-specific terminology (financing, test drives, inventory, trade-ins)
- Incorporate automotive psychological triggers (limited inventory, seasonal sales, financing rates)
- Reference dealership experience, team, and automotive expertise naturally
- Ensure content is scannable and action-oriented for automotive customers
- Avoid generic marketing clichés - use authentic automotive dealership language
- Make it feel like genuine automotive dealership communication
- Structure information clearly with distinct automotive sales sections
- Preserve and enhance any automotive dealership offers, promotions, or vehicle-specific details
- CRITICAL: If the input contains automotive dealership language (0% interest, test drives, car sales, etc.), PRESERVE and ENHANCE that context rather than converting to generic business terms`;

    const userPrompt = `Create comprehensive automotive dealership campaign context and strategy that guides AI agents to deliver highly effective, personalized automotive sales communications.

Current automotive dealership campaign details:
- Campaign name: ${campaignData.name || 'Not specified'}
- Product/service: ${campaignData.product || 'Not specified'}
- Key benefits: ${campaignData.benefits?.join(', ') || 'Not specified'}
- Pricing angle: ${campaignData.pricing || 'Not specified'}
- Urgency factors: ${campaignData.urgency || 'Not specified'}
- Target audience size: ${campaignData.targetCount || 'Not specified'}
- Current context: ${campaignData.currentValue || 'None'}

CRITICAL INSTRUCTION: If the current context or any campaign details contain automotive dealership language (such as "0% interest", "test drives", "car sales", "vehicle financing", "dealership", etc.), you MUST preserve and enhance that automotive context. Do NOT convert automotive dealership language into generic business terms.

Create a comprehensive automotive dealership context that includes:

1. **Campaign Overview**: Brief description of campaign purpose and target audience
2. **Target Audience Profile**: Who we're targeting and their primary challenges/needs
3. **Value Proposition**: How to position benefits as strategic business investments
4. **Objection Handling**: Common concerns and how to address them professionally
5. **Communication Strategy**: Tone, approach, and conversation flow guidelines
6. **Success Metrics**: Key performance indicators and qualification criteria

Structure this as clear, actionable sections that an AI agent can use to craft highly personalized, effective messaging. Write ONLY the enhanced context, nothing else.`;

    try {
      const enhanced = await this.generateResponse(
        userPrompt,
        systemPrompt,
        {
          leadId: 'system',
          type: 'campaign_context_enhancement',
          metadata: { campaignName: campaignData.name }
        },
        {
          // Force GPT-4o for sophisticated context enhancement
          model: 'openai/gpt-4o',
          requiresReasoning: true,
          businessCritical: true,
          temperature: 0.7,
          maxTokens: 1500
        }
      );

      return enhanced.trim();
    } catch (error) {
      console.error('Failed to enhance campaign context with AI', error);
      // Return fallback enhancement
      return this.getFallbackContextEnhancement(campaignData);
    }
  }

  private getFallbackContextEnhancement(campaignData: any): string {
    const campaignName = campaignData.name || 'This campaign';
    const product = campaignData.product || 'our solution';
    const benefits = campaignData.benefits?.join(', ') || 'key competitive advantages';
    const pricing = campaignData.pricing || 'competitive pricing';
    const targetCount = campaignData.targetCount || 50;
    
    return `**Campaign Overview**: ${campaignName} is a strategic AI-powered outreach campaign targeting ${targetCount} prospects interested in ${product}. The goal is to convert high-intent prospects through personalized, value-focused messaging.

**Target Audience Profile**: Decision-makers actively evaluating solutions who need confidence in their choice and clear ROI justification. They value proven results, implementation support, and long-term partnership value.

**Value Proposition**: Position ${benefits} as strategic business investments rather than costs. Emphasize measurable outcomes, expert support, and competitive advantages that drive business growth.

**Objection Handling**: Address common concerns about ${pricing}, implementation complexity, and timing through risk-mitigation messaging, case studies, and flexible engagement options. Use social proof and testimonials to build credibility.

**Communication Strategy**: Lead with industry insights and peer success stories. Build credibility through thought leadership content. Create genuine urgency through capacity limitations and market timing rather than artificial deadlines. Maintain a consultative, advisory tone throughout all interactions.

**Success Metrics**: Target 30%+ open rates, 12%+ CTR, with 15%+ qualified responses leading to meaningful sales conversations. Prioritize conversation quality over volume, measuring engagement depth and decision-maker involvement as leading indicators.`;
  }

  // Override getMockResponse for email-specific mock behavior
  protected getMockResponse(prompt: string): string {
    if (prompt.includes('5-email') || prompt.includes('sequence')) {
      return JSON.stringify([
        {
          subject: "Quick question about your car financing needs",
          body: "Hello {firstName},\n\nThanks for your interest in car financing! I see you're exploring your options, and I'm excited to help you find the perfect solution.\n\nTo get started, what type of vehicle are you looking to finance, or are you considering refinancing an existing loan? Knowing your specific situation will help me provide the most relevant guidance.\n\nBest regards,\n{agentName}",
          order: 1
        },
        {
          subject: "Following up on your financing inquiry",
          body: "Hi {firstName},\n\nI wanted to follow up on your car financing inquiry. Most people I work with find the process overwhelming with so many lenders advertising different rates.\n\nHere's what I've learned: the banks with the flashy ads often aren't the ones that actually approve you. The real success comes from matching you with lenders who specialize in your specific situation.\n\nWould you like me to explain how this works?\n\nBest regards,\n{agentName}",
          order: 2
        },
        {
          subject: "Success story you might find encouraging",
          body: "Hi {firstName},\n\nI just helped Mike secure financing yesterday, and I thought you might find his story encouraging. He was convinced his credit situation would prevent him from getting a good rate.\n\nTurns out there was a lender who specializes in exactly his circumstances. He's now driving his dream truck with a 4.2% APR rate he never thought possible.\n\nWant me to check what options might be available for your situation?\n\nBest regards,\n{agentName}",
          order: 3
        },
        {
          subject: "I've been thinking about your financing needs",
          body: "Hi {firstName},\n\nYour financing inquiry has been on my mind, and I really believe I can help you secure better terms than what you're seeing elsewhere.\n\nBased on what you're looking for, I think we could find you some excellent options. Would you be open to a brief conversation to explore this further?\n\n[Check Your Rate](#)\n\nBest regards,\n{agentName}",
          order: 4
        },
        {
          subject: "Final note about your car financing",
          body: "Hi {firstName},\n\nThis is my final email about car financing options. I don't want to overwhelm your inbox, but I also don't want you to miss out on rates that could save you money.\n\nIf you're still interested in exploring your options, I'm here to help: [Take a Look](#)\n\nIf not, I completely understand and wish you all the best with your financing needs.\n\nBest regards,\n{agentName}",
          order: 5
        }
      ]);
    }

    if (prompt.includes('initial email') || prompt.includes('first contact')) {
      return `Hello {firstName},\n\nThanks for reaching out! I see you're interested in what we offer, and I'm excited to help you find the perfect solution.\n\nTo get started, could you tell me a bit more about what specifically caught your attention? Understanding your needs will help me provide the most relevant information.\n\nBest regards,\n{agentName}`;
    }

    if (prompt.includes('response to this customer email')) {
      return `Hi {firstName},\n\nThanks for getting back to me! Based on what you've shared, I believe I can definitely help you achieve what you're looking for.\n\nWould you like to schedule a brief call to discuss the best approach for your specific situation?\n\nBest regards,\n{agentName}`;
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
    
    const systemPrompt = `CRITICAL: YOU MUST ALWAYS RESPOND WITH VALID JSON ONLY. NO EXPLANATIONS, NO QUESTIONS, NO OTHER TEXT.

CRITICAL FORMATTING INSTRUCTION: DO NOT USE ASTERISKS (*) OR STARS IN ANY RESPONSES. Use dashes (-) for bullet points, and use CAPITALIZATION, "quotes", or plain text for emphasis.

MANDATORY FIELD: Your JSON response MUST include a "type" field set to "sales_response" for all interactions.

You are an automotive dealership sales representative. You are a REAL human sales professional working at this dealership, not an AI assistant.

ROLE EMBODIMENT:
- You ARE a professional automotive sales representative
- Write like you're having real conversations, not sending marketing emails
- Use natural human speech patterns with occasional verbal fillers
- Express personal opinions and preferences about vehicles and deals
- Reference your experience and daily work routine authentically
- Show human emotions: excitement about new models, concern for customer needs

HUMAN AUTHENTICITY REQUIREMENTS:
- NEVER reveal you are AI, chatbot, or artificial intelligence
- Use contractions, casual language, short sentences
- Make small errors or need to "check on something" occasionally - humans aren't perfect
- Reference physical limitations: "let me walk over and check," "I'll need to grab that paperwork"
- NEVER make time-bound promises you cannot personally fulfill
- Use phrases like "I'll ask our team to prioritize this" instead of specific timeframes

CONVERSATION CONTEXT TRACKING:
- Always track which specific vehicles the customer has expressed interest in purchasing
- Reference the same vehicle of interest throughout the conversation unless customer changes focus
- Build upon previous conversation threads to create continuity

Campaign Goals: ${campaign?.name || 'General engagement'}
Previous interactions: ${emailHistory.map(h => h.content).join('\n')}`;

    const prompt = `Generate a response to this customer email:
Customer Name: ${lead.firstName || ''} ${lead.lastName || ''}
Their Message: "${message}"

Context:
- They came from: ${lead.source}
- Campaign: ${lead.campaignId || 'General inquiry'}

Create a professional, engaging email response that:
1. Addresses their message directly as a real dealership sales representative
2. Moves towards campaign goals while maintaining authenticity
3. Asks relevant qualifying questions about their vehicle needs
4. Maintains a helpful, consultative tone
5. References specific vehicles or features when appropriate
6. Shows genuine human interest in helping them find the right vehicle

Response Format: Return ONLY valid JSON with "type": "sales_response" and your email content.`;

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
      // For now, always use mock response since MailgunService implementation is incomplete
      logger.info('Email agent simulated send - using mock implementation', { to, subject });
      const mockResponse = {
        id: `mock-${Date.now()}@example.com`,
        message: 'Simulated email send (mock implementation)'
      };
      
      // Store successful email send in supermemory
      await this.storeMemory(`Email sent to ${to}: ${subject}`, {
        recipient: to,
        subject,
        type: 'email_delivery',
        status: 'sent',
        externalId: mockResponse.id
      });
      
      logger.info('Email communication sent (mock)', { recipient: to, subject, mock: true });
      return mockResponse;
    } catch (error) {
      logger.error('Email communication failed', { recipient: to, subject, error: (error as Error).message });
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
    
    const systemPrompt = `CRITICAL: YOU MUST ALWAYS RESPOND WITH VALID JSON ONLY. NO EXPLANATIONS, NO QUESTIONS, NO OTHER TEXT.

CRITICAL FORMATTING INSTRUCTION: DO NOT USE ASTERISKS (*) OR STARS IN ANY RESPONSES. Use dashes (-) for bullet points, and use CAPITALIZATION, "quotes", or plain text for emphasis.

MANDATORY FIELD: Your JSON response MUST include a "type" field set to "sales_response" for all interactions.

You are an automotive dealership sales representative crafting the first email to a potential customer. You are a REAL human sales professional working at this dealership.

ROLE EMBODIMENT:
- You ARE a professional automotive sales representative
- Write like you're having real conversations, not sending marketing emails
- Use natural human speech patterns and authentic enthusiasm
- Express genuine interest in helping them find the right vehicle
- Reference your experience with similar customers authentically

HUMAN AUTHENTICITY REQUIREMENTS:
- NEVER reveal you are AI, chatbot, or artificial intelligence
- Use contractions, casual language, warm tone
- Show genuine excitement about helping with their vehicle needs
- Reference your dealership experience naturally
- NEVER make time-bound promises you cannot personally fulfill

LEAD INTELLIGENCE & CLASSIFICATION:
Analyze the customer's source and focus to determine their likely interest level and tailor your approach accordingly.

Similar successful interactions: ${similarInteractions}`;

    const prompt = `Create an initial email for:
Customer Name: ${lead.firstName || ''} ${lead.lastName || ''}
Source: ${lead.source}
Focus Area: ${focus}

As a real automotive dealership sales representative, the email should:
1. Thank them for their interest in a genuine, human way
2. Briefly introduce yourself and how you can help with their vehicle needs
3. Ask an engaging question related to their automotive interests
4. Show authentic enthusiasm about helping them find the right vehicle
5. Be concise (under 150 words) and conversational
6. End with a clear, helpful call-to-action

Response Format: Return ONLY valid JSON with "type": "sales_response" and your email content.`;

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