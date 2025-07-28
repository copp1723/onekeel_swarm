import { db } from '../db/client';
import { leads, conversations, communications, leadCampaignEnrollments } from '../db/schema';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { featureFlagService, type FeatureFlagContext } from './feature-flag-service';

// Type mappings for dual terminology support
export type EntityType = 'lead' | 'contact';
export type TerminologyMode = 'legacy' | 'modern' | 'auto';

// Unified entity interface that works for both leads and contacts
export interface UnifiedEntity {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  source: string;
  status: string;
  qualificationScore?: number | null;
  assignedChannel?: string | null;
  boberdooId?: string | null;
  campaignId?: string | null;
  clientId?: string | null;
  creditScore?: number | null;
  income?: number | null;
  employer?: string | null;
  jobTitle?: string | null;
  metadata?: any;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Service for handling dual terminology operations
export class DualTerminologyService {
  private static instance: DualTerminologyService;

  public static getInstance(): DualTerminologyService {
    if (!DualTerminologyService.instance) {
      DualTerminologyService.instance = new DualTerminologyService();
    }
    return DualTerminologyService.instance;
  }

  // Determine which terminology to use based on feature flags and context
  async getTerminologyMode(context: FeatureFlagContext): Promise<TerminologyMode> {
    const useContactsTerminology = await featureFlagService.isEnabled('ui.contacts-terminology', context);
    
    if (useContactsTerminology) {
      return 'modern';
    }
    
    return 'legacy';
  }

  // Get entities with terminology-aware response
  async getEntities(
    filters: {
      status?: string;
      source?: string;
      assignedChannel?: string;
      search?: string;
      limit?: number;
      offset?: number;
      sort?: string;
      order?: 'asc' | 'desc';
    } = {},
    context: FeatureFlagContext
  ): Promise<{
    entities: UnifiedEntity[];
    total: number;
    terminology: TerminologyMode;
    offset: number;
    limit: number;
  }> {
    const terminology = await this.getTerminologyMode(context);
    
    // Validate and sanitize pagination parameters
    const validLimit = Math.min(Math.max(1, Number(filters.limit) || 50), 1000);
    const validOffset = Math.max(0, Number(filters.offset) || 0);
    
    // Validate sort field against allowed columns
    const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'email', 'firstName', 'lastName', 'qualificationScore', 'status'];
    const validSort = ALLOWED_SORT_FIELDS.includes(filters.sort || '') ? filters.sort : 'createdAt';
    const validOrder = filters.order === 'asc' ? 'asc' : 'desc';
    
    const {
      status,
      source,
      assignedChannel,
      search
    } = filters;

    // Build query conditions
    const conditions = [];
    
    if (status && ['new', 'contacted', 'qualified', 'converted', 'rejected'].includes(status)) {
      conditions.push(eq(leads.status, status as 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected'));
    }
    
    if (source) {
      conditions.push(eq(leads.source, source));
    }
    
    if (assignedChannel && ['email', 'sms', 'chat'].includes(assignedChannel)) {
      conditions.push(eq(leads.assignedChannel, assignedChannel as 'email' | 'sms' | 'chat'));
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(leads.firstName, searchPattern),
          ilike(leads.lastName, searchPattern),
          ilike(leads.email, searchPattern),
          ilike(leads.phone, searchPattern)
        )
      );
    }

    // Execute query
    const query = db
      .select()
      .from(leads)
      .limit(validLimit)
      .offset(validOffset);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // Add safe sorting
    const sortColumn = leads[validSort as keyof typeof leads];
    if (sortColumn) {
      if (validOrder === 'desc') {
        query.orderBy(desc(sortColumn));
      } else {
        query.orderBy(sortColumn);
      }
    }

    const entities = await query;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    return {
      entities: entities.map(this.mapToUnifiedEntity),
      total: count,
      terminology,
      offset: validOffset,
      limit: validLimit
    };
  }

  // Get single entity by ID
  async getEntityById(
    id: string,
    context: FeatureFlagContext
  ): Promise<{
    entity: UnifiedEntity | null;
    terminology: TerminologyMode;
    communications?: any[];
    conversations?: any[];
    enrollments?: any[];
  }> {
    const terminology = await this.getTerminologyMode(context);
    
    const [entity] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!entity) {
      return {
        entity: null,
        terminology
      };
    }

    // Get related data
    const [communicationsList, conversationsList, enrollments] = await Promise.all([
      db.select().from(communications)
        .where(eq(communications.leadId, id))
        .orderBy(desc(communications.createdAt))
        .limit(10),
      
      db.select().from(conversations)
        .where(eq(conversations.leadId, id))
        .orderBy(desc(conversations.startedAt)),
      
      db.select().from(leadCampaignEnrollments)
        .where(eq(leadCampaignEnrollments.leadId, id))
    ]);

    return {
      entity: this.mapToUnifiedEntity(entity),
      terminology,
      communications: communicationsList,
      conversations: conversationsList,
      enrollments
    };
  }

  // Create entity with dual terminology support
  async createEntity(
    entityData: Partial<UnifiedEntity>,
    context: FeatureFlagContext
  ): Promise<{
    entity: UnifiedEntity;
    terminology: TerminologyMode;
  }> {
    const terminology = await this.getTerminologyMode(context);
    
    // Check for duplicate email
    if (entityData.email) {
      const [existing] = await db
        .select()
        .from(leads)
        .where(eq(leads.email, entityData.email))
        .limit(1);
      
      if (existing) {
        throw new Error(`A ${terminology === 'modern' ? 'contact' : 'lead'} with this email already exists`);
      }
    }
    
    const [newEntity] = await db
      .insert(leads)
      .values({
        firstName: entityData.firstName,
        lastName: entityData.lastName,
        email: entityData.email!,
        phone: entityData.phone,
        source: entityData.source || 'api',
        status: (entityData.status as any) || 'new',
        qualificationScore: entityData.qualificationScore,
        assignedChannel: entityData.assignedChannel as any,
        boberdooId: entityData.boberdooId,
        campaignId: entityData.campaignId,
        creditScore: entityData.creditScore,
        income: entityData.income,
        employer: entityData.employer,
        jobTitle: entityData.jobTitle,
        metadata: entityData.metadata || {},
        notes: entityData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return {
      entity: this.mapToUnifiedEntity(newEntity),
      terminology
    };
  }

  // Update entity
  async updateEntity(
    id: string,
    updates: Partial<UnifiedEntity>,
    context: FeatureFlagContext
  ): Promise<{
    entity: UnifiedEntity | null;
    terminology: TerminologyMode;
  }> {
    const terminology = await this.getTerminologyMode(context);
    
    const [updatedEntity] = await db
      .update(leads)
      .set({
        firstName: updates.firstName,
        lastName: updates.lastName,
        email: updates.email,
        phone: updates.phone,
        source: updates.source,
        status: updates.status as any,
        qualificationScore: updates.qualificationScore,
        assignedChannel: updates.assignedChannel as any,
        boberdooId: updates.boberdooId,
        campaignId: updates.campaignId,

        creditScore: updates.creditScore,
        income: updates.income,
        employer: updates.employer,
        jobTitle: updates.jobTitle,
        metadata: updates.metadata,
        notes: updates.notes,
        updatedAt: new Date()
      })
      .where(eq(leads.id, id))
      .returning();

    return {
      entity: updatedEntity ? this.mapToUnifiedEntity(updatedEntity) : null,
      terminology
    };
  }

  // Delete entity
  async deleteEntity(
    id: string,
    context: FeatureFlagContext
  ): Promise<{
    success: boolean;
    terminology: TerminologyMode;
  }> {
    const terminology = await this.getTerminologyMode(context);
    
    const [deleted] = await db
      .delete(leads)
      .where(eq(leads.id, id))
      .returning();

    return {
      success: !!deleted,
      terminology
    };
  }

  // Import entities (bulk create)
  async importEntities(
    entitiesData: Partial<UnifiedEntity>[],
    context: FeatureFlagContext
  ): Promise<{
    imported: number;
    failed: number;
    errors?: any[];
    terminology: TerminologyMode;
  }> {
    const terminology = await this.getTerminologyMode(context);
    
    if (!Array.isArray(entitiesData) || entitiesData.length === 0) {
      throw new Error(`${terminology === 'modern' ? 'Contacts' : 'Leads'} must be a non-empty array`);
    }

    const validEntities = [];
    const errors = [];

    // Validate entities
    for (let i = 0; i < entitiesData.length; i++) {
      const entityData = entitiesData[i];
      
      if (!entityData.email) {
        errors.push({
          row: i + 1,
          error: 'Email is required'
        });
        continue;
      }

      validEntities.push({
        firstName: entityData.firstName,
        lastName: entityData.lastName,
        email: entityData.email,
        phone: entityData.phone,
        source: entityData.source || 'import',
        status: entityData.status || 'new',
        qualificationScore: entityData.qualificationScore,
        assignedChannel: entityData.assignedChannel,
        boberdooId: entityData.boberdooId,
        campaignId: entityData.campaignId,
        creditScore: entityData.creditScore,
        income: entityData.income,
        employer: entityData.employer,
        jobTitle: entityData.jobTitle,
        metadata: entityData.metadata || {},
        notes: entityData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (validEntities.length === 0) {
      return {
        imported: 0,
        failed: errors.length,
        errors,
        terminology
      };
    }

    // Insert valid entities
    const insertedEntities = await db
      .insert(leads)
      .values(validEntities)
      .onConflictDoNothing()
      .returning();

    return {
      imported: insertedEntities.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      terminology
    };
  }

  // Get API response with terminology-aware labels
  getApiResponse(data: any, terminology: TerminologyMode) {
    const labels = this.getTerminologyLabels(terminology);
    
    // Transform response keys based on terminology
    if (terminology === 'modern') {
      return this.transformResponseKeys(data, {
        'leads': 'contacts',
        'lead': 'contact',
        'leadId': 'contactId',
        'Lead': 'Contact',
        'Leads': 'Contacts'
      });
    }
    
    return data;
  }

  // Get terminology-specific labels
  getTerminologyLabels(terminology: TerminologyMode) {
    if (terminology === 'modern') {
      return {
        singular: 'contact',
        plural: 'contacts',
        singularCapitalized: 'Contact',
        pluralCapitalized: 'Contacts',
        entityType: 'contact' as EntityType
      };
    }
    
    return {
      singular: 'lead',
      plural: 'leads',
      singularCapitalized: 'Lead',
      pluralCapitalized: 'Leads',
      entityType: 'lead' as EntityType
    };
  }

  // Private helper methods
  private mapToUnifiedEntity(entity: any): UnifiedEntity {
    return {
      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      email: entity.email,
      phone: entity.phone,
      source: entity.source,
      status: entity.status,
      qualificationScore: entity.qualificationScore,
      assignedChannel: entity.assignedChannel,
      boberdooId: entity.boberdooId,
      campaignId: entity.campaignId,
      clientId: entity.clientId,
      creditScore: entity.creditScore,
      income: entity.income,
      employer: entity.employer,
      jobTitle: entity.jobTitle,
      metadata: entity.metadata,
      notes: entity.notes,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  private transformResponseKeys(obj: any, keyMap: Record<string, string>): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.transformResponseKeys(item, keyMap));
    }

    const transformed: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = keyMap[key] || key;
      transformed[newKey] = this.transformResponseKeys(value, keyMap);
    }

    return transformed;
  }
}

// Export singleton instance
export const dualTerminologyService = DualTerminologyService.getInstance();