#!/usr/bin/env node
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5001/api';

async function testAPI(name: string, endpoint: string, options: any = {}) {
  try {
    console.log(`\nTesting ${name}...`);
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS (${response.status})`);
      console.log(`   Response:`, JSON.stringify(data).substring(0, 100) + '...');
    } else {
      console.log(`❌ ${name}: FAILED (${response.status})`);
      console.log(`   Error:`, data.error || data);
    }
    
    return { success: response.ok, data };
  } catch (error) {
    console.log(`❌ ${name}: ERROR`);
    console.log(`   Error:`, error.message);
    return { success: false, error };
  }
}

async function runTests() {
  console.log('🧪 Testing API Endpoints...\n');

  // Test Feature Flags API
  await testAPI('Feature Flags - Evaluate', '/feature-flags/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      flagKey: 'ui.contacts-terminology',
      context: { environment: 'development' }
    })
  });

  await testAPI('Feature Flags - All', '/feature-flags/all', {
    method: 'POST', 
    body: JSON.stringify({
      context: { environment: 'development' }
    })
  });

  await testAPI('Feature Flags - Check', '/feature-flags/check/ui.agent-templates');

  // Test Agents API
  await testAPI('Agents - List', '/agents');
  await testAPI('Agents - Get by ID', '/agents/agent-1');

  // Test Campaigns API  
  await testAPI('Campaigns - List', '/campaigns');
  await testAPI('Campaigns - Metrics', '/campaigns/metrics');

  // Test Monitoring API
  await testAPI('Monitoring - Health', '/monitoring/health');
  await testAPI('Monitoring - Status', '/monitoring/status');
  await testAPI('Monitoring - Performance', '/monitoring/performance');
  await testAPI('Monitoring - Dashboard', '/monitoring/dashboard');

  console.log('\n✨ API Testing Complete!\n');
}

// Check if server is running first
fetch(`${API_BASE}/health`)
  .then(() => runTests())
  .catch(() => {
    console.error('❌ Server is not running on port 5001!');
    console.error('   Please start the server first with: npm run dev');
    process.exit(1);
  });