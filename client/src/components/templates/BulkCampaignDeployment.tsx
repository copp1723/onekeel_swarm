import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define missing types if they don't exist in the destination project
interface Client {
  id: string;
  name: string;
}

interface CampaignTemplate {
  id: string;
  name: string;
  industry: string;
}

interface BulkCampaignDeploymentProps {
  clients: Client[];
  campaignTemplates: CampaignTemplate[];
  onDeploy: (deploymentConfig: any) => void;
}

export function BulkCampaignDeployment({ clients, campaignTemplates, onDeploy }: BulkCampaignDeploymentProps) {
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [deploymentName, setDeploymentName] = useState('');

  const handleClientToggle = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleDeploy = () => {
    onDeploy({
      name: deploymentName,
      clientIds: selectedClientIds,
      campaignTemplateId: selectedTemplateId
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Campaign Deployment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="deploymentName">Deployment Name</Label>
          <input
            id="deploymentName"
            value={deploymentName}
            onChange={e => setDeploymentName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g., Q4 Real Estate Push"
          />
        </div>

        <div className="space-y-2">
          <Label>Campaign Template</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a campaign template..." />
            </SelectTrigger>
            <SelectContent>
              {campaignTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} ({template.industry})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <Label>Target Clients</Label>
          <div className="grid grid-cols-2 gap-4">
            {clients.map(client => (
              <div key={client.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={client.id}
                  checked={selectedClientIds.includes(client.id)}
                  onCheckedChange={() => handleClientToggle(client.id)}
                />
                <Label htmlFor={client.id} className="font-normal">{client.name}</Label>
              </div>
            ))}
          </div>
        </div>
        
        <Button 
          onClick={handleDeploy} 
          disabled={selectedClientIds.length === 0 || !selectedTemplateId || !deploymentName}
        >
          Deploy to {selectedClientIds.length} Client(s)
        </Button>
      </CardContent>
    </Card>
  );
}