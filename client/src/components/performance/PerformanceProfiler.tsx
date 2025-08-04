import React, { Profiler, ProfilerOnRenderCallback, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Download,
  Play,
  Pause
} from 'lucide-react';

interface PerformanceEntry {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
  timestamp: Date;
}

interface PerformanceStats {
  totalRenderTime: number;
  averageRenderTime: number;
  mountCount: number;
  updateCount: number;
  slowRenders: number;
  lastRenderTime: number;
  renderHistory: PerformanceEntry[];
}

interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
  enabled?: boolean;
  slowThreshold?: number;
  maxHistorySize?: number;
  onSlowRender?: (entry: PerformanceEntry) => void;
}

const PerformanceProfiler: React.FC<PerformanceProfilerProps> = memo(({
  id,
  children,
  enabled = process.env.NODE_ENV === 'development',
  slowThreshold = 16, // 16ms threshold for 60fps
  maxHistorySize = 100,
  onSlowRender
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    totalRenderTime: 0,
    averageRenderTime: 0,
    mountCount: 0,
    updateCount: 0,
    slowRenders: 0,
    lastRenderTime: 0,
    renderHistory: []
  });

  const [isEnabled, setIsEnabled] = useState(enabled);

  const onRenderCallback: ProfilerOnRenderCallback = useCallback((
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions
  ) => {
    const entry: PerformanceEntry = {
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions,
      timestamp: new Date()
    };

    // Check if this is a slow render
    const isSlow = actualDuration > slowThreshold;
    if (isSlow && onSlowRender) {
      onSlowRender(entry);
    }

    setStats(prevStats => {
      const newHistory = [...prevStats.renderHistory, entry].slice(-maxHistorySize);
      const totalRenderTime = prevStats.totalRenderTime + actualDuration;
      const totalCount = prevStats.mountCount + prevStats.updateCount + 1;
      
      return {
        totalRenderTime,
        averageRenderTime: totalRenderTime / totalCount,
        mountCount: phase === 'mount' ? prevStats.mountCount + 1 : prevStats.mountCount,
        updateCount: phase === 'update' ? prevStats.updateCount + 1 : prevStats.updateCount,
        slowRenders: isSlow ? prevStats.slowRenders + 1 : prevStats.slowRenders,
        lastRenderTime: actualDuration,
        renderHistory: newHistory
      };
    });
  }, [slowThreshold, maxHistorySize, onSlowRender]);

  const handleExportData = useCallback(() => {
    const data = {
      componentId: id,
      stats,
      exportTime: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-${id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [id, stats]);

  const handleClearStats = useCallback(() => {
    setStats({
      totalRenderTime: 0,
      averageRenderTime: 0,
      mountCount: 0,
      updateCount: 0,
      slowRenders: 0,
      lastRenderTime: 0,
      renderHistory: []
    });
  }, []);

  const getPerformanceStatus = () => {
    if (stats.averageRenderTime === 0) return 'idle';
    if (stats.averageRenderTime < 8) return 'excellent';
    if (stats.averageRenderTime < 16) return 'good';
    if (stats.averageRenderTime < 32) return 'warning';
    return 'poor';
  };

  const formatDuration = (ms: number) => `${ms.toFixed(2)}ms`;

  if (!isEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      <Profiler id={id} onRender={onRenderCallback}>
        {children}
      </Profiler>
    </>
  );
});

// Performance Dashboard Component
const PerformanceDashboard: React.FC<{
  profilers: Array<{ id: string; stats: PerformanceStats }>;
}> = memo(({ profilers }) => {
  const [isVisible, setIsVisible] = useState(false);

  const overallStats = profilers.reduce((acc, { stats }) => ({
    totalComponents: acc.totalComponents + 1,
    totalRenderTime: acc.totalRenderTime + stats.totalRenderTime,
    totalRenders: acc.totalRenders + stats.mountCount + stats.updateCount,
    totalSlowRenders: acc.totalSlowRenders + stats.slowRenders
  }), { totalComponents: 0, totalRenderTime: 0, totalRenders: 0, totalSlowRenders: 0 });

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <Activity className="h-4 w-4 mr-2" />
          Performance
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
      <Card className="shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Performance Monitor</CardTitle>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          <CardDescription className="text-xs">
            Real-time React component performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Overall Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium text-gray-600">Total Renders</div>
              <div className="text-lg font-bold">{overallStats.totalRenders}</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium text-gray-600">Slow Renders</div>
              <div className={`text-lg font-bold ${
                overallStats.totalSlowRenders > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {overallStats.totalSlowRenders}
              </div>
            </div>
          </div>

          {/* Component Stats */}
          <div className="space-y-2">
            {profilers.slice(0, 3).map(({ id, stats }) => {
              const status = stats.averageRenderTime < 8 ? 'good' : 
                            stats.averageRenderTime < 16 ? 'warning' : 'poor';
              
              return (
                <div key={id} className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate flex-1">{id}</span>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={status === 'good' ? 'default' : 
                               status === 'warning' ? 'secondary' : 'destructive'}
                      className="text-xs px-1 py-0"
                    >
                      {stats.averageRenderTime.toFixed(1)}ms
                    </Badge>
                    {status === 'poor' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    {status === 'good' && <CheckCircle className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

// Hook for using performance profiling
export const usePerformanceProfiler = (componentId: string) => {
  const [stats, setStats] = useState<PerformanceStats>({
    totalRenderTime: 0,
    averageRenderTime: 0,
    mountCount: 0,
    updateCount: 0,
    slowRenders: 0,
    lastRenderTime: 0,
    renderHistory: []
  });

  const ProfilerComponent = useCallback<React.FC<{ children: React.ReactNode }>>(({ children }) => (
    <PerformanceProfiler
      id={componentId}
      onSlowRender={(entry) => {
        console.warn(`Slow render detected in ${componentId}:`, entry);
      }}
    >
      {children}
    </PerformanceProfiler>
  ), [componentId]);

  return { ProfilerComponent, stats };
};

export { PerformanceProfiler, PerformanceDashboard };
export type { PerformanceEntry, PerformanceStats };