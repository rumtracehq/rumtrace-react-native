---
'@rumtrace/rumtrace-rn-ios': minor
---

Add Expo config plugin (`app.plugin.js`) that injects the Rumtrace and
CocoaPods spec-repo `source` lines into the Podfile during `expo prebuild`,
so CNG-based Expo apps don't have to hand-edit `ios/Podfile`. Plugin is
idempotent and only requires `@expo/config-plugins` for Expo consumers
(declared as an optional peer dependency).
