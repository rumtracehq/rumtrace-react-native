/**
 * Public surface for `@rumtrace/rumtrace-rn-ios`.
 *
 * Most apps only need:
 *   import { RumtraceProvider, Rumtrace, logger } from '@rumtrace/rumtrace-rn-ios';
 *
 * The lower-level `*Instrumentation` classes are exposed for advanced
 * customization (custom transformers, ignore lists at runtime, etc.).
 */

export { Rumtrace } from './Rumtrace';
export type {
  NetworkSpanHandle,
  NetworkSpanCompletion,
  NetworkRequestReport,
} from './Rumtrace';

export { RumtraceProvider } from './RumtraceProvider';
export type { RumtraceProviderProps } from './RumtraceProvider';

export { logger } from './logger';
export type { Logger } from './logger';

export {
  NavigationInstrumentation,
  type NavigationInstrumentationConfig,
} from './instrumentation/navigation';
export {
  ErrorInstrumentation,
  type ErrorInstrumentationConfig,
} from './instrumentation/errors';
export {
  NetworkInstrumentation,
  type NetworkInstrumentationConfig,
} from './instrumentation/network';

export type {
  AgentConfig,
  Attributes,
  AttributeValue,
  InstrumentationConfig,
  JsInstrumentationConfig,
  LogLevel,
  NavigationRefLike,
  NavRef,
  RumtraceConfig,
} from './types';
