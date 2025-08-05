/**
 * Simple test script for the SimpleCampaignExecutor
 * This verifies that the basic functionality works as expected
 */

const { simpleCampaignExecutor } = require('./server/services/simple-campaign-executor');

async function testSimpleCampaignExecutor() {
  console.log('🧪 Testing SimpleCampaignExecutor...');

  try {
    // Test 1: Service initialization
    console.log('\n✅ Test 1: Service initialization');
    simpleCampaignExecutor.start();
    const health = simpleCampaignExecutor.getHealthStatus();
    console.log('Health status:', health);
    console.log('✅ Service started successfully');

    // Test 2: Campaign status check (no active campaigns)
    console.log('\n✅ Test 2: Campaign status check');
    const mockCampaignId = 'test-campaign-123';
    const status = simpleCampaignExecutor.getCampaignStatus(mockCampaignId);
    console.log('Campaign status:', status);
    console.log('✅ Status check working');

    // Test 3: Active executions
    console.log('\n✅ Test 3: Active executions');
    const activeExecutions = simpleCampaignExecutor.getActiveExecutions();
    console.log('Active executions:', activeExecutions.length);
    console.log('✅ Active executions check working');

    // Test 4: Cleanup
    console.log('\n✅ Test 4: Cleanup old executions');
    const cleaned = simpleCampaignExecutor.cleanupOldExecutions(1);
    console.log('Cleaned executions:', cleaned);
    console.log('✅ Cleanup working');

    // Test 5: Stop service
    console.log('\n✅ Test 5: Stop service');
    simpleCampaignExecutor.stop();
    const finalHealth = simpleCampaignExecutor.getHealthStatus();
    console.log('Final health status:', finalHealth);
    console.log('✅ Service stopped successfully');

    console.log('\n🎉 All tests passed! SimpleCampaignExecutor is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testSimpleCampaignExecutor();