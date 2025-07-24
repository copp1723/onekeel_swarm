import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { z } from 'zod';
import os from 'os';

// Core imports
import { closeConnection } from './db';
import { logger } from './utils/logger';
import { registerRoutes } from './routes';
import { globalErrorHandler, notFoundHandler } from './utils/error-handler';
import { requestTimeout } from './middleware/error-handler';
import { sanitizeRequest } from './middleware/validation';
import { apiRateLimit, addRateLimitInfo } from './middleware/rate-limit';
import { applyTerminologyMiddleware } from './middleware/terminology-middleware';
import { enhancedEmailMonitor } from './services/enhanced-email-monitor-mock';
import { campaignExecutionEngine } from './services/campaign-execution-engine';
import { communicationHubService } from './services/communication-hub-service';
import { StartupService } from './services/startup-service';
import { WebSocketMessageHandler } from './websocket/message-handler';
import { LeadProcessor } from './services/lead-processor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment-based configuration with all feature flags
const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  memoryLimit: parseInt(process.env.MEMORY_LIMIT || String(Math.min(1638, Math.floor(os.totalmem() / 1024 / 1024 * 0.25)))),
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
    enableLazyAgents: process.env.ENABLE_LAZY_AGENTS === 'true'
  }
};

// Adjust features based on server mode
if (config.serverMode === 'minimal') {
  config.features = {
    ...config.features,
    enableAgents: false,
    enableRedis: false,
    enableMonitoring: false,
    enableHealthChecks: false,
    enableQueueSystem: false,
    enableMemoryMonitoring: false
  };
} else if (config.serverMode === 'lightweight') {
  config.features = {
    ...config.features,
    enableRedis: false,
    enableQueueSystem: false,
    enableMonitoring: false
  };
} else if (config.serverMode === 'debug') {
  config.features = {
    ...config.features,
    enableDebugRoutes: true,
    enableMonitoring: true,
    enableMemoryMonitoring: true
  };
}

logger.info('Starting CCL-3 Server', {
  mode: config.serverMode,
  features: config.features,
  memoryLimit: config.memoryLimit
});

// Create Express app
const app = express();
const server = createServer(app);

// WebSocket server (conditional)
let wss: WebSocketServer | null = null;
if (config.features.enableWebSocket) {
  wss = new WebSocketServer({ server });
}

// Essential middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeRequest);
app.use(requestTimeout(30000));
app.use(addRateLimitInfo);
app.use(apiRateLimit);

// Memory monitoring (conditional)
let memoryMonitor: NodeJS.Timeout | null = null;
if (config.features.enableMemoryMonitoring) {
  memoryMonitor = setInterval(() => {
    const mem = process.memoryUsage();
    const rssUsedMB = Math.round(mem.rss / 1024 / 1024);
    const memoryUsagePercent = Math.round((rssUsedMB / config.memoryLimit) * 100);
    
    if (memoryUsagePercent > 90) {
      logger.warn(`High memory usage: ${rssUsedMB}MB (${memoryUsagePercent}% of ${config.memoryLimit}MB limit)`);
      if (global.gc) global.gc();
    }
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
      percent: Math.round((mem.rss / 1024 / 1024 / config.memoryLimit) * 100)
    },
    features: config.features,
    uptime: process.uptime()
  });
});

// Apply terminology middleware before routes
applyTerminologyMiddleware(app);

// Register all routes
registerRoutes(app);

// WebSocket handling
if (wss) {
  const leadProcessor = new LeadProcessor();
  const wsHandler = new WebSocketMessageHandler(wss, leadProcessor, (data: any) => {
    // Broadcast to all connected clients
    wss!.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  // Initialize communication hub with WebSocket handler
  communicationHubService.initialize(wsHandler);

  wss.on('connection', (ws, req) => {
    wsHandler.setupConnection(ws, req);
  });
}

// Static file serving
const staticPath = config.nodeEnv === 'production'
  ? join(__dirname, '../dist/client')
  : join(__dirname, '../client/dist');

// Only serve static files in production
if (config.nodeEnv === 'production') {
  app.use(express.static(staticPath));
  
  // Chat widget files
  const publicPath = join(__dirname, '../dist/client');
  app.use('/chat-widget-embed.js', express.static(join(publicPath, 'chat-widget-embed.js')));
  app.use('/chat-demo.html', express.static(join(publicPath, 'chat-demo.html')));
  
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
          <title>CCL-3 Backend Server</title>
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
  
  // Chat widget files in development
  const publicPath = join(__dirname, '../client/public');
  app.use('/chat-widget-embed.js', express.static(join(publicPath, 'chat-widget-embed.js')));
  app.use('/chat-demo.html', express.static(join(publicPath, 'chat-demo.html')));
}

// Error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
server.listen(config.port, async () => {
  const mem = process.memoryUsage();
  logger.info(`CCL-3 Server started on port ${config.port}`, {
    environment: config.nodeEnv,
    memory: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    features: config.features
  });
  
  // Initialize all deployment services
  try {
    await StartupService.initialize();
    logger.info('All deployment services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize deployment services', error as Error);
  }
  
  // Start enhanced email monitor (optional service)
  enhancedEmailMonitor.start().catch(error => logger.warn('Enhanced email monitor not available - continuing without it', { error: (error as Error).message }));
  
  // Start email monitor if configured
  if (process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD) {
    const { emailMonitor } = await import('./services/email-monitor-mock');
    emailMonitor.start().catch((error: Error) => logger.error('Email monitor failed to start', error));
  } else {
    logger.info('Email monitor not started - IMAP configuration missing');
  }
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  // Shutdown all deployment services
  try {
    await StartupService.shutdown();
    logger.info('All deployment services shut down successfully');
  } catch (error) {
    logger.error('Error shutting down deployment services:', error as Error);
  }
  
  await enhancedEmailMonitor.stop();
  if (memoryMonitor) clearInterval(memoryMonitor);
  
  server.close(async () => {
    try {
      await closeConnection();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error as Error);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, server, wss };