#!/usr/bin/env tsx
import { DocumentationAgent } from '../server/agents/development-agents/documentation-agent';
import { logger } from '../server/utils/logger';
import { DevTaskContext } from '../server/agents/development-agents/base-dev-agent';

// Task definitions from our todo list
const DOCUMENTATION_TASKS: DevTaskContext[] = [
  {
    taskId: '1.1',
    taskDescription: 'Write API integration guide for agencies',
    priority: 'high'
  },
  {
    taskId: '1.2', 
    taskDescription: 'Create client setup checklist documentation',
    priority: 'high'
  },
  {
    taskId: '1.3',
    taskDescription: 'Document multi-tenant architecture for developers',
    priority: 'medium'
  },
  {
    taskId: '1.4',
    taskDescription: 'Create user role permissions matrix',
    priority: 'medium'
  }
];

async function deployDocumentationAgent() {
  logger.info('🚀 Deploying Documentation Agent for onboarding tasks');
  
  const agent = new DocumentationAgent();
  const results = [];
  
  for (const task of DOCUMENTATION_TASKS) {
    logger.info(`📝 Starting task ${task.taskId}: ${task.taskDescription}`);
    
    try {
      const result = await agent.executeTask(task);
      results.push(result);
      
      if (result.success) {
        logger.info(`✅ Task ${task.taskId} completed successfully`);
        if (result.files) {
          logger.info(`   Generated files: ${result.files.join(', ')}`);
        }
      } else {
        logger.error(`❌ Task ${task.taskId} failed: ${result.error}`);
      }
      
      // Add delay between tasks to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      logger.error(`💥 Unexpected error in task ${task.taskId}:`, error);
      results.push({
        success: false,
        taskId: task.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  logger.info('\n📊 Documentation Agent Deployment Summary:');
  logger.info(`   Total tasks: ${results.length}`);
  logger.info(`   Successful: ${successful}`);
  logger.info(`   Failed: ${failed}`);
  
  return results;
}

// Check if we're running directly
if (require.main === module) {
  deployDocumentationAgent()
    .then(() => {
      logger.info('✨ Documentation agent deployment complete');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Documentation agent deployment failed:', error);
      process.exit(1);
    });
}

export { deployDocumentationAgent };