import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/client.js';
import { clients, clientApiKeys, leads, campaigns, agentConfigurations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/enhanced-logger.js';

// Extended Request interface to include tenant context
export interface TenantRequest extends Request {
  clientId?: string;
  client?: any;
  user?: any;
  tenantDomain?: string;
}

/**
 * Middleware to identify tenant from various sources
 */
export const tenantIdentificationMiddleware = async (
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let clientId: string | null = null;
    let client: any = null;

    // Method 1: Extract from JWT token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        clientId = decoded.clientId;
        req.user = decoded;
      } catch (error) {
        // Token invalid, continue to other methods
      }
    }

    // Method 2: Extract from subdomain
    if (!clientId) {
      const host = req.get('host');
      if (host) {
        const subdomain = host.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
          req.tenantDomain = subdomain;
          
          // Look up client by domain
          const clientByDomain = await db.select().from(clients).where(eq(clients.domain, host)).limit(1);
          
          if (clientByDomain.length > 0) {
            clientId = clientByDomain[0].id;
            client = clientByDomain[0];
          }
        }
      }
    }

    // Method 3: Extract from X-Client-ID header (for API usage)
    if (!clientId) {
      const headerClientId = req.headers['x-client-id'] as string;
      if (headerClientId) {
        clientId = headerClientId;
      }
    }

    // Method 4: Extract from API key
    if (!clientId) {
      const apiKey = req.headers['x-api-key'] as string;
      if (apiKey) {
        const apiKeyRecords = await db.select({
          id: clientApiKeys.id,
          clientId: clientApiKeys.clientId,
          active: clientApiKeys.active,
          client: clients
        })
        .from(clientApiKeys)
        .innerJoin(clients, eq(clientApiKeys.clientId, clients.id))
        .where(and(
          eq(clientApiKeys.apiKey, apiKey),
          eq(clientApiKeys.active, true),
          eq(clients.active, true)
        ))
        .limit(1);
        
        if (apiKeyRecords.length > 0) {
          const apiKeyRecord = apiKeyRecords[0];
          clientId = apiKeyRecord.clientId;
          client = apiKeyRecord.client;
          
          // Update last used timestamp
          await db.update(clientApiKeys).set({
            lastUsedAt: new Date()
          }).where(eq(clientApiKeys.id, apiKeyRecord.id));
        }
      }
    }

    // Fallback to default client for development
    if (!clientId) {
      const defaultClients = await db.select().from(clients).where(eq(clients.name, 'CCL-3 SWARM Default')).limit(1);
      
      if (defaultClients.length > 0) {
        clientId = defaultClients[0].id;
        client = defaultClients[0];
      }
    }

    // Set tenant context
    if (clientId) {
      req.clientId = clientId;
      
      // Load client if not already loaded
      if (!client) {
        const clientRecords = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
        if (clientRecords.length > 0) {
          client = clientRecords[0];
        }
      }
      
      req.client = client;

      // Log tenant context for debugging
      logger.debug('Tenant context established', {
        clientId,
        clientName: client?.name,
        domain: client?.domain,
        method: req.method,
        path: req.path
      });
    } else {
      logger.warn('No tenant context established', {
        host: req.get('host'),
        userAgent: req.headers['user-agent'],
        path: req.path
      });
    }

    next();
  } catch (error) {
    logger.error('Error in tenant identification middleware', { message: error instanceof Error ? error.message : 'Unknown error' });
    next(error);
  }
};

/**
 * Middleware to require tenant context
 */
export const requireTenantMiddleware = (
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.clientId) {
    throw new AppError(
      'TENANT_REQUIRED' as any,
      'Tenant context is required for this operation',
      400
    );
  }
  next();
};

/**
 * Middleware to verify resource ownership within tenant
 */
export const verifyResourceOwnership = (resourceType: string) => {
  return async (req: TenantRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const resourceId = req.params.id;
      const clientId = req.clientId;

      if (!clientId || !resourceId) {
        throw new AppError(
          'ACCESS_DENIED' as any,
          'Invalid resource access',
          403
        );
      }

      // Dynamic query based on resource type
      let resourceExists = false;
      
      switch (resourceType) {
        case 'leads':
          const leadRecords = await db.select().from(leads).where(and(
            eq(leads.id, resourceId),
            eq(leads.clientId, clientId)
          )).limit(1);
          resourceExists = leadRecords.length > 0;
          break;
          
        case 'campaigns':
          const campaignRecords = await db.select().from(campaigns).where(and(
            eq(campaigns.id, resourceId),
            eq(campaigns.clientId, clientId)
          )).limit(1);
          resourceExists = campaignRecords.length > 0;
          break;
          
        case 'agents':
          const agentRecords = await db.select().from(agentConfigurations).where(and(
            eq(agentConfigurations.id, resourceId),
            eq(agentConfigurations.clientId, clientId)
          )).limit(1);
          resourceExists = agentRecords.length > 0;
          break;
          
        default:
          throw new AppError(
            'INVALID_RESOURCE_TYPE' as any,
            `Unknown resource type: ${resourceType}`,
            400
          );
      }

      if (!resourceExists) {
        throw new AppError(
          'RESOURCE_NOT_FOUND' as any,
          `${resourceType} not found or access denied`,
          404
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to enforce tenant rate limits
 */
export const tenantRateLimitMiddleware = async (
  req: TenantRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      return next();
    }

    // TODO: Implement rate limiting logic here using Redis or in-memory store
    // For now, just pass through
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to inject tenant-specific branding into response headers
 */
export const brandingHeaderMiddleware = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.client?.brandingConfig) {
    res.set({
      'X-Brand-Name': req.client.brandingConfig.companyName,
      'X-Brand-Primary-Color': req.client.brandingConfig.primaryColor,
      'X-Brand-Domain': req.client.domain || 'unknown'
    });
  }
  next();
};

/**
 * Utility function to get tenant-specific configuration
 */
export const getTenantConfig = (req: TenantRequest) => {
  return {
    clientId: req.clientId,
    client: req.client,
    branding: req.client?.brandingConfig || {},
    settings: req.client?.settings || {},
    plan: req.client?.plan || 'basic'
  };
};

/**
 * Utility function to check tenant feature access
 */
export const checkTenantFeatureAccess = (req: TenantRequest, feature: string): boolean => {
  const plan = req.client?.plan || 'basic';
  
  // Define feature access by plan
  const featureMatrix: Record<string, string[]> = {
    basic: ['leads', 'campaigns', 'email'],
    professional: ['leads', 'campaigns', 'email', 'sms', 'analytics'],
    enterprise: ['leads', 'campaigns', 'email', 'sms', 'analytics', 'api', 'white_label', 'custom_domains']
  };
  
  return featureMatrix[plan]?.includes(feature) || false;
};
