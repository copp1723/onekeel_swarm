import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import campaignsRoutes from './routes/campaigns.js';
import agentsRoutes from './routes/agents.js';
import leadsRoutes from './routes/leads.js';
import clientsRoutes from './routes/clients.js';
import brandingRoutes from './routes/branding.js';
import smsRoutes from './routes/sms.js';
import conversationsRoutes from './routes/conversations.js';
import {
  tenantIdentificationMiddleware,
  brandingHeaderMiddleware
} from './middleware/tenant.js';
import { temporaryCSPFix } from './middleware/csp-temp-fix.js';
import { logger } from './utils/enhanced-logger.js';
import {
  AppError,
  isAppError,
  formatErrorResponse,
  createErrorFromUnknown,
  ConfigurationError
} from './utils/errors.js';
// Temporarily disable email routes due to missing services
// import emailRoutes from './routes/email.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - allow both development and production origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://ccl-3-final.onrender.com',
  process.env.CORS_ORIGIN
].filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-ID', 'X-API-Key'],
};

app.use(cors(corsOptions));

// CSP fix for production deployment (must be early in middleware chain)
if (process.env.NODE_ENV === 'production') {
  app.use(temporaryCSPFix());
}

// Multi-tenant identification middleware (must be before routes)
app.use(tenantIdentificationMiddleware);

// Branding headers middleware
app.use(brandingHeaderMiddleware);

// Request logging middleware - must be before routes
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use(brandingRoutes);
// Temporarily disable email routes due to missing services
// app.use('/api/email', emailRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));

  // Catch all handler for SPA
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const appError = isAppError(err) ? err : createErrorFromUnknown(err);
  const requestId = (req as any).id || 'unknown';
  
  // Log the error with context
  logger.error('Request error', {
    requestId,
    method: req.method,
    path: req.url,
    error: appError,
    userId: (req as any).user?.id,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });
  
  // Format and send error response
  const errorResponse = formatErrorResponse(appError, requestId);
  res.status(appError.statusCode).json(errorResponse);
});

// 404 handler for unmatched routes
app.use('*', (req: express.Request, res: express.Response) => {
  const error = new AppError(
    'NOT_FOUND' as any,
    `Route ${req.method} ${req.path} not found`,
    404
  );
  const errorResponse = formatErrorResponse(error);
  res.status(404).json(errorResponse);
});

// Validate critical configuration before starting
function validateConfiguration() {
  const requiredEnvVars = ['JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new ConfigurationError(
      'Missing required environment variables',
      missingVars
    );
  }
}

// Start server
try {
  validateConfiguration();
  
  app.listen(PORT, () => {
    logger.info('Server started successfully', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      database: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
      jwtSecret: process.env.JWT_SECRET ? 'Configured' : 'Missing'
    });
  });
} catch (error) {
  logger.error('Failed to start server', { error: error as Error });
  process.exit(1);
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    error: reason as Error,
    promise: promise?.toString()
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});