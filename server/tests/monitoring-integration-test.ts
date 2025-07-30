import { ServiceManager } from '../services/service-manager';
import { serviceOrchestrator } from '../utils/service-orchestrator';
import { unifiedMonitor } from '../monitoring';
import { serviceMonitor } from '../utils/service-health/service-monitor';
import { logger } from '../utils/logger';

/**
 * Integration test to verify Service Integration Manager C3 works with existing monitoring infrastructure
 */
export class MonitoringIntegrationTest {
  private serviceManager: ServiceManager;

  constructor() {
    this.serviceManager = new ServiceManager();
  }

  async runIntegrationTests(): Promise<void> {
    logger.info('Starting Service Integration Manager monitoring integration tests');

    try {
      await this.testServiceManagerWithMonitoring();
      await this.testUnifiedMonitorIntegration();
      await this.testServiceOrchestratorIntegration();
      await this.testEndToEndIntegration();
      
      logger.info('✅ All monitoring integration tests passed successfully');
    } catch (error) {
      logger.error('❌ Monitoring integration tests failed', error);
      throw error;
    }
  }

  private async testServiceManagerWithMonitoring(): Promise<void> {
    logger.info('Testing ServiceManager integration with existing monitoring...');

    // Test that ServiceManager methods work alongside existing monitoring
    const [configResult, healthResult, metricsResult] = await Promise.allSettled([
      this.serviceManager.getAllServiceConfigs(),
      serviceMonitor.checkAllServices(),
      this.serviceManager.getServiceMetrics()
    ]);

    if (configResult.status === 'rejected') {
      throw new Error('ServiceManager config retrieval failed');
    }

    if (healthResult.status === 'rejected') {
      throw new Error('Existing service monitor health check failed');
    }

    if (metricsResult.status === 'rejected') {
      throw new Error('ServiceManager metrics collection failed');
    }

    // Verify that both systems can check the same services
    const monitoringServices = healthResult.value.services.map(s => s.name);
    const configuredServices = Object.keys(configResult.value);
    
    for (const service of ['mailgun', 'twilio', 'openrouter']) {
      if (!monitoringServices.includes(service)) {
        throw new Error(`Service ${service} not found in monitoring system`);
      }
      if (!configuredServices.includes(service)) {
        throw new Error(`Service ${service} not found in configuration system`);
      }
    }

    logger.info('✅ ServiceManager integrates correctly with existing monitoring');
  }

  private async testUnifiedMonitorIntegration(): Promise<void> {
    logger.info('Testing integration with UnifiedMonitor...');

    // Test that unified monitor can get comprehensive status including our services
    const systemStatus = await unifiedMonitor.getSystemStatus();
    
    if (!systemStatus.services) {
      throw new Error('UnifiedMonitor missing service status');
    }

    // Test that dashboard data includes service information
    const dashboardData = await unifiedMonitor.getDashboardData();
    
    if (!dashboardData.health) {
      throw new Error('UnifiedMonitor dashboard missing health data');
    }

    // Verify that our service management doesn't interfere with monitoring
    await this.serviceManager.updateServiceConfig('mailgun', { enabled: true });
    
    // Check that monitoring still works after configuration change
    const healthAfterUpdate = await serviceMonitor.checkService('mailgun');
    if (!healthAfterUpdate) {
      throw new Error('Service monitoring failed after configuration update');
    }

    logger.info('✅ UnifiedMonitor integration working correctly');
  }

  private async testServiceOrchestratorIntegration(): Promise<void> {
    logger.info('Testing ServiceOrchestrator integration with monitoring...');

    // Test that orchestrator methods work alongside monitoring
    const [statusSummary, testResults, monitoringStats] = await Promise.allSettled([
      serviceOrchestrator.getServiceStatusSummary(),
      serviceOrchestrator.testAllServices(),
      serviceMonitor.checkAllServices()
    ]);

    if (statusSummary.status === 'rejected') {
      throw new Error('ServiceOrchestrator status summary failed');
    }

    if (testResults.status === 'rejected') {
      throw new Error('ServiceOrchestrator test all services failed');
    }

    if (monitoringStats.status === 'rejected') {
      throw new Error('Service monitor failed during orchestrator test');
    }

    // Verify that orchestrator and monitoring see consistent service states
    const orchestratorServices = Object.keys(testResults.value);
    const monitoringServices = monitoringStats.value.services.map(s => s.name);

    for (const service of orchestratorServices) {
      if (!monitoringServices.includes(service)) {
        throw new Error(`Service ${service} found in orchestrator but not in monitoring`);
      }
    }

    logger.info('✅ ServiceOrchestrator integrates correctly with monitoring');
  }

  private async testEndToEndIntegration(): Promise<void> {
    logger.info('Testing end-to-end integration scenario...');

    // Simulate a complete service management workflow
    
    // 1. Get initial service status
    const initialStatus = await serviceMonitor.checkAllServices();
    const initialConfigs = await this.serviceManager.getAllServiceConfigs();

    // 2. Update a service configuration
    await this.serviceManager.updateServiceConfig('mailgun', { 
      enabled: true,
      description: 'Updated during integration test'
    });

    // 3. Test the service connection
    const connectionTest = await this.serviceManager.testServiceConnection('mailgun');
    if (!connectionTest) {
      throw new Error('Connection test failed after configuration update');
    }

    // 4. Verify monitoring still works
    const postUpdateStatus = await serviceMonitor.checkAllServices();
    if (!postUpdateStatus) {
      throw new Error('Monitoring failed after service configuration update');
    }

    // 5. Get metrics from both systems
    const [serviceMetrics, unifiedStatus] = await Promise.allSettled([
      this.serviceManager.getServiceMetrics(),
      unifiedMonitor.getSystemStatus()
    ]);

    if (serviceMetrics.status === 'rejected' || unifiedStatus.status === 'rejected') {
      throw new Error('Metrics collection failed in end-to-end test');
    }

    // 6. Verify orchestrator can manage the updated service
    const statusSummary = await serviceOrchestrator.getServiceStatusSummary();
    if (!statusSummary.services.mailgun) {
      throw new Error('ServiceOrchestrator missing updated service');
    }

    logger.info('✅ End-to-end integration test completed successfully');
  }
}

// Function to run monitoring integration tests
export async function runMonitoringIntegrationTests(): Promise<boolean> {
  try {
    const tester = new MonitoringIntegrationTest();
    await tester.runIntegrationTests();
    console.log('🎉 All monitoring integration tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Monitoring integration tests failed:', error);
    return false;
  }
}

// Export for use in other test suites
export default MonitoringIntegrationTest;

// Run tests if this file is executed directly
if (require.main === module) {
  runMonitoringIntegrationTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}