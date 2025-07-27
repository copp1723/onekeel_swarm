/**
 * UnifiedAgentConfigurator - Backward Compatibility Layer
 *
 * This file maintains backward compatibility while delegating to the new modular structure.
 * The original monolithic UnifiedAgentConfigurator has been refactored into focused components:
 *
 * - AgentConfiguratorContainer: Main form container
 * - BasicInfoSection: Basic agent information
 * - PersonalitySection: Personality and behavior settings
 * - InstructionsSection: Do's and don'ts management
 * - DomainExpertiseSection: Expertise areas management
 * - AdvancedSettingsSection: Advanced AI model settings
 */

// Re-export from the new modular structure for backward compatibility
export { AgentConfiguratorContainer as UnifiedAgentConfigurator } from './agent-configurator/AgentConfiguratorContainer';

// Export types for backward compatibility
export type { AgentConfiguratorProps as UnifiedAgentConfiguratorProps } from './agent-configurator/types';


