type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown> | undefined;

interface LogEntry {
  level: LogLevel;
  message: string;
  meta?: LogMeta;
  timestamp: string;
}

const isDev = process.env.NODE_ENV !== "production";

function normalizeMeta(meta: unknown): LogMeta {
  if (!meta) return undefined;
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }
  if (typeof meta === "object") {
    return meta as Record<string, unknown>;
  }
  return { value: meta };
}

// In production, this could send to Sentry, backend logging endpoint, etc.
async function reportError(entry: LogEntry): Promise<void> {
  void entry;
  if (isDev) return;
  // TODO: Implement production error reporting
}

function log(level: LogLevel, message: string, meta?: unknown) {
  const entry: LogEntry = {
    level,
    message,
    meta: normalizeMeta(meta),
    timestamp: new Date().toISOString(),
  };

  if (isDev) {
    const method =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : level === "info"
            ? console.info
            : console.debug;
    method(message, entry);
    return;
  }

  if (level === "warn" || level === "error") {
    console.warn(entry);
    reportError(entry);
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
};
