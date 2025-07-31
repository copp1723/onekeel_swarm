import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface CampaignForApproval {
  id: string;
  name: string;
  clientName: string;
  submittedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

const mockCampaigns: CampaignForApproval[] = [
  { id: '1', name: 'Q4 Real Estate Push', clientName: 'Sunnyvale Homes', submittedBy: 'John Doe', status: 'pending' },
  { id: '2', name: 'New Year Finance Promo', clientName: 'Secure Investments', submittedBy: 'Jane Smith', status: 'pending' },
  { id: '3', name: 'Spring Healthcare Outreach', clientName: 'Wellness Clinic', submittedBy: 'John Doe', status: 'approved' },
];

export function ApprovalWorkflow() {
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [comments, setComments] = useState<Record<string, string>>({});

  const handleApproval = (campaignId: string, newStatus: 'approved' | 'rejected') => {
    setCampaigns(currentCampaigns =>
      currentCampaigns.map(c => 
        c.id === campaignId ? { ...c, status: newStatus } : c
      )
    );
  };
  
  const getStatusColor = (status: CampaignForApproval['status']) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Approval Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaigns.map(campaign => (
          <Card key={campaign.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{campaign.name}</h4>
                <p className="text-sm text-gray-600">Client: {campaign.clientName}</p>
                <p className="text-xs text-gray-500">Submitted by: {campaign.submittedBy}</p>
              </div>
              <Badge className={getStatusColor(campaign.status)}>{campaign.status}</Badge>
            </div>

            {campaign.status === 'pending' && (
              <div className="mt-4 space-y-2">
                <Textarea 
                  placeholder="Add feedback or comments..."
                  value={comments[campaign.id] || ''}
                  onChange={e => setComments(c => ({...c, [campaign.id]: e.target.value}))}
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => handleApproval(campaign.id, 'approved')}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleApproval(campaign.id, 'rejected')}>Reject</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}