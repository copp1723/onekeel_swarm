#!/usr/bin/env tsx

/**
 * Database Schema Fix Script
 *
 * This script fixes the database schema issues that are preventing
 * the "update agent" button from working properly.
 *
 * Issues identified:
 * 1. Missing 'system_prompt' column in agent_configurations table
 * 2. Missing 'username' column in users table
 * 3. Incomplete database schema migration
 */

import postgres from 'postgres';

// Create direct postgres connection for schema operations
const connectionString =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/ccl3_swarm';
const sql = postgres(connectionString, {
  ssl: false, // For local development
  transform: {
    undefined: null,
  },
});

async function fixDatabaseSchema() {
  console.log('🔧 Starting comprehensive database schema fix...');

  try {
    // CRITICAL FIX: Create leads table first (this is causing the HTTP 500 error)
    console.log('📋 Checking leads table...');
    const leadsTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'leads'
      );
    `;

    if (!leadsTableExists[0].exists) {
      console.log('📋 Creating leads table...');

      // Create lead_status enum if it doesn't exist
      await sql`
        DO $$ BEGIN
          CREATE TYPE lead_status AS ENUM('new', 'contacted', 'qualified', 'converted', 'rejected');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      // Create leads table
      await sql`
        CREATE TABLE IF NOT EXISTS leads (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          first_name varchar(255),
          last_name varchar(255),
          email varchar(255),
          phone varchar(50),
          company varchar(255),
          title varchar(255),
          status lead_status DEFAULT 'new' NOT NULL,
          source varchar(100),
          notes text,
          score integer DEFAULT 0,
          last_contacted timestamp,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        );
      `;

      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS leads_email_idx ON leads USING btree (email);
        CREATE INDEX IF NOT EXISTS leads_status_idx ON leads USING btree (status);
        CREATE INDEX IF NOT EXISTS leads_source_idx ON leads USING btree (source);
        CREATE INDEX IF NOT EXISTS leads_score_idx ON leads USING btree (score);
      `;

      console.log('✅ leads table created successfully');
    } else {
      console.log('📋 leads table exists, checking columns...');

      // Check and add missing columns
      const columnsToCheck = [
        { name: 'first_name', type: 'varchar(255)', default: null },
        { name: 'last_name', type: 'varchar(255)', default: null },
        { name: 'email', type: 'varchar(255)', default: null },
        { name: 'phone', type: 'varchar(50)', default: null },
        { name: 'company', type: 'varchar(255)', default: null },
        { name: 'title', type: 'varchar(255)', default: null },
        { name: 'source', type: 'varchar(100)', default: null },
        { name: 'notes', type: 'text', default: null },
        { name: 'score', type: 'integer', default: '0' },
        { name: 'last_contacted', type: 'timestamp', default: null },
        { name: 'metadata', type: 'jsonb', default: "'{}'::jsonb" },
      ];

      for (const column of columnsToCheck) {
        const columnExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'leads'
            AND column_name = ${column.name}
          );
        `;

        if (!columnExists[0].exists) {
          console.log(
            `➕ Adding missing ${column.name} column to leads table...`
          );
          const defaultClause = column.default
            ? `DEFAULT ${column.default}`
            : '';
          await sql.unsafe(`
            ALTER TABLE leads
            ADD COLUMN ${column.name} ${column.type} ${defaultClause};
          `);
          console.log(`✅ ${column.name} column added to leads table`);
        }
      }
    }

    // Check if agent_configurations table exists
    const agentTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'agent_configurations'
      );
    `;

    if (!agentTableExists[0].exists) {
      console.log('📋 Creating agent_configurations table...');

      // Create agent_type enum if it doesn't exist
      await sql`
        DO $$ BEGIN
          CREATE TYPE agent_type AS ENUM('email', 'sms', 'chat', 'overlord');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      // Create agent_configurations table
      await sql`
        CREATE TABLE IF NOT EXISTS agent_configurations (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name varchar(255) NOT NULL,
          type agent_type NOT NULL,
          active boolean DEFAULT true NOT NULL,
          
          -- Core Configuration
          system_prompt text NOT NULL,
          context_note text,
          temperature integer DEFAULT 7,
          max_tokens integer DEFAULT 500,
          
          -- API Configuration
          api_key varchar(255),
          api_endpoint varchar(500),
          
          -- Channel-specific settings
          channel_config jsonb DEFAULT '{}'::jsonb,
          
          -- Behavioral settings
          response_delay integer DEFAULT 0,
          retry_attempts integer DEFAULT 3,
          
          -- Metadata
          metadata jsonb DEFAULT '{}'::jsonb,
          
          -- Timestamps
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        );
      `;

      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS agent_configurations_name_idx ON agent_configurations USING btree (name);
        CREATE INDEX IF NOT EXISTS agent_configurations_type_idx ON agent_configurations USING btree (type);
        CREATE INDEX IF NOT EXISTS agent_configurations_active_idx ON agent_configurations USING btree (active);
      `;

      console.log('✅ agent_configurations table created successfully');
    } else {
      console.log(
        '📋 agent_configurations table already exists, checking columns...'
      );

      // Check if system_prompt column exists
      const systemPromptExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'agent_configurations' 
          AND column_name = 'system_prompt'
        );
      `;

      if (!systemPromptExists[0].exists) {
        console.log('➕ Adding missing system_prompt column...');
        await sql`
          ALTER TABLE agent_configurations 
          ADD COLUMN system_prompt text NOT NULL DEFAULT 'You are a helpful AI assistant.';
        `;
        console.log('✅ system_prompt column added');
      }

      // Check other potentially missing columns
      const columnsToCheck = [
        { name: 'context_note', type: 'text', default: null },
        { name: 'temperature', type: 'integer', default: '7' },
        { name: 'max_tokens', type: 'integer', default: '500' },
        { name: 'metadata', type: 'jsonb', default: "'{}'::jsonb" },
      ];

      for (const column of columnsToCheck) {
        const columnExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'agent_configurations' 
            AND column_name = ${column.name}
          );
        `;

        if (!columnExists[0].exists) {
          console.log(`➕ Adding missing ${column.name} column...`);
          const defaultClause = column.default
            ? `DEFAULT ${column.default}`
            : '';
          await sql.unsafe(`
            ALTER TABLE agent_configurations 
            ADD COLUMN ${column.name} ${column.type} ${defaultClause};
          `);
          console.log(`✅ ${column.name} column added`);
        }
      }
    }

    // Check users table for username column
    const usersTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `;

    if (usersTableExists[0].exists) {
      const usernameExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name = 'username'
        );
      `;

      if (!usernameExists[0].exists) {
        console.log('➕ Adding missing username column to users table...');
        await sql`
          ALTER TABLE users 
          ADD COLUMN username varchar(255) UNIQUE;
        `;

        // Update existing users with a default username based on email
        await sql`
          UPDATE users 
          SET username = split_part(email, '@', 1) 
          WHERE username IS NULL;
        `;

        console.log('✅ username column added to users table');
      }
    }

    // Clean up any invalid data and insert sample configurations if needed
    console.log('🧹 Cleaning up invalid data...');

    // Remove any rows with null IDs
    await sql`DELETE FROM agent_configurations WHERE id IS NULL;`;

    // Check if we have valid agent configurations
    const agentCount =
      await sql`SELECT COUNT(*) FROM agent_configurations WHERE id IS NOT NULL;`;

    if (parseInt(agentCount[0].count) === 0) {
      console.log('📝 Inserting sample agent configurations...');

      // Check if role column exists and is required
      const roleColumnInfo = await sql`
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'agent_configurations'
        AND column_name = 'role';
      `;

      const hasRoleColumn = roleColumnInfo.length > 0;
      const roleRequired =
        hasRoleColumn && roleColumnInfo[0].is_nullable === 'NO';

      // Check if end_goal column exists and is required
      const endGoalColumnInfo = await sql`
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'agent_configurations'
        AND column_name = 'end_goal';
      `;

      const hasEndGoalColumn = endGoalColumnInfo.length > 0;
      const endGoalRequired =
        hasEndGoalColumn && endGoalColumnInfo[0].is_nullable === 'NO';

      if (
        hasRoleColumn &&
        roleRequired &&
        hasEndGoalColumn &&
        endGoalRequired
      ) {
        // Include both role and end_goal columns
        await sql`
          INSERT INTO agent_configurations (id, name, type, role, end_goal, system_prompt, active) VALUES
          (gen_random_uuid(), 'Email Specialist', 'email', 'Lead Engagement Specialist', 'Convert leads through personalized email campaigns', 'You are an expert email marketing agent specializing in lead engagement and conversion.', true),
          (gen_random_uuid(), 'SMS Outreach Agent', 'sms', 'Mobile Engagement Specialist', 'Engage prospects via mobile messaging', 'You are a concise SMS communication specialist focused on mobile engagement.', true),
          (gen_random_uuid(), 'Chat Support Agent', 'chat', 'Real-time Customer Support', 'Provide immediate customer assistance', 'You are a real-time customer support agent providing immediate assistance.', true),
          (gen_random_uuid(), 'Overlord Agent', 'overlord', 'Master Coordinator', 'Orchestrate multi-channel campaigns', 'You are a master coordinator managing multi-channel campaigns and optimizing lead engagement.', true);
        `;
      } else if (hasRoleColumn && roleRequired) {
        // Include role column only
        await sql`
          INSERT INTO agent_configurations (id, name, type, role, system_prompt, active) VALUES
          (gen_random_uuid(), 'Email Specialist', 'email', 'Lead Engagement Specialist', 'You are an expert email marketing agent specializing in lead engagement and conversion.', true),
          (gen_random_uuid(), 'SMS Outreach Agent', 'sms', 'Mobile Engagement Specialist', 'You are a concise SMS communication specialist focused on mobile engagement.', true),
          (gen_random_uuid(), 'Chat Support Agent', 'chat', 'Real-time Customer Support', 'You are a real-time customer support agent providing immediate assistance.', true),
          (gen_random_uuid(), 'Overlord Agent', 'overlord', 'Master Coordinator', 'You are a master coordinator managing multi-channel campaigns and optimizing lead engagement.', true);
        `;
      } else if (hasEndGoalColumn && endGoalRequired) {
        // Include end_goal column only
        await sql`
          INSERT INTO agent_configurations (id, name, type, end_goal, system_prompt, active) VALUES
          (gen_random_uuid(), 'Email Specialist', 'email', 'Convert leads through personalized email campaigns', 'You are an expert email marketing agent specializing in lead engagement and conversion.', true),
          (gen_random_uuid(), 'SMS Outreach Agent', 'sms', 'Engage prospects via mobile messaging', 'You are a concise SMS communication specialist focused on mobile engagement.', true),
          (gen_random_uuid(), 'Chat Support Agent', 'chat', 'Provide immediate customer assistance', 'You are a real-time customer support agent providing immediate assistance.', true),
          (gen_random_uuid(), 'Overlord Agent', 'overlord', 'Orchestrate multi-channel campaigns', 'You are a master coordinator managing multi-channel campaigns and optimizing lead engagement.', true);
        `;
      } else {
        // Insert without role or end_goal columns
        await sql`
          INSERT INTO agent_configurations (id, name, type, system_prompt, active) VALUES
          (gen_random_uuid(), 'Email Specialist', 'email', 'You are an expert email marketing agent specializing in lead engagement and conversion.', true),
          (gen_random_uuid(), 'SMS Outreach Agent', 'sms', 'You are a concise SMS communication specialist focused on mobile engagement.', true),
          (gen_random_uuid(), 'Chat Support Agent', 'chat', 'You are a real-time customer support agent providing immediate assistance.', true),
          (gen_random_uuid(), 'Overlord Agent', 'overlord', 'You are a master coordinator managing multi-channel campaigns and optimizing lead engagement.', true);
        `;
      }

      console.log('✅ Sample agent configurations inserted');
    } else {
      console.log(
        `📊 Found ${agentCount[0].count} existing agent configurations`
      );
    }

    // CRITICAL FIX: Create feature_flags table (also causing errors)
    console.log('📋 Checking feature_flags table...');
    const featureFlagsTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'feature_flags'
      );
    `;

    if (!featureFlagsTableExists[0].exists) {
      console.log('📋 Creating feature_flags table...');

      // Create enums if they don't exist
      await sql`
        DO $$ BEGIN
          CREATE TYPE feature_flag_category AS ENUM('agent-tuning', 'campaign-advanced', 'system-config', 'integrations', 'ui-progressive', 'debugging', 'experimental');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      await sql`
        DO $$ BEGIN
          CREATE TYPE complexity AS ENUM('basic', 'intermediate', 'advanced');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      await sql`
        DO $$ BEGIN
          CREATE TYPE risk_level AS ENUM('low', 'medium', 'high');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      await sql`
        DO $$ BEGIN
          CREATE TYPE environment AS ENUM('development', 'staging', 'production');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `;

      // Create feature_flags table
      await sql`
        CREATE TABLE IF NOT EXISTS feature_flags (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          key varchar(255) UNIQUE NOT NULL,
          name varchar(255) NOT NULL,
          description text,
          category feature_flag_category NOT NULL,
          enabled boolean DEFAULT false NOT NULL,
          complexity complexity DEFAULT 'basic' NOT NULL,
          risk_level risk_level DEFAULT 'low' NOT NULL,
          environments environment[] DEFAULT ARRAY['development']::environment[],
          rollout_percentage integer DEFAULT 0,
          conditions jsonb DEFAULT '{}'::jsonb,
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        );
      `;

      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS feature_flags_key_idx ON feature_flags USING btree (key);
        CREATE INDEX IF NOT EXISTS feature_flags_category_idx ON feature_flags USING btree (category);
        CREATE INDEX IF NOT EXISTS feature_flags_enabled_idx ON feature_flags USING btree (enabled);
      `;

      console.log('✅ feature_flags table created successfully');
    }

    // Insert some sample leads if table is empty
    const leadCount = await sql`SELECT COUNT(*) FROM leads;`;

    if (parseInt(leadCount[0].count) === 0) {
      console.log('📝 Inserting sample leads...');

      await sql`
        INSERT INTO leads (first_name, last_name, email, phone, company, status, source, score) VALUES
        ('John', 'Doe', 'john.doe@example.com', '+1-555-0123', 'Acme Corp', 'new', 'website', 85),
        ('Jane', 'Smith', 'jane.smith@techcorp.com', '+1-555-0124', 'TechCorp', 'contacted', 'referral', 92),
        ('Mike', 'Johnson', 'mike.j@startup.io', '+1-555-0125', 'Startup Inc', 'qualified', 'email-campaign', 78),
        ('Sarah', 'Wilson', 'sarah.wilson@enterprise.com', '+1-555-0126', 'Enterprise Solutions', 'new', 'linkedin', 88);
      `;

      console.log('✅ Sample leads inserted');
    }

    console.log('🎉 Database schema fix completed successfully!');
    console.log('');
    console.log('The "update agent" button should now work properly.');
    console.log('You can test it by:');
    console.log('1. Navigate to the Agents page in the application');
    console.log('2. Click "Edit" on any agent');
    console.log('3. Make changes and click "Update Agent"');
    console.log('4. The changes should be saved successfully');
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    throw error;
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the fix if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDatabaseSchema()
    .then(() => {
      console.log('✅ Schema fix completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Schema fix failed:', error);
      process.exit(1);
    });
}

export { fixDatabaseSchema };
