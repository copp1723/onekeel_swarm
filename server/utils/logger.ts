interface LogContext {
  [key: string]: any;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class UnifiedLogger {
  private logLevel: LogLevel;
  
  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  error(message: string, context?: LogContext | Error): void {
    const errorContext = context instanceof Error 
      ? { error: context.message, stack: context.stack }
      : context;
    console.error(this.formatMessage('error', message, errorContext));
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }
}

// Single logger instance
export const logger = new UnifiedLogger();

// Legacy compatibility
export const CCLLogger = UnifiedLogger;
export default logger;