// Global type declarations for OneKeel Swarm
import { Server } from 'http';
import { WebSocketServer } from 'ws';

// Global node types
declare global {
  namespace NodeJS {
    interface Global {
      appShutdownRefs?: AppShutdownRefs;
      gc?: () => void;
    }
  }
  
  // Global variables
  var appShutdownRefs: AppShutdownRefs | undefined;
  var gc: (() => void) | undefined;
}

// Application shutdown references
export interface AppShutdownRefs {
  server: Server;
  wss?: WebSocketServer | null;
  memoryMonitor?: NodeJS.Timeout | null;
  heartbeat?: NodeJS.Timeout | null;
  wsHandler?: {
    cleanup: () => void;
  };
  config: {
    features: {
      enableAgents: boolean;
      enableWebSocket: boolean;
      enableRedis: boolean;
      enableMonitoring: boolean;
      enableHealthChecks: boolean;
      enableQueueSystem: boolean;
      enableMemoryMonitoring: boolean;
      enableDebugRoutes: boolean;
      enableLazyAgents: boolean;
    };
  };
}

// Server configuration types
export interface ServerConfig {
  port: string | number;
  nodeEnv: string;
  memoryLimit: number;
  serverMode: 'minimal' | 'lightweight' | 'debug' | 'standard';
  features: {
    enableAgents: boolean;
    enableWebSocket: boolean;
    enableRedis: boolean;
    enableMonitoring: boolean;
    enableHealthChecks: boolean;
    enableQueueSystem: boolean;
    enableMemoryMonitoring: boolean;
    enableDebugRoutes: boolean;
    enableLazyAgents: boolean;
  };
}

// Memory monitoring types
export interface MemoryStats {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface MemoryLeakDetection {
  heapGrowth: number;
  rssGrowth: number;
  [key: string]: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  id?: string;
}

// Health check response
export interface HealthResponse {
  status: 'ok' | 'error';
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    limit: number;
    percent: number;
  };
  features: ServerConfig['features'];
  uptime: number;
}

// Process environment extensions
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    DATABASE_URL?: string;
    JWT_SECRET?: string;
    MEMORY_LIMIT?: string;
    SERVER_MODE?: 'minimal' | 'lightweight' | 'debug' | 'standard';
    ENABLE_AGENTS?: string;
    ENABLE_WEBSOCKET?: string;
    ENABLE_REDIS?: string;
    ENABLE_MONITORING?: string;
    ENABLE_HEALTH_CHECKS?: string;
    ENABLE_QUEUE_SYSTEM?: string;
    ENABLE_MEMORY_MONITORING?: string;
    ENABLE_DEBUG_ROUTES?: string;
    ENABLE_LAZY_AGENTS?: string;
    SECURE_WEBSOCKET?: string;
    MONITORING_WS_PORT?: string;
  }
}

export {};