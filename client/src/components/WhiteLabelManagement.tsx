import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Palette,
  Eye,
  Save,
  Globe,
  Key,
  Plus,
  Trash2,
  Copy,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BrandingConfig {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  emailFromName: string;
  supportEmail: string;
  logoUrl?: string;
  websiteUrl?: string;
  favicon?: string;
  customCss?: string;
}

interface Client {
  id: string;
  name: string;
  domain?: string;
  brandingConfig: BrandingConfig;
  plan: 'basic' | 'professional' | 'enterprise';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiKey {
  id: string;
  keyName: string;
  apiKey?: string;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
}

interface WhiteLabelManagementProps {
  clientId?: string;
  isAdmin?: boolean;
}

export const WhiteLabelManagement: React.FC<WhiteLabelManagementProps> = ({
  clientId
}) => {
  const [, setClient] = useState<Client | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    domain: '',
    brandingConfig: {
      companyName: '',
      primaryColor: '#2563eb',
      secondaryColor: '#1d4ed8',
      emailFromName: '',
      supportEmail: '',
      logoUrl: '',
      websiteUrl: '',
      favicon: '',
      customCss: ''
    },
    plan: 'basic'
  });

  useEffect(() => {
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load client data');
      }

      const data = await response.json();
      setClient(data.client);
      setApiKeys(data.apiKeys || []);
      setFormData(data.client);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load client data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('brandingConfig.')) {
      const brandingField = field.replace('brandingConfig.', '');
      setFormData(prev => ({
        ...prev,
        brandingConfig: {
          ...prev.brandingConfig!,
          [brandingField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save client data');
      }

      const data = await response.json();
      setClient(data.client);
      
      toast({
        title: 'Success',
        description: 'White label configuration saved successfully'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save configuration'
      });
    } finally {
      setSaving(false);
    }
  };

  const createApiKey = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyName: newApiKeyName,
          permissions: ['read', 'write']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const data = await response.json();
      setApiKeys(prev => [...prev, data.apiKey]);
      setNewApiKeyName('');
      setShowApiKeyForm(false);
      
      toast({
        title: 'API Key Created',
        description: data.warning
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create API key'
      });
    }
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard'
    });
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      
      toast({
        title: 'Success',
        description: 'API key deleted successfully'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete API key'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const brandingConfig = formData.brandingConfig!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">White Label Configuration</h1>
          <p className="text-gray-600">Customize your brand appearance and settings</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {!previewMode ? (
        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Brand Identity</span>
                </CardTitle>
                <CardDescription>
                  Configure your company branding and visual identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={brandingConfig.companyName}
                      onChange={(e) => handleInputChange('brandingConfig.companyName', e.target.value)}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailFromName">Email From Name</Label>
                    <Input
                      id="emailFromName"
                      value={brandingConfig.emailFromName}
                      onChange={(e) => handleInputChange('brandingConfig.emailFromName', e.target.value)}
                      placeholder="Support Team"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={brandingConfig.supportEmail}
                    onChange={(e) => handleInputChange('brandingConfig.supportEmail', e.target.value)}
                    placeholder="support@yourcompany.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={brandingConfig.primaryColor}
                        onChange={(e) => handleInputChange('brandingConfig.primaryColor', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={brandingConfig.primaryColor}
                        onChange={(e) => handleInputChange('brandingConfig.primaryColor', e.target.value)}
                        placeholder="#2563eb"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={brandingConfig.secondaryColor}
                        onChange={(e) => handleInputChange('brandingConfig.secondaryColor', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={brandingConfig.secondaryColor}
                        onChange={(e) => handleInputChange('brandingConfig.secondaryColor', e.target.value)}
                        placeholder="#1d4ed8"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    value={brandingConfig.logoUrl || ''}
                    onChange={(e) => handleInputChange('brandingConfig.logoUrl', e.target.value)}
                    placeholder="https://yourcompany.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={brandingConfig.websiteUrl || ''}
                    onChange={(e) => handleInputChange('brandingConfig.websiteUrl', e.target.value)}
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customCss">Custom CSS</Label>
                  <Textarea
                    id="customCss"
                    value={brandingConfig.customCss || ''}
                    onChange={(e) => handleInputChange('brandingConfig.customCss', e.target.value)}
                    placeholder="/* Custom styles */&#10;.custom-class {&#10;  /* Your CSS here */&#10;}"
                    rows={6}
                  />
                  <p className="text-sm text-gray-500">
                    Add custom CSS to override default styles
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domain" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Domain Configuration</span>
                </CardTitle>
                <CardDescription>
                  Configure your custom domain settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Custom Domain</Label>
                  <Input
                    id="domain"
                    value={formData.domain || ''}
                    onChange={(e) => handleInputChange('domain', e.target.value)}
                    placeholder="your-brand.com"
                  />
                  <p className="text-sm text-gray-500">
                    Enter your custom domain to enable white label hosting
                  </p>
                </div>

                {formData.domain && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      To complete domain setup, add a CNAME record pointing to: <code>ccl3-platform.com</code>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="h-5 w-5" />
                    <span>API Keys</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowApiKeyForm(true)}
                    disabled={showApiKeyForm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </CardTitle>
                <CardDescription>
                  Manage API keys for programmatic access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {showApiKeyForm && (
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="apiKeyName">API Key Name</Label>
                      <Input
                        id="apiKeyName"
                        value={newApiKeyName}
                        onChange={(e) => setNewApiKeyName(e.target.value)}
                        placeholder="My API Key"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={createApiKey} disabled={!newApiKeyName.trim()}>
                        Create Key
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowApiKeyForm(false);
                          setNewApiKeyName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{apiKey.keyName}</h3>
                            <Badge variant={apiKey.active ? 'default' : 'secondary'}>
                              {apiKey.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {apiKey.apiKey && (
                            <div className="flex items-center space-x-2">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {apiKey.apiKey.substring(0, 20)}...
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyApiKey(apiKey.apiKey!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <p className="text-sm text-gray-500">
                            Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                            {apiKey.lastUsedAt && (
                              <> • Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteApiKey(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {apiKeys.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No API keys created yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Plan & Settings</CardTitle>
                <CardDescription>
                  Configure client plan and resource limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select
                    value={formData.plan}
                    onValueChange={(value) => handleInputChange('plan', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Client Name"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Brand Preview</CardTitle>
            <CardDescription>
              Preview how your branding will appear
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="p-6 rounded-lg border-2"
              style={{ 
                borderColor: brandingConfig.primaryColor,
                backgroundColor: `${brandingConfig.primaryColor}10`
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  {brandingConfig.logoUrl && (
                    <img 
                      src={brandingConfig.logoUrl} 
                      alt="Logo" 
                      className="h-12 w-12 object-contain"
                    />
                  )}
                  <div>
                    <h2 
                      className="text-2xl font-bold"
                      style={{ color: brandingConfig.primaryColor }}
                    >
                      {brandingConfig.companyName}
                    </h2>
                    <p className="text-gray-600">{brandingConfig.supportEmail}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    style={{ backgroundColor: brandingConfig.primaryColor }}
                    className="text-white"
                  >
                    Primary Button
                  </Button>
                  <Button 
                    variant="outline"
                    style={{ 
                      borderColor: brandingConfig.secondaryColor,
                      color: brandingConfig.secondaryColor
                    }}
                  >
                    Secondary Button
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
