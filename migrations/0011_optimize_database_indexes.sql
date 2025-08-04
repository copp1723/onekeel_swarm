-- Migration: Optimize Database Indexes for Performance
-- Description: Add comprehensive indexing strategy for frequently queried columns and patterns

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================

-- Users table - authentication and lookup patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_email_active_idx ON users(email, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_username_active_idx ON users(username, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_role_active_idx ON users(role, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_last_login_idx ON users(last_login DESC) WHERE last_login IS NOT NULL;

-- Leads table - core business queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_status_created_idx ON leads(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_source_status_idx ON leads(source, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_campaign_status_idx ON leads(campaign_id, status) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_qualification_score_idx ON leads(qualification_score DESC) WHERE qualification_score > 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_contact_info_idx ON leads(email, phone) WHERE email IS NOT NULL OR phone IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_last_contacted_idx ON leads(last_contacted_at DESC) WHERE last_contacted_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_full_name_idx ON leads(first_name, last_name) WHERE first_name IS NOT NULL;

-- Campaigns table - campaign management queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_active_type_idx ON campaigns(active, type) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_date_range_idx ON campaigns(start_date, end_date) WHERE start_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_name_active_idx ON campaigns(name, active);

-- Communications table - message tracking and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_lead_channel_idx ON communications(lead_id, channel, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_status_created_idx ON communications(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_campaign_channel_idx ON communications(campaign_id, channel) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_external_id_idx ON communications(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_direction_status_idx ON communications(direction, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_sent_delivered_idx ON communications(sent_at, delivered_at) WHERE sent_at IS NOT NULL;

-- Conversations table - chat and conversation management
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_lead_channel_status_idx ON conversations(lead_id, channel, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_agent_type_status_idx ON conversations(agent_type, status) WHERE agent_type IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_started_ended_idx ON conversations(started_at DESC, ended_at) WHERE ended_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_last_message_idx ON conversations(last_message_at DESC) WHERE last_message_at IS NOT NULL;

-- Sessions table - authentication and session management
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_user_expires_idx ON sessions(user_id, expires_at) WHERE expires_at > NOW();
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_token_expires_idx ON sessions(token, expires_at) WHERE expires_at > NOW();
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_last_accessed_idx ON sessions(last_accessed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_ip_user_agent_idx ON sessions(ip_address, user_agent);

-- Lead Campaign Enrollments - enrollment tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS enrollments_lead_status_idx ON lead_campaign_enrollments(lead_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS enrollments_campaign_status_idx ON lead_campaign_enrollments(campaign_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS enrollments_enrolled_completed_idx ON lead_campaign_enrollments(enrolled_at DESC, completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS enrollments_current_step_idx ON lead_campaign_enrollments(current_step, status) WHERE status = 'active';

-- Campaign Steps - campaign workflow
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaign_steps_campaign_order_idx ON campaign_steps(campaign_id, step_order, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaign_steps_template_active_idx ON campaign_steps(template_id, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaign_steps_delay_order_idx ON campaign_steps(delay_minutes, step_order);

-- Templates table - template management
CREATE INDEX CONCURRENTLY IF NOT EXISTS templates_channel_category_idx ON templates(channel, category, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS templates_active_updated_idx ON templates(active, updated_at DESC) WHERE active = true;

-- Agent Configurations - agent management
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_configs_type_active_idx ON agent_configurations(type, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_configs_name_type_idx ON agent_configurations(name, type);

-- Agent Templates - template selection
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_templates_type_category_idx ON agent_templates(type, category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_templates_default_type_idx ON agent_templates(is_default, type) WHERE is_default = true;

-- Analytics Events - reporting and analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS analytics_events_type_created_idx ON analytics_events(event_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS analytics_events_lead_type_idx ON analytics_events(lead_id, event_type) WHERE lead_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS analytics_events_campaign_type_idx ON analytics_events(campaign_id, event_type) WHERE campaign_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS analytics_events_user_type_idx ON analytics_events(user_id, event_type) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS analytics_events_channel_created_idx ON analytics_events(channel, created_at DESC) WHERE channel IS NOT NULL;

-- Audit Logs - security and compliance
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_user_action_idx ON audit_logs(user_id, action, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_resource_action_idx ON audit_logs(resource, action, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_resource_id_idx ON audit_logs(resource_id, resource) WHERE resource_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_ip_created_idx ON audit_logs(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;

-- Feature Flags - feature management
CREATE INDEX CONCURRENTLY IF NOT EXISTS feature_flags_enabled_category_idx ON feature_flags(enabled, category) WHERE enabled = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS feature_flags_rollout_enabled_idx ON feature_flags(rollout_percentage, enabled) WHERE enabled = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS feature_flags_risk_complexity_idx ON feature_flags(risk_level, complexity);

-- Clients table - multi-tenant support
CREATE INDEX CONCURRENTLY IF NOT EXISTS clients_active_created_idx ON clients(active, created_at DESC) WHERE active = true;

-- ============================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- ============================================

-- Active records only indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_active_only_idx ON users(created_at DESC) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_active_only_idx ON campaigns(created_at DESC) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS templates_active_only_idx ON templates(updated_at DESC) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_configs_active_only_idx ON agent_configurations(updated_at DESC) WHERE active = true;

-- Recent activity indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_recent_activity_idx ON leads(updated_at DESC) WHERE updated_at > (NOW() - INTERVAL '7 days');
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_recent_idx ON communications(created_at DESC) WHERE created_at > (NOW() - INTERVAL '30 days');
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_recent_idx ON conversations(last_message_at DESC) WHERE last_message_at > (NOW() - INTERVAL '24 hours');

-- Error and retry indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_failed_idx ON communications(created_at DESC, external_id) WHERE status = 'failed';
CREATE INDEX CONCURRENTLY IF NOT EXISTS sessions_expired_idx ON sessions(expires_at) WHERE expires_at < NOW();

-- ============================================
-- JSONB INDEXES FOR METADATA QUERIES
-- ============================================

-- GIN indexes for JSONB columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_metadata_gin_idx ON leads USING GIN (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_settings_gin_idx ON campaigns USING GIN (settings);
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_metadata_gin_idx ON communications USING GIN (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_messages_gin_idx ON conversations USING GIN (messages);
CREATE INDEX CONCURRENTLY IF NOT EXISTS agent_configs_channel_config_gin_idx ON agent_configurations USING GIN (channel_config);
CREATE INDEX CONCURRENTLY IF NOT EXISTS analytics_metadata_gin_idx ON analytics_events USING GIN (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_changes_gin_idx ON audit_logs USING GIN (changes);
CREATE INDEX CONCURRENTLY IF NOT EXISTS feature_flags_conditions_gin_idx ON feature_flags USING GIN (conditions);

-- Specific JSONB path indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS feature_flags_user_roles_idx ON feature_flags USING GIN (user_roles);
CREATE INDEX CONCURRENTLY IF NOT EXISTS feature_flags_environments_idx ON feature_flags USING GIN (environments);

-- ============================================
-- EXPRESSION INDEXES FOR COMPUTED VALUES
-- ============================================

-- Full text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_full_name_search_idx ON leads USING GIN (to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) WHERE first_name IS NOT NULL OR last_name IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_name_search_idx ON campaigns USING GIN (to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS templates_content_search_idx ON templates USING GIN (to_tsvector('english', content));

-- Date part indexes for reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_created_date_idx ON leads(DATE(created_at));
CREATE INDEX CONCURRENTLY IF NOT EXISTS communications_sent_date_idx ON communications(DATE(sent_at)) WHERE sent_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS analytics_events_date_idx ON analytics_events(DATE(created_at));

-- Lower case indexes for case-insensitive searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_email_lower_idx ON users(LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_username_lower_idx ON users(LOWER(username));
CREATE INDEX CONCURRENTLY IF NOT EXISTS leads_email_lower_idx ON leads(LOWER(email)) WHERE email IS NOT NULL;

-- ============================================
-- STATISTICS AND MAINTENANCE
-- ============================================

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE leads;
ANALYZE campaigns;
ANALYZE communications;
ANALYZE conversations;
ANALYZE sessions;
ANALYZE lead_campaign_enrollments;
ANALYZE campaign_steps;
ANALYZE templates;
ANALYZE agent_configurations;
ANALYZE agent_templates;
ANALYZE analytics_events;
ANALYZE audit_logs;
ANALYZE feature_flags;
ANALYZE feature_flag_user_overrides;
ANALYZE clients;

-- Add comments for documentation
COMMENT ON INDEX users_email_active_idx IS 'Optimizes active user lookup by email';
COMMENT ON INDEX leads_status_created_idx IS 'Optimizes lead filtering by status with creation date ordering';
COMMENT ON INDEX communications_lead_channel_idx IS 'Optimizes communication history queries per lead and channel';
COMMENT ON INDEX conversations_lead_channel_status_idx IS 'Optimizes conversation lookup by lead, channel, and status';
COMMENT ON INDEX analytics_events_type_created_idx IS 'Optimizes analytics queries by event type with time ordering';
COMMENT ON INDEX leads_metadata_gin_idx IS 'Enables fast JSONB queries on lead metadata';
COMMENT ON INDEX leads_full_name_search_idx IS 'Enables full-text search on lead names';

-- Performance monitoring queries (as comments for reference)
/*
-- Query to monitor index usage:
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Query to find unused indexes:
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
AND indexname NOT LIKE '%_pkey';

-- Query to find missing indexes (slow queries):
SELECT 
    query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
*/