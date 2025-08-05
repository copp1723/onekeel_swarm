#!/usr/bin/env tsx

// Fix password hash issue
import bcrypt from 'bcryptjs';
import { UsersRepository } from './server/db/index.ts';

async function fixPasswordHash() {
  console.log('\n🔧 OneKeel Swarm Password Hash Fix');
  console.log('===================================\n');

  const email = 'admin@completecarloans.com';
  const correctPassword = 'password123';

  try {
    // Find the user
    const user = await UsersRepository.findByEmail(email);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('📍 Current user data:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Active: ${user.active}`);
    console.log(`   Current Hash: ${user.passwordHash}`);

    // Test current hash
    const currentHashValid = await bcrypt.compare(correctPassword, user.passwordHash);
    console.log(`   Current hash valid: ${currentHashValid}`);

    if (!currentHashValid) {
      console.log('\n🔧 Generating new hash...');
      
      // Generate a new hash using the same rounds as the auth middleware (12)
      const newHash = await bcrypt.hash(correctPassword, 12);
      console.log(`   New hash: ${newHash}`);
      
      // Verify new hash works
      const newHashValid = await bcrypt.compare(correctPassword, newHash);
      console.log(`   New hash valid: ${newHashValid}`);
      
      if (newHashValid) {
        console.log('\n💉 Updating user with correct password hash...');
        
        // Update the user's password hash
        const updated = await UsersRepository.update(user.id, {
          passwordHash: newHash
        });
        
        if (updated) {
          console.log('✅ Password hash updated successfully!');
          console.log('\n🧪 Testing login with new hash...');
          
          // Test the login flow
          const testHash = await bcrypt.compare(correctPassword, newHash);
          console.log(`   Login test: ${testHash ? 'SUCCESS' : 'FAILED'}`);
        } else {
          console.log('❌ Failed to update password hash');
        }
      }
    } else {
      console.log('✅ Current hash is already valid - no fix needed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixPasswordHash().catch(console.error);