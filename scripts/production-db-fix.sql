-- Production Database Fix Script
-- Generated: 2025-07-24T13:42:12.270Z
-- Run this in the Render dashboard SQL console



-- Verify fixes
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') as has_feature_flags,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'description') as has_campaign_description,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_configurations' AND column_name = 'context_note') as has_agent_context_note;
