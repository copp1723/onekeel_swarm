import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export const TemplateLibraryView: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Template Library</h1>
        <p className="text-gray-600">Manage your email and SMS templates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Template Management</span>
          </CardTitle>
          <CardDescription>
            Create and manage email and SMS templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Template Library</h3>
            <p className="text-gray-500">
              Create and manage your email and SMS templates for campaigns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 