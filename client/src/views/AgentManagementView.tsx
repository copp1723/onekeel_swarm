import { AgentManagementDashboard } from '@/components/shared/AgentManagementDashboard';

export function AgentManagementView() {
  return (
    <AgentManagementDashboard
      showCreateButton={true}
      allowEdit={true}
      allowDelete={true}
      compact={false}
      showAgentDetails={true}
    />
  );
}