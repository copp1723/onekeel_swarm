import { logger } from '../utils/logger.js';
import { db } from '../db/client.js';
import { leads, conversations, communications, campaigns } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Create temporary repository classes until proper repositories are implemented
class LeadsRepository {
  static async findById(id: string) {
    const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return result[0] || null;
  }
}

class ConversationsRepository {
  static async findByLeadId(leadId: string) {
    const result = await db.select().from(conversations).where(eq(conversations.leadId, leadId));
    return result.map(conv => ({
      ...conv,
      messages: conv.transcript || [] // transcript contains messages
    }));
  }
}

class CommunicationsRepository {
  static async findByLeadId(leadId: string) {
    return await db.select().from(communications).where(eq(communications.leadId, leadId));
  }
}

class CampaignsRepository {
  static async findById(id: string) {
    const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return result[0] || null;
  }
  
  static async getDefaultCampaign() {
    const result = await db.select().from(campaigns).limit(1);
    return result[0] || null;
  }
}

class HandoverService {
  static async getCrossChannelContext(leadId: string) {
    console.log(`Getting cross-channel context for lead ${leadId}`);
    return {};
  }
  
  static async analyzeConversation(_conversation: any): Promise<ConversationAnalysis> {
    // Mock analysis - in real implementation this would use AI/ML
    return {
      sentimentScore: Math.random() * 2 - 1, // -1 to 1
      urgencyLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      qualificationScore: Math.random() * 10, // 0 to 10
      goalProgress: {
        budget_confirmed: Math.random() > 0.5,
        timeline_established: Math.random() > 0.5,
        decision_maker: Math.random() > 0.5,
        interest_level: Math.random() > 0.5,
        contact_info: Math.random() > 0.5
      }
    };
  }
}

// Temporary type definitions - these should come from the actual services
interface HandoverEvaluation {
  reason: string;
  triggeredCriteria: string[];
  score: number;
}

interface ConversationAnalysis {
  sentimentScore: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  qualificationScore: number;
  goalProgress: Record<string, boolean>;
}

export interface LeadDossier {
  context: string;
  leadSnapshot: {
    name: string;
    contactInfo: {
      phone: string | null;
      email: string | null;
    };
    leadOrigin: string;
    purchaseTiming: string;
    interests: string[];
    additionalNotes: string[];
  };
  communicationSummary: {
    interactionHighlights: string[];
    toneAndStyle: string[];
    engagementPattern: string[];
  };
  profileAnalysis: {
    buyerType: string[];
    keyHooks: string[];
  };
  handoverTrigger: {
    reason: string;
    triggeredCriteria: string[];
    score: number;
    urgency: 'low' | 'medium' | 'high';
  };
  conversationHistory: {
    channel: string;
    messageCount: number;
    lastActivity: string;
    keyExchanges: Array<{
      timestamp: string;
      role: 'agent' | 'lead';
      content: string;
      significance: 'high' | 'medium' | 'low';
    }>;
  }[];
  recommendations: {
    nextSteps: string[];
    approachStrategy: string;
    timeline: string;
    urgentActions: string[];
  };
}

export class LeadDossierService {
  /**
   * Generate a comprehensive handover dossier for a lead
   */
  static async generateDossier(
    leadId: string,
    handoverEvaluation: HandoverEvaluation,
    triggeringConversationId?: string
  ): Promise<LeadDossier> {
    try {
      logger.info('Generating lead dossier', { leadId, triggeringConversationId });

      // Gather all lead data
      const [lead, conversations, _communications, _crossChannelContext] = await Promise.all([
        LeadsRepository.findById(leadId),
        ConversationsRepository.findByLeadId(leadId),
        CommunicationsRepository.findByLeadId(leadId),
        HandoverService.getCrossChannelContext(leadId)
      ]);

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Get campaign information
      const campaign = lead.campaign_id 
        ? await CampaignsRepository.findById(lead.campaign_id)
        : await CampaignsRepository.getDefaultCampaign();

      // Analyze all conversations for insights
      const conversationAnalyses = await Promise.all(
        conversations.map(conv => HandoverService.analyzeConversation(conv))
      );

      // Generate dossier sections
      const dossier: LeadDossier = {
        context: await this.generateContext(lead, handoverEvaluation, campaign),
        leadSnapshot: await this.generateLeadSnapshot(lead, conversations, campaign),
        communicationSummary: await this.generateCommunicationSummary(conversations, conversationAnalyses),
        profileAnalysis: await this.generateProfileAnalysis(lead, conversations, conversationAnalyses),
        handoverTrigger: {
          reason: handoverEvaluation.reason,
          triggeredCriteria: handoverEvaluation.triggeredCriteria,
          score: handoverEvaluation.score,
          urgency: this.determineUrgency(handoverEvaluation, conversationAnalyses)
        },
        conversationHistory: await this.generateConversationHistory(conversations),
        recommendations: await this.generateRecommendations(lead, conversations, conversationAnalyses, handoverEvaluation)
      };

      logger.info('Lead dossier generated successfully', { leadId, sections: Object.keys(dossier) });
      return dossier;

    } catch (error) {
      logger.error('Error generating lead dossier', { leadId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Generate the context section explaining why handover occurred
   */
  private static async generateContext(
    _lead: any,
    handoverEvaluation: HandoverEvaluation,
    _campaign: any
  ): Promise<string> {
    const purchaseIntent = handoverEvaluation.score >= 7 ? 'clear purchase intent' : 'growing interest';
    const triggerType = handoverEvaluation.triggeredCriteria.includes('qualification_score') 
      ? 'qualification thresholds' 
      : 'engagement thresholds';

    let context = `This lead has shown ${purchaseIntent} and triggered a handover based on ${triggerType}.`;

    if (handoverEvaluation.triggeredCriteria.includes('keyword_triggers')) {
      context += ' They have expressed specific buying signals and are actively engaged in the decision process.';
    } else if (handoverEvaluation.triggeredCriteria.includes('goal_completion')) {
      context += ' They have completed key qualification milestones and are ready for human engagement.';
    } else if (handoverEvaluation.triggeredCriteria.includes('conversation_length')) {
      context += ' They have demonstrated sustained engagement and are ready for personalized attention.';
    }

    return context;
  }

  /**
   * Generate lead snapshot with key identifying information
   */
  private static async generateLeadSnapshot(
    lead: any,
    conversations: any[],
    campaign: any
  ): Promise<LeadDossier['leadSnapshot']> {
    // Determine purchase timing from conversation content
    const purchaseTiming = this.extractPurchaseTiming(conversations);
    
    // Extract interests from conversation analysis
    const interests = this.extractInterests(conversations);
    
    // Generate lead origin description
    const leadOrigin = this.generateLeadOrigin(lead, campaign);
    
    // Extract additional notes from metadata
    const additionalNotes = this.extractAdditionalNotes(lead, conversations);

    return {
      name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Name not provided',
      contactInfo: {
        phone: lead.phone || null,
        email: lead.email || null
      },
      leadOrigin,
      purchaseTiming,
      interests,
      additionalNotes
    };
  }

  /**
   * Generate communication summary analyzing interaction patterns
   */
  private static async generateCommunicationSummary(
    conversations: any[],
    analyses: ConversationAnalysis[]
  ): Promise<LeadDossier['communicationSummary']> {
    const interactionHighlights: string[] = [];
    const toneAndStyle: string[] = [];
    const engagementPattern: string[] = [];

    // Analyze interaction highlights from all conversations
    for (const conversation of conversations) {
      const highlights = this.extractInteractionHighlights(conversation);
      interactionHighlights.push(...highlights);
    }

    // Determine overall tone and style
    const overallSentiment = analyses.reduce((sum, analysis) => sum + analysis.sentimentScore, 0) / analyses.length;
    if (overallSentiment > 1) {
      toneAndStyle.push('Positive and enthusiastic in responses');
    } else if (overallSentiment > 0) {
      toneAndStyle.push('Professional and engaged');
    } else {
      toneAndStyle.push('Cautious but responsive');
    }

    // Analyze response patterns
    const responsePatterns = this.analyzeResponsePatterns(conversations);
    toneAndStyle.push(...responsePatterns);

    // Determine engagement pattern
    const urgencyLevels = analyses.map(a => a.urgencyLevel);
    if (urgencyLevels.includes('high')) {
      engagementPattern.push('High urgency, looking to move quickly');
    }
    
    engagementPattern.push(...this.extractEngagementPatterns(conversations, analyses));

    return {
      interactionHighlights: interactionHighlights.slice(0, 5), // Top 5 highlights
      toneAndStyle: toneAndStyle.slice(0, 3), // Top 3 style observations
      engagementPattern: engagementPattern.slice(0, 3) // Top 3 patterns
    };
  }

  /**
   * Generate profile analysis with buyer type and key hooks
   */
  private static async generateProfileAnalysis(
    _lead: any,
    conversations: any[],
    analyses: ConversationAnalysis[]
  ): Promise<LeadDossier['profileAnalysis']> {
    const buyerType: string[] = [];
    const keyHooks: string[] = [];

    // Determine buyer type from conversation behavior
    const avgQualificationScore = analyses.reduce((sum, analysis) => sum + analysis.qualificationScore, 0) / analyses.length;
    
    if (avgQualificationScore >= 7) {
      buyerType.push('Highly qualified, ready to make decisions');
    } else if (avgQualificationScore >= 5) {
      buyerType.push('Evaluating options, needs additional convincing');
    } else {
      buyerType.push('Early stage, requires nurturing and education');
    }

    // Analyze communication style for buyer characteristics
    const communicationStyle = this.analyzeCommunicationStyle(conversations);
    buyerType.push(...communicationStyle);

    // Extract key hooks from goal progress and interests
    const goalProgress = analyses.reduce((combined, analysis) => {
      return { ...combined, ...analysis.goalProgress };
    }, {});

    Object.entries(goalProgress).forEach(([goal, completed]) => {
      if (completed) {
        keyHooks.push(...this.getHooksForGoal(goal));
      }
    });

    // Add interest-based hooks
    const interestHooks = this.extractInterestBasedHooks(conversations);
    keyHooks.push(...interestHooks);

    return {
      buyerType: buyerType.slice(0, 3),
      keyHooks: [...new Set(keyHooks)].slice(0, 4) // Unique hooks, max 4
    };
  }

  /**
   * Generate conversation history with key exchanges
   */
  private static async generateConversationHistory(
    conversations: any[]
  ): Promise<LeadDossier['conversationHistory']> {
    return conversations.map(conversation => ({
      channel: conversation.channel,
      messageCount: conversation.messages.length,
      lastActivity: conversation.endedAt ? 
        conversation.endedAt.toISOString() : 
        'Active',
      keyExchanges: this.extractKeyExchanges(conversation.messages)
    }));
  }

  /**
   * Generate actionable recommendations for human rep
   */
  private static async generateRecommendations(
    _lead: any,
    _conversations: any[],
    analyses: ConversationAnalysis[],
    handoverEvaluation: HandoverEvaluation
  ): Promise<LeadDossier['recommendations']> {
    const nextSteps: string[] = [];
    let approachStrategy = '';
    let timeline = '';
    const urgentActions: string[] = [];

    // Determine urgency-based timeline
    const maxUrgency = analyses.reduce((max, analysis) => 
      analysis.urgencyLevel === 'high' ? 'high' : 
      analysis.urgencyLevel === 'medium' && max !== 'high' ? 'medium' : max, 
      'low' as 'low' | 'medium' | 'high'
    );

    switch (maxUrgency) {
      case 'high':
        timeline = 'Contact within 24 hours';
        urgentActions.push('Schedule immediate follow-up call');
        break;
      case 'medium':
        timeline = 'Contact within 2-3 business days';
        break;
      default:
        timeline = 'Contact within 1 week';
    }

    // Generate next steps based on qualification progress
    const avgScore = analyses.reduce((sum, a) => sum + a.qualificationScore, 0) / analyses.length;
    
    if (avgScore >= 7) {
      nextSteps.push('Prepare detailed proposal or pricing');
      nextSteps.push('Schedule product demo or consultation');
      approachStrategy = 'Lead is highly qualified - focus on closing and addressing final objections';
    } else if (avgScore >= 5) {
      nextSteps.push('Address remaining qualification questions');
      nextSteps.push('Provide additional product information');
      approachStrategy = 'Lead is interested but needs more convincing - focus on value proposition';
    } else {
      nextSteps.push('Continue education and relationship building');
      nextSteps.push('Identify specific needs and pain points');
      approachStrategy = 'Lead is early stage - focus on building trust and understanding needs';
    }

    // Add specific actions based on triggered criteria
    if (handoverEvaluation.triggeredCriteria.includes('keyword_triggers')) {
      urgentActions.push('Address specific concerns or questions mentioned');
    }

    if (handoverEvaluation.triggeredCriteria.includes('goal_completion')) {
      nextSteps.push('Build on completed qualification milestones');
    }

    return {
      nextSteps: nextSteps.slice(0, 4),
      approachStrategy,
      timeline,
      urgentActions: urgentActions.slice(0, 3)
    };
  }

  // Helper methods for content extraction and analysis

  private static extractPurchaseTiming(conversations: any[]): string {
    const timeKeywords = {
      immediate: ['now', 'asap', 'immediately', 'today', 'this week'],
      soon: ['soon', 'next week', 'next month', 'shortly'],
      planning: ['planning', 'considering', 'thinking about', 'in the future']
    };

    for (const conversation of conversations) {
      for (const message of conversation.messages) {
        if (message.role === 'lead') {
          const content = message.content.toLowerCase();
          
          if (timeKeywords.immediate.some(keyword => content.includes(keyword))) {
            return 'Immediate — looking to move forward quickly';
          }
          if (timeKeywords.soon.some(keyword => content.includes(keyword))) {
            return 'Near-term — planning to proceed within weeks';
          }
          if (timeKeywords.planning.some(keyword => content.includes(keyword))) {
            return 'Planning stage — evaluating options for future implementation';
          }
        }
      }
    }

    return 'Timeline not specified — requires clarification';
  }

  private static extractInterests(conversations: any[]): string[] {
    const interests: string[] = [];
    const interestKeywords = {
      'pricing': ['price', 'cost', 'budget', 'expensive', 'affordable'],
      'features': ['feature', 'capability', 'functionality', 'can it', 'does it'],
      'support': ['support', 'help', 'service', 'training', 'assistance'],
      'integration': ['integrate', 'connect', 'API', 'compatibility', 'work with'],
      'security': ['secure', 'security', 'safe', 'privacy', 'protection']
    };

    for (const conversation of conversations) {
      for (const message of conversation.messages) {
        if (message.role === 'lead') {
          const content = message.content.toLowerCase();
          
          Object.entries(interestKeywords).forEach(([interest, keywords]) => {
            if (keywords.some(keyword => content.includes(keyword))) {
              interests.push(interest);
            }
          });
        }
      }
    }

    return [...new Set(interests)]; // Remove duplicates
  }

  private static generateLeadOrigin(lead: any, campaign: any): string {
    let origin = lead.source || 'Unknown source';
    
    if (campaign) {
      origin += ` → ${campaign.name}`;
    }
    
    if (lead.metadata?.referrer) {
      origin += ` (${lead.metadata.referrer})`;
    }

    return origin;
  }

  private static extractAdditionalNotes(lead: any, conversations: any[]): string[] {
    const notes: string[] = [];
    
    // Add metadata notes
    if (lead.metadata?.notes) {
      notes.push(...lead.metadata.notes);
    }
    
    // Add cross-channel notes
    for (const conversation of conversations) {
      if (conversation.crossChannelContext?.sharedNotes) {
        notes.push(...conversation.crossChannelContext.sharedNotes);
      }
    }

    return notes;
  }

  private static extractInteractionHighlights(conversation: any): string[] {
    const highlights: string[] = [];
    
    for (const message of conversation.messages) {
      if (message.role === 'lead') {
        const content = message.content;
        
        // Look for questions
        if (content.includes('?')) {
          highlights.push(`Asked: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
        }
        
        // Look for strong positive/negative indicators
        const positiveWords = ['love', 'perfect', 'exactly', 'great', 'interested'];
        const negativeWords = ['concerned', 'worried', 'expensive', 'not sure'];
        
        if (positiveWords.some(word => content.toLowerCase().includes(word))) {
          highlights.push(`Positive response: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
        }
        
        if (negativeWords.some(word => content.toLowerCase().includes(word))) {
          highlights.push(`Concern expressed: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
        }
      }
    }

    return highlights;
  }

  private static analyzeResponsePatterns(conversations: any[]): string[] {
    const patterns: string[] = [];
    
    // Analyze response timing
    let quickResponses = 0;
    let totalResponses = 0;
    
    for (const conversation of conversations) {
      for (let i = 1; i < conversation.messages.length; i++) {
        const prevMessage = conversation.messages[i - 1];
        const currMessage = conversation.messages[i];
        
        if (prevMessage.role === 'agent' && currMessage.role === 'lead') {
          totalResponses++;
          const timeDiff = new Date(currMessage.timestamp).getTime() - new Date(prevMessage.timestamp).getTime();
          if (timeDiff < 60 * 60 * 1000) { // Less than 1 hour
            quickResponses++;
          }
        }
      }
    }
    
    if (totalResponses > 0) {
      const quickResponseRate = quickResponses / totalResponses;
      if (quickResponseRate > 0.7) {
        patterns.push('Highly responsive — replies quickly to messages');
      } else if (quickResponseRate > 0.4) {
        patterns.push('Moderately responsive — consistent engagement');
      } else {
        patterns.push('Deliberate responder — takes time to consider responses');
      }
    }

    return patterns;
  }

  private static extractEngagementPatterns(conversations: any[], _analyses: ConversationAnalysis[]): string[] {
    const patterns: string[] = [];
    
    // Analyze conversation depth
    const avgConversationLength = conversations.reduce((sum, conv) => sum + conv.messages.length, 0) / conversations.length;
    
    if (avgConversationLength > 10) {
      patterns.push('Deep engagement — participates in extended conversations');
    } else if (avgConversationLength > 5) {
      patterns.push('Moderate engagement — willing to continue dialogue');
    } else {
      patterns.push('Brief interactions — prefers concise exchanges');
    }

    // Analyze question-asking behavior
    const questionCount = conversations.reduce((count, conv) => {
      return count + conv.messages.filter((msg: any) => msg.role === 'lead' && msg.content.includes('?')).length;
    }, 0);

    if (questionCount > 5) {
      patterns.push('Highly inquisitive — asks detailed questions');
    } else if (questionCount > 2) {
      patterns.push('Seeks clarification — asks relevant questions');
    }

    return patterns;
  }

  private static analyzeCommunicationStyle(conversations: any[]): string[] {
    const styles: string[] = [];
    
    let totalWords = 0;
    let messageCount = 0;
    let formalLanguage = 0;
    
    for (const conversation of conversations) {
      for (const message of conversation.messages) {
        if (message.role === 'lead') {
          messageCount++;
          const words = message.content.split(' ').length;
          totalWords += words;
          
          // Check for formal language indicators
          const formalWords = ['however', 'furthermore', 'therefore', 'consequently'];
          if (formalWords.some(word => message.content.toLowerCase().includes(word))) {
            formalLanguage++;
          }
        }
      }
    }
    
    if (messageCount > 0) {
      const avgWordsPerMessage = totalWords / messageCount;
      
      if (avgWordsPerMessage > 50) {
        styles.push('Detailed communicator — provides comprehensive information');
      } else if (avgWordsPerMessage > 20) {
        styles.push('Balanced communicator — clear and informative');
      } else {
        styles.push('Concise communicator — prefers brief, direct messages');
      }
      
      const formalityRate = formalLanguage / messageCount;
      if (formalityRate > 0.3) {
        styles.push('Formal communication style');
      } else {
        styles.push('Casual and approachable communication style');
      }
    }

    return styles;
  }

  private static getHooksForGoal(goal: string): string[] {
    const goalHooks: Record<string, string[]> = {
      'budget_confirmed': ['Flexible financing options', 'Competitive pricing structure'],
      'timeline_established': ['Quick implementation timeline', 'Expedited service availability'],
      'decision_maker': ['Executive-level benefits', 'Strategic value proposition'],
      'interest_level': ['Product demonstrations', 'Success stories and case studies'],
      'contact_info': ['Personalized follow-up', 'Direct communication preference']
    };

    return goalHooks[goal] || [];
  }

  private static extractInterestBasedHooks(conversations: any[]): string[] {
    const hooks: string[] = [];
    
    // Analyze what the lead has shown interest in
    for (const conversation of conversations) {
      for (const message of conversation.messages) {
        if (message.role === 'lead') {
          const content = message.content.toLowerCase();
          
          if (content.includes('compare') || content.includes('vs') || content.includes('versus')) {
            hooks.push('Competitive advantages and differentiators');
          }
          
          if (content.includes('roi') || content.includes('return') || content.includes('value')) {
            hooks.push('ROI calculations and value metrics');
          }
          
          if (content.includes('team') || content.includes('colleagues') || content.includes('department')) {
            hooks.push('Team collaboration benefits');
          }
          
          if (content.includes('scale') || content.includes('grow') || content.includes('expansion')) {
            hooks.push('Scalability and growth support');
          }
        }
      }
    }

    return [...new Set(hooks)]; // Remove duplicates
  }

  private static extractKeyExchanges(messages: any[]): Array<{
    timestamp: string;
    role: 'agent' | 'lead';
    content: string;
    significance: 'high' | 'medium' | 'low';
  }> {
    const keyExchanges = [];
    
    for (const message of messages) {
      let significance: 'high' | 'medium' | 'low' = 'low';
      
      // Determine significance
      if (message.role === 'lead') {
        const content = message.content.toLowerCase();
        
        // High significance indicators
        if (content.includes('yes') || content.includes('interested') || 
            content.includes('budget') || content.includes('when') ||
            content.includes('price') || content.includes('sign up')) {
          significance = 'high';
        }
        // Medium significance indicators
        else if (content.includes('?') || content.includes('tell me') ||
                 content.includes('explain') || content.includes('how')) {
          significance = 'medium';
        }
      }
      
      // Only include medium and high significance exchanges
      if (significance !== 'low') {
        keyExchanges.push({
          timestamp: message.timestamp,
          role: message.role,
          content: message.content.substring(0, 200) + (message.content.length > 200 ? '...' : ''),
          significance
        });
      }
    }

    // Sort by significance and timestamp, return top 10
    return keyExchanges
      .sort((a, b) => {
        if (a.significance !== b.significance) {
          const sigOrder = { high: 3, medium: 2, low: 1 };
          return sigOrder[b.significance] - sigOrder[a.significance];
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, 10);
  }

  private static determineUrgency(
    handoverEvaluation: HandoverEvaluation,
    analyses: ConversationAnalysis[]
  ): 'low' | 'medium' | 'high' {
    // Check if any conversation analysis indicates high urgency
    if (analyses.some(analysis => analysis.urgencyLevel === 'high')) {
      return 'high';
    }

    // High qualification score indicates higher urgency
    if (handoverEvaluation.score >= 8) {
      return 'high';
    }

    // Medium urgency for moderately qualified leads
    if (handoverEvaluation.score >= 6 || 
        analyses.some(analysis => analysis.urgencyLevel === 'medium')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Format dossier for human-readable output (email, dashboard, etc.)
   */
  static formatDossierForHandover(dossier: LeadDossier): string {
    const { leadSnapshot, communicationSummary, profileAnalysis, handoverTrigger, recommendations } = dossier;

    return `
🏷️ LEAD HANDOVER DOSSIER
═══════════════════════════════════════

📋 CONTEXT
${dossier.context}

⸻

👤 LEAD SNAPSHOT

Name: ${leadSnapshot.name}
Contact Info: Phone = ${leadSnapshot.contactInfo.phone || 'Not provided'} | Email = ${leadSnapshot.contactInfo.email || 'Not provided'}
Lead Origin: ${leadSnapshot.leadOrigin}
Purchase Timing: ${leadSnapshot.purchaseTiming}
${leadSnapshot.interests.length > 0 ? `Interest Areas: ${leadSnapshot.interests.join(', ')}` : ''}
${leadSnapshot.additionalNotes.length > 0 ? `Additional Notes: ${leadSnapshot.additionalNotes.join('; ')}` : ''}

⸻

💬 COMMUNICATION SUMMARY

Interaction Highlights:
${communicationSummary.interactionHighlights.map(highlight => `\t• ${highlight}`).join('\n')}

Tone and Style:
${communicationSummary.toneAndStyle.map(style => `\t• ${style}`).join('\n')}

Engagement Pattern:
${communicationSummary.engagementPattern.map(pattern => `\t• ${pattern}`).join('\n')}

⸻

🎯 PROFILE ANALYSIS

Buyer Type:
${profileAnalysis.buyerType.map(type => `\t• ${type}`).join('\n')}

Key Hooks to Emphasize:
${profileAnalysis.keyHooks.map(hook => `\t• ${hook}`).join('\n')}

⸻

🚨 HANDOVER TRIGGER
Reason: ${handoverTrigger.reason}
Qualification Score: ${handoverTrigger.score}/10
Urgency: ${handoverTrigger.urgency.toUpperCase()}
Triggered Criteria: ${handoverTrigger.triggeredCriteria.join(', ')}

⸻

📋 RECOMMENDED NEXT STEPS

Approach Strategy: ${recommendations.approachStrategy}

Immediate Actions:
${recommendations.nextSteps.map(step => `\t• ${step}`).join('\n')}

Timeline: ${recommendations.timeline}

${recommendations.urgentActions.length > 0 ? `Urgent Actions:\n${recommendations.urgentActions.map(action => `\t• ${action}`).join('\n')}` : ''}

⸻

📞 CONVERSATION HISTORY
${dossier.conversationHistory.map(conv => 
  `Channel: ${conv.channel} | Messages: ${conv.messageCount} | Last Activity: ${conv.lastActivity}`
).join('\n')}

${dossier.conversationHistory.length > 0 && dossier.conversationHistory[0].keyExchanges.length > 0 ? 
  `\nKey Exchanges:\n${dossier.conversationHistory[0].keyExchanges
    .filter(exchange => exchange.significance === 'high')
    .slice(0, 3)
    .map(exchange => `\t• ${exchange.role === 'lead' ? 'Lead' : 'Agent'}: "${exchange.content}"`)
    .join('\n')}` : ''
}
`.trim();
  }
}