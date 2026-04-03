import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';

import { api } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import type {
  AuthUser,
  MonthlySummary,
  ParseMessageResponse,
  Transaction,
} from '../../types';

type TransactionTypeFilter = 'all' | 'expense' | 'income';

export default function HomeScreen() {
  const { colors } = useAppTheme();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ParseMessageResponse | null>(null);

  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  async function loadData(showInitialLoading = false) {
    try {
      if (showInitialLoading) {
        setLoading(true);
      }

      const [meResponse, summaryResponse, transactionsResponse] =
        await Promise.all([
          api.get<{ user: AuthUser }>('/auth/me'),
          api.get<MonthlySummary>('/summary/monthly'),
          api.get<Transaction[]>('/transactions'),
        ]);

      setUser(meResponse.data.user);
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

      const response = await api.post<ParseMessageResponse>('/messages/parse', {
        message,
      });

      const result = response.data;

      if (result.status === 'created') {
        setMessage('');
        setPendingConfirmation(null);
        await loadData(false);

        Alert.alert('Sucesso', 'Transação registrada com sucesso.');
        return;
      }

      if (result.status === 'needs_confirmation') {
        setPendingConfirmation(result);
        Alert.alert(
          'Confirmação necessária',
          'O Sentinela entendeu sua mensagem, mas quer sua confirmação antes de salvar.'
        );
        return;
      }

      if (result.status === 'unable_to_parse') {
        const ambiguitiesText =
          result.ambiguities.length > 0
            ? `\n\nPontos de atenção:\n- ${result.ambiguities.join('\n- ')}`
            : '';

        Alert.alert(
          'Não foi possível registrar',
          `${result.message}${ambiguitiesText}`
        );
        return;
      }
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

  async function handleConfirmParsedTransaction() {
    if (
      !pendingConfirmation ||
      pendingConfirmation.status !== 'needs_confirmation'
    ) {
      return;
    }

    try {
      setSubmitting(true);

      await api.post('/messages/confirm', {
        parsed: pendingConfirmation.parsed,
      });

      setPendingConfirmation(null);
      setMessage('');
      await loadData(false);

      Alert.alert('Sucesso', 'Transação confirmada e registrada com sucesso.');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível confirmar a transação.';

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

  function goToEditTransaction(id: number) {
    router.push({
      pathname: '/edit/[id]',
      params: { id: String(id) },
    });
  }

  function goToTransactionDetails(id: number) {
    router.push({
      pathname: '/transaction/[id]',
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
        style={[
          styles.transactionCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => goToTransactionDetails(item.id)}
      >
        <View style={styles.transactionHeader}>
          <Text style={[styles.transactionTitle, { color: colors.text }]}>
            {item.description}
          </Text>
          <Text
            style={[
              styles.transactionAmount,
              {
                color:
                  item.type === 'income' ? colors.success : colors.danger,
              },
            ]}
          >
            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
        </View>

        <Text style={[styles.transactionMeta, { color: colors.textMuted }]}>
          Categoria: {item.category}
        </Text>
        <Text style={[styles.transactionMeta, { color: colors.textMuted }]}>
          Data: {new Date(item.transactionAt).toLocaleDateString('pt-BR')}
        </Text>
        <Text style={[styles.transactionMeta, { color: colors.textMuted }]}>
          Pagamento: {item.paymentMethod ?? 'Não informado'}
        </Text>
        <Text style={[styles.transactionMeta, { color: colors.textMuted }]}>
          Conta/Cartão: {item.accountOrCard ?? 'Não informado'}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.editButton,
              { backgroundColor: colors.surfaceSecondary },
            ]}
            onPress={() => goToEditTransaction(item.id)}
          >
            <Text style={[styles.editButtonText, { color: colors.text }]}>
              Editar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: colors.dangerSoft },
            ]}
            onPress={() => confirmDelete(item.id)}
            disabled={deletingId === item.id}
          >
            <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
              {deletingId === item.id ? 'Excluindo...' : 'Excluir'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando dados...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
            <View
              style={[
                styles.userCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.userGreeting, { color: colors.text }]}>
                Olá, {user?.name ?? 'usuário'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                {user?.email ?? 'email não disponível'}
              </Text>
            </View>

            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                Resumo do mês
              </Text>
              <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                Receitas: {formatCurrency(summary?.totalIncomes ?? 0)}
              </Text>
              <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                Despesas: {formatCurrency(summary?.totalExpenses ?? 0)}
              </Text>
              <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                Saldo: {formatCurrency(summary?.balance ?? 0)}
              </Text>
              <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                Transações: {summary?.totalTransactions ?? 0}
              </Text>
            </View>

            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.formTitle, { color: colors.text }]}>
                Registrar por mensagem
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Ex.: Gastei 32,50 com uber"
                placeholderTextColor={colors.textMuted}
                value={message}
                onChangeText={setMessage}
              />
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                  submitting && styles.buttonDisabled,
                ]}
                onPress={handleSubmitMessage}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? 'Enviando...' : 'Registrar'}
                </Text>
              </TouchableOpacity>
            </View>

            {pendingConfirmation?.status === 'needs_confirmation' && (
              <View
                style={[
                  styles.formCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.formTitle, { color: colors.text }]}>
                  Confirmar interpretação
                </Text>

                <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                  Tipo:{' '}
                  {pendingConfirmation.parsed.type === 'expense'
                    ? 'Despesa'
                    : 'Receita'}
                </Text>
                <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                  Valor: {formatCurrency(pendingConfirmation.parsed.amount)}
                </Text>
                <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                  Descrição: {pendingConfirmation.parsed.description}
                </Text>
                <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                  Categoria: {pendingConfirmation.parsed.category}
                </Text>
                <Text style={[styles.summaryItem, { color: colors.textMuted }]}>
                  Data:{' '}
                  {new Date(
                    pendingConfirmation.parsed.transactionAt
                  ).toLocaleDateString('pt-BR')}
                </Text>

                {pendingConfirmation.ambiguities.length > 0 && (
                  <View style={styles.attentionBox}>
                    <Text style={[styles.filterLabel, { color: colors.text }]}>
                      Pontos de atenção
                    </Text>
                    {pendingConfirmation.ambiguities.map((item, index) => (
                      <Text
                        key={`${item}-${index}`}
                        style={[
                          styles.transactionMeta,
                          { color: colors.textMuted },
                        ]}
                      >
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: colors.primary },
                    submitting && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirmParsedTransaction}
                  disabled={submitting}
                >
                  <Text style={styles.buttonText}>
                    {submitting ? 'Confirmando...' : 'Confirmar e salvar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View
              style={[
                styles.filtersCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.filtersTitle, { color: colors.text }]}>
                Filtros
              </Text>

              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Busca
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Buscar por descrição, categoria, pix, nubank..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />

              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Tipo
              </Text>
              <View style={styles.filterRow}>
                {[
                  ['all', 'Todos'],
                  ['expense', 'Despesas'],
                  ['income', 'Receitas'],
                ].map(([value, label]) => {
                  const active = typeFilter === value;

                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.filterButton,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() =>
                        setTypeFilter(value as TransactionTypeFilter)
                      }
                    >
                      <Text
                        style={[
                          styles.filterButtonText,
                          { color: active ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.filterLabel, { color: colors.text }]}>
                Categoria
              </Text>
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
                        {
                          backgroundColor: isActive
                            ? colors.drawerActiveBg
                            : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() => setCategoryFilter(category)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color: isActive
                              ? colors.drawerActiveText
                              : colors.text,
                          },
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <Text style={[styles.listTitle, { color: colors.text }]}>
              Transações filtradas
            </Text>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
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
  listContent: {
    padding: 16,
    paddingBottom: 28,
  },
  userCard: {
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  userGreeting: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryItem: {
    fontSize: 15,
    marginBottom: 6,
  },
  formCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 15,
  },
  button: {
    borderRadius: 14,
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
  attentionBox: {
    marginTop: 10,
    marginBottom: 12,
  },
  filtersCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
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
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterButtonText: {
    fontWeight: '600',
  },
  categoriesRow: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  categoryChipText: {
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  transactionCard: {
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
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
    flex: 1,
    textTransform: 'capitalize',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  transactionMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
});