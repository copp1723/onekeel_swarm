import React from 'react';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCsvUpload } from '../hooks/useCsvUpload';
import { WizardContext } from '../types';

export const AudienceStep: React.FC<{ctx: WizardContext}> = ({ ctx }) => {
  const { dropzone, error, fileName } = useCsvUpload(ctx.setData);
  const contacts = ctx.data.audience.contacts;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">Upload Contact List</h4>
        </div>
        <p className="text-sm text-blue-700">
          Upload a CSV file with your contact list. The file must include "First Name" and "Email" columns.
        </p>
      </div>
      
      {contacts.length === 0 ? (
        <div>
          <div
            {...dropzone.getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dropzone.isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...dropzone.getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {dropzone.isDragActive ? (
              <p className="text-sm text-blue-600">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop a CSV file here, or click to select
                </p>
                <p className="text-xs text-gray-500">
                  Only CSV files are accepted
                </p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-700 mb-2">CSV Requirements:</h5>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Must include "First Name" and "Email" columns (auto-detected)</li>
              <li>• Maximum 10 columns will be imported</li>
              <li>• Common column variations are supported (e.g., "firstname", "email address")</li>
              <li>• Empty rows will be automatically filtered out</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-green-900">CSV Uploaded Successfully</h5>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                {contacts.length} contacts
              </Badge>
            </div>
            <p className="text-sm text-green-700">File: {fileName}</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Mapped Columns:</h5>
            <div className="space-y-1">
              <div className="flex items-center text-sm">
                <span className="text-gray-600 w-24">First Name:</span>
                <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                  {ctx.data.audience.headerMapping.firstName}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-gray-600 w-24">Email:</span>
                <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                  {ctx.data.audience.headerMapping.email}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                ctx.setData((prev) => ({
                  ...prev,
                  audience: {
                    ...prev.audience,
                    contacts: [],
                    headerMapping: {},
                    targetCount: 0
                  }
                }));
              }}
            >
              Upload Different File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};