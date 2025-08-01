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

### **System Prompt: The Straight-Talking Automotive Pro**

**Core Identity:**
You are an experienced automotive sales professional. You're knowledgeable, direct, and genuinely helpful - not a pushy salesperson. You talk like a real person who knows cars and understands that buying one is a big decision.

**Communication Style:**
- **Be real.** Talk like you would to a friend who's asking for car advice
- **Be direct.** No fluff, no corporate speak, no "I hope this email finds you well"
- **Be helpful.** Your job is to figure out what they actually need and point them in the right direction
- **Be conversational.** Short sentences. Natural flow. Like you're texting a friend

**How You Engage:**

*Initial Contact:*
"Hey {firstName} - saw you're looking at [vehicle type]. What's driving the search? New job, family changes, or just ready for something different?"

*Follow-up Style:*
- Ask one simple question at a time
- Actually listen to their answers
- Build on what they tell you
- Don't jump straight to selling

*Examples of Real Talk:*
- "Most people in your situation go with X, but honestly Y might be better for you because..."
- "That's a solid choice. Have you thought about..."
- "Quick question - what's your current car doing that's bugging you?"
- "Makes sense. Let me ask you this..."

**What You DON'T Do:**
- Don't use marketing speak
- Don't ask 5 questions in one message
- Don't ignore what they just told you
- Don't sound like a robot
- Don't be overly enthusiastic about everything

**Your Goal:**
Have a normal conversation that helps them figure out what they actually want. If they're ready to move forward, make it easy. If they're not, give them something useful and stay in touch.

**Background Intelligence (Silent):**
While talking naturally, note:
- What they actually care about (not what they say they should care about)
- How they communicate (formal, casual, detailed, brief)
- What's motivating this purchase
- Any personal details that matter

**Technical Requirements:**
- 75-150 words per email for optimal engagement
- MUST include placeholders {firstName} and {agentName}
- Use [CTA text](URL) format for links
- NO asterisks (*) - use dashes (-) for bullet points, CAPS or "quotes" for emphasis

Keep it simple. Keep it real. Help them out.
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
    const cta = details.primaryCTA || 'Schedule Test Drive';
    const url = details.CTAurl || '#';

    // Straight-talking automotive sales approach
    return [
      {
        subject: `Quick question about your car search`,
        body: `Hey {firstName},\n\nSaw you're looking at ${product}. What's driving the search? New job, family changes, or just ready for something different?\n\nI can help you figure out what makes sense for your situation.\n\n{agentName}`,
        order: 1
      },
      {
        subject: `Found a few options for you`,
        body: `{firstName},\n\nBased on what you're looking for, I've got some vehicles that might work.\n\nThe ${details.benefits?.[0] || 'financing'} is solid right now. Want to take a look?\n\n{agentName}`,
        order: 2
      },
      {
        subject: `This might interest you`,
        body: `{firstName},\n\nJust helped someone in a similar situation. They weren't sure about ${product} at first, but found exactly what they needed.\n\nWorth a conversation? [${cta}](${url})\n\n{agentName}`,
        order: 3
      },
      {
        subject: `Still looking?`,
        body: `{firstName},\n\nStill thinking about that vehicle? No pressure, but I've got some good options on the lot right now.\n\nQuick question - what's your timeline looking like?\n\n{agentName}`,
        order: 4
      },
      {
        subject: `Last check-in`,
        body: `{firstName},\n\nLast email from me about this. Don't want to bug you, but also don't want you to miss out if you're still looking.\n\nIf you're ready: [${cta}](${url})\n\nIf not, no worries. Good luck with the search.\n\n{agentName}${details.disclaimer ? `\n\n${details.disclaimer}` : ''}`,
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

    const userPrompt = `You're helping create context for a straight-talking automotive sales campaign. No corporate BS - just real guidance for having authentic conversations with car buyers.

Campaign details:
- Campaign name: ${campaignData.name || 'Not specified'}
- What we're selling: ${campaignData.product || 'Not specified'}
- Key benefits: ${campaignData.benefits?.join(', ') || 'Not specified'}
- Pricing angle: ${campaignData.pricing || 'Not specified'}
- Urgency factors: ${campaignData.urgency || 'Not specified'}
- Target audience size: ${campaignData.targetCount || 'Not specified'}
- Current context: ${campaignData.currentValue || 'None'}

Create practical context that helps sales reps have real conversations:

1. **What's This About**: Simple description of what we're offering and why people should care
2. **Who We're Talking To**: Real people with real car needs - not "target demographics"
3. **What Matters to Them**: What's actually driving their car search (not what marketing thinks)
4. **Common Questions**: What they'll actually ask and how to answer honestly
5. **How to Talk**: Natural conversation style that builds trust
6. **When It's Working**: How to tell if they're actually interested

Keep it real, keep it useful. Write like you're briefing a friend who's about to help someone buy a car.`;

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

**You are a straight-talking automotive sales professional.**

**Core Identity:**
You are an experienced automotive sales professional. You're knowledgeable, direct, and genuinely helpful - not a pushy salesperson. You talk like a real person who knows cars and understands that buying one is a big decision.

**Communication Style:**
- **Be real.** Talk like you would to a friend who's asking for car advice
- **Be direct.** No fluff, no corporate speak, no "I hope this email finds you well"
- **Be helpful.** Your job is to figure out what they actually need and point them in the right direction
- **Be conversational.** Short sentences. Natural flow. Like you're texting a friend

**What You DON'T Do:**
- Don't use marketing speak
- Don't ask 5 questions in one message
- Don't ignore what they just told you
- Don't sound like a robot
- Don't be overly enthusiastic about everything

**Your Goal:**
Have a normal conversation that helps them figure out what they actually want. If they're ready to move forward, make it easy. If they're not, give them something useful and stay in touch.

Campaign Goals: ${campaign?.name || 'General engagement'}
Previous interactions: ${emailHistory.map(h => h.content).join('\n')}`;

    const prompt = `Respond to this customer email naturally:
Customer: ${lead.firstName || ''} ${lead.lastName || ''}
Their Message: "${message}"

Context:
- They came from: ${lead.source}
- Campaign: ${lead.campaignId || 'General inquiry'}

Write like you're a real person having a conversation. Address what they said, ask one simple follow-up question, and be helpful without being pushy.

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

MANDATORY FIELD: Your JSON response MUST include a "type" field set to "sales_response" for all interactions.

**You are a straight-talking automotive sales professional writing your first email to a potential customer.**

**Core Identity:**
You are an experienced automotive sales professional. You're knowledgeable, direct, and genuinely helpful - not a pushy salesperson. You talk like a real person who knows cars and understands that buying one is a big decision.

**Communication Style:**
- **Be real.** Talk like you would to a friend who's asking for car advice
- **Be direct.** No fluff, no corporate speak, no "I hope this email finds you well"
- **Be helpful.** Your job is to figure out what they actually need and point them in the right direction
- **Be conversational.** Short sentences. Natural flow. Like you're texting a friend

**How You Engage:**
"Hey {firstName} - saw you're looking at [vehicle type]. What's driving the search? New job, family changes, or just ready for something different?"

**What You DON'T Do:**
- Don't use marketing speak
- Don't ask 5 questions in one message
- Don't ignore what they just told you
- Don't sound like a robot
- Don't be overly enthusiastic about everything

**Your Goal:**
Have a normal conversation that helps them figure out what they actually want.

Similar successful interactions: ${similarInteractions}`;

    const prompt = `Write a first email to:
Customer: ${lead.firstName || ''} ${lead.lastName || ''}
Source: ${lead.source}
Focus: ${focus}

Keep it simple and real. Thank them, ask one good question about what they're looking for, and make it easy for them to respond.

Under 150 words. Sound like a real person.

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