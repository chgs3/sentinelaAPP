import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../services/api';
import { useAppTheme } from '../../../hooks/useAppTheme';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatPaymentMethod,
} from '../../../utils/formatters';
import type { Transaction } from '../../../types';

type TransactionType = 'expense' | 'income';

export default function TransactionDetailsScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadTransaction = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get<Transaction[]>('/transactions');
      const found = response.data.find((item) => item.id === Number(id));

      if (!found) {
        Alert.alert('Erro', 'Transação não encontrada.', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
        return;
      }

      setTransaction(found);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar os detalhes da transação.';

      Alert.alert('Erro', apiMessage, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadTransaction();
    }, [loadTransaction])
  );


  function formatCurrency(value: number) {
    return formatCurrencyBRL(value);
  }

  function getTransactionTypeLabel(value: TransactionType) {
    return value === 'income' ? 'Receita' : 'Despesa';
  }

  const typeLabel = useMemo(() => {
    if (!transaction) return '';
    return getTransactionTypeLabel(transaction.type);
  }, [transaction]);

  const typeTone = useMemo(() => {
    if (!transaction) {
      return {
        text: colors.text,
        bg: colors.surfaceSecondary,
      };
    }

    if (transaction.type === 'income') {
      return {
        text: colors.success,
        bg: colors.successSoft,
      };
    }

    return {
      text: colors.danger,
      bg: colors.dangerSoft,
    };
  }, [transaction, colors]);

  function goToEditTransaction() {
    if (!transaction) return;

    router.push({
      pathname: '/edit/[id]',
      params: { id: String(transaction.id) },
    });
  }

  function confirmDeleteTransaction() {
    if (!transaction) return;

    Alert.alert(
      'Excluir transação',
      'Tem certeza que deseja excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: handleDeleteTransaction,
        },
      ]
    );
  }

  async function handleDeleteTransaction() {
    if (!transaction) return;

    try {
      setDeleting(true);

      await api.delete(`/transactions/${transaction.id}`);

      Alert.alert('Sucesso', 'Transação removida com sucesso.', [
        {
          text: 'OK',
          onPress: () => router.replace('/home'),
        },
      ]);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível remover a transação.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando detalhes...
        </Text>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Transação não encontrada.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.title, { color: colors.text }]}>
                {transaction.description}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Veja os detalhes completos dessa movimentação.
              </Text>
            </View>

            <View
              style={[
                styles.typeBadge,
                { backgroundColor: typeTone.bg },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: typeTone.text },
                ]}
              >
                {typeLabel}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.amount,
              {
                color:
                  transaction.type === 'income'
                    ? colors.success
                    : colors.danger,
              },
            ]}
          >
            {transaction.type === 'income' ? '+' : '-'}{' '}
            {formatCurrency(transaction.amount)}
          </Text>

          <View
            style={[
              styles.highlightBox,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.highlightLabel, { color: colors.textMuted }]}>
              Resumo
            </Text>
            <Text style={[styles.highlightValue, { color: colors.text }]}>
              {transaction.type === 'income'
                ? `${transaction.description} entrou como receita no valor de ${formatCurrency(transaction.amount)}`
                : `${transaction.description} saiu como despesa no valor de ${formatCurrency(transaction.amount)}`}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Tipo</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {typeLabel}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Categoria
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {transaction.category}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Data</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {formatDateBR(transaction.transactionAt)}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Forma de pagamento
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {formatPaymentMethod(transaction.paymentMethod)}
            </Text>
          </View>

          <View style={styles.infoGroupLast}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Conta/Cartão
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {transaction.accountOrCard ?? 'Não informado'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              { backgroundColor: colors.surfaceSecondary },
            ]}
            onPress={goToEditTransaction}
          >
            <Text
              style={[
                styles.secondaryActionButtonText,
                { color: colors.text },
              ]}
            >
              Editar transação
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: colors.dangerSoft },
              deleting && styles.buttonDisabled,
            ]}
            onPress={confirmDeleteTransaction}
            disabled={deleting}
          >
            <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
              {deleting ? 'Excluindo...' : 'Excluir transação'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginTop: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amount: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 18,
  },
  highlightBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  infoGroup: {
    marginBottom: 16,
  },
  infoGroupLast: {
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    lineHeight: 22,
  },
  actionsContainer: {
    marginTop: 16,
    gap: 12,
  },
  secondaryActionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  deleteButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
