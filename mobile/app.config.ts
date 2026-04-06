import type { ExpoConfig } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'dev';

const apiUrlByEnv: Record<string, string> = {
  dev: 'http://192.168.1.12:3333',
  beta: 'https://sentinela-backend-beta.onrender.com',
  prod: 'https://api.seudominio.com',
};

const appNameByEnv: Record<string, string> = {
  dev: 'Sentinela Dev',
  beta: 'Sentinela Beta',
  prod: 'Sentinela',
};

const schemeByEnv: Record<string, string> = {
  dev: 'sentinela-dev',
  beta: 'sentinela-beta',
  prod: 'sentinela',
};

const config: ExpoConfig = {
  name: appNameByEnv[APP_ENV] ?? 'Sentinela Dev',
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: schemeByEnv[APP_ENV] ?? 'sentinela-dev',
  userInterfaceStyle: 'light',

  ios: {
    icon: './assets/expo.icon',
  },

  android: {
    package: 'com.caiquedev.sentinela',
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
    appEnv: APP_ENV,
    apiUrl: apiUrlByEnv[APP_ENV] ?? apiUrlByEnv.dev,
    eas: {
      projectId: '32a460de-c553-4ab2-a25a-c33ac9d79466',
    },
  },
};

export default config;