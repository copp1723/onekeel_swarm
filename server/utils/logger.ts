import chalk from 'chalk';
import { format } from 'date-fns';

const logLevels = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof logLevels[number];

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel) {
    this.level = level;
  }

  debug(message: string, context?: object) {
    this.log('debug', message, context);
  }

  info(message: string, context?: object) {
    this.log('info', message, context);
  }

  warn(message: string, context?: object) {
    this.log('warn', message, context);
  }

  error(message: string, context?: object) {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context?: object) {
    if (logLevels.indexOf(level) < logLevels.indexOf(this.level)) return;
    
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const levelLabel = level.toUpperCase().padEnd(5);
    let formattedMessage = `[${timestamp}] ${levelLabel} ${message}`;
    
    // Apply color based on log level
    switch(level) {
      case 'debug': formattedMessage = chalk.blue(formattedMessage); break;
      case 'info': formattedMessage = chalk.green(formattedMessage); break;
      case 'warn': formattedMessage = chalk.yellow(formattedMessage); break;
      case 'error': formattedMessage = chalk.red(formattedMessage); break;
    }
    
    console.log(formattedMessage);
    if (context) console.log(context);
  }
}

export const logger = new Logger();