# Validação do MVP

Este roteiro valida os principais fluxos do Sentinela sem misturar dados de
teste automatizado com o banco usado no desenvolvimento.

## Testes automatizados

Os testes HTTP do backend iniciam o Express em uma porta aleatória e substituem
o Prisma por uma implementação somente em memória. Eles não executam consultas
nem removem registros do PostgreSQL configurado no `.env`.

Backend:

```bash
cd backend
npm test
npm run build
```

A suíte cobre:

- saúde e proteção das rotas privadas;
- cadastro, normalização de email, login e restauração da sessão;
- validação, criação, listagem, edição e exclusão de transações;
- criação por mensagem e confirmação segura do resultado do parser;
- resumos do período, categorias, comparação e evolução diária;
- fechamento mensal e bloqueio de fechamento duplicado;
- criação, quitação e exclusão de dívidas;
- isolamento de transações, dívidas, resumos e fechamentos entre usuários.

Mobile:

```bash
cd mobile
npm run quality
```

Essa suíte verifica a configuração de ambientes e LAN, os contratos do fluxo de
autenticação, as mensagens de erro de rede, TypeScript e ESLint.

## Validação manual no Expo Go

### Preparação

1. Inicie o PostgreSQL e aplique as migrações necessárias.
2. Inicie o backend:

   ```bash
   cd backend
   npm run dev
   ```

3. Em outro terminal, inicie o Expo detectando o endereço da rede local:

   ```bash
   cd mobile
   npm run start:lan
   ```

4. Mantenha computador e celular na mesma rede.
5. No navegador do celular, abra `http://IP-DO-COMPUTADOR:3333/health`.
   A resposta esperada é `{"message":"API funcionando corretamente"}`.

### Roteiro principal

1. Crie uma conta e faça login.
2. Feche e reabra o aplicativo; a sessão deve ser restaurada.
3. Envie `Gastei 32,50 com Uber`; confirme o lançamento de despesa.
4. Envie `Recebi 500 de freela`; confirme o lançamento de receita.
5. Abra um lançamento, edite-o e confira a atualização na Home.
6. Abra o Dashboard e confira totais, categorias e evolução diária.
7. Registre `João me deve 50 do almoço`.
8. Envie `João já pagou` e confira a dívida como recebida.
9. Feche o mês pelo Dashboard e confira o resumo congelado.
10. Saia da conta e confirme o retorno para a tela de login.

### Regressões importantes

- `Pix 75` deve pedir confirmação em vez de criar automaticamente.
- `Transferi 1.250,50 para minha conta Inter` deve ser ignorado como
  transferência entre contas.
- Uma segunda conta não pode visualizar, editar ou excluir dados da primeira.
- Com o backend desligado, cadastro e login devem informar que não foi possível
  conectar ao servidor.
