import { Request, Response } from 'express';

interface EndpointSchema {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  parameters?: Record<string, any>;
  requestBody?: Record<string, any>;
  responses?: Record<string, any>;
  examples?: Record<string, any>;
}

interface RouteGroup {
  name: string;
  description: string;
  basePrefix: string;
  endpoints: EndpointSchema[];
}

export class ApiDocumentationService {
  private static instance: ApiDocumentationService;
  
  private constructor() {}
  
  static getInstance(): ApiDocumentationService {
    if (!ApiDocumentationService.instance) {
      ApiDocumentationService.instance = new ApiDocumentationService();
    }
    return ApiDocumentationService.instance;
  }

  private getRouteGroups(): RouteGroup[] {
    return [
      {
        name: 'Authentication',
        description: 'User authentication and session management',
        basePrefix: '/api/auth',
        endpoints: [
          {
            method: 'POST',
            path: '/login',
            description: 'Authenticate user and return access tokens',
            auth: false,
            requestBody: {
              type: 'object',
              required: ['username', 'password'],
              properties: {
                username: { type: 'string', example: 'admin@onekeel.com' },
                password: { type: 'string', example: 'password123' }
              }
            },
            responses: {
              '200': {
                description: 'Authentication successful',
                content: {
                  success: true,
                  user: { id: 'string', email: 'string', role: 'string' },
                  accessToken: 'string',
                  refreshToken: 'string',
                  expiresIn: 3600
                }
              },
              '401': { description: 'Invalid credentials' }
            }
          },
          {
            method: 'POST',
            path: '/refresh',
            description: 'Refresh access token using refresh token',
            auth: false,
            requestBody: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string' }
              }
            },
            responses: {
              '200': { description: 'Token refreshed successfully' },
              '401': { description: 'Invalid refresh token' }
            }
          },
          {
            method: 'POST',
            path: '/logout',
            description: 'Logout and invalidate tokens',
            auth: true,
            responses: {
              '200': { description: 'Logged out successfully' }
            }
          },
          {
            method: 'GET',
            path: '/me',
            description: 'Get current user information',
            auth: true,
            responses: {
              '200': {
                description: 'Current user info',
                content: {
                  success: true,
                  user: { id: 'string', email: 'string', role: 'string' }
                }
              }
            }
          }
        ]
      },
      {
        name: 'Agent Templates',
        description: 'Manage AI agent templates with sophisticated prompts',
        basePrefix: '/api/agent-templates',
        endpoints: [
          {
            method: 'GET',
            path: '/',
            description: 'List all agent templates',
            auth: true,
            parameters: {
              limit: { type: 'integer', description: 'Number of templates to return' },
              offset: { type: 'integer', description: 'Number of templates to skip' }
            },
            responses: {
              '200': {
                description: 'List of agent templates',
                content: {
                  templates: [
                    {
                      id: 'string',
                      name: 'string',
                      description: 'string',
                      type: 'email | sms | chat | voice',
                      category: 'string',
                      systemPrompt: 'string',
                      isDefault: false
                    }
                  ]
                }
              }
            }
          },
          {
            method: 'GET',
            path: '/search',
            description: 'Search agent templates',
            auth: true,
            parameters: {
              q: { type: 'string', description: 'Search query' },
              type: { type: 'string', description: 'Filter by agent type' },
              category: { type: 'string', description: 'Filter by category' }
            }
          },
          {
            method: 'POST',
            path: '/',
            description: 'Create new agent template',
            auth: true,
            requestBody: {
              type: 'object',
              required: ['name', 'description', 'type', 'category', 'systemPrompt'],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                type: { type: 'string', enum: ['email', 'sms', 'chat', 'voice'] },
                category: { type: 'string' },
                systemPrompt: { type: 'string' },
                temperature: { type: 'integer', minimum: 0, maximum: 10 },
                maxTokens: { type: 'integer', minimum: 50, maximum: 4000 }
              }
            }
          },
          {
            method: 'PUT',
            path: '/:id',
            description: 'Update agent template',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'Template ID' }
            }
          },
          {
            method: 'DELETE',
            path: '/:id',
            description: 'Delete agent template',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'Template ID' }
            }
          },
          {
            method: 'POST',
            path: '/:id/clone',
            description: 'Clone an existing template',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'Template ID to clone' }
            }
          }
        ]
      },
      {
        name: 'Email Management',
        description: 'Email templates, scheduling, and monitoring',
        basePrefix: '/api/email',
        endpoints: [
          {
            method: 'GET',
            path: '/templates',
            description: 'List email templates',
            auth: true
          },
          {
            method: 'POST',
            path: '/templates',
            description: 'Create email template',
            auth: true,
            requestBody: {
              type: 'object',
              required: ['name', 'subject', 'content'],
              properties: {
                name: { type: 'string' },
                subject: { type: 'string' },
                content: { type: 'string' },
                variables: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          {
            method: 'POST',
            path: '/send',
            description: 'Send email',
            auth: true,
            requestBody: {
              type: 'object',
              required: ['to', 'subject', 'content'],
              properties: {
                to: { type: 'string' },
                subject: { type: 'string' },
                content: { type: 'string' },
                templateId: { type: 'string' }
              }
            }
          },
          {
            method: 'POST',
            path: '/schedule',
            description: 'Schedule email for later delivery',
            auth: true,
            requestBody: {
              type: 'object',
              required: ['to', 'subject', 'content', 'scheduledFor'],
              properties: {
                to: { type: 'string' },
                subject: { type: 'string' },
                content: { type: 'string' },
                scheduledFor: { type: 'string', format: 'date-time' }
              }
            }
          }
        ]
      },
      {
        name: 'Lead Management',
        description: 'Manage leads and contact information',
        basePrefix: '/api/leads',
        endpoints: [
          {
            method: 'GET',
            path: '/',
            description: 'List leads with filtering and pagination',
            auth: true,
            parameters: {
              limit: { type: 'integer', default: 50 },
              offset: { type: 'integer', default: 0 },
              status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'converted', 'rejected'] },
              source: { type: 'string' }
            }
          },
          {
            method: 'POST',
            path: '/',
            description: 'Create new lead',
            auth: true,
            requestBody: {
              type: 'object',
              required: ['email'],
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
                source: { type: 'string' },
                status: { type: 'string', default: 'new' }
              }
            }
          },
          {
            method: 'GET',
            path: '/:id',
            description: 'Get lead details',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'Lead ID' }
            }
          },
          {
            method: 'PATCH',
            path: '/:id',
            description: 'Update lead information',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'Lead ID' }
            }
          },
          {
            method: 'GET',
            path: '/:id/timeline',
            description: 'Get lead activity timeline',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'Lead ID' }
            }
          }
        ]
      },
      {
        name: 'Campaign Management',
        description: 'Create and manage marketing campaigns',
        basePrefix: '/api/campaigns',
        endpoints: [
          {
            method: 'GET',
            path: '/',
            description: 'List campaigns',
            auth: true
          },
          {
            method: 'POST',
            path: '/',
            description: 'Create campaign',
            auth: true,
            requestBody: {
              type: 'object',
              required: ['name', 'type'],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                type: { type: 'string', enum: ['drip', 'blast', 'trigger'] },
                targetCriteria: { type: 'object' },
                settings: { type: 'object' }
              }
            }
          },
          {
            method: 'GET',
            path: '/:id/stats',
            description: 'Get campaign statistics',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'Campaign ID' }
            }
          }
        ]
      },
      {
        name: 'User Management',
        description: 'Manage system users and permissions',
        basePrefix: '/api/users',
        endpoints: [
          {
            method: 'GET',
            path: '/',
            description: 'List users',
            auth: true,
            parameters: {
              role: { type: 'string', enum: ['admin', 'manager', 'agent', 'viewer'] }
            }
          },
          {
            method: 'GET',
            path: '/:id',
            description: 'Get user details',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'User ID' }
            }
          },
          {
            method: 'PUT',
            path: '/:id',
            description: 'Update user',
            auth: true,
            parameters: {
              id: { type: 'string', description: 'User ID' }
            }
          }
        ]
      },
      {
        name: 'System Monitoring',
        description: 'System health and performance monitoring',
        basePrefix: '/api/monitoring',
        endpoints: [
          {
            method: 'GET',
            path: '/health',
            description: 'Get system health status',
            auth: false
          },
          {
            method: 'GET',
            path: '/performance',
            description: 'Get performance metrics',
            auth: true
          },
          {
            method: 'GET',
            path: '/dashboard',
            description: 'Get monitoring dashboard data',
            auth: true
          }
        ]
      }
    ];
  }

  generateOpenApiSpec(): any {
    const routeGroups = this.getRouteGroups();
    
    const openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: 'OneKeel Swarm API',
        version: '1.0.0',
        description: 'Comprehensive API for the OneKeel Swarm AI agent management platform',
        contact: {
          name: 'OneKeel Support',
          email: 'support@onekeel.com'
        }
      },
      servers: [
        {
          url: '/api',
          description: 'API Server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              username: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              role: { type: 'string', enum: ['admin', 'manager', 'agent', 'viewer'] },
              active: { type: 'boolean' }
            }
          }
        }
      },
      paths: {} as Record<string, any>,
      tags: routeGroups.map(group => ({
        name: group.name,
        description: group.description
      }))
    };

    // Generate paths from route groups
    routeGroups.forEach(group => {
      group.endpoints.forEach(endpoint => {
        const fullPath = `${group.basePrefix}${endpoint.path}`;
        const method = endpoint.method.toLowerCase();
        
        if (!openApiSpec.paths[fullPath]) {
          openApiSpec.paths[fullPath] = {};
        }
        
        openApiSpec.paths[fullPath][method] = {
          tags: [group.name],
          summary: endpoint.description,
          security: endpoint.auth ? [{ bearerAuth: [] }] : [],
          parameters: endpoint.parameters ? Object.entries(endpoint.parameters).map(([name, schema]) => ({
            name,
            in: fullPath.includes(`/:${name}`) ? 'path' : 'query',
            required: fullPath.includes(`/:${name}`),
            schema
          })) : [],
          requestBody: endpoint.requestBody ? {
            required: true,
            content: {
              'application/json': {
                schema: endpoint.requestBody
              }
            }
          } : undefined,
          responses: endpoint.responses || {
            '200': { description: 'Success' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Not Found' },
            '500': { description: 'Internal Server Error' }
          }
        };
      });
    });

    return openApiSpec;
  }

  generateHtmlDocumentation(): string {
    const routeGroups = this.getRouteGroups();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OneKeel Swarm API Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .route-group { margin-bottom: 40px; }
        .route-group h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .endpoint { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        .method.get { background: #28a745; color: white; }
        .method.post { background: #007bff; color: white; }
        .method.put { background: #ffc107; color: black; }
        .method.delete { background: #dc3545; color: white; }
        .method.patch { background: #6f42c1; color: white; }
        .auth-required { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 8px 12px; margin: 10px 0; font-size: 14px; }
        .code-block { background: #f1f3f4; border-radius: 4px; padding: 15px; margin: 10px 0; font-family: 'Monaco', 'Consolas', monospace; font-size: 14px; overflow-x: auto; }
        .toc { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
        .toc h3 { margin-top: 0; }
        .toc ul { list-style: none; padding-left: 0; }
        .toc li { margin: 5px 0; }
        .toc a { text-decoration: none; color: #007bff; }
        .toc a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>OneKeel Swarm API Documentation</h1>
            <p>Comprehensive API reference for the OneKeel Swarm AI agent management platform</p>
            <p><strong>Base URL:</strong> <code>/api</code></p>
            <p><strong>Authentication:</strong> Bearer Token (JWT)</p>
        </div>

        <div class="toc">
            <h3>Table of Contents</h3>
            <ul>
                ${routeGroups.map(group => `
                    <li><a href="#${group.name.toLowerCase().replace(/\s+/g, '-')}">${group.name}</a></li>
                `).join('')}
            </ul>
        </div>

        ${routeGroups.map(group => `
            <div class="route-group" id="${group.name.toLowerCase().replace(/\s+/g, '-')}">
                <h2>${group.name}</h2>
                <p>${group.description}</p>
                <p><strong>Base Path:</strong> <code>${group.basePrefix}</code></p>
                
                ${group.endpoints.map(endpoint => `
                    <div class="endpoint">
                        <h4>
                            <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                            <code>${group.basePrefix}${endpoint.path}</code>
                        </h4>
                        <p>${endpoint.description}</p>
                        
                        ${endpoint.auth ? '<div class="auth-required">🔐 Authentication required</div>' : ''}
                        
                        ${endpoint.parameters ? `
                            <h5>Parameters</h5>
                            <div class="code-block">
                                ${Object.entries(endpoint.parameters).map(([name, schema]: [string, any]) => `
                                    <strong>${name}</strong>: ${schema.type || 'string'}${schema.required ? ' (required)' : ''}
                                    ${schema.description ? ` - ${schema.description}` : ''}
                                `).join('<br>')}
                            </div>
                        ` : ''}
                        
                        ${endpoint.requestBody ? `
                            <h5>Request Body</h5>
                            <div class="code-block">
                                ${JSON.stringify(endpoint.requestBody, null, 2)}
                            </div>
                        ` : ''}
                        
                        ${endpoint.responses ? `
                            <h5>Responses</h5>
                            ${Object.entries(endpoint.responses).map(([code, response]: [string, any]) => `
                                <div class="code-block">
                                    <strong>${code}:</strong> ${response.description || 'Success'}
                                    ${response.content ? `<br><pre>${JSON.stringify(response.content, null, 2)}</pre>` : ''}
                                </div>
                            `).join('')}
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('')}

        <div class="route-group">
            <h2>Authentication Guide</h2>
            <p>Most endpoints require authentication using JWT tokens. Here's how to authenticate:</p>
            
            <h4>1. Login</h4>
            <div class="code-block">
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin@onekeel.com",
  "password": "password123"
}
            </div>
            
            <h4>2. Use the access token</h4>
            <div class="code-block">
Authorization: Bearer &lt;your_access_token&gt;
            </div>
            
            <h4>3. Refresh when needed</h4>
            <div class="code-block">
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "&lt;your_refresh_token&gt;"
}
            </div>
        </div>

        <div class="route-group">
            <h2>Error Handling</h2>
            <p>All API responses follow a consistent format:</p>
            
            <h4>Success Response</h4>
            <div class="code-block">
{
  "success": true,
  "data": { ... }
}
            </div>
            
            <h4>Error Response</h4>
            <div class="code-block">
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
            </div>
            
            <h4>Common Error Codes</h4>
            <ul>
                <li><strong>VALIDATION_ERROR:</strong> Invalid request data</li>
                <li><strong>UNAUTHORIZED:</strong> Authentication required</li>
                <li><strong>FORBIDDEN:</strong> Insufficient permissions</li>
                <li><strong>NOT_FOUND:</strong> Resource not found</li>
                <li><strong>RATE_LIMITED:</strong> Too many requests</li>
                <li><strong>INTERNAL_ERROR:</strong> Server error</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `;
  }

  handleDocsRequest(req: Request, res: Response) {
    const format = req.query.format as string;
    
    if (format === 'openapi' || format === 'json') {
      res.json(this.generateOpenApiSpec());
    } else if (format === 'html') {
      res.type('html').send(this.generateHtmlDocumentation());
    } else {
      // Default JSON response with basic info
      res.json({
        title: 'OneKeel Swarm API',
        version: '1.0.0',
        description: 'Comprehensive API for the OneKeel Swarm AI agent management platform',
        documentation: {
          openapi: '/api/docs?format=openapi',
          html: '/api/docs?format=html',
          interactive: '/api/docs?format=html'
        },
        routes: this.getRouteGroups().map(group => ({
          name: group.name,
          description: group.description,
          basePrefix: group.basePrefix,
          endpointCount: group.endpoints.length
        }))
      });
    }
  }
}

// Export singleton instance
export const apiDocumentationService = ApiDocumentationService.getInstance();
export default apiDocumentationService;