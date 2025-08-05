import { db } from '../db/client';
import { cacheService } from './cache-service';
import { TransactionService } from './transaction-service';
import { logger } from '../utils/logger';
import {
  leads,
  users,
  campaigns,
  communications,
  conversations,
  agentConfigurations,
  analyticsEvents,
  auditLogs,
  leadCampaignEnrollments,
  templates
} from '../db/schema';
import { eq, and, or, sql, desc, asc, inArray, count, isNull, isNotNull } from 'drizzle-orm';

/**
 * Optimized repository service with caching, bulk operations, and N+1 query prevention
 */
export class OptimizedRepositoryService {
  
  // ============================================
  // OPTIMIZED LEAD OPERATIONS
  // ============================================

  /**
   * Get lead with related data in a single query (prevents N+1)
   */
  static async getLeadWithRelations(leadId: string) {
    const cacheKey = `lead_with_relations:${leadId}`;
    
    return await cacheService.getOrSet(cacheKey, async () => {
      const result = await db
        .select({
          // Lead data
          lead: leads,
          // Campaign data
          campaign: campaigns,
          // Recent communications (last 5)
          communications: sql`
            (SELECT COALESCE(json_agg(comm_data), '[]'::json)
             FROM (
               SELECT c.*, ROW_NUMBER() OVER (ORDER BY c.created_at DESC) as rn
               FROM communications c 
               WHERE c.lead_id = ${leadId}
               ORDER BY c.created_at DESC
               LIMIT 5
             ) comm_data)
          `.as('communications'),
          // Active conversations
          conversations: sql`
            (SELECT COALESCE(json_agg(conv_data), '[]'::json)
             FROM conversations conv_data
             WHERE conv_data.lead_id = ${leadId} 
             AND conv_data.status = 'active')
          `.as('conversations'),
          // Enrollment status
          enrollment: sql`
            (SELECT json_build_object(
               'id', lce.id,
               'campaign_id', lce.campaign_id,
               'current_step', lce.current_step,
               'status', lce.status,
               'enrolled_at', lce.enrolled_at
             )
             FROM lead_campaign_enrollments lce
             WHERE lce.lead_id = ${leadId}
             ORDER BY lce.enrolled_at DESC
             LIMIT 1)
          `.as('enrollment')
        })
        .from(leads)
        .leftJoin(campaigns, eq(leads.campaignId, campaigns.id))
        .where(eq(leads.id, leadId))
        .limit(1);

      return result[0] || null;
    }, 300); // 5 minutes cache
  }

  /**
   * Bulk fetch leads with pagination and filtering
   */
  static async getLeadsPaginated(options: {
    page?: number;
    limit?: number;
    status?: string;
    source?: string;
    campaignId?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      page = 1,
      limit = 50,
      status,
      source,
      campaignId,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const offset = (page - 1) * limit;
    const cacheKey = `leads_paginated:${JSON.stringify(options)}`;

    return await cacheService.getOrSet(cacheKey, async () => {
      let query = db
        .select({
          lead: leads,
          campaign: {
            id: campaigns.id,
            name: campaigns.name,
            type: campaigns.type
          }
        })
        .from(leads)
        .leftJoin(campaigns, eq(leads.campaignId, campaigns.id));

      // Apply filters
      const conditions = [];
      if (status) conditions.push(eq(leads.status, status as any));
      if (source) conditions.push(eq(leads.source, source));
      if (campaignId) conditions.push(eq(leads.campaignId, campaignId));
      if (search) {
        conditions.push(
          or(
            sql`${leads.firstName} ILIKE ${`%${search}%`}`,
            sql`${leads.lastName} ILIKE ${`%${search}%`}`,
            sql`${leads.email} ILIKE ${`%${search}%`}`,
            sql`${leads.phone} ILIKE ${`%${search}%`}`
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      const sortColumn = sortBy === 'name' 
        ? sql`${leads.firstName} || ' ' || ${leads.lastName}`
        : leads[sortBy as keyof typeof leads] || leads.createdAt;
      
      query = query.orderBy(
        sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn)
      );

      // Apply pagination
      const data = await query.limit(limit).offset(offset);

      // Get total count for pagination
      const [{ count: totalCount }] = await db
        .select({ count: count() })
        .from(leads)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        data,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    }, 120); // 2 minutes cache for paginated results
  }

  /**
   * Bulk create leads with transaction safety
   */
  static async bulkCreateLeads(leadsData: any[], batchSize: number = 100) {
    logger.info('Starting bulk lead creation', { count: leadsData.length, batchSize });

    const operations = leadsData.map(leadData => 
      (tx: typeof db) => tx.insert(leads).values({
        ...leadData,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning()
    );

    const results = await TransactionService.bulkOperationTransaction(
      'leads', 
      operations, 
      batchSize
    );

    // Invalidate related caches
    await cacheService.delPattern('leads_paginated:*');
    await cacheService.delPattern('dashboard:*');

    logger.info('Bulk lead creation completed', { 
      success: results.length,
      failed: leadsData.length - results.length
    });

    return results.flat();
  }

  /**
   * Bulk update lead statuses with analytics tracking
   */
  static async bulkUpdateLeadStatuses(updates: Array<{ id: string; status: string; reason?: string }>) {
    return await TransactionService.withTransaction(async (tx) => {
      const updatedLeads = [];
      const analyticsEvents = [];

      for (const update of updates) {
        // Update lead
        const [updatedLead] = await tx
          .update(leads)
          .set({ 
            status: update.status as any,
            updatedAt: new Date()
          })
          .where(eq(leads.id, update.id))
          .returning();

        if (updatedLead) {
          updatedLeads.push(updatedLead);
          
          // Create analytics event
          analyticsEvents.push({
            eventType: 'lead_status_changed',
            leadId: update.id,
            metadata: {
              oldStatus: updatedLead.status,
              newStatus: update.status,
              reason: update.reason
            },
            createdAt: new Date()
          });
        }
      }

      // Bulk insert analytics events
      if (analyticsEvents.length > 0) {
        await tx.insert(analyticsEvents).values(analyticsEvents);
      }

      return updatedLeads;
    }, {
      cacheInvalidationKeys: [
        'leads_paginated:*',
        ...updates.map(u => `lead:${u.id}`)
      ]
    });
  }

  // ============================================
  // OPTIMIZED COMMUNICATION OPERATIONS
  // ============================================

  /**
   * Get communication history with caching
   */
  static async getCommunicationHistory(leadId: string, options: {
    limit?: number;
    channel?: string;
    includeMetadata?: boolean;
  } = {}) {
    const { limit = 50, channel, includeMetadata = false } = options;
    const cacheKey = `comm_history:${leadId}:${JSON.stringify(options)}`;

    return await cacheService.getOrSet(cacheKey, async () => {
      let query = db
        .select({
          id: communications.id,
          channel: communications.channel,
          direction: communications.direction,
          status: communications.status,
          content: communications.content,
          subject: communications.subject,
          externalId: communications.externalId,
          createdAt: communications.createdAt,
          sentAt: communications.sentAt,
          deliveredAt: communications.deliveredAt,
          ...(includeMetadata && { metadata: communications.metadata })
        })
        .from(communications)
        .where(eq(communications.leadId, leadId));

      if (channel) {
        query = query.where(and(
          eq(communications.leadId, leadId),
          eq(communications.channel, channel as any)
        ));
      }

      return await query
        .orderBy(desc(communications.createdAt))
        .limit(limit);
    }, 300); // 5 minutes cache
  }

  /**
   * Bulk create communications with delivery tracking
   */
  static async bulkCreateCommunications(communicationsData: any[]) {
    return await TransactionService.withTransaction(async (tx) => {
      const createdCommunications = [];

      for (const commData of communicationsData) {
        const [communication] = await tx
          .insert(communications)
          .values({
            ...commData,
            createdAt: new Date()
          })
          .returning();

        createdCommunications.push(communication);

        // Update lead's last contacted timestamp
        await tx
          .update(leads)
          .set({ 
            lastContactedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(leads.id, commData.leadId));
      }

      return createdCommunications;
    }, {
      cacheInvalidationKeys: [
        ...communicationsData.map(c => `comm_history:${c.leadId}:*`),
        ...communicationsData.map(c => `lead:${c.leadId}`)
      ]
    });
  }

  // ============================================
  // OPTIMIZED CAMPAIGN OPERATIONS
  // ============================================

  /**
   * Get campaign with performance metrics
   */
  static async getCampaignWithMetrics(campaignId: string) {
    const cacheKey = `campaign_metrics:${campaignId}`;

    return await cacheService.getOrSet(cacheKey, async () => {
      const [result] = await db
        .select({
          campaign: campaigns,
          metrics: sql`
            json_build_object(
              'total_leads', (
                SELECT COUNT(*) FROM leads 
                WHERE campaign_id = ${campaignId}
              ),
              'active_enrollments', (
                SELECT COUNT(*) FROM lead_campaign_enrollments 
                WHERE campaign_id = ${campaignId} AND status = 'active'
              ),
              'completed_enrollments', (
                SELECT COUNT(*) FROM lead_campaign_enrollments 
                WHERE campaign_id = ${campaignId} AND completed = true
              ),
              'total_communications', (
                SELECT COUNT(*) FROM communications 
                WHERE campaign_id = ${campaignId}
              ),
              'successful_communications', (
                SELECT COUNT(*) FROM communications 
                WHERE campaign_id = ${campaignId} AND status = 'delivered'
              )
            )
          `.as('metrics')
        })
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      return result || null;
    }, 600); // 10 minutes cache
  }

  /**
   * Get dashboard analytics with caching
   */
  static async getDashboardAnalytics(timeRange: string = '7d') {
    const cacheKey = `dashboard_analytics:${timeRange}`;

    return await cacheService.getOrSet(cacheKey, async () => {
      const timeCondition = timeRange === '24h' 
        ? sql`created_at > NOW() - INTERVAL '24 hours'`
        : timeRange === '7d'
        ? sql`created_at > NOW() - INTERVAL '7 days'`
        : sql`created_at > NOW() - INTERVAL '30 days'`;

      const [analytics] = await db
        .select({
          overview: sql`
            json_build_object(
              'total_leads', (SELECT COUNT(*) FROM leads WHERE ${timeCondition}),
              'new_leads', (SELECT COUNT(*) FROM leads WHERE status = 'new' AND ${timeCondition}),
              'qualified_leads', (SELECT COUNT(*) FROM leads WHERE status = 'qualified' AND ${timeCondition}),
              'converted_leads', (SELECT COUNT(*) FROM leads WHERE status = 'converted' AND ${timeCondition}),
              'total_communications', (SELECT COUNT(*) FROM communications WHERE ${timeCondition}),
              'email_sent', (SELECT COUNT(*) FROM communications WHERE channel = 'email' AND ${timeCondition}),
              'sms_sent', (SELECT COUNT(*) FROM communications WHERE channel = 'sms' AND ${timeCondition}),
              'active_conversations', (SELECT COUNT(*) FROM conversations WHERE status = 'active')
            )
          `.as('overview'),
          leadSources: sql`
            (SELECT json_agg(
               json_build_object('source', source, 'count', count)
             )
             FROM (
               SELECT source, COUNT(*) as count 
               FROM leads 
               WHERE ${timeCondition}
               GROUP BY source
               ORDER BY count DESC
               LIMIT 10
             ) sources)
          `.as('leadSources'),
          campaignPerformance: sql`
            (SELECT json_agg(
               json_build_object(
                 'campaign_name', c.name,
                 'leads_count', metrics.leads_count,
                 'conversion_rate', metrics.conversion_rate
               )
             )
             FROM (
               SELECT 
                 c.id,
                 c.name,
                 COUNT(l.id) as leads_count,
                 ROUND(
                   (COUNT(CASE WHEN l.status = 'converted' THEN 1 END)::decimal / 
                    NULLIF(COUNT(l.id), 0)) * 100, 2
                 ) as conversion_rate
               FROM campaigns c
               LEFT JOIN leads l ON c.id = l.campaign_id AND l.${timeCondition}
               WHERE c.active = true
               GROUP BY c.id, c.name
               ORDER BY leads_count DESC
               LIMIT 5
             ) metrics
             JOIN campaigns c ON metrics.id = c.id)
          `.as('campaignPerformance')
        })
        .from(sql`(SELECT 1) as dummy`);

      return analytics || null;
    }, 180); // 3 minutes cache
  }

  // ============================================
  // OPTIMIZED USER OPERATIONS
  // ============================================

  /**
   * Get user with session info and caching
   */
  static async getUserWithSessions(userId: string) {
    const cacheKey = `user_with_sessions:${userId}`;

    return await cacheService.getOrSet(cacheKey, async () => {
      const [result] = await db
        .select({
          user: users,
          activeSessions: sql`
            (SELECT json_agg(
               json_build_object(
                 'id', s.id,
                 'ip_address', s.ip_address,
                 'user_agent', s.user_agent,
                 'last_accessed_at', s.last_accessed_at,
                 'expires_at', s.expires_at
               )
             )
             FROM sessions s
             WHERE s.user_id = ${userId} 
             AND s.expires_at > NOW()
             ORDER BY s.last_accessed_at DESC)
          `.as('activeSessions')
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return result || null;
    }, 300); // 5 minutes cache
  }

  // ============================================
  // PERFORMANCE MONITORING
  // ============================================

  /**
   * Get database performance metrics
   */
  static async getPerformanceMetrics() {
    const cacheKey = 'db_performance_metrics';

    return await cacheService.getOrSet(cacheKey, async () => {
      // Query performance statistics
      const [stats] = await db
        .select({
          tableStats: sql`
            (SELECT json_agg(
               json_build_object(
                 'table_name', schemaname || '.' || tablename,
                 'total_size', pg_total_relation_size(schemaname||'.'||tablename),
                 'table_size', pg_relation_size(schemaname||'.'||tablename),
                 'index_size', pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename),
                 'row_count', n_tup_ins + n_tup_upd + n_tup_del
               )
             )
             FROM pg_stat_user_tables
             ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
             LIMIT 10)
          `.as('tableStats'),
          indexStats: sql`
            (SELECT json_agg(
               json_build_object(
                 'index_name', indexname,
                 'table_name', tablename,
                 'scans', idx_scan,
                 'tuples_read', idx_tup_read,
                 'tuples_fetched', idx_tup_fetch
               )
             )
             FROM pg_stat_user_indexes
             WHERE idx_scan > 0
             ORDER BY idx_scan DESC
             LIMIT 10)
          `.as('indexStats')
        })
        .from(sql`(SELECT 1) as dummy`);

      return stats || null;
    }, 300); // 5 minutes cache
  }

  /**
   * Get slow query statistics (if pg_stat_statements is enabled)
   */
  static async getSlowQueries() {
    const cacheKey = 'slow_queries';

    return await cacheService.getOrSet(cacheKey, async () => {
      try {
        const slowQueries = await db
          .execute(sql`
            SELECT 
              query,
              calls,
              total_time,
              mean_time,
              stddev_time,
              rows
            FROM pg_stat_statements 
            WHERE mean_time > 100
            ORDER BY mean_time DESC 
            LIMIT 20
          `);

        return slowQueries.rows;
      } catch (error) {
        // pg_stat_statements extension not available
        logger.debug('pg_stat_statements not available for slow query monitoring');
        return [];
      }
    }, 600); // 10 minutes cache
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Warm up frequently accessed caches
   */
  static async warmUpCaches() {
    logger.info('Starting cache warm-up process');

    try {
      // Warm up dashboard analytics
      await this.getDashboardAnalytics('24h');
      await this.getDashboardAnalytics('7d');

      // Warm up performance metrics
      await this.getPerformanceMetrics();

      // Warm up recent leads
      await this.getLeadsPaginated({ page: 1, limit: 20 });

      logger.info('Cache warm-up completed successfully');
    } catch (error) {
      logger.error('Cache warm-up failed', error as Error);
    }
  }

  /**
   * Clear all application caches
   */
  static async clearAllCaches() {
    logger.info('Clearing all application caches');
    
    const patterns = [
      'lead*',
      'campaign*',
      'comm_history*',
      'dashboard*',
      'user*',
      'db_performance*'
    ];

    for (const pattern of patterns) {
      await cacheService.delPattern(pattern);
    }

    logger.info('All application caches cleared');
  }
}

// Export singleton for direct use
export const optimizedRepo = OptimizedRepositoryService;