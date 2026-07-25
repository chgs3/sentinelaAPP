# Sentinela

Aplicativo de controle de gastos com entrada em linguagem natural.

## Estrutura do projeto

- `backend`: API, regras de negócio e acesso ao banco
- `mobile`: aplicativo React Native
- `docs`: anotações do projeto, decisões e documentação

## Executar localmente

Consulte [Configuração de ambientes](docs/configuracao-de-ambientes.md) para
preparar PostgreSQL, backend, aplicativo mobile, variantes EAS e testes.

## Objetivo inicial

Permitir registrar gastos através de frases como:

- "Gastei 32,50 com uber"
- "Paguei 80 de internet"
- "Recebi 500 de freela"

E transformar isso em lançamentos estruturados.
