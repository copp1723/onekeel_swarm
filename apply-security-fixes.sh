#!/bin/bash

# OneKeel Swarm Security Fix Application Script
# This script helps apply the security fixes to the codebase

echo "=================================="
echo "OneKeel Swarm Security Fix Script"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the root of the OneKeel Swarm project"
    exit 1
fi

# Function to backup files
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ Backed up: $file"
    fi
}

# Create security fixes directory if it doesn't exist
if [ ! -d "security-fixes" ]; then
    echo "❌ Error: security-fixes directory not found"
    echo "Please ensure you have the security fixes in the security-fixes/ directory"
    exit 1
fi

echo "🔒 Starting security fix application..."
echo ""

# 1. Backup critical files
echo "📁 Creating backups..."
backup_file "server/routes/auth.ts"
backup_file "server/middleware/auth.ts"
backup_file "server/services/token-service.ts"
backup_file "server/routes/campaigns.ts"
backup_file "server/middleware/validation.ts"
echo ""

# 2. Install required dependencies
echo "📦 Installing security dependencies..."
npm install bcryptjs isomorphic-dompurify
npm install --save-dev @types/bcryptjs @types/dompurify
echo ""

# 3. Apply fixes
echo "🔧 Applying security fixes..."

# Fix 1: Auth routes
if [ -f "security-fixes/fix-1-remove-hardcoded-credentials.ts" ]; then
    cp "security-fixes/fix-1-remove-hardcoded-credentials.ts" "server/routes/auth.ts"
    echo "✅ Applied Fix 1: Removed hardcoded credentials"
fi

# Fix 2: Auth middleware
if [ -f "security-fixes/fix-2-remove-auth-bypass.ts" ]; then
    cp "security-fixes/fix-2-remove-auth-bypass.ts" "server/middleware/auth.ts"
    echo "✅ Applied Fix 2: Removed authentication bypass"
fi

# Fix 3: Token service
if [ -f "security-fixes/fix-3-secure-jwt-config.ts" ]; then
    cp "security-fixes/fix-3-secure-jwt-config.ts" "server/services/token-service.ts"
    echo "✅ Applied Fix 3: Secured JWT configuration"
fi

# Fix 4: SQL injection prevention
if [ -f "security-fixes/fix-4-sql-injection-prevention.ts" ]; then
    cp "security-fixes/fix-4-sql-injection-prevention.ts" "server/routes/campaigns-secure.ts"
    echo "✅ Applied Fix 4: SQL injection prevention (saved as campaigns-secure.ts)"
    echo "   ⚠️  Note: You need to manually update other routes with similar patterns"
fi

# Fix 5: Validation middleware
if [ -f "security-fixes/fix-5-input-validation-mass-assignment.ts" ]; then
    cp "security-fixes/fix-5-input-validation-mass-assignment.ts" "server/middleware/validation-enhanced.ts"
    echo "✅ Applied Fix 5: Enhanced validation (saved as validation-enhanced.ts)"
fi

echo ""

# 4. Generate secure secrets
echo "🔑 Generating secure secrets..."
echo ""
echo "Add these to your .env file:"
echo "=================================="
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n' | cut -c1-64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n' | cut -c1-64)"
echo "SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n' | cut -c1-32)"
echo "ENABLE_ACCESS_LOGS=true"
echo "=================================="
echo ""

# 5. Create admin user script
cat > create-secure-admin.ts << 'EOF'
import bcrypt from 'bcryptjs';
import { db } from './server/db/client';
import { users } from './server/db/schema';
import { nanoid } from 'nanoid';

async function createSecureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@onekeel.com';
  const password = process.env.ADMIN_PASSWORD;
  
  if (!password || password.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be set in .env and be at least 8 characters');
    process.exit(1);
  }
  
  // Check password strength
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
  if (!strongPassword) {
    console.error('❌ ADMIN_PASSWORD must contain uppercase, lowercase, number and special character');
    process.exit(1);
  }
  
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create admin user
    const [admin] = await db.insert(users).values({
      id: nanoid(),
      email,
      username: 'admin',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log('✅ Admin user created successfully:', admin.email);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  }
  
  process.exit(0);
}

createSecureAdmin();
EOF

echo "✅ Created secure admin creation script"
echo ""

# 6. Final instructions
echo "🎯 Next Steps:"
echo "1. Update your .env file with the secure secrets shown above"
echo "2. Set ADMIN_PASSWORD in .env with a strong password"
echo "3. Run: npx tsx create-secure-admin.ts"
echo "4. Update all routes to use the new validation middleware"
echo "5. Test the application thoroughly"
echo "6. Remove the backup files once confirmed working"
echo ""
echo "⚠️  Important Notes:"
echo "- The SQL injection fix was saved as campaigns-secure.ts"
echo "- The validation fix was saved as validation-enhanced.ts"
echo "- You need to manually update imports in your routes"
echo "- Review the VULNERABILITY_REPORT.md for full details"
echo ""
echo "✅ Security fixes applied successfully!"