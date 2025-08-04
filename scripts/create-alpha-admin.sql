-- Create alpha test admin user
-- Password: alpha123!
-- Hash: $2a$10$LuuvcrWFyFqjYUgW6yqxNuXMwNufe/f/Lci8iILeS6kE./LTtRCwK

-- Check if user exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@alpha.test') THEN
        INSERT INTO users (
            email,
            username,
            password_hash,
            first_name,
            last_name,
            role,
            active,
            created_at,
            updated_at
        ) VALUES (
            'admin@alpha.test',
            'admin',
            '$2a$10$LuuvcrWFyFqjYUgW6yqxNuXMwNufe/f/Lci8iILeS6kE./LTtRCwK',
            'Alpha',
            'Admin',
            'admin',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Admin user created successfully!';
    ELSE
        RAISE NOTICE 'Admin user already exists!';
    END IF;
END $$;