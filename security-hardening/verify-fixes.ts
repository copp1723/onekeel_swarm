#!/usr/bin/env ts-node

/**
 * Security Fix Verification Script
 * This script verifies that Agent 1's security fixes have been properly applied
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SecurityCheck {
  name: string;
  file: string;
  vulnerability: string;
  checkFunction: (content: string) => boolean;
}

const securityChecks: SecurityCheck[] = [
  {
    name: 'Hardcoded Admin Credentials',
    file: 'server/routes/auth.ts',
    vulnerability: 'Hardcoded admin@onekeel.com/password123 credentials',
    checkFunction: (content) => {
      return content.includes("username === 'admin@onekeel.com' && password === 'password123'");
    }
  },
  {
    name: 'Authentication Bypass (SKIP_AUTH)',
    file: 'server/middleware/auth.ts',
    vulnerability: 'SKIP_AUTH environment variable allows authentication bypass',
    checkFunction: (content) => {
      return content.includes("process.env.SKIP_AUTH === 'true'");
    }
  },
  {
    name: 'Weak JWT Secret',
    file: 'server/middleware/auth.ts',
    vulnerability: 'Default JWT secret used if not configured',
    checkFunction: (content) => {
      return content.includes("JWT_SECRET || 'ccl3-jwt-secret-change-in-production'");
    }
  },
  {
    name: 'SQL Injection in Campaigns',
    file: 'server/routes/campaigns.ts',
    vulnerability: 'Direct string interpolation in SQL queries',
    checkFunction: (content) => {
      // Check for vulnerable patterns
      const vulnerablePatterns = [
        /sql`.*\$\{.*IN\s*\(.*\$\{/,
        /campaign_id\s*=\s*ANY\s*\(\s*\$\{/,
        /\.join\(.*map.*=>\s*sql`\$\{/
      ];
      return vulnerablePatterns.some(pattern => pattern.test(content));
    }
  },
  {
    name: 'Missing Input Validation',
    file: 'server/middleware/validation.ts',
    vulnerability: 'No strict validation or mass assignment protection',
    checkFunction: (content) => {
      // Check if strict validation is missing
      return !content.includes('.strict()') || !content.includes('sanitizeRequestBody');
    }
  }
];

function checkFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

function main() {
  console.log('=== Security Fix Verification ===\n');
  
  let vulnerabilitiesFound = 0;
  let filesNotFound = 0;
  
  for (const check of securityChecks) {
    const filePath = path.join(__dirname, '..', check.file);
    const content = checkFile(filePath);
    
    if (!content) {
      console.log(`❌ ${check.name}`);
      console.log(`   File not found: ${check.file}`);
      filesNotFound++;
      continue;
    }
    
    const isVulnerable = check.checkFunction(content);
    
    if (isVulnerable) {
      console.log(`❌ ${check.name}`);
      console.log(`   VULNERABLE: ${check.vulnerability}`);
      console.log(`   File: ${check.file}`);
      vulnerabilitiesFound++;
    } else {
      console.log(`✅ ${check.name}`);
      console.log(`   FIXED: Vulnerability not found in ${check.file}`);
    }
    console.log('');
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total checks: ${securityChecks.length}`);
  console.log(`Vulnerabilities found: ${vulnerabilitiesFound}`);
  console.log(`Files not found: ${filesNotFound}`);
  console.log(`Status: ${vulnerabilitiesFound === 0 ? 'SECURE ✅' : 'VULNERABLE ❌'}`);
  
  // Check if Agent 1's fixes exist
  console.log('\n=== Agent 1 Fix Files ===');
  const fixFiles = [
    'security-fixes/fix-1-remove-hardcoded-credentials.ts',
    'security-fixes/fix-2-remove-auth-bypass.ts',
    'security-fixes/fix-3-secure-jwt-config.ts',
    'security-fixes/fix-4-sql-injection-prevention.ts',
    'security-fixes/fix-5-input-validation-mass-assignment.ts'
  ];
  
  let fixFilesFound = 0;
  for (const fixFile of fixFiles) {
    const exists = fs.existsSync(path.join(__dirname, '..', fixFile));
    console.log(`${exists ? '✅' : '❌'} ${fixFile}`);
    if (exists) fixFilesFound++;
  }
  
  console.log(`\nFix files found: ${fixFilesFound}/${fixFiles.length}`);
  
  if (vulnerabilitiesFound > 0) {
    console.log('\n⚠️  WARNING: Security vulnerabilities are still present!');
    console.log('Agent 1\'s fixes have NOT been applied to the actual codebase.');
  }
}

main();