export function formatPaymentMethod(
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash' | null) {
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
