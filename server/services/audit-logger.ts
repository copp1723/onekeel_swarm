import { auditLogRepository as AuditLogRepository } from '../db';

/**
 * Security change type definition
 */
export interface SecurityChange {
  type: 'role_change' | 'permission_change' | 'status_change' | 'password_change' | 'mfa_change';
  resource: string;
  resourceId?: string;
  before?: any;
  after?: any;
  details?: string;
}

/**
 * AuditLogger service for tracking security-related events
 * 
 * This service provides a high-level API for logging security events
 * and user actions that are relevant for compliance and security auditing.
 */
export class AuditLogger {
  /**
   * Log user creation event
   * 
   * @param adminId - ID of the admin who created the user
   * @param newUserId - ID of the newly created user
   * @param userData - Optional user data (sensitive fields will be redacted)
   * @returns The created audit log entry
   */
  async logUserCreation(adminId: string, newUserId: string, userData?: any) {
    try {
      // Filter sensitive data
      const filteredData = this.filterSensitiveData(userData || {});
      
      return await AuditLogRepository.create({
        userId: adminId,
        action: 'create',
        resource: 'user',
        resourceId: newUserId,
        changes: filteredData,
        ipAddress: this.getRequestIp(),
        userAgent: this.getRequestUserAgent()
      });
    } catch (error) {
      console.error('Failed to log user creation:', error);
      // Don't throw - audit logging should not break the application
      return null;
    }
  }

  /**
   * Log security change event
   * 
   * @param userId - ID of the user who made the change
   * @param change - Security change details
   * @returns The created audit log entry
   */
  async logSecurityChange(userId: string, change: SecurityChange) {
    try {
      // Filter sensitive data from before/after
      if (change.before) {
        change.before = this.filterSensitiveData(change.before);
      }
      
      if (change.after) {
        change.after = this.filterSensitiveData(change.after);
      }
      
      return await AuditLogRepository.create({
        userId,
        action: 'update',
        resource: change.resource,
        resourceId: change.resourceId,
        changes: {
          type: change.type,
          before: change.before,
          after: change.after,
          details: change.details
        },
        ipAddress: this.getRequestIp(),
        userAgent: this.getRequestUserAgent()
      });
    } catch (error) {
      console.error('Failed to log security change:', error);
      // Don't throw - audit logging should not break the application
      return null;
    }
  }

  /**
   * Log system access event
   * 
   * @param userId - ID of the user accessing the resource
   * @param resource - Resource being accessed
   * @param resourceId - Optional ID of the specific resource
   * @param details - Optional additional details
   * @returns The created audit log entry
   */
  async logSystemAccess(userId: string, resource: string, resourceId?: string, details?: any) {
    try {
      return await AuditLogRepository.create({
        userId,
        action: 'view',
        resource,
        resourceId,
        changes: details ? this.filterSensitiveData(details) : undefined,
        ipAddress: this.getRequestIp(),
        userAgent: this.getRequestUserAgent()
      });
    } catch (error) {
      console.error('Failed to log system access:', error);
      // Don't throw - audit logging should not break the application
      return null;
    }
  }

  /**
   * Log authentication event (login/logout)
   * 
   * @param userId - ID of the user
   * @param action - 'login' or 'logout'
   * @param success - Whether the authentication was successful
   * @param details - Optional additional details
   * @returns The created audit log entry
   */
  async logAuthEvent(userId: string, action: 'login' | 'logout', success: boolean, details?: any) {
    try {
      return await AuditLogRepository.create({
        userId,
        action,
        resource: 'auth',
        changes: {
          success,
          ...(details ? this.filterSensitiveData(details) : {})
        },
        ipAddress: this.getRequestIp(),
        userAgent: this.getRequestUserAgent()
      });
    } catch (error) {
      console.error(`Failed to log ${action} event:`, error);
      // Don't throw - audit logging should not break the application
      return null;
    }
  }

  /**
   * Get security audit report for a specific time period
   * 
   * @param days - Number of days to include in the report
   * @returns Security audit report data
   */
  async getSecurityAuditReport(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const [
        loginAttempts,
        securityChanges,
        userCreations,
        systemAccess
      ] = await Promise.all([
        AuditLogRepository.getLoginAttempts({ startDate }),
        AuditLogRepository.findAll({ 
          resource: 'security',
          startDate
        }),
        AuditLogRepository.findAll({
          resource: 'user',
          action: 'create',
          startDate
        }),
        AuditLogRepository.findAll({
          action: 'view',
          startDate
        })
      ]);
      
      return {
        period: {
          start: startDate,
          end: new Date()
        },
        summary: {
          loginAttempts: loginAttempts.length,
          securityChanges: securityChanges.length,
          userCreations: userCreations.length,
          systemAccess: systemAccess.length
        },
        details: {
          loginAttempts,
          securityChanges,
          userCreations,
          systemAccess
        }
      };
    } catch (error) {
      console.error('Failed to generate security audit report:', error);
      throw error;
    }
  }

  /**
   * Filter sensitive data from objects
   * 
   * @param data - Data to filter
   * @returns Filtered data with sensitive fields redacted
   */
  private filterSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = [
      'password', 'passwordHash', 'refreshToken', 'apiKey', 'secret',
      'token', 'accessToken', 'jwt', 'credential', 'pin', 'otp'
    ];
    
    const filtered = Array.isArray(data) ? [...data] : { ...data };
    
    for (const key in filtered) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        filtered[key] = '[REDACTED]';
      } else if (typeof filtered[key] === 'object') {
        filtered[key] = this.filterSensitiveData(filtered[key]);
      }
    }
    
    return filtered;
  }

  /**
   * Get the IP address from the current request context
   * 
   * @returns IP address or undefined
   */
  private getRequestIp(): string | undefined {
    // In a real implementation, this would use a request context
    // For now, we'll return undefined
    return undefined;
  }

  /**
   * Get the user agent from the current request context
   * 
   * @returns User agent or undefined
   */
  private getRequestUserAgent(): string | undefined {
    // In a real implementation, this would use a request context
    // For now, we'll return undefined
    return undefined;
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();