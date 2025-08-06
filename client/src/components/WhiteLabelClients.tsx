import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Settings, 
  Globe, 
  Users,
  Search,
  Eye
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  domain?: string;
  plan: 'basic' | 'professional' | 'enterprise';
  active: boolean;
  createdAt: string;
  userCount: number;
  brandingConfig: {
    companyName: string;
    primaryColor: string;
  };
}

interface WhiteLabelClientsProps {
  onSelectClient: (clientId: string) => void;
  onCreateClient: () => void;
}

export const WhiteLabelClients: React.FC<WhiteLabelClientsProps> = ({
  onSelectClient,
  onCreateClient
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load clients');
      }

      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.brandingConfig.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.domain && client.domain.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">White Label Clients</h1>
          <p className="text-gray-600">Manage your white label clients and configurations</p>
        </div>
        <Button onClick={onCreateClient}>
          <Plus className="h-4 w-4 mr-2" />
          Create Client
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: client.brandingConfig.primaryColor }}
                  />
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                </div>
                <Badge 
                  variant={client.active ? 'default' : 'secondary'}
                  className={client.active ? 'bg-green-100 text-green-800' : ''}
                >
                  {client.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription>
                {client.brandingConfig.companyName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {client.domain && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Globe className="h-4 w-4" />
                    <span className="truncate">{client.domain}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{client.userCount} users</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge className={getPlanColor(client.plan)}>
                  {client.plan}
                </Badge>
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`https://${client.domain || 'app.ccl3-platform.com'}`, '_blank')}
                    disabled={!client.domain}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelectClient(client.id)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-500 pt-2 border-t">
                Created: {new Date(client.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {searchTerm ? 'No clients match your search' : 'No clients created yet'}
          </div>
          {!searchTerm && (
            <Button onClick={onCreateClient}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Client
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
