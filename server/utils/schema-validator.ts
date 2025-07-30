import { db } from '../db';
import { 
  users, 
  clients, 
  agentConfigurations, 
  agentTemplates, 
  leads, 
  campaigns, 
  communications, 
  templates, 
  campaignSteps, 
  leadCampaignEnrollments, 
  sessions, 
  conversations, 
  auditLogs, 
  analyticsEvents, 
  featureFlags, 
  featureFlagUserOverrides 
} from '../db/schema';
import { sql } from 'drizzle-orm';
import { tableExists, columnExists, getAllTables, getTableColumns } from '../../shared/dbSchemaVerifier';

// Define the ValidationResult interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

// Helper function to create a ValidationResult
function createValidationResult(): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    info: []
  };
}

// Helper function to add error to ValidationResult
function addError(result: ValidationResult, error: string) {
  result.isValid = false;
  result.errors.push(error);
}

// Helper function to add warning to ValidationResult
function addWarning(result: ValidationResult, warning: string) {
  result.warnings.push(warning);
}

// Helper function to add info to ValidationResult
function addInfo(result: ValidationResult, info: string) {
  result.info.push(info);
}

export class SchemaValidator {
  /**
   * Validates that all required tables exist in the database
   */
  async validateRequiredTables(): Promise<ValidationResult> {
    console.log('🔍 Validating required tables...');
    
    const result = createValidationResult();
    
    // List of all expected tables
    const expectedTables = [
      'users',
      'clients',
      'agent_configurations',
      'agent_templates',
      'leads',
      'campaigns',
      'communications',
      'templates',
      'campaign_steps',
      'lead_campaign_enrollments',
      'sessions',
      'conversations',
      'audit_logs',
      'analytics_events',
      'feature_flags',
      'feature_flag_user_overrides'
    ];
    
    // Get all existing tables
    const existingTables = await getAllTables(db);
    const existingTableSet = new Set(existingTables);
    
    // Check for missing tables
    for (const table of expectedTables) {
      if (!existingTableSet.has(table)) {
        addError(result, `Missing required table: ${table}`);
      } else {
        addInfo(result, `Found required table: ${table}`);
      }
    }
    
    // Check for unexpected tables (not in our expected list)
    for (const table of existingTables) {
      // Skip migration tables
      if (table.startsWith('drizzle_') || table === '_migrations') {
        addInfo(result, `Found migration table: ${table}`);
        continue;
      }
      
      if (!expectedTables.includes(table)) {
        addWarning(result, `Unexpected table found: ${table}`);
      }
    }
    
    if (result.isValid) {
      console.log('✅ All required tables validation passed');
    } else {
      console.log('❌ Required tables validation failed');
    }
    
    return result;
  }

  /**
   * Validates that all required columns exist in the tables
   */
  async validateColumns(): Promise<ValidationResult> {
    console.log('🔍 Validating required columns...');
    
    const result = createValidationResult();
    
    // Define expected columns for key tables
    const expectedColumns: { [key: string]: string[] } = {
      users: ['id', 'email', 'username', 'password_hash', 'first_name', 'last_name', 'role', 'active', 'last_login', 'metadata', 'created_at', 'updated_at'],
      clients: ['id', 'name', 'domain', 'settings', 'active', 'created_at', 'updated_at'],
      agent_configurations: ['id', 'name', 'type', 'active', 'system_prompt', 'context_note', 'temperature', 'max_tokens', 'api_key', 'api_endpoint', 'channel_config', 'response_delay', 'retry_attempts', 'metadata', 'created_at', 'updated_at'],
      agent_templates: ['id', 'name', 'description', 'type', 'category', 'is_default', 'system_prompt', 'context_note', 'temperature', 'max_tokens', 'configurable_params', 'default_params', 'metadata', 'created_at', 'updated_at'],
      leads: ['id', 'first_name', 'last_name', 'email', 'phone', 'source', 'status', 'qualification_score', 'assigned_channel', 'boberdoo_id', 'campaign_id', 'credit_score', 'annual_income', 'employer', 'job_title', 'metadata', 'notes', 'created_at', 'updated_at', 'last_contacted_at', 'score', 'name'],
      campaigns: ['id', 'name', 'description', 'type', 'active', 'target_criteria', 'settings', 'start_date', 'end_date', 'created_at', 'updated_at', 'created_by', 'updated_by'],
      communications: ['id', 'lead_id', 'campaign_id', 'channel', 'direction', 'status', 'subject', 'content', 'external_id', 'metadata', 'scheduled_for', 'sent_at', 'delivered_at', 'opened_at', 'clicked_at', 'created_at', 'conversation_id'],
      templates: ['id', 'name', 'description', 'channel', 'subject', 'content', 'variables', 'category', 'active', 'created_at', 'updated_at'],
      campaign_steps: ['id', 'campaign_id', 'template_id', 'step_order', 'delay_minutes', 'conditions', 'active', 'created_at'],
      lead_campaign_enrollments: ['id', 'lead_id', 'campaign_id', 'current_step', 'completed', 'status', 'enrolled_at', 'completed_at', 'last_processed_at', 'enrolled_by'],
      sessions: ['id', 'user_id', 'token', 'ip_address', 'user_agent', 'expires_at', 'created_at', 'last_accessed_at'],
      conversations: ['id', 'lead_id', 'channel', 'agent_type', 'status', 'messages', 'metadata', 'started_at', 'ended_at', 'last_message_at'],
      audit_logs: ['id', 'user_id', 'action', 'resource', 'resource_id', 'changes', 'ip_address', 'user_agent', 'created_at'],
      analytics_events: ['id', 'event_type', 'lead_id', 'campaign_id', 'user_id', 'channel', 'value', 'metadata', 'created_at'],
      feature_flags: ['id', 'key', 'name', 'description', 'enabled', 'rollout_percentage', 'user_roles', 'environments', 'conditions', 'category', 'complexity', 'risk_level', 'created_by', 'last_modified_by', 'created_at', 'updated_at'],
      feature_flag_user_overrides: ['id', 'flag_id', 'user_id', 'enabled', 'reason', 'created_at', 'expires_at']
    };
    
    // Check each table for required columns
    for (const [tableName, columns] of Object.entries(expectedColumns)) {
      try {
        // Check if table exists
        const tableExistsResult = await tableExists(db, tableName);
        if (!tableExistsResult) {
          addError(result, `Table ${tableName} does not exist`);
          continue;
        }
        
        // Get actual columns in the table
        const actualColumns = await getTableColumns(db, tableName);
        const actualColumnSet = new Set(actualColumns);
        
        // Check for missing columns
        for (const column of columns) {
          if (!actualColumnSet.has(column)) {
            addError(result, `Missing column ${tableName}.${column}`);
          } else {
            addInfo(result, `Found column ${tableName}.${column}`);
          }
        }
        
        // Check for unexpected columns that might be issues
        // This is just informational, not an error
        for (const column of actualColumns) {
          if (!columns.includes(column)) {
            addInfo(result, `Additional column found in ${tableName}: ${column}`);
          }
        }
      } catch (error) {
        addError(result, `Error checking columns for table ${tableName}: ${error.message}`);
      }
    }
    
    if (result.isValid) {
      console.log('✅ All required columns validation passed');
    } else {
      console.log('❌ Required columns validation failed');
    }
    
    return result;
  }

  /**
   * Validates that all required indexes exist for performance
   */
  async validateIndexes(): Promise<ValidationResult> {
    console.log('🔍 Validating required indexes...');
    
    const result = createValidationResult();
    
    // Define expected indexes
    const expectedIndexes: { [key: string]: string[] } = {
      users: ['users_email_idx', 'users_username_idx'],
      clients: ['clients_name_idx', 'clients_domain_idx', 'clients_active_idx'],
      agent_configurations: ['agent_configurations_name_idx', 'agent_configurations_type_idx', 'agent_configurations_active_idx'],
      agent_templates: ['agent_templates_name_idx', 'agent_templates_type_idx', 'agent_templates_category_idx', 'agent_templates_is_default_idx'],
      leads: ['leads_email_idx', 'leads_phone_idx', 'leads_status_idx', 'leads_source_idx', 'leads_assigned_channel_idx', 'leads_boberdoo_id_idx', 'leads_campaign_id_idx', 'leads_created_at_idx'],
      campaigns: ['campaigns_name_idx', 'campaigns_active_idx', 'campaigns_type_idx'],
      communications: ['communications_lead_id_idx', 'communications_campaign_id_idx', 'communications_channel_idx', 'communications_status_idx', 'communications_created_at_idx'],
      templates: ['templates_name_idx', 'templates_channel_idx', 'templates_category_idx', 'templates_active_idx'],
      campaign_steps: ['campaign_steps_campaign_id_idx', 'campaign_steps_order_idx'],
      lead_campaign_enrollments: ['enrollments_lead_campaign_idx', 'enrollments_status_idx'],
      sessions: ['sessions_user_id_idx', 'sessions_token_idx', 'sessions_expires_at_idx'],
      conversations: ['conversations_lead_id_idx', 'conversations_channel_idx', 'conversations_status_idx', 'conversations_started_at_idx'],
      audit_logs: ['audit_logs_user_id_idx', 'audit_logs_resource_idx', 'audit_logs_created_at_idx'],
      analytics_events: ['analytics_events_event_type_idx', 'analytics_events_lead_id_idx', 'analytics_events_campaign_id_idx', 'analytics_events_created_at_idx'],
      feature_flags: ['feature_flags_key_idx', 'feature_flags_category_idx', 'feature_flags_enabled_idx', 'feature_flags_created_at_idx'],
      feature_flag_user_overrides: ['feature_flag_user_overrides_flag_user_idx']
    };
    
    try {
      // Get all existing indexes from the database
      const indexResult = await db.execute(sql`
        SELECT tablename, indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);
      
      const existingIndexes: { [key: string]: string[] } = {};
      
      // Organize existing indexes by table
      for (const row of indexResult.rows) {
        const tableName = row.tablename;
        const indexName = row.indexname;
        
        if (!existingIndexes[tableName]) {
          existingIndexes[tableName] = [];
        }
        
        existingIndexes[tableName].push(indexName);
      }
      
      // Check for missing indexes
      for (const [tableName, indexes] of Object.entries(expectedIndexes)) {
        const existingTableIndexes = existingIndexes[tableName] || [];
        const existingIndexSet = new Set(existingTableIndexes);
        
        for (const index of indexes) {
          if (!existingIndexSet.has(index)) {
            addWarning(result, `Missing recommended index: ${index} on table ${tableName}`);
          } else {
            addInfo(result, `Found index: ${index} on table ${tableName}`);
          }
        }
      }
    } catch (error) {
      addError(result, `Error checking indexes: ${error.message}`);
    }
    
    if (result.errors.length === 0) {
      console.log('✅ All required indexes validation passed');
    } else {
      console.log('⚠️  Indexes validation has warnings');
    }
    
    return result;
  }

  /**
   * Runs all validations and returns a combined result
   */
  async validateAll(): Promise<ValidationResult> {
    console.log('🔍 Running all schema validations...');
    
    const tableResult = await this.validateRequiredTables();
    const columnResult = await this.validateColumns();
    const indexResult = await this.validateIndexes();
    
    // Combine all results
    const combinedResult: ValidationResult = {
      isValid: tableResult.isValid && columnResult.isValid,
      errors: [...tableResult.errors, ...columnResult.errors, ...indexResult.errors],
      warnings: [...tableResult.warnings, ...columnResult.warnings, ...indexResult.warnings],
      info: [...tableResult.info, ...columnResult.info, ...indexResult.info]
    };
    
    if (combinedResult.isValid) {
      console.log('🎉 All schema validations passed!');
    } else {
      console.log('❌ Schema validation failed with errors');
    }
    
    return combinedResult;
  }
}

// Export a default instance for convenience
export const schemaValidator = new SchemaValidator();

// Export for testing
export default SchemaValidator;