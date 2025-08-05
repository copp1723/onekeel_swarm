#!/usr/bin/env tsx

// Debug authentication issues
import bcrypt from 'bcryptjs';
import { UsersRepository } from './server/db/index.ts';

async function debugAuth() {
  console.log('\n🔍 OneKeel Swarm Authentication Debug');
  console.log('=====================================\n');

  // Test credentials
  const testEmail = 'admin@completecarloans.com';
  const testPassword = 'password123';
  const providedHash = '$2a$10$MhKJ9taBTKc4k3X2VvdyF.d6Z1YvQmE6lOpxDVBAqOTJvWAF5PH8K';

  console.log('📋 Test Credentials:');
  console.log(`   Email: ${testEmail}`);
  console.log(`   Password: ${testPassword}`);
  console.log(`   Expected Hash: ${providedHash}\n`);

  // Test 1: Verify provided hash against password
  console.log('🧪 Test 1: Verify provided hash with bcrypt');
  try {
    const isValid = await bcrypt.compare(testPassword, providedHash);
    console.log(`   ✅ Hash verification: ${isValid ? 'VALID' : 'INVALID'}`);
    
    if (!isValid) {
      console.log('   ❌ The provided hash does NOT match the password!');
      
      // Generate a new hash for comparison
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log(`   🔧 Generated hash for '${testPassword}': ${newHash}`);
      
      // Verify the new hash works
      const newHashValid = await bcrypt.compare(testPassword, newHash);
      console.log(`   ✅ New hash verification: ${newHashValid ? 'VALID' : 'INVALID'}`);
    }
  } catch (error) {
    console.log(`   ❌ Error verifying hash: ${error.message}`);
  }

  console.log('\n🔍 Test 2: Database user lookup');
  try {
    const user = await UsersRepository.findByEmail(testEmail);
    
    if (user) {
      console.log('   ✅ User found in database:');
      console.log(`      ID: ${user.id}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Username: ${user.username}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Active: ${user.active}`);
      console.log(`      Password Hash: ${user.passwordHash}`);
      
      // Compare database hash with provided hash
      if (user.passwordHash === providedHash) {
        console.log('   ✅ Database hash matches provided hash');
      } else {
        console.log('   ❌ Database hash DIFFERS from provided hash!');
        console.log(`      Database: ${user.passwordHash}`);
        console.log(`      Provided: ${providedHash}`);
      }
      
      // Test database hash with password
      const dbHashValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`   🔧 Database hash verification: ${dbHashValid ? 'VALID' : 'INVALID'}`);
      
    } else {
      console.log('   ❌ User NOT found in database');
      
      // Check if user exists with different email
      const userByUsername = await UsersRepository.findByUsername('admin');
      if (userByUsername) {
        console.log('   📋 Found user by username "admin":');
        console.log(`      Email: ${userByUsername.email}`);
        console.log(`      Active: ${userByUsername.active}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }

  console.log('\n🔍 Test 3: Environment variables');
  console.log(`   JWT_SECRET exists: ${!!process.env.JWT_SECRET}`);
  console.log(`   JWT_SECRET length: ${process.env.JWT_SECRET?.length || 0}`);
  console.log(`   DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

  console.log('\n🔍 Test 4: Hash generation test');
  try {
    // Test different bcrypt rounds
    const rounds = [10, 12];
    for (const round of rounds) {
      const hash = await bcrypt.hash(testPassword, round);
      const valid = await bcrypt.compare(testPassword, hash);
      console.log(`   Round ${round}: ${hash} - Valid: ${valid}`);
    }
  } catch (error) {
    console.log(`   ❌ Hash generation error: ${error.message}`);
  }

  console.log('\n📊 Summary:');
  console.log('   Check the results above to identify the authentication issue.');
  console.log('   Common issues:');
  console.log('   - Password hash mismatch');
  console.log('   - User not found or inactive');
  console.log('   - Database connection problems');
  console.log('   - JWT secret configuration');
}

// Run the debug script
debugAuth().catch(console.error);

export { debugAuth };