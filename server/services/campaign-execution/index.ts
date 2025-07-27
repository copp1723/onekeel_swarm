/**
 * Campaign Execution System
 * 
 * This module provides a refactored, modular campaign execution system
 * that replaces the monolithic campaign-execution-engine.ts
 */

// Core types
export * from './types';

// Services
export { ExecutionStorage, executionStorage } from './ExecutionStorage';
export { ExecutionScheduler, executionScheduler } from './ExecutionScheduler';
export { ExecutionProcessor, executionProcessor } from './ExecutionProcessor';
export { ExecutionMonitor, executionMonitor } from './ExecutionMonitor';
export { TemplateRenderingService, templateRenderingService } from './TemplateRenderingService';
export { RetryManager, retryManager } from './RetryManager';
export { LeadAssignmentService, leadAssignmentService } from './LeadAssignmentService';

// Main orchestrator
export { CampaignOrchestrator, campaignOrchestrator } from './CampaignOrchestrator';

// Backward compatibility exports
export { campaignOrchestrator as campaignExecutionEngine } from './CampaignOrchestrator';
export { CampaignOrchestrator as CampaignExecutionEngine } from './CampaignOrchestrator';
export { campaignOrchestrator as default } from './CampaignOrchestrator';
