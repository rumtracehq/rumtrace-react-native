/**
 * Public types for @rumtrace/rumtrace-rn-ios.
 *
 * These mirror the configuration surface of `RumtraceAgentConfigBuilder` and
 * `RumtraceInstrumentationConfigBuilder` in the native iOS SDK so the JS layer
 * is a thin, predictable pass-through.
 */

/** Allowed scalar attribute values for telemetry payloads. */
export type AttributeValue = string | number | boolean | null;

/** A bag of telemetry attributes. */
export type Attributes = Record<string, AttributeValue>;

/** Severity levels accepted by `Rumtrace.log` / `logger.*`. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Configuration for the Rumtrace agent (collector + sampling).
 * Maps to `RumtraceAgentConfigBuilder` on iOS.
 */
export interface AgentConfig {
  /** Full collector URL (e.g. `https://traces.rumtrace.com:443`). */
  exportUrl?: string;
  /** Deployment environment name (e.g. `production`, `staging`). */
  environment?: string;
  /** Auth/client token forwarded to the collector. */
  clientToken?: string;
  /** Session sample rate in `[0, 1]`. Defaults to `1.0` (sample everything). */
  sampleRate?: number;
}

/**
 * Configuration for native instrumentation packs.
 * Maps to `RumtraceInstrumentationConfigBuilder` on iOS.
 */
export interface InstrumentationConfig {
  enableCrashReporting?: boolean;
  enableCrashReportingInDebug?: boolean;
  enableURLSessionInstrumentation?: boolean;
  enableViewControllerInstrumentation?: boolean;
  enableAppMetricInstrumentation?: boolean;
  enableSystemMetrics?: boolean;
  enableLifecycleEvents?: boolean;
  enableHangInstrumentation?: boolean;
  enableLowPowerModeInstrumentation?: boolean;
  enableTapInstrumentation?: boolean;
  enableExitInstrumentation?: boolean;
  enablePushNotificationInstrumentation?: boolean;
  enableWebViewInstrumentation?: boolean;
  enableSessionUsageInstrumentation?: boolean;
  sessionInactivityThresholdSeconds?: number;
  urlSessionIgnoreSubstrings?: string[];
  urlSessionIgnoreRegexes?: string[];
  ignoreExporterURLsByDefault?: boolean;
}

/**
 * JS-only options layered on top of the native instrumentation config.
 */
export interface JsInstrumentationConfig {
  /**
   * Enable JS-level fetch / XMLHttpRequest network instrumentation.
   * Defaults to `true`. Set to `false` if you only want native URLSession spans.
   */
  enableNetworkInstrumentation?: boolean;
  /**
   * Inject W3C `traceparent` / `tracestate` headers on outgoing requests so
   * downstream services can correlate. Defaults to `true`.
   */
  propagateTraceContext?: boolean;
  /** Verbose logging for the JS instrumentation layer. */
  enableDebugLogging?: boolean;
}

/**
 * Top-level config consumed by `Rumtrace.initialize` and `<RumtraceProvider>`.
 * It is the union of the agent, instrumentation, and JS-side options for
 * ergonomic single-call setup.
 */
export interface RumtraceConfig
  extends AgentConfig,
    InstrumentationConfig,
    JsInstrumentationConfig {}

/**
 * Loose React Navigation `NavigationContainerRef`. We avoid a hard dependency
 * on `@react-navigation/native` to keep the wrapper framework-agnostic.
 */
export interface NavigationRefLike {
  getCurrentRoute?: () => { name: string; params?: Record<string, unknown> } | undefined;
  addListener?: (
    event: 'state' | string,
    callback: (...args: unknown[]) => void,
  ) => () => void;
}

/** Backwards-compatible alias. */
export type NavRef = NavigationRefLike;
