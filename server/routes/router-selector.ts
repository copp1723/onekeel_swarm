// Router selector based on database availability
import { Router } from 'express';

// Import real routes
import agentsRoutes from './agents';
import campaignsRoutes from './campaigns';
import featureFlagsRoutes from './feature-flags';

// Import mock routes
import agentsMockRoutes from './agents-mock';
import campaignsMockRoutes from './campaigns-mock';

// Check if we should use mock routes
const useMockRoutes = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const enableMock = process.env.ENABLE_MOCK_SERVICES === 'true';
  const isMockDb = dbUrl.startsWith('mock://');
  
  return enableMock || isMockDb || !dbUrl;
};

// Export the appropriate routes
export const getAgentsRouter = (): Router => {
  if (useMockRoutes()) {
    console.log('Using mock agents routes (no database)');
    return agentsMockRoutes;
  }
  return agentsRoutes;
};

export const getCampaignsRouter = (): Router => {
  if (useMockRoutes()) {
    console.log('Using mock campaigns routes (no database)');
    return campaignsMockRoutes;
  }
  return campaignsRoutes;
};

// Feature flags always use real implementation with fallback
export const getFeatureFlagsRouter = (): Router => {
  return featureFlagsRoutes;
};