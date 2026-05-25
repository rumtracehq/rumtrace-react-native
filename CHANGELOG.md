# @rumtrace/rumtrace-rn-ios

## 0.10.0

### Minor Changes

- 97b8257: Add Expo config plugin (`app.plugin.js`) that injects the Rumtrace and
  CocoaPods spec-repo `source` lines into the Podfile during `expo prebuild`,
  so CNG-based Expo apps don't have to hand-edit `ios/Podfile`. Plugin is
  idempotent and only requires `@expo/config-plugins` for Expo consumers
  (declared as an optional peer dependency).

## 0.9.6

### Patch Changes

- 089bec1: pod location fixed

## 0.9.5

### Patch Changes

- 3556928: init

## 0.9.4

- Initial pre-release of the React Native iOS wrapper around the Rumtrace iOS SDK.
