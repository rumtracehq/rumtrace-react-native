import Foundation
import OpenTelemetryApi
import React
import RumtraceIosSdk

/// React Native bridge module exposing the Rumtrace iOS SDK to JS.
///
/// All methods are called from the React Native bridge queue. Methods that
/// touch the agent's view-span machinery (`startView`, `endCurrentView`,
/// `setViewAttribute(s)`, `addViewEvent`) hop to the main queue because the
/// underlying SDK reads/writes UI-affined state.
///
/// Naming: the Obj-C class name is `Rumtrace` (matches `@objc(Rumtrace)`),
/// which is the same name JS uses via `TurboModuleRegistry.getEnforcing`.
@objc(Rumtrace)
final class RumtraceModule: NSObject {

  // MARK: - Active network spans

  /// Spans started by `startNetworkSpan` keyed by hex span id, awaiting
  /// completion via `endNetworkSpan`.
  private let networkSpansLock = NSLock()
  private var activeNetworkSpans: [String: Span] = [:]

  // MARK: - RN module configuration

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  static func moduleName() -> String! {
    return "Rumtrace"
  }

  // MARK: - Lifecycle

  @objc
  func startAgent(
    _ agentConfigDict: NSDictionary,
    instrConfig instrConfigDict: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let agent = agentConfigDict as? [String: Any],
      let instr = instrConfigDict as? [String: Any]
    else {
      reject("RUMTRACE_INVALID_CONFIG",
             "Configuration dictionaries are invalid",
             nil)
      return
    }

    // ── Agent ─────────────────────────────────────────────────────────
    let agentBuilder = RumtraceAgentConfigBuilder()

    if let exportUrlString = agent["exportUrl"] as? String,
       let exportUrl = URL(string: exportUrlString) {
      _ = agentBuilder.withExportUrl(exportUrl)
    }
    if let environment = agent["environment"] as? String {
      _ = agentBuilder.withEnvironment(environment)
    }
    if let clientToken = agent["clientToken"] as? String {
      _ = agentBuilder.withClientToken(clientToken)
    }
    if let sampleRate = agent["sampleRate"] as? Double {
      _ = agentBuilder.withSessionSampleRate(sampleRate)
    }

    let agentConfig = agentBuilder.build()

    // ── Instrumentation ──────────────────────────────────────────────
    let instrBuilder = RumtraceInstrumentationConfigBuilder()

    if let v = instr["enableCrashReporting"] as? Bool {
      _ = instrBuilder.withCrashReporting(v)
    }
    if let v = instr["enableCrashReportingInDebug"] as? Bool {
      _ = instrBuilder.withCrashReportingInDebugMode(v)
    }
    if let v = instr["enableURLSessionInstrumentation"] as? Bool {
      _ = instrBuilder.withURLSessionInstrumentation(v)
    }
    if let v = instr["enableViewControllerInstrumentation"] as? Bool {
      _ = instrBuilder.withViewControllerInstrumentation(v)
    }
    if let v = instr["blockHostingControllerViews"] as? Bool {
      _ = instrBuilder.withBlockHostingControllerViews(v)
    }
    if let v = instr["viewControllerBlockListNames"] as? [String] {
      _ = instrBuilder.withViewControllerBlockListNames(v)
    }
    if let v = instr["enableAppMetricInstrumentation"] as? Bool {
      _ = instrBuilder.withAppMetricInstrumentation(v)
    }
    if let v = instr["enableSystemMetrics"] as? Bool {
      _ = instrBuilder.withSystemMetrics(v)
    }
    if let v = instr["enableLifecycleEvents"] as? Bool {
      _ = instrBuilder.withLifecycleEvents(v)
    }
    if let v = instr["enableHangInstrumentation"] as? Bool {
      _ = instrBuilder.withHangInstrumentation(v)
    }
    if let v = instr["enableLowPowerModeInstrumentation"] as? Bool {
      _ = instrBuilder.withLowPowerModeInstrumentation(v)
    }
    if let v = instr["enableTapInstrumentation"] as? Bool {
      _ = instrBuilder.withTapInstrumentation(v)
    }
    if let v = instr["enableExitInstrumentation"] as? Bool {
      _ = instrBuilder.withExitInstrumentation(v)
    }
    if let v = instr["enablePushNotificationInstrumentation"] as? Bool {
      _ = instrBuilder.withPushNotificationInstrumentation(v)
    }
    if let v = instr["enableWebViewInstrumentation"] as? Bool {
      _ = instrBuilder.withWebViewInstrumentation(v)
    }
    if let v = instr["enableSessionUsageInstrumentation"] as? Bool {
      _ = instrBuilder.withSessionUsageInstrumentation(v)
    }
    if let v = instr["sessionInactivityThresholdSeconds"] as? Double {
      _ = instrBuilder.withSessionInactivityThresholdSeconds(v)
    }
    if let v = instr["urlSessionIgnoreSubstrings"] as? [String] {
      _ = instrBuilder.withURLSessionIgnoreSubstrings(v)
    }
    if let v = instr["urlSessionIgnoreRegexes"] as? [String] {
      _ = instrBuilder.withURLSessionIgnoreRegexes(v)
    }
    if let v = instr["ignoreExporterURLsByDefault"] as? Bool {
      _ = instrBuilder.withIgnoreExporterURLsByDefault(v)
    }

    let instrConfig = instrBuilder.build()

    RumtraceIosSdkAgent.start(with: agentConfig, instrConfig)
    resolve("Rumtrace iOS SDK initialized successfully")
  }

  // MARK: - View lifecycle

  @objc
  func startView(
    _ name: NSString,
    url: NSString?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      RumtraceIosSdkAgent.startView(name: name as String, url: url as String?)
      resolve(nil)
    }
  }

  @objc
  func endCurrentView(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      RumtraceIosSdkAgent.endCurrentView()
      resolve(nil)
    }
  }

  @objc
  func forceFlush(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.forceFlush()
    resolve(nil)
  }

  // MARK: - User / global attributes

  @objc
  func setUser(
    _ user: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.setUser(Self.stringDict(user))
    resolve(nil)
  }

  @objc
  func addGlobalAttribute(
    _ key: NSString,
    value: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.addGlobalAttribute(key: key as String, value: value as String)
    resolve(nil)
  }

  @objc
  func addGlobalAttributes(
    _ attrs: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.addGlobalAttributes(Self.stringDict(attrs))
    resolve(nil)
  }

  @objc
  func removeGlobalAttribute(
    _ key: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.removeGlobalAttribute(key: key as String)
    resolve(nil)
  }

  // MARK: - View-scoped attributes

  @objc
  func setViewAttribute(
    _ key: NSString,
    value: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      RumtraceIosSdkAgent.setViewAttribute(key: key as String, value: value as String)
      resolve(nil)
    }
  }

  @objc
  func setViewAttributes(
    _ attrs: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      RumtraceIosSdkAgent.setViewAttributes(Self.stringDict(attrs))
      resolve(nil)
    }
  }

  @objc
  func addViewEvent(
    _ name: NSString,
    attributes: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let attrs = (attributes as? [String: Any]) ?? [:]
      RumtraceIosSdkAgent.addViewEvent(name: name as String, attributes: attrs)
      resolve(nil)
    }
  }

  // MARK: - Custom events

  @objc
  func addAction(
    _ payload: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let name = payload["actionName"] as? String ?? "custom"
    let type = payload["actionType"] as? String ?? "custom"
    let attributes = payload["attributes"] as? [String: Any] ?? [:]
    RumtraceIosSdkAgent.addAction(name: name, type: type, attributes: attributes)
    resolve(nil)
  }

  @objc
  func addError(
    _ message: NSString,
    source: NSString?,
    stack: NSString?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.addError(
      message: message as String,
      source: source as String?,
      stack: stack as String?
    )
    resolve(nil)
  }

  @objc
  func addTiming(
    _ name: NSString,
    duration: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.addTiming(
      name: name as String,
      durationMs: duration.doubleValue
    )
    resolve(nil)
  }

  @objc
  func addLog(
    _ message: NSString,
    level: NSString?,
    attributes: NSDictionary?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let attrs = (attributes as? [String: Any]) ?? [:]
    let lvl = (level as String?) ?? "info"
    RumtraceIosSdkAgent.addLog(
      message: message as String,
      level: lvl,
      attributes: attrs
    )
    resolve(nil)
  }

  // MARK: - Session attributes

  @objc
  func setSessionAttribute(
    _ key: NSString,
    valueMs: NSNumber,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.setSessionAttribute(
      key: key as String,
      valueMs: valueMs.doubleValue
    )
    resolve(nil)
  }

  @objc
  func endRootSessionNow(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    RumtraceIosSdkAgent.endRootSessionNow()
    resolve(nil)
  }

  // MARK: - JS-level network instrumentation

  /// Phase 1: starts a CLIENT span linked to the current view span (when
  /// available) and returns identifiers for W3C trace context propagation.
  @objc
  func startNetworkSpan(
    _ method: NSString,
    url: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let methodStr = method as String
    let urlStr = url as String
    let parsedUrl = URL(string: urlStr)
    let host = parsedUrl?.host ?? ""
    let scheme = parsedUrl?.scheme ?? "https"

    let tracer = OpenTelemetry.instance.tracerProvider.get(
      instrumentationName: "RumtraceReactNativeNetwork",
      instrumentationVersion: "0.0.1"
    )

    let builder = tracer
      .spanBuilder(spanName: Self.networkSpanName(method: methodStr, url: parsedUrl, host: host))
      .setSpanKind(spanKind: .client)
      .setAttribute(key: "http.method", value: .string(methodStr))
      .setAttribute(key: "http.url", value: .string(urlStr))
      .setAttribute(key: "http.host", value: .string(host))
      .setAttribute(key: "http.scheme", value: .string(scheme))
      .setAttribute(key: "type", value: .string("mobile"))
      .setAttribute(key: "network.transport", value: .string("tcp"))

    if let viewSpan = RumtraceIosSdkAgent.shared()?.getCurrentViewSpan() {
      _ = builder.addLink(spanContext: viewSpan.context)
    }

    let span = builder.startSpan()

    let traceId = span.context.traceId.hexString
    let spanId = span.context.spanId.hexString
    let flags = span.context.traceFlags.sampled ? "01" : "00"
    let traceparent = "00-\(traceId)-\(spanId)-\(flags)"

    networkSpansLock.lock()
    activeNetworkSpans[spanId] = span
    networkSpansLock.unlock()

    resolve([
      "spanId": spanId,
      "traceId": traceId,
      "traceparent": traceparent,
    ])
  }

  /// Phase 2: completes a span started by `startNetworkSpan`.
  @objc
  func endNetworkSpan(
    _ spanId: NSString,
    info: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let key = spanId as String
    networkSpansLock.lock()
    let span = activeNetworkSpans.removeValue(forKey: key)
    networkSpansLock.unlock()

    guard let span = span else {
      // Already completed or never started — treat as a no-op rather than
      // an error so JS retries don't bubble up failures.
      resolve(nil)
      return
    }

    let details = (info as? [String: Any]) ?? [:]
    Self.applyNetworkResult(to: span, details: details)
    span.end()
    resolve(nil)
  }

  /// One-shot fallback for clients that can't inject headers (e.g. XHR).
  @objc
  func reportNetworkRequest(
    _ requestInfo: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let info = requestInfo as? [String: Any] else {
      resolve(nil)
      return
    }

    let method = info["method"] as? String ?? "GET"
    let urlString = info["url"] as? String ?? ""
    let startTimeMs = info["startTimeMs"] as? Double ?? 0
    let endTimeMs = info["endTimeMs"] as? Double ?? 0

    let parsedUrl = URL(string: urlString)
    let host = parsedUrl?.host ?? ""
    let scheme = parsedUrl?.scheme ?? "https"

    let tracer = OpenTelemetry.instance.tracerProvider.get(
      instrumentationName: "RumtraceReactNativeNetwork",
      instrumentationVersion: "0.0.1"
    )

    let builder = tracer
      .spanBuilder(spanName: Self.networkSpanName(method: method, url: parsedUrl, host: host))
      .setSpanKind(spanKind: .client)
      .setStartTime(time: Date(timeIntervalSince1970: startTimeMs / 1000.0))
      .setAttribute(key: "http.method", value: .string(method))
      .setAttribute(key: "http.url", value: .string(urlString))
      .setAttribute(key: "http.host", value: .string(host))
      .setAttribute(key: "http.scheme", value: .string(scheme))
      .setAttribute(key: "type", value: .string("mobile"))
      .setAttribute(key: "network.transport", value: .string("tcp"))

    if let viewSpan = RumtraceIosSdkAgent.shared()?.getCurrentViewSpan() {
      _ = builder.addLink(spanContext: viewSpan.context)
    }

    let span = builder.startSpan()
    Self.applyNetworkResult(to: span, details: info)
    span.end(time: Date(timeIntervalSince1970: endTimeMs / 1000.0))
    resolve(nil)
  }

  // MARK: - UIViewController-tied views (iOS only)

  @objc
  func startUIViewControllerView(
    _ name: NSString?,
    url: NSString?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    RumtraceIosSdkAgent.startUIViewControllerView(
      name: name as String?,
      url: url as String?
    )
    #endif
    resolve(nil)
  }

  @objc
  func endUIViewControllerView(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    RumtraceIosSdkAgent.endUIViewControllerView()
    #endif
    resolve(nil)
  }

  // MARK: - Helpers

  private static func stringDict(_ dict: NSDictionary) -> [String: String] {
    var out: [String: String] = [:]
    dict.forEach { key, value in
      guard let k = key as? String else { return }
      if let v = value as? String {
        out[k] = v
      } else if let v = value as? CustomStringConvertible {
        out[k] = v.description
      }
    }
    return out
  }

  /// Builds a span name that follows OTel HTTP conventions while staying
  /// readable and low-cardinality: `GET /v1/users`. Falls back to the host or
  /// bare method when no path is available. The full URL still lives in the
  /// `http.url` attribute for drill-down.
  private static func networkSpanName(method: String, url: URL?, host: String) -> String {
    if let path = url?.path, !path.isEmpty, path != "/" {
      return "\(method) \(path)"
    }
    if !host.isEmpty {
      return "\(method) \(host)"
    }
    return "HTTP \(method)"
  }

  /// Applies status / size / error attributes to a network span.
  private static func applyNetworkResult(to span: Span, details: [String: Any]) {
    let statusCode = details["statusCode"] as? Int ?? 0
    let requestContentLength = details["requestContentLength"] as? Int ?? -1
    let responseContentLength = details["responseContentLength"] as? Int ?? -1
    let errorMessage = details["error"] as? String

    if statusCode > 0 {
      span.setAttribute(key: "http.status_code", value: .int(statusCode))
    }
    if requestContentLength > 0 {
      span.setAttribute(key: "http.request_content_length", value: .int(requestContentLength))
    }
    if responseContentLength > 0 {
      span.setAttribute(key: "http.response_content_length", value: .int(responseContentLength))
    }

    if let error = errorMessage, !error.isEmpty {
      span.status = .error(description: error)
      span.addEvent(name: "exception", attributes: [
        "exception.type": AttributeValue.string("NetworkError"),
        "exception.message": AttributeValue.string(error),
      ])
    } else if statusCode >= 400 {
      span.status = .error(description: "HTTP \(statusCode)")
    }
  }
}
