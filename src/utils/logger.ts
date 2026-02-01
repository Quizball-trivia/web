type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

const isDev = process.env.NODE_ENV !== 'production';

// In production, this could send to Sentry, backend logging endpoint, etc.
async function reportError(entry: LogEntry): Promise<void> {
  void entry;
  if (isDev) return;

  // TODO: Implement production error reporting
  // Options: Sentry, LogRocket, custom backend endpoint
  // Example: await fetch('/api/v1/logs', { method: 'POST', body: JSON.stringify(_entry) });
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },

  info: (...args: unknown[]) => {
    if (isDev) console.info('[INFO]', ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
    reportError({ level: 'warn', message: String(args[0]), data: args.slice(1), timestamp: new Date().toISOString() });
  },

  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
    reportError({ level: 'error', message: String(args[0]), data: args.slice(1), timestamp: new Date().toISOString() });
  },
};
