import { Rumtrace } from './Rumtrace';
import type { Attributes, LogLevel } from './types';

/**
 * Lightweight typed logger built on `Rumtrace.log`. Mirrors the OTel
 * severity vocabulary and is safe to import standalone.
 */
export interface Logger {
  log(level: LogLevel, message: string, attributes?: Attributes): Promise<void>;
  trace(message: string, attributes?: Attributes): Promise<void>;
  debug(message: string, attributes?: Attributes): Promise<void>;
  info(message: string, attributes?: Attributes): Promise<void>;
  warn(message: string, attributes?: Attributes): Promise<void>;
  error(message: string, attributes?: Attributes): Promise<void>;
  fatal(message: string, attributes?: Attributes): Promise<void>;
}

export const logger: Logger = {
  log: (level, message, attributes) => Rumtrace.log(level, message, attributes),
  trace: (message, attributes) => Rumtrace.log('trace', message, attributes),
  debug: (message, attributes) => Rumtrace.log('debug', message, attributes),
  info: (message, attributes) => Rumtrace.log('info', message, attributes),
  warn: (message, attributes) => Rumtrace.log('warn', message, attributes),
  error: (message, attributes) => Rumtrace.log('error', message, attributes),
  fatal: (message, attributes) => Rumtrace.log('fatal', message, attributes),
};
