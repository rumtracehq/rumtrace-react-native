import { Rumtrace } from '../Rumtrace';

export interface ErrorInstrumentationConfig {
  enabled?: boolean;
  trackUnhandledRejections?: boolean;
  trackConsoleErrors?: boolean;
  /** Truncate captured stack traces to this many characters. Defaults to 2000. */
  maxStackTraceLength?: number;
}

type RnErrorUtils = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | null;
  setGlobalHandler?: (
    handler: (error: unknown, isFatal?: boolean) => void,
  ) => void;
};

/**
 * Captures uncaught JS errors, unhandled promise rejections, and
 * (optionally) `console.error` / `console.warn` calls and forwards them to
 * the native Rumtrace SDK as RUM errors / actions.
 */
export class ErrorInstrumentation {
  private static instance: ErrorInstrumentation | null = null;
  private config: Required<ErrorInstrumentationConfig>;
  private originalErrorHandler:
    | ((error: unknown, isFatal?: boolean) => void)
    | null = null;
  private originalConsoleError: typeof console.error | null = null;
  private originalConsoleWarn: typeof console.warn | null = null;
  private started = false;

  private constructor(config: ErrorInstrumentationConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      trackUnhandledRejections: config.trackUnhandledRejections ?? true,
      trackConsoleErrors: config.trackConsoleErrors ?? true,
      maxStackTraceLength: config.maxStackTraceLength ?? 2000,
    };
  }

  static getInstance(
    config?: ErrorInstrumentationConfig,
  ): ErrorInstrumentation {
    if (!ErrorInstrumentation.instance) {
      ErrorInstrumentation.instance = new ErrorInstrumentation(config);
    }
    return ErrorInstrumentation.instance;
  }

  start(): void {
    if (!this.config.enabled || this.started) return;
    this.started = true;
    this.instrumentGlobalErrorHandler();
    if (this.config.trackUnhandledRejections) {
      this.instrumentUnhandledRejections();
    }
    if (this.config.trackConsoleErrors) {
      this.instrumentConsoleErrors();
    }
  }

  stop(): void {
    if (!this.started) return;
    this.restoreGlobalErrorHandler();
    this.restoreConsoleErrors();
    this.started = false;
  }

  // ── Global RN error handler ─────────────────────────────────────────
  private instrumentGlobalErrorHandler(): void {
    const errorUtils = (globalThis as { ErrorUtils?: RnErrorUtils }).ErrorUtils;
    if (!errorUtils) return;
    this.originalErrorHandler = errorUtils.getGlobalHandler?.() ?? null;
    errorUtils.setGlobalHandler?.((error, isFatal) => {
      this.handleError(error, 'javascript', isFatal);
      this.originalErrorHandler?.(error, isFatal);
    });
  }

  private restoreGlobalErrorHandler(): void {
    const errorUtils = (globalThis as { ErrorUtils?: RnErrorUtils }).ErrorUtils;
    if (errorUtils && this.originalErrorHandler) {
      errorUtils.setGlobalHandler?.(this.originalErrorHandler);
      this.originalErrorHandler = null;
    }
  }

  // ── Unhandled rejections ────────────────────────────────────────────
  private instrumentUnhandledRejections(): void {
    const proc = (
      globalThis as {
        process?: { on?: (event: string, cb: (reason: unknown) => void) => void };
      }
    ).process;
    proc?.on?.('unhandledRejection', reason => {
      this.handleError(reason, 'unhandled_promise_rejection');
    });
  }

  // ── console.error / console.warn ────────────────────────────────────
  private instrumentConsoleErrors(): void {
    this.originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const message = args.map(stringifyArg).join(' ');
      this.handleError(new Error(message), 'console');
      this.originalConsoleError?.apply(console, args);
    };

    this.originalConsoleWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const message = args.map(stringifyArg).join(' ');
      void Rumtrace.addAction('warning', {
        actionType: 'console',
        attributes: { message },
      });
      this.originalConsoleWarn?.apply(console, args);
    };
  }

  private restoreConsoleErrors(): void {
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
      this.originalConsoleError = null;
    }
    if (this.originalConsoleWarn) {
      console.warn = this.originalConsoleWarn;
      this.originalConsoleWarn = null;
    }
  }

  // ── Reporting ───────────────────────────────────────────────────────
  private handleError(
    error: unknown,
    source: string,
    isFatal?: boolean,
  ): void {
    try {
      let message = 'Unknown error';
      let stack = '';
      let type = 'Error';

      if (error instanceof Error) {
        message = error.message;
        stack = error.stack ?? '';
        type = error.name || 'Error';
      } else if (typeof error === 'string') {
        message = error;
      } else if (error && typeof error === 'object') {
        const obj = error as { message?: string; stack?: string; name?: string };
        message = obj.message ?? safeStringify(error);
        stack = obj.stack ?? '';
        type = obj.name ?? 'Error';
      }

      if (stack.length > this.config.maxStackTraceLength) {
        stack =
          stack.substring(0, this.config.maxStackTraceLength) + '...';
      }

      const enrichedError = new Error(message);
      enrichedError.stack = stack || enrichedError.stack;
      void Rumtrace.addError(enrichedError, source);

      if (isFatal) {
        void Rumtrace.addAction('fatal_error', {
          actionType: 'error',
          attributes: { message, type, source, fatal: true },
        });
        void Rumtrace.forceFlush().catch(() => {
          /* swallow flush errors during crash */
        });
      }
    } catch {
      // Never let the error reporter itself throw — recursion risk.
    }
  }
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return arg.message;
  return safeStringify(arg);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default ErrorInstrumentation;
