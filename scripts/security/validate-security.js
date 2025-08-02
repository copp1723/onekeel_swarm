#!/usr/bin/env node

/**
 * OneKeel Swarm - Security Validation Script
 * Validates security configuration and identifies vulnerabilities
 * Author: Security/DevOps Specialist
 * Date: 2025-07-29
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class SecurityValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.projectRoot = path.resolve(__dirname, '../..');
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(`❌ ERROR: ${message}`, 'red');
  }

  warn(message) {
    this.warnings.push(message);
    this.log(`⚠️  WARNING: ${message}`, 'yellow');
  }

  pass(message) {
    this.passed.push(message);
    this.log(`✅ PASS: ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  INFO: ${message}`, 'blue');
  }

  // Calculate entropy of a string
  calculateEntropy(str) {
    const freq = {};
    for (let char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (let char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  // Validate environment variables
  validateEnvironment() {
    this.info('Validating environment configuration...');

    const envPath = path.join(this.projectRoot, '.env');
    if (!fs.existsSync(envPath)) {
      this.error('.env file not found');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    // Parse .env file
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#][^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });

    // Check for SKIP_AUTH
    if (envVars.SKIP_AUTH) {
      this.error(
        'SKIP_AUTH found in environment - this is a critical security vulnerability'
      );
    } else {
      this.pass('No SKIP_AUTH bypass found in environment');
    }

    // Validate JWT_SECRET
    const jwtSecret = envVars.JWT_SECRET;
    if (!jwtSecret) {
      this.error('JWT_SECRET is missing');
    } else if (jwtSecret.length < 32) {
      this.error('JWT_SECRET is too short (minimum 32 characters)');
    } else if (this.calculateEntropy(jwtSecret) < 4.0) {
      this.warn(
        'JWT_SECRET has low entropy - consider using a more random string'
      );
    } else {
      this.pass('JWT_SECRET is properly configured');
    }

    // Validate JWT_REFRESH_SECRET
    const jwtRefreshSecret = envVars.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      this.error('JWT_REFRESH_SECRET is missing');
    } else if (jwtRefreshSecret.length < 32) {
      this.error('JWT_REFRESH_SECRET is too short (minimum 32 characters)');
    } else if (jwtRefreshSecret === jwtSecret) {
      this.error('JWT_REFRESH_SECRET must be different from JWT_SECRET');
    } else {
      this.pass('JWT_REFRESH_SECRET is properly configured');
    }

    // Validate SESSION_SECRET
    const sessionSecret = envVars.SESSION_SECRET;
    if (!sessionSecret) {
      this.error('SESSION_SECRET is missing');
    } else if (sessionSecret === 'ccl3-swarm-secret-key') {
      this.error('SESSION_SECRET is using default value - this is insecure');
    } else if (sessionSecret.length < 32) {
      this.error('SESSION_SECRET is too short (minimum 32 characters)');
    } else {
      this.pass('SESSION_SECRET is properly configured');
    }

    // Check DATABASE_URL for weak credentials
    const dbUrl = envVars.DATABASE_URL;
    if (dbUrl) {
      const weakPatterns = [
        'postgres:postgres',
        'root:root',
        'admin:admin',
        'password123',
      ];
      const hasWeakCreds = weakPatterns.some(pattern =>
        dbUrl.includes(pattern)
      );
      if (hasWeakCreds) {
        this.warn('DATABASE_URL contains weak credentials');
      } else {
        this.pass('DATABASE_URL credentials appear secure');
      }
    }

    // Check NODE_ENV
    const nodeEnv = envVars.NODE_ENV;
    if (nodeEnv === 'development') {
      this.warn('NODE_ENV is set to development - ensure this is intentional');
    } else if (nodeEnv === 'production') {
      this.pass('NODE_ENV is set to production');
    }
  }

  // Validate source code for security issues
  validateSourceCode() {
    this.info('Scanning source code for security issues...');

    const serverDir = path.join(this.projectRoot, 'server');
    if (!fs.existsSync(serverDir)) {
      this.warn('Server directory not found');
      return;
    }

    // Check for SKIP_AUTH in source code
    const skipAuthFound = this.scanDirectory(serverDir, /SKIP_AUTH/g);
    if (skipAuthFound.length > 0) {
      this.error(`SKIP_AUTH found in source code: ${skipAuthFound.join(', ')}`);
    } else {
      this.pass('No SKIP_AUTH bypass found in source code');
    }

    // Check for hardcoded credentials
    const credentialPatterns = [
      /password.*=.*["'].*123.*["']/gi,
      /secret.*=.*["'].*key.*["']/gi,
      /admin.*=.*["'].*admin.*["']/gi,
    ];

    let hardcodedCredsFound = false;
    credentialPatterns.forEach(pattern => {
      const matches = this.scanDirectory(serverDir, pattern);
      if (matches.length > 0) {
        this.warn(
          `Potential hardcoded credentials found: ${matches.join(', ')}`
        );
        hardcodedCredsFound = true;
      }
    });

    if (!hardcodedCredsFound) {
      this.pass('No obvious hardcoded credentials found');
    }

    // Check authentication middleware
    const authMiddlewarePath = path.join(serverDir, 'middleware', 'auth.ts');
    if (fs.existsSync(authMiddlewarePath)) {
      const authContent = fs.readFileSync(authMiddlewarePath, 'utf8');

      // Check for proper JWT verification
      if (authContent.includes('tokenService.verifyAccessToken')) {
        this.pass('Authentication middleware uses secure token verification');
      } else {
        this.warn(
          'Authentication middleware may not be using secure token verification'
        );
      }

      // Check for role-based authorization
      if (
        authContent.includes('authorize') &&
        authContent.includes('allowedRoles')
      ) {
        this.pass('Role-based authorization is implemented');
      } else {
        this.warn('Role-based authorization may not be properly implemented');
      }
    }
  }

  // Scan directory for patterns
  scanDirectory(dir, pattern) {
    const matches = [];

    const scanFile = filePath => {
      if (path.extname(filePath).match(/\.(ts|js)$/)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const fileMatches = content.match(pattern);
          if (fileMatches) {
            matches.push(path.relative(this.projectRoot, filePath));
          }
        } catch (err) {
          // Ignore read errors
        }
      }
    };

    const scanDir = currentDir => {
      try {
        const items = fs.readdirSync(currentDir);
        items.forEach(item => {
          const itemPath = path.join(currentDir, item);
          const stat = fs.statSync(itemPath);

          if (
            stat.isDirectory() &&
            !item.startsWith('.') &&
            item !== 'node_modules'
          ) {
            scanDir(itemPath);
          } else if (stat.isFile()) {
            scanFile(itemPath);
          }
        });
      } catch (err) {
        // Ignore directory read errors
      }
    };

    scanDir(dir);
    return matches;
  }

  // Validate file permissions
  validateFilePermissions() {
    this.info('Checking file permissions...');

    const envPath = path.join(this.projectRoot, '.env');
    if (fs.existsSync(envPath)) {
      const stats = fs.statSync(envPath);
      const mode = stats.mode & parseInt('777', 8);

      if (mode === parseInt('600', 8)) {
        this.pass('.env file has secure permissions (600)');
      } else {
        this.warn(
          `.env file permissions are ${mode.toString(8)} - should be 600`
        );
      }
    }
  }

  // Validate security headers configuration
  validateSecurityHeaders() {
    this.info('Checking security headers configuration...');

    const securityHeadersPath = path.join(
      this.projectRoot,
      'security-hardening',
      'security-headers.ts'
    );
    if (fs.existsSync(securityHeadersPath)) {
      this.pass('Security headers configuration found');

      const content = fs.readFileSync(securityHeadersPath, 'utf8');

      // Check for important security headers
      const requiredHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy',
      ];

      requiredHeaders.forEach(header => {
        if (content.includes(header)) {
          this.pass(`${header} security header configured`);
        } else {
          this.warn(`${header} security header not found`);
        }
      });
    } else {
      this.warn('Security headers configuration not found');
    }
  }

  // Run all validations
  async run() {
    this.log('\n🔒 OneKeel Swarm Security Validation', 'cyan');
    this.log('=====================================', 'cyan');

    this.validateEnvironment();
    this.validateSourceCode();
    this.validateFilePermissions();
    this.validateSecurityHeaders();

    // Summary
    this.log('\n📊 Security Validation Summary', 'magenta');
    this.log('==============================', 'magenta');

    this.log(`✅ Passed: ${this.passed.length}`, 'green');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    this.log(`❌ Errors: ${this.errors.length}`, 'red');

    if (this.errors.length > 0) {
      this.log('\n🚨 Critical Issues Found:', 'red');
      this.errors.forEach(error => this.log(`  • ${error}`, 'red'));
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'yellow');
      this.warnings.forEach(warning => this.log(`  • ${warning}`, 'yellow'));
    }

    const securityScore = Math.max(
      0,
      100 - this.errors.length * 20 - this.warnings.length * 5
    );
    this.log(
      `\n🎯 Security Score: ${securityScore}/100`,
      securityScore >= 80 ? 'green' : securityScore >= 60 ? 'yellow' : 'red'
    );

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SecurityValidator();
  validator.run().catch(console.error);
}

export default SecurityValidator;
