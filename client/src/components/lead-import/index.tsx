import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { useTerminology } from '@/hooks/useTerminology';

export const LeadImport: React.FC = () => {
  const terminology = useTerminology();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{terminology.importBulk}</h1>
        <p className="text-gray-600">Upload and map your CSV data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>CSV Import</span>
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import {terminology.plural}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{terminology.importBulk}</h3>
            <p className="text-gray-500 mb-4">
              Upload a CSV file to import your {terminology.plural} into the system.
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Choose File
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 