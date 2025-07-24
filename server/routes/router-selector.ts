// Router selector based on database availability
import { Router } from 'express';

// Import real routes
import agentsRoutes from './agents';
import campaignsRoutes from './campaigns';
import featureFlagsRoutes from './feature-flags';
import agentTemplatesRoutes from './agent-templates';

// Import mock routes
import agentsMockRoutes from './agents-mock';
import campaignsMockRoutes from './campaigns-mock';

// Mock agent templates router
const createAgentTemplatesMockRouter = (): Router => {
  const router = Router();
  
  // Mock templates data
  const mockTemplates = [
    {
      id: '1',
      name: 'Sales Development Agent',
      category: 'Sales',
      description: 'AI agent optimized for qualifying leads and booking meetings',
      systemPrompt: 'You are a professional sales development representative...',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '2', 
      name: 'Customer Service Agent',
      category: 'Service',
      description: 'AI agent for handling customer inquiries and support',
      systemPrompt: 'You are a helpful customer service representative...',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Marketing Outreach Agent',
      category: 'Marketing',
      description: 'AI agent for personalized marketing campaigns',
      systemPrompt: 'You are a marketing specialist focused on engagement...',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];
  
  router.get('/', (req, res) => {
    res.json({
      success: true,
      templates: mockTemplates,
      total: mockTemplates.length
    });
  });
  
  router.get('/:id', (req, res) => {
    const template = mockTemplates.find(t => t.id === req.params.id);
    if (template) {
      res.json({ success: true, template });
    } else {
      res.status(404).json({ success: false, error: 'Template not found' });
    }
  });
  
  return router;
};

// Check if we should use mock routes
const useMockRoutes = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const enableMock = process.env.ENABLE_MOCK_SERVICES === 'true';
  const isMockDb = dbUrl.startsWith('mock://');
  
  console.log('Router selector - DATABASE_URL:', dbUrl);
  console.log('Router selector - Using mock routes:', enableMock || isMockDb || !dbUrl);
  
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

export const getAgentTemplatesRouter = (): Router => {
  if (useMockRoutes()) {
    console.log('Using mock agent templates routes (no database)');
    return createAgentTemplatesMockRouter();
  }
  return agentTemplatesRoutes;
};

// Feature flags always use real implementation with fallback
export const getFeatureFlagsRouter = (): Router => {
  return featureFlagsRoutes;
};