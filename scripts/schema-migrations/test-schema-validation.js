#!/usr/bin/env node

/**
 * Comprehensive Schema Validation Test Script
 * This script tests all the improvements made to the schema validation system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function logTest(message, passed = true) {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${message}`);
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  testResults.warnings++;
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

async function testMigrationScripts() {
  console.log('\n🔍 Testing Migration Scripts...');

  const expectedFiles = [
    '001-add-missing-tables.sql',
    '002-add-missing-columns.sql',
    '003-create-indexes.sql',
    'rollback-001-add-missing-tables.sql',
    'rollback-002-add-missing-columns.sql',
    'rollback-003-create-indexes.sql',
    'validate-schema.js',
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(__dirname, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      logTest(`Migration file exists: ${file}`);

      if (content.length < 50) {
        logWarning(`${file} seems very short (${content.length} chars)`);
      }
    } catch (error) {
      logTest(`Migration file missing: ${file}`, false);
    }
  }
}

async function testColumnNamingConsistency() {
  console.log('\n🔍 Testing Column Naming Consistency...');

  const migrationPath = path.join(__dirname, '002-add-missing-columns.sql');

  try {
    const content = fs.readFileSync(migrationPath, 'utf8');

    // Test for correct snake_case column names
    const correctPatterns = [
      'created_by UUID',
      'updated_by UUID',
      'enrolled_by UUID',
      'conversation_id UUID',
      'first_name',
      'last_name',
    ];

    for (const pattern of correctPatterns) {
      if (content.includes(pattern)) {
        logTest(`Found correct pattern: ${pattern}`);
      } else {
        logTest(`Missing correct pattern: ${pattern}`, false);
      }
    }

    // Test that old camelCase patterns are removed
    const incorrectPatterns = [
      'firstName TEXT',
      'lastName TEXT',
      'createdBy TEXT',
      'updatedBy TEXT',
      'enrolledBy TEXT',
      'conversationId TEXT',
    ];

    for (const pattern of incorrectPatterns) {
      if (!content.includes(pattern)) {
        logTest(`Correctly removed old pattern: ${pattern}`);
      } else {
        logTest(`Old pattern still exists: ${pattern}`, false);
      }
    }
  } catch (error) {
    logTest('Could not read migration file', false);
  }
}

async function testForeignKeyConstraints() {
  console.log('\n🔍 Testing Foreign Key Constraints...');

  const migrationPath = path.join(__dirname, '002-add-missing-columns.sql');

  try {
    const content = fs.readFileSync(migrationPath, 'utf8');

    const expectedForeignKeys = [
      'REFERENCES users(id)',
      'REFERENCES conversations(id)',
    ];

    for (const fk of expectedForeignKeys) {
      if (content.includes(fk)) {
        logTest(`Found foreign key constraint: ${fk}`);
      } else {
        logTest(`Missing foreign key constraint: ${fk}`, false);
      }
    }

    // Check that UUID data types are used
    const uuidPatterns = [
      'created_by UUID',
      'updated_by UUID',
      'enrolled_by UUID',
      'conversation_id UUID',
    ];

    for (const pattern of uuidPatterns) {
      if (content.includes(pattern)) {
        logTest(`Found UUID data type: ${pattern}`);
      } else {
        logTest(`Missing UUID data type: ${pattern}`, false);
      }
    }
  } catch (error) {
    logTest('Could not test foreign key constraints', false);
  }
}

async function testRollbackScripts() {
  console.log('\n🔍 Testing Rollback Scripts...');

  const rollbackFiles = [
    'rollback-001-add-missing-tables.sql',
    'rollback-002-add-missing-columns.sql',
    'rollback-003-create-indexes.sql',
  ];

  for (const file of rollbackFiles) {
    const filePath = path.join(__dirname, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      logTest(`Rollback script exists: ${file}`);

      // Check for DROP statements
      if (content.includes('DROP')) {
        logTest(`${file} contains DROP statements`);
      } else {
        logWarning(`${file} does not contain DROP statements`);
      }

      // Check for IF EXISTS safety
      if (content.includes('IF EXISTS')) {
        logTest(`${file} uses safe IF EXISTS clauses`);
      } else {
        logWarning(`${file} might not be using safe IF EXISTS clauses`);
      }
    } catch (error) {
      logTest(`Rollback script missing: ${file}`, false);
    }
  }
}

async function testDocumentation() {
  console.log('\n🔍 Testing Documentation...');

  const auditPath = path.join(__dirname, '../../docs/schema-audit.md');
  const summaryPath = path.join(
    __dirname,
    '../../docs/schema-validation-summary.md'
  );

  try {
    const auditContent = fs.readFileSync(auditPath, 'utf8');
    logTest('Schema audit report exists');

    if (
      auditContent.includes('snake_case') ||
      auditContent.includes('created_by')
    ) {
      logTest('Audit report has been updated with corrections');
    } else {
      logWarning('Audit report may not reflect latest corrections');
    }
  } catch (error) {
    logTest('Schema audit report missing', false);
  }

  try {
    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    logTest('Schema validation summary exists');

    if (summaryContent.includes('Recent Improvements Made')) {
      logTest('Summary includes improvement documentation');
    } else {
      logWarning('Summary may not include improvement documentation');
    }
  } catch (error) {
    logTest('Schema validation summary missing', false);
  }
}

async function runAllTests() {
  console.log('🧪 Comprehensive Schema Validation Test Suite');
  console.log('================================================\n');

  await testMigrationScripts();
  await testColumnNamingConsistency();
  await testForeignKeyConstraints();
  await testRollbackScripts();
  await testDocumentation();

  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);

  const successRate =
    (testResults.passed / (testResults.passed + testResults.failed)) * 100;
  console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Schema validation system is ready.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run tests if script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };
