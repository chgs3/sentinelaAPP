export const APP_ENVIRONMENTS: readonly ['dev', 'beta', 'prod'];

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export type MobileEnvironment = {
  appEnv: AppEnvironment;
  apiUrl: string;
  name: string;
  scheme: string;
  androidPackage: string;
  iosBundleIdentifier: string;
  defaultApiUrl?: string;
};

export function resolveMobileEnvironment(variables: {
  APP_ENV?: string;
  EXPO_PUBLIC_API_URL?: string;
}): MobileEnvironment;
