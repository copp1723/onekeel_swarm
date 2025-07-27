#!/usr/bin/env tsx
/**
 * Deployment Script for OneKeel Swarm
 * 
 * This script handles deployment preparation and basic deployment tasks
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function runCommand(command: string, cwd?: string, options?: { silent?: boolean }): string {
  if (!options?.silent) {
    console.log(`🚀 Running: ${command}`);
  }
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      cwd: cwd || process.cwd(),
      stdio: options?.silent ? 'pipe' : 'inherit'
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    throw error;
  }
}

function checkEnvironmentVariables(): boolean {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
}

function createDeploymentArtifacts(): void {
  console.log('📦 Creating deployment artifacts...');
  
  const projectRoot = process.cwd();
  const deployDir = path.join(projectRoot, 'deploy');
  
  // Create deploy directory if it doesn't exist
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  // Copy essential files for deployment
  const filesToCopy = [
    'package.json',
    'tsconfig.json',
    'drizzle.config.ts'
  ];

  filesToCopy.forEach(file => {
    const srcPath = path.join(projectRoot, file);
    const destPath = path.join(deployDir, file);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`   ✅ Copied ${file}`);
    } else {
      console.log(`   ⚠️  ${file} not found, skipping`);
    }
  });

  // Copy directories
  const dirsToC4py = ['server', 'migrations'];
  
  dirsToC4py.forEach(dir => {
    const srcPath = path.join(projectRoot, dir);
    const destPath = path.join(deployDir, dir);
    
    if (fs.existsSync(srcPath)) {
      runCommand(`cp -r ${srcPath} ${destPath}`, undefined, { silent: true });
      console.log(`   ✅ Copied ${dir}/ directory`);
    } else {
      console.log(`   ⚠️  ${dir}/ directory not found, skipping`);
    }
  });

  console.log('✅ Deployment artifacts created');
}

function runPreDeploymentChecks(): void {
  console.log('🔍 Running pre-deployment checks...');

  // Check if build was successful
  try {
    runCommand('npx tsc --noEmit', undefined, { silent: true });
    console.log('✅ TypeScript compilation check passed');
  } catch (error) {
    console.error('❌ TypeScript compilation check failed');
    throw error;
  }

  // Check database connectivity
  try {
    console.log('🗄️  Checking database connectivity...');
    runCommand('tsx scripts/health-check.ts', undefined, { silent: true });
    console.log('✅ Database connectivity check passed');
  } catch (error) {
    console.log('⚠️  Database connectivity check failed (continuing deployment)');
  }

  console.log('✅ Pre-deployment checks completed');
}

async function deploy() {
  console.log('🚀 Starting OneKeel Swarm deployment process...\n');

  try {
    // 1. Check environment variables
    console.log('🔧 Checking environment configuration...');
    if (!checkEnvironmentVariables()) {
      process.exit(1);
    }

    // 2. Run build process
    console.log('\n📦 Running build process...');
    runCommand('tsx scripts/build.ts');

    // 3. Run pre-deployment checks
    console.log('\n🔍 Running pre-deployment checks...');
    runPreDeploymentChecks();

    // 4. Create deployment artifacts
    console.log('\n📦 Creating deployment artifacts...');
    createDeploymentArtifacts();

    // 5. Run database migrations in production mode
    console.log('\n🗄️  Running production database migrations...');
    try {
      runCommand('npx drizzle-kit push:pg');
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Database migrations failed');
      throw error;
    }

    console.log('\n🎉 Deployment preparation completed successfully!');
    
    console.log('\n📋 Deployment Summary:');
    console.log('  ✅ Environment variables validated');
    console.log('  ✅ Application built successfully');
    console.log('  ✅ Pre-deployment checks passed');
    console.log('  ✅ Database migrations applied');
    console.log('  ✅ Deployment artifacts created');
    
    console.log('\n📂 Deployment files available in ./deploy/ directory');
    console.log('\n🚀 Ready for production deployment!');
    
    console.log('\n💡 Next steps:');
    console.log('  1. Upload deployment artifacts to your server');
    console.log('  2. Install dependencies: npm install --production');
    console.log('  3. Start the application: npm start');
    console.log('  4. Monitor logs and health endpoints');

  } catch (error) {
    console.error('\n❌ Deployment process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { argv } from 'process';

if (import.meta.url === `file://${argv[1]}` || fileURLToPath(import.meta.url) === argv[1]) {
  deploy();
}

export { deploy };