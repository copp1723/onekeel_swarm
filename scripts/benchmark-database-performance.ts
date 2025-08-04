#!/usr/bin/env tsx

/**
 * Database Performance Benchmarking Tool
 * 
 * Measures database performance before and after optimizations
 * Tests various query patterns and reports improvements
 */

import { db, closeConnection } from '../server/db/client';
import { cacheService } from '../server/services/cache-service';
import { optimizedRepo } from '../server/services/optimized-repository-service';
import { logger } from '../server/utils/logger';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  test_name: string;
  iterations: number;
  min_time: number;
  max_time: number;
  avg_time: number;
  median_time: number;
  total_time: number;
  queries_per_second: number;
  cached?: boolean;
  improvement?: number;
}

interface BenchmarkSuite {
  timestamp: string;
  database_info: any;
  cache_enabled: boolean;
  results: BenchmarkResult[];
  summary: {
    total_tests: number;
    total_time: number;
    average_improvement: number;
    best_improvement: number;
    cache_impact: number;
  };
}

class DatabaseBenchmark {
  private results: BenchmarkResult[] = [];
  private cacheEnabled: boolean = false;

  async run() {
    console.log('🚀 Starting Database Performance Benchmark...\n');
    
    try {
      // Initialize
      await this.initialize();
      
      // Run benchmarks
      await this.runBasicQueryBenchmarks();
      await this.runJoinQueryBenchmarks();
      await this.runAggregationBenchmarks();
      await this.runInsertBenchmarks();
      await this.runUpdateBenchmarks();
      
      if (this.cacheEnabled) {
        await this.runCacheBenchmarks();
      }
      
      // Generate report
      await this.generateBenchmarkReport();
      
      console.log('\n✅ Database benchmark completed successfully!\n');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  private async initialize() {
    console.log('🔧 Initializing benchmark environment...');
    
    // Check cache availability
    this.cacheEnabled = cacheService.enabled;
    console.log(`   Cache enabled: ${this.cacheEnabled ? '✅' : '❌'}`);
    
    // Clear caches for fair testing
    if (this.cacheEnabled) {
      await cacheService.flush();
      console.log('   Cache cleared for benchmarking');
    }
    
    // Warm up connection
    await db.execute(sql`SELECT 1`);
    console.log('   Database connection warmed up');
  }

  private async runBasicQueryBenchmarks() {
    console.log('📊 Running basic query benchmarks...');
    
    // Test 1: Simple SELECT with WHERE clause
    await this.benchmark(
      'Simple Lead Lookup',
      async () => {
        await db.execute(sql`
          SELECT id, first_name, last_name, email, status, created_at
          FROM leads 
          WHERE status = 'new' 
          LIMIT 10
        `);
      },
      100
    );

    // Test 2: SELECT with ORDER BY
    await this.benchmark(
      'Leads Ordered by Creation Date',
      async () => {
        await db.execute(sql`
          SELECT id, first_name, last_name, email, created_at
          FROM leads 
          ORDER BY created_at DESC 
          LIMIT 50
        `);
      },
      50
    );

    // Test 3: Count query
    await this.benchmark(
      'Count Total Leads',
      async () => {
        await db.execute(sql`SELECT COUNT(*) FROM leads`);
      },
      100
    );

    // Test 4: Text search
    await this.benchmark(
      'Text Search on Lead Names',
      async () => {
        await db.execute(sql`
          SELECT id, first_name, last_name, email
          FROM leads 
          WHERE first_name ILIKE '%john%' OR last_name ILIKE '%smith%'
          LIMIT 20
        `);
      },
      50
    );
  }

  private async runJoinQueryBenchmarks() {
    console.log('🔗 Running JOIN query benchmarks...');
    
    // Test 1: Lead with Campaign JOIN
    await this.benchmark(
      'Leads with Campaign Info',
      async () => {
        await db.execute(sql`
          SELECT l.id, l.first_name, l.last_name, l.email, c.name as campaign_name
          FROM leads l
          LEFT JOIN campaigns c ON l.campaign_id = c.id
          WHERE l.status IN ('new', 'contacted')
          ORDER BY l.created_at DESC
          LIMIT 100
        `);
      },
      30
    );

    // Test 2: Complex JOIN with aggregation
    await this.benchmark(
      'Campaign Performance Stats',
      async () => {
        await db.execute(sql`
          SELECT 
            c.name,
            COUNT(l.id) as lead_count,
            COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_count,
            COUNT(comm.id) as communication_count
          FROM campaigns c
          LEFT JOIN leads l ON c.id = l.campaign_id
          LEFT JOIN communications comm ON l.id = comm.lead_id
          WHERE c.active = true
          GROUP BY c.id, c.name
          ORDER BY lead_count DESC
          LIMIT 20
        `);
      },
      20
    );

    // Test 3: Multiple JOINs
    await this.benchmark(
      'Lead Full Profile',
      async () => {
        await db.execute(sql`
          SELECT 
            l.id, l.first_name, l.last_name, l.email,
            c.name as campaign_name,
            COUNT(comm.id) as communication_count,
            MAX(comm.created_at) as last_communication
          FROM leads l
          LEFT JOIN campaigns c ON l.campaign_id = c.id
          LEFT JOIN communications comm ON l.id = comm.lead_id
          WHERE l.created_at > NOW() - INTERVAL '30 days'
          GROUP BY l.id, l.first_name, l.last_name, l.email, c.name
          ORDER BY l.created_at DESC
          LIMIT 50
        `);
      },
      20
    );
  }

  private async runAggregationBenchmarks() {
    console.log('📈 Running aggregation benchmarks...');
    
    // Test 1: Daily lead counts
    await this.benchmark(
      'Daily Lead Counts (Last 30 Days)',
      async () => {
        await db.execute(sql`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as lead_count,
            COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count
          FROM leads
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `);
      },
      30
    );

    // Test 2: Channel performance
    await this.benchmark(
      'Communication Channel Performance',
      async () => {
        await db.execute(sql`
          SELECT 
            channel,
            COUNT(*) as total_communications,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
            AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) as avg_delivery_time
          FROM communications
          WHERE created_at > NOW() - INTERVAL '7 days'
          AND sent_at IS NOT NULL
          GROUP BY channel
          ORDER BY total_communications DESC
        `);
      },
      50
    );

    // Test 3: Lead source analysis
    await this.benchmark(
      'Lead Source Analysis',
      async () => {
        await db.execute(sql`
          SELECT 
            source,
            COUNT(*) as total_leads,
            AVG(qualification_score) as avg_score,
            COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count,
            ROUND(
              (COUNT(CASE WHEN status = 'converted' THEN 1 END)::decimal / COUNT(*)) * 100, 2
            ) as conversion_rate
          FROM leads
          WHERE created_at > NOW() - INTERVAL '90 days'
          GROUP BY source
          HAVING COUNT(*) > 10
          ORDER BY conversion_rate DESC
        `);
      },
      30
    );
  }

  private async runInsertBenchmarks() {
    console.log('📝 Running INSERT benchmarks...');
    
    // Test 1: Single INSERT
    await this.benchmark(
      'Single Lead Insert',
      async () => {
        await db.execute(sql`
          INSERT INTO leads (first_name, last_name, email, source, status, created_at, updated_at)
          VALUES ('Benchmark', 'Test', 'benchmark@test.com', 'api', 'new', NOW(), NOW())
        `);
      },
      50,
      async () => {
        // Cleanup inserted records
        await db.execute(sql`DELETE FROM leads WHERE email = 'benchmark@test.com'`);
      }
    );

    // Test 2: Batch INSERT
    await this.benchmark(
      'Batch Lead Insert (10 records)',
      async () => {
        const values = Array.from({ length: 10 }, (_, i) => 
          `('Benchmark${i}', 'Test${i}', 'batch${i}@test.com', 'api', 'new', NOW(), NOW())`
        ).join(',');
        
        await db.execute(sql.raw(`
          INSERT INTO leads (first_name, last_name, email, source, status, created_at, updated_at)
          VALUES ${values}
        `));
      },
      20,
      async () => {
        // Cleanup inserted records
        await db.execute(sql`DELETE FROM leads WHERE email LIKE 'batch%@test.com'`);
      }
    );
  }

  private async runUpdateBenchmarks() {
    console.log('✏️ Running UPDATE benchmarks...');
    
    // Setup test data
    await db.execute(sql`
      INSERT INTO leads (first_name, last_name, email, source, status, qualification_score, created_at, updated_at)
      VALUES ('Update', 'Test', 'update@test.com', 'api', 'new', 50, NOW(), NOW())
    `);

    // Test 1: Single UPDATE
    await this.benchmark(
      'Single Lead Update',
      async () => {
        await db.execute(sql`
          UPDATE leads 
          SET qualification_score = qualification_score + 10, updated_at = NOW()
          WHERE email = 'update@test.com'
        `);
      },
      100
    );

    // Test 2: Bulk UPDATE
    await this.benchmark(
      'Bulk Status Update',
      async () => {
        await db.execute(sql`
          UPDATE leads 
          SET status = 'contacted', updated_at = NOW()
          WHERE status = 'new' AND created_at > NOW() - INTERVAL '1 hour'
        `);
      },
      30
    );

    // Cleanup
    await db.execute(sql`DELETE FROM leads WHERE email = 'update@test.com'`);
  }

  private async runCacheBenchmarks() {
    console.log('💾 Running cache benchmarks...');
    
    // Test 1: Cache SET performance
    await this.benchmark(
      'Cache SET Operations',
      async () => {
        await cacheService.set(`benchmark_key_${Date.now()}`, { test: 'data' }, 60);
      },
      100
    );

    // Test 2: Cache GET performance
    await cacheService.set('benchmark_get_test', { test: 'data' }, 300);
    await this.benchmark(
      'Cache GET Operations',
      async () => {
        await cacheService.get('benchmark_get_test');
      },
      200
    );

    // Test 3: Cache vs Database comparison
    const testLeadId = await this.createTestLead();
    
    // Warm up cache
    await optimizedRepo.getLeadWithRelations(testLeadId);
    
    await this.benchmark(
      'Cached Lead Retrieval',
      async () => {
        await optimizedRepo.getLeadWithRelations(testLeadId);
      },
      100,
      undefined,
      true
    );

    // Clear cache and test database direct access
    await cacheService.delPattern(`lead_with_relations:${testLeadId}`);
    
    await this.benchmark(
      'Database Lead Retrieval',
      async () => {
        await optimizedRepo.getLeadWithRelations(testLeadId);
      },
      100,
      undefined,
      false
    );

    // Cleanup
    await this.cleanupTestLead(testLeadId);
  }

  private async benchmark(
    testName: string,
    operation: () => Promise<void>,
    iterations: number = 100,
    cleanup?: () => Promise<void>,
    cached?: boolean
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    
    console.log(`   Running ${testName} (${iterations} iterations)...`);

    // Warm up
    for (let i = 0; i < 3; i++) {
      await operation();
      if (cleanup) await cleanup();
    }

    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await operation();
      const end = process.hrtime.bigint();
      
      const timeMs = Number(end - start) / 1_000_000;
      times.push(timeMs);
      
      if (cleanup) await cleanup();
    }

    // Calculate statistics
    times.sort((a, b) => a - b);
    const min_time = times[0];
    const max_time = times[times.length - 1];
    const avg_time = times.reduce((a, b) => a + b) / times.length;
    const median_time = times[Math.floor(times.length / 2)];
    const total_time = times.reduce((a, b) => a + b);
    const queries_per_second = 1000 / avg_time;

    const result: BenchmarkResult = {
      test_name: testName,
      iterations,
      min_time,
      max_time,
      avg_time,
      median_time,
      total_time,
      queries_per_second,
      cached
    };

    this.results.push(result);
    
    console.log(`      Avg: ${avg_time.toFixed(2)}ms, QPS: ${queries_per_second.toFixed(1)}`);
    
    return result;
  }

  private async createTestLead(): Promise<string> {
    const [lead] = await db.execute(sql`
      INSERT INTO leads (first_name, last_name, email, source, status, created_at, updated_at)
      VALUES ('Cache', 'Test', 'cache@test.com', 'api', 'new', NOW(), NOW())
      RETURNING id
    `);
    return lead.rows[0].id;
  }

  private async cleanupTestLead(leadId: string): Promise<void> {
    await db.execute(sql`DELETE FROM leads WHERE id = ${leadId}`);
  }

  private async generateBenchmarkReport() {
    console.log('📋 Generating benchmark report...');
    
    try {
      // Calculate improvements where applicable
      const cachedResults = this.results.filter(r => r.cached === true);
      const uncachedResults = this.results.filter(r => r.cached === false);
      
      // Match cached vs uncached tests
      cachedResults.forEach(cachedResult => {
        const uncachedResult = uncachedResults.find(r => 
          r.test_name.replace('Cached ', 'Database ') === cachedResult.test_name.replace('Cached ', 'Database ')
        );
        
        if (uncachedResult) {
          const improvement = ((uncachedResult.avg_time - cachedResult.avg_time) / uncachedResult.avg_time) * 100;
          cachedResult.improvement = improvement;
        }
      });

      // Get database info
      const [dbInfo] = await db.execute(sql`
        SELECT 
          version() as postgres_version,
          current_database() as database_name,
          pg_size_pretty(pg_database_size(current_database())) as database_size
      `);

      // Create report
      const report: BenchmarkSuite = {
        timestamp: new Date().toISOString(),
        database_info: dbInfo.rows[0],
        cache_enabled: this.cacheEnabled,
        results: this.results,
        summary: {
          total_tests: this.results.length,
          total_time: this.results.reduce((sum, r) => sum + r.total_time, 0),
          average_improvement: cachedResults.filter(r => r.improvement).reduce((sum, r) => sum + (r.improvement || 0), 0) / cachedResults.filter(r => r.improvement).length || 0,
          best_improvement: Math.max(...cachedResults.map(r => r.improvement || 0)),
          cache_impact: cachedResults.length > 0 ? 
            (cachedResults.reduce((sum, r) => sum + r.queries_per_second, 0) / cachedResults.length) : 0
        }
      };

      // Save report
      const reportPath = path.join(__dirname, '../logs/database-benchmark-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      // Save CSV for analysis
      const csvPath = path.join(__dirname, '../logs/database-benchmark-results.csv');
      const csvContent = [
        'Test Name,Iterations,Min Time (ms),Max Time (ms),Avg Time (ms),Median Time (ms),Total Time (ms),Queries Per Second,Cached,Improvement (%)',
        ...this.results.map(r => 
          `"${r.test_name}",${r.iterations},${r.min_time.toFixed(2)},${r.max_time.toFixed(2)},${r.avg_time.toFixed(2)},${r.median_time.toFixed(2)},${r.total_time.toFixed(2)},${r.queries_per_second.toFixed(2)},${r.cached || 'N/A'},${r.improvement?.toFixed(2) || 'N/A'}`
        )
      ].join('\n');
      
      fs.writeFileSync(csvPath, csvContent);
      
      console.log('   ✅ Benchmark report saved to:', reportPath);
      console.log('   ✅ CSV results saved to:', csvPath);
      
    } catch (error) {
      console.log('   ❌ Report generation failed:', (error as Error).message);
    }
  }

  private printSummary() {
    console.log('📊 BENCHMARK SUMMARY');
    console.log('====================');
    
    const totalTests = this.results.length;
    const totalTime = this.results.reduce((sum, r) => sum + r.total_time, 0);
    const avgQPS = this.results.reduce((sum, r) => sum + r.queries_per_second, 0) / totalTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Average QPS: ${avgQPS.toFixed(1)}`);
    console.log(`Cache Enabled: ${this.cacheEnabled ? '✅' : '❌'}`);
    
    // Show top performers
    const topPerformers = [...this.results]
      .sort((a, b) => b.queries_per_second - a.queries_per_second)
      .slice(0, 5);
    
    console.log('\n🏆 Top Performing Tests:');
    topPerformers.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test_name}: ${result.queries_per_second.toFixed(1)} QPS`);
    });

    // Show cache improvements
    const improvements = this.results.filter(r => r.improvement && r.improvement > 0);
    if (improvements.length > 0) {
      console.log('\n⚡ Cache Performance Improvements:');
      improvements.forEach(result => {
        console.log(`• ${result.test_name}: ${result.improvement!.toFixed(1)}% faster`);
      });
    }
    
    console.log('====================');
    console.log('💡 Recommendations:');
    
    if (avgQPS < 100) {
      console.log('• Consider adding more database indexes for frequently queried columns');
    }
    
    if (!this.cacheEnabled) {
      console.log('• Enable Redis caching for significant performance improvements');
    }
    
    if (improvements.length === 0 && this.cacheEnabled) {
      console.log('• Review cache strategy and TTL settings');
    }
    
    const slowTests = this.results.filter(r => r.avg_time > 100);
    if (slowTests.length > 0) {
      console.log(`• Optimize slow queries: ${slowTests.map(t => t.test_name).join(', ')}`);
    }
  }

  private async cleanup() {
    try {
      await closeConnection();
      if (this.cacheEnabled) {
        await cacheService.close();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new DatabaseBenchmark();
  benchmark.run().catch(console.error);
}

export { DatabaseBenchmark };