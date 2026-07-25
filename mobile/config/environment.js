const APP_ENVIRONMENTS = ['dev', 'beta', 'prod'];

const environmentMetadata = {
  dev: {
    name: 'Sentinela Dev',
    scheme: 'sentinela-dev',
    androidPackage: 'com.caiquedev.sentinela.dev',
    iosBundleIdentifier: 'com.caiquedev.sentinela.dev',
    defaultApiUrl: 'http://localhost:3333',
  },
  beta: {
    name: 'Sentinela Beta',
    scheme: 'sentinela-beta',
    androidPackage: 'com.caiquedev.sentinela.beta',
    iosBundleIdentifier: 'com.caiquedev.sentinela.beta',
    defaultApiUrl: 'https://sentinela-backend-beta.onrender.com',
  },
  prod: {
    name: 'Sentinela',
    scheme: 'sentinela',
    androidPackage: 'com.caiquedev.sentinela',
    iosBundleIdentifier: 'com.caiquedev.sentinela',
  },
};

function parseAppEnvironment(value) {
  const appEnv = value?.trim() || 'dev';

  if (!APP_ENVIRONMENTS.includes(appEnv)) {
    throw new Error(
      `APP_ENV inválido: "${appEnv}". Use dev, beta ou prod.`
    );
  }

  return appEnv;
}

function parseApiUrl(value, appEnv) {
  let apiUrl;

  try {
    apiUrl = new URL(value);
  } catch {
    throw new Error(`EXPO_PUBLIC_API_URL inválida: "${value}".`);
  }

  if (!['http:', 'https:'].includes(apiUrl.protocol)) {
    throw new Error('EXPO_PUBLIC_API_URL deve usar http:// ou https://.');
  }

  if (appEnv !== 'dev' && apiUrl.protocol !== 'https:') {
    throw new Error(`EXPO_PUBLIC_API_URL deve usar https:// em ${appEnv}.`);
  }

  return apiUrl.toString().replace(/\/$/, '');
}

function resolveMobileEnvironment(variables) {
  const appEnv = parseAppEnvironment(variables.APP_ENV);
  const metadata = environmentMetadata[appEnv];
  const configuredApiUrl = variables.EXPO_PUBLIC_API_URL?.trim();
  const rawApiUrl = configuredApiUrl || metadata.defaultApiUrl;

  if (!rawApiUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL é obrigatória quando APP_ENV=prod.'
    );
  }

  return {
    appEnv,
    apiUrl: parseApiUrl(rawApiUrl, appEnv),
    ...metadata,
  };
}

module.exports = {
  APP_ENVIRONMENTS,
  resolveMobileEnvironment,
};
