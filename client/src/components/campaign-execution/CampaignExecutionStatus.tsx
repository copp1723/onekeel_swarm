import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Activity,
  Calendar
} from 'lucide-react';

interface ExecutionData {
  id: string;
  campaign_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'partial';
  stats: {
    queued: number;
    sent: number;
    failed: number;
  };
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
}

interface ExecutionMetrics {
  total: number;
  sent: number;
  failed: number;
  queued: number;
}

interface ExecutionResponse {
  execution: ExecutionData;
  metrics: ExecutionMetrics;
}

export function CampaignExecutionStatus() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<ExecutionData | null>(null);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchExecutionStatus = async () => {
    if (!id) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/campaigns/executions/${id}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch execution status: ${response.statusText}`);
      }

      const data: ExecutionResponse = await response.json();
      setExecution(data.execution);
      setMetrics(data.metrics || {
        total: data.execution.stats?.queued || 0,
        sent: data.execution.stats?.sent || 0,
        failed: data.execution.stats?.failed || 0,
        queued: data.execution.stats?.queued || 0
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching execution status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutionStatus();
  }, [id]);

  useEffect(() => {
    if (!autoRefresh || !execution || ['completed', 'failed'].includes(execution.status)) {
      return;
    }

    const interval = setInterval(fetchExecutionStatus, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, execution?.status]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Activity className="h-3 w-3 mr-1" />Running</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800"><AlertCircle className="h-3 w-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateProgress = () => {
    if (!metrics) return 0;
    const { total, sent, failed } = metrics;
    if (total === 0) return 0;
    return ((sent + failed) / total) * 100;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Execution not found</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Campaign Execution Status</h1>
              <p className="text-gray-600">Execution ID: {execution.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(execution.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExecutionStatus}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Execution Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{metrics?.total || 0}</div>
                <div className="text-sm text-gray-600">Total Recipients</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics?.sent || 0}</div>
                <div className="text-sm text-gray-600">Sent</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{metrics?.failed || 0}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{metrics?.queued || 0}</div>
                <div className="text-sm text-gray-600">Queued</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Execution Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Execution Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Created At</label>
                <p className="text-sm text-gray-900">{formatDateTime(execution.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Started At</label>
                <p className="text-sm text-gray-900">{formatDateTime(execution.started_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Finished At</label>
                <p className="text-sm text-gray-900">{formatDateTime(execution.finished_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Updated</label>
                <p className="text-sm text-gray-900">{formatDateTime(execution.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-refresh toggle */}
        {!['completed', 'failed'].includes(execution.status) && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
