import { ServiceManager } from '../services/service-manager';
import { ServiceOrchestrator } from '../utils/service-orchestrator';

// Simple unit tests for Service Integration Manager components
async function testServiceManagerClass(): Promise<void> {
  console.log('Testing ServiceManager class instantiation...');
  
  const serviceManager = new ServiceManager();
  
  // Test that the class can be instantiated
  if (!serviceManager) {
    throw new Error('ServiceManager failed to instantiate');
  }
  
  // Test that required methods exist
  const requiredMethods = [
    'getAllServiceConfigs',
    'updateServiceConfig', 
    'testServiceConnection',
    'getServiceHealth',
    'getServiceMetrics',
    'getServiceMetricsForService'
  ];
  
  for (const method of requiredMethods) {
    if (typeof serviceManager[method] !== 'function') {
      throw new Error(`ServiceManager missing required method: ${method}`);
    }
  }
  
  console.log('✅ ServiceManager class tests passed');
}

async function testServiceOrchestratorClass(): Promise<void> {
  console.log('Testing ServiceOrchestrator class instantiation...');
  
  const orchestrator = new ServiceOrchestrator();
  
  // Test that the class can be instantiated
  if (!orchestrator) {
    throw new Error('ServiceOrchestrator failed to instantiate');
  }
  
  // Test that required methods exist
  const requiredMethods = [
    'validateServiceConfig',
    'enableService',
    'disableService',
    'testAllServices',
    'getServiceStatusSummary',
    'resetServiceConfiguration'
  ];
  
  for (const method of requiredMethods) {
    if (typeof orchestrator[method] !== 'function') {
      throw new Error(`ServiceOrchestrator missing required method: ${method}`);
    }
  }
  
  console.log('✅ ServiceOrchestrator class tests passed');
}

async function testServiceValidation(): Promise<void> {
  console.log('Testing service configuration validation...');
  
  const orchestrator = new ServiceOrchestrator();
  
  // Test valid Mailgun configuration
  const mailgunResult = await orchestrator.validateServiceConfig('mailgun', {
    apiKey: 'key-1234567890abcdef',
    domain: 'test.example.com'
  });
  
  if (!mailgunResult || typeof mailgunResult.valid !== 'boolean') {
    throw new Error('Mailgun validation failed');
  }
  
  // Test valid Twilio configuration
  const twilioResult = await orchestrator.validateServiceConfig('twilio', {
    accountSid: 'AC1234567890abcdef',
    authToken: 'test-token',
    phoneNumber: '+15551234567'
  });
  
  if (!twilioResult || typeof twilioResult.valid !== 'boolean') {
    throw new Error('Twilio validation failed');
  }
  
  // Test valid OpenRouter configuration
  const openrouterResult = await orchestrator.validateServiceConfig('openrouter', {
    apiKey: 'sk-or-1234567890abcdef',
    baseUrl: 'https://openrouter.ai/api/v1'
  });
  
  if (!openrouterResult || typeof openrouterResult.valid !== 'boolean') {
    throw new Error('OpenRouter validation failed');
  }
  
  console.log('✅ Service validation tests passed');
}

async function runUnitTests(): Promise<void> {
  try {
    console.log('🚀 Starting Service Integration Manager unit tests\n');
    
    await testServiceManagerClass();
    await testServiceOrchestratorClass();
    await testServiceValidation();
    
    console.log('\n🎉 All unit tests passed successfully!');
    
  } catch (error) {
    console.error('\n❌ Unit tests failed:', error);
    process.exit(1);
  }
}

// Run the tests
runUnitTests();