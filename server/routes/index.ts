import { Router } from 'express';

// Import all route modules
import authRoutes from './auth';
import agentsRoutes from './agents';
import campaignsRoutes from './campaigns';
import emailRoutes from './email';
import leadsRoutes from './leads';
import conversationsRoutes from './conversations';
import clientsRoutes from './clients';
import usersRoutes from './users';
import monitoringRoutes from './monitoring';

const router = Router();

// Mount all routes with their respective prefixes
router.use('/auth', authRoutes);
router.use('/agents', agentsRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/email', emailRoutes);
router.use('/leads', leadsRoutes);
router.use('/conversations', conversationsRoutes);
router.use('/clients', clientsRoutes);
router.use('/users', usersRoutes);
router.use('/monitoring', monitoringRoutes);

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
      '/campaigns',
      '/email',
      '/leads',
      '/conversations',
      '/clients',
      '/users',
      '/monitoring'
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
  campaignsRoutes,
  emailRoutes,
  leadsRoutes,
  conversationsRoutes,
  clientsRoutes,
  usersRoutes,
  monitoringRoutes
};