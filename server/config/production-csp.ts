/**
 * Production CSP Configuration
 * Tailored for Vite-built SPA with PWA support
 */

export const productionCSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite module preloading
    "'unsafe-eval'", // Required for some bundled dependencies
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite CSS injection
  ],
  'img-src': [
    "'self'",
    'data:', // For inline images
    'blob:', // For dynamic image generation
    'https:', // For external images if needed
  ],
  'font-src': [
    "'self'",
    'data:', // For inline fonts
  ],
  'connect-src': [
    "'self'",
    'ws:', // WebSocket connections in development
    'wss:', // WebSocket connections in production
    'https://api.openrouter.ai', // For AI services
    process.env.API_BASE_URL || 'https://ccl-3-final.onrender.com',
  ],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'worker-src': [
    "'self'",
    'blob:', // For service workers
  ],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': [],
};

// For local development with hot module replacement
export const developmentCSPDirectives = {
  ...productionCSPDirectives,
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'localhost:*',
    'http://localhost:*',
  ],
  'connect-src': [
    "'self'",
    'ws://localhost:*',
    'http://localhost:*',
    'https://api.openrouter.ai',
  ],
};
