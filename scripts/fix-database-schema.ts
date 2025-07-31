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
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/ccl3_swarm';
const sql = postgres(connectionString, {
  ssl: false, // For local development
  transform: {
    undefined: null,
  },
});

async function fixDatabaseSchema() {
  console.log('🔧 Starting database schema fix...');

  try {
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
      console.log('📋 agent_configurations table already exists, checking columns...');
      
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
        { name: 'metadata', type: 'jsonb', default: "'{}'::jsonb" }
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
          const defaultClause = column.default ? `DEFAULT ${column.default}` : '';
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
    const agentCount = await sql`SELECT COUNT(*) FROM agent_configurations WHERE id IS NOT NULL;`;

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
      const roleRequired = hasRoleColumn && roleColumnInfo[0].is_nullable === 'NO';

      if (hasRoleColumn && roleRequired) {
        // Include role column in the insert
        await sql`
          INSERT INTO agent_configurations (id, name, type, role, system_prompt, active) VALUES
          (gen_random_uuid(), 'Email Specialist', 'email', 'Lead Engagement Specialist', 'You are an expert email marketing agent specializing in lead engagement and conversion.', true),
          (gen_random_uuid(), 'SMS Outreach Agent', 'sms', 'Mobile Engagement Specialist', 'You are a concise SMS communication specialist focused on mobile engagement.', true),
          (gen_random_uuid(), 'Chat Support Agent', 'chat', 'Real-time Customer Support', 'You are a real-time customer support agent providing immediate assistance.', true),
          (gen_random_uuid(), 'Overlord Agent', 'overlord', 'Master Coordinator', 'You are a master coordinator managing multi-channel campaigns and optimizing lead engagement.', true);
        `;
      } else {
        // Insert without role column
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
      console.log(`📊 Found ${agentCount[0].count} existing agent configurations`);
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
    .catch((error) => {
      console.error('❌ Schema fix failed:', error);
      process.exit(1);
    });
}

export { fixDatabaseSchema };
