import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Mail, MessageSquare, Database, Save } from 'lucide-react';

export function ServiceConfigView() {
  const [configs, setConfigs] = useState({
    email: {
      provider: 'mailgun',
      apiKey: '••••••••••••••••',
      domain: 'mg.example.com',
      status: 'connected',
    },
    sms: {
      provider: 'twilio',
      accountSid: '••••••••••••••••',
      authToken: '••••••••••••••••',
      phoneNumber: '+1234567890',
      status: 'connected',
    },
    database: {
      host: 'localhost',
      port: '5432',
      database: 'onekeel',
      status: 'connected',
    },
  });

  const [editMode, setEditMode] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return (
      variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'
    );
  };

  const handleSave = (service: string) => {
    // Save configuration logic would go here
    setEditMode(null);
  };

  const handleTest = (service: string) => {
    // Test connection logic would go here
    console.log(`Testing ${service} connection...`);
  };

  return (
    <div className='p-6 space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-gray-900'>
          Service Configuration
        </h1>
        <p className='text-gray-600'>
          Configure and manage external service integrations
        </p>
      </div>

      {/* Email Service */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center space-x-2'>
              <Mail className='h-5 w-5' />
              <span>Email Service (Mailgun)</span>
            </CardTitle>
            <div className='flex items-center space-x-2'>
              <Badge className={getStatusBadge(configs.email.status)}>
                {configs.email.status}
              </Badge>
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  setEditMode(editMode === 'email' ? null : 'email')
                }
              >
                <Settings className='h-4 w-4 mr-2' />
                Configure
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editMode === 'email' ? (
            <div className='space-y-4'>
              <div>
                <Label htmlFor='email-domain'>Domain</Label>
                <Input
                  id='email-domain'
                  value={configs.email.domain}
                  onChange={e =>
                    setConfigs(prev => ({
                      ...prev,
                      email: { ...prev.email, domain: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor='email-apikey'>API Key</Label>
                <Input
                  id='email-apikey'
                  type='password'
                  value={configs.email.apiKey}
                  onChange={e =>
                    setConfigs(prev => ({
                      ...prev,
                      email: { ...prev.email, apiKey: e.target.value },
                    }))
                  }
                />
              </div>
              <div className='flex space-x-2'>
                <Button onClick={() => handleSave('email')}>
                  <Save className='h-4 w-4 mr-2' />
                  Save
                </Button>
                <Button variant='outline' onClick={() => handleTest('email')}>
                  Test Connection
                </Button>
              </div>
            </div>
          ) : (
            <div className='space-y-2'>
              <div>
                <strong>Domain:</strong> {configs.email.domain}
              </div>
              <div>
                <strong>Provider:</strong> {configs.email.provider}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMS Service */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center space-x-2'>
              <MessageSquare className='h-5 w-5' />
              <span>SMS Service (Twilio)</span>
            </CardTitle>
            <div className='flex items-center space-x-2'>
              <Badge className={getStatusBadge(configs.sms.status)}>
                {configs.sms.status}
              </Badge>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setEditMode(editMode === 'sms' ? null : 'sms')}
              >
                <Settings className='h-4 w-4 mr-2' />
                Configure
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editMode === 'sms' ? (
            <div className='space-y-4'>
              <div>
                <Label htmlFor='sms-sid'>Account SID</Label>
                <Input
                  id='sms-sid'
                  type='password'
                  value={configs.sms.accountSid}
                  onChange={e =>
                    setConfigs(prev => ({
                      ...prev,
                      sms: { ...prev.sms, accountSid: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor='sms-token'>Auth Token</Label>
                <Input
                  id='sms-token'
                  type='password'
                  value={configs.sms.authToken}
                  onChange={e =>
                    setConfigs(prev => ({
                      ...prev,
                      sms: { ...prev.sms, authToken: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor='sms-phone'>Phone Number</Label>
                <Input
                  id='sms-phone'
                  value={configs.sms.phoneNumber}
                  onChange={e =>
                    setConfigs(prev => ({
                      ...prev,
                      sms: { ...prev.sms, phoneNumber: e.target.value },
                    }))
                  }
                />
              </div>
              <div className='flex space-x-2'>
                <Button onClick={() => handleSave('sms')}>
                  <Save className='h-4 w-4 mr-2' />
                  Save
                </Button>
                <Button variant='outline' onClick={() => handleTest('sms')}>
                  Test Connection
                </Button>
              </div>
            </div>
          ) : (
            <div className='space-y-2'>
              <div>
                <strong>Phone Number:</strong> {configs.sms.phoneNumber}
              </div>
              <div>
                <strong>Provider:</strong> {configs.sms.provider}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center space-x-2'>
              <Database className='h-5 w-5' />
              <span>Database</span>
            </CardTitle>
            <Badge className={getStatusBadge(configs.database.status)}>
              {configs.database.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <div>
              <strong>Host:</strong> {configs.database.host}
            </div>
            <div>
              <strong>Port:</strong> {configs.database.port}
            </div>
            <div>
              <strong>Database:</strong> {configs.database.database}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
