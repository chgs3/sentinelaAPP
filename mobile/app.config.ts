import type { ExpoConfig } from 'expo/config';
import { resolveMobileEnvironment } from './config/environment.js';

const environment = resolveMobileEnvironment({
  APP_ENV: process.env.APP_ENV,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});

const config: ExpoConfig = {
  name: environment.name,
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: environment.scheme,
  userInterfaceStyle: 'light',

  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: environment.iosBundleIdentifier,
  },

  android: {
    package: environment.androidPackage,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },

  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    'expo-font',
    'expo-web-browser',
    'expo-secure-store',
    '@react-native-community/datetimepicker',
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    appEnv: environment.appEnv,
    apiUrl: environment.apiUrl,
    eas: {
      projectId: '32a460de-c553-4ab2-a25a-c33ac9d79466',
    },
  },
};

export default config;
