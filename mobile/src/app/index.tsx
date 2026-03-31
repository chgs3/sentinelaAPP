import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';

import { api } from '../services/api';
import type { MonthlySummary, ParseMessageResponse, Transaction } from '../types';

type TransactionTypeFilter = 'all' | 'expense' | 'income';

export default function HomeScreen() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  async function loadData(showInitialLoading = false) {
    try {
      if (showInitialLoading) {
        setLoading(true);
      }

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
      if (showInitialLoading) {
        setLoading(false);
      }
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadData(false);
    } finally {
      setRefreshing(false);
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
      await loadData(false);

      Alert.alert('Sucesso', 'Transação registrada com sucesso.');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível registrar a transação.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTransaction(id: number) {
    try {
      setDeletingId(id);

      await api.delete(`/transactions/${id}`);
      await loadData(false);

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

  function goToTransactionDetails(id: number) {
    router.push({
      pathname: '/transaction/[id]' as const,
      params: { id: String(id) },
    });
  }

  function goToEditTransaction(id: number) {
    router.push({
      pathname: '/edit/[id]' as const,
      params: { id: String(id) },
    });
  }

  useEffect(() => {
    loadData(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [])
  );

  function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(transactions.map((transaction) => transaction.category))
    ).sort();

    return ['Todas', ...uniqueCategories];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesType =
        typeFilter === 'all' ? true : transaction.type === typeFilter;

      const matchesCategory =
        categoryFilter === 'Todas'
          ? true
          : transaction.category === categoryFilter;

      const searchableContent = [
        transaction.description,
        transaction.category,
        transaction.paymentMethod ?? '',
        transaction.accountOrCard ?? '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : searchableContent.includes(normalizedSearch);

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [transactions, typeFilter, categoryFilter, search]);

  function renderTransaction({ item }: { item: Transaction }) {
    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => goToTransactionDetails(item.id)}
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
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
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

            <View style={styles.filtersCard}>
              <Text style={styles.filtersTitle}>Filtros</Text>

              <Text style={styles.filterLabel}>Busca</Text>
              <TextInput
                style={styles.input}
                placeholder="Buscar por descrição, categoria, pix, nubank..."
                value={search}
                onChangeText={setSearch}
              />

              <Text style={styles.filterLabel}>Tipo</Text>
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    typeFilter === 'all' && styles.filterButtonActive,
                  ]}
                  onPress={() => setTypeFilter('all')}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      typeFilter === 'all' && styles.filterButtonTextActive,
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    typeFilter === 'expense' && styles.filterButtonActive,
                  ]}
                  onPress={() => setTypeFilter('expense')}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      typeFilter === 'expense' && styles.filterButtonTextActive,
                    ]}
                  >
                    Despesas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    typeFilter === 'income' && styles.filterButtonActive,
                  ]}
                  onPress={() => setTypeFilter('income')}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      typeFilter === 'income' && styles.filterButtonTextActive,
                    ]}
                  >
                    Receitas
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.filterLabel}>Categoria</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesRow}
              >
                {categories.map((category) => {
                  const isActive = categoryFilter === category;

                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        isActive && styles.categoryChipActive,
                      ]}
                      onPress={() => setCategoryFilter(category)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isActive && styles.categoryChipTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <Text style={styles.listTitle}>Transações filtradas</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nenhuma transação encontrada para os filtros selecionados.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  listContent: {
    padding: 16,
    paddingBottom: 24,
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
  filtersCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
  },
  filterButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  categoriesRow: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#111827',
  },
  categoryChipText: {
    color: '#111827',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
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