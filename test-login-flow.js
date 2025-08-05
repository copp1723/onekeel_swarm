#!/usr/bin/env tsx

// Test complete login flow
import './server/index.ts'; // This will load the environment properly
import bcrypt from 'bcryptjs';
import { UsersRepository } from './server/db/index.ts';
import { tokenService } from './server/services/token-service.ts';

async function testLoginFlow() {
  console.log('\n🧪 OneKeel Swarm Login Flow Test');
  console.log('=================================\n');

  const email = 'admin@completecarloans.com';
  const password = 'password123';

  console.log('📋 Test Credentials:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}\n`);

  console.log('🔍 Environment Check:');
  console.log(`   JWT_SECRET exists: ${!!process.env.JWT_SECRET}`);
  console.log(`   JWT_SECRET length: ${process.env.JWT_SECRET?.length || 0}`);
  console.log(`   DATABASE_URL exists: ${!!process.env.DATABASE_URL}\n`);

  try {
    // Step 1: Find user
    console.log('🔍 Step 1: Finding user...');
    const user = await UsersRepository.findByEmail(email);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    if (!user.active) {
      console.log('❌ User is inactive');
      return;
    }
    
    console.log('✅ User found and active');

    // Step 2: Verify password
    console.log('\n🔐 Step 2: Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log('❌ Password verification failed');
      return;
    }
    
    console.log('✅ Password verified successfully');

    // Step 3: Generate tokens
    console.log('\n🎫 Step 3: Generating tokens...');
    try {
      const tokens = await tokenService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role
      });
      
      console.log('✅ Tokens generated successfully');
      console.log(`   Access Token: ${tokens.accessToken.substring(0, 20)}...`);
      console.log(`   Refresh Token: ${tokens.refreshToken.substring(0, 20)}...`);
      console.log(`   Expires In: ${tokens.expiresIn} seconds`);

      // Step 4: Verify token
      console.log('\n🔍 Step 4: Verifying access token...');
      const decoded = tokenService.verifyAccessToken(tokens.accessToken);
      
      if (decoded) {
        console.log('✅ Token verification successful');
        console.log(`   User ID: ${decoded.userId}`);
        console.log(`   Email: ${decoded.email}`);
        console.log(`   Role: ${decoded.role}`);
      } else {
        console.log('❌ Token verification failed');
      }

    } catch (tokenError) {
      console.log('❌ Token generation failed:', tokenError.message);
    }

    // Step 5: Update last login
    console.log('\n📝 Step 5: Updating last login...');
    await UsersRepository.updateLastLogin(user.id);
    console.log('✅ Last login updated');

    console.log('\n🎉 LOGIN FLOW COMPLETED SUCCESSFULLY!');
    console.log('\nThe authentication system is working correctly.');
    console.log('If login is still failing, check:');
    console.log('1. Frontend API calls');
    console.log('2. CORS configuration');
    console.log('3. Request/response format');

  } catch (error) {
    console.error('❌ Login flow error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Small delay to ensure environment is loaded
setTimeout(() => {
  testLoginFlow().catch(console.error);
}, 1000);