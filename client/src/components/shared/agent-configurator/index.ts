/**
 * Agent Configurator System
 * 
 * This module provides a refactored, modular agent configuration system
 * that replaces the monolithic UnifiedAgentConfigurator.tsx
 */

// Core types
export * from './types';

// Hooks
export { useAgentConfig } from './hooks/useAgentConfig';
export { useInstructions } from './hooks/useInstructions';
export { useDomainExpertise } from './hooks/useDomainExpertise';

// Section components
export { BasicInfoSection } from './sections/BasicInfoSection';
export { PersonalitySection } from './sections/PersonalitySection';
export { InstructionsSection } from './sections/InstructionsSection';
export { DomainExpertiseSection } from './sections/DomainExpertiseSection';
export { AdvancedSettingsSection } from './sections/AdvancedSettingsSection';

// Main container
export { AgentConfiguratorContainer } from './AgentConfiguratorContainer';

// Backward compatibility exports
export { AgentConfiguratorContainer as UnifiedAgentConfigurator } from './AgentConfiguratorContainer';
export type { AgentConfiguratorProps as UnifiedAgentConfiguratorProps } from './types';
