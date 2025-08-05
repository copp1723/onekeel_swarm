import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setupGlobalErrorHandler, initWebVitalsMonitoring, MemoryMonitor, ErrorBoundary } from './components/performance';

// Initialize performance monitoring and error handling
setupGlobalErrorHandler();
initWebVitalsMonitoring();

// Start memory monitoring in development
if (process.env.NODE_ENV === 'development') {
  MemoryMonitor.startMonitoring(10000); // Monitor every 10 seconds
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary enableReporting={true} showDetails={process.env.NODE_ENV === 'development'}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);