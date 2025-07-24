-- Enable the new navigation feature flag to show Agent Templates in the UI

-- Update the ui.new-navigation feature flag to be enabled
UPDATE feature_flags 
SET enabled = true 
WHERE key = 'ui.new-navigation';

-- Verify the feature flags status
SELECT key, name, enabled, description 
FROM feature_flags 
WHERE key IN ('ui.new-navigation', 'ui.enhanced-dashboard', 'ui.contacts-terminology')
ORDER BY key;