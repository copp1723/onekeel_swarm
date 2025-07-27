-- Enable the enhanced dashboard feature flag
UPDATE feature_flags 
SET enabled = true
WHERE key = 'ui.enhanced-dashboard';

-- Verify the update
SELECT key, name, enabled 
FROM feature_flags 
WHERE key = 'ui.enhanced-dashboard';