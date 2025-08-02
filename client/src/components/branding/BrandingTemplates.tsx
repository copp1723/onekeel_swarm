import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const templates = [
  {
    name: 'Modern Tech',
    colors: { primary: '#3B82F6', secondary: '#10B981' },
    font: 'Inter, sans-serif',
  },
  {
    name: 'Corporate Blue',
    colors: { primary: '#0A3D62', secondary: '#0C4B6D' },
    font: 'Roboto, sans-serif',
  },
  {
    name: 'Vibrant & Friendly',
    colors: { primary: '#F97316', secondary: '#EC4899' },
    font: 'Poppins, sans-serif',
  },
  {
    name: 'Elegant Dark',
    colors: { primary: '#D1D5DB', secondary: '#4B5563' },
    font: 'Merriweather, serif',
  },
];

interface BrandingTemplatesProps {
  onApplyTemplate: (template: any) => void;
}

export function BrandingTemplates({ onApplyTemplate }: BrandingTemplatesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-gray-600 mb-4'>
          Get started quickly by applying a pre-built branding template.
        </p>
        <div className='grid grid-cols-2 gap-4'>
          {templates.map(template => (
            <div key={template.name} className='border rounded-lg p-4'>
              <h4 className='font-semibold'>{template.name}</h4>
              <div className='flex space-x-2 my-2'>
                <div
                  className='h-8 w-8 rounded-full'
                  style={{ backgroundColor: template.colors.primary }}
                />
                <div
                  className='h-8 w-8 rounded-full'
                  style={{ backgroundColor: template.colors.secondary }}
                />
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onApplyTemplate(template)}
              >
                Apply
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
