-- Fix production campaign creation errors
-- This script addresses all the database schema issues causing 400, 500, and 401 errors

-- Enable uuid extension if not available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Fix campaigns table structure
DO $$ 
BEGIN
    -- Ensure campaigns table exists
    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'drip',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Add missing columns with proper names
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'description'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'status'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        RAISE NOTICE 'Added status column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'target_criteria'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN target_criteria JSONB DEFAULT '{}';
        RAISE NOTICE 'Added target_criteria column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'settings'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added settings column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'start_date'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN start_date TIMESTAMP;
        RAISE NOTICE 'Added start_date column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'end_date'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN end_date TIMESTAMP;
        RAISE NOTICE 'Added end_date column to campaigns';
    END IF;

    -- Add camelCase aliases for API compatibility
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "createdAt" TIMESTAMP;
        UPDATE campaigns SET "createdAt" = created_at WHERE "createdAt" IS NULL;
        RAISE NOTICE 'Added createdAt column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "updatedAt" TIMESTAMP;
        UPDATE campaigns SET "updatedAt" = updated_at WHERE "updatedAt" IS NULL;
        RAISE NOTICE 'Added updatedAt column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'targetCriteria'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "targetCriteria" JSONB DEFAULT '{}';
        UPDATE campaigns SET "targetCriteria" = target_criteria WHERE "targetCriteria" IS NULL;
        RAISE NOTICE 'Added targetCriteria column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'startDate'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "startDate" TIMESTAMP;
        UPDATE campaigns SET "startDate" = start_date WHERE "startDate" IS NULL;
        RAISE NOTICE 'Added startDate column to campaigns';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'endDate'
    ) THEN
        ALTER TABLE campaigns ADD COLUMN "endDate" TIMESTAMP;
        UPDATE campaigns SET "endDate" = end_date WHERE "endDate" IS NULL;
        RAISE NOTICE 'Added endDate column to campaigns';
    END IF;
END $$;

-- 2. Fix leads table structure
DO $$ 
BEGIN
    -- Ensure leads table exists
    CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email VARCHAR(255),
        source VARCHAR(100) DEFAULT 'website',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Add missing columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE leads ADD COLUMN first_name VARCHAR(255);
        RAISE NOTICE 'Added first_name column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE leads ADD COLUMN last_name VARCHAR(255);
        RAISE NOTICE 'Added last_name column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'phone'
    ) THEN
        ALTER TABLE leads ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'status'
    ) THEN
        ALTER TABLE leads ADD COLUMN status VARCHAR(50) DEFAULT 'new';
        RAISE NOTICE 'Added status column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'assigned_channel'
    ) THEN
        ALTER TABLE leads ADD COLUMN assigned_channel VARCHAR(50);
        RAISE NOTICE 'Added assigned_channel column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN campaign_id TEXT REFERENCES campaigns(id);
        RAISE NOTICE 'Added campaign_id column to leads';
    END IF;

    -- Add camelCase aliases for API compatibility
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'firstName'
    ) THEN
        ALTER TABLE leads ADD COLUMN "firstName" VARCHAR(255);
        UPDATE leads SET "firstName" = first_name WHERE "firstName" IS NULL;
        RAISE NOTICE 'Added firstName column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lastName'
    ) THEN
        ALTER TABLE leads ADD COLUMN "lastName" VARCHAR(255);
        UPDATE leads SET "lastName" = last_name WHERE "lastName" IS NULL;
        RAISE NOTICE 'Added lastName column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE leads ADD COLUMN "createdAt" TIMESTAMP;
        UPDATE leads SET "createdAt" = created_at WHERE "createdAt" IS NULL;
        RAISE NOTICE 'Added createdAt column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'updatedAt'
    ) THEN
        ALTER TABLE leads ADD COLUMN "updatedAt" TIMESTAMP;
        UPDATE leads SET "updatedAt" = updated_at WHERE "updatedAt" IS NULL;
        RAISE NOTICE 'Added updatedAt column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'assignedChannel'
    ) THEN
        ALTER TABLE leads ADD COLUMN "assignedChannel" VARCHAR(50);
        UPDATE leads SET "assignedChannel" = assigned_channel WHERE "assignedChannel" IS NULL;
        RAISE NOTICE 'Added assignedChannel column to leads';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'campaignId'
    ) THEN
        ALTER TABLE leads ADD COLUMN "campaignId" TEXT;
        UPDATE leads SET "campaignId" = campaign_id WHERE "campaignId" IS NULL;
        RAISE NOTICE 'Added campaignId column to leads';
    END IF;
END $$;

-- 3. Fix lead_campaign_enrollments table
CREATE TABLE IF NOT EXISTS lead_campaign_enrollments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT REFERENCES leads(id),
    campaign_id TEXT REFERENCES campaigns(id),
    status VARCHAR(50) DEFAULT 'active',
    completed BOOLEAN DEFAULT false,
    current_step INTEGER DEFAULT 0,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    last_processed_at TIMESTAMP
);

-- Add camelCase columns for API compatibility
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'leadId'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN "leadId" TEXT;
        UPDATE lead_campaign_enrollments SET "leadId" = lead_id WHERE "leadId" IS NULL;
        RAISE NOTICE 'Added leadId column to lead_campaign_enrollments';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'campaignId'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN "campaignId" TEXT;
        UPDATE lead_campaign_enrollments SET "campaignId" = campaign_id WHERE "campaignId" IS NULL;
        RAISE NOTICE 'Added campaignId column to lead_campaign_enrollments';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'currentStep'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN "currentStep" INTEGER DEFAULT 0;
        UPDATE lead_campaign_enrollments SET "currentStep" = current_step WHERE "currentStep" IS NULL;
        RAISE NOTICE 'Added currentStep column to lead_campaign_enrollments';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'enrolledAt'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN "enrolledAt" TIMESTAMP;
        UPDATE lead_campaign_enrollments SET "enrolledAt" = enrolled_at WHERE "enrolledAt" IS NULL;
        RAISE NOTICE 'Added enrolledAt column to lead_campaign_enrollments';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_campaign_enrollments' AND column_name = 'completedAt'
    ) THEN
        ALTER TABLE lead_campaign_enrollments ADD COLUMN "completedAt" TIMESTAMP;
        UPDATE lead_campaign_enrollments SET "completedAt" = completed_at WHERE "completedAt" IS NULL;
        RAISE NOTICE 'Added completedAt column to lead_campaign_enrollments';
    END IF;
END $$;

-- 4. Fix agent_configurations table for auth/me endpoint dependencies
CREATE TABLE IF NOT EXISTS agent_configurations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT true,
    system_prompt TEXT NOT NULL,
    temperature INTEGER DEFAULT 7,
    max_tokens INTEGER DEFAULT 500,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Fix users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'agent',
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add camelCase columns for users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'firstName'
    ) THEN
        ALTER TABLE users ADD COLUMN "firstName" VARCHAR(255);
        UPDATE users SET "firstName" = first_name WHERE "firstName" IS NULL;
        RAISE NOTICE 'Added firstName column to users';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'lastName'
    ) THEN
        ALTER TABLE users ADD COLUMN "lastName" VARCHAR(255);
        UPDATE users SET "lastName" = last_name WHERE "lastName" IS NULL;
        RAISE NOTICE 'Added lastName column to users';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'passwordHash'
    ) THEN
        ALTER TABLE users ADD COLUMN "passwordHash" VARCHAR(255);
        UPDATE users SET "passwordHash" = password_hash WHERE "passwordHash" IS NULL;
        RAISE NOTICE 'Added passwordHash column to users';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'lastLogin'
    ) THEN
        ALTER TABLE users ADD COLUMN "lastLogin" TIMESTAMP;
        UPDATE users SET "lastLogin" = last_login WHERE "lastLogin" IS NULL;
        RAISE NOTICE 'Added lastLogin column to users';
    END IF;
END $$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON campaigns (created_at);
CREATE INDEX IF NOT EXISTS campaigns_createdAt_idx ON campaigns ("createdAt");
CREATE INDEX IF NOT EXISTS campaigns_name_idx ON campaigns (name);
CREATE INDEX IF NOT EXISTS campaigns_active_idx ON campaigns (active);
CREATE INDEX IF NOT EXISTS campaigns_type_idx ON campaigns (type);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at);
CREATE INDEX IF NOT EXISTS leads_createdAt_idx ON leads ("createdAt");
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads (source);
CREATE INDEX IF NOT EXISTS leads_campaign_id_idx ON leads (campaign_id);

CREATE INDEX IF NOT EXISTS enrollments_lead_campaign_idx ON lead_campaign_enrollments (lead_id, campaign_id);
CREATE INDEX IF NOT EXISTS enrollments_status_idx ON lead_campaign_enrollments (status);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users (username);

-- 7. Insert default admin user if none exists
INSERT INTO users (id, email, username, password_hash, "passwordHash", first_name, "firstName", last_name, "lastName", role, active)
SELECT 
    'admin-user-id',
    'admin@example.com',
    'admin',
    '$2a$10$rQZ8uP/Ur9Yh2p8HY9Szte7rXz8lNP6JxK8Z3rQvNY4L9.iQ8y/Ga', -- password: admin123
    '$2a$10$rQZ8uP/Ur9Yh2p8HY9Szte7rXz8lNP6JxK8Z3rQvNY4L9.iQ8y/Ga',
    'Admin',
    'Admin',
    'User',
    'User',
    'admin',
    true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 8. Test queries to verify fixes
SELECT 'Testing campaigns API query:' as test_info;
SELECT 
    id, 
    name, 
    COALESCE("createdAt", created_at) as created_at_test,
    active,
    type,
    status
FROM campaigns 
ORDER BY COALESCE("createdAt", created_at) DESC NULLS LAST
LIMIT 3;

SELECT 'Testing leads API query:' as test_info;
SELECT 
    id, 
    COALESCE("firstName", first_name) as first_name_test,
    email,
    COALESCE("createdAt", created_at) as created_at_test
FROM leads 
ORDER BY COALESCE("createdAt", created_at) DESC NULLS LAST
LIMIT 3;

SELECT 'Testing auth query:' as test_info;
SELECT 
    id, 
    email, 
    username, 
    COALESCE("firstName", first_name) as first_name_test,
    role,
    active
FROM users 
WHERE active = true
LIMIT 3;

-- Final summary
SELECT 'Database schema fix completed!' as status;
SELECT 
    (SELECT COUNT(*) FROM campaigns) as campaigns_count,
    (SELECT COUNT(*) FROM leads) as leads_count,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM lead_campaign_enrollments) as enrollments_count;