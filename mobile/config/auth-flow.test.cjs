const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const {
  getApiErrorMessage,
  validateLoginFields,
  validateRegistrationFields,
} = require('../src/utils/authFlow.ts');

test('valida os campos essenciais do cadastro antes da requisição', () => {
  assert.equal(
    validateRegistrationFields('', 'pessoa@example.com', 'segredo'),
    'Preencha nome, email e senha.'
  );
  assert.equal(
    validateRegistrationFields('P', 'pessoa@example.com', 'segredo'),
    'Nome deve ter pelo menos 2 caracteres.'
  );
  assert.equal(
    validateRegistrationFields('Pessoa', 'email-invalido', 'segredo'),
    'Informe um email válido.'
  );
  assert.equal(
    validateRegistrationFields('Pessoa', 'pessoa@example.com', '123'),
    'Senha deve ter pelo menos 6 caracteres.'
  );
  assert.equal(
    validateRegistrationFields('Pessoa', 'pessoa@example.com', 'segredo'),
    null
  );
});

test('valida login e mantém mensagens devolvidas pela API', () => {
  assert.equal(
    validateLoginFields('email-invalido', 'segredo'),
    'Informe um email válido.'
  );
  assert.equal(validateLoginFields('pessoa@example.com', 'segredo'), null);
  assert.equal(
    getApiErrorMessage(
      {
        response: {
          data: {
            message: 'Credenciais inválidas.',
          },
        },
      },
      'Falha no login.'
    ),
    'Credenciais inválidas.'
  );
});

test('explica falha de rede e preserva fallback para erros desconhecidos', () => {
  assert.match(
    getApiErrorMessage(
      {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      },
      'Falha.'
    ),
    /conectar ao servidor/
  );
  assert.equal(getApiErrorMessage(new Error('Falha interna'), 'Falha.'), 'Falha.');
});

test('telas de autenticação usam o fluxo validado e a mensagem de rede', () => {
  const registerSource = readFileSync(
    join(__dirname, '..', 'src', 'app', '(auth)', 'register.tsx'),
    'utf8'
  );
  const loginSource = readFileSync(
    join(__dirname, '..', 'src', 'app', '(auth)', 'login.tsx'),
    'utf8'
  );

  assert.match(registerSource, /validateRegistrationFields/);
  assert.match(registerSource, /getApiErrorMessage/);
  assert.match(loginSource, /validateLoginFields/);
  assert.match(loginSource, /getApiErrorMessage/);
});
