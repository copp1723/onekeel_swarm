// Always load .env file first, then check NODE_ENV
await import('dotenv/config');

// Import types
import type { ServerConfig, AppShutdownRefs } from '../shared/types/global';

// Debug: Check if environment variables are loaded
console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import os from 'os';

// Core imports
import { closeConnection } from './db';
// import { sql } from 'drizzle-orm';
import { logger } from './utils/logger';
import { registerRoutes } from './routes';
import { globalErrorHandler, notFoundHandler } from './utils/error-handler';
import { requestTimeout } from './middleware/error-handler';
import { sanitizeRequest } from './middleware/validation';
import { apiRateLimit, addRateLimitInfo } from './middleware/rate-limit';

import { configureCsrf } from './middleware/csrf';
import { temporaryCSPFix } from './middleware/csp-temp-fix';

import { StartupService } from './services/startup-service';
import { WebSocketMessageHandler } from './websocket/message-handler';
import { SecureWebSocketMessageHandler } from './websocket/secure-message-handler';
import { MonitoringWebSocketHandler } from './websocket/monitoring';
import { LeadProcessor } from './services/lead-processor';
import { initializeCronJobs } from './services/cron-service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment-based configuration with all feature flags
const config: ServerConfig = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  memoryLimit: parseInt(
    process.env.MEMORY_LIMIT ||
      String(Math.min(1638, Math.floor((os.totalmem() / 1024 / 1024) * 0.25)))
  ),
  serverMode: process.env.SERVER_MODE || 'standard', // minimal, lightweight, debug, standard
  features: {
    enableAgents: process.env.ENABLE_AGENTS !== 'false',
    enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
    enableRedis: process.env.ENABLE_REDIS === 'true',
    enableMonitoring: process.env.ENABLE_MONITORING === 'true',
    enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
    enableQueueSystem: process.env.ENABLE_QUEUE_SYSTEM === 'true',
    enableMemoryMonitoring: process.env.ENABLE_MEMORY_MONITORING !== 'false',
    enableDebugRoutes: process.env.ENABLE_DEBUG_ROUTES === 'true',
    enableLazyAgents: process.env.ENABLE_LAZY_AGENTS === 'true',
  },
};

// Mode-specific configurations
const serverModes = {
  minimal: {
    enableAgents: false,
    enableWebSocket: false,
    enableRedis: false,
    enableMonitoring: false,
    enableHealthChecks: true,
    enableQueueSystem: false,
    enableMemoryMonitoring: false,
    enableDebugRoutes: false,
  },
  lightweight: {
    enableAgents: false,
    enableWebSocket: false,
    enableRedis: false,
    enableMonitoring: false,
    enableHealthChecks: true,
    enableQueueSystem: false,
    enableMemoryMonitoring: true,
    enableDebugRoutes: false,
  },
  debug: {
    enableAgents: true,
    enableWebSocket: true,
    enableRedis: false,
    enableMonitoring: true,
    enableHealthChecks: true,
    enableQueueSystem: false,
    enableMemoryMonitoring: true,
    enableDebugRoutes: true,
  },
};

// Apply mode-specific overrides
if (config.serverMode in serverModes) {
  config.features = {
    ...config.features,
    ...serverModes[config.serverMode as keyof typeof serverModes],
  };
}

// Initialize app asynchronously
async function initializeApp() {
  logger.info('Starting OneKeel Swarm Server', {
    mode: config.serverMode,
    features: config.features,
    memoryLimit: config.memoryLimit,
  });

  // Create Express app
  const app = express();
  const server = createServer(app);

  // WebSocket server (conditional)
  let wss: WebSocketServer | null = null;
  if (config.features.enableWebSocket) {
    wss = new WebSocketServer({ server });
  }

  // Apply CSP security headers
  app.use(temporaryCSPFix());

  // Essential middleware
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitizeRequest);
  app.use(requestTimeout(30000));
  app.use(addRateLimitInfo);
  app.use(apiRateLimit);

  // Enhanced memory monitoring (conditional)
  let memoryMonitor: NodeJS.Timeout | null = null;
  if (config.features.enableMemoryMonitoring) {
    let memoryLeakDetection: Record<string, number> = {};
    let lastMemoryCheck = process.memoryUsage();
    
    memoryMonitor = setInterval(() => {
      const mem = process.memoryUsage();
      const rssUsedMB = Math.round(mem.rss / 1024 / 1024);
      const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
      const memoryUsagePercent = Math.round(
        (rssUsedMB / config.memoryLimit) * 100
      );

      // Detect memory leaks by tracking heap growth
      const heapGrowth = mem.heapUsed - lastMemoryCheck.heapUsed;
      const rssGrowth = mem.rss - lastMemoryCheck.rss;
      
      memoryLeakDetection.heapGrowth = heapGrowth;
      memoryLeakDetection.rssGrowth = rssGrowth;
      
      // Log detailed memory stats
      logger.debug('Memory monitoring', {
        rss: `${rssUsedMB}MB`,
        heap: `${heapUsedMB}MB`,
        external: `${Math.round(mem.external / 1024 / 1024)}MB`,
        usage: `${memoryUsagePercent}%`,
        heapGrowth: `${Math.round(heapGrowth / 1024 / 1024)}MB`,
        rssGrowth: `${Math.round(rssGrowth / 1024 / 1024)}MB`
      });

      // High memory usage warning
      if (memoryUsagePercent > 90) {
        logger.warn(
          `High memory usage: ${rssUsedMB}MB (${memoryUsagePercent}% of ${config.memoryLimit}MB limit)`
        );
        
        // Force garbage collection
        if (global.gc) {
          const beforeGC = process.memoryUsage();
          global.gc();
          const afterGC = process.memoryUsage();
          
          logger.info('Forced garbage collection', {
            freedHeap: `${Math.round((beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024)}MB`,
            freedRSS: `${Math.round((beforeGC.rss - afterGC.rss) / 1024 / 1024)}MB`
          });
        }
      }
      
      // Memory leak detection (heap growing consistently)
      if (heapGrowth > 50 * 1024 * 1024) { // 50MB growth
        logger.warn('Potential memory leak detected', {
          heapGrowth: `${Math.round(heapGrowth / 1024 / 1024)}MB`,
          rssGrowth: `${Math.round(rssGrowth / 1024 / 1024)}MB`
        });
      }
      
      lastMemoryCheck = mem;
    }, 30000);
  }

  // Health endpoint
  app.get('/health', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'ok',
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        limit: config.memoryLimit,
        percent: Math.round((mem.rss / 1024 / 1024 / config.memoryLimit) * 100),
      },
      features: config.features,
      uptime: process.uptime(),
    });
  });

  // Terminology middleware removed as part of simplification

  // Register all routes FIRST (async)
  await registerRoutes(app);

  // Configure CSRF protection AFTER routes are registered
  const csrf = configureCsrf();
  // Inject CSRF tokens into GET requests
  app.use(csrf.inject);
  // Verify CSRF tokens on state-changing requests
  app.use('/api', csrf.verify);

  // WebSocket handling
  if (wss) {
    const leadProcessor = new LeadProcessor();

    // Use secure WebSocket handler in production, regular handler in development
    if (
      config.nodeEnv === 'production' ||
      process.env.SECURE_WEBSOCKET === 'true'
    ) {
      logger.info('Initializing secure WebSocket server');
      const secureWsHandler = new SecureWebSocketMessageHandler(
        wss,
        leadProcessor,
        (data: unknown) => {
          // Broadcast handled by secure handler
        }
      );
    } else {
      logger.info('Initializing development WebSocket server');
      const wsHandler = new WebSocketMessageHandler(
        wss,
        leadProcessor,
        (data: unknown) => {
          wss.clients.forEach(client => {
            if (client.readyState === 1) {
              client.send(JSON.stringify(data));
            }
          });
        }
      );
      
      // Store handler for cleanup
      if (!global.appShutdownRefs) {
        global.appShutdownRefs = {} as AppShutdownRefs;
      }
      global.appShutdownRefs.wsHandler = wsHandler;
    }
  }

  // Create separate WebSocket server for monitoring on different port
  let monitoringWss: WebSocketServer | null = null;
  let monitoringWsHandler: MonitoringWebSocketHandler | null = null;

  if (config.features.enableWebSocket) {
    const monitoringPort = parseInt(process.env.MONITORING_WS_PORT || '3001');
    const monitoringServer = createServer();

    monitoringWss = new WebSocketServer({ server: monitoringServer });
    monitoringWsHandler = new MonitoringWebSocketHandler(monitoringWss);

    monitoringServer.listen(monitoringPort, () => {
      logger.info(
        `Monitoring WebSocket server listening on port ${monitoringPort}`
      );
    });

    // Cleanup monitoring handler on server shutdown
    process.on('SIGTERM', () => {
      monitoringWsHandler?.cleanup();
      monitoringServer.close();
    });
    process.on('SIGINT', () => {
      monitoringWsHandler?.cleanup();
      monitoringServer.close();
    });
  }

  // Initialize services (conditional)
  if (config.features.enableAgents) {
    // Communication hub removed as part of simplification
    logger.info('Agent communication simplified - no complex hub needed');
  }

  // Initialize agents (conditional)
  if (config.features.enableAgents && !config.features.enableLazyAgents) {
    try {
      await import('./agents');
      logger.info('Agents system initialized');
    } catch (error) {
      logger.error('Failed to initialize agents', error as Error);
    }
  }

  // Static file serving
  const staticPath =
    config.nodeEnv === 'production'
      ? join(__dirname, '../dist/client')
      : join(__dirname, '../client/dist');

  // Only serve static files in production
  if (config.nodeEnv === 'production') {
    app.use(express.static(staticPath));

    // Chat widget files
    const publicPath = join(__dirname, '../dist/client');
    app.use(
      '/chat-widget-embed.js',
      express.static(join(publicPath, 'chat-widget-embed.js'))
    );
    app.use(
      '/chat-demo.html',
      express.static(join(publicPath, 'chat-demo.html'))
    );

    // React app fallback
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(join(staticPath, 'index.html'));
    });
  } else {
    // Development mode - inform user about correct URL
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>OneKeel Swarm Backend Server</title>
            <style>
              body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
              .info { background: #e6f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 5px; margin-top: 20px; }
              code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <h1>🚨 Wrong URL!</h1>
            <div class="error">
              <p>You're accessing the <strong>backend API server</strong> directly.</p>
              <p>In development, you should access the frontend at:</p>
              <p><strong>👉 <a href="http://localhost:5173">http://localhost:5173</a></strong></p>
            </div>
            <div class="info">
              <h3>ℹ️ How to start the application:</h3>
              <ol>
                <li>Run <code>npm run dev:full</code> to start both servers</li>
                <li>Access <a href="http://localhost:5173">http://localhost:5173</a></li>
              </ol>
              <p>This server (port ${config.port}) only handles API requests.</p>
            </div>
          </body>
        </html>
      `);
    });
  }

  // Error handling
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  // Start server
  server.listen(config.port, async () => {
    const mem = process.memoryUsage();
    logger.info(`OneKeel Swarm Server started on port ${config.port}`, {
      environment: config.nodeEnv,
      memory: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      features: config.features,
    });

    // Add server error handling
    server.on('error', error => {
      logger.error('Server error:', error);
    });

    server.on('close', () => {
      logger.info('Server closed');
    });

    // Initialize all deployment services
    try {
      await StartupService.initialize();
      logger.info('All deployment services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize deployment services', error as Error);
    }

    // Test database connection and setup (completely non-blocking)
    setTimeout(() => {
      // Wrap in an immediately invoked async function to prevent any promise rejections from bubbling up
      (async () => {
        try {
          logger.info('Testing database connection...');
          const { checkConnectionHealth } = await import('./db/client');
          const isHealthy = await checkConnectionHealth();
          if (isHealthy) {
            logger.info('✅ Database connection successful');
          } else {
            logger.warn('❌ Database connection failed');
          }

          // Only try to ensure admin user if database connection works
          try {
            const { ensureAdminUser } = await import(
              '../scripts/ensure-admin-user'
            );
            await ensureAdminUser();
            logger.info('✅ Database initialization completed');
          } catch (error) {
            logger.warn(
              '⚠️ Admin user setup failed - this is normal if database schema is not migrated yet',
              {
                error: error instanceof Error ? error.message : String(error),
              }
            );
            // Ensure this error doesn't propagate and cause process exit
          }
        } catch (error) {
          logger.warn(
            '⚠️ Database connection failed - application will continue without database features',
            {
              error: error instanceof Error ? error.message : String(error),
              code: (error as any)?.code,
            }
          );
        }
      })().catch(error => {
        // Final safety net - log any errors that somehow escape
        logger.error('Unexpected error in database initialization', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, 1000); // Wait 1 second after server starts

    // Initialize outbound email watchdog
    try {
      const { outboundEmailWatchdog } = await import('./services/outbound-email-watchdog');
      logger.info('🚫 Outbound Email Watchdog initialized - emails will be monitored before sending');
    } catch (error) {
      logger.warn('Outbound email watchdog not available', { error: (error as Error).message });
    }

    // Initialize cron jobs
    try {
      await initializeCronJobs();
      logger.info('Cron jobs initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cron jobs', error as Error);
    }

    // Keep the process alive with a heartbeat
    const heartbeat = setInterval(() => {
      // This keeps the event loop active
      logger.debug('Server heartbeat');
    }, 30000); // Every 30 seconds

    // Store heartbeat for cleanup
    if (global.appShutdownRefs) {
      global.appShutdownRefs.heartbeat = heartbeat;
    }

    logger.info(
      '🚀 Server initialization complete - ready to accept connections'
    );
  });

  // Graceful shutdown handlers are set up below

  // Store references for graceful shutdown
  global.appShutdownRefs = {
    server,
    wss,
    memoryMonitor,
    config,
    wsHandler: (global.appShutdownRefs as any)?.wsHandler,
  };
}

// Graceful shutdown function
async function gracefulShutdown() {
  logger.info('Graceful shutdown initiated');

  const refs = global.appShutdownRefs;
  if (!refs) {
    logger.warn('No shutdown references available');
    process.exit(1);
    return;
  }

  // Clear memory monitor
  if (refs.memoryMonitor) {
    clearInterval(refs.memoryMonitor);
  }

  // Clear heartbeat
  if (refs.heartbeat) {
    clearInterval(refs.heartbeat);
  }

  // Stop services
  if (refs.config.features.enableAgents) {
    // Communication hub removed as part of simplification
  }

  // Close WebSocket connections
  if (refs.wss) {
    refs.wss.clients.forEach(client => client.close());
    refs.wss.close();
  }
  
  // Cleanup WebSocket handler
  if (refs.wsHandler) {
    refs.wsHandler.cleanup();
  }

  refs.server.close(() => {
    logger.info('HTTP server closed');
    closeConnection()
      .then(() => {
        logger.info('Database connection closed');
        process.exit(0);
      })
      .catch(err => {
        logger.error('Error closing database', err);
        process.exit(1);
      });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise,
  });
  // Don't exit the process for unhandled rejections in production
  // Just log them and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });

  // Only exit for critical errors, not database schema issues
  if (
    error.message.includes('column') &&
    error.message.includes('does not exist')
  ) {
    logger.warn(
      'Database schema issue detected - continuing without admin user setup'
    );
    return;
  }

  // For other uncaught exceptions, we should exit gracefully
  logger.error('Critical uncaught exception - initiating graceful shutdown');
  gracefulShutdown();
});

// Add warning for process exit
process.on('exit', code => {
  logger.info('Process exiting', { code });
});

// Set up graceful shutdown handlers
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  gracefulShutdown();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received');
  gracefulShutdown();
});

// Start the application
initializeApp().catch(error => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
