import pino, { type Logger, type LoggerOptions } from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

function buildLoggerOptions(): LoggerOptions {
  return {
    level: process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'info'),
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: false,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  };
}

export type LogBindings = Record<string, string | number | boolean | null | undefined>;

export const logger: Logger = pino(buildLoggerOptions());

export function withLogContext(bindings: LogBindings = {}): Logger {
  const context = Object.fromEntries(
    Object.entries(bindings).filter(([, value]) => value !== undefined),
  );

  return Object.keys(context).length > 0 ? logger.child(context) : logger;
}
