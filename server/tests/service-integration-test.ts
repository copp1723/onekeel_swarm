import { ServiceManager } from '../services/service-manager';
import { serviceOrchestrator } from '../utils/service-orchestrator';
import { logger } from '../utils/logger';

// Test script for Service Integration Manager C3
export class ServiceIntegrationTest {
  private serviceManager: ServiceManager;

  constructor() {
    this.serviceManager = new ServiceManager();
  }

  async runAllTests(): Promise<void> {
    logger.info('Starting Service Integration Manager tests');

    try {
      await this.testServiceConfiguration();
      await this.testConnectionTesting();
      await this.testHealthMonitoring();
      await this.testMetricsCollection();
      await this.testOrchestrationUtilities();
      
      logger.info('All Service Integration Manager tests completed successfully');
    } catch (error) {
      logger.error('Service Integration Manager tests failed', error);
      throw error;
    }
  }

  private async testServiceConfiguration(): Promise<void> {
    logger.info('Testing service configuration functionality');

    // Test getting all service configurations
    const configs = await this.serviceManager.getAllServiceConfigs();
    if (!configs || typeof configs !== 'object') {
      throw new Error('Failed to retrieve service configurations');
    }

    // Verify required services are present
    const requiredServices = ['mailgun', 'twilio', 'openrouter'];
    for (const service of requiredServices) {
      if (!configs[service]) {
        throw new Error(`Missing configuration for service: ${service}`);
      }
    }

    // Test updating a service configuration
    const originalConfig = { ...configs.mailgun };
    await this.serviceManager.updateServiceConfig('mailgun', { enabled: true });
    
    // Verify update worked
    const updatedConfigs = await this.serviceManager.getAllServiceConfigs();
    if (!updatedConfigs.mailgun.enabled) {
      throw new Error('Service configuration update failed');
    }

    logger.info('✅ Service configuration tests passed');
  }

  private async testConnectionTesting(): Promise<void> {
    logger.info('Testing connection testing functionality');

    const services = ['mailgun', 'twilio', 'openrouter'];
    
    for (const service of services) {
      const testResult = await this.serviceManager.testServiceConnection(service);
      
      if (!testResult || !testResult.status || !testResult.timestamp) {
        throw new Error(`Connection test failed for service: ${service}`);
      }

      if (!['healthy', 'degraded', 'unhealthy'].includes(testResult.status)) {
        throw new Error(`Invalid status returned for service: ${service}`);
      }
    }

    logger.info('✅ Connection testing tests passed');
  }

  private async testHealthMonitoring(): Promise<void> {
    logger.info('Testing health monitoring functionality');

    const services = ['mailgun', 'twilio', 'openrouter'];
    
    for (const service of services) {
      const healthStatus = await this.serviceManager.getServiceHealth(service);
      
      if (!healthStatus || !healthStatus.status || !healthStatus.timestamp) {
        throw new Error(`Health monitoring failed for service: ${service}`);
      }

      if (!['healthy', 'degraded', 'unhealthy'].includes(healthStatus.status)) {
        throw new Error(`Invalid health status returned for service: ${service}`);
      }
    }

    logger.info('✅ Health monitoring tests passed');
  }

  private async testMetricsCollection(): Promise<void> {
    logger.info('Testing metrics collection functionality');

    // Test getting all service metrics
    const allMetrics = await this.serviceManager.getServiceMetrics();
    if (!allMetrics || typeof allMetrics !== 'object') {
      throw new Error('Failed to retrieve service metrics');
    }

    // Verify metrics structure
    for (const [serviceName, metrics] of Object.entries(allMetrics)) {
      if (!metrics.uptime || !metrics.responseTime || !metrics.successRate || 
          !metrics.totalRequests || metrics.errorCount === undefined || !metrics.lastChecked) {
        throw new Error(`Invalid metrics structure for service: ${serviceName}`);
      }
    }

    // Test getting metrics for a specific service
    const specificMetrics = await this.serviceManager.getServiceMetricsForService('mailgun');
    if (!specificMetrics) {
      throw new Error('Failed to retrieve specific service metrics');
    }

    logger.info('✅ Metrics collection tests passed');
  }

  private async testOrchestrationUtilities(): Promise<void> {
    logger.info('Testing orchestration utilities functionality');

    // Test service validation
    const validationResult = await serviceOrchestrator.validateServiceConfig('mailgun', {
      apiKey: 'test-key-1234567890',
      domain: 'test.example.com'
    });

    if (!validationResult || typeof validationResult.valid !== 'boolean') {
      throw new Error('Service validation failed');
    }

    // Test all services testing
    const allServicesResult = await serviceOrchestrator.testAllServices();
    if (!allServicesResult || typeof allServicesResult !== 'object') {
      throw new Error('Test all services failed');
    }

    // Test service status summary
    const statusSummary = await serviceOrchestrator.getServiceStatusSummary();
    if (!statusSummary || !statusSummary.timestamp || !statusSummary.services) {
      throw new Error('Service status summary failed');
    }

    logger.info('✅ Orchestration utilities tests passed');
  }
}

// Function to run tests
export async function runServiceIntegrationTests(): Promise<boolean> {
  try {
    const tester = new ServiceIntegrationTest();
    await tester.runAllTests();
    logger.info('🎉 All Service Integration Manager tests passed!');
    return true;
  } catch (error) {
    logger.error('❌ Service Integration Manager tests failed:', error);
    return false;
  }
}

// Export for use in other test suites
export default ServiceIntegrationTest;