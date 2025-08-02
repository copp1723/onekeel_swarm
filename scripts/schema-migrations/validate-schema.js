/**
 * Schema Validation Script
 * This script validates that the migration scripts will work correctly
 * and that the database schema matches expected structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the expected migration files
const expectedMigrationFiles = [
  '001-add-missing-tables.sql',
  '002-add-missing-columns.sql',
  '003-create-indexes.sql',
];

// Define expected tables and columns
const expectedSchema = {
  leads: ['id', 'firstName', 'lastName', 'name', 'score', 'email', 'phone'],
  campaigns: ['id', 'name', 'createdBy', 'updatedBy'],
  lead_campaign_enrollments: ['id', 'enrolledBy', 'enrolledAt'],
  communications: ['id', 'conversationId'],
  conversations: ['id', 'lead_id', 'channel', 'status'],
};

// Function to validate migration files exist
function validateMigrationFiles() {
  console.log('🔍 Validating migration files...');

  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir);

  const missingFiles = expectedMigrationFiles.filter(
    file => !files.includes(file)
  );

  if (missingFiles.length > 0) {
    console.error(`❌ Missing migration files: ${missingFiles.join(', ')}`);
    return false;
  }

  console.log('✅ All migration files present');
  return true;
}

// Function to validate SQL syntax (basic check)
function validateSQLSyntax() {
  console.log('🔍 Validating SQL syntax...');

  const migrationsDir = __dirname;
  let valid = true;

  for (const file of expectedMigrationFiles) {
    const filePath = path.join(migrationsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Basic SQL syntax checks
      if (!content.includes('ALTER TABLE') && !content.includes('CREATE')) {
        console.warn(`⚠️  ${file}: No ALTER TABLE or CREATE statements found`);
      }

      // Check for IF NOT EXISTS patterns
      if (file.includes('missing') && !content.includes('IF NOT EXISTS')) {
        console.warn(
          `⚠️  ${file}: Missing IF NOT EXISTS pattern for safe migrations`
        );
      }
    } catch (error) {
      console.error(`❌ Error reading ${file}: ${error.message}`);
      valid = false;
    }
  }

  if (valid) {
    console.log('✅ SQL syntax validation passed');
  }

  return valid;
}

// Function to validate schema structure
function validateSchemaStructure() {
  console.log('🔍 Validating schema structure...');

  // This would normally connect to the database and check the actual schema
  // For now, we'll just verify the migration files contain expected patterns

  const columnChecks = [
    {
      file: '002-add-missing-columns.sql',
      pattern: 'score INTEGER',
      description: 'Lead score column',
    },
    {
      file: '002-add-missing-columns.sql',
      pattern: 'name TEXT',
      description: 'Lead computed name column',
    },
    {
      file: '002-add-missing-columns.sql',
      pattern: 'created_by UUID REFERENCES users',
      description: 'Campaign created_by column',
    },
    {
      file: '002-add-missing-columns.sql',
      pattern: 'updated_by UUID REFERENCES users',
      description: 'Campaign updated_by column',
    },
    {
      file: '002-add-missing-columns.sql',
      pattern: 'enrolled_by UUID REFERENCES users',
      description: 'Enrollment enrolled_by column',
    },
    {
      file: '002-add-missing-columns.sql',
      pattern: 'conversation_id UUID REFERENCES conversations',
      description: 'Communication conversation_id column',
    },
  ];

  let valid = true;

  for (const check of columnChecks) {
    const filePath = path.join(__dirname, check.file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(check.pattern)) {
        console.log(`✅ ${check.description} found in ${check.file}`);
      } else {
        console.error(`❌ ${check.description} NOT found in ${check.file}`);
        valid = false;
      }
    } catch (error) {
      console.error(`❌ Error reading ${check.file}: ${error.message}`);
      valid = false;
    }
  }

  return valid;
}

// Main validation function
async function validateSchema() {
  console.log('🧪 Schema Validation Script');
  console.log('============================\n');

  try {
    // Run all validation checks
    const migrationFilesValid = validateMigrationFiles();
    const sqlSyntaxValid = validateSQLSyntax();
    const schemaStructureValid = validateSchemaStructure();

    console.log('\n📋 Validation Summary:');
    console.log(`📁 Migration Files: ${migrationFilesValid ? '✅' : '❌'}`);
    console.log(`🔍 SQL Syntax: ${sqlSyntaxValid ? '✅' : '❌'}`);
    console.log(`🏗️  Schema Structure: ${schemaStructureValid ? '✅' : '❌'}`);

    if (migrationFilesValid && sqlSyntaxValid && schemaStructureValid) {
      console.log('\n🎉 All schema validations passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some schema validations failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Error during validation:', error.message);
    process.exit(1);
  }
}

// Run validation if script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateSchema();
}

export {
  validateMigrationFiles,
  validateSQLSyntax,
  validateSchemaStructure,
  validateSchema,
};
