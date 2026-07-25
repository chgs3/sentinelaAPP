const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

function isPrivateIpv4(address) {
  const octets = address.split('.').map(Number);

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function selectLanIpv4(interfaces, explicitAddress) {
  if (explicitAddress) {
    if (net.isIP(explicitAddress) !== 4) {
      throw new Error(`EXPO_LAN_IP inválido: "${explicitAddress}".`);
    }

    return explicitAddress;
  }

  const addresses = Object.values(interfaces)
    .flat()
    .filter(Boolean)
    .filter(
      ({ address, family, internal }) =>
        !internal && (family === 'IPv4' || family === 4) && net.isIP(address) === 4
    )
    .map(({ address }) => address);

  const privateAddress = addresses.find(isPrivateIpv4);

  if (!privateAddress) {
    throw new Error(
      'Não foi encontrado um IPv4 privado. Conecte o computador à mesma rede do celular ou defina EXPO_LAN_IP.'
    );
  }

  return privateAddress;
}

function setEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  return `${content}${separator}${line}\n`;
}

function buildEnvironmentContent(content, apiUrl) {
  return setEnvValue(
    setEnvValue(content, 'APP_ENV', 'dev'),
    'EXPO_PUBLIC_API_URL',
    apiUrl
  );
}

function configureLanEnvironment({
  interfaces = os.networkInterfaces(),
  explicitAddress = process.env.EXPO_LAN_IP,
  port = process.env.API_PORT || '3333',
  envPath = path.resolve(__dirname, '..', '.env'),
} = {}) {
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error(`API_PORT inválida: "${port}".`);
  }

  const address = selectLanIpv4(interfaces, explicitAddress);
  const apiUrl = `http://${address}:${port}`;
  const currentContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf8')
    : '';

  fs.writeFileSync(
    envPath,
    buildEnvironmentContent(currentContent, apiUrl),
    'utf8'
  );

  return { address, apiUrl, envPath };
}

if (require.main === module) {
  try {
    const { apiUrl, envPath } = configureLanEnvironment();
    console.log(`API do Expo Go configurada como ${apiUrl}`);
    console.log(`Arquivo atualizado: ${envPath}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  buildEnvironmentContent,
  configureLanEnvironment,
  isPrivateIpv4,
  selectLanIpv4,
};
