import { Rumtrace } from '../Rumtrace';
import type { NavigationRefLike } from '../types';

export interface NavigationInstrumentationConfig {
  enabled?: boolean;
  /** Route names that should not produce view spans. */
  ignoreRoutes?: string[];
  /** Map a navigation route name to a display name for the span. */
  routeNameTransformer?: (routeName: string) => string;
  enableDebugLogging?: boolean;
}

interface ViewSession {
  routeName: string;
  startTime: number;
  params?: Record<string, unknown>;
}

/**
 * React Navigation bridge: starts/ends Rumtrace view spans as the active
 * route changes. Stateless aside from the singleton currentView snapshot.
 */
export class NavigationInstrumentation {
  private static instance: NavigationInstrumentation | null = null;
  private config: Required<
    Omit<NavigationInstrumentationConfig, 'routeNameTransformer'>
  > & { routeNameTransformer?: (routeName: string) => string };
  private currentView: ViewSession | null = null;

  private constructor(config: NavigationInstrumentationConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      ignoreRoutes: config.ignoreRoutes ?? [],
      enableDebugLogging: config.enableDebugLogging ?? false,
      routeNameTransformer: config.routeNameTransformer,
    };
  }

  static getInstance(
    config?: NavigationInstrumentationConfig,
  ): NavigationInstrumentation {
    if (!NavigationInstrumentation.instance) {
      NavigationInstrumentation.instance = new NavigationInstrumentation(
        config,
      );
    } else if (config && Object.keys(config).length > 0) {
      NavigationInstrumentation.instance.applyConfig(config);
    }
    return NavigationInstrumentation.instance;
  }

  private applyConfig(config: NavigationInstrumentationConfig): void {
    this.config = { ...this.config, ...config };
  }

  startViewFromRef(ref: NavigationRefLike | null | undefined): void {
    if (!ref || typeof ref.getCurrentRoute !== 'function') return;
    const route = ref.getCurrentRoute();
    if (!route) return;
    this.startView(route.name || 'unknown', route.params);
  }

  endCurrentView(): void {
    this.currentView = null;
    void Rumtrace.endCurrentView();
  }

  startView(
    viewName: string,
    params?: Record<string, unknown>,
    customContext?: Record<string, string>,
  ): void {
    if (!this.config.enabled || this.shouldIgnoreRoute(viewName)) return;

    if (this.currentView?.routeName === viewName) {
      // Same route — only emit a `route.params.changed` event if params changed.
      if (!deepEqual(this.currentView.params, params)) {
        this.log(`Params changed for view: ${viewName}`);
        this.currentView = { ...this.currentView, params };
        const attributes: Record<string, string> = { route_name: viewName };
        if (params) {
          attributes.route_params = safeStringify(sanitizeParams(params));
        }
        void Rumtrace.addViewEvent('route.params.changed', attributes);
      }
      return;
    }

    this.endCurrentView();
    this.log(`Starting view: ${viewName}`);
    this.currentView = { routeName: viewName, startTime: Date.now(), params };

    const displayName = this.config.routeNameTransformer
      ? this.config.routeNameTransformer(viewName)
      : viewName;

    void Rumtrace.startView(displayName, this.buildViewUrl(viewName, params));

    const context: Record<string, string> = {
      route_name: viewName,
      ...(customContext ?? {}),
    };
    if (params) {
      const sanitized = sanitizeParams(params);
      for (const [k, v] of Object.entries(sanitized)) {
        context[`route_param.${k}`] = String(v);
      }
    }
    void Rumtrace.setViewAttributes(context);
  }

  private shouldIgnoreRoute(routeName: string): boolean {
    return this.config.ignoreRoutes.includes(routeName);
  }

  private buildViewUrl(
    routeName: string,
    params?: Record<string, unknown>,
  ): string {
    let url = `/${routeName}`;
    if (params && Object.keys(params).length > 0) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          search.append(key, String(value));
        }
      }
      url += `?${search.toString()}`;
    }
    return url;
  }

  private log(message: string): void {
    if (this.config.enableDebugLogging) {
      // eslint-disable-next-line no-console
      console.log(`[Rumtrace Navigation] ${message}`);
    }
  }
}

function sanitizeParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('token') ||
      lower.includes('secret')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = '[OBJECT]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a == null || b == null) return false;
  if (typeof a !== 'object') return false;
  const aIsArray = Array.isArray(a);
  if (aIsArray !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (
      !bKeys.includes(key) ||
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    ) {
      return false;
    }
  }
  return true;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default NavigationInstrumentation;
