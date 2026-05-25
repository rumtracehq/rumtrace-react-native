import NativeRumtrace from './NativeRumtrace';
import type {
  AgentConfig,
  Attributes,
  InstrumentationConfig,
  LogLevel,
  RumtraceConfig,
} from './types';

/** Result of `startNetworkSpan` (Phase 1 of two-phase HTTP instrumentation). */
export interface NetworkSpanHandle {
  spanId: string;
  traceId: string;
  /** Pre-formatted W3C `traceparent` header value (e.g. `00-<traceId>-<spanId>-01`). */
  traceparent: string;
}

/** Response info passed to `endNetworkSpan` (Phase 2). */
export interface NetworkSpanCompletion {
  statusCode: number;
  /** Empty string for success. Non-empty becomes the span's error description. */
  error: string;
  /** Use `-1` when unknown. */
  requestContentLength: number;
  /** Use `-1` when unknown. */
  responseContentLength: number;
}

/** One-shot network reporting payload (no header injection). */
export interface NetworkRequestReport {
  method: string;
  url: string;
  statusCode: number;
  startTimeMs: number;
  endTimeMs: number;
  /** Use `-1` when unknown. */
  requestContentLength: number;
  /** Use `-1` when unknown. */
  responseContentLength: number;
  /** Empty string for success. */
  error: string;
}

/**
 * Strict pickers for the agent / instrumentation slices of `RumtraceConfig`.
 * Keeping them inline avoids exposing intermediate types that would just
 * mirror the union.
 */
function buildAgentConfig(config: RumtraceConfig): AgentConfig {
  const out: AgentConfig = {};
  if (config.exportUrl !== undefined) out.exportUrl = config.exportUrl;
  if (config.environment !== undefined) out.environment = config.environment;
  if (config.clientToken !== undefined) out.clientToken = config.clientToken;
  if (config.sampleRate !== undefined) out.sampleRate = config.sampleRate;
  return out;
}

function buildInstrumentationConfig(
  config: RumtraceConfig,
): InstrumentationConfig {
  const out: InstrumentationConfig = {};
  const flags: ReadonlyArray<keyof InstrumentationConfig> = [
    'enableCrashReporting',
    'enableCrashReportingInDebug',
    'enableURLSessionInstrumentation',
    'enableViewControllerInstrumentation',
    'enableAppMetricInstrumentation',
    'enableSystemMetrics',
    'enableLifecycleEvents',
    'enableHangInstrumentation',
    'enableLowPowerModeInstrumentation',
    'enableTapInstrumentation',
    'enableExitInstrumentation',
    'enablePushNotificationInstrumentation',
    'enableWebViewInstrumentation',
    'enableSessionUsageInstrumentation',
    'sessionInactivityThresholdSeconds',
    'urlSessionIgnoreSubstrings',
    'urlSessionIgnoreRegexes',
    'ignoreExporterURLsByDefault',
  ];

  for (const key of flags) {
    const value = config[key];
    if (value !== undefined) {
      // Cast is safe: we just enumerated the keys of InstrumentationConfig.
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

/**
 * High-level facade over the `Rumtrace` TurboModule.
 *
 * All methods are static and forward to the native iOS SDK
 * (`RumtraceIosSdkAgent`). Errors are propagated as rejected promises so
 * callers can decide whether to swallow or surface them — there is no
 * silent-catch behavior in this layer.
 */
export class Rumtrace {
  /** Initialize the native SDK. Safe to call only once per app lifecycle. */
  static async initialize(config: RumtraceConfig): Promise<void> {
    const agentConfig = buildAgentConfig(config);
    const instrConfig = buildInstrumentationConfig(config);
    await NativeRumtrace.startAgent(agentConfig, instrConfig);
  }

  // ── View lifecycle ─────────────────────────────────────────────────
  static startView(name: string, url?: string): Promise<void> {
    return NativeRumtrace.startView(name, url);
  }
  static endCurrentView(): Promise<void> {
    return NativeRumtrace.endCurrentView();
  }
  static forceFlush(): Promise<void> {
    return NativeRumtrace.forceFlush();
  }

  // ── User / global attributes ───────────────────────────────────────
  static setUser(user: Record<string, string>): Promise<void> {
    return NativeRumtrace.setUser(user ?? {});
  }
  static addGlobalAttribute(key: string, value: string): Promise<void> {
    return NativeRumtrace.addGlobalAttribute(key, value);
  }
  static addGlobalAttributes(attrs: Record<string, string>): Promise<void> {
    return NativeRumtrace.addGlobalAttributes(attrs ?? {});
  }
  static removeGlobalAttribute(key: string): Promise<void> {
    return NativeRumtrace.removeGlobalAttribute(key);
  }

  // ── View-scoped attributes ─────────────────────────────────────────
  static setViewAttribute(key: string, value: string): Promise<void> {
    return NativeRumtrace.setViewAttribute(key, value);
  }
  static setViewAttributes(attrs: Record<string, string>): Promise<void> {
    return NativeRumtrace.setViewAttributes(attrs ?? {});
  }
  static addViewEvent(name: string, attributes?: Attributes): Promise<void> {
    return NativeRumtrace.addViewEvent(name, attributes ?? {});
  }

  // ── Custom events ──────────────────────────────────────────────────
  static addAction(
    actionName: string,
    options?: { actionType?: string; attributes?: Attributes },
  ): Promise<void> {
    return NativeRumtrace.addAction({
      actionName,
      actionType: options?.actionType ?? 'custom',
      attributes: options?.attributes ?? {},
    });
  }

  static addError(error: Error | string, source?: string): Promise<void> {
    const message =
      typeof error === 'string' ? error : error?.message ?? 'Unknown error';
    const stack = typeof error === 'string' ? undefined : error?.stack;
    return NativeRumtrace.addError(message, source, stack);
  }

  static addTiming(name: string, durationMs: number): Promise<void> {
    return NativeRumtrace.addTiming(name, durationMs);
  }

  static log(
    level: LogLevel,
    message: string,
    attributes?: Attributes,
  ): Promise<void> {
    return NativeRumtrace.addLog(message, level, attributes ?? {});
  }

  // ── Session attributes ─────────────────────────────────────────────
  static setSessionAttribute(key: string, valueMs: number): Promise<void> {
    return NativeRumtrace.setSessionAttribute(key, valueMs);
  }
  static endRootSessionNow(): Promise<void> {
    return NativeRumtrace.endRootSessionNow();
  }

  // ── JS-level network instrumentation ───────────────────────────────
  static startNetworkSpan(
    method: string,
    url: string,
  ): Promise<NetworkSpanHandle> {
    return NativeRumtrace.startNetworkSpan(method, url) as Promise<NetworkSpanHandle>;
  }
  static endNetworkSpan(
    spanId: string,
    info: NetworkSpanCompletion,
  ): Promise<void> {
    return NativeRumtrace.endNetworkSpan(spanId, info);
  }
  static reportNetworkRequest(info: NetworkRequestReport): Promise<void> {
    return NativeRumtrace.reportNetworkRequest(info);
  }

  // ── iOS-only UIViewController tied views ───────────────────────────
  static startUIViewControllerView(
    name?: string,
    url?: string,
  ): Promise<void> {
    return NativeRumtrace.startUIViewControllerView(name, url);
  }
  static endUIViewControllerView(): Promise<void> {
    return NativeRumtrace.endUIViewControllerView();
  }
}
