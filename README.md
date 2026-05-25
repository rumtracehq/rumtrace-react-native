# @rumtrace/rumtrace-rn-ios

React Native wrapper around the [Rumtrace iOS SDK](../rumtrace-ios-sdk).

> ⚠️ iOS only. The package depends on the `RumtraceIosSdk` CocoaPod and ships
> Swift / Obj-C++ bridge code; Android is not supported here.

## Installation

```sh
pnpm add @rumtrace/rumtrace-rn-ios
cd ios && pod install
```

The pod `RumtraceRnIos` depends transitively on `RumtraceIosSdk`. The Rumtrace
SDK version is pinned via `package.json` → `rumtrace.iosSdkVersion`.

## Quick start

```tsx
import { useRef } from 'react';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { RumtraceProvider } from '@rumtrace/rumtrace-rn-ios';

export default function App() {
  const navRef = useRef<NavigationContainerRef<any>>(null);

  return (
    <RumtraceProvider
      ref={navRef}
      config={{
        exportUrl: 'https://traces.rumtrace.com',
        environment: 'production',
        clientToken: 'YOUR_TOKEN',
        sampleRate: 1.0,
      }}
    >
      <NavigationContainer ref={navRef}>
        {/* your app */}
      </NavigationContainer>
    </RumtraceProvider>
  );
}
```

## API

### `Rumtrace`

Static facade over the native module. All methods return `Promise<void>` (or a
typed result for network spans) and reject on native errors.

```ts
import { Rumtrace, logger } from '@rumtrace/rumtrace-rn-ios';

await Rumtrace.startView('Home');
Rumtrace.addAction('button_tap', { actionType: 'tap', attributes: { id: 'cta' } });
Rumtrace.setUser({ id: '123', email: 'a@b.com' });
logger.info('User logged in', { method: 'sso' });
```

### `RumtraceProvider`

Initializes the native SDK on mount, starts JS-side error / network /
navigation instrumentation, and ends/flushes views on app background and
unmount. Pass a React Navigation `ref` to get automatic view spans.

### Instrumentation singletons

- `NavigationInstrumentation` — Manual control of view spans from a
  navigation ref.
- `NetworkInstrumentation` — Patches `fetch` (and optionally
  `XMLHttpRequest`) to start CLIENT spans with W3C trace context propagation.
- `ErrorInstrumentation` — Captures uncaught errors, unhandled rejections,
  and `console.error` / `console.warn`.

Each is a singleton with `getInstance(config?)` and `start()` / `stop()`.

## Configuration

`RumtraceConfig` is the union of:

- `AgentConfig` — collector URL, environment, client token, sample rate.
- `InstrumentationConfig` — toggles for native instrumentation packs (crash
  reporting, URL session, view controllers, taps, hangs, lifecycle, exits,
  etc.) and URL ignore lists.
- `JsInstrumentationConfig` — `enableNetworkInstrumentation`,
  `propagateTraceContext`, `enableDebugLogging`.

See `src/types.ts` for the full surface — every option maps 1:1 to a setter on
`RumtraceAgentConfigBuilder` / `RumtraceInstrumentationConfigBuilder` in the
native SDK.
