import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// This would be fetched from an agency-level settings API
const initialAgencyConfig = {
  customDomain: '',
  agencyLogo: '',
  defaultEmailSignature: 'Regards, {{agent.name}}',
};

export function WhiteLabelConfig() {
  const [config, setConfig] = useState(initialAgencyConfig);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    //
    // In a real app, you'd have an API call here to save the config
    // For example: await api.put('/api/agency/whitelabel-config', config)
    //
    console.log('Saving white-label config:', config);
    setTimeout(() => setIsSaving(false), 1000); // Simulate API call
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agency White-Label Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customDomain">Custom Domain</Label>
          <Input 
            id="customDomain"
            placeholder="e.g., clients.myagency.com"
            value={config.customDomain}
            onChange={e => setConfig(c => ({ ...c, customDomain: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agencyLogo">Agency Logo URL</Label>
          <Input 
            id="agencyLogo"
            placeholder="https://myagency.com/logo.png"
            value={config.agencyLogo}
            onChange={e => setConfig(c => ({ ...c, agencyLogo: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultEmailSignature">Default Email Signature</Label>
          <Input 
            id="defaultEmailSignature"
            value={config.defaultEmailSignature}
            onChange={e => setConfig(c => ({ ...c, defaultEmailSignature: e.target.value }))}
          />
          <p className="text-xs text-gray-500">
            Available variables: {`{{agent.name}}`}, {`{{client.name}}`}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}