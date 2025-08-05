# Shared Agent Management Components

This directory contains unified, reusable components for managing AI agents across the application. These components replace the fragmented agent management interfaces and provide a consistent, feature-rich experience.

## 🎯 Purpose

These components are part of **Half 1** of the agent management consolidation strategy. They provide:

- **Unified agent configuration** for all agent types (email, SMS, chat, overlord)
- **Consistent UI patterns** across all agent management interfaces
- **Reusable components** that can be integrated into any part of the application
- **Type-safe interfaces** with comprehensive TypeScript support
- **Backend integration** through custom hooks

## 📦 Components

### Core Components

#### `AgentManagementDashboard`
The main dashboard component that provides a complete agent management interface.

```tsx
import { AgentManagementDashboard } from '@/components/shared';

<AgentManagementDashboard
  onAgentSelect={(agent) => console.log('Selected:', agent)}
  showCreateButton={true}
  allowEdit={true}
  allowDelete={true}
  compact={false}
/>
```

#### `UnifiedAgentConfigurator`
A comprehensive form for creating and editing agents of any type.

```tsx
import { UnifiedAgentConfigurator } from '@/components/shared';

<UnifiedAgentConfigurator
  agent={existingAgent} // null for new agent
  onSave={handleSave}
  onCancel={handleCancel}
  allowTypeChange={true}
/>
```

#### `AgentCard`
A flexible card component for displaying agent information.

```tsx
import { AgentCard } from '@/components/shared';

<AgentCard
  agent={agent}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onToggle={handleToggle}
  onViewAnalytics={handleAnalytics}
  compact={false}
/>
```

### Utility Components

#### `AgentStatusBadge`
Displays agent status with consistent styling.

```tsx
import { AgentStatusBadge } from '@/components/shared';

<AgentStatusBadge agent={agent} showDot={true} />
```

#### `AgentCapabilitySelector`
Interactive component for selecting agent capabilities.

```tsx
import { AgentCapabilitySelector } from '@/components/shared';

<AgentCapabilitySelector
  capabilities={capabilities}
  onChange={setCapabilities}
  readonly={false}
  compact={false}
/>
```

## 🔧 Hooks

### `useAgents(options?)`
Main hook for agent management operations.

```tsx
import { useAgents } from '@/hooks/useAgents';

const {
  agents,
  loading,
  error,
  loadAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  toggleAgent,
  getActiveAgent
} = useAgents({ type: 'email', active: true });
```

### Specialized Hooks

```tsx
import { useAgentsByType, useActiveAgents, useAgentConfiguration } from '@/hooks/useAgents';

// Get agents by specific type
const { agents: emailAgents } = useAgentsByType('email');

// Get only active agents
const { agents: activeAgents } = useActiveAgents();

// Get single agent configuration
const { agent, loading } = useAgentConfiguration(agentId);
```

## 🛠 Utilities

### Agent Type Definitions
```tsx
import { AGENT_TYPES, PERSONALITY_OPTIONS, TONE_OPTIONS } from '@/utils/agentUtils';

// Use in dropdowns, forms, etc.
AGENT_TYPES.map(type => ({ value: type.value, label: type.label }))
```

### Validation & Helpers
```tsx
import { 
  validateAgentConfig, 
  cleanAgentConfig, 
  getDefaultConfigForType,
  getAgentCapabilities 
} from '@/utils/agentUtils';

// Validate agent configuration
const { isValid, errors } = validateAgentConfig(agentData);

// Get default config for agent type
const defaultConfig = getDefaultConfigForType('email');

// Get capabilities for agent type
const capabilities = getAgentCapabilities('overlord');
```

## 🔄 Integration with Campaign Intelligence

These components are designed to integrate seamlessly with the existing Campaign Intelligence Hub:

```tsx
// In CampaignIntelligenceHub, add a new tab:
<TabsContent value="agents">
  <AgentManagementDashboard compact={true} />
</TabsContent>
```

## 📋 Type Definitions

All components use the unified `UnifiedAgentConfig` interface:

```tsx
interface UnifiedAgentConfig {
  id?: string;
  name: string;
  type: AgentType; // 'overlord' | 'email' | 'sms' | 'chat'
  role: string;
  endGoal: string;
  instructions: AgentInstructions;
  domainExpertise: string[];
  personality: AgentPersonality;
  tone: AgentTone;
  responseLength: ResponseLength;
  apiModel?: string;
  temperature: number;
  maxTokens: number;
  active: boolean;
  capabilities?: AgentCapabilities;
  performance?: AgentPerformance;
  // ... other fields
}
```

## 🧪 Testing

Use the demo component to test the complete system:

```tsx
import { AgentManagementDemo } from '@/components/shared/AgentManagementDemo';

// Renders a complete agent management interface for testing
<AgentManagementDemo />
```

## 🚀 Next Steps (Half 2)

These components are ready for integration into the Campaign Intelligence Hub. The next phase involves:

1. **Extending CampaignIntelligenceHub** to include agent management tabs
2. **Updating navigation** to use the unified interface
3. **Migrating existing functionality** from separate agent components
4. **Testing end-to-end workflows**

## 📝 Notes

- All components are fully typed with TypeScript
- Backend integration is handled through the `/api/agent-configurations` endpoints
- Components follow the existing UI design patterns from Campaign Intelligence
- Error handling and loading states are built into all components
- The system supports all existing agent types and can easily be extended
