import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export const LeadImport: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Leads</h1>
        <p className="text-gray-600">Upload and map your CSV data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>CSV Import</span>
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import Leads</h3>
            <p className="text-gray-500 mb-4">
              Upload a CSV file to import your leads into the system.
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