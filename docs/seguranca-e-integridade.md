# Segurança e integridade financeira

## Valores monetários

Transações, dívidas e fechamentos mensais usam `DECIMAL(14,2)` no PostgreSQL.
A migration converte os antigos `DOUBLE PRECISION` com arredondamento explícito
para duas casas decimais. A API serializa esses valores como números para
preservar o contrato consumido pelo aplicativo.

Antes de aplicar a migration em um banco com dados reais:

1. faça um backup verificável;
2. confira se não existem valores que dependam de mais de duas casas;
3. execute `npm run prisma:deploy`;
4. valide lançamentos e fechamentos representativos.

Os testes automatizados continuam usando persistência em memória. O GitHub
Actions cria um PostgreSQL temporário e executa todas as migrations do zero.

## Proteções HTTP

O backend aplica:

- headers de segurança com Helmet;
- remoção do header `X-Powered-By`;
- CORS por lista explícita em produção;
- rate limiting global e mais restritivo em cadastro/login;
- limite configurável do corpo JSON;
- validação de IDs inteiros positivos;
- paginação com no máximo 100 registros por chamada;
- `requestId` em cada resposta e logs estruturados sem conteúdo financeiro,
  senha, token ou anexo.

Clientes mobile nativos normalmente não enviam `Origin` e continuam aceitos. O
CORS controla origens de navegadores; ele não substitui autenticação.

## Variáveis de ambiente

```dotenv
NODE_ENV=production
CORS_ORIGINS=https://app.sentinela.example
JSON_BODY_LIMIT=10mb
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
AUTH_RATE_LIMIT_MAX=10
TRUST_PROXY=true
```

`CORS_ORIGINS` aceita uma lista separada por vírgulas e é obrigatória em
produção. `*` é rejeitado. Ative `TRUST_PROXY` somente quando o proxy reverso
for confiável e estiver sob controle do provedor de hospedagem.

O limitador atual usa memória do processo e atende a uma instância beta. Antes
de escalar horizontalmente, configure um armazenamento compartilhado para que
o limite seja consistente entre réplicas.
