import Constants from 'expo-constants';
import { resolveMobileEnvironment } from '../../config/environment.js';

type ExpoExtra = {
  apiUrl?: string;
  appEnv?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const environment = resolveMobileEnvironment({
  APP_ENV: extra.appEnv,
  EXPO_PUBLIC_API_URL: extra.apiUrl,
});

export const ENV = {
  appEnv: environment.appEnv,
  apiUrl: environment.apiUrl,
};
