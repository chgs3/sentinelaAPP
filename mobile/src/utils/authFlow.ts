type ApiErrorLike = {
  code?: string;
  message?: string;
  response?: {
    data?: {
      message?: unknown;
    };
  };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistrationFields(
  name: string,
  email: string,
  password: string
) {
  if (!name.trim() || !email.trim() || !password.trim()) {
    return 'Preencha nome, email e senha.';
  }

  if (name.trim().length < 2) {
    return 'Nome deve ter pelo menos 2 caracteres.';
  }

  if (!emailPattern.test(email.trim())) {
    return 'Informe um email válido.';
  }

  if (password.length < 6) {
    return 'Senha deve ter pelo menos 6 caracteres.';
  }

  return null;
}

export function validateLoginFields(email: string, password: string) {
  if (!email.trim() || !password.trim()) {
    return 'Preencha email e senha.';
  }

  if (!emailPattern.test(email.trim())) {
    return 'Informe um email válido.';
  }

  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiErrorLike;
  const responseMessage = apiError?.response?.data?.message;

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }

  if (
    apiError?.code === 'ERR_NETWORK' ||
    apiError?.message?.toLowerCase() === 'network error'
  ) {
    return 'Não foi possível conectar ao servidor. Confirme a rede e se a API está ligada.';
  }

  return fallback;
}
