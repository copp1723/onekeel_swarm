import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CampaignWizard } from '@/components/campaign-wizard/CampaignWizard';
import type { CampaignData } from '@/components/campaign-wizard/types';

export default function CampaignWizardOnlyView() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleComplete = async (data: CampaignData & { executionId?: string }) => {
    try {
      // The CampaignWizard now handles both creation and execution
      console.log('Campaign completed:', data);

      if (data.executionId) {
        // Navigate to execution status page
        setTimeout(() => {
          navigate(`/campaigns/executions/${data.executionId}`);
        }, 2000);
      }

      setOpen(false);
    } catch (e: any) {
      console.error('Failed to complete campaign', e);
      alert(`Failed to complete campaign: ${e?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Campaign Wizard (Isolated)</h1>
        <CampaignWizard
          isOpen={open}
          onClose={() => setOpen(false)}
          onComplete={handleComplete}
          agents={[]}
        />
      </div>
    </div>
  );
}