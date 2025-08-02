# Development Agent Deployment Guide

## Overview

This guide explains how to safely deploy specialized development agents to work on the 15 onboarding tasks without freezing or causing errors in the production system.

## Safety Measures Implemented

### 1. **Isolated Agent System**

- Development agents use `BaseDevAgent` class (separate from production agents)
- Prefixed with `dev-` to avoid conflicts
- Separate execution context that won't interfere with customer-facing agents

### 2. **Non-Blocking Architecture**

```typescript
// Agents run asynchronously without blocking main application
const results = await Promise.allSettled([
  documentationAgent.executeTask(task1),
  provisioningAgent.executeTask(task2),
  architectureAgent.executeTask(task3),
]);
```

### 3. **Resource Protection**

- File operations create backups before modifications
- Rate limiting between API calls (2-second delays)
- Separate API keys via `DEV_OPENROUTER_API_KEY`
- Mock responses fallback if API unavailable

### 4. **Error Isolation**

- Try-catch blocks around all agent operations
- Failed tasks don't crash the system
- Progress tracking in SuperMemory

## Deployment Steps

### Step 1: Set Up Development Environment

```bash
# Add development API key to .env
echo "DEV_OPENROUTER_API_KEY=your-dev-key-here" >> .env

# Create directories for generated content
mkdir -p docs/onboarding
mkdir -p scripts/onboarding
mkdir -p server/agents/development-agents
```

### Step 2: Deploy Documentation Agent (Safe to Start)

```bash
# Run the documentation agent for tasks 1.1-1.4
npm run tsx scripts/deploy-dev-agents.ts
```

This will generate:

- `/docs/onboarding/API_INTEGRATION_GUIDE.md`
- `/docs/onboarding/CLIENT_SETUP_CHECKLIST.md`
- `/docs/onboarding/MULTI_TENANT_ARCHITECTURE.md`
- `/docs/onboarding/USER_ROLE_PERMISSIONS.md`

### Step 3: Deploy Additional Agents (When Ready)

Create similar agents for other task categories:

```typescript
// Provisioning Agent - For tasks 2.1-2.4
class ProvisioningAgent extends BaseDevAgent {
  // Generates provisioning scripts and APIs
}

// Architecture Agent - For tasks 3.1-3.4
class ArchitectureAgent extends BaseDevAgent {
  // Generates multi-tenant code enhancements
}

// UI Builder Agent - For tasks 4.1-4.4
class UIBuilderAgent extends BaseDevAgent {
  // Generates React components for onboarding
}
```

## Monitoring Agent Execution

### Check Progress

```bash
# View agent logs
tail -f logs/development-agents.log

# Check generated files
ls -la docs/onboarding/
ls -la scripts/onboarding/
```

### Task Status Tracking

The agents update task progress in SuperMemory:

- `in_progress` - Agent is working on the task
- `completed` - Task finished successfully
- `failed` - Task encountered an error

## Preventing System Freezes

### 1. **Async Execution**

Agents run in background without blocking:

```typescript
// Won't freeze the main app
deployDocumentationAgent(); // Runs async
```

### 2. **Resource Limits**

- Max 2000 tokens per API call
- 2-second delays between tasks
- File operations are atomic

### 3. **Graceful Degradation**

- Falls back to mock responses if API fails
- Continues with next task if one fails
- Logs all errors without crashing

## Running Agents in Parallel

For faster execution (with caution):

```typescript
// Deploy multiple agent types simultaneously
await Promise.all([
  deployDocumentationAgent(),
  deployProvisioningAgent(),
  deployArchitectureAgent(),
]);
```

## Best Practices

1. **Test with Mock Mode First**
   - Remove API keys to test with mock responses
   - Verify file generation logic works

2. **Run During Low Usage**
   - Deploy agents during off-peak hours
   - Monitor system resources

3. **Incremental Deployment**
   - Start with low-priority tasks
   - Verify outputs before proceeding

4. **Backup Important Files**
   - Agents auto-backup modified files
   - Keep manual backups of critical configs

## Troubleshooting

### Agent Not Generating Files

- Check API key is set correctly
- Verify write permissions to directories
- Check logs for specific errors

### API Rate Limits

- Increase delay between tasks
- Use different API keys for parallel agents
- Implement exponential backoff

### Memory Issues

- Run fewer agents simultaneously
- Increase Node.js heap size: `NODE_OPTIONS="--max-old-space-size=4096"`

## Next Steps

1. Deploy the documentation agent first (lowest risk)
2. Review generated documentation
3. Create and deploy provisioning agent
4. Continue with remaining agents based on priority

The system is designed to handle agent failures gracefully without impacting the production application.
