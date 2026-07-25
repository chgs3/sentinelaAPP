# Configuração de ambientes

O Sentinela possui três variantes do aplicativo:

| Variante | `APP_ENV` | API padrão | Identificador nativo |
| --- | --- | --- | --- |
| Desenvolvimento | `dev` | `http://localhost:3333` | `com.caiquedev.sentinela.dev` |
| Beta | `beta` | `https://sentinela-backend-beta.onrender.com` | `com.caiquedev.sentinela.beta` |
| Produção | `prod` | obrigatória via `EXPO_PUBLIC_API_URL` | `com.caiquedev.sentinela` |

As variantes têm nomes, esquemas de URL e identificadores Android/iOS
independentes. Isso permite instalar dev, beta e produção no mesmo aparelho.

## Backend

1. Entre em `backend` e instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e ajuste, no mínimo:

   ```dotenv
   DATABASE_URL=postgresql://usuario:senha@localhost:5432/sentinela
   JWT_SECRET=uma-chave-aleatoria-com-pelo-menos-32-caracteres
   ```

3. Prepare o Prisma e inicie a API:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run dev
   ```

O backend valida as variáveis ao iniciar. `GEMINI_API_KEY` é opcional; sem ela,
o parser local é usado. O envio de e-mail também é opcional, mas
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SUPPORT_EMAIL` precisam
ser preenchidos em conjunto.

## Aplicativo mobile

1. Entre em `mobile`, instale as dependências e copie `.env.example` para
   `.env`:

   ```bash
   npm install
   ```

2. Para um aparelho físico, troque `localhost` pelo IP da máquina na rede:

   ```dotenv
   APP_ENV=dev
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3333
   ```

   No emulador Android, normalmente a máquina host é `10.0.2.2`. No iOS
   Simulator, `localhost` normalmente funciona.

3. Inicie a variante desejada:

   ```bash
   npm run start:dev
   npm run start:beta
   ```

Para produção, defina uma URL HTTPS:

```bash
APP_ENV=prod EXPO_PUBLIC_API_URL=https://api.exemplo.com npm run start
```

No PowerShell:

```powershell
$env:APP_ENV = "prod"
$env:EXPO_PUBLIC_API_URL = "https://api.exemplo.com"
npm run start
```

Nos builds EAS, os perfis `development`, `preview` e `production` selecionam
respectivamente `dev`, `beta` e `prod`. Cadastre `EXPO_PUBLIC_API_URL` no
ambiente `production` do EAS antes do build. Variáveis com o prefixo
`EXPO_PUBLIC_` ficam disponíveis no aplicativo e nunca devem conter segredos.

## Testes locais

Use Node.js 22 e instale as dependências de cada pacote antes da primeira
execução. Para reproduzir exatamente as versões dos arquivos de lock, prefira
`npm ci`.

Backend (testes unitários e de regressão dos parsers, seguida da compilação):

```bash
cd backend
npm ci
npm audit --audit-level=critical
npm run prisma:generate
npm test
npm run build
```

Os testes do parser cobrem despesas, receitas, Pix ambíguo, transferências,
dívidas, quitações, datas relativas e valores com separadores brasileiros.

Mobile (configuração, testes, tipos e lint):

```bash
cd mobile
npm ci
npm audit --audit-level=critical
npx expo install --check
npm test
npm run typecheck
npm run lint
npx expo config --type public
```

Como atalho para testes, tipos e lint do mobile:

```bash
cd mobile
npm run quality
```

Regressão de higiene do repositório, a partir da raiz:

```bash
node --test --test-isolation=none tests/repository-hygiene.test.mjs
```

## Integração contínua

O workflow `.github/workflows/ci.yml` executa as mesmas verificações no GitHub
Actions a cada `push` para `master` e em todo pull request. Ele usa três jobs
independentes para higiene do repositório, backend e mobile, sem acessar banco
ou serviços externos.
