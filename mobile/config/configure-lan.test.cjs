const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildEnvironmentContent,
  isPrivateIpv4,
  selectLanIpv4,
} = require('../scripts/configure-lan.cjs');

test('prioriza um IPv4 privado alcançável pelo Expo Go', () => {
  const address = selectLanIpv4({
    Loopback: [
      { address: '127.0.0.1', family: 'IPv4', internal: true },
    ],
    Tunnel: [
      { address: '54.232.189.113', family: 'IPv4', internal: false },
    ],
    Ethernet: [
      { address: '192.168.1.16', family: 'IPv4', internal: false },
    ],
  });

  assert.equal(address, '192.168.1.16');
  assert.equal(isPrivateIpv4(address), true);
});

test('permite informar o IP explicitamente e rejeita valores inválidos', () => {
  assert.equal(selectLanIpv4({}, '10.0.0.25'), '10.0.0.25');
  assert.throws(() => selectLanIpv4({}, 'meu-computador'), /EXPO_LAN_IP inválido/);
});

test('falha claramente quando não existe rede privada disponível', () => {
  assert.throws(
    () =>
      selectLanIpv4({
        Tunnel: [
          { address: '54.232.189.113', family: 'IPv4', internal: false },
        ],
      }),
    /Não foi encontrado um IPv4 privado/
  );
});

test('atualiza somente as variáveis necessárias no arquivo de ambiente', () => {
  const content = buildEnvironmentContent(
    'APP_ENV=beta\nOUTRA_VARIAVEL=preservada\nEXPO_PUBLIC_API_URL=https://api.example.com\n',
    'http://192.168.1.16:3333'
  );

  assert.equal(
    content,
    'APP_ENV=dev\nOUTRA_VARIAVEL=preservada\nEXPO_PUBLIC_API_URL=http://192.168.1.16:3333\n'
  );
});
