import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';

export const ClientManagementView: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
        <p className="text-gray-600">Manage your client accounts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Client Accounts</span>
          </CardTitle>
          <CardDescription>
            Manage multiple client accounts and branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Client Management</h3>
            <p className="text-gray-500">
              Manage multiple client accounts and their configurations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 