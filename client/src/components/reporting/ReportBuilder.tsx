import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const availableMetrics = [
  { id: 'totalLeads', label: 'Total Leads' },
  { id: 'conversionRate', label: 'Conversion Rate' },
  { id: 'emailsSent', label: 'Emails Sent' },
  { id: 'openRate', label: 'Open Rate' },
  { id: 'clickRate', label: 'Click-Through Rate' },
  { id: 'costPerLead', label: 'Cost Per Lead' },
];

export function ReportBuilder() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('last30');
  const [reportName, setReportName] = useState('');

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleGenerateReport = () => {
    console.log('Generating report with:', {
      name: reportName,
      metrics: selectedMetrics,
      dateRange,
    });
    // In a real app, this would trigger an API call to generate the report
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Report Builder</CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='space-y-2'>
          <Label htmlFor='reportName'>Report Name</Label>
          <input
            id='reportName'
            value={reportName}
            onChange={e => setReportName(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md'
            placeholder='e.g., Q3 Performance Review'
          />
        </div>

        <div className='space-y-4'>
          <Label>Metrics</Label>
          <div className='grid grid-cols-2 gap-4'>
            {availableMetrics.map(metric => (
              <div key={metric.id} className='flex items-center space-x-2'>
                <Checkbox
                  id={metric.id}
                  checked={selectedMetrics.includes(metric.id)}
                  onCheckedChange={() => handleMetricToggle(metric.id)}
                />
                <Label htmlFor={metric.id} className='font-normal'>
                  {metric.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <Label>Date Range</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='last7'>Last 7 Days</SelectItem>
              <SelectItem value='last30'>Last 30 Days</SelectItem>
              <SelectItem value='last90'>Last 90 Days</SelectItem>
              <SelectItem value='all'>All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerateReport}
          disabled={selectedMetrics.length === 0 || !reportName}
        >
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
}
