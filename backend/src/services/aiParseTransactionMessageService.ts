import { GoogleGenAI } from '@google/genai';
import {
  aiTransactionSchema,
  type AITransactionOutput,
} from '../schemas/aiTransactionSchema';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

class AIParseTransactionMessageService {
  async execute(message: string): Promise<AITransactionOutput | null> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const prompt = `
Você é um extrator de transações financeiras em português do Brasil.

Sua tarefa é converter a mensagem do usuário em uma transação estruturada.

## Objetivo
Interpretar a mensagem como:
- uma despesa ("expense"), ou
- uma receita ("income").

Você deve responder apenas com JSON válido.

## Regras gerais
- "type" deve ser "expense" ou "income".
- "amount" deve ser um número positivo.
- "description" deve ser curta, específica, natural e útil.
- "category" deve ser UMA destas:
  "Transporte", "Alimentação", "Moradia", "Saúde", "Lazer", "Trabalho", "Compras", "Outros", "Transferência"
- "transactionAt" deve estar em formato ISO date-time.
- "rawDateExpression" deve conter a expressão temporal original, quando existir.
- "paymentMethod" deve ser um destes: "credit", "debit", "pix", "cash", ou null.
- "accountOrCard" deve ser string ou null.
- "confidence" deve ser um número entre 0 e 1.
- "possibleTransfer" deve ser true apenas quando houver forte evidência de transferência entre contas.
- Se não souber um campo opcional, use null.
- Não invente valor.
- Não responda texto explicativo. Apenas JSON válido.

## Datas
- Interprete datas relativas considerando que hoje é ${today}.
- Para "última quarta-feira", "última segunda-feira" e semelhantes, use o dia da semana mais recente no passado.
- Se não houver data explícita, use a data de hoje em ISO date-time.
- Se houver expressão temporal, preencha também "rawDateExpression".

## Descrição
A descrição deve ser:
- curta
- específica
- em português
- sem repetir o valor
- sem floreios

Exemplos bons de descrição:
- "Uber"
- "Ifood"
- "Salário"
- "Freela"
- "Mercado"
- "Pagamento via Pix"
- "Transferência para Inter"

Exemplos ruins:
- "Pagamento"
- "Recebimento"
- "Pix"
- "Transação financeira"
- "Compra"

## Categoria
Use estas heurísticas:
- Uber, 99, gasolina, ônibus, metrô -> "Transporte"
- Ifood, restaurante, mercado, lanche, pizza, café -> "Alimentação"
- aluguel, energia, água, internet, gás -> "Moradia"
- farmácia, médico, consulta, hospital -> "Saúde"
- cinema, netflix, spotify, viagem, bar, show -> "Lazer"
- salário, freela, cliente, reembolso, bônus, comissão, curso, faculdade -> "Trabalho"
- roupa, loja, amazon, shein, tênis, sapato -> "Compras"
- Se não estiver claro -> "Outros"
- Se for claramente transferência entre contas -> "Transferência"

## Tipo
Use estas heurísticas:
### Receita ("income")
Quando houver sinais como:
- recebi
- ganhei
- entrou
- caiu
- salário
- freela
- reembolso
- bônus
- comissão

### Despesa ("expense")
Quando houver sinais como:
- gastei
- paguei
- comprei
- usei
- fatura
- boleto
- mercado
- uber
- ifood

## Pix
Não assuma automaticamente que "pix" significa despesa.
- "recebi pix 100" -> income
- "pix 30 pro inter" -> possível transferência
- "pix 30" -> ambíguo, então use confiança menor
- "paguei pix 30" -> expense

## Transferência
Marque "possibleTransfer": true apenas se houver forte sinal de transferência entre contas, como:
- "transferi 200 pro inter"
- "mandei 100 pra minha outra conta"
- "enviei 300 para nubank"
- "passei 50 entre contas"

Não marque como transferência apenas porque aparece:
- "pix"
- nome de banco
- conta/cartão
sem verbo ou contexto de transferência.

Se for claramente transferência:
- "possibleTransfer" = true
- "category" = "Transferência"
- descrição específica, como "Transferência para Inter"
- confiança pode ser alta se estiver claro

## Confiança
A confiança deve refletir quão segura está a interpretação:
- 0.85 a 0.98: mensagem muito clara
- 0.70 a 0.84: mensagem razoavelmente clara
- 0.50 a 0.69: mensagem ambígua, mas com boa hipótese
- abaixo de 0.50: mensagem fraca ou muito ambígua

Reduza a confiança quando:
- a mensagem for muito curta
- houver "pix" sem contexto de entrada ou saída
- não estiver claro se é receita ou despesa
- a descrição ficar genérica
- houver chance de transferência

## Exemplos
Mensagem: "uber 20"
Saída esperada aproximada:
{
  "type": "expense",
  "amount": 20,
  "description": "Uber",
  "category": "Transporte",
  "transactionAt": "${today}T12:00:00.000Z",
  "rawDateExpression": null,
  "paymentMethod": null,
  "accountOrCard": null,
  "confidence": 0.78,
  "possibleTransfer": false
}

Mensagem: "salário 2500"
Saída esperada aproximada:
{
  "type": "income",
  "amount": 2500,
  "description": "Salário",
  "category": "Trabalho",
  "transactionAt": "${today}T12:00:00.000Z",
  "rawDateExpression": null,
  "paymentMethod": null,
  "accountOrCard": null,
  "confidence": 0.86,
  "possibleTransfer": false
}

Mensagem: "pix 30"
Saída esperada aproximada:
{
  "type": "expense",
  "amount": 30,
  "description": "Pagamento via Pix",
  "category": "Outros",
  "transactionAt": "${today}T12:00:00.000Z",
  "rawDateExpression": null,
  "paymentMethod": "pix",
  "accountOrCard": null,
  "confidence": 0.56,
  "possibleTransfer": false
}

Mensagem: "transferi 200 pro inter"
Saída esperada aproximada:
{
  "type": "expense",
  "amount": 200,
  "description": "Transferência para Inter",
  "category": "Transferência",
  "transactionAt": "${today}T12:00:00.000Z",
  "rawDateExpression": null,
  "paymentMethod": null,
  "accountOrCard": "inter",
  "confidence": 0.9,
  "possibleTransfer": true
}

## Mensagem do usuário
${message}
`.trim();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['expense', 'income'],
              },
              amount: {
                type: 'number',
              },
              description: {
                type: 'string',
              },
              category: {
                type: 'string',
                enum: [
                  'Transporte',
                  'Alimentação',
                  'Moradia',
                  'Saúde',
                  'Lazer',
                  'Trabalho',
                  'Compras',
                  'Outros',
                  'Transferência',
                ],
              },
              transactionAt: {
                type: 'string',
              },
              rawDateExpression: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
              },
              paymentMethod: {
                anyOf: [
                  {
                    type: 'string',
                    enum: ['credit', 'debit', 'pix', 'cash'],
                  },
                  {
                    type: 'null',
                  },
                ],
              },
              accountOrCard: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
              },
              confidence: {
                type: 'number',
              },
              possibleTransfer: {
                type: 'boolean',
              },
            },
            required: [
              'type',
              'amount',
              'description',
              'category',
              'transactionAt',
              'rawDateExpression',
              'paymentMethod',
              'accountOrCard',
              'confidence',
              'possibleTransfer',
            ],
          },
        },
      });

      const rawText = response.text;

      if (!rawText) {
        return null;
      }

      const parsedJson = JSON.parse(rawText);
      const validated = aiTransactionSchema.safeParse(parsedJson);

      if (!validated.success) {
        console.error(
          'Gemini retornou JSON inválido:',
          validated.error.flatten()
        );
        return null;
      }

      return validated.data;
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;

      if (status === 429) {
        console.warn(
          'Gemini indisponível por limite de cota. Usando fallback local.'
        );
        return null;
      }

      console.error('Erro ao consultar Gemini. Usando fallback local.', error);
      return null;
    }
  }
}

export default new AIParseTransactionMessageService();