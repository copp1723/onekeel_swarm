// Diagnostic script to validate the validation system issue
const fs = require('fs');
const path = require('path');

console.log('=== VALIDATION SYSTEM DIAGNOSIS ===');

// Check what's actually exported from unified-validators
try {
  const unifiedValidatorsPath = './shared/validation/unified-validators.ts';
  const unifiedValidatorsContent = fs.readFileSync(unifiedValidatorsPath, 'utf8');
  
  // Extract export statements
  const exportMatches = unifiedValidatorsContent.match(/export\s+(function|const|class|interface|type)\s+(\w+)/g);
  
  console.log('\n✅ ACTUAL EXPORTS from unified-validators.ts:');
  if (exportMatches) {
    exportMatches.forEach(match => console.log(`  - ${match}`));
  } else {
    console.log('  - No exports found');
  }
  
} catch (error) {
  console.log(`❌ Error reading unified-validators.ts: ${error.message}`);
}

// Check what index.ts is trying to import
try {
  const indexPath = './shared/validation/index.ts';
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Extract import statements from unified-validators
  const importSection = indexContent.match(/\/\/ From unified-validators[\s\S]*?(?=\/\/|\nexport|$)/);
  
  console.log('\n❌ EXPECTED IMPORTS in index.ts:');
  if (importSection) {
    const imports = importSection[0].match(/\s+(\w+),?/g);
    if (imports) {
      imports.forEach(imp => console.log(`  - ${imp.trim()}`));
    }
  }
  
} catch (error) {
  console.log(`❌ Error reading validation index.ts: ${error.message}`);
}

console.log('\n=== REACT COMPONENT EXPORT DIAGNOSIS ===');

// Check a few key view components
const viewComponents = [
  'client/src/views/ConversationsView.tsx',
  'client/src/views/AgentsView.tsx', 
  'client/src/views/CampaignsView.tsx'
];

viewComponents.forEach(componentPath => {
  try {
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check export pattern
    const hasDefaultExport = content.includes('export default');
    const hasNamedExport = content.match(/export\s+(function|const|class)\s+\w+/);
    
    console.log(`\n📁 ${componentPath}:`);
    console.log(`  - Has default export: ${hasDefaultExport}`);
    console.log(`  - Has named export: ${!!hasNamedExport}`);
    
    if (hasNamedExport) {
      console.log(`  - Named export: ${hasNamedExport[0]}`);
    }
    
  } catch (error) {
    console.log(`❌ Error reading ${componentPath}: ${error.message}`);
  }
});

console.log('\n=== SUMMARY ===');
console.log('If validation exports don\'t match imports: VALIDATION SYSTEM BROKEN ✗');
console.log('If components have named exports but no default: LAZY LOADING BROKEN ✗');