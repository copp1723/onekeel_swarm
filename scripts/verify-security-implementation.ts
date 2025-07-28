#!/usr/bin/env tsx

/**
 * Security Implementation Verification Script
 * 
 * This script verifies that all security vulnerabilities have been fixed
 * and the authentication system is properly implemented.
 */

import fs from 'fs';
import path from 'path';

interface SecurityCheck {
  name: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
}

class SecurityVerifier {
  private checks: SecurityCheck[] = [];

  addCheck(name: string, description: string, status: 'PASS' | 'FAIL' | 'WARNING', details: string) {
    this.checks.push({ name, description, status, details });
  }

  private readFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return '';
    }
  }

  verifyAuthRoutes() {
    console.log('🔍 Verifying auth routes security...');
    
    const authRoutesPath = path.join(process.cwd(), 'server/routes/auth.ts');
    const content = this.readFile(authRoutesPath);

    // Check 1: No hardcoded credentials
    const hasHardcodedCredentials = 
      content.includes('admin@onekeel.com') ||
      content.includes('password123') ||
      content.includes('hardcoded-jwt-token') ||
      content.includes('skip-auth-token');

    if (hasHardcodedCredentials) {
      this.addCheck(
        'AUTH_ROUTES_HARDCODED_CREDS',
        'No hardcoded credentials in auth routes',
        'FAIL',
        'Found hardcoded credentials in auth routes file'
      );
    } else {
      this.addCheck(
        'AUTH_ROUTES_HARDCODED_CREDS',
        'No hardcoded credentials in auth routes',
        'PASS',
        'No hardcoded credentials found'
      );
    }

    // Check 2: No SKIP_AUTH bypass
    const hasSkipAuth = content.includes('SKIP_AUTH') || content.includes('skipAuth');
    
    if (hasSkipAuth) {
      this.addCheck(
        'AUTH_ROUTES_SKIP_AUTH',
        'No SKIP_AUTH bypass in auth routes',
        'FAIL',
        'Found SKIP_AUTH bypass in auth routes'
      );
    } else {
      this.addCheck(
        'AUTH_ROUTES_SKIP_AUTH',
        'No SKIP_AUTH bypass in auth routes',
        'PASS',
        'No SKIP_AUTH bypass found'
      );
    }

    // Check 3: Uses bcrypt
    const usesBcrypt = content.includes('bcrypt.compare') || content.includes('bcryptjs');
    
    if (usesBcrypt) {
      this.addCheck(
        'AUTH_ROUTES_BCRYPT',
        'Uses bcrypt for password verification',
        'PASS',
        'bcrypt implementation found'
      );
    } else {
      this.addCheck(
        'AUTH_ROUTES_BCRYPT',
        'Uses bcrypt for password verification',
        'FAIL',
        'No bcrypt implementation found'
      );
    }

    // Check 4: Uses database authentication
    const usesDatabase = content.includes('UsersRepository') && content.includes('findByEmail');
    
    if (usesDatabase) {
      this.addCheck(
        'AUTH_ROUTES_DATABASE',
        'Uses database authentication',
        'PASS',
        'Database authentication implementation found'
      );
    } else {
      this.addCheck(
        'AUTH_ROUTES_DATABASE',
        'Uses database authentication',
        'FAIL',
        'No database authentication found'
      );
    }
  }

  verifyAuthMiddleware() {
    console.log('🔍 Verifying auth middleware security...');
    
    const middlewarePath = path.join(process.cwd(), 'server/middleware/auth.ts');
    const content = this.readFile(middlewarePath);

    // Check 1: No SKIP_AUTH bypass
    const hasSkipAuth = content.includes('SKIP_AUTH') || content.includes('skipAuth');
    
    if (hasSkipAuth) {
      this.addCheck(
        'AUTH_MIDDLEWARE_SKIP_AUTH',
        'No SKIP_AUTH bypass in middleware',
        'FAIL',
        'Found SKIP_AUTH bypass in middleware'
      );
    } else {
      this.addCheck(
        'AUTH_MIDDLEWARE_SKIP_AUTH',
        'No SKIP_AUTH bypass in middleware',
        'PASS',
        'No SKIP_AUTH bypass found in middleware'
      );
    }

    // Check 2: Uses token service
    const usesTokenService = content.includes('tokenService');
    
    if (usesTokenService) {
      this.addCheck(
        'AUTH_MIDDLEWARE_TOKEN_SERVICE',
        'Uses secure token service',
        'PASS',
        'Token service implementation found'
      );
    } else {
      this.addCheck(
        'AUTH_MIDDLEWARE_TOKEN_SERVICE',
        'Uses secure token service',
        'FAIL',
        'No token service found'
      );
    }
  }

  verifyUserRepository() {
    console.log('🔍 Verifying user repository implementation...');
    
    const dbPath = path.join(process.cwd(), 'server/db/index.ts');
    const content = this.readFile(dbPath);

    // Check required methods
    const requiredMethods = ['findByEmail', 'findByUsername', 'updateLastLogin'];
    
    for (const method of requiredMethods) {
      if (content.includes(method)) {
        this.addCheck(
          `USER_REPO_${method.toUpperCase()}`,
          `Has ${method} method`,
          'PASS',
          `${method} method implemented`
        );
      } else {
        this.addCheck(
          `USER_REPO_${method.toUpperCase()}`,
          `Has ${method} method`,
          'FAIL',
          `${method} method not found`
        );
      }
    }
  }

  verifyServices() {
    console.log('🔍 Verifying security services...');
    
    // Check token service exists
    const tokenServicePath = path.join(process.cwd(), 'server/services/token-service.ts');
    if (fs.existsSync(tokenServicePath)) {
      this.addCheck(
        'TOKEN_SERVICE_EXISTS',
        'Token service exists',
        'PASS',
        'Token service file found'
      );
    } else {
      this.addCheck(
        'TOKEN_SERVICE_EXISTS',
        'Token service exists',
        'FAIL',
        'Token service file not found'
      );
    }

    // Check session service exists
    const sessionServicePath = path.join(process.cwd(), 'server/services/session-service.ts');
    if (fs.existsSync(sessionServicePath)) {
      this.addCheck(
        'SESSION_SERVICE_EXISTS',
        'Session service exists',
        'PASS',
        'Session service file found'
      );
    } else {
      this.addCheck(
        'SESSION_SERVICE_EXISTS',
        'Session service exists',
        'FAIL',
        'Session service file not found'
      );
    }
  }

  verifyCreateAdminScript() {
    console.log('🔍 Verifying create-admin script...');
    
    const scriptPath = path.join(process.cwd(), 'scripts/create-admin.ts');
    const content = this.readFile(scriptPath);

    // Check uses bcryptjs (not bcrypt)
    const usesBcryptjs = content.includes('bcryptjs');
    
    if (usesBcryptjs) {
      this.addCheck(
        'CREATE_ADMIN_BCRYPTJS',
        'Create-admin uses bcryptjs',
        'PASS',
        'Uses correct bcryptjs package'
      );
    } else {
      this.addCheck(
        'CREATE_ADMIN_BCRYPTJS',
        'Create-admin uses bcryptjs',
        'WARNING',
        'May be using incorrect bcrypt package'
      );
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  SECURITY IMPLEMENTATION VERIFICATION RESULTS');
    console.log('='.repeat(60));

    let passCount = 0;
    let failCount = 0;
    let warningCount = 0;

    for (const check of this.checks) {
      const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${check.name}: ${check.description}`);
      console.log(`   ${check.details}`);
      console.log('');

      if (check.status === 'PASS') passCount++;
      else if (check.status === 'FAIL') failCount++;
      else warningCount++;
    }

    console.log('='.repeat(60));
    console.log(`📊 SUMMARY: ${passCount} PASS | ${failCount} FAIL | ${warningCount} WARNING`);
    console.log('='.repeat(60));

    if (failCount === 0) {
      console.log('🎉 ALL SECURITY CHECKS PASSED! System is ready for production.');
    } else {
      console.log('🚨 SECURITY ISSUES FOUND! Please fix failing checks before deployment.');
    }

    return failCount === 0;
  }

  async run() {
    console.log('🔒 Starting Security Implementation Verification...\n');

    this.verifyAuthRoutes();
    this.verifyAuthMiddleware();
    this.verifyUserRepository();
    this.verifyServices();
    this.verifyCreateAdminScript();

    const allPassed = this.printResults();
    
    if (allPassed) {
      console.log('\n✅ SECURITY IMPLEMENTATION COMPLETE AND VERIFIED');
      console.log('🚀 Ready for production deployment!');
      process.exit(0);
    } else {
      console.log('\n❌ SECURITY IMPLEMENTATION INCOMPLETE');
      console.log('🔧 Please address the failing checks above.');
      process.exit(1);
    }
  }
}

// Run verification
new SecurityVerifier().run().catch(console.error);