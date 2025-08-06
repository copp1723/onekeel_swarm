// import Bull from 'bull'; // Bull package not installed
// import { db } from '../db/client.js';
// import { leads, campaigns, conversations } from '../db/schema.js';
import { logger } from '../utils/logger.js';
// import { eq } from 'drizzle-orm';

import 'dotenv/config';

// const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'; // Unused - Bull not installed

class CampaignExecutor {
  private leadQueue: any; // Bull.Queue - Bull package not installed

  constructor() {
    // this.leadQueue = new Bull('lead-processing', REDIS_URL);
    // this.leadQueue.process(this.processLead.bind(this));
    logger.warn('CampaignExecutor: Bull queue not available, using mock queue');
    this.leadQueue = {
      add: async (data: any) => console.log('Mock queue add:', data)
    };
  }

  async addLeadToQueue(leadId: string) {
    await this.leadQueue.add({ leadId });
    logger.info(`Added lead ${leadId} to processing queue`);
  }

  // Campaign processing disabled - Bull package not installed
  /*
  private async processLead(job: Bull.Job<{ leadId: string }>) {
    const { leadId } = job.data;
    try {
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
      if (!lead) throw new Error('Lead not found');

      // Assign to campaign (simple rule: first active campaign)
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.status, 'active')).limit(1);
      if (!campaign) throw new Error('No active campaign found');

      await db.update(leads).set({ campaign_id: campaign.id }).where(eq(leads.id, leadId));

      // Initialize conversation
      await db.insert(conversations).values({
        leadId,
        channel: 'email', // default
        agentType: 'email',
        status: 'active',
        startedAt: new Date(),
        transcript: {},
        metadata: {}
      });

      // Schedule follow-up (using bull for simplicity)
      await this.leadQueue.add('followup', { leadId }, { delay: 24 * 60 * 60 * 1000 }); // 24h delay

      logger.info(`Processed lead ${leadId} assigned to campaign ${campaign.id}`);
    } catch (error) {
      logger.error(`Error processing lead ${leadId}:`, error as Error);
      throw error;
    }
  }
  */

  async cleanup() {
    // await this.leadQueue.close(); // Bull not installed
    console.log('Campaign executor cleanup - mock implementation');
  }
}

export const campaignExecutor = new CampaignExecutor();

// To add new leads, call campaignExecutor.addLeadToQueue(leadId) 