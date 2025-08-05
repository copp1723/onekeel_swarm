#!/usr/bin/env node

/**
 * UI Integration Test
 * Tests the complete login flow and UI components
 */

import axios from 'axios';

const SERVER_URL = 'http://localhost:5001';
const CLIENT_URL = 'http://localhost:5173';

async function testServerEndpoints() {
  console.log('🔍 Testing Server Endpoints...');
  
  try {
    // Test health endpoint
    console.log('📊 Testing health endpoint...');
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // Test login endpoint
    console.log('🔐 Testing login endpoint...');
    const loginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login successful:', {
      hasToken: !!loginResponse.data.token,
      user: loginResponse.data.user
    });

    const token = loginResponse.data.token;

    // Test /me endpoint
    console.log('👤 Testing /me endpoint...');
    const meResponse = await axios.get(`${SERVER_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ /me endpoint successful:', meResponse.data);

    // Test logout endpoint
    console.log('🚪 Testing logout endpoint...');
    const logoutResponse = await axios.post(`${SERVER_URL}/api/auth/logout`, {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Logout successful:', logoutResponse.data);

    return true;
  } catch (error) {
    console.error('❌ Server endpoint test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testClientAccess() {
  console.log('\n🌐 Testing Client Access...');
  
  try {
    const response = await axios.get(CLIENT_URL);
    console.log('✅ Client accessible:', {
      status: response.status,
      hasHtml: response.data.includes('<html>'),
      hasReact: response.data.includes('react'),
      hasVite: response.data.includes('vite')
    });
    return true;
  } catch (error) {
    console.error('❌ Client access test failed:', error.message);
    return false;
  }
}

async function testCorsConfiguration() {
  console.log('\n🔗 Testing CORS Configuration...');
  
  try {
    // Test preflight request
    const response = await axios.options(`${SERVER_URL}/api/auth/login`, {
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('✅ CORS preflight successful:', {
      status: response.status,
      allowOrigin: response.headers['access-control-allow-origin'],
      allowMethods: response.headers['access-control-allow-methods']
    });
    return true;
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting UI Integration Tests...\n');
  
  const results = {
    server: await testServerEndpoints(),
    client: await testClientAccess(),
    cors: await testCorsConfiguration()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`Server Endpoints: ${results.server ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Client Access: ${results.client ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CORS Configuration: ${results.cors ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🎯 Overall Status:');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - Ready for production deployment!');
    console.log('\n📋 Manual Testing Steps:');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. You should see the login form');
    console.log('3. Login with username: admin, password: admin123');
    console.log('4. You should see the dashboard after successful login');
    console.log('5. Verify no console errors in browser dev tools');
  } else {
    console.log('❌ SOME TESTS FAILED - Fix issues before deployment');
  }
  
  return allPassed;
}

// Run the tests
runAllTests().catch(console.error);
