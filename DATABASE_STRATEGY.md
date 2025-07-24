# OneKeel Swarm Database Strategy

## Overview
This document outlines the comprehensive database strategy for OneKeel Swarm, addressing current issues and establishing best practices for database management.

## Current State Analysis

### Issues Identified
1. **Migration Conflicts**: Multiple migrations with same number (0002)
2. **Schema Mismatches**: Production missing tables/columns (feature_flags, campaigns.description, agents.context_note)
3. **Inconsistent Tracking**: Manual tracking (applied.txt) vs Drizzle journal
4. **Table Naming**: Reference to 'agents' table when schema uses 'agent_configurations'

### Technology Stack
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Migration Tool**: Drizzle Kit
- **Connection**: postgres.js with SSL support

## Implementation Plan

### Phase 1: Fix Immediate Issues (Priority: HIGH)

#### 1.1 Resolve Migration Conflicts
```bash
# Current conflicts:
# - 0002_add_agent_configurations.sql
# - 0002_closed_shooting_star.sql (in journal)
# - 0002_feature_flags.sql

# Resolution: Renumber migrations sequentially
```

#### 1.2 Schema Verification Script
Create automated verification to prevent future mismatches.

#### 1.3 Fix Production Schema
Apply missing tables and columns to production database.

### Phase 2: Establish Best Practices (Priority: HIGH)

#### 2.1 Migration Workflow
```bash
# Development workflow
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migrations locally
npm run db:verify    # Verify schema integrity

# Production workflow
npm run db:migrate:prod  # Apply migrations with safety checks
```

#### 2.2 Schema Management
- Single source of truth: `server/db/schema.ts`
- No manual SQL edits without corresponding schema updates
- All migrations must be reversible

### Phase 3: Testing & Monitoring (Priority: MEDIUM)

#### 3.1 Database Testing
- Separate test database
- Migration testing suite
- Schema validation tests

#### 3.2 Monitoring
- Query performance tracking
- Connection pool health
- Migration execution logs

## Action Items

### Immediate Actions (Today)
1. Fix migration numbering conflicts
2. Create schema verification script
3. Update production database with missing elements

### Short-term (This Week)
1. Implement automated migration testing
2. Add pre-deployment validation
3. Document migration procedures

### Long-term (This Month)
1. Set up database monitoring
2. Implement performance optimization
3. Create migration rollback procedures

## Migration Fix Script

```typescript
// scripts/fix-database-strategy.ts
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

export async function implementDatabaseStrategy() {
  console.log('🚀 Implementing Database Strategy...');
  
  // Step 1: Fix migration numbering
  await fixMigrationNumbering();
  
  // Step 2: Verify current schema
  await verifyDatabaseSchema();
  
  // Step 3: Apply missing migrations
  await applyMissingMigrations();
  
  // Step 4: Set up monitoring
  await setupDatabaseMonitoring();
  
  console.log('✅ Database strategy implemented successfully!');
}

async function fixMigrationNumbering() {
  // Implementation details...
}

async function verifyDatabaseSchema() {
  // Implementation details...
}

async function applyMissingMigrations() {
  // Implementation details...
}

async function setupDatabaseMonitoring() {
  // Implementation details...
}
```

## Success Criteria

1. **No Schema Mismatches**: Production and development schemas are identical
2. **Automated Verification**: Pre-deployment checks prevent schema drift
3. **Reliable Migrations**: All migrations are tested and reversible
4. **Performance Monitoring**: Query performance is tracked and optimized
5. **Clear Documentation**: Team understands and follows database procedures

## Next Steps

1. Review and approve this strategy
2. Execute immediate action items
3. Schedule regular database health reviews
4. Train team on new procedures