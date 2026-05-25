require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
fabric_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'

Pod::Spec.new do |s|
  s.name           = "RumtraceRnIos"
  s.version        = package["version"]
  s.summary        = package["summary"] || package["description"]
  s.description    = package["description"]
  s.homepage       = package["homepage"]
  s.license        = package["license"]
  s.authors        = package["author"]

  s.platforms              = { :ios => '16.0' }
  s.ios.deployment_target  = '16.0'
  s.swift_version          = '5.10'

  s.source = { :git => "https://github.com/rumtracehq/rumtrace-react-native.git", :tag => s.version.to_s }
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  if fabric_enabled
    folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

    s.pod_target_xcconfig = {
      'HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/boost" "$(PODS_ROOT)/boost-for-react-native" "$(PODS_ROOT)/RCT-Folly"',
      'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    }
    s.compiler_flags  = folly_compiler_flags + ' -DRCT_NEW_ARCH_ENABLED=1'

    if respond_to?(:install_modules_dependencies, true)
      install_modules_dependencies(s)
    else
      s.dependency "React-Core"
      s.dependency "React-Codegen"
      s.dependency "RCT-Folly"
      s.dependency "RCTRequired"
      s.dependency "RCTTypeSafety"
      s.dependency "ReactCommon/turbomodule/core"
    end
  else
    s.dependency "React-Core"
  end

  # ---------------------------------------------------------------------------
  # Native Rumtrace iOS SDK (https://github.com/rumtracehq/rumtrace-ios-sdk)
  #
  # The SDK source repo is PRIVATE, so CocoaPods cannot fetch it from
  # cdn.cocoapods.org. The published podspec lives in a public spec repo
  # whose URL must be added to the consumer's Podfile (one-time setup):
  #
  #   source 'https://github.com/rumtracehq/Specs.git'
  #   source 'https://cdn.cocoapods.org/'
  #
  # `pod install` will then resolve this dependency from the spec repo and
  # `git clone` the SDK source using the developer's git credentials (SSH key
  # or HTTPS PAT with read access to rumtracehq/rumtrace-ios-sdk).
  #
  # Alternative (no spec repo) — pin the source directly in the Podfile:
  #
  #   pod 'RumtraceIosSdk',
  #     :git => 'https://github.com/rumtracehq/rumtrace-ios-sdk.git',
  #     :tag => '#{package["rumtrace"]["iosSdkVersion"]}'
  #
  # Either way the resolved version must equal `iosSdkVersion` in package.json.
  # ---------------------------------------------------------------------------
  s.dependency 'RumtraceIosSdk', package["rumtrace"]["iosSdkVersion"]
end
