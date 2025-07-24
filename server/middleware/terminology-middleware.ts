import { Request, Response, NextFunction } from 'express';
import { featureFlagService, type FeatureFlagContext } from '../services/feature-flag-service';
import { dualTerminologyService } from '../services/dual-terminology-service';

// Extended request interface to include terminology context
export interface TerminologyRequest extends Request {
  terminologyContext?: FeatureFlagContext;
  terminologyMode?: 'legacy' | 'modern' | 'auto';
}

// Middleware to detect and set terminology context
export const terminologyMiddleware = async (req: TerminologyRequest, res: Response, next: NextFunction) => {
  try {
    // Extract context from request (user, environment, etc.)
    const context: FeatureFlagContext = {
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      environment: (process.env.NODE_ENV as any) || 'development'
    };

    // Determine terminology mode
    const terminologyMode = await dualTerminologyService.getTerminologyMode(context);

    // Attach to request for use in route handlers
    req.terminologyContext = context;
    req.terminologyMode = terminologyMode;

    next();
  } catch (error) {
    console.error('Terminology middleware error:', error);
    // Don't fail the request, just proceed with default terminology
    req.terminologyMode = 'legacy';
    next();
  }
};

// Response transformation middleware for automatic terminology conversion
export const terminologyResponseMiddleware = (req: TerminologyRequest, res: Response, next: NextFunction) => {
  // Store original json method
  const originalJson = res.json.bind(res);
  let jsonOverridden = false;

  // Override json method to transform responses based on terminology
  res.json = function(data: any) {
    // Prevent recursive overrides
    if (!jsonOverridden) {
      jsonOverridden = true;
      
      if (req.terminologyMode && req.terminologyMode !== 'legacy') {
        // Transform response using dual terminology service
        const transformedData = dualTerminologyService.getApiResponse(data, req.terminologyMode);
        return originalJson(transformedData);
      }
    }
    
    // Return data as-is for legacy mode or if already processed
    return originalJson(data);
  };

  next();
};

// Route aliasing middleware - redirects /contacts/* to /leads/* internally when needed
export const routeAliasMiddleware = (legacyPath: string, modernPath: string) => {
  return async (req: TerminologyRequest, res: Response, next: NextFunction) => {
    try {
      // If request is for modern path but we're in legacy mode, don't redirect
      if (req.path.startsWith(modernPath) && req.terminologyMode === 'legacy') {
        // Continue processing as normal - the dual terminology service will handle it
        return next();
      }

      // If request is for legacy path but we're in modern mode, don't redirect
      if (req.path.startsWith(legacyPath) && req.terminologyMode === 'modern') {
        // Continue processing as normal - the dual terminology service will handle it
        return next();
      }

      next();
    } catch (error) {
      console.error('Route alias middleware error:', error);
      next();
    }
  };
};

// Header-based terminology detection middleware
export const terminologyHeaderMiddleware = (req: TerminologyRequest, res: Response, next: NextFunction) => {
  // Check for explicit terminology preference in headers
  const terminologyHeader = req.headers['x-terminology-mode'] as string;
  
  if (terminologyHeader && ['legacy', 'modern'].includes(terminologyHeader)) {
    req.terminologyMode = terminologyHeader as 'legacy' | 'modern';
  }

  // Set response header to indicate which terminology is being used
  res.setHeader('X-Terminology-Mode', req.terminologyMode || 'legacy');
  
  next();
};

// Combined middleware stack for easy application
export const applyTerminologyMiddleware = (app: any) => {
  // Apply middleware in order
  app.use('/api/leads', terminologyMiddleware);
  app.use('/api/contacts', terminologyMiddleware);
  app.use('/api/leads', terminologyHeaderMiddleware);
  app.use('/api/contacts', terminologyHeaderMiddleware);
  app.use('/api/leads', terminologyResponseMiddleware);
  app.use('/api/contacts', terminologyResponseMiddleware);
};

export default {
  terminologyMiddleware,
  terminologyResponseMiddleware,
  routeAliasMiddleware,
  terminologyHeaderMiddleware,
  applyTerminologyMiddleware
};