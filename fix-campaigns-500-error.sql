-- Emergency fix for campaigns 500 error
-- This adds column aliases to handle both snake_case and camelCase

-- Add view with both naming conventions
CREATE OR REPLACE VIEW campaigns_view AS
SELECT 
    id,
    name,
    description,
    type,
    status,
    active,
    created_at,
    created_at as "createdAt",
    updated_at,
    updated_at as "updatedAt",
    target_criteria,
    target_criteria as "targetCriteria",
    settings,
    start_date,
    start_date as "startDate",
    end_date,
    end_date as "endDate",
    metadata
FROM campaigns;

-- Test the view
SELECT * FROM campaigns_view LIMIT 1;

-- If the above works, we can also add a function to safely get campaigns
CREATE OR REPLACE FUNCTION get_campaigns_safe()
RETURNS TABLE (
    id text,
    name varchar(255),
    description text,
    type varchar(50),
    status varchar(50),
    active boolean,
    created_at timestamp,
    "createdAt" timestamp,
    updated_at timestamp,
    "updatedAt" timestamp,
    target_criteria jsonb,
    "targetCriteria" jsonb,
    settings jsonb,
    start_date timestamp,
    "startDate" timestamp,
    end_date timestamp,
    "endDate" timestamp,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.description,
        c.type,
        c.status,
        c.active,
        c.created_at,
        c.created_at,
        c.updated_at,
        c.updated_at,
        c.target_criteria,
        c.target_criteria,
        c.settings,
        c.start_date,
        c.start_date,
        c.end_date,
        c.end_date,
        c.metadata
    FROM campaigns c;
END;
$$ LANGUAGE plpgsql;

-- Quick test
SELECT COUNT(*) as test_count FROM get_campaigns_safe();