import React, {
  useEffect,
  useState,
  type ForwardedRef,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { Rumtrace } from './Rumtrace';
import { ErrorInstrumentation } from './instrumentation/errors';
import { NavigationInstrumentation } from './instrumentation/navigation';
import { NetworkInstrumentation } from './instrumentation/network';
import type { NavigationRefLike, RumtraceConfig } from './types';

export interface RumtraceProviderProps {
  /** Application content. Rendered after `Rumtrace.initialize` resolves. */
  children: ReactNode;
  /** Full Rumtrace configuration (agent + native instrumentation + JS layer). */
  config: RumtraceConfig;
  /**
   * Optional React Navigation `NavigationContainerRef`. When provided, the
   * provider will start/end view spans on route changes and on app state
   * transitions.
   */
  ref?: ForwardedRef<NavigationRefLike>;
  /**
   * Element rendered while the SDK initializes. Defaults to `null`.
   * Useful for splash screens or skeleton UIs.
   */
  fallback?: ReactNode;
}

/**
 * Initializes the native Rumtrace SDK on mount, wires up JS-side
 * instrumentation (errors, network, navigation), and ensures view spans
 * end / flush when the app is backgrounded or unmounted.
 */
export function RumtraceProvider({
  children,
  config,
  ref,
  fallback = null,
}: RumtraceProviderProps): React.ReactElement | null {
  const [initialized, setInitialized] = useState(false);
  const [navRef, setNavRef] = useState<NavigationRefLike | null>(null);

  // ── Initialize SDK + JS instrumentation once ────────────────────────
  useEffect(() => {
    let cancelled = false;
    Rumtrace.initialize(config)
      .then(() => {
        if (cancelled) return;

        ErrorInstrumentation.getInstance({
          enabled: true,
        }).start();

        if (config.enableNetworkInstrumentation !== false) {
          const ignoreSubstrings = [...(config.urlSessionIgnoreSubstrings ?? [])];
          const ignoreRegexes = [...(config.urlSessionIgnoreRegexes ?? [])];

          if (
            config.ignoreExporterURLsByDefault !== false &&
            config.exportUrl
          ) {
            ignoreSubstrings.push(config.exportUrl);
          }

          NetworkInstrumentation.getInstance({
            enabled: true,
            ignoreUrlSubstrings: ignoreSubstrings,
            ignoreUrlRegexes: ignoreRegexes,
            enableDebugLogging: !!config.enableDebugLogging,
            propagateTraceContext: config.propagateTraceContext !== false,
          }).start();
        }

        setInitialized(true);
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize Rumtrace:', error);
      });

    return () => {
      cancelled = true;
    };
    // We intentionally re-run only when the config object reference changes;
    // callers should memoize the config they pass in.
  }, [config]);

  // ── Resolve navigation ref (it may be attached after first render) ──
  useEffect(() => {
    if (navRef) return;
    if (!ref) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const resolve = () => {
      if (ref && typeof ref === 'object' && 'current' in ref && ref.current) {
        setNavRef(ref.current as NavigationRefLike);
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };
    resolve();
    if (!navRef) {
      intervalId = setInterval(resolve, 100);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [ref, navRef]);

  // ── Wire up navigation instrumentation ──────────────────────────────
  useEffect(() => {
    if (!navRef || !initialized) return;

    const nav = NavigationInstrumentation.getInstance({
      enableDebugLogging: !!config.enableDebugLogging,
    });
    nav.startViewFromRef(navRef);

    if (typeof navRef.addListener === 'function') {
      const unsubscribe = navRef.addListener('state', () => {
        nav.startViewFromRef(navRef);
      });
      return unsubscribe;
    }
    return undefined;
  }, [initialized, navRef, config.enableDebugLogging]);

  // ── App state transitions: end view + flush on background ───────────
  useEffect(() => {
    if (!initialized || !navRef) return;

    const handler = (state: AppStateStatus) => {
      if (state !== 'active') {
        NavigationInstrumentation.getInstance().endCurrentView();
        void Rumtrace.forceFlush();
      } else {
        NavigationInstrumentation.getInstance().startViewFromRef(navRef);
      }
    };
    const subscription = AppState.addEventListener('change', handler);
    return () => subscription.remove();
  }, [initialized, navRef]);

  // ── Final cleanup ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      NavigationInstrumentation.getInstance().endCurrentView();
      void Rumtrace.forceFlush();
    };
  }, []);

  if (!initialized) return <>{fallback}</>;
  return <>{children}</>;
}
