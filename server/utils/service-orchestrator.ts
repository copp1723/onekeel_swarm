import { ServiceManager } from '../services/service-manager';
import { logger } from '../utils/logger';

// Service orchestration utilities for managing service integrations

export class ServiceOrchestrator {
  private serviceManager: ServiceManager;

  constructor() {
    this.serviceManager = new ServiceManager();
  }

  // Validate service configuration
  async validateServiceConfig(service: string, config: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    switch (service) {
      case 'mailgun':
        if (!config.apiKey || config.apiKey.length < 10) {
          errors.push('Mailgun API key is required and must be at least 10 characters');
        }
        if (!config.domain || !config.domain.includes('.')) {
          errors.push('Mailgun domain is required and must be a valid domain');
        }
        break;
        
      case 'twilio':
        if (!config.accountSid || !config.accountSid.startsWith('AC')) {
          errors.push('Twilio Account SID is required and must start with "AC"');
        }
        if (!config.authToken || config.authToken.length < 10) {
          errors.push('Twilio Auth Token is required and must be at least 10 characters');
        }
        if (config.phoneNumber && !config.phoneNumber.startsWith('+')) {
          errors.push('Twilio phone number must start with "+"');
        }
        break;
        
      case 'openrouter':
        if (!config.apiKey || config.apiKey.length < 10) {
          errors.push('OpenRouter API key is required and must be at least 10 characters');
        }
        break;
        
      default:
        errors.push(`Unknown service: ${service}`);
    }
    
    return { valid: errors.length === 0, errors };
  }

  // Test all services and return a comprehensive health report
  async testAllServices(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    try {
      results.mailgun = await this.serviceManager.testMailgunConnection();
    } catch (error) {
      results.mailgun = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    try {
      results.twilio = await this.serviceManager.testTwilioConnection();
    } catch (error) {
      results.twilio = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    try {
      results.openrouter = await this.serviceManager.testOpenrouterConnection();
    } catch (error) {
      results.openrouter = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    return results;
  }

  // Enable a service
  async enableService(service: string): Promise<boolean> {
    try {
      const configs = await this.serviceManager.getAllServiceConfigs();
      if (!configs[service]) {
        throw new Error(`Service ${service} not found`);
      }
      
      // Update the service configuration to enable it
      await this.serviceManager.updateServiceConfig(service, { enabled: true });
      
      logger.info(`Service ${service} enabled successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to enable service ${service}`, error);
      return false;
    }
  }

  // Disable a service
  async disableService(service: string): Promise<boolean> {
    try {
      const configs = await this.serviceManager.getAllServiceConfigs();
      if (!configs[service]) {
        throw new Error(`Service ${service} not found`);
      }
      
      // Update the service configuration to disable it
      await this.serviceManager.updateServiceConfig(service, { enabled: false });
      
      logger.info(`Service ${service} disabled successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to disable service ${service}`, error);
      return false;
    }
  }

  // Get service status summary
  async getServiceStatusSummary(): Promise<any> {
    const configs = await this.serviceManager.getAllServiceConfigs();
    const healthStatuses = await this.testAllServices();
    
    const summary: any = {
      timestamp: new Date().toISOString(),
      services: {}
    };
    
    for (const [serviceName, config] of Object.entries(configs)) {
      summary.services[serviceName] = {
        configured: config.enabled,
        health: healthStatuses[serviceName]?.status || 'unknown',
        lastChecked: healthStatuses[serviceName]?.timestamp || null
      };
    }
    
    // Calculate overall status
    const healthValues = Object.values(healthStatuses);
    const unhealthyCount = healthValues.filter(h => h.status === 'unhealthy').length;
    const degradedCount = healthValues.filter(h => h.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      summary.overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      summary.overallStatus = 'degraded';
    } else {
      summary.overallStatus = 'healthy';
    }
    
    return summary;
  }

  // Reset service configuration to defaults
  async resetServiceConfig(service: string): Promise<boolean> {
    try {
      // Reset to environment variable values
      const resetConfig: any = {};
      
      switch (service) {
        case 'mailgun':
          resetConfig.apiKey = process.env.MAILGUN_API_KEY || '';
          resetConfig.domain = process.env.MAILGUN_DOMAIN || '';
          resetConfig.enabled = !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
          break;
          
        case 'twilio':
          resetConfig.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
          resetConfig.authToken = process.env.TWILIO_AUTH_TOKEN || '';
          resetConfig.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
          resetConfig.enabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
          break;
          
        case 'openrouter':
          resetConfig.apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
          resetConfig.enabled = !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
          break;
          
        default:
          throw new Error(`Unknown service: ${service}`);
      }
      
      await this.serviceManager.updateServiceConfig(service, resetConfig);
      logger.info(`Service ${service} configuration reset to defaults`);
      return true;
    } catch (error) {
      logger.error(`Failed to reset service ${service} configuration`, error);
      return false;
    }
  }
}

// Export singleton instance
export const serviceOrchestrator = new ServiceOrchestrator();