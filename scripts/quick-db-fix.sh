#!/bin/bash

# Quick database fix script for deployment issues
# This script applies the necessary schema fixes directly

echo "🔧 Applying database schema fixes..."

# Load environment variables
source .env

# Apply the migration using psql
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not found in .env"
    exit 1
fi

echo "📝 Applying migration to fix schema issues..."

# Run the migration SQL file
psql "$DATABASE_URL" < migrations/0010_fix_deployment_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    
    # Update applied migrations tracking
    echo "0010_fix_deployment_schema" >> migrations/applied.txt
    
    echo "🎉 Database schema fixed!"
else
    echo "❌ Error applying migration"
    exit 1
fi