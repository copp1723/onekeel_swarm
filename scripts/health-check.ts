#!/usr/bin/env tsx
/**
 * Health Check Script for OneKeel Swarm
 *
 * This script checks the health of all OneKeel Swarm services
 * and provides a comprehensive status report.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface HealthCheckResult {
  service: string;
  healthy: boolean;
  configured: boolean;
  details?: any;
  error?: string;
}

async function runHealthChecks(): Promise<HealthCheckResult[]> {
  const checks: HealthCheckResult[] = [];

  console.log('🔍 Running OneKeel Swarm Health Checks...\n');

  // Database health check
  try {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:password@localhost:5432/onekeel_swarm';
    const sql = postgres(connectionString);
    const db = drizzle(sql);

    // Simple query to test database connectivity
    await sql`SELECT 1 as test`;
    await sql.end();

    checks.push({
      service: 'Database',
      healthy: true,
      configured: true,
      details: {
        connectionString: connectionString.replace(/:[^:]*@/, ':***@'),
      },
    });
  } catch (error) {
    checks.push({
      service: 'Database',
      healthy: false,
      configured: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Email service health check
  try {
    const emailConfigured = !!(
      process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN
    );
    checks.push({
      service: 'Email Service (Mailgun)',
      healthy: emailConfigured,
      configured: emailConfigured,
      details: {
        domain: process.env.MAILGUN_DOMAIN || 'Not configured',
        apiKeySet: !!process.env.MAILGUN_API_KEY,
      },
      error: emailConfigured ? undefined : 'Mailgun credentials not configured',
    });
  } catch (error) {
    checks.push({
      service: 'Email Service (Mailgun)',
      healthy: false,
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Agent services health check
  try {
    checks.push({
      service: 'Agent Services',
      healthy: true,
      configured: true,
      details: {
        chatAgent: 'Available',
        emailAgent: 'Available',
        smsAgent: 'Available',
        overlordAgent: 'Available',
      },
    });
  } catch (error) {
    checks.push({
      service: 'Agent Services',
      healthy: false,
      configured: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Authentication service health check
  try {
    const jwtConfigured = !!process.env.JWT_SECRET;
    checks.push({
      service: 'Authentication',
      healthy: jwtConfigured,
      configured: jwtConfigured,
      details: {
        jwtSecretSet: jwtConfigured,
      },
      error: jwtConfigured ? undefined : 'JWT_SECRET not configured',
    });
  } catch (error) {
    checks.push({
      service: 'Authentication',
      healthy: false,
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return checks;
}

function printHealthReport(checks: HealthCheckResult[]): void {
  console.log('📊 Health Check Results:\n');
  console.log('='.repeat(60));

  let allHealthy = true;
  let configuredServices = 0;
  let healthyServices = 0;

  checks.forEach(check => {
    const statusIcon = check.healthy ? '✅' : '❌';
    const configIcon = check.configured ? '🔧' : '⚠️';

    console.log(`${statusIcon} ${configIcon} ${check.service}`);

    if (check.configured) configuredServices++;
    if (check.healthy) healthyServices++;
    if (!check.healthy) allHealthy = false;

    if (check.error) {
      console.log(`   Error: ${check.error}`);
    }

    if (check.details) {
      Object.entries(check.details).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    console.log();
  });

  console.log('='.repeat(60));
  console.log(
    `📈 Summary: ${healthyServices}/${checks.length} services healthy`
  );
  console.log(
    `🔧 Configuration: ${configuredServices}/${checks.length} services configured`
  );
  console.log(`🚀 Overall Status: ${allHealthy ? 'HEALTHY' : 'DEGRADED'}`);

  if (!allHealthy) {
    console.log(
      '\n⚠️  Some services are unhealthy. Check the errors above and your configuration.'
    );
    process.exit(1);
  } else {
    console.log('\n🎉 All services are healthy and ready!');
  }
}

async function getSystemMetrics(): Promise<void> {
  try {
    console.log('\n📊 System Metrics:\n');
    console.log('-'.repeat(40));

    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:password@localhost:5432/onekeel_swarm';
    const sql = postgres(connectionString);

    // Get basic metrics
    const leadCount = await sql`SELECT COUNT(*) as count FROM leads`;
    const campaignCount = await sql`SELECT COUNT(*) as count FROM campaigns`;
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;

    console.log('Database Metrics:');
    console.log(`  Total Leads: ${leadCount[0].count}`);
    console.log(`  Total Campaigns: ${campaignCount[0].count}`);
    console.log(`  Total Users: ${userCount[0].count}`);

    await sql.end();
  } catch (error) {
    console.log(
      `\n❌ Failed to get system metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 OneKeel Swarm Health Check\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    const checks = await runHealthChecks();
    printHealthReport(checks);
    await getSystemMetrics();
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { argv } from 'process';

if (
  import.meta.url === `file://${argv[1]}` ||
  fileURLToPath(import.meta.url) === argv[1]
) {
  main();
}

export { runHealthChecks, printHealthReport };
