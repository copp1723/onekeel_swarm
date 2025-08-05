interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

interface BenchmarkResult {
  name: string;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  executionCount: number;
  entries: PerformanceEntry[];
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

class PerformanceBenchmark {
  private entries: Map<string, PerformanceEntry[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  constructor(enabled: boolean = process.env.NODE_ENV === 'development') {
    this.isEnabled = enabled;
    
    if (this.isEnabled) {
      this.setupPerformanceObserver();
    }
  }

  private setupPerformanceObserver() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordNavigationTiming(entry as PerformanceNavigationTiming);
            } else if (entry.entryType === 'measure') {
              this.recordMeasure(entry as PerformanceMeasure);
            }
          }
        });
        
        observer.observe({ entryTypes: ['navigation', 'measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  private recordNavigationTiming(entry: PerformanceNavigationTiming) {
    const timings = {
      'dns-lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'tcp-connect': entry.connectEnd - entry.connectStart,
      'request': entry.responseStart - entry.requestStart,
      'response': entry.responseEnd - entry.responseStart,
      'dom-parse': entry.domInteractive - entry.responseEnd,
      'dom-content-loaded': entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      'load': entry.loadEventEnd - entry.loadEventStart,
      'total': entry.loadEventEnd - entry.navigationStart,
    };

    Object.entries(timings).forEach(([name, duration]) => {
      if (duration > 0) {
        this.addEntry(`navigation.${name}`, Date.now() - duration, Date.now(), { type: 'navigation' });
      }
    });
  }

  private recordMeasure(entry: PerformanceMeasure) {
    this.addEntry(entry.name, entry.startTime, entry.startTime + entry.duration, { 
      type: 'measure',
      entryType: entry.entryType 
    });
  }

  // Start timing a performance measurement
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;
    
    const startTime = performance.now();
    this.activeTimers.set(name, startTime);
    
    // Store metadata for later use
    if (metadata) {
      const key = `${name}_metadata`;
      this.activeTimers.set(key, metadata as any);
    }
  }

  // End timing and record the measurement
  end(name: string): number | null {
    if (!this.isEnabled) return null;
    
    const startTime = this.activeTimers.get(name);
    if (startTime === undefined) {
      console.warn(`Performance timer '${name}' was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Get metadata if it exists
    const metadataKey = `${name}_metadata`;
    const metadata = this.activeTimers.get(metadataKey) as Record<string, any> | undefined;
    
    this.addEntry(name, startTime, endTime, metadata);
    
    // Clean up
    this.activeTimers.delete(name);
    if (metadata) {
      this.activeTimers.delete(metadataKey);
    }
    
    return duration;
  }

  // Time a function execution
  time<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.isEnabled) return fn();
    
    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  // Time an async function execution
  async timeAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.isEnabled) return fn();
    
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  private addEntry(name: string, startTime: number, endTime: number, metadata?: Record<string, any>): void {
    const entry: PerformanceEntry = {
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata
    };

    if (!this.entries.has(name)) {
      this.entries.set(name, []);
    }
    
    this.entries.get(name)!.push(entry);
  }

  // Get benchmark results for a specific measurement
  getResults(name: string): BenchmarkResult | null {
    const entries = this.entries.get(name);
    if (!entries || entries.length === 0) {
      return null;
    }

    const durations = entries.map(e => e.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      name,
      totalDuration,
      averageDuration: totalDuration / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      executionCount: durations.length,
      entries: [...entries],
      percentiles: {
        p50: this.percentile(durations, 50),
        p90: this.percentile(durations, 90),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99),
      }
    };
  }

  // Get all benchmark results
  getAllResults(): BenchmarkResult[] {
    return Array.from(this.entries.keys())
      .map(name => this.getResults(name))
      .filter((result): result is BenchmarkResult => result !== null);
  }

  // Clear all measurements
  clear(name?: string): void {
    if (name) {
      this.entries.delete(name);
    } else {
      this.entries.clear();
    }
  }

  // Export results to JSON
  exportResults(): string {
    const results = this.getAllResults();
    const exportData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      results
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Generate performance report
  generateReport(): string {
    const results = this.getAllResults();
    let report = '# Performance Benchmark Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `URL: ${window.location.href}\n\n`;

    results.forEach(result => {
      report += `## ${result.name}\n`;
      report += `- **Executions**: ${result.executionCount}\n`;
      report += `- **Average**: ${result.averageDuration.toFixed(2)}ms\n`;
      report += `- **Min**: ${result.minDuration.toFixed(2)}ms\n`;
      report += `- **Max**: ${result.maxDuration.toFixed(2)}ms\n`;
      report += `- **P50**: ${result.percentiles.p50.toFixed(2)}ms\n`;
      report += `- **P90**: ${result.percentiles.p90.toFixed(2)}ms\n`;
      report += `- **P95**: ${result.percentiles.p95.toFixed(2)}ms\n`;
      report += `- **P99**: ${result.percentiles.p99.toFixed(2)}ms\n\n`;
    });

    return report;
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    if (p <= 0) return sortedArray[0];
    if (p >= 100) return sortedArray[sortedArray.length - 1];

    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  // Enable/disable benchmarking
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Check if benchmarking is enabled
  get enabled(): boolean {
    return this.isEnabled;
  }
}

// Global benchmark instance
export const benchmark = new PerformanceBenchmark();

// React-specific performance utilities
export class ReactPerformanceMonitor {
  private static instance: ReactPerformanceMonitor;
  private renderTimes: Map<string, number[]> = new Map();

  static getInstance(): ReactPerformanceMonitor {
    if (!ReactPerformanceMonitor.instance) {
      ReactPerformanceMonitor.instance = new ReactPerformanceMonitor();
    }
    return ReactPerformanceMonitor.instance;
  }

  // Monitor component render time
  trackRender(componentName: string, renderTime: number): void {
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, []);
    }
    
    this.renderTimes.get(componentName)!.push(renderTime);
    
    // Keep only last 100 renders per component
    const times = this.renderTimes.get(componentName)!;
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }
  }

  // Get render statistics for a component
  getComponentStats(componentName: string) {
    const times = this.renderTimes.get(componentName);
    if (!times || times.length === 0) return null;

    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);

    return {
      componentName,
      renderCount: times.length,
      averageRenderTime: average,
      maxRenderTime: max,
      minRenderTime: min,
      recentRenderTimes: times.slice(-10) // Last 10 renders
    };
  }

  // Get all component statistics
  getAllStats() {
    return Array.from(this.renderTimes.keys())
      .map(name => this.getComponentStats(name))
      .filter(Boolean);
  }

  // Clear statistics
  clear(componentName?: string): void {
    if (componentName) {
      this.renderTimes.delete(componentName);
    } else {
      this.renderTimes.clear();
    }
  }
}

// Hook for monitoring component performance
export function usePerformanceMonitor(componentName: string) {
  const monitor = ReactPerformanceMonitor.getInstance();
  
  return {
    trackRender: (renderTime: number) => monitor.trackRender(componentName, renderTime),
    getStats: () => monitor.getComponentStats(componentName)
  };
}

// Memory usage monitoring
export class MemoryMonitor {
  private static measurements: Array<{
    timestamp: number;
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  }> = [];

  static measure(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.measurements.push({
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      });

      // Keep only last 100 measurements
      if (this.measurements.length > 100) {
        this.measurements.splice(0, this.measurements.length - 100);
      }
    }
  }

  static getLatestMeasurement() {
    return this.measurements[this.measurements.length - 1] || null;
  }

  static getAllMeasurements() {
    return [...this.measurements];
  }

  static getMemoryUsagePercentage(): number {
    const latest = this.getLatestMeasurement();
    if (!latest) return 0;
    
    return (latest.usedJSHeapSize / latest.jsHeapSizeLimit) * 100;
  }

  static startMonitoring(intervalMs: number = 5000): () => void {
    const interval = setInterval(() => {
      this.measure();
    }, intervalMs);

    return () => clearInterval(interval);
  }
}

// Web Vitals monitoring
export function initWebVitalsMonitoring() {
  // Monitor Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            benchmark.addEntry('web-vitals.lcp', 0, entry.startTime, {
              element: (entry as any).element?.tagName
            });
          }
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (error) {
      console.warn('LCP monitoring not supported:', error);
    }
  }

  // Monitor First Input Delay (FID)
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            benchmark.addEntry('web-vitals.fid', 0, (entry as any).processingStart - entry.startTime, {
              eventType: (entry as any).name
            });
          }
        }
      });
      observer.observe({ type: 'first-input', buffered: true });
    } catch (error) {
      console.warn('FID monitoring not supported:', error);
    }
  }

  // Monitor Cumulative Layout Shift (CLS)
  let clsValue = 0;
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            benchmark.addEntry('web-vitals.cls', 0, clsValue * 1000, {
              sources: (entry as any).sources?.map((s: any) => s.node?.tagName)
            });
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      console.warn('CLS monitoring not supported:', error);
    }
  }
}

export default PerformanceBenchmark;