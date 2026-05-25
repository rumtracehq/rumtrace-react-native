import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * TurboModule spec for the native `Rumtrace` module.
 *
 * NOTE: React Native codegen for TurboModules supports a restricted type
 * surface. We use `Object` (i.e. anonymous dictionaries) for free-form
 * attribute / config bags and let the higher-level `Rumtrace.ts` API expose
 * stronger types to callers. This avoids codegen errors on union types like
 * `string | number | boolean | null` while still giving the JS code a
 * type-checked binding.
 */
export interface Spec extends TurboModule {
  /**
   * Initialize the native Rumtrace iOS SDK.
   * Resolves with a status string or rejects on configuration errors.
   */
  startAgent(agentConfig: Object, instrConfig: Object): Promise<string>;

  // ── View lifecycle ───────────────────────────────────────────────
  startView(name: string, url?: string): Promise<void>;
  endCurrentView(): Promise<void>;
  forceFlush(): Promise<void>;

  // ── User / global state ──────────────────────────────────────────
  setUser(user: Object): Promise<void>;
  addGlobalAttribute(key: string, value: string): Promise<void>;
  addGlobalAttributes(attrs: Object): Promise<void>;
  removeGlobalAttribute(key: string): Promise<void>;

  // ── View-scoped state ────────────────────────────────────────────
  setViewAttribute(key: string, value: string): Promise<void>;
  setViewAttributes(attrs: Object): Promise<void>;
  addViewEvent(name: string, attributes?: Object): Promise<void>;

  // ── Custom events ────────────────────────────────────────────────
  addAction(payload: Object): Promise<void>;
  addError(message: string, source?: string, stack?: string): Promise<void>;
  addTiming(name: string, duration: number): Promise<void>;
  addLog(message: string, level?: string, attributes?: Object): Promise<void>;

  // ── Session attributes ───────────────────────────────────────────
  setSessionAttribute(key: string, valueMs: number): Promise<void>;
  endRootSessionNow(): Promise<void>;

  // ── JS-level network instrumentation (two-phase) ─────────────────
  /**
   * Phase 1: start a CLIENT span and return identifiers for W3C trace
   * context propagation. JS injects the returned `traceparent` header on
   * the outgoing request.
   */
  startNetworkSpan(method: string, url: string): Promise<Object>;

  /** Phase 2: end a span started by `startNetworkSpan` with response info. */
  endNetworkSpan(spanId: string, info: Object): Promise<void>;

  /** One-shot fallback when header injection isn't possible (e.g. XHR). */
  reportNetworkRequest(requestInfo: Object): Promise<void>;

  // ── iOS UIViewController-tied views (optional helper) ────────────
  startUIViewControllerView(name?: string, url?: string): Promise<void>;
  endUIViewControllerView(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Rumtrace');
