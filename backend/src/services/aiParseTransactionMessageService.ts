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

Regras:
- "type" deve ser "expense" ou "income".
- "amount" deve ser número positivo.
- "description" deve ser curta, clara e útil.
- "category" deve ser uma categoria curta em português, como:
  Transporte, Alimentação, Moradia, Saúde, Lazer, Trabalho, Outros.
- "transactionAt" deve estar em formato ISO date-time.
- "rawDateExpression" deve conter a expressão temporal original, quando existir.
- "paymentMethod" deve ser um destes: "credit", "debit", "pix", "cash", ou null.
- "accountOrCard" deve ser string ou null.
- "confidence" deve ser um número entre 0 e 1.
- "possibleTransfer" deve ser true se a mensagem puder representar transferência entre contas, e false caso contrário.
- Se não souber um campo opcional, use null.
- Interprete datas relativas considerando que hoje é ${today}.
- Para "última quarta-feira", "última segunda-feira" e semelhantes, use o dia da semana mais recente no passado.
- Não invente valor.
- Se houver ambiguidade entre receita, despesa e transferência, marque a saída com confiança menor.
- Não responda texto explicativo. Apenas JSON válido.

Mensagem:
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
              'paymentMethod',
              'accountOrCard',
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