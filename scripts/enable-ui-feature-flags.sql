-- Enable UI feature flags for better user experience

-- Enable new navigation
UPDATE feature_flags 
SET enabled = TRUE, rollout_percentage = 100, environments = '["development", "staging", "production"]'::jsonb
WHERE key = 'ui.new-navigation';

-- Enable contacts terminology
UPDATE feature_flags 
SET enabled = TRUE, rollout_percentage = 100, environments = '["development", "staging", "production"]'::jsonb
WHERE key = 'ui.contacts-terminology';

-- Enable enhanced dashboard
UPDATE feature_flags 
SET enabled = TRUE, rollout_percentage = 100, environments = '["development", "staging", "production"]'::jsonb
WHERE key = 'ui.enhanced-dashboard';

-- Verify the changes
SELECT key, name, enabled, rollout_percentage, environments
FROM feature_flags 
WHERE key IN ('ui.new-navigation', 'ui.contacts-terminology', 'ui.enhanced-dashboard')
ORDER BY key;