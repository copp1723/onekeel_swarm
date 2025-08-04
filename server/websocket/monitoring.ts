import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import { logger } from '../utils/logger';

export class MonitoringWebSocketHandler {
  private wss: WebSocketServer;
  private interval: NodeJS.Timeout;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.wss.on('connection', (ws: any) => {
      logger.info('Monitoring WebSocket connection established');
      ws.send(JSON.stringify({ type: 'initial', data: this.getMetrics() }));
    });

    // Broadcast metrics every 5 seconds
    this.interval = setInterval(() => {
      const metrics = this.getMetrics();
      this.broadcast(metrics);
    }, 5000);
  }

  private getMetrics() {
    return {
      memoryUsage: process.memoryUsage(),
      loadAvg: os.loadavg(),
      timestamp: Date.now(),
    };
  }

  private broadcast(metrics: any) {
    this.wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'metrics', data: metrics }));
      }
    });
  }

  public cleanup() {
    clearInterval(this.interval);
  }
}
