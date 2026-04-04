import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../services/api';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { formatPaymentMethod } from '../../../utils/formatters';
import type { Transaction } from '../../../types';

export default function TransactionDetailsScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadTransaction() {
    try {
      setLoading(true);

      const response = await api.get<Transaction[]>('/transactions');
      const found = response.data.find((item) => item.id === Number(id));

      if (!found) {
        Alert.alert('Erro', 'Transação não encontrada.');
        return;
      }

      setTransaction(found);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar os detalhes da transação.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransaction();
  }, []);

  function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
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
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {transaction.description}
          </Text>

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

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Tipo
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
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
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Data
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {new Date(transaction.transactionAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Pagamento
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {formatPaymentMethod(transaction.paymentMethod)}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Conta/Cartão
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {transaction.accountOrCard ?? 'Não informado'}
            </Text>
          </View>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 18,
  },
  infoGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
});
