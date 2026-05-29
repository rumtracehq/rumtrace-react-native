---
"@rumtrace/rumtrace-rn-ios": minor
---

Add view-controller block list configuration and upgrade the native iOS SDK to 0.10.0.

- New `blockHostingControllerViews` option to exclude SwiftUI `UIHostingController`s (and their children) from view tracking. Defaults to `true`.
- New `viewControllerBlockListNames` option to exclude extra view-controller class-name fragments (case-insensitive) from view tracking, merged with the built-in defaults.
- Bumps the pinned `RumtraceIosSdk` native dependency to `0.10.0`, which includes the view tracing improvements backing these options.
