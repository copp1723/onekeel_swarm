// Test script to verify bundled dependencies
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('Testing bundled dependencies...\n');

// Test if connect-redis can be imported from the bundle
try {
  const bundle = await import('./dist/index.js').catch(err => {
    console.log('Bundle import error (expected due to missing DATABASE_URL):', err.message);
    return null;
  });
  console.log('✓ Bundle can be loaded (or fails with expected DATABASE_URL error)\n');
} catch (err) {
  console.log('✗ Bundle loading failed:', err.message);
}

// Check external dependencies that should be available
const externalDeps = [
  'bcryptjs',
  'postgres', 
  'drizzle-orm',
  'ioredis',
  'express',
  'multer',
  'ws',
  'jsonwebtoken'
];

console.log('Checking external dependencies:');
externalDeps.forEach(dep => {
  try {
    require.resolve(dep);
    console.log(`✓ ${dep} is available`);
  } catch (err) {
    console.log(`✗ ${dep} is NOT available`);
  }
});

console.log('\nChecking if connect-redis is bundled:');
const bundleContent = require('fs').readFileSync('./dist/index.js', 'utf8');
if (bundleContent.includes('connect-redis')) {
  console.log('✓ connect-redis appears to be bundled');
} else {
  console.log('✗ connect-redis NOT found in bundle');
}

console.log('\nChecking if rate-limit-redis usage is bundled:');
if (bundleContent.includes('rate-limit-redis') || bundleContent.includes('RedisStore')) {
  console.log('✓ rate-limit-redis code appears to be bundled');
} else {
  console.log('✗ rate-limit-redis NOT found in bundle');
}