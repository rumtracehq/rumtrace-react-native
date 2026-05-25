import { Rumtrace, type NetworkSpanHandle } from '../Rumtrace';

export interface NetworkInstrumentationConfig {
  enabled?: boolean;
  /** URL is skipped if it includes any of these substrings. */
  ignoreUrlSubstrings?: string[];
  /** URL is skipped if any of these regex patterns match. */
  ignoreUrlRegexes?: string[];
  enableDebugLogging?: boolean;
  /** Instrument `global.fetch`. Defaults to `true`. */
  traceFetch?: boolean;
  /**
   * Instrument `XMLHttpRequest`. Defaults to `false` because RN's `fetch`
   * is implemented on top of XHR — enabling both double-reports requests.
   */
  traceXhr?: boolean;
  /** Inject W3C `traceparent` headers on outgoing requests. Defaults to `true`. */
  propagateTraceContext?: boolean;
}

// React Native global scope — available at runtime.
declare const global: {
  fetch: typeof fetch;
  [key: string]: unknown;
};

/** Built-in patterns that almost always produce noise (HMR, dev server, assets). */
const DEFAULT_IGNORE_REGEXES: readonly RegExp[] = [
  /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|css|js|map)$/i,
  /\/sockjs-node\//,
  /\/webpack-dev-server\//,
  /__webpack_hmr/,
  /\/hot-update\./,
  /clients3\.google\.com\/generate_204/,
  /symbolicate/,
  /\/debugger-ui\//,
  /\/inspector\//,
];

type FetchInput = RequestInfo | URL;
type XhrOpen = (
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  ...rest: unknown[]
) => void;
/**
 * RN doesn't ship `XMLHttpRequestBodyInit`, so accept the loosest body type
 * that still satisfies the original signature shape. We don't read the body.
 */
type XhrSend = (this: XMLHttpRequest, body?: unknown) => void;

interface XhrWithMeta extends XMLHttpRequest {
  __rumtrace_method?: string;
  __rumtrace_url?: string;
}

/**
 * Singleton that monkey-patches `fetch` and (optionally) `XMLHttpRequest` to
 * forward request metadata to the native Rumtrace SDK as CLIENT spans.
 *
 * For `fetch` it uses a two-phase flow so it can inject a real W3C
 * `traceparent` header before the request goes on the wire. XHR uses a
 * one-shot fallback because we don't get a hook between `open()` and
 * header serialization that's reliable on RN.
 */
export class NetworkInstrumentation {
  private static instance: NetworkInstrumentation | null = null;
  private config: Required<NetworkInstrumentationConfig>;
  private originalFetch: typeof global.fetch | null = null;
  private originalXhrOpen: XhrOpen | null = null;
  private originalXhrSend: XhrSend | null = null;
  private compiledRegexes: RegExp[] = [];
  private started = false;

  private constructor(config: NetworkInstrumentationConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      ignoreUrlSubstrings: config.ignoreUrlSubstrings ?? [],
      ignoreUrlRegexes: config.ignoreUrlRegexes ?? [],
      enableDebugLogging: config.enableDebugLogging ?? false,
      traceFetch: config.traceFetch ?? true,
      traceXhr: config.traceXhr ?? false,
      propagateTraceContext: config.propagateTraceContext ?? true,
    };
    this.compileRegexes();
  }

  static getInstance(
    config?: NetworkInstrumentationConfig,
  ): NetworkInstrumentation {
    if (!NetworkInstrumentation.instance) {
      NetworkInstrumentation.instance = new NetworkInstrumentation(config);
    } else if (config) {
      NetworkInstrumentation.instance.applyConfig(config);
    }
    return NetworkInstrumentation.instance;
  }

  private applyConfig(config: NetworkInstrumentationConfig): void {
    this.config = { ...this.config, ...config };
    this.compileRegexes();
  }

  private compileRegexes(): void {
    this.compiledRegexes = [...DEFAULT_IGNORE_REGEXES];
    for (const pattern of this.config.ignoreUrlRegexes) {
      try {
        this.compiledRegexes.push(new RegExp(pattern));
      } catch {
        this.log(`Invalid regex pattern: ${pattern}`);
      }
    }
  }

  start(): void {
    if (!this.config.enabled || this.started) return;
    this.started = true;
    if (this.config.traceFetch) this.instrumentFetch();
    if (this.config.traceXhr) this.instrumentXhr();
    this.log('Network instrumentation started');
  }

  stop(): void {
    if (!this.started) return;
    this.restoreFetch();
    this.restoreXhr();
    this.started = false;
    this.log('Network instrumentation stopped');
  }

  // ── Filtering ───────────────────────────────────────────────────────
  private shouldIgnoreUrl(url: string): boolean {
    for (const substring of this.config.ignoreUrlSubstrings) {
      if (url.includes(substring)) return true;
    }
    for (const regex of this.compiledRegexes) {
      if (regex.test(url)) return true;
    }
    return false;
  }

  // ── fetch ───────────────────────────────────────────────────────────
  private instrumentFetch(): void {
    if (typeof global.fetch !== 'function') return;
    this.originalFetch = global.fetch;
    const origFetch = this.originalFetch;

    const self = this;
    global.fetch = function rumtraceInstrumentedFetch(
      input: FetchInput,
      init?: RequestInit,
    ): Promise<Response> {
      const { url, method } = extractFetchTarget(input, init);

      if (self.shouldIgnoreUrl(url)) {
        return origFetch.call(this, input as RequestInfo, init);
      }

      self.log(`[fetch] ${method} ${url}`);

      if (self.config.propagateTraceContext) {
        return self.fetchWithTraceContext(origFetch, input, init, method, url);
      }
      return self.fetchWithFallback(origFetch, input, init, method, url);
    };
  }

  private async fetchWithTraceContext(
    origFetch: typeof global.fetch,
    input: FetchInput,
    init: RequestInit | undefined,
    method: string,
    url: string,
  ): Promise<Response> {
    let spanInfo: NetworkSpanHandle | null = null;
    try {
      spanInfo = await Rumtrace.startNetworkSpan(method, url);
    } catch {
      spanInfo = null;
    }

    if (!spanInfo) {
      return this.fetchWithFallback(origFetch, input, init, method, url);
    }

    const headers = new Headers(init?.headers);
    headers.set('traceparent', spanInfo.traceparent);
    const patchedInit: RequestInit = { ...init, headers };

    try {
      const response = await origFetch.call(
        undefined,
        input as RequestInfo,
        patchedInit,
      );
      const responseContentLength = parseContentLength(
        response.headers?.get('content-length'),
      );
      void Rumtrace.endNetworkSpan(spanInfo.spanId, {
        statusCode: response.status,
        error: '',
        requestContentLength: -1,
        responseContentLength,
      });
      return response;
    } catch (error) {
      void Rumtrace.endNetworkSpan(spanInfo.spanId, {
        statusCode: 0,
        error: errorMessage(error, 'Network request failed'),
        requestContentLength: -1,
        responseContentLength: -1,
      });
      throw error;
    }
  }

  private async fetchWithFallback(
    origFetch: typeof global.fetch,
    input: FetchInput,
    init: RequestInit | undefined,
    method: string,
    url: string,
  ): Promise<Response> {
    const startTimeMs = Date.now();
    try {
      const response = await origFetch.call(
        undefined,
        input as RequestInfo,
        init,
      );
      const endTimeMs = Date.now();
      const responseContentLength = parseContentLength(
        response.headers?.get('content-length'),
      );
      void Rumtrace.reportNetworkRequest({
        method,
        url,
        statusCode: response.status,
        startTimeMs,
        endTimeMs,
        requestContentLength: -1,
        responseContentLength,
        error: '',
      });
      return response;
    } catch (error) {
      const endTimeMs = Date.now();
      void Rumtrace.reportNetworkRequest({
        method,
        url,
        statusCode: 0,
        startTimeMs,
        endTimeMs,
        requestContentLength: -1,
        responseContentLength: -1,
        error: errorMessage(error, 'Network request failed'),
      });
      throw error;
    }
  }

  private restoreFetch(): void {
    if (this.originalFetch) {
      global.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  // ── XMLHttpRequest ──────────────────────────────────────────────────
  private instrumentXhr(): void {
    if (typeof XMLHttpRequest === 'undefined') return;

    this.originalXhrOpen = XMLHttpRequest.prototype.open as XhrOpen;
    this.originalXhrSend = XMLHttpRequest.prototype.send as XhrSend;
    const origOpen = this.originalXhrOpen;
    const origSend = this.originalXhrSend;
    const self = this;

    XMLHttpRequest.prototype.open = function rumtraceInstrumentedOpen(
      this: XhrWithMeta,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      this.__rumtrace_method = method?.toUpperCase() || 'GET';
      this.__rumtrace_url =
        typeof url === 'string' ? url : url?.toString?.() ?? '';
      return origOpen.apply(this, [method, url, ...rest] as Parameters<XhrOpen>);
    } as XhrOpen;

    XMLHttpRequest.prototype.send = function rumtraceInstrumentedSend(
      this: XhrWithMeta,
      body?: unknown,
    ) {
      const xhrMethod = this.__rumtrace_method ?? 'GET';
      const xhrUrl = this.__rumtrace_url ?? '';

      if (!xhrUrl || self.shouldIgnoreUrl(xhrUrl)) {
        return origSend.call(this, body);
      }

      const startTimeMs = Date.now();
      self.log(`[xhr] ${xhrMethod} ${xhrUrl}`);

      this.addEventListener('loadend', () => {
        const endTimeMs = Date.now();
        const responseContentLength = parseContentLength(
          this.getResponseHeader?.('content-length'),
        );
        void Rumtrace.reportNetworkRequest({
          method: xhrMethod,
          url: xhrUrl,
          statusCode: this.status > 0 ? this.status : 0,
          startTimeMs,
          endTimeMs,
          requestContentLength: -1,
          responseContentLength,
          error: this.status > 0 ? '' : 'Network request failed',
        });
      });

      return origSend.call(this, body);
    } as XhrSend;
  }

  private restoreXhr(): void {
    if (typeof XMLHttpRequest === 'undefined') return;
    if (this.originalXhrOpen) {
      XMLHttpRequest.prototype.open = this.originalXhrOpen;
      this.originalXhrOpen = null;
    }
    if (this.originalXhrSend) {
      XMLHttpRequest.prototype.send = this.originalXhrSend;
      this.originalXhrSend = null;
    }
  }

  // ── Logging ─────────────────────────────────────────────────────────
  private log(message: string): void {
    if (this.config.enableDebugLogging) {
      // eslint-disable-next-line no-console
      console.log(`[Rumtrace Network] ${message}`);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────
function extractFetchTarget(
  input: FetchInput,
  init?: RequestInit,
): { url: string; method: string } {
  let url = '';
  let method = 'GET';

  if (typeof input === 'string') {
    url = input;
    method = init?.method?.toUpperCase() ?? 'GET';
  } else if (input instanceof URL) {
    url = input.toString();
    method = init?.method?.toUpperCase() ?? 'GET';
  } else if (input && typeof input === 'object' && 'url' in input) {
    const req = input as Request;
    url = req.url;
    method =
      init?.method?.toUpperCase() ?? req.method?.toUpperCase() ?? 'GET';
  } else {
    url = String(input);
    method = init?.method?.toUpperCase() ?? 'GET';
  }
  return { url, method };
}

function parseContentLength(value: string | null | undefined): number {
  if (!value) return -1;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : -1;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  return fallback;
}

export default NetworkInstrumentation;
