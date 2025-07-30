#!/bin/bash
# Fix the password hash column mismatch issue

echo "🔧 Fixing password hash column mismatch..."

psql $DATABASE_URL << 'EOF'
-- Fix the password hash column mismatch
-- The database has both passwordHash and password_hash columns
-- The application uses passwordHash (camelCase)

UPDATE users
SET "passwordHash" = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email IN ('admin@completecarloans.com', 'josh.copp@onekeel.ai');

-- Also create the second admin user if missing
INSERT INTO users (email, username, "passwordHash", first_name, last_name, role, active, created_at, updated_at)
VALUES
    ('josh.copp@onekeel.ai', 'josh.copp', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Josh', 'Copp', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
    "passwordHash" = EXCLUDED."passwordHash",
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    active = EXCLUDED.active;

-- Verify both users have password hashes
SELECT 'Admin users with passwords:' as info;
SELECT email, username, role, active,
       CASE WHEN "passwordHash" IS NOT NULL THEN '✅ Has Password' ELSE '❌ Missing Password' END as password_status
FROM users
WHERE role = 'admin';
EOF

echo "✅ Password hash fix completed!"
echo "🔐 You can now login with:"
echo "  Email: admin@completecarloans.com"
echo "  Password: password123"
echo "  OR"
echo "  Email: josh.copp@onekeel.ai"
echo "  Password: password123"
