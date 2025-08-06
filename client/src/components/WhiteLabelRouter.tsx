import React, { useState } from 'react';
import { WhiteLabelClients } from './WhiteLabelClients';
import { WhiteLabelManagement } from './WhiteLabelManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type View = 'list' | 'manage' | 'create';

export const WhiteLabelRouter: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentView('manage');
  };

  const handleCreateClient = () => {
    setSelectedClientId(null);
    setCurrentView('create');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedClientId(null);
  };

  const renderView = () => {
    switch (currentView) {
      case 'list':
        return (
          <WhiteLabelClients
            onSelectClient={handleSelectClient}
            onCreateClient={handleCreateClient}
          />
        );
      case 'manage':
        return (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={handleBackToList}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
            <WhiteLabelManagement 
              clientId={selectedClientId || undefined}
              isAdmin={true}
            />
          </div>
        );
      case 'create':
        return (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={handleBackToList}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
            <WhiteLabelManagement 
              isAdmin={true}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {renderView()}
      </div>
    </div>
  );
};
