// src/utils/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => isDevelopment && console.log(...args),
  debug: (...args: unknown[]) => isDevelopment && console.debug(...args),
  warn: (...args: unknown[]) => isDevelopment && console.warn(...args),
  error: (...args: unknown[]) => isDevelopment && console.error(...args),
  info: (...args: unknown[]) => isDevelopment && console.info(...args),
};
