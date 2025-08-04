#!/usr/bin/env tsx

/**
 * Test script to verify the System Health Dashboard integration
 * Tests the monitoring API endpoints that the dashboard uses
 */

import { logger } from '../server/utils/logger';

async function testHealthDashboard() {
  console.log('🔍 Testing System Health Dashboard Integration...\n');

  const baseUrl = 'http://localhost:3000';
  const endpoints = [
    '/api/monitoring/health/detailed',
    '/api/monitoring/performance',
    '/api/monitoring/business',
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing ${endpoint}...`);

      const response = await fetch(`${baseUrl}${endpoint}`);

      if (!response.ok) {
        console.log(
          `❌ ${endpoint}: HTTP ${response.status} ${response.statusText}`
        );
        allPassed = false;
        continue;
      }

      const data = await response.json();

      if (!data.success) {
        console.log(`❌ ${endpoint}: API returned success: false`);
        console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
        allPassed = false;
        continue;
      }

      // Validate data structure based on endpoint
      if (endpoint.includes('health/detailed')) {
        const required = ['overall', 'database', 'redis', 'schema', 'services'];
        const missing = required.filter(key => !data.data[key]);
        if (missing.length > 0) {
          console.log(
            `❌ ${endpoint}: Missing required fields: ${missing.join(', ')}`
          );
          allPassed = false;
          continue;
        }

        // Check services structure
        const serviceKeys = ['mailgun', 'twilio', 'openrouter'];
        const missingServices = serviceKeys.filter(
          key => !data.data.services[key]
        );
        if (missingServices.length > 0) {
          console.log(
            `❌ ${endpoint}: Missing services: ${missingServices.join(', ')}`
          );
          allPassed = false;
          continue;
        }
      }

      if (endpoint.includes('performance')) {
        const required = [
          'cpu',
          'memory',
          'uptime',
          'responseTime',
          'database',
        ];
        const missing = required.filter(key => !data.data.hasOwnProperty(key));
        if (missing.length > 0) {
          console.log(
            `❌ ${endpoint}: Missing performance fields: ${missing.join(', ')}`
          );
          allPassed = false;
          continue;
        }
      }

      if (endpoint.includes('business')) {
        const required = [
          'leadsProcessed',
          'emailsSent',
          'smsMessages',
          'campaignsActive',
        ];
        const missing = required.filter(key => !data.data.hasOwnProperty(key));
        if (missing.length > 0) {
          console.log(
            `❌ ${endpoint}: Missing business fields: ${missing.join(', ')}`
          );
          allPassed = false;
          continue;
        }
      }

      console.log(`✅ ${endpoint}: OK`);
    } catch (error) {
      console.log(
        `❌ ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      allPassed = false;
    }
  }

  console.log('\n📊 Test Results:');
  if (allPassed) {
    console.log('✅ All health dashboard endpoints are working correctly!');
    console.log('🎉 SystemHealthView should display data properly');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Login as admin user');
    console.log('   3. Navigate to Settings > System Health');
    console.log('   4. Verify all tabs show data correctly');
  } else {
    console.log(
      '❌ Some endpoints failed - SystemHealthView may not display correctly'
    );
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure the server is running: npm run dev');
    console.log('   2. Check server logs for errors');
    console.log(
      '   3. Verify monitoring infrastructure is properly initialized'
    );
  }

  return allPassed;
}

// Run the test
if (require.main === module) {
  testHealthDashboard()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testHealthDashboard };
