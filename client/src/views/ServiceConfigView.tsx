import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Wifi, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ServiceConfig {
  mailgun: {
    apiKey: string;
    domain: string;
    enabled: boolean;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    enabled: boolean;
  };
  openrouter: {
    apiKey: string;
    enabled: boolean;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  message: string;
  configured: boolean;
}

export function ServiceConfigView() {
  const [config, setConfig] = useState<ServiceConfig>({
    mailgun: { apiKey: '', domain: '', enabled: false },
    twilio: { accountSid: '', authToken: '', phoneNumber: '', enabled: false },
    openrouter: { apiKey: '', enabled: false }
  });

  const [health, setHealth] = useState<Record<string, ServiceHealth>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadServiceData();
  }, []);

  const loadServiceData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await Promise.all([
        loadServiceConfig(),
        loadServiceHealth()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service data');
    } finally {
      setLoading(false);
    }
  };

  const loadServiceConfig = async () => {
    const response = await fetch('/api/services/config');
    if (!response.ok) throw new Error('Failed to load service configuration');
    
    const data = await response.json();
    if (data.success && data.data) {
      setConfig(data.data);
    }
  };

  const loadServiceHealth = async () => {
    const services = ['mailgun', 'twilio', 'openrouter'];
    const healthData: Record<string, ServiceHealth> = {};
    
    for (const service of services) {
      try {
        const response = await fetch(`/api/services/health/${service}`);
        if (response.ok) {
          const data = await response.json();
          healthData[service] = data.data || { status: 'unhealthy', message: 'Not configured', configured: false };
        } else {
          healthData[service] = { status: 'unhealthy', message: 'Service unavailable', configured: false };
        }
      } catch {
        healthData[service] = { status: 'unhealthy', message: 'Connection failed', configured: false };
      }
    }
    
    setHealth(healthData);
  };

  const saveServiceConfig = async (service: string) => {
    setSaving(prev => ({ ...prev, [service]: true }));
    setError('');

    try {
      const response = await fetch(`/api/services/config/${service}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config[service as keyof ServiceConfig])
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to save configuration');
      }

      await loadServiceHealth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(prev => ({ ...prev, [service]: false }));
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'healthy' ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusColor = (status: string) => {
    return status === 'healthy' ? 
      'bg-green-100 text-green-800 border-green-200' : 
      'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Service Configuration</h2>
            <p className="text-gray-600 mt-1">Configure external service integrations</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Configuration</h2>
          <p className="text-gray-600 mt-1">Configure external service integrations</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Configuration Error</span>
            </div>
            <p className="text-sm text-red-600 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Mailgun Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span>Mailgun</span>
              {health.mailgun && (
                <Badge className={getStatusColor(health.mailgun.status)}>
                  {health.mailgun.status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mailgun-api-key">API Key</Label>
              <Input
                id="mailgun-api-key"
                type="password"
                value={config.mailgun.apiKey}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  mailgun: { ...prev.mailgun, apiKey: e.target.value }
                }))}
                placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            
            <div>
              <Label htmlFor="mailgun-domain">Domain</Label>
              <Input
                id="mailgun-domain"
                value={config.mailgun.domain}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  mailgun: { ...prev.mailgun, domain: e.target.value }
                }))}
                placeholder="mg.yourdomain.com"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="mailgun-enabled"
                checked={config.mailgun.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  mailgun: { ...prev.mailgun, enabled: e.target.checked }
                }))}
                className="rounded"
              />
              <Label htmlFor="mailgun-enabled" className="cursor-pointer">
                Enable Mailgun
              </Label>
            </div>

            <Button
              onClick={() => saveServiceConfig('mailgun')}
              disabled={saving.mailgun}
              className="w-full"
            >
              {saving.mailgun ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </Button>

            {health.mailgun && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(health.mailgun.status)}
                  <span>{health.mailgun.message}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Twilio Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-green-600" />
              <span>Twilio</span>
              {health.twilio && (
                <Badge className={getStatusColor(health.twilio.status)}>
                  {health.twilio.status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="twilio-account-sid">Account SID</Label>
              <Input
                id="twilio-account-sid"
                value={config.twilio.accountSid}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  twilio: { ...prev.twilio, accountSid: e.target.value }
                }))}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div>
              <Label htmlFor="twilio-auth-token">Auth Token</Label>
              <Input
                id="twilio-auth-token"
                type="password"
                value={config.twilio.authToken}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  twilio: { ...prev.twilio, authToken: e.target.value }
                }))}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div>
              <Label htmlFor="twilio-phone">Phone Number</Label>
              <Input
                id="twilio-phone"
                value={config.twilio.phoneNumber}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  twilio: { ...prev.twilio, phoneNumber: e.target.value }
                }))}
                placeholder="+1234567890"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="twilio-enabled"
                checked={config.twilio.enabled}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  twilio: { ...prev.twilio, enabled: e.target.checked }
                }))}
                className="rounded"
              />
              <Label htmlFor="twilio-enabled" className="cursor-pointer">
                Enable Twilio
              </Label>
            </div>

            <Button
              onClick={() => saveServiceConfig('twilio')}
              disabled={saving.twilio}
              className="w-full"
            >
              {saving.twilio ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {saving.twilio ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
