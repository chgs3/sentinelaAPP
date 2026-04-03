import type { AITransactionOutput } from '../schemas/aiTransactionSchema';
import type { ParseDecision } from '../types/parseDecision';
import { detectParseAmbiguities } from './detectParseAmbiguities';

function isEssentiallyValid(parsed: AITransactionOutput) {
  if (!parsed.type) return false;
  if (!parsed.amount || parsed.amount <= 0) return false;
  if (!parsed.description?.trim()) return false;
  if (!parsed.category?.trim()) return false;
  if (!parsed.transactionAt?.trim()) return false;
  return true;
}

export function decideParseOutcome(
  message: string,
  parsed: AITransactionOutput
): ParseDecision {
  try {
    const ambiguities = detectParseAmbiguities(message, parsed);
    const confidence = parsed.confidence ?? 0;

    if (!isEssentiallyValid(parsed)) {
      return {
        status: 'unable_to_parse',
        reason: 'Campos essenciais insuficientes para registrar a transação.',
        ambiguities,
      };
    }

    const hardBlockReasons = ambiguities.filter((item) =>
      [
        'Valor ausente ou inválido.',
        'Tipo de transação ausente.',
        'Descrição muito curta ou ausente.',
        'Categoria muito curta ou ausente.',
        'Confiança baixa da IA.',
      ].includes(item)
    );

    if (hardBlockReasons.length > 0 || confidence < 0.6) {
      return {
        status: 'unable_to_parse',
        reason: 'Não foi possível interpretar a mensagem com segurança.',
        ambiguities,
      };
    }

    const confirmationTriggers = ambiguities.filter((item) =>
      [
        'Categoria muito genérica.',
        'Mensagem pode representar transferência interna.',
        'Expressão temporal potencialmente ambígua.',
        'Mensagem curta demais para interpretação segura.',
        'Mensagem ambígua quanto a receita ou despesa.',
        'Confiança intermediária da IA.',
        'Descrição genérica demais.',
      ].includes(item)
    );

    if (confirmationTriggers.length > 0 || confidence < 0.85) {
      return {
        status: 'needs_confirmation',
        reason: 'A interpretação exige confirmação antes de salvar.',
        ambiguities,
      };
    }

    return {
      status: 'created',
      reason: 'Interpretação considerada segura.',
      ambiguities,
    };
  } catch (error) {
    console.error('Erro em decideParseOutcome:', error);

    return {
      status: 'unable_to_parse',
      reason: 'Erro interno ao decidir a interpretação da mensagem.',
      ambiguities: ['Falha interna no motor de decisão.'],
    };
  }
}