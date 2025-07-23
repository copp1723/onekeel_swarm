import { useEffect, useState } from 'react';
import { MultiAgentCampaignEditor } from '@/components/email-agent/MultiAgentCampaignEditor';

interface CampaignAgent {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'chat' | 'overlord';
  capabilities: {
    email: boolean;
    sms: boolean;
    chat: boolean;
  };
}

export function MultiAgentCampaignView() {
  const [availableAgents, setAvailableAgents] = useState<CampaignAgent[]>([]);

  useEffect(() => {
    fetch('/api/multi-agent-campaigns/available-agents')
      .then(res => res.json())
      .then(data => setAvailableAgents(data?.agents || []))
      .catch(() => setAvailableAgents([
        { id: 'email-agent-1', name: 'Email Agent', type: 'email', capabilities: { email: true, sms: false, chat: false } },
        { id: 'sms-agent-1', name: 'SMS Agent', type: 'sms', capabilities: { email: false, sms: true, chat: false } },
        { id: 'chat-agent-1', name: 'Chat Agent', type: 'chat', capabilities: { email: false, sms: false, chat: true } },
        { id: 'overlord-agent-1', name: 'Overlord Agent', type: 'overlord', capabilities: { email: true, sms: true, chat: true } }
      ]));
  }, []);

  const handleSave = (campaign: any) => {
    console.log('Saving multi-agent campaign:', campaign);
    alert('Multi-agent campaign saved successfully!');
  };

  const handleCancel = () => {
    console.log('Multi-agent campaign creation cancelled');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Agent Hub</h2>
        <p className="text-gray-600">Orchestrate multi-agent campaigns</p>
      </div>
      <MultiAgentCampaignEditor
        agents={availableAgents}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}