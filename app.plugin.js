/**
 * Expo config plugin for `@rumtrace/rumtrace-rn-ios`.
 *
 * Adds the Rumtrace public CocoaPods spec repo to the iOS Podfile so that
 * `pod install` can resolve the `RumtraceIosSdk` pod (whose source repo is
 * private). Idempotent — safe to run on every `expo prebuild`.
 *
 * Usage in app.json / app.config.js:
 *
 *   {
 *     "expo": {
 *       "plugins": ["@rumtrace/rumtrace-rn-ios"]
 *     }
 *   }
 */
const { withPodfile } = require('@expo/config-plugins');

const RUMTRACE_SOURCE = "source 'https://github.com/rumtracehq/Specs.git'";
const COCOAPODS_SOURCE = "source 'https://cdn.cocoapods.org/'";

/**
 * Prepend `source` to `contents` if it isn't already present.
 *
 * @param {string} contents
 * @param {string} source
 * @returns {string}
 */
function ensureSource(contents, source) {
  return contents.includes(source) ? contents : `${source}\n${contents}`;
}

/**
 * @template T
 * @param {T} config
 * @returns {T}
 */
function withRumtraceIosPodSource(config) {
  return withPodfile(config, (podfileConfig) => {
    let contents = podfileConfig.modResults.contents;

    // Order matters: prepend cocoapods first, then rumtrace, so the final
    // Podfile begins with the rumtrace source line followed by the
    // cocoapods source line.
    contents = ensureSource(contents, COCOAPODS_SOURCE);
    contents = ensureSource(contents, RUMTRACE_SOURCE);

    podfileConfig.modResults.contents = contents;
    return podfileConfig;
  });
}

module.exports = withRumtraceIosPodSource;
