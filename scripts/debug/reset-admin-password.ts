import bcrypt from 'bcryptjs';
import { db, users } from './server/db';
import { eq } from 'drizzle-orm';

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.username, 'admin'))
      .returning({ username: users.username, email: users.email });
    
    if (result.length > 0) {
      console.log('✅ Password reset successful for:', result[0]);
      console.log('New password:', newPassword);
    } else {
      console.log('❌ Admin user not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

resetAdminPassword();