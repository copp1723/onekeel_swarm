import { Lead, LeadsRepository, AgentDecisionsRepository } from '../db';
import { logger } from '../utils/logger';
import { BaseAgent, AgentContext, AgentDecision } from './base-agent';

interface BoberdooResponse {
  success: boolean;
  matched: boolean;
  buyerId?: string;
  price?: number;
  message?: string;
}

// Minimal safe defaults used only if campaign.settings is missing
const minimalDefaults = {
  channels: ['email'],
  defaultChannel: 'email',
  qualificationCriteria: {
    minScore: 50,
    requiredFields: ['name', 'email', 'phone'],
    requiredGoals: []
  },
  allowDualChannel: false,
  primaryChannel: 'email',
  goals: []
};

function buildPrompts(lead: Lead, campaignSettings?: any) {
  // Use minimal defaults if campaignSettings is missing
  const settings = campaignSettings || minimalDefaults;

  // Note in system prompt if campaign settings are missing
  const missingSettingsNote = campaignSettings ? '' : '\nNOTE: Campaign settings are missing, using minimal safe defaults.\n';

  const systemPrompt = `You are the Overlord Agent, responsible for lead management and campaign orchestration.
Your job is to act as a deterministic campaign decision engine and return ONLY a valid JSON object according to the output schema below.

Instructions:
1. Evaluate the provided lead and campaign context using all provided data.
2. Assign communication channels ("email", "sms", or both) based on campaign configuration and lead preferences.
3. Follow client-specific campaign rules and compliance requirements (provided below).
4. Determine if/when a lead is qualified for handover or for external submission (e.g., Boberdoo).
5. Always explain your reasoning for each decision in plain language.
6. If uncertain, return a JSON object with "action": "request_more_info" and specify what is missing.

Output Format:
Return ONLY a valid JSON object.
{
  "action": "assign_channel|qualify_lead|send_to_boberdoo|archive|request_more_info",
  "channels": ["email", "sms"],
  "reasoning": "Explain your decision here.",
  "initialMessageFocus": "What should the first message focus on?"
}

Campaign Configuration: ${JSON.stringify(settings, null, 2)}
${missingSettingsNote}

Business Rules:
- Never assign a channel that is not enabled in the campaign config.
- If the lead has opted out of a channel, exclude it.
- If campaign is "A/B test", alternate assignment as instructed.
- For dual-channel, always prefer email for initial contact unless otherwise specified.
- If campaign or client has compliance flags, always prioritize those.
`;

  const prompt = `Evaluate this lead and decide the next action:
Lead Information:
- Name: ${lead.firstName || ''} ${lead.lastName || ''}
- Email: ${lead.email || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Source: ${lead.source}
- Current Status: ${lead.status}
- Metadata: ${JSON.stringify(lead.metadata || {})}

Respond in JSON format:
{
  "action": "assign_channel|qualify_lead|send_to_boberdoo|archive",
  "channels": ["email","sms","chat"],
  "reasoning": "Your reasoning here",
  "initialMessageFocus": "Brief description of what to discuss"
}`;

  return { prompt, systemPrompt };
}

export class OverlordAgent extends BaseAgent {
  constructor() {
    super('overlord');
  }

  async processMessage(message: string, context: AgentContext): Promise<string> {
    // Store conversation in memory
    await this.storeMemory(`Lead ${context.lead.id} message: ${message}`, {
      leadId: context.lead.id,
      type: 'conversation',
      channel: 'overlord'
    });

    // Search for relevant past interactions
    const memories = await this.searchMemory(`lead ${context.lead.id} conversation`);
    const conversationContext = memories.map(m => m.content).join('\n');

    return `Overlord processed: ${message} (with context: ${conversationContext.substring(0, 100)}...)`;
  }
  async makeDecision(context: AgentContext): Promise<AgentDecision> {
    const { lead, campaign } = context;
    // Use unified campaign settings or minimal defaults
    const settings = campaign?.settings || minimalDefaults;

    // Determine default channels based on campaign settings and lead preferences
    // Comments clarify config-driven logic
    let channels = [settings.defaultChannel || 'email'];

    // Allow dual channel if enabled in campaign settings
    if (settings.allowDualChannel) {
      // Prefer email first unless primaryChannel is sms
      channels = settings.primaryChannel === 'sms' ? ['sms', 'email'] : ['email', 'sms'];
    } else if ((lead.metadata as any)?.preferredChannel && Array.isArray(settings.channels) && settings.channels.includes((lead.metadata as any).preferredChannel)) {
      // Use lead's preferred channel only if enabled in campaign channels
      channels = [(lead.metadata as any).preferredChannel];
    }

    const { prompt, systemPrompt } = buildPrompts(lead, settings);

    const response = await this.callOpenRouter(prompt, systemPrompt, {
      decisionType: 'strategy',
      businessCritical: true,
      requiresReasoning: true,
      responseFormat: { type: 'json_object' },
      temperature: 0.3
    });
    const decision = JSON.parse(response);

    // Normalize channels: ensure channels is an array with valid channels from campaign settings
    let decidedChannels: string[] = [];
    if (Array.isArray(decision.channels) && Array.isArray(settings.channels)) {
      decidedChannels = decision.channels.filter((ch: string) => settings.channels.includes(ch));
    } else if (typeof decision.channels === 'string' && Array.isArray(settings.channels) && settings.channels.includes(decision.channels)) {
      decidedChannels = [decision.channels];
    }

    // Fallback if no valid channels provided, use computed channels from settings and lead preferences
    if (decidedChannels.length === 0) {
      decidedChannels = channels;
    }

    // Update lead metadata with assigned channel
    const primaryChannel = decidedChannels[0];
    if (primaryChannel) {
      const updatedMetadata = {
        ...(lead.metadata as Record<string, any> || {}),
        assignedChannel: primaryChannel
      };
      // Note: You may need to implement updateMetadata in LeadsRepository
      // For now, we'll skip this update or implement it later
    }

    const result = {
      action: decision.action,
      reasoning: decision.reasoning,
      data: {
        channels: decidedChannels,
        initialMessageFocus: decision.initialMessageFocus || ''
      }
    };

    // Save decision only if action or channels differ
    await AgentDecisionsRepository.create(
      lead.id,
      'overlord',
      decision.action,
      decision.reasoning,
      { channels: decidedChannels, initialMessageFocus: decision.initialMessageFocus || '' }
    );

    return result;
  }

  async evaluateConversation(conversationHistory: any[], context: { campaign?: any; lead: Lead }): Promise<any> {
    // Use unified campaign settings or minimal defaults
    const settings = context.campaign?.settings || minimalDefaults;

    // Join goals and requiredGoals with fallback only if undefined
    const campaignGoals = Array.isArray(settings.goals) ? settings.goals.join(', ') : 'No specific goals';
    const requiredGoals = (settings.qualificationCriteria && Array.isArray(settings.qualificationCriteria.requiredGoals))
      ? settings.qualificationCriteria.requiredGoals.join(', ')
      : 'None';

    const systemPrompt = `Evaluate conversation for campaign goals:
Campaign Goals: ${campaignGoals}
Required Goals: ${requiredGoals}`;

    const prompt = `Evaluate this conversation history and determine lead qualification:

Conversation History:
${JSON.stringify(conversationHistory, null, 2)}

Respond in JSON format:
{
  "action": "continue_conversation|qualify_lead|send_to_boberdoo|archive",
  "reasoning": "Your reasoning here",
  "goalsMet": ["goal1", "goal2"],
  "qualified": true|false,
  "nextSteps": "Brief description"
}`;

    const response = await this.callOpenRouter(prompt, systemPrompt, {
      decisionType: 'evaluation',
      conversationHistory,
      businessCritical: true,
      requiresReasoning: true,
      responseFormat: { type: 'json_object' },
      temperature: 0.3
    });
    const evaluation = JSON.parse(response);

    return {
      action: evaluation.action,
      reasoning: evaluation.reasoning,
      data: {
        goalsMet: evaluation.goalsMet || [],
        qualified: evaluation.qualified,
        nextSteps: evaluation.nextSteps || ''
      }
    };
  }

  async submitToBoberdoo(lead: Lead, testMode: boolean = false): Promise<BoberdooResponse> {
    const metadata = lead.metadata as Record<string, any> || {};
    const isTestLead = metadata.Test_Lead === '1' || metadata.zip === '99999' || testMode;
    const boberdooUrl = process.env.BOBERDOO_API_URL || 'https://api.boberdoo.com';
    const apiKey = process.env.BOBERDOO_API_KEY;

    const leadData = {
      api_key: apiKey,
      src: lead.source,
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
      email: lead.email,
      phone: lead.phone,
      zip: metadata.zip || '',
      ...(isTestLead ? { Test_Lead: '1' } : {}),
      ...metadata
    };

    try {
      const response = await fetch(`${boberdooUrl}/leadPost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/xml'
        },
        body: new URLSearchParams(leadData as any).toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const matched = xmlText.includes('<status>matched</status>');
      const buyerIdMatch = xmlText.match(/<buyer_id>([^<]+)<\/buyer_id>/);
      const priceMatch = xmlText.match(/<price>([^<]+)<\/price>/);

      const result = {
        success: true,
        matched,
        buyerId: buyerIdMatch?.[1],
        price: priceMatch ? parseFloat(priceMatch[1]) : undefined,
        message: xmlText
      };

      logger.info('Boberdoo API success', {
        leadId: lead.id,
        matched,
        buyerId: result.buyerId,
        isTest: isTestLead
      });

      if (matched && result.buyerId) {
        await LeadsRepository.updateStatus(lead.id, 'sent_to_boberdoo', result.buyerId);
        await AgentDecisionsRepository.create(
          lead.id,
          'overlord',
          'boberdoo_matched',
          `Lead matched to buyer ${result.buyerId} for ${result.price || 0}`,
          { buyerId: result.buyerId, price: result.price, isTest: isTestLead }
        );
      } else {
        await AgentDecisionsRepository.create(
          lead.id,
          'overlord',
          'boberdoo_no_match',
          'No matching buyer found in Boberdoo',
          { isTest: isTestLead }
        );
      }

      return result;
    } catch (error) {
      logger.error('Boberdoo API error', {
        error: error as Error,
        leadId: lead.id
      });
      await AgentDecisionsRepository.create(
        lead.id,
        'overlord',
        'boberdoo_error',
        `Error submitting to Boberdoo: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : error }
      );

      return {
        success: false,
        matched: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  isLeadReadyForBoberdoo(lead: Lead, campaign?: any): boolean {
    // Use unified campaign settings or minimal defaults
    const settings = campaign?.settings || minimalDefaults;
    const requiredFields = settings.qualificationCriteria?.requiredFields || ['name', 'email', 'phone'];
    const metadata = lead.metadata as Record<string, any> || {};
    return requiredFields.every((field: string) => {
      // Check direct lead properties
      if (field === 'name') {
        return !!(lead.firstName || lead.lastName);
      }
      if (field === 'email') return !!lead.email;
      if (field === 'phone') return !!lead.phone;
      
      // Check metadata for other fields
      return !!metadata[field];
    });
  }

}