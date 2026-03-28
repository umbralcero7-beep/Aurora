/**
 * Aurora OS - Logger
 * Centralized logging with environment-aware output.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = process.env.NODE_ENV === 'development';
const minLevel: LogLevel = isDev ? 'debug' : 'warn';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatEntry(level: LogLevel, message: string, context?: string, data?: unknown): LogEntry {
  return {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
  };
}

function output(entry: LogEntry): void {
  const prefix = `[Aurora${entry.context ? `:${entry.context}` : ''}]`;
  const method = entry.level === 'error' ? console.error
    : entry.level === 'warn' ? console.warn
    : console.log;

  if (entry.data !== undefined) {
    method(prefix, entry.message, entry.data);
  } else {
    method(prefix, entry.message);
  }
}

export const logger = {
  debug(message: string, context?: string, data?: unknown): void {
    if (shouldLog('debug')) {
      output(formatEntry('debug', message, context, data));
    }
  },

  info(message: string, context?: string, data?: unknown): void {
    if (shouldLog('info')) {
      output(formatEntry('info', message, context, data));
    }
  },

  warn(message: string, context?: string, data?: unknown): void {
    if (shouldLog('warn')) {
      output(formatEntry('warn', message, context, data));
    }
  },

  error(message: string, context?: string, data?: unknown): void {
    if (shouldLog('error')) {
      output(formatEntry('error', message, context, data));
    }
  },
};
