import { useEffect, useState } from 'react';
import { CampaignIntelligenceHub } from '@/components/campaign-intelligence';

export function CampaignIntelligenceView() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading campaigns...</div>;
  }

  return (
    <CampaignIntelligenceHub 
      campaigns={campaigns} 
      onUpdate={fetchCampaigns}
    />
  );
}