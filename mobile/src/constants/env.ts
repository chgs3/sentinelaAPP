import Constants from 'expo-constants';

type ExpoExtra = {
  apiUrl?: string;
  appEnv?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const ENV = {
  appEnv: extra.appEnv ?? 'dev',
  apiUrl: extra.apiUrl ?? 'http://192.168.1.12:3333',
};