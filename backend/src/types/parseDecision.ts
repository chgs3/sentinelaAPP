export type ParseStatus = 'created' | 'needs_confirmation' | 'unable_to_parse';

export type ParseDecision =
  | {
      status: 'created';
      reason?: string;
      ambiguities: string[];
    }
  | {
      status: 'needs_confirmation';
      reason: string;
      ambiguities: string[];
    }
  | {
      status: 'unable_to_parse';
      reason: string;
      ambiguities: string[];
    };