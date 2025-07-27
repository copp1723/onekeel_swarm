/**
 * Campaign Execution Engine - Backward Compatibility Layer
 *
 * This file maintains backward compatibility while delegating to the new modular structure.
 * The original monolithic CampaignExecutionEngine has been refactored into focused services:
 *
 * - CampaignOrchestrator: Main coordinator
 * - ExecutionScheduler: Handles scheduling
 * - ExecutionProcessor: Processes individual executions
 * - ExecutionMonitor: Monitors and manages lifecycle
 * - TemplateRenderingService: Handles template rendering
 * - RetryManager: Manages retry logic
 * - LeadAssignmentService: Handles lead assignment
 * - ExecutionStorage: Manages execution storage
 */

// Re-export from the new modular structure for backward compatibility
export { CampaignOrchestrator as CampaignExecutionEngine } from './campaign-execution/CampaignOrchestrator';
export { campaignOrchestrator as campaignExecutionEngine } from './campaign-execution/CampaignOrchestrator';

// Export types for backward compatibility
export type { CampaignTrigger, CampaignExecution, ExecutionStats } from './campaign-execution/types';

// Default export
export { campaignOrchestrator as default } from './campaign-execution/CampaignOrchestrator';

