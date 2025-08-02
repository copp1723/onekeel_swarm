import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
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
  }): Promise<Array<{ subject: string; body: string; order: number }>> {
    const systemPrompt = `CRITICAL: YOU MUST ALWAYS RESPOND WITH VALID JSON ONLY. NO EXPLANATIONS, NO QUESTIONS, NO OTHER TEXT.

### **AUTHENTIC AUTOMOTIVE CONVERSATION GENERATOR**

**MISSION: You are a TRANSLATOR, not a template filler. Your job is to convert marketing speak into genuine human conversation.**

**STEP 1: MARKETING SPEAK FILTER**
When you receive raw offer details, you MUST filter them through authenticity:

❌ **NEVER copy-paste raw marketing data**
❌ **NEVER use**: "biggest sale of the year, weekend only, 0% interest, 0 down for all new cars, free car giveaway for all test drives"
✅ **INSTEAD translate to**: "We've got a big sale this weekend. The 0% financing is solid, but most of the other stuff is just marketing noise."

❌ **NEVER use corporate speak**: "We're excited to help you find the perfect vehicle solution"
✅ **INSTEAD use real talk**: "What's driving the search right now?"

**STEP 2: AUTHENTICITY RULES**
- **Filter out hype**: "Free car giveaway" = marketing noise, don't mention it
- **Focus on value**: "0% interest" = real money savings, worth mentioning
- **Add context**: "Most sales events are just noise, but..."
- **Build trust**: "No pressure either way"

**STEP 3: CONVERSATION FLOW**
Email 1: Build rapport, ask genuine questions, filter the offer
Email 2: Address their specific needs based on their response
Email 3: Make it easy to move forward without pressure
Email 4: Follow up with helpful information, no pressure
Email 5: Final helpful touch, leave door open

**EXAMPLES OF AUTHENTIC TRANSLATION:**

❌ **ROBOTIC**: "Saw you're looking at biggest sale of the year, weekend only, 0% interest, 0 down for all new cars, free car giveaway for all test drives"
✅ **AUTHENTIC**: "Saw you were looking for a new car. Just a heads-up, we've got a big sale event this weekend. Honestly, most of the noise is just marketing, but the 0% interest offer is the real deal."

❌ **ROBOTIC**: "I can help you figure out what makes sense for your situation"
✅ **AUTHENTIC**: "What's driving the search right now? Just curious if you're looking for something specific."

❌ **ROBOTIC**: "Based on what you're looking for, I've got some vehicles that might work"
✅ **AUTHENTIC**: "Quick question - what's your current car doing that's bugging you? Knowing that helps me narrow down which ones are actually an upgrade."

**QUALITY VALIDATION:**
Before generating, ask yourself:
1. Does this sound like a real person talking to a friend?
2. Did I filter out marketing hype?
3. Am I building rapport before selling?
4. Would I trust this person if I received this email?

**Technical Requirements:**
- 75-150 words per email for optimal engagement
- MUST include placeholders {firstName} and {agentName}
- Use [CTA text](URL) format for links
- NO asterisks (*) - use dashes (-) for bullet points, CAPS or "quotes" for emphasis
- NEVER use asterisks (*) for formatting - use dashes (-) for bullet points`;

    const userPrompt = `Create a 5-email automotive sales sequence using the authentic conversation approach above.

CAMPAIGN DETAILS TO TRANSLATE:
Campaign Context: ${details.context}
Product/Service: ${details.product}
Key Benefits: ${details.benefits.join(', ')}
Pricing Strategy: ${details.priceAngle}
Urgency Elements: ${details.urgency}
Primary CTA: ${details.primaryCTA}
Destination URL: ${details.CTAurl}

SEQUENCE STRUCTURE:
Email 1 (Day 1): First contact - filter the marketing speak, ask genuine questions, build rapport
Email 2 (Day 4): Follow up based on their likely needs, provide helpful info
Email 3 (Day 7): Share something useful (customer story, market insight), no pressure
Email 4 (Day 10): Direct but friendly check-in, reference timing if relevant
Email 5 (Day 13): Final helpful touch, leave door open

AUTHENTICITY REQUIREMENTS:
- Filter ALL marketing hype through the examples above
- Ask real questions that show you care about their situation
- Provide genuine value, not sales pitches
- Build trust before trying to sell anything
- Sound like a real person, not a template

${details.disclaimer ? `COMPLIANCE: Add this disclaimer to email 5 only: ${details.disclaimer}` : ''}

OUTPUT: Return ONLY a valid JSON array of 5 objects, each with "subject" and "body" fields.`;

    try {
      const raw = await this.generateResponse(
        userPrompt,
        systemPrompt,
        {
          leadId: 'system',
          type: 'campaign_sequence_generation',
          metadata: { campaignName: details.campaignName },
        },
        {
          // Force GPT-4o for sophisticated email generation
          model: 'openai/gpt-4o',
          requiresReasoning: true,
          businessCritical: true,
          temperature: 0.8,
          maxTokens: 2000,
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

      // QUALITY VALIDATION: Check and fix authenticity issues
      const validatedSequence = this.validateAndFixSequence(sequence, details);

      return validatedSequence.map((email: any, i: number) => ({
        subject: email.subject || `Email ${i + 1}`,
        body: email.body || 'Template content',
        order: i + 1,
      }));
    } catch (error) {
      console.error('Failed to generate campaign sequence', error);
      // Return sensible fallback
      return this.generateFallbackSequence(details);
    }
  }

  private generateFallbackSequence(
    details: any
  ): Array<{ subject: string; body: string; order: number }> {
    // AUTHENTIC FILTERING: Convert marketing speak to real conversation
    const rawProduct = details.product || 'vehicle financing';
    const cta = details.primaryCTA || 'Schedule Test Drive';
    const url = details.CTAurl || '#';

    // FILTER: Extract genuine value from marketing speak
    const hasZeroPercent =
      rawProduct.includes('0%') || details.benefits?.includes('0% interest');
    const isWeekendSale =
      rawProduct.includes('weekend') || details.urgency?.includes('weekend');

    // TRANSLATE: Convert to authentic language
    const genuineOffer = hasZeroPercent ? '0% financing' : 'financing';
    const timeframe = isWeekendSale ? 'this weekend' : 'right now';

    return [
      {
        subject: `Quick heads-up about ${timeframe}`,
        body: `Hey {firstName},\n\nSaw you were looking for a new car. Just a heads-up, we've got a big sale event ${timeframe}.\n\nHonestly, most of the noise is just marketing, but the ${genuineOffer} offer is the real deal and could save you a lot.\n\nWhat's driving the search right now? Just curious if you're looking for something specific.\n\n{agentName}`,
        order: 1,
      },
      {
        subject: `Re: What you're looking for`,
        body: `{firstName},\n\nGot it. Good choice, there are a ton of great options out there right now.\n\nQuick question - what's your current car doing that's bugging you? Knowing that helps me narrow down which ones are actually an upgrade for you vs. just more of the same.\n\n{agentName}`,
        order: 2,
      },
      {
        subject: `Re: Better options`,
        body: `{firstName},\n\nMakes sense. A lot of people are in the same boat.\n\nBased on that, you should probably look at a couple specific models. Since the ${genuineOffer} is on ${timeframe}, it's a good time to look.\n\nI can pull a few for you if you wanted to swing by to see which one feels right. No pressure either way.\n\nLet me know what you think.\n\n{agentName}`,
        order: 3,
      },
      {
        subject: `Still thinking it over?`,
        body: `{firstName},\n\nNo worries if you're still thinking it over. These decisions take time.\n\nJust wanted to check - any other questions come up that I can help with?\n\n{agentName}`,
        order: 4,
      },
      {
        subject: `Last check-in`,
        body: `{firstName},\n\nLast email from me about this. Don't want to bug you, but also don't want you to miss out if you're still looking.\n\nIf you're ready: [${cta}](${url})\n\nIf not, no worries. Good luck with the search.\n\n{agentName}${details.disclaimer ? `\n\n${details.disclaimer}` : ''}`,
        order: 5,
      },
    ];
  }

  /**
   * QUALITY VALIDATION: Check and fix authenticity issues in generated sequences
   */
  private validateAndFixSequence(sequence: any[], details: any): any[] {
    return sequence.map((email, index) => {
      let subject = email.subject || '';
      let body = email.body || '';

      // DETECT AND FIX: Copy-pasted marketing speak
      const rawProduct = details.product || '';
      if (body.includes(rawProduct) && rawProduct.length > 50) {
        // This is likely copy-pasted marketing speak - fix it
        body = this.translateMarketingSpeak(body, details);
        logger.warn('Fixed copy-pasted marketing speak in email', {
          emailIndex: index,
        });
      }

      // DETECT AND FIX: Corporate template language
      const corporatePatterns = [
        'I hope this email finds you well',
        "We're excited to help you find the perfect vehicle solution",
        "Please don't hesitate to contact us",
        'Thank you for your interest in our services',
      ];

      corporatePatterns.forEach(pattern => {
        if (body.includes(pattern)) {
          body = body.replace(pattern, this.getAuthenticAlternative(pattern));
          logger.warn('Fixed corporate speak in email', {
            emailIndex: index,
            pattern,
          });
        }
      });

      // DETECT AND FIX: Missing conversation flow
      if (
        index === 0 &&
        !body.includes("What's driving") &&
        !body.includes("what's your")
      ) {
        // First email should ask a genuine question
        body = body.replace(
          /\n\n{agentName}$/,
          "\n\nWhat's driving the search right now?\n\n{agentName}"
        );
        logger.warn('Added genuine question to first email', {
          emailIndex: index,
        });
      }

      return { ...email, subject, body };
    });
  }

  /**
   * Translate marketing speak into authentic language
   */
  private translateMarketingSpeak(text: string, details: any): string {
    const rawProduct = details.product || '';

    // Extract genuine value
    const hasZeroPercent = rawProduct.includes('0%');
    const isWeekendSale = rawProduct.includes('weekend');

    // Replace with authentic language
    let translated = text.replace(
      rawProduct,
      `a big sale event ${isWeekendSale ? 'this weekend' : 'right now'}. Honestly, most of the noise is just marketing, but the ${hasZeroPercent ? '0% financing' : 'financing'} offer is the real deal`
    );

    return translated;
  }

  /**
   * Get authentic alternatives to corporate speak
   */
  private getAuthenticAlternative(corporatePhrase: string): string {
    const alternatives: Record<string, string> = {
      'I hope this email finds you well': 'Hey',
      "We're excited to help you find the perfect vehicle solution":
        "What's driving the search right now?",
      "Please don't hesitate to contact us": 'Let me know what you think',
      'Thank you for your interest in our services': 'Thanks for reaching out',
    };

    return alternatives[corporatePhrase] || corporatePhrase;
  }

  /**
   * Enhance campaign context with sophisticated AI-generated content
   */
  async enhanceCampaignField(
    field: string,
    campaignData: any
  ): Promise<string> {
    if (field !== 'context') {
      throw new Error(`Unsupported field enhancement: ${field}`);
    }

    const systemPrompt = `You are a friendly, professional, empathetic automotive sales expert. Your job is to enhance campaign context with clear, actionable guidance that helps agents create authentic, engaging email templates.

**Tone and Style:**
- Friendly and professional
- Empathetic but goal-oriented
- Conversational and authentic

**Enhancement Rules:**
1. Avoid corporate speak (e.g., "strategic value" or "ROI").
2. Use simple, direct language that resonates with real people.
3. Focus on building rapport and reducing buyer hesitation.
4. Highlight urgency, accessibility, and exclusivity in messaging.

**Output Format:**
- Campaign Overview: [Brief summary of the campaign goals and audience]
- Target Audience: [Who the campaign is for, e.g., first-time buyers, deal-motivated customers]
- Key Offers: [Promotions, benefits, and pricing details]
- Messaging Focus: [Urgency, accessibility, exclusivity]
- Tone: [Energetic, action-oriented, conversational]

Write like you’re briefing a friend who sells cars. Keep it simple and real.`;

    const userPrompt = `Enhance the campaign context for: ${campaignData.name || 'this campaign'}

What we’re selling: ${campaignData.product || 'cars'}
Key benefits: ${campaignData.benefits?.join(', ') || 'good deals'}
Pricing: ${campaignData.pricing || 'competitive pricing'}
Urgency: ${campaignData.urgency || 'limited time'}
Target audience: ${campaignData.targetAudience || 'deal-motivated buyers'}

Write it like this format:
- Campaign Overview: [Brief summary]
- Target Audience: [Who it’s for]
- Key Offers: [Promotions and benefits]
- Messaging Focus: [Urgency, accessibility, exclusivity]
- Tone: [Energetic, action-oriented, conversational]`;

    try {
      const enhanced = await this.generateResponse(
        userPrompt,
        systemPrompt,
        {
          leadId: 'system',
          type: 'campaign_context_enhancement',
          metadata: { campaignName: campaignData.name },
        },
        {
          model: 'openai/gpt-4o',
          requiresReasoning: true,
          businessCritical: true,
          temperature: 0.7,
          maxTokens: 1500,
        }
      );

      return enhanced.trim();
    } catch (error) {
      console.error('Failed to enhance campaign context with AI', error);
      return this.getFallbackContextEnhancement(campaignData);
    }
  }

  private getFallbackContextEnhancement(campaignData: any): string {
    const campaignName = campaignData.name || 'Car Sales Campaign';
    const product = campaignData.product || 'vehicles';
    const benefits =
      campaignData.benefits?.join(', ') || 'good financing, reliable cars';
    const targetCount = campaignData.targetCount || 50;

    return `Campaign Overview: ${campaignName} is about helping ${targetCount} people who are looking for ${product}. We want to connect with folks who need cars and help them find what works.

Target Audience: Real people who need cars - families looking for something bigger, people with credit issues, first-time buyers, folks whose current car is giving them problems.

What We're Offering: ${benefits}. We're not trying to oversell - just help people get into reliable vehicles they can afford.

Common Questions: "Can I afford this?", "Will I get approved?", "Is this car reliable?", "What's my trade worth?", "Are there hidden fees?"

How to Talk to Them: Ask what they need, be honest about pricing, let them test drive, explain financing clearly, don't pressure them.

What Success Looks Like: People actually show up for test drives, they come back with questions, they bring their spouse to look, they get approved for financing they can handle.`;
  }

  // Override getMockResponse for email-specific mock behavior
  protected getMockResponse(prompt: string): string {
    if (prompt.includes('5-email') || prompt.includes('sequence')) {
      return JSON.stringify([
        {
          subject: 'Quick question about your car financing needs',
          body: "Hello {firstName},\n\nThanks for your interest in car financing! I see you're exploring your options, and I'm excited to help you find the perfect solution.\n\nTo get started, what type of vehicle are you looking to finance, or are you considering refinancing an existing loan? Knowing your specific situation will help me provide the most relevant guidance.\n\nBest regards,\n{agentName}",
          order: 1,
        },
        {
          subject: 'Following up on your financing inquiry',
          body: "Hi {firstName},\n\nI wanted to follow up on your car financing inquiry. Most people I work with find the process overwhelming with so many lenders advertising different rates.\n\nHere's what I've learned: the banks with the flashy ads often aren't the ones that actually approve you. The real success comes from matching you with lenders who specialize in your specific situation.\n\nWould you like me to explain how this works?\n\nBest regards,\n{agentName}",
          order: 2,
        },
        {
          subject: 'Success story you might find encouraging',
          body: "Hi {firstName},\n\nI just helped Mike secure financing yesterday, and I thought you might find his story encouraging. He was convinced his credit situation would prevent him from getting a good rate.\n\nTurns out there was a lender who specializes in exactly his circumstances. He's now driving his dream truck with a 4.2% APR rate he never thought possible.\n\nWant me to check what options might be available for your situation?\n\nBest regards,\n{agentName}",
          order: 3,
        },
        {
          subject: "I've been thinking about your financing needs",
          body: "Hi {firstName},\n\nYour financing inquiry has been on my mind, and I really believe I can help you secure better terms than what you're seeing elsewhere.\n\nBased on what you're looking for, I think we could find you some excellent options. Would you be open to a brief conversation to explore this further?\n\n[Check Your Rate](#)\n\nBest regards,\n{agentName}",
          order: 4,
        },
        {
          subject: 'Final note about your car financing',
          body: "Hi {firstName},\n\nThis is my final email about car financing options. I don't want to overwhelm your inbox, but I also don't want you to miss out on rates that could save you money.\n\nIf you're still interested in exploring your options, I'm here to help: [Take a Look](#)\n\nIf not, I completely understand and wish you all the best with your financing needs.\n\nBest regards,\n{agentName}",
          order: 5,
        },
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

  async processMessage(
    message: string,
    context: AgentContext
  ): Promise<string> {
    const { lead, campaign } = context;

    // Store incoming message in supermemory
    await this.storeMemory(
      `Email from ${lead.firstName || ''} ${lead.lastName || ''}: ${message}`,
      {
        leadId: lead.id,
        type: 'email_received',
        source: lead.source,
      }
    );

    // Search for previous email interactions
    const memories = await this.searchMemory(
      `email ${lead.firstName || ''} ${lead.lastName || ''} ${lead.id}`
    );
    const emailHistory = memories
      .filter(m => m.metadata?.type?.includes('email'))
      .slice(0, 3);

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

    const response = await this.generateResponse(prompt, systemPrompt, {
      leadId: lead.id,
      leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      type: 'email_sent',
      metadata: { campaign: campaign?.name },
    });

    return response;
  }

  async makeDecision(_context: AgentContext): Promise<AgentDecision> {
    // Email agent doesn't make strategic decisions, that's Overlord's job
    return {
      action: 'send_email',
      reasoning: 'Email agent executing communication task',
      data: {},
    };
  }

  async sendEmail(to: string, subject: string): Promise<any> {
    try {
      // For now, always use mock response since MailgunService implementation is incomplete
      logger.info('Email agent simulated send - using mock implementation', {
        to,
        subject,
      });
      const mockResponse = {
        id: `mock-${Date.now()}@example.com`,
        message: 'Simulated email send (mock implementation)',
      };

      // Store successful email send in supermemory
      await this.storeMemory(`Email sent to ${to}: ${subject}`, {
        recipient: to,
        subject,
        type: 'email_delivery',
        status: 'sent',
        externalId: mockResponse.id,
      });

      logger.info('Email communication sent (mock)', {
        recipient: to,
        subject,
        mock: true,
      });
      return mockResponse;
    } catch (error) {
      logger.error('Email communication failed', {
        recipient: to,
        subject,
        error: (error as Error).message,
      });
      // Return mock response instead of throwing
      return {
        id: `mock-error-${Date.now()}@example.com`,
        message: 'Email send failed, returning mock response',
        error: (error as Error).message,
      };
    }
  }

  async generateInitialEmail(
    context: AgentContext,
    focus: string
  ): Promise<string> {
    const { lead } = context;

    // Search for similar leads or previous campaigns for context
    const memories = await this.searchMemory(
      `initial email ${lead.source} ${focus}`
    );
    const similarInteractions = memories
      .slice(0, 2)
      .map(m => m.content)
      .join('\n');

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

    const email = await this.generateResponse(prompt, systemPrompt, {
      leadId: lead.id,
      leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      type: 'initial_email',
      metadata: { focus, source: lead.source },
    });

    return email;
  }
}
