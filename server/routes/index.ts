import { Router } from 'express';

// Import all route modules
import authRoutes from './auth';
import agentsRoutes from './agents';
import agentTemplatesRoutes from './agent-templates';
import campaignsRoutes from './campaigns';
import emailRoutes from './email';
import leadsRoutes from './leads';
import contactsRoutes from './contacts';
import conversationsRoutes from './conversations';
import clientsRoutes from './clients';
import usersRoutes from './users';
import monitoringRoutes from './monitoring';
import featureFlagsRoutes from './feature-flags';
import navigationRoutes from './navigation-aliases';
import serviceConfigRoutes from './service-config';
import templatesRoutes from './templates';
import importRoutes from './import';

const router = Router();

// Mount all routes with their respective prefixes
router.use('/auth', authRoutes);
router.use('/agents', agentsRoutes);
router.use('/agent-templates', agentTemplatesRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/email', emailRoutes);
router.use('/leads', leadsRoutes);
router.use('/contacts', contactsRoutes); // Dual terminology support
router.use('/conversations', conversationsRoutes);
router.use('/clients', clientsRoutes);
router.use('/users', usersRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/feature-flags', featureFlagsRoutes);
router.use('/services', serviceConfigRoutes); // Service configuration and management
router.use('/navigation', navigationRoutes); // Navigation configuration and aliases
router.use('/templates', templatesRoutes); // Email and SMS templates
router.use('/import', importRoutes); // CSV import functionality

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
      '/navigation',
      '/services',
      '/templates',
      '/import'
    ]
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
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
      },
      '/services': {
        description: 'Service configuration and management',
        endpoints: [
          'GET /services/config',
          'PUT /services/config/:service',
          'POST /services/test/:service',
          'GET /services/health/:service'
        ]
      },
      '/templates': {
        description: 'Email and SMS template management',
        endpoints: [
          'GET /templates',
          'GET /templates/:id',
          'POST /templates',
          'PUT /templates/:id',
          'DELETE /templates/:id',
          'POST /templates/:id/duplicate'
        ]
      },
      '/import': {
        description: 'Data import functionality',
        endpoints: [
          'POST /import/analyze',
          'POST /import/leads'
        ]
      }
    }
  });
});

// Export the router for use in the main server
export default router;

// Register routes function for compatibility with main server
export function registerRoutes(app: any) {
  app.use('/api', router);
}

// Also export individual route modules for direct access if needed
export {
  authRoutes,
  agentsRoutes,
  agentTemplatesRoutes,
  campaignsRoutes,
  emailRoutes,
  leadsRoutes,
  contactsRoutes,
  conversationsRoutes,
  clientsRoutes,
  usersRoutes,
  monitoringRoutes,
  featureFlagsRoutes,
  navigationRoutes,
  serviceConfigRoutes,
  templatesRoutes,
  importRoutes
};