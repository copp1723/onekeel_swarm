import React from 'react';
import { useClient } from '@/contexts/ClientContext';
import { Button } from '@/components/ui/button';
import { Building } from 'lucide-react';

export const ClientSwitcher: React.FC = () => {
  const { activeClient } = useClient();

  if (!activeClient) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Building className="h-4 w-4 text-gray-500" />
      <span className="text-sm text-gray-600">
        {activeClient.name}
      </span>
    </div>
  );
}; 