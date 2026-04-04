export function formatCurrencyBRL(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDateBR(value: string | Date | null | undefined) {
  if (!value) return 'Não informado';

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return 'Não informado';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

export function formatMonthYearShort(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  const months = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];

  return `${months[date.getMonth()]}/${date.getFullYear()}`;
}

export function getFirstName(name?: string | null) {
  if (!name?.trim()) return 'Usuário';

  return name.trim().split(/\s+/)[0];
}

export function formatPaymentMethod(
  paymentMethod: 'credit' | 'debit' | 'pix' | 'cash' | null
) {
  switch (paymentMethod) {
    case 'credit':
      return 'Crédito';
    case 'debit':
      return 'Débito';
    case 'pix':
      return 'Pix';
    case 'cash':
      return 'Dinheiro';
    default:
      return 'Não informado';
  }
}