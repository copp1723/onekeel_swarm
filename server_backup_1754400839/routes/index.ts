import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';

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
import mailgunWebhookRoutes from './webhooks/mailgun';

const router = Router();

// CRITICAL SECURITY FIX: Mount all routes with authentication except public ones
router.use('/auth', authRoutes); // Public auth endpoints

router.use('/agents', authenticate, authorize('admin', 'user'), agentsRoutes);
router.use('/agent-templates', authenticate, authorize('admin', 'user'), agentTemplatesRoutes);
router.use('/campaigns', authenticate, authorize('admin', 'user'), campaignsRoutes);
router.use('/email', authenticate, authorize('admin', 'user'), emailRoutes);
router.use('/leads', authenticate, authorize('admin', 'user'), leadsRoutes);
router.use('/contacts', authenticate, authorize('admin', 'user'), contactsRoutes); // Dual terminology support
router.use('/conversations', authenticate, authorize('admin', 'user'), conversationsRoutes);
router.use('/clients', authenticate, authorize('admin'), clientsRoutes);
router.use('/users', authenticate, authorize('admin'), usersRoutes);
router.use('/monitoring', authenticate, authorize('admin'), monitoringRoutes);
router.use('/feature-flags', featureFlagsRoutes); // Simplified feature flags (no auth required)

router.use('/navigation', authenticate, navigationRoutes); // Navigation configuration and aliases

// Public webhook endpoints (no auth required)
router.use('/webhooks', mailgunWebhookRoutes);

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

  navigationRoutes
};