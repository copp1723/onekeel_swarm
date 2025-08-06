import { db } from '../db/client';
import { campaigns, leads } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { mailgunService } from './mailgun-enhanced';
import type { HandoffEmailData } from './mailgun-enhanced';

export interface HandoverCriteria {
  qualificationScore: number;
  conversationLength: number;
  keywordTriggers: string[];
  goalCompletionRequired: string[];
  timeThreshold: number; // in seconds
  handoverRecipients: Array<{
    name: string;
    email: string;
    role: string;
  }>;
}

export interface HandoverEvaluation {
  shouldHandover: boolean;
  reason: string;
  score: number;
  triggeredCriteria: string[];
  nextActions: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
}

export interface ConversationContext {
  leadId: string;
  messages: Array<{
    role: 'agent' | 'lead' | 'system';
    content: string;
    timestamp: string;
  }>;
  channel: 'email' | 'sms' | 'chat';
  startedAt?: Date;
  qualificationScore?: number;
  metadata?: Record<string, any>;
}

export class HandoverService {
  /**
   * Evaluate if a conversation should trigger handover
   */
  async evaluateHandover(
    conversation: ConversationContext,
    campaignId?: string
  ): Promise<HandoverEvaluation> {
    try {
      // Get campaign criteria
      let handoverCriteria: HandoverCriteria | null = null;
      
      if (campaignId) {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1);
          
        const campaignSettings = campaign?.settings as any;
        if (campaignSettings?.handoverCriteria) {
          handoverCriteria = campaignSettings.handoverCriteria as HandoverCriteria;
        }
      }
      
      // Use default criteria if none found
      if (!handoverCriteria) {
        handoverCriteria = this.getDefaultCriteria();
      }
      
      const evaluation: HandoverEvaluation = {
        shouldHandover: false,
        reason: '',
        score: conversation.qualificationScore || 0,
        triggeredCriteria: [],
        nextActions: [],
        urgencyLevel: 'low'
      };
      
      // Check qualification score
      if ((conversation.qualificationScore || 0) >= handoverCriteria.qualificationScore) {
        evaluation.shouldHandover = true;
        evaluation.triggeredCriteria.push('qualification_score');
        evaluation.reason = `Qualification score (${conversation.qualificationScore || 0}) meets threshold`;
      }
      
      // Check conversation length
      if (conversation.messages.length >= handoverCriteria.conversationLength) {
        evaluation.shouldHandover = true;
        evaluation.triggeredCriteria.push('conversation_length');
        evaluation.reason += evaluation.reason ? ' and ' : '';
        evaluation.reason += `Conversation length (${conversation.messages.length}) exceeds threshold`;
      }
      
      // Check keyword triggers
      const messageContent = conversation.messages
        .map(m => m.content.toLowerCase())
        .join(' ');
        
      const triggeredKeywords = handoverCriteria.keywordTriggers.filter(keyword =>
        messageContent.includes(keyword.toLowerCase())
      );
      
      if (triggeredKeywords.length > 0) {
        evaluation.shouldHandover = true;
        evaluation.triggeredCriteria.push('keywords');
        evaluation.reason += evaluation.reason ? ' and ' : '';
        evaluation.reason += `Triggered keywords: ${triggeredKeywords.join(', ')}`;
      }
      
      // Check conversation duration
      if (conversation.startedAt) {
        const conversationDuration = Date.now() - conversation.startedAt.getTime();
        if (conversationDuration >= handoverCriteria.timeThreshold * 1000) {
          evaluation.shouldHandover = true;
          evaluation.triggeredCriteria.push('time_threshold');
          evaluation.reason += evaluation.reason ? ' and ' : '';
          evaluation.reason += 'Conversation duration exceeds threshold';
        }
      }
      
      // Determine urgency level
      if (evaluation.triggeredCriteria.length >= 3 || (conversation.qualificationScore || 0) >= 8) {
        evaluation.urgencyLevel = 'high';
      } else if (evaluation.triggeredCriteria.length >= 2 || (conversation.qualificationScore || 0) >= 6) {
        evaluation.urgencyLevel = 'medium';
      }
      
      // Set next actions
      if (evaluation.shouldHandover) {
        evaluation.nextActions = [
          'Notify human agent',
          'Generate lead dossier',
          'Pause automated responses',
          'Schedule follow-up'
        ];
      } else {
        evaluation.nextActions = [
          'Continue automated conversation',
          'Gather more information',
          'Increase engagement'
        ];
      }
      
      return evaluation;
    } catch (error) {
      logger.error('Error evaluating handover', { error: error as Error });
      throw error;
    }
  }
  
  /**
   * Execute handover to human agent
   */
  async executeHandover(
    leadId: string,
    evaluation: HandoverEvaluation,
    conversation: ConversationContext,
    campaignId?: string
  ): Promise<boolean> {
    try {
      // Get lead information
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);
        
      if (!lead) {
        throw new Error('Lead not found');
      }
      
      // Get handover recipients
      let recipients: Array<{ name: string; email: string; role: string }> = [];
      
      if (campaignId) {
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .limit(1);
          
        const campaignSettings = campaign?.settings as any;
        if (campaignSettings?.handoverCriteria?.handoverRecipients) {
          recipients = campaignSettings.handoverCriteria.handoverRecipients;
        }
      }
      
      // Use default recipients if none found
      if (recipients.length === 0) {
        recipients = [{
          name: 'Sales Team',
          email: process.env.DEFAULT_HANDOVER_EMAIL || 'sales@company.com',
          role: 'Sales Representative'
        }];
      }
      
      // Generate conversation summary
      const summary = this.generateConversationSummary(conversation);
      
      // Prepare handoff data
      const handoffData: HandoffEmailData = {
        leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead',
        leadEmail: lead.email,
        leadPhone: lead.phone || undefined,
        conversationSummary: summary,
        qualificationScore: evaluation.score,
        keyPoints: this.extractKeyPoints(conversation),
        recommendations: this.generateRecommendations(lead, conversation, evaluation),
        urgencyLevel: evaluation.urgencyLevel
      };
      
      // Send handover notifications
      const emailPromises = recipients.map(recipient =>
        mailgunService.sendHandoffEmail(recipient.email, handoffData)
      );
      
      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      if (successCount === 0) {
        logger.error('Failed to send any handover notifications', { leadId });
        return false;
      }
      
      // Update lead status
      await db
        .update(leads)
        .set({
          status: 'handover',
          qualificationScore: evaluation.score,
          metadata: {
            ...lead.metadata,
            handoverTime: new Date().toISOString(),
            handoverReason: evaluation.reason,
            handoverRecipients: recipients.map(r => r.email)
          }
        })
        .where(eq(leads.id, leadId));
      
      logger.info('Handover executed successfully', {
        leadId,
        recipientCount: recipients.length,
        successCount,
        urgency: evaluation.urgencyLevel
      });
      
      return true;
    } catch (error) {
      logger.error('Error executing handover', { error: error as Error, leadId });
      return false;
    }
  }
  
  /**
   * Get default handover criteria
   */
  private getDefaultCriteria(): HandoverCriteria {
    return {
      qualificationScore: 7,
      conversationLength: 10,
      keywordTriggers: [
        'speak to human',
        'talk to someone',
        'urgent',
        'immediately',
        'manager',
        'supervisor',
        'help',
        'frustrated',
        'not working',
        'price',
        'cost',
        'buy now',
        'purchase',
        'ready to buy'
      ],
      goalCompletionRequired: [],
      timeThreshold: 1800, // 30 minutes
      handoverRecipients: [{
        name: 'Default Team',
        email: process.env.DEFAULT_HANDOVER_EMAIL || 'team@company.com',
        role: 'Team Member'
      }]
    };
  }
  
  /**
   * Generate conversation summary
   */
  private generateConversationSummary(conversation: ConversationContext): string {
    const messageCount = conversation.messages.length;
    const duration = Math.round((Date.now() - conversation.startedAt.getTime()) / 1000 / 60);
    
    const lastFewMessages = conversation.messages
      .slice(-3)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    return `Conversation via ${conversation.channel} with ${messageCount} messages over ${duration} minutes. Recent exchanges:\n\n${lastFewMessages}`;
  }
  
  /**
   * Extract key points from conversation
   */
  private extractKeyPoints(conversation: ConversationContext): string[] {
    const points: string[] = [];
    
    // Extract based on keywords and patterns
    const messages = conversation.messages.filter(m => m.role === 'lead');
    
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      
      if (content.includes('interested in') || content.includes('looking for')) {
        points.push(`Interest: ${message.content}`);
      }
      
      if (content.includes('budget') || content.includes('price') || content.includes('cost')) {
        points.push(`Budget discussion: ${message.content}`);
      }
      
      if (content.includes('when') || content.includes('timeline') || content.includes('soon')) {
        points.push(`Timeline: ${message.content}`);
      }
      
      if (content.includes('question') || content.includes('?')) {
        points.push(`Question: ${message.content}`);
      }
    });
    
    // Limit to top 5 points
    return points.slice(0, 5);
  }
  
  /**
   * Generate recommendations for human agent
   */
  private generateRecommendations(
    lead: any,
    conversation: ConversationContext,
    evaluation: HandoverEvaluation
  ): string[] {
    const recommendations: string[] = [];
    
    // Based on qualification score
    if (evaluation.score >= 8) {
      recommendations.push('High-value lead - prioritize immediate contact');
      recommendations.push('Prepare personalized offer based on expressed interests');
    } else if (evaluation.score >= 6) {
      recommendations.push('Qualified lead - schedule follow-up within 24 hours');
      recommendations.push('Address any concerns or objections mentioned');
    }
    
    // Based on conversation channel
    if (conversation.channel === 'sms') {
      recommendations.push('Lead prefers text communication - consider continuing via SMS');
    } else if (conversation.channel === 'email') {
      recommendations.push('Send detailed information via email as requested');
    }
    
    // Based on urgency
    if (evaluation.urgencyLevel === 'high') {
      recommendations.push('URGENT: Contact within 1 hour for best results');
    }
    
    // Based on lead metadata
    if (lead.metadata?.previousCustomer) {
      recommendations.push('Returning customer - reference previous purchases');
    }
    
    if (lead.source) {
      recommendations.push(`Lead source: ${lead.source} - tailor approach accordingly`);
    }
    
    return recommendations;
  }
  
  /**
   * Create a simple handover without full evaluation
   */
  async quickHandover(
    leadId: string,
    reason: string,
    recipientEmail?: string
  ): Promise<boolean> {
    try {
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);
        
      if (!lead) {
        throw new Error('Lead not found');
      }
      
      const handoffData: HandoffEmailData = {
        leadName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead',
        leadEmail: lead.email,
        leadPhone: lead.phone || undefined,
        conversationSummary: reason,
        qualificationScore: (lead.metadata as any)?.qualificationScore || 5,
        keyPoints: [reason],
        recommendations: ['Immediate attention required', 'Contact lead as soon as possible'],
        urgencyLevel: 'high'
      };
      
      const recipient = recipientEmail || process.env.DEFAULT_HANDOVER_EMAIL || 'team@company.com';
      const success = await mailgunService.sendHandoffEmail(recipient, handoffData);
      
      if (success) {
        await db
          .update(leads)
          .set({
            status: 'handover',
            metadata: {
              ...(lead.metadata as Record<string, any> || {}),
              handoverTime: new Date().toISOString(),
              handoverReason: reason
            }
          })
          .where(eq(leads.id, leadId));
      }
      
      return success;
    } catch (error) {
      logger.error('Error in quick handover', { error: error as Error, leadId });
      return false;
    }
  }
}

// Export singleton instance
export const handoverService = new HandoverService();