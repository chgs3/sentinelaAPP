import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../services/api';
import type { MonthlySummary, ParseMessageResponse, Transaction } from '../types';

export default function HomeScreen() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [summaryResponse, transactionsResponse] = await Promise.all([
        api.get<MonthlySummary>('/summary/monthly'),
        api.get<Transaction[]>('/transactions'),
      ]);

      setSummary(summaryResponse.data);
      setTransactions(transactionsResponse.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da API.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitMessage() {
    if (!message.trim()) {
      Alert.alert('Atenção', 'Digite uma mensagem para registrar a transação.');
      return;
    }

    try {
      setSubmitting(true);

      await api.post<ParseMessageResponse>('/messages/parse', {
        message,
      });

      setMessage('');
      await loadData();

      Alert.alert('Sucesso', 'Transação registrada com sucesso.');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível registrar a transação.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function renderTransaction({ item }: { item: Transaction }) {
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionTitle}>{item.description}</Text>
          <Text
            style={[
              styles.transactionAmount,
              item.type === 'income' ? styles.income : styles.expense,
            ]}
          >
            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
        </View>

        <Text style={styles.transactionMeta}>Categoria: {item.category}</Text>
        <Text style={styles.transactionMeta}>
          Data: {new Date(item.transactionAt).toLocaleDateString('pt-BR')}
        </Text>
        <Text style={styles.transactionMeta}>
          Pagamento: {item.paymentMethod ?? 'Não informado'}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Finance Agent</Text>
      <Text style={styles.subtitle}>Controle de gastos por mensagem</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumo do mês</Text>
        <Text style={styles.summaryItem}>
          Receitas: {formatCurrency(summary?.totalIncomes ?? 0)}
        </Text>
        <Text style={styles.summaryItem}>
          Despesas: {formatCurrency(summary?.totalExpenses ?? 0)}
        </Text>
        <Text style={styles.summaryItem}>
          Saldo: {formatCurrency(summary?.balance ?? 0)}
        </Text>
        <Text style={styles.summaryItem}>
          Transações: {summary?.totalTransactions ?? 0}
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Registrar por mensagem</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: Gastei 32,50 com uber"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmitMessage}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Enviando...' : 'Registrar'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.listTitle}>Últimas transações</Text>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma transação encontrada.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F7FB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  summaryItem: {
    fontSize: 15,
    marginBottom: 6,
    color: '#374151',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  listContent: {
    paddingBottom: 24,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textTransform: 'capitalize',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  income: {
    color: '#059669',
  },
  expense: {
    color: '#DC2626',
  },
  transactionMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
  },
});