import chalk from 'chalk';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

const logLevels = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof logLevels[number];

interface LogContext {
  [key: string]: any;
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

class Logger {
  private level: LogLevel = 'info';
  private logToFile: boolean = false;
  private logDir: string = 'logs';

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL as LogLevel;
    if (envLevel && logLevels.includes(envLevel)) {
      this.level = envLevel;
    }

    // Enable file logging in production
    if (process.env.NODE_ENV === 'production') {
      this.logToFile = true;
      this.ensureLogDirectory();
    }
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  // Convenience method for logging errors with stack traces
  logError(error: Error, message?: string, context?: LogContext) {
    const errorContext = {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
    this.error(message || error.message, errorContext);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (logLevels.indexOf(level) < logLevels.indexOf(this.level)) return;

    const timestamp = new Date();
    const timestampStr = format(timestamp, 'yyyy-MM-dd HH:mm:ss');
    const levelLabel = level.toUpperCase().padEnd(5);

    // Create structured log entry
    const logEntry = {
      timestamp: timestamp.toISOString(),
      level,
      message,
      ...context
    };

    // Console output with colors
    let formattedMessage = `[${timestampStr}] ${levelLabel} ${message}`;

    // Apply color based on log level
    switch(level) {
      case 'debug': formattedMessage = chalk.blue(formattedMessage); break;
      case 'info': formattedMessage = chalk.green(formattedMessage); break;
      case 'warn': formattedMessage = chalk.yellow(formattedMessage); break;
      case 'error': formattedMessage = chalk.red(formattedMessage); break;
    }

    console.log(formattedMessage);
    if (context) console.log(context);

    // Write to file in production
    if (this.logToFile) {
      this.writeToFile(level, logEntry);
    }
  }

  private writeToFile(level: LogLevel, logEntry: any) {
    try {
      const date = format(new Date(), 'yyyy-MM-dd');
      const filename = path.join(this.logDir, `${date}.log`);
      const logLine = JSON.stringify(logEntry) + '\n';

      fs.appendFileSync(filename, logLine);

      // Also write errors to separate error log
      if (level === 'error') {
        const errorFilename = path.join(this.logDir, `${date}-errors.log`);
        fs.appendFileSync(errorFilename, logLine);
      }
    } catch (error) {
      // Don't throw - logging should not break the application
      console.error('Failed to write to log file:', error);
    }
  }
}

export const logger = new Logger();