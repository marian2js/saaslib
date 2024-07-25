/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited

// expo-face-detector is now deprecated. We recommed using react-native-vision-camera instead.
// https://github.com/mrousavy/react-native-vision-camera

import { BarCodeScanner } from 'expo-barcode-scanner';

const MyComponent = () => {
  return <BarCodeScanner onBarCodeScanned={scanned => {}} />;
};

export default MyComponent;
// see https://nextjs.org/docs/basic-features/typescript for more information.
