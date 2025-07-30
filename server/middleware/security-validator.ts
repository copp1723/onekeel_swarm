import { Request, Response, NextFunction } from 'express';
import { auditLogger } from '../services/audit-logger';
import { usersRepository as UsersRepository } from '../db';

/**
 * Role hierarchy for permission checks
 */
export const roleHierarchy = {
  admin: 4,    // Full system access
  manager: 3,  // Team and campaign management
  agent: 2,    // Campaign execution and lead management
  viewer: 1    // Read-only access
};

/**
 * Security validation middleware
 * 
 * This middleware provides security validation functions for various
 * security requirements including role-based access control,
 * resource ownership validation, and security policy enforcement.
 */
export class SecurityValidator {
  /**
   * Validate minimum role level required for access
   * 
   * @param requiredRole - Minimum role required
   * @returns Express middleware function
   */
  static requireRole(requiredRole: keyof typeof roleHierarchy) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_AUTH'
          });
        }
        
        const userRole = req.user.role as keyof typeof roleHierarchy;
        
        if (!this.hasMinimumRole(userRole, requiredRole)) {
          // Log security violation attempt
          await auditLogger.logSecurityChange(req.user.id, {
            type: 'permission_change',
            resource: 'security',
            details: `Attempted to access resource requiring ${requiredRole} role with ${userRole} role`
          });
          
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            code: 'FORBIDDEN',
            required: requiredRole,
            current: userRole
          });
        }
        
        next();
      } catch (error) {
        console.error('Role validation error:', error);
        res.status(500).json({ 
          error: 'Security validation error',
          code: 'SECURITY_ERROR'
        });
      }
    };
  }

  /**
   * Validate resource ownership or minimum role
   * 
   * @param resourceIdParam - Request parameter containing the resource ID
   * @param ownerIdField - Field in the resource that contains the owner ID
   * @param resourceType - Type of resource for audit logging
   * @param minRole - Minimum role that can access regardless of ownership
   * @returns Express middleware function
   */
  static validateOwnershipOr(
    resourceIdParam: string,
    ownerIdField: string,
    resourceType: string,
    minRole: keyof typeof roleHierarchy = 'manager'
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_AUTH'
          });
        }
        
        const resourceId = req.params[resourceIdParam];
        if (!resourceId) {
          return res.status(400).json({ 
            error: 'Resource ID not provided',
            code: 'MISSING_RESOURCE_ID'
          });
        }
        
        // Check if user has minimum role (bypass ownership check)
        const userRole = req.user.role as keyof typeof roleHierarchy;
        if (this.hasMinimumRole(userRole, minRole)) {
          return next();
        }
        
        // Get the resource to check ownership
        // This is a generic approach - in a real implementation,
        // you would use the appropriate repository for the resource type
        const resource = await this.getResourceById(resourceType, resourceId);
        
        if (!resource) {
          return res.status(404).json({ 
            error: 'Resource not found',
            code: 'RESOURCE_NOT_FOUND'
          });
        }
        
        // Check if user owns the resource
        if (resource[ownerIdField] === req.user.id) {
          return next();
        }
        
        // Log security violation attempt
        await auditLogger.logSecurityChange(req.user.id, {
          type: 'permission_change',
          resource: resourceType,
          resourceId: resourceId,
          details: `Attempted to access ${resourceType} without ownership or sufficient role`
        });
        
        return res.status(403).json({ 
          error: 'Access denied',
          code: 'FORBIDDEN'
        });
      } catch (error) {
        console.error('Ownership validation error:', error);
        res.status(500).json({ 
          error: 'Security validation error',
          code: 'SECURITY_ERROR'
        });
      }
    };
  }

  /**
   * Validate client access
   * 
   * @param clientIdParam - Request parameter containing the client ID
   * @returns Express middleware function
   */
  static validateClientAccess(clientIdParam: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_AUTH'
          });
        }
        
        const clientId = req.params[clientIdParam];
        if (!clientId) {
          return res.status(400).json({ 
            error: 'Client ID not provided',
            code: 'MISSING_CLIENT_ID'
          });
        }
        
        // Admin and manager roles have access to all clients
        const userRole = req.user.role as keyof typeof roleHierarchy;
        if (this.hasMinimumRole(userRole, 'manager')) {
          return next();
        }
        
        // For other roles, check if user has access to this client
        const hasAccess = await this.userHasClientAccess(req.user.id, clientId);
        
        if (hasAccess) {
          return next();
        }
        
        // Log security violation attempt
        await auditLogger.logSecurityChange(req.user.id, {
          type: 'permission_change',
          resource: 'client',
          resourceId: clientId,
          details: `Attempted to access client without permission`
        });
        
        return res.status(403).json({ 
          error: 'Access to this client denied',
          code: 'CLIENT_ACCESS_DENIED'
        });
      } catch (error) {
        console.error('Client access validation error:', error);
        res.status(500).json({ 
          error: 'Security validation error',
          code: 'SECURITY_ERROR'
        });
      }
    };
  }

  /**
   * Validate security operation
   * 
   * @param operationType - Type of security operation
   * @returns Express middleware function
   */
  static validateSecurityOperation(operationType: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_AUTH'
          });
        }
        
        // Only admin can perform security operations
        if (req.user.role !== 'admin') {
          // Log security violation attempt
          await auditLogger.logSecurityChange(req.user.id, {
            type: 'permission_change',
            resource: 'security',
            details: `Attempted to perform security operation: ${operationType}`
          });
          
          return res.status(403).json({ 
            error: 'Security operations restricted to admin',
            code: 'SECURITY_OPERATION_DENIED'
          });
        }
        
        // Log the security operation
        await auditLogger.logSecurityChange(req.user.id, {
          type: 'security_operation',
          resource: 'security',
          details: `Performed security operation: ${operationType}`
        });
        
        next();
      } catch (error) {
        console.error('Security operation validation error:', error);
        res.status(500).json({ 
          error: 'Security validation error',
          code: 'SECURITY_ERROR'
        });
      }
    };
  }

  /**
   * Check if a user has the minimum required role
   * 
   * @param userRole - User's role
   * @param requiredRole - Minimum required role
   * @returns Whether the user has sufficient permissions
   */
  static hasMinimumRole(
    userRole: keyof typeof roleHierarchy, 
    requiredRole: keyof typeof roleHierarchy
  ): boolean {
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Get a resource by ID
   * 
   * @param resourceType - Type of resource
   * @param resourceId - ID of the resource
   * @returns The resource or null if not found
   */
  private static async getResourceById(resourceType: string, resourceId: string): Promise<any> {
    // This is a placeholder - in a real implementation,
    // you would use the appropriate repository for the resource type
    // For now, we'll just handle the 'user' resource type
    if (resourceType === 'user') {
      return await UsersRepository.findById(resourceId);
    }
    
    // For other resource types, you would add similar logic
    return null;
  }

  /**
   * Check if a user has access to a client
   * 
   * @param userId - User ID
   * @param clientId - Client ID
   * @returns Whether the user has access to the client
   */
  private static async userHasClientAccess(userId: string, clientId: string): Promise<boolean> {
    // This is a placeholder - in a real implementation,
    // you would check if the user has access to the client
    // For now, we'll return false
    return false;
  }
}

// Export convenience middleware functions
export const requireAdmin = SecurityValidator.requireRole('admin');
export const requireManager = SecurityValidator.requireRole('manager');
export const requireAgent = SecurityValidator.requireRole('agent');
export const validateOwnership = (resourceParam: string, ownerField: string, resourceType: string) => 
  SecurityValidator.validateOwnershipOr(resourceParam, ownerField, resourceType);
export const validateClientAccess = (clientParam: string) => 
  SecurityValidator.validateClientAccess(clientParam);
export const validateSecurityOp = (opType: string) => 
  SecurityValidator.validateSecurityOperation(opType);