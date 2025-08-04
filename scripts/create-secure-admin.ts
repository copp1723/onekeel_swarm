import bcryptjs from 'bcryptjs';
import { users } from '../server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Load production environment if specified
const envFile = process.argv.includes('--production')
  ? '.env.production'
  : '.env';
dotenv.config({ path: envFile });

// Create direct database connection
const connectionString =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/ccl3_swarm';
const sql = postgres(connectionString, {
  ssl: connectionString.includes('render.com') ? 'require' : false,
});
const db = drizzle(sql, { schema: { users } });

async function createSecureAdmin() {
  console.log('🔐 Creating secure admin user...');

  // Get admin credentials from environment or prompt
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@OneKeelSwarm.com';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';

  // Generate a secure password
  const securePassword = generateSecurePassword();

  try {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin user already exists. Updating password...');

      // Hash the new password
      const passwordHash = await bcryptjs.hash(securePassword, 12);

      // Update existing admin
      await db
        .update(users)
        .set({
          passwordHash,
          active: true,
          role: 'admin',
          updatedAt: new Date(),
        })
        .where(eq(users.email, adminEmail));

      console.log('✅ Admin password updated successfully!');
    } else {
      // Hash the password
      const passwordHash = await bcryptjs.hash(securePassword, 12);

      // Create new admin
      const newAdmin = {
        id: uuidv4(),
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin' as const,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(users).values(newAdmin);
      console.log('✅ Admin user created successfully!');
    }

    console.log('\\n📧 Admin Email:', adminEmail);
    console.log('🔑 Secure Password:', securePassword);
    console.log(
      '\\n⚠️  IMPORTANT: Save this password securely and change it after first login!'
    );
    console.log('\\n🚀 To update production, run:');
    console.log(
      '   1. Update SKIP_AUTH=false in your Render environment variables'
    );
    console.log('   2. Restart your Render service');
    console.log('   3. Login with the credentials above');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

function generateSecurePassword(): string {
  const length = 16;
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  let password = '';

  // Ensure at least one of each required character type
  password += 'A'; // uppercase
  password += 'a'; // lowercase
  password += '1'; // number
  password += '!'; // special char

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

// Run the script
createSecureAdmin();
