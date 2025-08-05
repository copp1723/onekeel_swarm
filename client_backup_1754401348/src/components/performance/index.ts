// Performance monitoring components and utilities
export { PerformanceProfiler, PerformanceDashboard, usePerformanceProfiler } from './PerformanceProfiler';
export type { PerformanceEntry, PerformanceStats } from './PerformanceProfiler';

// Virtual scrolling components
export { default as VirtualScrollList, useVirtualList, VirtualLeadsList, VirtualCampaignsList } from './VirtualScrollList';

// Error boundary components
export { default as ErrorBoundary, withErrorBoundary, useErrorHandler, setupGlobalErrorHandler } from './ErrorBoundary';

// Performance benchmarking utilities
export { 
  benchmark,
  ReactPerformanceMonitor,
  MemoryMonitor,
  usePerformanceMonitor,
  initWebVitalsMonitoring
} from '../../utils/performanceBenchmark';