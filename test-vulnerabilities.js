#!/usr/bin/env node

import http from 'http';
import https from 'https';

// Test configuration
const API_BASE_URL = 'http://localhost:5000/api';
const tests = [];

// Helper function to make requests
async function makeRequest(method, path, body = null, headers = {}) {
  const url = new URL(API_BASE_URL + path);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          parsedBody: tryParseJSON(data)
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

// Test 1: Hardcoded credentials vulnerability
tests.push(async () => {
  console.log('\n=== TEST 1: Hardcoded Admin Credentials ===');
  const res = await makeRequest('POST', '/auth/login', {
    username: 'admin@onekeel.com',
    password: 'password123'
  });
  
  if (res.status === 200) {
    console.log('❌ CRITICAL: Hardcoded admin credentials work!');
    console.log('Response:', res.parsedBody);
    return { vulnerability: 'hardcoded-credentials', severity: 'critical' };
  } else {
    console.log('✅ Hardcoded credentials rejected');
  }
});

// Test 2: Authentication bypass via SKIP_AUTH
tests.push(async () => {
  console.log('\n=== TEST 2: Authentication Bypass ===');
  // Try accessing protected route without auth
  const res = await makeRequest('GET', '/users');
  
  if (res.status === 200) {
    console.log('❌ CRITICAL: Can access protected routes without authentication!');
    return { vulnerability: 'auth-bypass', severity: 'critical' };
  } else {
    console.log('✅ Protected routes require authentication');
  }
});

// Test 3: SQL Injection in campaigns
tests.push(async () => {
  console.log('\n=== TEST 3: SQL Injection Tests ===');
  
  // Test SQL injection in search parameter
  const sqlPayloads = [
    "'; DROP TABLE campaigns; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "\\'; DROP TABLE campaigns; --"
  ];
  
  for (const payload of sqlPayloads) {
    const res = await makeRequest('GET', `/campaigns?search=${encodeURIComponent(payload)}`);
    console.log(`Testing payload: ${payload}`);
    console.log(`Response status: ${res.status}`);
    
    if (res.status === 500 || (res.parsedBody && res.parsedBody.error && res.parsedBody.error.includes('syntax'))) {
      console.log('❌ Potential SQL injection vulnerability detected!');
      return { vulnerability: 'sql-injection', severity: 'high' };
    }
  }
  
  console.log('✅ SQL injection tests passed');
});

// Test 4: Missing input validation
tests.push(async () => {
  console.log('\n=== TEST 4: Input Validation Tests ===');
  
  // Test invalid data types
  const invalidInputs = [
    { path: '/campaigns', method: 'POST', body: { name: null } },
    { path: '/campaigns', method: 'POST', body: { name: '', type: 'invalid_type' } },
    { path: '/campaigns', method: 'POST', body: { name: 'a'.repeat(1000) } },
    { path: '/leads', method: 'POST', body: { email: 'not-an-email' } },
    { path: '/leads', method: 'POST', body: { creditScore: 'not-a-number' } }
  ];
  
  const validationIssues = [];
  
  for (const test of invalidInputs) {
    const res = await makeRequest(test.method, test.path, test.body);
    if (res.status === 201 || res.status === 200) {
      console.log(`❌ Invalid input accepted: ${JSON.stringify(test.body)}`);
      validationIssues.push(test);
    }
  }
  
  if (validationIssues.length > 0) {
    console.log('❌ Input validation issues found:', validationIssues.length);
    return { vulnerability: 'input-validation', severity: 'medium' };
  } else {
    console.log('✅ Input validation working properly');
  }
});

// Test 5: Rate limiting
tests.push(async () => {
  console.log('\n=== TEST 5: Rate Limiting Tests ===');
  
  const promises = [];
  for (let i = 0; i < 200; i++) {
    promises.push(makeRequest('GET', '/health'));
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.status === 429);
  
  if (rateLimited.length === 0) {
    console.log('❌ No rate limiting detected after 200 requests!');
    return { vulnerability: 'no-rate-limiting', severity: 'medium' };
  } else {
    console.log(`✅ Rate limiting working: ${rateLimited.length} requests blocked`);
  }
});

// Test 6: Information disclosure
tests.push(async () => {
  console.log('\n=== TEST 6: Information Disclosure Tests ===');
  
  // Test error messages
  const res = await makeRequest('GET', '/campaigns/invalid-id');
  
  if (res.body.includes('pg_') || res.body.includes('postgres') || res.body.includes('stack')) {
    console.log('❌ Database error details exposed in response!');
    console.log('Response:', res.body);
    return { vulnerability: 'info-disclosure', severity: 'medium' };
  } else {
    console.log('✅ Error messages properly sanitized');
  }
});

// Test 7: CORS misconfiguration
tests.push(async () => {
  console.log('\n=== TEST 7: CORS Configuration Tests ===');
  
  const res = await makeRequest('GET', '/health', null, {
    'Origin': 'http://evil.com'
  });
  
  if (res.headers['access-control-allow-origin'] === 'http://evil.com' || 
      res.headers['access-control-allow-origin'] === '*') {
    console.log('❌ CORS allows any origin!');
    return { vulnerability: 'cors-misconfiguration', severity: 'medium' };
  } else {
    console.log('✅ CORS properly configured');
  }
});

// Test 8: Path traversal
tests.push(async () => {
  console.log('\n=== TEST 8: Path Traversal Tests ===');
  
  const pathPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
  ];
  
  for (const payload of pathPayloads) {
    const res = await makeRequest('GET', `/templates/${payload}`);
    if (res.status === 200 && (res.body.includes('root:') || res.body.includes('Administrator'))) {
      console.log('❌ Path traversal vulnerability detected!');
      return { vulnerability: 'path-traversal', severity: 'critical' };
    }
  }
  
  console.log('✅ Path traversal tests passed');
});

// Test 9: JWT/Session security
tests.push(async () => {
  console.log('\n=== TEST 9: JWT/Session Security Tests ===');
  
  // Try with manipulated token
  const res = await makeRequest('GET', '/auth/me', null, {
    'Authorization': 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4ifQ.'
  });
  
  if (res.status === 200) {
    console.log('❌ JWT accepts "none" algorithm!');
    return { vulnerability: 'jwt-none-algorithm', severity: 'critical' };
  } else {
    console.log('✅ JWT properly validates algorithm');
  }
});

// Test 10: Mass assignment
tests.push(async () => {
  console.log('\n=== TEST 10: Mass Assignment Tests ===');
  
  // Try to set admin role via mass assignment
  const res = await makeRequest('POST', '/leads', {
    email: 'test@example.com',
    role: 'admin',
    active: false,
    passwordHash: 'malicious'
  });
  
  if (res.status === 201 && res.parsedBody && (res.parsedBody.role === 'admin' || res.parsedBody.passwordHash)) {
    console.log('❌ Mass assignment vulnerability - can set protected fields!');
    return { vulnerability: 'mass-assignment', severity: 'high' };
  } else {
    console.log('✅ Mass assignment protection working');
  }
});

// Run all tests
async function runTests() {
  console.log('Starting vulnerability tests...');
  console.log('Target:', API_BASE_URL);
  console.log('=' .repeat(50));
  
  const vulnerabilities = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        vulnerabilities.push(result);
      }
    } catch (error) {
      console.log('Test error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('VULNERABILITY SUMMARY:');
  console.log('='.repeat(50));
  
  if (vulnerabilities.length === 0) {
    console.log('✅ No vulnerabilities found!');
  } else {
    console.log(`❌ Found ${vulnerabilities.length} vulnerabilities:`);
    vulnerabilities.forEach((v, i) => {
      console.log(`${i + 1}. ${v.vulnerability} (Severity: ${v.severity})`);
    });
  }
}

// Check if server is running
http.get(API_BASE_URL + '/health', (res) => {
  if (res.statusCode === 200) {
    runTests();
  } else {
    console.error('Server not responding at', API_BASE_URL);
  }
}).on('error', (err) => {
  console.error('Cannot connect to server:', err.message);
  console.log('Please ensure the server is running on port 5000');
});