import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { clients, leads, campaigns } from '../db/schema';
import { eq, and, ilike, sql, desc, inArray } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Get all clients
router.get('/', async (req, res) => {
  try {
    const { 
      active,
      search,
      limit = 50, 
      offset = 0, 
      sort = 'createdAt', 
      order = 'desc' 
    } = req.query;

    // Build query conditions
    const conditions = [];
    
    if (active !== undefined) {
      conditions.push(eq(clients.active, active === 'true'));
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        ilike(clients.name, searchPattern)
      );
    }

    // Execute query
    const query = db
      .select()
      .from(clients)
      .limit(Number(limit))
      .offset(Number(offset));

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    // Add sorting
    if (order === 'desc') {
      query.orderBy(desc(clients[sort as keyof typeof clients]));
    } else {
      query.orderBy(clients[sort as keyof typeof clients]);
    }

    const clientList = await query;

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count }] = await countQuery;

    // Get stats for each client
    const clientIds = clientList.map(c => c.id);
    
    const leadStats = clientIds.length > 0 ? await db
      .select({
        clientId: leads.clientId,
        totalLeads: sql<number>`count(*)::int`
      })
      .from(leads)
      .where(inArray(leads.clientId, clientIds))
      .groupBy(leads.clientId) : [];

    const campaignStats = clientIds.length > 0 ? await db
      .select({
        clientId: campaigns.clientId,
        totalCampaigns: sql<number>`count(*)::int`
      })
      .from(campaigns)
      .where(inArray(campaigns.clientId, clientIds))
      .groupBy(campaigns.clientId) : [];

    // Merge stats with clients
    const clientsWithStats = clientList.map(client => {
      const leadStat = leadStats.find(s => s.clientId === client.id);
      const campaignStat = campaignStats.find(s => s.clientId === client.id);
      
      return {
        ...client,
        stats: {
          totalLeads: leadStat?.totalLeads || 0,
          totalCampaigns: campaignStat?.totalCampaigns || 0
        }
      };
    });

    res.json({
      success: true,
      data: clientsWithStats,
      total: count,
      offset: Number(offset),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLIENT_FETCH_ERROR',
        message: 'Failed to fetch clients',
        category: 'database'
      }
    });
  }
});

// Get a single client
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    // Get client stats
    const leadCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.clientId, id));

    const campaignCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(eq(campaigns.clientId, id));

    res.json({
      success: true,
      data: {
        ...client,
        stats: {
          totalLeads: leadCount[0]?.count || 0,
          totalCampaigns: campaignCount[0]?.count || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLIENT_FETCH_ERROR',
        message: 'Failed to fetch client',
        category: 'database'
      }
    });
  }
});

// Create a new client
const createClientSchema = z.object({
  name: z.string().min(1).max(255),
  industry: z.string().optional(),
  domain: z.string().optional(),
  settings: z.object({
    branding: z.record(z.any()).optional(),
    preferences: z.record(z.any()).optional()
  }).optional(),
  brand_config: z.record(z.any()).optional(), // Legacy support
  metadata: z.record(z.any()).optional()
});

router.post('/', validateRequest({ body: createClientSchema }), async (req, res) => {
  try {
    const clientData = req.body;
    
    // Check for duplicate name
    const [existing] = await db
      .select()
      .from(clients)
      .where(eq(clients.name, clientData.name))
      .limit(1);
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CLIENT',
          message: 'A client with this name already exists'
        }
      });
    }
    
    // Handle legacy brand_config
    if (clientData.brand_config && !clientData.settings?.branding) {
      clientData.settings = {
        ...clientData.settings,
        branding: clientData.brand_config
      };
    }
    
    const [newClient] = await db
      .insert(clients)
      .values({
        name: clientData.name,
        industry: clientData.industry,
        domain: clientData.domain,
        settings: clientData.settings || {},
        metadata: clientData.metadata || {},
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newClient
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLIENT_CREATE_ERROR',
        message: 'Failed to create client',
        category: 'database'
      }
    });
  }
});

// Update a client
const updateClientSchema = createClientSchema.partial();

router.put('/:id', validateRequest({ body: updateClientSchema }), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if name is being updated and if it's already taken
    if (updates.name) {
      const [existing] = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.name, updates.name),
          sql`${clients.id} != ${id}`
        ))
        .limit(1);
      
      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_NAME',
            message: 'A client with this name already exists'
          }
        });
      }
    }
    
    // Handle legacy brand_config
    if (updates.brand_config && !updates.settings?.branding) {
      updates.settings = {
        ...updates.settings,
        branding: updates.brand_config
      };
    }
    
    const [updatedClient] = await db
      .update(clients)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();

    if (!updatedClient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    res.json({
      success: true,
      data: updatedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLIENT_UPDATE_ERROR',
        message: 'Failed to update client',
        category: 'database'
      }
    });
  }
});

// Toggle client active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current status
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    // Toggle status
    const [updatedClient] = await db
      .update(clients)
      .set({
        active: !client.active,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedClient,
      message: `Client ${updatedClient.active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling client status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLIENT_TOGGLE_ERROR',
        message: 'Failed to toggle client status',
        category: 'database'
      }
    });
  }
});

// Delete a client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if client has associated data
    const [leadCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.clientId, id));

    const [campaignCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(eq(campaigns.clientId, id));

    if (leadCount.count > 0 || campaignCount.count > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CLIENT_HAS_DATA',
          message: 'Cannot delete client with associated leads or campaigns',
          details: {
            leads: leadCount.count,
            campaigns: campaignCount.count
          }
        }
      });
    }

    const [deletedClient] = await db
      .delete(clients)
      .where(eq(clients.id, id))
      .returning();

    if (!deletedClient) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLIENT_DELETE_ERROR',
        message: 'Failed to delete client',
        category: 'database'
      }
    });
  }
});

// Get client settings
router.get('/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [client] = await db
      .select({
        settings: clients.settings
      })
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    res.json({
      success: true,
      data: client.settings || {}
    });
  } catch (error) {
    console.error('Error fetching client settings:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_FETCH_ERROR',
        message: 'Failed to fetch client settings',
        category: 'database'
      }
    });
  }
});

// Update client settings
router.patch('/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const newSettings = req.body;
    
    const [client] = await db
      .select({
        settings: clients.settings
      })
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    // Merge settings
    const mergedSettings = {
      ...client.settings,
      ...newSettings
    };

    const [updatedClient] = await db
      .update(clients)
      .set({
        settings: mergedSettings,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedClient.settings
    });
  } catch (error) {
    console.error('Error updating client settings:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SETTINGS_UPDATE_ERROR',
        message: 'Failed to update client settings',
        category: 'database'
      }
    });
  }
});

export default router;