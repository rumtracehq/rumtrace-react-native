#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(Rumtrace, NSObject)

// MARK: - Lifecycle / configuration

RCT_EXTERN_METHOD(startAgent:(NSDictionary *)agentConfig
                  instrConfig:(NSDictionary *)instrConfig
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// MARK: - View lifecycle

RCT_EXTERN_METHOD(startView:(NSString *)name
                  url:(NSString *)url
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endCurrentView:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(forceFlush:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// MARK: - User / global attributes

RCT_EXTERN_METHOD(setUser:(NSDictionary *)user
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addGlobalAttribute:(NSString *)key
                  value:(NSString *)value
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addGlobalAttributes:(NSDictionary *)attrs
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeGlobalAttribute:(NSString *)key
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// MARK: - View-scoped attributes

RCT_EXTERN_METHOD(setViewAttribute:(NSString *)key
                  value:(NSString *)value
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setViewAttributes:(NSDictionary *)attrs
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addViewEvent:(NSString *)name
                  attributes:(NSDictionary *)attributes
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// MARK: - Custom events

RCT_EXTERN_METHOD(addAction:(NSDictionary *)payload
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addError:(NSString *)message
                  source:(NSString *)source
                  stack:(NSString *)stack
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addTiming:(NSString *)name
                  duration:(nonnull NSNumber *)duration
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addLog:(NSString *)message
                  level:(NSString *)level
                  attributes:(NSDictionary *)attributes
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// MARK: - Session attributes

RCT_EXTERN_METHOD(setSessionAttribute:(NSString *)key
                  valueMs:(nonnull NSNumber *)valueMs
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endRootSessionNow:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// MARK: - JS-level network instrumentation (two-phase)

RCT_EXTERN_METHOD(startNetworkSpan:(NSString *)method
                  url:(NSString *)url
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endNetworkSpan:(NSString *)spanId
                  info:(NSDictionary *)info
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reportNetworkRequest:(NSDictionary *)requestInfo
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// MARK: - UIViewController-tied views

RCT_EXTERN_METHOD(startUIViewControllerView:(NSString *)name
                  url:(NSString *)url
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endUIViewControllerView:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
