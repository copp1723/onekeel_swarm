#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupProductionTesting() {
  console.log('🔧 OneKeel Swarm Production Database Testing Setup\n');
  
  const envPath = path.join(__dirname, '../.env');
  const envBackupPath = path.join(__dirname, '../.env.backup');
  
  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ No .env file found. Creating from .env.example...');
    const examplePath = path.join(__dirname, '../.env.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log('✅ Created .env from .env.example');
    } else {
      console.error('❌ No .env.example found either. Cannot proceed.');
      process.exit(1);
    }
  }
  
  // Read current .env
  const currentEnv = fs.readFileSync(envPath, 'utf-8');
  const currentDbUrl = currentEnv.match(/DATABASE_URL=(.+)/)?.[1] || '';
  
  console.log('📊 Current Configuration:');
  console.log(`   DATABASE_URL: ${currentDbUrl.substring(0, 30)}...`);
  
  console.log('\n⚠️  WARNING: This will update your .env to use the production database.');
  console.log('   This is useful for testing but BE CAREFUL with production data!\n');
  
  const proceed = await question('Do you want to proceed? (yes/no): ');
  
  if (proceed.toLowerCase() !== 'yes') {
    console.log('\n❌ Setup cancelled.');
    rl.close();
    return;
  }
  
  // Backup current .env
  fs.copyFileSync(envPath, envBackupPath);
  console.log(`\n✅ Backed up current .env to ${envBackupPath}`);
  
  // Production database URL
  const prodDbUrl = 'postgresql://ccl_3_user:P8LUqfkbIB4noaUDthVtZETTWZR668nI@dpg-d1lvpq6r433s73e9vfu0-a.oregon-postgres.render.com/ccl_3';
  
  // Update DATABASE_URL
  let newEnv = currentEnv;
  if (currentEnv.includes('DATABASE_URL=')) {
    newEnv = currentEnv.replace(/DATABASE_URL=.+/, `DATABASE_URL=${prodDbUrl}`);
  } else {
    newEnv += `\nDATABASE_URL=${prodDbUrl}`;
  }
  
  fs.writeFileSync(envPath, newEnv);
  console.log('✅ Updated DATABASE_URL to production database');
  
  console.log('\n📋 Next Steps:');
  console.log('1. Run the SQL fix script in Render dashboard:');
  console.log('   - Go to your Render dashboard');
  console.log('   - Navigate to the database');
  console.log('   - Open the SQL console');
  console.log('   - Copy and paste the contents of:');
  console.log('     scripts/production-complete-schema-fix.sql');
  console.log('\n2. Test the connection:');
  console.log('   npm run test:db');
  console.log('\n3. Run migrations (if needed):');
  console.log('   npm run db:migrate');
  console.log('\n4. Start the application:');
  console.log('   npm run dev');
  console.log('\n5. To restore original config:');
  console.log('   cp .env.backup .env');
  
  rl.close();
}

// Create npm script
async function addNpmScripts() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  const scriptsToAdd = {
    'setup:prod-test': 'tsx scripts/setup-production-testing.ts',
    'test:prod-db': 'tsx scripts/test-production-db.ts',
    'env:backup': 'cp .env .env.backup',
    'env:restore': 'cp .env.backup .env'
  };
  
  let added = false;
  for (const [name, command] of Object.entries(scriptsToAdd)) {
    if (!packageJson.scripts[name]) {
      packageJson.scripts[name] = command;
      added = true;
    }
  }
  
  if (added) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('\n✅ Added npm scripts for production testing');
  }
}

// Run setup
(async () => {
  await addNpmScripts();
  await setupProductionTesting();
})();