import { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect, router } from 'expo-router';

import { api } from '../services/api';
import type { MonthlySummary, ParseMessageResponse, Transaction } from '../types';

export default function HomeScreen() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  async function handleDeleteTransaction(id: number) {
    try {
      setDeletingId(id);

      await api.delete(`/transactions/${id}`);
      await loadData();

      Alert.alert('Sucesso', 'Transação excluída com sucesso.');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível excluir a transação.');
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDelete(id: number) {
    Alert.alert(
      'Excluir transação',
      'Tem certeza que deseja excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => handleDeleteTransaction(id),
        },
      ]
    );
  }

  function goToEditTransaction(id: number) {
    router.push({
      pathname: '/edit/[id]' as const,
      params: { id: String(id) },
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function renderTransaction({ item }: { item: Transaction }) {
    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => goToEditTransaction(item.id)}
      >
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
        <Text style={styles.transactionMeta}>
          Conta/Cartão: {item.accountOrCard ?? 'Não informado'}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => goToEditTransaction(item.id)}
          >
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmDelete(item.id)}
            disabled={deletingId === item.id}
          >
            <Text style={styles.deleteButtonText}>
              {deletingId === item.id ? 'Excluindo...' : 'Excluir'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
  },
});