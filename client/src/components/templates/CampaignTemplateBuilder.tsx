import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define missing types if they don't exist in the destination project
interface Template {
  id: string;
  name: string;
}

interface CampaignTemplateBuilderProps {
  availableTemplates: Template[];
  onSave: (campaignTemplate: any) => void;
}

export function CampaignTemplateBuilder({ availableTemplates, onSave }: CampaignTemplateBuilderProps) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [sequence, setSequence] = useState<{ templateId: string; delayDays: number }[]>([]);

  const addTemplateToSequence = (templateId: string) => {
    if (templateId) {
      setSequence(currentSequence => [...currentSequence, { templateId, delayDays: 1 }]);
    }
  };
  
  const handleSave = () => {
    onSave({
      name,
      industry,
      template_config: { sequence }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Campaign Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="campaignTemplateName">Template Name</Label>
          <Input 
            id="campaignTemplateName"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Real Estate Lead Nurturing"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input 
            id="industry"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="e.g., Real Estate"
          />
        </div>

        <div className="space-y-4">
          <Label>Sequence</Label>
          {sequence.map((item, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <p className="flex-grow">{availableTemplates.find(t => t.id === item.templateId)?.name || 'Unknown Template'}</p>
              <Input 
                type="number"
                value={item.delayDays}
                onChange={e => {
                  const newSequence = [...sequence];
                  newSequence[index].delayDays = parseInt(e.target.value);
                  setSequence(newSequence);
                }}
                className="w-20"
              />
              <span>days</span>
            </div>
          ))}

          <Select onValueChange={addTemplateToSequence}>
            <SelectTrigger>
              <SelectValue placeholder="Add an email template to the sequence..." />
            </SelectTrigger>
            <SelectContent>
              {availableTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={handleSave} disabled={!name || sequence.length === 0}>
          Save Campaign Template
        </Button>
      </CardContent>
    </Card>
  );
}