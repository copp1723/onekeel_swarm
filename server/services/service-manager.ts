import { 
  mailgunHealthChecker, 
  twilioHealthChecker, 
  openRouterHealthChecker 
} from '../utils/service-health';
import { appConfig } from '../../shared/config/app-config';
import { logger } from '../utils/logger';

// Service configuration types
export interface ServiceConfig {
  apiKey?: string;
  domain?: string;
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  enabled: boolean;
  lastUpdated: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime?: number;
  error?: string;
  details?: any;
}

export interface ServiceMetrics {
  uptime: number;
  responseTime: number;
  successRate: number;
  totalRequests: number;
  errorCount: number;
  lastChecked: string;
}

export class ServiceManager {
  private serviceConfigs: Record<string, ServiceConfig> = {};

  constructor() {
    this.initializeServiceConfigs();
  }

  private initializeServiceConfigs(): void {
    // Initialize service configurations from environment variables
    this.serviceConfigs = {
      mailgun: {
        apiKey: appConfig.external.mailgun.apiKey,
        domain: appConfig.external.mailgun.domain,
        enabled: !!appConfig.external.mailgun.apiKey && !!appConfig.external.mailgun.domain,
        lastUpdated: new Date().toISOString()
      },
      twilio: {
        accountSid: appConfig.external.twilio.accountSid,
        authToken: appConfig.external.twilio.authToken,
        phoneNumber: appConfig.external.twilio.phoneNumber,
        enabled: !!appConfig.external.twilio.accountSid && !!appConfig.external.twilio.authToken,
        lastUpdated: new Date().toISOString()
      },
      openrouter: {
        apiKey: appConfig.external.openai.apiKey,
        enabled: !!appConfig.external.openai.apiKey,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  // Get all service configurations
  async getAllServiceConfigs(): Promise<Record<string, ServiceConfig>> {
    return { ...this.serviceConfigs };
  }

  // Update service configuration
  async updateServiceConfig(service: string, configData: Partial<ServiceConfig>): Promise<ServiceConfig> {
    if (!this.serviceConfigs[service]) {
      throw new Error(`Service ${service} not found`);
    }

    // Update the configuration
    this.serviceConfigs[service] = {
      ...this.serviceConfigs[service],
      ...configData,
      lastUpdated: new Date().toISOString()
    };

    // Update appConfig as well to maintain consistency
    switch (service) {
      case 'mailgun':
        if (configData.apiKey) appConfig.external.mailgun.apiKey = configData.apiKey;
        if (configData.domain) appConfig.external.mailgun.domain = configData.domain;
        break;
      case 'twilio':
        if (configData.accountSid) appConfig.external.twilio.accountSid = configData.accountSid;
        if (configData.authToken) appConfig.external.twilio.authToken = configData.authToken;
        if (configData.phoneNumber) appConfig.external.twilio.phoneNumber = configData.phoneNumber;
        break;
      case 'openrouter':
        if (configData.apiKey) appConfig.external.openai.apiKey = configData.apiKey;
        break;
    }

    return { ...this.serviceConfigs[service] };
  }

  // Test Mailgun connection
  async testMailgunConnection(): Promise<ServiceHealth> {
    try {
      const healthStatus = await mailgunHealthChecker.checkHealth();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!healthStatus.configured) {
        status = 'degraded';
      } else if (!healthStatus.connected) {
        status = 'unhealthy';
      }
      
      return {
        status,
        timestamp: new Date().toISOString(),
        responseTime: healthStatus.responseTime,
        error: healthStatus.error,
        details: healthStatus.details
      };
    } catch (error) {
      logger.error('Mailgun health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test Twilio connection
  async testTwilioConnection(): Promise<ServiceHealth> {
    try {
      const healthStatus = await twilioHealthChecker.checkHealth();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!healthStatus.configured) {
        status = 'degraded';
      } else if (!healthStatus.connected) {
        status = 'unhealthy';
      }
      
      return {
        status,
        timestamp: new Date().toISOString(),
        responseTime: healthStatus.responseTime,
        error: healthStatus.error,
        details: healthStatus.details
      };
    } catch (error) {
      logger.error('Twilio health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test OpenRouter connection
  async testOpenrouterConnection(): Promise<ServiceHealth> {
    try {
      const healthStatus = await openRouterHealthChecker.checkHealth();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!healthStatus.configured) {
        status = 'degraded';
      } else if (!healthStatus.connected) {
        status = 'unhealthy';
      }
      
      return {
        status,
        timestamp: new Date().toISOString(),
        responseTime: healthStatus.responseTime,
        error: healthStatus.error,
        details: healthStatus.details
      };
    } catch (error) {
      logger.error('OpenRouter health check failed', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Test service connection by name
  async testServiceConnection(service: string): Promise<ServiceHealth> {
    switch (service) {
      case 'mailgun':
        return await this.testMailgunConnection();
      case 'twilio':
        return await this.testTwilioConnection();
      case 'openrouter':
        return await this.testOpenrouterConnection();
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  // Get service health status
  async getServiceHealth(service: string): Promise<ServiceHealth> {
    return await this.testServiceConnection(service);
  }

  // Get service metrics
  async getServiceMetrics(): Promise<Record<string, ServiceMetrics>> {
    // In a real implementation, this would collect actual metrics from each service
    // For now, we'll return mock data with reasonable defaults
    const metrics: Record<string, ServiceMetrics> = {};
    
    const services = Object.keys(this.serviceConfigs);
    for (const service of services) {
      // Mock metrics data - in a real implementation, this would come from actual monitoring
      metrics[service] = {
        uptime: Math.random() * 100, // Percentage
        responseTime: Math.floor(Math.random() * 200) + 50, // ms
        successRate: Math.random() * 20 + 80, // Percentage
        totalRequests: Math.floor(Math.random() * 10000) + 1000,
        errorCount: Math.floor(Math.random() * 100),
        lastChecked: new Date().toISOString()
      };
    }
    
    return metrics;
  }
// Get service metrics for a specific service
  async getServiceMetricsForService(service: string): Promise<ServiceMetrics | null> {
    // In a real implementation, this would collect actual metrics from the specific service
    // For now, we'll return mock data with reasonable defaults
    if (!this.serviceConfigs[service]) {
      return null;
    }
    
    return {
      uptime: Math.random() * 100, // Percentage
      responseTime: Math.floor(Math.random() * 200) + 50, // ms
      successRate: Math.random() * 20 + 80, // Percentage
      totalRequests: Math.floor(Math.random() * 10000) + 1000,
      errorCount: Math.floor(Math.random() * 100),
      lastChecked: new Date().toISOString()
    };
  }
}