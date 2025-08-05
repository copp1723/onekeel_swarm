-- Remove feature flag tables and enums
DROP TABLE IF EXISTS "feature_flag_user_overrides";
DROP TABLE IF EXISTS "feature_flags";

-- Drop feature flag enums
DROP TYPE IF EXISTS "feature_flag_category";
DROP TYPE IF EXISTS "complexity";
DROP TYPE IF EXISTS "risk_level";
DROP TYPE IF EXISTS "environment";