/**
 * Test script for Schema Validator
 * This script tests the schema validator utility
 */

import { schemaValidator } from '../server/utils/schema-validator.ts';

async function testSchemaValidator() {
  console.log('🧪 Testing Schema Validator');
  console.log('============================\n');
  
  try {
    // Test required tables validation
    console.log('🔍 Testing required tables validation...');
    const tableResult = await schemaValidator.validateRequiredTables();
    console.log(`Tables validation: ${tableResult.isValid ? '✅' : '❌'}`);
    if (tableResult.errors.length > 0) {
      console.log('Errors:', tableResult.errors);
    }
    
    // Test columns validation
    console.log('\n🔍 Testing columns validation...');
    const columnResult = await schemaValidator.validateColumns();
    console.log(`Columns validation: ${columnResult.isValid ? '✅' : '❌'}`);
    if (columnResult.errors.length > 0) {
      console.log('Errors:', columnResult.errors);
    }
    
    // Test indexes validation
    console.log('\n🔍 Testing indexes validation...');
    const indexResult = await schemaValidator.validateIndexes();
    console.log(`Indexes validation: ${indexResult.isValid ? '✅' : '⚠️'}`);
    if (indexResult.warnings.length > 0) {
      console.log('Warnings:', indexResult.warnings);
    }
    
    // Test all validations
    console.log('\n🔍 Testing all validations...');
    const allResult = await schemaValidator.validateAll();
    console.log(`All validations: ${allResult.isValid ? '✅' : '❌'}`);
    
    console.log('\n📋 Test Summary:');
    console.log(`📁 Tables: ${tableResult.isValid ? '✅' : '❌'}`);
    console.log(`🔍 Columns: ${columnResult.isValid ? '✅' : '❌'}`);
    console.log(`.CreateIndexes: ${indexResult.isValid ? '✅' : '⚠️'}`);
    console.log(`🎯 Overall: ${allResult.isValid ? '✅' : '❌'}`);
    
    if (allResult.isValid) {
      console.log('\n🎉 All schema validator tests passed!');
    } else {
      console.log('\n❌ Some schema validator tests failed.');
    }
    
    process.exit(allResult.isValid ? 0 : 1);
  } catch (error: any) {
    console.error('💥 Error during schema validator test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test if script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSchemaValidator();
}

export { testSchemaValidator };