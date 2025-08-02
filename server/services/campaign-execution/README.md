# Campaign Execution System - Refactored

This directory contains the refactored campaign execution system that replaces the monolithic `campaign-execution-engine.ts` file. The system has been broken down into focused, maintainable services following the Single Responsibility Principle.

## Architecture Overview

```
CampaignOrchestrator (Main Entry Point)
├── ExecutionMonitor (Lifecycle Management)
├── ExecutionScheduler (Scheduling Logic)
├── ExecutionProcessor (Processing Logic)
├── TemplateRenderingService (Template Handling)
├── RetryManager (Retry Logic)
├── LeadAssignmentService (Lead Management)
└── ExecutionStorage (Data Storage)
```

## Components

### 🎯 CampaignOrchestrator

**File:** `CampaignOrchestrator.ts`
**Purpose:** Main coordinator that provides the same interface as the original `CampaignExecutionEngine`
**Responsibilities:**

- Orchestrates all campaign execution services
- Maintains backward compatibility
- Provides unified API for external consumers

### 📊 ExecutionMonitor

**File:** `ExecutionMonitor.ts`
**Purpose:** Monitors and manages campaign execution lifecycle
**Responsibilities:**

- Starts/stops execution monitoring
- Processes scheduled executions
- Provides health status and statistics
- Generates execution reports

### ⏰ ExecutionScheduler

**File:** `ExecutionScheduler.ts`
**Purpose:** Handles scheduling of campaign executions
**Responsibilities:**

- Schedules individual email campaigns
- Manages template sequences for leads
- Handles execution cancellation
- Calculates execution timing

### ⚙️ ExecutionProcessor

**File:** `ExecutionProcessor.ts`
**Purpose:** Processes individual campaign executions
**Responsibilities:**

- Executes email campaigns
- Sends emails via queue system
- Records communications
- Handles execution errors

### 📧 TemplateRenderingService

**File:** `TemplateRenderingService.ts`
**Purpose:** Handles template rendering for campaign executions
**Responsibilities:**

- Renders templates with lead data
- Validates templates and leads
- Prepares render data
- Manages template metadata

### 🔄 RetryManager

**File:** `RetryManager.ts`
**Purpose:** Manages retry logic for failed campaign executions
**Responsibilities:**

- Determines retry eligibility
- Calculates retry delays with exponential backoff
- Schedules retries
- Provides retry statistics

### 👥 LeadAssignmentService

**File:** `LeadAssignmentService.ts`
**Purpose:** Handles lead assignment to campaigns
**Responsibilities:**

- Triggers campaigns for specific leads
- Auto-assigns leads to active campaigns
- Manages lead-campaign relationships
- Handles template sequences

### 💾 ExecutionStorage

**File:** `ExecutionStorage.ts`
**Purpose:** Manages in-memory storage of campaign executions
**Responsibilities:**

- Stores and retrieves executions
- Filters executions by various criteria
- Manages execution status updates
- Provides storage statistics

## Types and Interfaces

### 📋 types.ts

Contains all shared types and interfaces:

- `CampaignTrigger`
- `CampaignExecution`
- `ExecutionStats`
- `TemplateRenderData`
- `RenderedTemplate`
- `RetryConfig`

## Backward Compatibility

The refactored system maintains 100% backward compatibility with the original `CampaignExecutionEngine`. All existing code that imports and uses the original engine will continue to work without changes.

### Migration Path

1. **Immediate:** All existing imports continue to work
2. **Gradual:** New features can use the modular services directly
3. **Future:** Gradually migrate to use specific services instead of the orchestrator

## Usage Examples

### Using the Orchestrator (Backward Compatible)

```typescript
import { campaignExecutionEngine } from '../campaign-execution-engine';

// All original methods work exactly the same
await campaignExecutionEngine.start();
const executionId = await campaignExecutionEngine.scheduleEmailCampaign(
  campaignId,
  leadId,
  templateId,
  scheduledFor
);
```

### Using Individual Services (New Approach)

```typescript
import {
  executionScheduler,
  executionMonitor,
  leadAssignmentService,
} from './campaign-execution';

// Use specific services for focused functionality
const executionId = await executionScheduler.scheduleEmailCampaign(
  campaignId,
  leadId,
  templateId,
  scheduledFor
);

const stats = executionMonitor.getExecutionStats(campaignId);

await leadAssignmentService.triggerCampaign(campaignId, leadIds);
```

## Benefits of Refactoring

### 🔧 Maintainability

- **Smaller files:** Each service is focused and manageable
- **Clear responsibilities:** Single Responsibility Principle
- **Easier debugging:** Issues are isolated to specific services

### 🧪 Testability

- **Unit testing:** Each service can be tested in isolation
- **Mocking:** Dependencies can be easily mocked
- **Coverage:** Better test coverage with focused tests

### 🔄 Reusability

- **Service composition:** Services can be used independently
- **Feature development:** New features can reuse existing services
- **Code sharing:** Common patterns extracted to utilities

### 🚀 Performance

- **Lazy loading:** Services can be loaded on demand
- **Memory efficiency:** Better memory management
- **Scalability:** Services can be scaled independently

### 👥 Team Collaboration

- **Parallel development:** Multiple developers can work on different services
- **Code ownership:** Clear ownership boundaries
- **Reduced conflicts:** Fewer merge conflicts

## Future Enhancements

1. **Database Storage:** Replace in-memory storage with persistent storage
2. **Redis Integration:** Use Redis for distributed execution storage
3. **Metrics Collection:** Add detailed metrics and monitoring
4. **Circuit Breaker:** Add circuit breaker pattern for external dependencies
5. **Event Sourcing:** Implement event sourcing for execution history

## Testing

Each service should have comprehensive unit tests covering:

- Happy path scenarios
- Error handling
- Edge cases
- Integration points

Example test structure:

```
tests/
├── ExecutionScheduler.test.ts
├── ExecutionProcessor.test.ts
├── ExecutionMonitor.test.ts
├── TemplateRenderingService.test.ts
├── RetryManager.test.ts
├── LeadAssignmentService.test.ts
├── ExecutionStorage.test.ts
└── CampaignOrchestrator.test.ts
```

## Contributing

When adding new features:

1. Identify the appropriate service for the functionality
2. If no service fits, consider creating a new focused service
3. Maintain backward compatibility in the orchestrator
4. Add comprehensive tests
5. Update this documentation
