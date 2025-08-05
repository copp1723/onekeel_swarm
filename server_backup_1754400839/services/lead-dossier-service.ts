import { logger } from '../utils/logger';

export interface LeadDossier {
  leadSnapshot: {
    name: string;
    email: string;
    phone: string;
    source: string;
    status: string;
    qualificationScore: number;
  };
  handoverTrigger: {
    reason: string;
    urgency: 'low' | 'medium' | 'high';
    timestamp: string;
    triggeredCriteria: string[];
  };
  conversationSummary: {
    messageCount: number;
    lastActivity: string;
    keyTopics: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
  };
  recommendations: {
    nextSteps: string[];
    approachStrategy: string;
    priority: 'low' | 'medium' | 'high';
  };
  crossChannelContext: {
    previousChannels: string[];
    sharedNotes: string[];
    overallGoalProgress: Record<string, boolean>;
  };
}

export class LeadDossierService {
  /**
   * Generate a comprehensive lead dossier for handover
   */
  static async generateDossier(
    leadId: string,
    handoverEvaluation: any,
    conversationId?: string
  ): Promise<LeadDossier> {
    try {
      const { LeadsRepository, ConversationsRepository } = await import('../db');
      
      // Get lead data
      const lead = await LeadsRepository.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Get conversation data if provided
      let conversation = null;
      if (conversationId) {
        conversation = await ConversationsRepository.findById(conversationId);
      }

      // Generate dossier
      const dossier: LeadDossier = {
        leadSnapshot: {
          name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown Lead',
          email: lead.email || 'No email provided',
          phone: lead.phone || 'No phone provided',
          source: lead.source || 'Unknown',
          status: lead.status || 'new',
          qualificationScore: lead.qualificationScore || 0
        },
        handoverTrigger: {
          reason: handoverEvaluation.reason || 'Handover triggered',
          urgency: this.determineUrgency(handoverEvaluation),
          timestamp: new Date().toISOString(),
          triggeredCriteria: handoverEvaluation.triggeredCriteria || []
        },
        conversationSummary: {
          messageCount: conversation?.messages?.length || 0,
          lastActivity: conversation?.lastMessageAt?.toISOString() || new Date().toISOString(),
          keyTopics: this.extractKeyTopics(conversation?.messages || []),
          sentiment: this.analyzeSentiment(conversation?.messages || [])
        },
        recommendations: {
          nextSteps: handoverEvaluation.nextActions || ['Contact lead', 'Review qualification'],
          approachStrategy: this.generateApproachStrategy(lead, handoverEvaluation),
          priority: this.determinePriority(handoverEvaluation.score || 0)
        },
        crossChannelContext: {
          previousChannels: [conversation?.channel || 'email'],
          sharedNotes: [],
          overallGoalProgress: conversation?.goalProgress || {}
        }
      };

      logger.info('Lead dossier generated successfully', {
        leadId,
        conversationId,
        urgency: dossier.handoverTrigger.urgency,
        messageCount: dossier.conversationSummary.messageCount
      });

      return dossier;

    } catch (error) {
      logger.error('Error generating lead dossier', {
        leadId,
        conversationId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Format dossier for human-readable handover
   */
  static formatDossierForHandover(dossier: LeadDossier): string {
    return `
# Lead Handover Dossier

## Lead Information
- **Name:** ${dossier.leadSnapshot.name}
- **Email:** ${dossier.leadSnapshot.email}
- **Phone:** ${dossier.leadSnapshot.phone}
- **Source:** ${dossier.leadSnapshot.source}
- **Status:** ${dossier.leadSnapshot.status}
- **Qualification Score:** ${dossier.leadSnapshot.qualificationScore}/10

## Handover Details
- **Trigger Reason:** ${dossier.handoverTrigger.reason}
- **Urgency:** ${dossier.handoverTrigger.urgency.toUpperCase()}
- **Triggered Criteria:** ${dossier.handoverTrigger.triggeredCriteria.join(', ')}
- **Timestamp:** ${dossier.handoverTrigger.timestamp}

## Conversation Summary
- **Messages:** ${dossier.conversationSummary.messageCount}
- **Last Activity:** ${dossier.conversationSummary.lastActivity}
- **Key Topics:** ${dossier.conversationSummary.keyTopics.join(', ')}
- **Sentiment:** ${dossier.conversationSummary.sentiment}

## Recommendations
- **Priority:** ${dossier.recommendations.priority.toUpperCase()}
- **Approach Strategy:** ${dossier.recommendations.approachStrategy}
- **Next Steps:**
${dossier.recommendations.nextSteps.map(step => `  - ${step}`).join('\n')}

## Cross-Channel Context
- **Previous Channels:** ${dossier.crossChannelContext.previousChannels.join(', ')}
- **Goal Progress:** ${Object.entries(dossier.crossChannelContext.overallGoalProgress)
      .filter(([_, completed]) => completed)
      .map(([goal, _]) => goal)
      .join(', ')}
    `.trim();
  }

  private static determineUrgency(evaluation: any): 'low' | 'medium' | 'high' {
    const score = evaluation.score || 0;
    const criteriaTriggers = evaluation.triggeredCriteria?.length || 0;
    
    if (score >= 8 || criteriaTriggers >= 3) return 'high';
    if (score >= 6 || criteriaTriggers >= 2) return 'medium';
    return 'low';
  }

  private static extractKeyTopics(messages: any[]): string[] {
    const topics = new Set<string>();
    
    for (const message of messages) {
      if (message.role === 'lead') {
        const content = message.content.toLowerCase();
        
        // Extract common topics
        if (content.includes('budget') || content.includes('price') || content.includes('cost')) {
          topics.add('Budget/Pricing');
        }
        if (content.includes('urgent') || content.includes('asap') || content.includes('quickly')) {
          topics.add('Urgency');
        }
        if (content.includes('timeline') || content.includes('deadline') || content.includes('when')) {
          topics.add('Timeline');
        }
        if (content.includes('decision') || content.includes('approve') || content.includes('authorize')) {
          topics.add('Decision Making');
        }
        if (content.includes('financing') || content.includes('loan') || content.includes('credit')) {
          topics.add('Financing');
        }
      }
    }
    
    return Array.from(topics);
  }

  private static analyzeSentiment(messages: any[]): 'positive' | 'neutral' | 'negative' {
    let positiveCount = 0;
    let negativeCount = 0;
    
    const positiveWords = ['great', 'good', 'excellent', 'perfect', 'yes', 'interested', 'love'];
    const negativeWords = ['no', 'bad', 'terrible', 'not interested', 'maybe', 'later', 'busy'];
    
    for (const message of messages) {
      if (message.role === 'lead') {
        const content = message.content.toLowerCase();
        
        positiveCount += positiveWords.filter(word => content.includes(word)).length;
        negativeCount += negativeWords.filter(word => content.includes(word)).length;
      }
    }
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private static generateApproachStrategy(lead: any, evaluation: any): string {
    const score = evaluation.score || 0;
    const urgency = this.determineUrgency(evaluation);
    
    if (urgency === 'high') {
      return 'High-priority follow-up: Contact within 1 hour. Lead shows strong buying signals.';
    } else if (urgency === 'medium') {
      return 'Standard follow-up: Contact within 4 hours. Lead is moderately qualified.';
    } else {
      return 'Low-priority follow-up: Contact within 24 hours. Lead needs nurturing.';
    }
  }

  private static determinePriority(score: number): 'low' | 'medium' | 'high' {
    if (score >= 8) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  }
}