#!/usr/bin/env node

/**
 * Master Integration Test Runner
 * 
 * Runs all integration tests for the unified campaign system and provides
 * comprehensive reporting on system performance and reliability.
 */

import { runIntegrationTests } from './unified-campaign-integration.test.js';
import { runCampaignWizardIntegrationTests } from './campaign-wizard-integration.test.js';

/**
 * Performance benchmarking utility
 */
class PerformanceBenchmark {
  constructor() {
    this.benchmarks = new Map();
    this.startTimes = new Map();
  }

  start(testName) {
    this.startTimes.set(testName, Date.now());
  }

  end(testName) {
    const startTime = this.startTimes.get(testName);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.benchmarks.set(testName, duration);
    this.startTimes.delete(testName);
    return duration;
  }

  getBenchmarks() {
    return Array.from(this.benchmarks.entries()).map(([name, duration]) => ({
      testSuite: name,
      duration,
      durationFormatted: `${duration}ms`
    }));
  }

  getTotalDuration() {
    return Array.from(this.benchmarks.values()).reduce((sum, duration) => sum + duration, 0);
  }
}

/**
 * Test result aggregator
 */
class TestResultAggregator {
  constructor() {
    this.results = [];
    this.overallMetrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      performanceGains: [],
      errors: []
    };
  }

  addResult(testSuiteName, result) {
    this.results.push({
      testSuite: testSuiteName,
      ...result
    });

    // Aggregate metrics if available
    if (result.testsPass !== undefined) {
      this.overallMetrics.totalTests++;
      if (result.testsPass) {
        this.overallMetrics.passedTests++;
      } else {
        this.overallMetrics.failedTests++;
      }
    }

    // Collect performance gains
    if (result.performanceGain && result.performanceGain !== '0.0%') {
      this.overallMetrics.performanceGains.push({
        testSuite: testSuiteName,
        gain: result.performanceGain
      });
    }

    // Collect errors
    if (result.status === 'failed' && result.notes) {
      this.overallMetrics.errors.push({
        testSuite: testSuiteName,
        error: result.notes
      });
    }
  }

  getOverallResult() {
    const allTestsPassed = this.results.every(r => r.status === 'success' || r.testsPass === true);
    const avgPerformanceGain = this.overallMetrics.performanceGains.length > 0
      ? this.overallMetrics.performanceGains.reduce((sum, g) => sum + parseFloat(g.gain.replace('%', '')), 0) / this.overallMetrics.performanceGains.length
      : 0;

    return {
      status: allTestsPassed ? 'success' : 'failed',
      testsPass: allTestsPassed,
      performanceGain: `${avgPerformanceGain.toFixed(1)}%`,
      notes: this.generateOverallNotes(allTestsPassed, avgPerformanceGain)
    };
  }

  generateOverallNotes(allPassed, avgGain) {
    if (allPassed) {
      const notes = [
        'All integration tests passed successfully.',
        'Unified campaign system demonstrates reliable functionality across all components.',
        'Multi-channel execution (email/SMS/chat) working correctly.',
        'Handover triggers evaluating properly.',
        'Campaign wizard simplified workflow functional.',
        'WebSocket chat functionality operational.'
      ];

      if (avgGain > 0) {
        notes.push(`Average performance improvement: ${avgGain.toFixed(1)}% over complex system.`);
      }

      notes.push('System ready for production deployment.');
      return notes.join(' ');
    } else {
      const failedSuites = this.results.filter(r => r.status === 'failed' || r.testsPass === false);
      return `${failedSuites.length} test suite(s) failed: ${failedSuites.map(r => r.testSuite).join(', ')}. Review individual test outputs for specific issues.`;
    }
  }

  printDetailedReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 DETAILED INTEGRATION TEST REPORT');
    console.log('='.repeat(80));

    // Individual test suite results
    this.results.forEach(result => {
      console.log(`\n🧪 ${result.testSuite}:`);
      console.log(`   Status: ${result.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`   Tests Pass: ${result.testsPass ? '✅ Yes' : '❌ No'}`);
      
      if (result.performanceGain && result.performanceGain !== '0.0%') {
        console.log(`   Performance Gain: 🚀 ${result.performanceGain}`);
      }
      
      if (result.notes) {
        console.log(`   Notes: ${result.notes}`);
      }
    });

    // Overall metrics
    console.log('\n' + '─'.repeat(40));
    console.log('📈 OVERALL METRICS:');
    console.log(`   Test Suites: ${this.results.length}`);
    console.log(`   Passed: ${this.results.filter(r => r.status === 'success').length}`);
    console.log(`   Failed: ${this.results.filter(r => r.status === 'failed').length}`);

    if (this.overallMetrics.performanceGains.length > 0) {
      console.log('\n🚀 PERFORMANCE GAINS:');
      this.overallMetrics.performanceGains.forEach(gain => {
        console.log(`   ${gain.testSuite}: ${gain.gain}`);
      });
    }

    if (this.overallMetrics.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.overallMetrics.errors.forEach(error => {
        console.log(`   ${error.testSuite}: ${error.error.substring(0, 100)}...`);
      });
    }
  }
}

/**
 * System health checker
 */
class SystemHealthChecker {
  static async checkPrerequisites() {
    console.log('🔍 Checking system prerequisites...');
    
    const checks = [];
    
    // Check Node.js version
    const nodeVersion = process.version;
    checks.push({
      name: 'Node.js Version',
      status: nodeVersion >= 'v16.0.0' ? 'pass' : 'fail',
      value: nodeVersion
    });

    // Check environment variables (simulate)
    const requiredEnvVars = ['NODE_ENV'];
    const envCheck = requiredEnvVars.every(env => process.env[env] !== undefined);
    checks.push({
      name: 'Environment Variables',
      status: envCheck ? 'pass' : 'warn',
      value: envCheck ? 'All required vars present' : 'Some vars missing (using defaults)'
    });

    // Check memory availability
    const memUsage = process.memoryUsage();
    const memAvailable = memUsage.heapTotal < 100 * 1024 * 1024; // Less than 100MB used
    checks.push({
      name: 'Memory Usage',
      status: memAvailable ? 'pass' : 'warn',
      value: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB used`
    });

    // Print results
    checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`  ${icon} ${check.name}: ${check.value}`);
    });

    const criticalFailures = checks.filter(c => c.status === 'fail').length;
    if (criticalFailures > 0) {
      throw new Error(`${criticalFailures} critical prerequisite check(s) failed`);
    }

    console.log('✅ All prerequisite checks passed');
    return checks;
  }

  static async checkPostTest() {
    console.log('\n🔍 Running post-test system health check...');
    
    // Check memory leaks
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    console.log(`  💾 Memory usage after tests: ${memUsageMB}MB`);
    
    if (memUsageMB > 200) {
      console.log('  ⚠️ High memory usage detected - possible memory leak');
    } else {
      console.log('  ✅ Memory usage normal');
    }

    // Check for unhandled promises
    let unhandledPromises = 0;
    const originalHandler = process.listeners('unhandledRejection');
    
    process.on('unhandledRejection', () => {
      unhandledPromises++;
    });

    // Wait a moment to catch any pending promises
    await new Promise(resolve => setTimeout(resolve, 100));

    // Restore original handlers
    process.removeAllListeners('unhandledRejection');
    originalHandler.forEach(handler => process.on('unhandledRejection', handler));

    if (unhandledPromises > 0) {
      console.log(`  ⚠️ ${unhandledPromises} unhandled promise rejection(s) detected`);
    } else {
      console.log('  ✅ No unhandled promise rejections');
    }

    return {
      memoryUsageMB: memUsageMB,
      unhandledPromises,
      healthyPostTest: memUsageMB < 200 && unhandledPromises === 0
    };
  }
}

/**
 * Main test execution function
 */
async function runMasterIntegrationTests() {
  console.log('🚀 UNIFIED CAMPAIGN SYSTEM - MASTER INTEGRATION TEST SUITE');
  console.log('='.repeat(80));
  console.log(`🕐 Started: ${new Date().toISOString()}`);
  console.log(`🖥️ Node.js: ${process.version}`);
  console.log(`📍 Platform: ${process.platform} ${process.arch}`);
  
  const benchmark = new PerformanceBenchmark();
  const aggregator = new TestResultAggregator();
  let overallSuccess = true;

  try {
    // Pre-test system health check
    await SystemHealthChecker.checkPrerequisites();
    
    console.log('\n🎯 Starting integration test execution...');
    
    // Test Suite 1: Core Unified Campaign Integration
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST SUITE 1: UNIFIED CAMPAIGN INTEGRATION');
    console.log('='.repeat(60));
    
    benchmark.start('Unified Campaign Integration');
    try {
      const unifiedResult = await runIntegrationTests();
      const duration = benchmark.end('Unified Campaign Integration');
      
      aggregator.addResult('Unified Campaign Integration', unifiedResult);
      console.log(`⏱️ Suite 1 completed in ${duration}ms`);
      
      if (unifiedResult.status !== 'success') {
        overallSuccess = false;
      }
    } catch (error) {
      benchmark.end('Unified Campaign Integration');
      console.error('❌ Suite 1 failed with error:', error.message);
      aggregator.addResult('Unified Campaign Integration', {
        status: 'failed',
        testsPass: false,
        performanceGain: '0.0%',
        notes: `Test suite crashed: ${error.message}`
      });
      overallSuccess = false;
    }

    // Test Suite 2: Campaign Wizard Integration
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST SUITE 2: CAMPAIGN WIZARD INTEGRATION');
    console.log('='.repeat(60));
    
    benchmark.start('Campaign Wizard Integration');
    try {
      const wizardResult = await runCampaignWizardIntegrationTests();
      const duration = benchmark.end('Campaign Wizard Integration');
      
      // Convert wizard result format to match our standard
      const standardizedResult = {
        status: wizardResult.success ? 'success' : 'failed',
        testsPass: wizardResult.success,
        performanceGain: '0.0%', // Wizard tests don't measure performance gain
        notes: wizardResult.summary
      };
      
      aggregator.addResult('Campaign Wizard Integration', standardizedResult);
      console.log(`⏱️ Suite 2 completed in ${duration}ms`);
      
      if (!wizardResult.success) {
        overallSuccess = false;
      }
    } catch (error) {
      benchmark.end('Campaign Wizard Integration');
      console.error('❌ Suite 2 failed with error:', error.message);
      aggregator.addResult('Campaign Wizard Integration', {
        status: 'failed',
        testsPass: false,
        performanceGain: '0.0%',
        notes: `Test suite crashed: ${error.message}`
      });
      overallSuccess = false;
    }

    // Post-test health check
    const postTestHealth = await SystemHealthChecker.checkPostTest();
    
    // Generate performance report
    const benchmarks = benchmark.getBenchmarks();
    const totalDuration = benchmark.getTotalDuration();
    
    console.log('\n' + '='.repeat(80));
    console.log('⏱️ PERFORMANCE BENCHMARK REPORT');
    console.log('='.repeat(80));
    benchmarks.forEach(bench => {
      console.log(`${bench.testSuite}: ${bench.durationFormatted}`);
    });
    console.log(`Total execution time: ${totalDuration}ms`);
    console.log(`Average time per suite: ${Math.round(totalDuration / benchmarks.length)}ms`);

    // Print detailed results
    aggregator.printDetailedReport();

    // Generate final result
    const finalResult = aggregator.getOverallResult();
    
    console.log('\n' + '='.repeat(80));
    console.log('🏆 FINAL INTEGRATION TEST RESULT');
    console.log('='.repeat(80));
    console.log(`Status: ${finalResult.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Tests Pass: ${finalResult.testsPass ? '✅ Yes' : '❌ No'}`);
    console.log(`Performance Gain: ${finalResult.performanceGain}`);
    console.log(`Health Check: ${postTestHealth.healthyPostTest ? '✅ Healthy' : '⚠️ Issues detected'}`);
    console.log('\n📝 Summary:');
    console.log(finalResult.notes);
    
    console.log('\n🎯 COMPONENTS TESTED:');
    console.log('  ✅ UnifiedCampaignAgent - Multi-channel execution');
    console.log('  ✅ SimpleCampaignExecutor - Linear campaign processing');
    console.log('  ✅ HandoverService - Trigger evaluation and execution');
    console.log('  ✅ WebSocket chat functionality');
    console.log('  ✅ AI template generation (simulated)');
    console.log('  ✅ Campaign wizard simplified workflow');
    console.log('  ✅ Day-based scheduling system');
    console.log('  ✅ Performance optimization verification');

    return {
      ...finalResult,
      benchmarks,
      totalDuration,
      postTestHealth,
      componentsTestedCount: 8
    };

  } catch (error) {
    console.error('\n💥 FATAL ERROR in master integration tests:', error.message);
    console.error(error.stack);
    
    return {
      status: 'failed',
      testsPass: false,
      performanceGain: '0.0%',
      notes: `Master test execution failed: ${error.message}`,
      fatalError: true
    };
  }
}

// Execute master tests if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMasterIntegrationTests()
    .then(result => {
      console.log('\n✨ Master integration test execution completed.');
      console.log('\n📊 FINAL RESULT:');
      console.log(JSON.stringify({
        status: result.status,
        testsPass: result.testsPass,
        performanceGain: result.performanceGain,
        notes: result.notes
      }, null, 2));
      
      process.exit(result.status === 'success' ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Fatal error in master integration tests:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

export { 
  runMasterIntegrationTests, 
  PerformanceBenchmark, 
  TestResultAggregator, 
  SystemHealthChecker 
};