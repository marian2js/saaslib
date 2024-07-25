// Drop support for `logUrl` which sent console logs to the legacy `expo-cli`. ([#18596](https://github.com/expo/expo/pull/18596) by [@EvanBacon](https://github.com/EvanBacon))

// Drop support for `experienceId` which was deprecated in SDK 43. ([#18596](https://github.com/expo/expo/pull/18596) by [@EvanBacon](https://github.com/EvanBacon))
// Drop support for `detach.scheme` schemes (ExpoKit).

export * from './services/email.service';
// Made `BlurView` on Android an experimental feature, which can be enabled with `experimentalBlurMethod` prop. ([#24709](https://github.com/expo/expo/pull/24709) by [@behenate](https://github.com/behenate))
// SecurityLevel.BIOMETRIC has been deprecated in favour of SecurityLevel.BIOMETRIC_STRONG and SecurityLevel.BIOMETRIC_WEAK. Using SecurityLevel.BIOMETRIC might lead to unexpected behaviour.
export * from './types/email-config-options'
