import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { clients, clientApiKeys, clientDomains } from '../db/schema.js';
import { eq, ilike, desc, and, sql } from 'drizzle-orm';
import { TenantRequest, requireTenantMiddleware, checkTenantFeatureAccess } from '../middleware/tenant.js';
import { AppError } from '../utils/errors.js';
import { nanoid } from 'nanoid';

const router = Router();

// Validation schemas
const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().optional(),
  brandingConfig: z.object({
    companyName: z.string().min(1),
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
    emailFromName: z.string().min(1),
    supportEmail: z.string().email(),
    logoUrl: z.string().url().optional(),
    websiteUrl: z.string().url().optional(),
    favicon: z.string().url().optional(),
    customCss: z.string().optional()
  }),
  settings: z.object({
    maxLeads: z.number().min(0).default(1000),
    maxCampaigns: z.number().min(0).default(5),
    maxAgents: z.number().min(0).default(2),
    apiRateLimit: z.number().min(0).default(100)
  }).optional(),
  plan: z.enum(['basic', 'professional', 'enterprise']).default('basic')
});

const updateClientSchema = createClientSchema.partial();

const createApiKeySchema = z.object({
  keyName: z.string().min(1).max(255),
  permissions: z.array(z.string()).default(['read', 'write']),
  expiresAt: z.string().datetime().optional()
});

// GET /api/clients - List all clients (enterprise only)
router.get('/', requireTenantMiddleware, async (req: TenantRequest, res) => {
  try {
    // Check if user has access to client management
    if (!checkTenantFeatureAccess(req, 'white_label')) {
      throw new AppError(
        'FEATURE_NOT_AVAILABLE' as any,
        'White label management is not available on your plan',
        403
      );
    }

    const { 
      active,
      search,
      limit = 50, 
      offset = 0
    } = req.query;

    // Build query conditions
    const conditions = [];
    
    if (active !== undefined) {
      conditions.push(eq(clients.active, active === 'true'));
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(ilike(clients.name, searchPattern));
    }

    // Execute query
    let clientList;
    if (conditions.length > 0) {
      clientList = await db
        .select({
          id: clients.id,
          name: clients.name,
          domain: clients.domain,
          brandingConfig: clients.brandingConfig,
          plan: clients.plan,
          active: clients.active,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt
        })
        .from(clients)
        .where(and(...conditions))
        .orderBy(desc(clients.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));
    } else {
      clientList = await db
        .select({
          id: clients.id,
          name: clients.name,
          domain: clients.domain,
          brandingConfig: clients.brandingConfig,
          plan: clients.plan,
          active: clients.active,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt
        })
        .from(clients)
        .orderBy(desc(clients.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));
    }

    // Get counts for pagination
    let totalCount;
    if (conditions.length > 0) {
      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(clients).where(and(...conditions));
      totalCount = totalResult[0].count;
    } else {
      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(clients);
      totalCount = totalResult[0].count;
    }

    return res.json({
      clients: clientList,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + clientList.length < totalCount
      }
    });
  } catch (error) {
    throw new AppError(
      'CLIENTS_FETCH_ERROR' as any,
      'Failed to fetch clients',
      500
    );
  }
});

// POST /api/clients - Create new client (enterprise only)
router.post('/', requireTenantMiddleware, async (req: TenantRequest, res) => {
  try {
    if (!checkTenantFeatureAccess(req, 'white_label')) {
      throw new AppError(
        'FEATURE_NOT_AVAILABLE' as any,
        'White label management is not available on your plan',
        403
      );
    }

    const validationResult = createClientSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'VALIDATION_ERROR' as any,
        'Invalid client data',
        400
      );
    }

    const clientData = validationResult.data;

    // Check if domain is already taken
    if (clientData.domain) {
      const existingClient = await db.select().from(clients).where(eq(clients.domain, clientData.domain)).limit(1);
      if (existingClient.length > 0) {
        throw new AppError(
          'DOMAIN_ALREADY_EXISTS' as any,
          'Domain is already taken',
          400
        );
      }
    }

    const [newClient] = await db.insert(clients).values({
      name: clientData.name,
      domain: clientData.domain,
      brandingConfig: clientData.brandingConfig,
      settings: clientData.settings || {
        maxLeads: 1000,
        maxCampaigns: 5,
        maxAgents: 2,
        apiRateLimit: 100
      },
      plan: clientData.plan
    }).returning();

    return res.status(201).json({
      client: newClient,
      message: 'Client created successfully'
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'CLIENT_CREATE_ERROR' as any,
      'Failed to create client',
      500
    );
  }
});

// GET /api/clients/:id - Get client details
router.get('/:id', requireTenantMiddleware, async (req: TenantRequest, res) => {
  try {
    const clientId = req.params.id;
    
    // Users can only access their own client or if they have white_label access
    if (req.clientId !== clientId && !checkTenantFeatureAccess(req, 'white_label')) {
      throw new AppError(
        'ACCESS_DENIED' as any,
        'Access denied',
        403
      );
    }

    const clientRecords = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    
    if (clientRecords.length === 0) {
      throw new AppError(
        'CLIENT_NOT_FOUND' as any,
        'Client not found',
        404
      );
    }

    const client = clientRecords[0];

    // Get API keys for this client
    const apiKeys = await db.select({
      id: clientApiKeys.id,
      keyName: clientApiKeys.keyName,
      permissions: clientApiKeys.permissions,
      lastUsedAt: clientApiKeys.lastUsedAt,
      expiresAt: clientApiKeys.expiresAt,
      active: clientApiKeys.active,
      createdAt: clientApiKeys.createdAt
    }).from(clientApiKeys).where(eq(clientApiKeys.clientId, clientId));

    // Get custom domains for this client
    const domains = await db.select().from(clientDomains).where(eq(clientDomains.clientId, clientId));

    return res.json({
      client,
      apiKeys,
      domains
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'CLIENT_FETCH_ERROR' as any,
      'Failed to fetch client',
      500
    );
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', requireTenantMiddleware, async (req: TenantRequest, res) => {
  try {
    const clientId = req.params.id;
    
    // Users can only update their own client or if they have white_label access
    if (req.clientId !== clientId && !checkTenantFeatureAccess(req, 'white_label')) {
      throw new AppError(
        'ACCESS_DENIED' as any,
        'Access denied',
        403
      );
    }

    const validationResult = updateClientSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'VALIDATION_ERROR' as any,
        'Invalid client data',
        400
      );
    }

    const updateData = validationResult.data;

    // Check if domain is already taken by another client
    if (updateData.domain) {
      const existingClient = await db.select().from(clients).where(
        and(
          eq(clients.domain, updateData.domain),
          sql`${clients.id} != ${clientId}`
        )
      ).limit(1);
      
      if (existingClient.length > 0) {
        throw new AppError(
          'DOMAIN_ALREADY_EXISTS' as any,
          'Domain is already taken',
          400
        );
      }
    }

    const [updatedClient] = await db.update(clients)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId))
      .returning();

    if (!updatedClient) {
      throw new AppError(
        'CLIENT_NOT_FOUND' as any,
        'Client not found',
        404
      );
    }

    return res.json({
      client: updatedClient,
      message: 'Client updated successfully'
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'CLIENT_UPDATE_ERROR' as any,
      'Failed to update client',
      500
    );
  }
});

// POST /api/clients/:id/api-keys - Create API key for client
router.post('/:id/api-keys', requireTenantMiddleware, async (req: TenantRequest, res) => {
  try {
    const clientId = req.params.id;
    
    // Users can only create API keys for their own client or if they have white_label access
    if (req.clientId !== clientId && !checkTenantFeatureAccess(req, 'white_label')) {
      throw new AppError(
        'ACCESS_DENIED' as any,
        'Access denied',
        403
      );
    }

    const validationResult = createApiKeySchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'VALIDATION_ERROR' as any,
        'Invalid API key data',
        400
      );
    }

    const { keyName, permissions, expiresAt } = validationResult.data;

    // Generate secure API key
    const apiKey = `ckl_${nanoid(32)}`;

    const [newApiKey] = await db.insert(clientApiKeys).values({
      clientId,
      keyName,
      apiKey,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    }).returning({
      id: clientApiKeys.id,
      keyName: clientApiKeys.keyName,
      apiKey: clientApiKeys.apiKey,
      permissions: clientApiKeys.permissions,
      expiresAt: clientApiKeys.expiresAt,
      active: clientApiKeys.active,
      createdAt: clientApiKeys.createdAt
    });

    return res.status(201).json({
      apiKey: newApiKey,
      message: 'API key created successfully',
      warning: 'Save this API key securely - it will not be shown again'
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      'API_KEY_CREATE_ERROR' as any,
      'Failed to create API key',
      500
    );
  }
});

export default router;
