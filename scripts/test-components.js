/**
 * Simple test script to verify components
 * This script tests that all components were created correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testFilesExist() {
  console.log('🧪 Testing Component Files');
  console.log('==========================\n');

  // Test schema audit report
  const schemaAuditPath = path.join(__dirname, '../docs/schema-audit.md');
  if (fs.existsSync(schemaAuditPath)) {
    console.log('✅ Schema Audit Report exists');
  } else {
    console.log('❌ Schema Audit Report missing');
    return false;
  }

  // Test migration scripts
  const migrationDir = path.join(__dirname, 'schema-migrations');
  const expectedMigrationFiles = [
    '001-add-missing-tables.sql',
    '002-add-missing-columns.sql',
    '003-create-indexes.sql',
    'validate-schema.js',
  ];

  let allMigrationsExist = true;
  for (const file of expectedMigrationFiles) {
    const filePath = path.join(migrationDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ Migration script exists: ${file}`);
    } else {
      console.log(`❌ Migration script missing: ${file}`);
      allMigrationsExist = false;
    }
  }

  // Test schema validator
  const schemaValidatorPath = path.join(
    __dirname,
    '../server/utils/schema-validator.ts'
  );
  if (fs.existsSync(schemaValidatorPath)) {
    console.log('✅ Schema Validator exists');
  } else {
    console.log('❌ Schema Validator missing');
    return false;
  }

  if (allMigrationsExist) {
    console.log('\n🎉 All component files exist!');
    return true;
  } else {
    console.log('\n❌ Some component files are missing.');
    return false;
  }
}

// Run test
testFilesExist();
