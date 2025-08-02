import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Server, Database, Mail, MessageSquare } from 'lucide-react';

export function SystemHealthView() {
  const healthData = {
    overall: 'healthy',
    services: [
      { name: 'API Server', status: 'healthy', uptime: '99.9%' },
      { name: 'Database', status: 'healthy', uptime: '99.8%' },
      { name: 'Email Service', status: 'healthy', uptime: '99.7%' },
      { name: 'SMS Service', status: 'healthy', uptime: '99.6%' },
    ],
    metrics: {
      responseTime: '120ms',
      throughput: '1,234 req/min',
      errorRate: '0.1%',
    },
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
    };
    return (
      variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'
    );
  };

  const getServiceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'api server':
        return <Server className='h-5 w-5' />;
      case 'database':
        return <Database className='h-5 w-5' />;
      case 'email service':
        return <Mail className='h-5 w-5' />;
      case 'sms service':
        return <MessageSquare className='h-5 w-5' />;
      default:
        return <Activity className='h-5 w-5' />;
    }
  };

  return (
    <div className='p-6 space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-gray-900'>System Health</h1>
        <p className='text-gray-600'>
          Monitor system performance and service status
        </p>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <Activity className='h-5 w-5' />
            <span>Overall System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center space-x-4'>
            <Badge className={getStatusBadge(healthData.overall)}>
              {healthData.overall.toUpperCase()}
            </Badge>
            <span className='text-gray-600'>All systems operational</span>
          </div>
        </CardContent>
      </Card>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {healthData.services.map(service => (
              <div key={service.name} className='border rounded-lg p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center space-x-2'>
                    {getServiceIcon(service.name)}
                    <span className='font-medium'>{service.name}</span>
                  </div>
                  <Badge className={getStatusBadge(service.status)}>
                    {service.status}
                  </Badge>
                </div>
                <div className='text-sm text-gray-600'>
                  Uptime: {service.uptime}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-600'>
                {healthData.metrics.responseTime}
              </div>
              <div className='text-sm text-gray-600'>Avg Response Time</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-600'>
                {healthData.metrics.throughput}
              </div>
              <div className='text-sm text-gray-600'>Throughput</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-red-600'>
                {healthData.metrics.errorRate}
              </div>
              <div className='text-sm text-gray-600'>Error Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
