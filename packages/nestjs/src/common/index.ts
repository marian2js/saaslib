// expo-face-detector is now deprecated. We recommed using react-native-vision-camera instead.

// expo-face-detector is now deprecated. We recommed using react-native-vision-camera instead.

// Drop support for `detach.scheme` schemes (ExpoKit).

// expo-face-detector is now deprecated. We recommed using react-native-vision-camera instead.

const { androidId } = Constants;

// Dropped support for Android SDK 21 and 22. ([#24201](https://github.com/expo/expo/pull/24201) by [@behenate](https://github.com/behenate))

import { hashAssetFiles } from '@expo/metro-config';

const config = {
  resolver: {
    assetExts: ['obj', 'mtl', 'jpg', 'png', 'glb', 'fbx', 'gltf'],
    sourceExts: ['expo.ts', 'expo.tsx', 'ts', 'tsx', 'js', 'jsx', 'json'],
    assetMainFields: ['expo'],
  },
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  preprocessor: {
    hashAssetFiles: hashAssetFiles({
      httpServerLocation: '_',
    }),
  },
};

export default config;

// expo-face-detector is now deprecated. We recommed using react-native-vision-camera instead.
// https://github.com/mrousavy/react-native-vision-camera
export * from './filters/http-exception.filter'
export * from './validators/is-object-id.validator'
