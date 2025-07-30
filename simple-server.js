#!/usr/bin/env node

// Simple server to bypass npm/tsx issues
// This is a temporary workaround to get the application running

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5001;

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

// Simple API responses for testing
const apiResponses = {
  '/api/health': { status: 'ok', message: 'Server is running' },
  '/api/auth/login': {
    success: true,
    token: 'demo-jwt-token-' + Date.now(),
    user: { id: 1, email: process.env.DEMO_ADMIN_EMAIL || 'admin@example.com', role: 'admin' },
    message: 'Login successful'
  },
  '/api/auth/logout': { success: true, message: 'Logout successful' },
  '/api/auth/me': {
    id: 1,
    email: process.env.DEMO_ADMIN_EMAIL || 'admin@example.com',
    role: 'admin',
    name: 'Admin User'
  },
  '/api/services/health': {
    database: { status: 'connected', latency: '5ms' },
    redis: { status: 'connected', latency: '2ms' },
    mailgun: { status: 'configured', last_check: new Date().toISOString() },
    twilio: { status: 'configured', last_check: new Date().toISOString() },
    openrouter: { status: 'configured', last_check: new Date().toISOString() }
  },
  '/api/services/config': {
    mailgun: { configured: true, domain: 'example.com' },
    twilio: { configured: true, phone_number: '+1234567890' },
    openrouter: { configured: true, model: 'gpt-4' }
  },
  '/api/campaigns': {
    campaigns: [
      {
        id: 1,
        name: 'Welcome Series',
        status: 'active',
        type: 'email',
        created_at: '2025-01-15T10:00:00Z',
        emails_sent: 1250,
        open_rate: 0.24,
        click_rate: 0.08
      },
      {
        id: 2,
        name: 'Product Demo Follow-up',
        status: 'draft',
        type: 'email',
        created_at: '2025-01-20T14:30:00Z',
        emails_sent: 0,
        open_rate: 0,
        click_rate: 0
      }
    ]
  },
  '/api/campaigns/create': {
    success: true,
    campaign_id: Date.now(),
    message: 'Campaign created successfully'
  },
  '/api/campaigns/templates': [
    { id: 1, name: 'Welcome Series', description: 'Multi-step welcome campaign', steps: 3 },
    { id: 2, name: 'Product Launch', description: 'Product announcement campaign', steps: 2 },
    { id: 3, name: 'Re-engagement', description: 'Win back inactive users', steps: 4 }
  ],
  '/api/email/templates': [
    {
      id: 1,
      name: 'Welcome Email',
      subject: 'Welcome to OneKeel!',
      content: '<h1>Welcome!</h1><p>Thanks for joining us.</p>',
      type: 'welcome'
    },
    {
      id: 2,
      name: 'Follow Up',
      subject: 'Thanks for your interest!',
      content: '<h1>Follow Up</h1><p>We appreciate your interest.</p>',
      type: 'followup'
    },
    {
      id: 3,
      name: 'Product Demo',
      subject: 'See our product in action',
      content: '<h1>Product Demo</h1><p>Schedule your demo today.</p>',
      type: 'demo'
    }
  ],
  '/api/agents': {
    agents: [
      {
        id: 1,
        name: 'Sales Assistant',
        type: 'email',
        status: 'active',
        description: 'Handles sales inquiries and follow-ups',
        created_at: '2025-01-10T10:00:00Z'
      },
      {
        id: 2,
        name: 'Customer Support',
        type: 'email',
        status: 'active',
        description: 'Provides customer support and assistance',
        created_at: '2025-01-12T14:30:00Z'
      },
      {
        id: 3,
        name: 'Marketing Specialist',
        type: 'email',
        status: 'active',
        description: 'Creates and manages marketing campaigns',
        created_at: '2025-01-15T09:15:00Z'
      }
    ]
  },
  '/api/agents/email/generate': {
    success: true,
    emails: [
      {
        subject: 'Welcome to OneKeel - Your Journey Starts Here',
        content: '<h1>Welcome!</h1><p>We\'re excited to have you on board. Here\'s what you can expect...</p>',
        step: 1
      },
      {
        subject: 'Getting Started with OneKeel',
        content: '<h1>Getting Started</h1><p>Let\'s help you get the most out of your OneKeel experience...</p>',
        step: 2
      }
    ],
    message: 'Email sequence generated successfully'
  }
};

function serveStaticFile(filePath, res) {
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

function handleApiRequest(pathname, req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });

  // Handle POST requests
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);

        if (pathname === '/api/auth/login') {
          console.log('[LOGIN] Received login request:', requestData);
          res.end(JSON.stringify(apiResponses[pathname]));
        } else if (pathname === '/api/campaigns/create' || pathname === '/api/campaigns') {
          console.log('[CAMPAIGN] Creating campaign:', requestData);
          const response = {
            success: true,
            campaign_id: Date.now(),
            message: 'Campaign created successfully',
            campaign: {
              id: Date.now(),
              name: requestData.name || 'New Campaign',
              status: 'draft',
              type: requestData.type || 'email',
              created_at: new Date().toISOString()
            }
          };
          res.end(JSON.stringify(response));
        } else if (pathname === '/api/agents/email/generate') {
          console.log('[AI] Generating email sequence:', requestData);
          res.end(JSON.stringify(apiResponses[pathname]));
        } else if (pathname === '/api/email/templates') {
          console.log('[TEMPLATE] Saving template:', requestData);
          const response = {
            success: true,
            template_id: Date.now(),
            message: 'Template saved successfully'
          };
          res.end(JSON.stringify(response));
        } else {
          res.end(JSON.stringify({ error: 'POST endpoint not implemented', path: pathname }));
        }
      } catch (error) {
        res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
      }
    });
    return;
  }

  if (apiResponses[pathname]) {
    res.end(JSON.stringify(apiResponses[pathname]));
  } else {
    res.end(JSON.stringify({ error: 'API endpoint not implemented yet', path: pathname }));
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Handle API requests
  if (pathname.startsWith('/api/')) {
    handleApiRequest(pathname, req, res);
    return;
  }

  // Serve static files
  let filePath = '';
  
  if (pathname === '/' || pathname === '/index.html') {
    // Check for built client files first
    if (fs.existsSync(path.join(__dirname, 'client/dist/index.html'))) {
      filePath = path.join(__dirname, 'client/dist/index.html');
    } else if (fs.existsSync(path.join(__dirname, 'dist/client/index.html'))) {
      filePath = path.join(__dirname, 'dist/client/index.html');
    } else {
      filePath = path.join(__dirname, 'client/index.html');
    }
  } else {
    // Try different static file locations
    const possiblePaths = [
      path.join(__dirname, 'client/dist', pathname),
      path.join(__dirname, 'dist/client', pathname),
      path.join(__dirname, 'client/public', pathname),
      path.join(__dirname, pathname)
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }
    
    if (!filePath) {
      filePath = path.join(__dirname, 'client/dist', pathname);
    }
  }

  serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`🚀 OneKeel Swarm Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from multiple locations`);
  console.log(`🔧 API endpoints available at /api/*`);
  console.log(`⚠️  This is a temporary server to bypass npm issues`);
  console.log(`💡 Once npm is fixed, use: npm run dev`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
