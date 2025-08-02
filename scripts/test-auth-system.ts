import axios from 'axios';
import dotenv from 'dotenv';

// Load environment
const envFile = process.argv.includes('--production')
  ? '.env.production'
  : '.env';
dotenv.config({ path: envFile });

const API_URL = process.env.API_BASE_URL || 'http://localhost:5001';

async function testAuthSystem() {
  console.log('🧪 Testing Authentication System...');
  console.log('📍 API URL:', API_URL);

  const tests = {
    hardcodedBypass: false,
    skipAuthBypass: false,
    validLogin: false,
    invalidLogin: false,
    tokenValidation: false,
    protectedRoute: false,
  };

  try {
    // Test 1: Check for hardcoded credentials bypass
    console.log('\\n1️⃣ Testing hardcoded credentials...');
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username: 'admin@onekeel.com',
        password: 'password123',
      });

      if (response.data.success) {
        console.log('❌ FAIL: Hardcoded credentials still work!');
        tests.hardcodedBypass = true;
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ PASS: Hardcoded credentials rejected');
      }
    }

    // Test 2: Check SKIP_AUTH bypass
    console.log('\\n2️⃣ Testing SKIP_AUTH bypass...');
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: 'Bearer skip-auth-token' },
      });

      if (response.data.user && !response.headers['x-auth-verified']) {
        console.log('❌ FAIL: SKIP_AUTH bypass is active!');
        tests.skipAuthBypass = true;
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ PASS: SKIP_AUTH bypass disabled');
      }
    }

    // Test 3: Valid login with real credentials
    console.log('\\n3️⃣ Testing valid login...');
    const validCredentials = {
      username: 'admin@OneKeelSwarm.com',
      password: process.argv[2] || 'q1YXk*Y!-LrA&Mam', // Pass password as argument
    };

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        validCredentials
      );

      if (response.data.success && response.data.accessToken) {
        console.log('✅ PASS: Valid login successful');
        console.log('   - User:', response.data.user.email);
        console.log('   - Role:', response.data.user.role);
        console.log(
          '   - Token:',
          response.data.accessToken.substring(0, 20) + '...'
        );
        tests.validLogin = true;

        // Save token for further tests
        const token = response.data.accessToken;

        // Test 4: Token validation
        console.log('\\n4️⃣ Testing token validation...');
        try {
          const meResponse = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (meResponse.data.user) {
            console.log('✅ PASS: Token validation works');
            tests.tokenValidation = true;
          }
        } catch (error) {
          console.log('❌ FAIL: Token validation failed');
        }

        // Test 5: Protected route access
        console.log('\\n5️⃣ Testing protected route access...');
        try {
          const usersResponse = await axios.get(`${API_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (usersResponse.data.success) {
            console.log('✅ PASS: Protected route accessible with valid token');
            tests.protectedRoute = true;
          }
        } catch (error) {
          console.log('❌ FAIL: Protected route not accessible');
        }
      }
    } catch (error: any) {
      console.log('❌ FAIL: Valid login failed');
      console.log(
        '   Error:',
        error.response?.data?.error?.message || error.message
      );
    }

    // Test 6: Invalid login
    console.log('\\n6️⃣ Testing invalid login...');
    try {
      await axios.post(`${API_URL}/api/auth/login`, {
        username: 'admin@OneKeelSwarm.com',
        password: 'wrongpassword',
      });
      console.log('❌ FAIL: Invalid login was accepted!');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ PASS: Invalid login rejected');
        tests.invalidLogin = true;
      }
    }

    // Summary
    console.log('\\n📊 TEST SUMMARY:');
    console.log('================');
    const passedTests = Object.values(tests).filter(t => t === true).length;
    const totalTests = Object.keys(tests).length;

    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

    if (tests.hardcodedBypass || tests.skipAuthBypass) {
      console.log('\\n🚨 CRITICAL SECURITY ISSUES DETECTED!');
      console.log('The system is NOT ready for production!');
      process.exit(1);
    } else if (passedTests === totalTests) {
      console.log(
        '\\n🎉 All tests passed! The auth system is secure and ready!'
      );
    } else {
      console.log(
        '\\n⚠️  Some tests failed. Please review the auth implementation.'
      );
    }
  } catch (error) {
    console.error('\\n❌ Test suite error:', error);
    process.exit(1);
  }
}

// Run tests
testAuthSystem();
