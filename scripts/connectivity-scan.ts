#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function runConnectivityScan() {
  console.log('🔍 Starting comprehensive connectivity scan...\n');
  
  const results: string[] = [];
  let successCount = 0;
  let totalChecks = 0;

  // Helper function to track results
  const addResult = (success: boolean, message: string) => {
    totalChecks++;
    if (success) {
      successCount++;
      results.push(`✅ ${message}`);
    } else {
      results.push(`❌ ${message}`);
    }
  };

  // 1. Database Connection Test
  console.log('🔌 Testing database connection...');
  try {
    await db.execute(sql`SELECT 1 as test`);
    addResult(true, 'Database connection: WORKING');
  } catch (error) {
    addResult(false, `Database connection: FAILED - ${error.message}`);
  }

  // 2. Core Agent Import Test
  console.log('🤖 Testing agent imports...');
  try {
    const { UnifiedCampaignAgent } = await import('../server/agents/unified-campaign-agent');
    const agent = new UnifiedCampaignAgent();
    addResult(true, 'UnifiedCampaignAgent: INSTANTIATES');
  } catch (error) {
    addResult(false, `UnifiedCampaignAgent: FAILED - ${error.message}`);
  }

  // 3. Service Imports Test
  console.log('🔧 Testing service imports...');
  try {
    const { HandoverService } = await import('../server/services/handover-service');
    addResult(true, 'HandoverService: IMPORTS');
  } catch (error) {
    addResult(false, `HandoverService: FAILED - ${error.message}`);
  }

  try {
    const { SimpleCampaignExecutor } = await import('../server/services/simple-campaign-executor');
    addResult(true, 'SimpleCampaignExecutor: IMPORTS');
  } catch (error) {
    addResult(false, `SimpleCampaignExecutor: FAILED - ${error.message}`);
  }

  // 4. Database Schema Test
  console.log('📊 Testing database schema...');
  try {
    const tables = ['users', 'campaigns', 'leads', 'conversations'];
    for (const table of tables) {
      await db.execute(sql.raw(`SELECT 1 FROM ${table} LIMIT 1`));
    }
    addResult(true, 'Database schema: ALL TABLES ACCESSIBLE');
  } catch (error) {
    addResult(false, `Database schema: FAILED - ${error.message}`);
  }

  // 5. Route Imports Test
  console.log('🛣️ Testing route imports...');
  try {
    await import('../server/routes/campaigns');
    await import('../server/routes/leads');
    await import('../server/routes/auth');
    addResult(true, 'Route imports: WORKING');
  } catch (error) {
    addResult(false, `Route imports: FAILED - ${error.message}`);
  }

  // 6. Middleware Imports Test
  console.log('🛡️ Testing middleware imports...');
  try {
    await import('../server/middleware/auth');
    await import('../server/middleware/simple-auth');
    addResult(true, 'Middleware imports: WORKING');
  } catch (error) {
    addResult(false, `Middleware imports: FAILED - ${error.message}`);
  }

  // 7. Email Service Test
  console.log('📧 Testing email service imports...');
  try {
    await import('../server/services/email-monitor');
    await import('../server/services/email-watchdog');
    addResult(true, 'Email services: IMPORTS');
  } catch (error) {
    addResult(false, `Email services: FAILED - ${error.message}`);
  }

  // 8. Utility Imports Test
  console.log('🔧 Testing utility imports...');
  try {
    await import('../server/utils/logger');
    await import('../server/utils/error-handler');
    addResult(true, 'Utility imports: WORKING');
  } catch (error) {
    addResult(false, `Utility imports: FAILED - ${error.message}`);
  }

  // Results Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 CONNECTIVITY SCAN RESULTS');
  console.log('='.repeat(50));
  
  results.forEach(result => console.log(result));
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 SUMMARY: ${successCount}/${totalChecks} connections working`);
  
  const healthPercentage = Math.round((successCount / totalChecks) * 100);
  console.log(`🏥 System Health: ${healthPercentage}%`);
  
  if (healthPercentage >= 90) {
    console.log('🟢 Status: EXCELLENT - System is fully operational');
  } else if (healthPercentage >= 75) {
    console.log('🟡 Status: GOOD - Minor issues detected');
  } else if (healthPercentage >= 50) {
    console.log('🟠 Status: WARNING - Multiple issues need attention');
  } else {
    console.log('🔴 Status: CRITICAL - Major connectivity issues');
  }
  
  console.log('='.repeat(50));
  
  return { successCount, totalChecks, healthPercentage };
}

// Run the scan
runConnectivityScan()
  .then(({ healthPercentage }) => {
    process.exit(healthPercentage >= 75 ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Connectivity scan failed:', error);
    process.exit(1);
  });

export { runConnectivityScan };
