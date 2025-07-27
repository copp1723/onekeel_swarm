// TEMPORARY FIX: Force production to use real routes
import { Router } from 'express';

// Import real routes
import agentsRoutes from './agents';
import campaignsRoutes from './campaigns';
import featureFlagsRoutes from './feature-flags';
import agentTemplatesRoutes from './agent-templates';
import conversationsRoutes from './conversations';

// Force production mode
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.RENDER === 'true' ||
                    process.env.DATABASE_URL?.includes('postgresql://');

// Export the appropriate routes - ALWAYS use real routes in production
export const getAgentsRouter = async (): Promise<Router> => {
  if (isProduction) {
    console.log('FORCED: Using real agents routes (production mode)');
    return agentsRoutes;
  }
  
  // Only use mock in local development
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('mock://')) {
    console.log('Using mock agents routes (development)');
    const { default: mockRoutes } = await import('./agents-mock');
    return mockRoutes;
  }
  
  return agentsRoutes;
};

export const getCampaignsRouter = async (): Promise<Router> => {
  if (isProduction) {
    console.log('FORCED: Using real campaigns routes (production mode)');
    return campaignsRoutes;
  }
  
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('mock://')) {
    console.log('Using mock campaigns routes (development)');
    const { default: mockRoutes } = await import('./campaigns-mock');
    return mockRoutes;
  }
  
  return campaignsRoutes;
};

export const getConversationsRouter = (): Router => {
  if (isProduction) {
    console.log('FORCED: Using real conversations routes (production mode)');
    return conversationsRoutes;
  }
  
  // Mock for local dev only
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('mock://')) {
    // Create simple mock
    const router = Router();
    router.get('/', (req, res) => {
      res.json({ success: true, conversations: [] });
    });
    return router;
  }
  
  return conversationsRoutes;
};

export const getAgentTemplatesRouter = (): Router => {
  if (isProduction) {
    console.log('FORCED: Using real agent templates routes (production mode)');
    return agentTemplatesRoutes;
  }
  
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('mock://')) {
    console.log('Using mock agent templates routes (development)');
    // Return mock implementation
    const router = Router();
    router.get('/', (req, res) => {
      res.json({ success: true, templates: [] });
    });
    return router;
  }
  
  return agentTemplatesRoutes;
};

export const getFeatureFlagsRouter = (): Router => {
  return featureFlagsRoutes;
};