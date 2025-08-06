/**
 * Shared components index
 * IMPORTANT: Do NOT export agent-configurator or agent-modules here until their deps are restored,
 * to prevent Vite from parsing trees that import missing '@/types' and other utilities.
 */
export { AgentCard } from './AgentCard';
export { AgentStatusBadge } from './AgentStatusBadge';
export { AgentCapabilitySelector, AgentCapabilityIcons } from './AgentCapabilitySelector';

/* Intentionally omitted to avoid importing missing dependencies
export { UnifiedAgentConfigurator } from './UnifiedAgentConfigurator';
export { AgentManagementDashboard } from './AgentManagementDashboard';
export * from './agent-modules';
export * from '@/utils/agentUtils';
export * from '@/hooks/useAgents';
*/
