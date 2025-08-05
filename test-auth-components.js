#!/usr/bin/env tsx

// Test just the auth components without starting server
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { UsersRepository } from './server/db/index.ts';

async function testAuthComponents() {
  console.log('\n🧪 OneKeel Swarm Auth Components Test');
  console.log('====================================\n');

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
    
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.active}`);

    // Step 2: Verify password
    console.log('\n🔐 Step 2: Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log('❌ Password verification failed');
      console.log(`   Stored hash: ${user.passwordHash}`);
      
      // Generate test hash for comparison
      const testHash = await bcrypt.hash(password, 12);
      const testValid = await bcrypt.compare(password, testHash);
      console.log(`   Test hash works: ${testValid}`);
      return;
    }
    
    console.log('✅ Password verified successfully');

    // Step 3: Test JWT components
    console.log('\n🎫 Step 3: Testing JWT components...');
    
    // Import JWT components separately to avoid server startup
    const { generateToken, verifyPassword } = await import('./server/middleware/simple-auth.ts');
    
    // Test simple auth functions
    const isValidSimple = await verifyPassword(password, user.passwordHash);
    console.log(`   Simple auth password check: ${isValidSimple ? 'VALID' : 'INVALID'}`);
    
    if (isValidSimple) {
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });
      
      console.log('✅ JWT token generated successfully');
      console.log(`   Token: ${token.substring(0, 30)}...`);
    }

    console.log('\n🎉 AUTH COMPONENTS TEST COMPLETED!');
    console.log('\nAuth components are working correctly.');

  } catch (error) {
    console.error('❌ Auth components test error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAuthComponents().catch(console.error);