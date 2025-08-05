#!/usr/bin/env node

/**
 * Unified Integration Test Runner
 * 
 * Simple script to run all integration tests for the unified campaign system.
 * This is the main entry point for testing the simplified system.
 */

import { runMasterIntegrationTests } from './tests/integration/master-integration-test.js';

console.log('🎯 ONEKEEL SWARM - UNIFIED CAMPAIGN INTEGRATION TESTS');
console.log('📋 Testing unified agent system with simplified campaign execution');
console.log('🔍 Verifying: multi-channel messaging, handover triggers, AI features, performance');
console.log();

runMasterIntegrationTests()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 INTEGRATION TEST EXECUTION COMPLETE');
    console.log('='.repeat(60));
    
    if (result.status === 'success') {
      console.log('✅ ALL TESTS PASSED');
      console.log('🚀 System ready for deployment');
      console.log(`📈 Performance improvement: ${result.performanceGain}`);
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('🔧 Review test output above for specific issues');
    }
    
    console.log(`⏱️ Total execution time: ${result.totalDuration || 'N/A'}ms`);
    console.log(`🧪 Components tested: ${result.componentsTestedCount || 8}`);
    
    process.exit(result.status === 'success' ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error('🚨 Integration test execution failed');
    process.exit(1);
  });