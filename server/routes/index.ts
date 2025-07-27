import { Router } from 'express';
import { apiDocumentationService } from '../services/api-documentation';

// Import all route modules
import authRoutes from './auth';
import { getAgentsRouter, getCampaignsRouter, getFeatureFlagsRouter, getAgentTemplatesRouter, getConversationsRouter } from './router-selector';
import emailRoutes from './email';
import leadsRoutes from './leads';
import contactsRoutes from './contacts';
import conversationsRoutes from './conversations';
import clientsRoutes from './clients';
import usersRoutes from './users';
import monitoringRoutes from './monitoring';
import navigationRoutes from './navigation-aliases';
import templatesRoutes from './templates';

// Create async function to set up routes
export async function createRouter(): Promise<Router> {
  const router = Router();

  // Get the appropriate routers based on environment
  const agentsRoutes = await getAgentsRouter();
  const campaignsRoutes = await getCampaignsRouter();
  const featureFlagsRoutes = getFeatureFlagsRouter();
  const agentTemplatesRoutes = getAgentTemplatesRouter();
  const conversationsRouter = getConversationsRouter ? getConversationsRouter() : conversationsRoutes;

  // Mount all routes with their respective prefixes
  router.use('/auth', authRoutes);
  router.use('/agents', agentsRoutes);
  router.use('/agent-templates', agentTemplatesRoutes);
  router.use('/campaigns', campaignsRoutes);
  router.use('/email', emailRoutes);
  router.use('/leads', leadsRoutes);
  router.use('/contacts', contactsRoutes); // Dual terminology support
  router.use('/conversations', conversationsRouter);
  router.use('/clients', clientsRoutes);
  router.use('/users', usersRoutes);
  router.use('/monitoring', monitoringRoutes);
  router.use('/feature-flags', featureFlagsRoutes);
  router.use('/navigation', navigationRoutes); // Navigation configuration and aliases
  router.use('/templates', templatesRoutes); // Email/SMS/Chat templates

  // Health check endpoint at root level
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'onekeel-swarm-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      routes: [
        '/auth',
        '/agents', 
        '/agent-templates',
        '/campaigns',
        '/email',
        '/leads',
        '/contacts',
        '/conversations',
        '/clients',
        '/users',
        '/monitoring',
        '/feature-flags',
        '/navigation'
      ]
    });
  });

  // API documentation endpoint with enhanced documentation service
  router.get('/docs', (req, res) => {
    apiDocumentationService.handleDocsRequest(req, res);
  });

  // Legacy docs endpoint for backwards compatibility
  router.get('/docs/legacy', (req, res) => {
    res.json({
      title: 'OneKeel Swarm API',
      version: '1.0.0',
      description: 'Consolidated API routes for the OneKeel Swarm application',
      routes: {
        '/auth': {
          description: 'Authentication and authorization endpoints',
          endpoints: [
            'POST /auth/login',
            'POST /auth/register', 
            'POST /auth/refresh',
            'POST /auth/logout',
            'GET /auth/me',
            'POST /auth/change-password'
          ]
        },
        '/agents': {
          description: 'AI agent configuration and management',
          endpoints: [
            'GET /agents',
            'GET /agents/:id',
            'POST /agents',
            'PUT /agents/:id',
            'DELETE /agents/:id',
            'GET /agents/type/:type',
            'GET /agents/active/:type',
            'GET /agents/decisions/lead/:leadId'
          ]
        },
        '/agent-templates': {
          description: 'Preconfigured agent templates with sophisticated system prompts',
          endpoints: [
            'GET /agent-templates',
            'GET /agent-templates/:id',
            'GET /agent-templates/category/:category',
            'POST /agent-templates',
            'PUT /agent-templates/:id',
            'DELETE /agent-templates/:id',
            'POST /agent-templates/:id/clone',
            'POST /agent-templates/:id/create-agent'
          ]
        },
        '/campaigns': {
          description: 'Campaign management and execution',
          endpoints: [
            'GET /campaigns',
            'GET /campaigns/:id',
            'POST /campaigns',
            'PUT /campaigns/:id',
            'DELETE /campaigns/:id',
            'GET /campaigns/:id/stats',
            'POST /campaigns/execution/trigger'
          ]
        },
        '/email': {
          description: 'Email templates, scheduling, and monitoring',
          endpoints: [
            'GET /email/templates',
            'POST /email/templates',
            'PUT /email/templates/:id',
            'DELETE /email/templates/:id',
            'POST /email/schedule',
            'GET /email/schedules',
            'POST /email/send'
          ]
        },
        '/leads': {
          description: 'Lead management and tracking',
          endpoints: [
            'GET /leads',
            'GET /leads/:id',
            'POST /leads',
            'PATCH /leads/:id',
            'DELETE /leads/:id',
            'GET /leads/stats',
            'GET /leads/:id/details',
            'GET /leads/:id/timeline',
            'POST /leads/:id/send-message'
          ]
        },
        '/contacts': {
          description: 'Contact management and tracking (dual terminology support)',
          endpoints: [
            'GET /contacts',
            'GET /contacts/:id',
            'POST /contacts',
            'PUT /contacts/:id',
            'DELETE /contacts/:id',
            'POST /contacts/import',
            'PATCH /contacts/:id/status',
            'GET /contacts/meta/terminology'
          ]
        },
        '/conversations': {
          description: 'Conversation management across channels',
          endpoints: [
            'GET /conversations',
            'GET /conversations/:id',
            'POST /conversations',
            'POST /conversations/:id/messages',
            'PATCH /conversations/:id/status',
            'GET /conversations/lead/:leadId'
          ]
        },
        '/clients': {
          description: 'Client management and configuration',
          endpoints: [
            'GET /clients',
            'GET /clients/:id',
            'POST /clients',
            'PUT /clients/:id',
            'DELETE /clients/:id'
          ]
        },
        '/users': {
          description: 'User management and administration',
          endpoints: [
            'GET /users',
            'GET /users/:id',
            'PUT /users/:id',
            'PATCH /users/:id/toggle',
            'GET /users/:id/activity'
          ]
        },
        '/monitoring': {
          description: 'System monitoring and health checks',
          endpoints: [
            'GET /monitoring/health',
            'GET /monitoring/performance',
            'GET /monitoring/dashboard',
            'GET /monitoring/stats',
            'GET /monitoring/alerts'
          ]
        },
        '/feature-flags': {
          description: 'Feature flag management and evaluation',
          endpoints: [
            'POST /feature-flags/evaluate',
            'POST /feature-flags/all',
            'GET /feature-flags/check/:flagKey',
            'GET /feature-flags/admin',
            'POST /feature-flags/admin',
            'PUT /feature-flags/admin/:flagKey',
            'DELETE /feature-flags/admin/:flagKey',
            'POST /feature-flags/admin/:flagKey/disable',
            'POST /feature-flags/admin/:flagKey/enable',
            'GET /feature-flags/health'
          ]
        },
        '/navigation': {
          description: 'Navigation configuration and route aliases',
          endpoints: [
            'GET /navigation/config',
            'GET /navigation/route-aliases',
            'GET /navigation/breadcrumbs'
          ]
        }
      }
    });
  });

  return router;
}

// For backwards compatibility, create a default router
let defaultRouter: Router | null = null;

export default {
  // Lazy initialization
  get router() {
    if (!defaultRouter) {
      console.warn('Using synchronous router access - this may not work correctly with dynamic imports');
      defaultRouter = Router();
      // Return a temporary router that will be replaced
      return defaultRouter;
    }
    return defaultRouter;
  }
};

// Register routes function for compatibility with main server
export async function registerRoutes(app: any) {
  const router = await createRouter();
  app.use('/api', router);
}

// Also export individual route modules for direct access if needed
export {
  authRoutes,
  emailRoutes,
  leadsRoutes,
  contactsRoutes,
  conversationsRoutes,
  clientsRoutes,
  usersRoutes,
  monitoringRoutes,
  navigationRoutes
};