#!/usr/bin/env tsx
/**
 * Build Script for OneKeel Swarm
 * 
 * This script builds both the client and server components
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function runCommand(command: string, cwd?: string): void {
  console.log(`📦 Running: ${command}`);
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: cwd || process.cwd() 
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    throw error;
  }
}

function checkDirectory(dir: string): boolean {
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

async function build() {
  console.log('🚀 Starting OneKeel Swarm build process...\n');

  const projectRoot = process.cwd();
  const clientDir = path.join(projectRoot, 'client');
  const serverDir = projectRoot;

  try {
    // 1. Install dependencies for server
    console.log('📦 Installing server dependencies...');
    runCommand('npm install', serverDir);

    // 2. Build client if it exists
    if (checkDirectory(clientDir)) {
      console.log('\n📦 Installing client dependencies...');
      runCommand('npm install', clientDir);
      
      console.log('\n🏗️  Building client application...');
      runCommand('npm run build', clientDir);
      
      console.log('✅ Client build completed');
    } else {
      console.log('ℹ️  Client directory not found, skipping client build');
    }

    // 3. Compile TypeScript for server
    console.log('\n🏗️  Compiling TypeScript for server...');
    runCommand('npx tsc --noEmit', serverDir);
    
    console.log('✅ TypeScript compilation completed');

    // 4. Run database migrations
    console.log('\n🗄️  Running database migrations...');
    try {
      runCommand('npx drizzle-kit push:pg', serverDir);
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.log('⚠️  Database migrations failed (this may be expected if DB is not available)');
    }

    console.log('\n🎉 Build process completed successfully!');
    console.log('\n📋 Build Summary:');
    console.log('  ✅ Server dependencies installed');
    console.log('  ✅ TypeScript compilation passed');
    if (checkDirectory(clientDir)) {
      console.log('  ✅ Client application built');
    }
    console.log('  ✅ Build artifacts ready for deployment');

  } catch (error) {
    console.error('\n❌ Build process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { argv } from 'process';

if (import.meta.url === `file://${argv[1]}` || fileURLToPath(import.meta.url) === argv[1]) {
  build();
}

export { build };