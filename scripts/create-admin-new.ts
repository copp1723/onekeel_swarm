import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { getDb } from '../server/db/client.js';
import { users } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';

config();

async function createAdmin() {
  try {
    console.log('🔐 Creating admin user for nuclear rebuild...');
    console.log('📡 Database URL configured:', !!process.env.DATABASE_URL);

    const username = 'admin';
    const email = 'admin@onekeel.com';
    const password = 'admin123';

    const db = getDb();

    // Test database connection first
    console.log('🔍 Testing database connection...');
    await db.select().from(users).limit(1);
    console.log('✅ Database connection successful');

    // Check if admin already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser) {
      console.log('⚠️  Admin user already exists');
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.is_active}`);
      console.log(`   ID: ${existingUser.id}`);

      // Update password to ensure it works
      console.log('🔄 Updating admin password to ensure it works...');
      const passwordHash = await bcrypt.hash(password, 12);

      await db
        .update(users)
        .set({
          password_hash: passwordHash,
          role: 'admin',
          is_active: true,
        })
        .where(eq(users.username, username));

      console.log('✅ Admin password updated successfully');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
      })
      .returning();

    console.log('✅ Admin user created successfully:');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Active: ${newUser.is_active}`);
    console.log(`   ID: ${newUser.id}`);

    console.log('\n🎯 READY FOR TESTING:');
    console.log('   You can now test the login with:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    console.error('This might be due to:');
    console.error('  1. Database connection issues');
    console.error('  2. Database schema not deployed');
    console.error('  3. Incorrect DATABASE_URL');
    console.error('\nMake sure:');
    console.error('  - DATABASE_URL is correctly set');
    console.error('  - Database is accessible');
    console.error('  - Migrations have been applied');
    process.exit(1);
  }
}

createAdmin();