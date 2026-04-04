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
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';

import { api } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { formatPaymentMethod } from '../../utils/formatters';
import type {
  AuthUser,
  MonthlySummary,
  ParseMessageResponse,
  ParsedTransaction,
  Transaction,
} from '../../types';

type TransactionTypeFilter = 'all' | 'expense' | 'income';

const paymentMethodOptions: Array<{
  label: string;
  value: ParsedTransaction['paymentMethod'];
}> = [
    { label: 'Pix', value: 'pix' },
    { label: 'Crédito', value: 'credit' },
    { label: 'Débito', value: 'debit' },
    { label: 'Dinheiro', value: 'cash' },
  ];

function getMonthRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const formatDate = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

export default function HomeScreen() {
  const { colors } = useAppTheme();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
  const [confirmationForm, setConfirmationForm] =
    useState<ParsedTransaction | null>(null);
  const [confirmationAmount, setConfirmationAmount] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  const period = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);

  async function loadData(showInitialLoading = false) {
    try {
      if (showInitialLoading) {
        setLoading(true);
      }

      const [meResponse, summaryResponse, transactionsResponse] =
        await Promise.all([
          api.get<{ user: AuthUser }>('/auth/me'),
          api.get<MonthlySummary>('/summary/period', {
            params: {
              startDate: period.startDate,
              endDate: period.endDate,
            },
          }),
          api.get<Transaction[]>('/transactions', {
            params: {
              startDate: period.startDate,
              endDate: period.endDate,
            },
          }),
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

  function goToPreviousMonth() {
    setSelectedMonth((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() - 1);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  }

  function goToNextMonth() {
    setSelectedMonth((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + 1);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  }

  function goToCurrentMonth() {
    const now = new Date();
    setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  function resetConfirmationState() {
    setPendingConfirmation(null);
    setConfirmationForm(null);
    setConfirmationAmount('');
    setShowDatePicker(false);
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
        resetConfirmationState();
        await loadData(false);

        Alert.alert('Sucesso', 'Transação registrada com sucesso.');
        return;
      }

      if (result.status === 'ignored_transfer') {
        resetConfirmationState();

        Alert.alert(
          'Transferência detectada',
          `${result.message}\n\nTransferências entre suas próprias contas não entram como receita nem despesa no Sentinela.`
        );
        return;
      }

      if (result.status === 'needs_confirmation') {
        setPendingConfirmation(result);
        setConfirmationForm(result.parsed);
        setConfirmationAmount(String(result.parsed.amount));

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
    if (!confirmationForm) {
      return;
    }

    if (
      !confirmationForm.description.trim() ||
      !confirmationForm.category.trim() ||
      !confirmationAmount.trim()
    ) {
      Alert.alert(
        'Atenção',
        'Preencha descrição, categoria e valor antes de confirmar.'
      );
      return;
    }

    const parsedAmount = Number(
      confirmationAmount.replace(/\./g, '').replace(',', '.')
    );

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido para confirmar.');
      return;
    }

    try {
      setSubmitting(true);

      await api.post('/messages/confirm', {
        parsed: {
          ...confirmationForm,
          amount: parsedAmount,
          description: confirmationForm.description.trim(),
          category: confirmationForm.category.trim(),
          accountOrCard: confirmationForm.accountOrCard?.trim() || null,
        },
      });

      resetConfirmationState();
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

  function updateConfirmationField<K extends keyof ParsedTransaction>(
    field: K,
    value: ParsedTransaction[K]
  ) {
    setConfirmationForm((current) =>
      current
        ? {
          ...current,
          [field]: value,
        }
        : current
    );
  }

  function handleConfirmationDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    setShowDatePicker(false);

    if (event.type !== 'set' || !selectedDate) {
      return;
    }

    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(12, 0, 0, 0);

    updateConfirmationField('transactionAt', normalizedDate.toISOString());
  }

  useEffect(() => {
    loadData(true);
  }, []);

  useEffect(() => {
    loadData(false);
  }, [period.startDate, period.endDate]);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [period.startDate, period.endDate])
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

  const suggestionCategories = useMemo(() => {
    const defaults = [
      'Alimentação',
      'Transporte',
      'Moradia',
      'Saúde',
      'Lazer',
      'Trabalho',
      'Educação',
      'Compras',
      'Outros',
    ];

    const merged = new Set([
      ...defaults,
      ...transactions.map((transaction) => transaction.category),
    ]);

    return Array.from(merged);
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

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim().length > 0 ||
      typeFilter !== 'all' ||
      categoryFilter !== 'Todas'
    );
  }, [search, typeFilter, categoryFilter]);

  const transactionsSectionTitle = hasActiveFilters
    ? 'Transações filtradas'
    : 'Transações';

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
          Pagamento: {formatPaymentMethod(item.paymentMethod)}
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
                styles.periodCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.periodTitle, { color: colors.text }]}>
                Período selecionado
              </Text>

              <View style={styles.periodControls}>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                  onPress={goToPreviousMonth}
                >
                  <Text style={[styles.periodButtonText, { color: colors.text }]}>
                    {'<'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.periodLabelContainer}>
                  <Text style={[styles.periodLabel, { color: colors.text }]}>
                    {formatMonthYear(selectedMonth)}
                  </Text>
                  <Text
                    style={[styles.periodDates, { color: colors.textMuted }]}
                  >
                    {period.startDate} até {period.endDate}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                  onPress={goToNextMonth}
                >
                  <Text style={[styles.periodButtonText, { color: colors.text }]}>
                    {'>'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.currentMonthButton,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={goToCurrentMonth}
              >
                <Text
                  style={[styles.currentMonthButtonText, { color: colors.text }]}
                >
                  Ir para o mês atual
                </Text>
              </TouchableOpacity>
            </View>

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
                Resumo do período
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

            {pendingConfirmation?.status === 'needs_confirmation' &&
              confirmationForm && (
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
                    Revisar antes de salvar
                  </Text>

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Tipo
                  </Text>
                  <View style={styles.segmentRow}>
                    <TouchableOpacity
                      style={[
                        styles.segmentButton,
                        {
                          backgroundColor:
                            confirmationForm.type === 'expense'
                              ? colors.primary
                              : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() => updateConfirmationField('type', 'expense')}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          {
                            color:
                              confirmationForm.type === 'expense'
                                ? '#FFFFFF'
                                : colors.text,
                          },
                        ]}
                      >
                        Despesa
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.segmentButton,
                        {
                          backgroundColor:
                            confirmationForm.type === 'income'
                              ? colors.primary
                              : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() => updateConfirmationField('type', 'income')}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          {
                            color:
                              confirmationForm.type === 'income'
                                ? '#FFFFFF'
                                : colors.text,
                          },
                        ]}
                      >
                        Receita
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Valor
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
                    placeholder="Valor"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={confirmationAmount}
                    onChangeText={setConfirmationAmount}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Descrição
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
                    placeholder="Descrição"
                    placeholderTextColor={colors.textMuted}
                    value={confirmationForm.description}
                    onChangeText={(value) =>
                      updateConfirmationField('description', value)
                    }
                  />

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Categoria
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
                    placeholder="Categoria"
                    placeholderTextColor={colors.textMuted}
                    value={confirmationForm.category}
                    onChangeText={(value) =>
                      updateConfirmationField('category', value)
                    }
                  />

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesRow}
                  >
                    {suggestionCategories.map((category) => {
                      const active = confirmationForm.category === category;

                      return (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: active
                                ? colors.drawerActiveBg
                                : colors.surfaceSecondary,
                            },
                          ]}
                          onPress={() =>
                            updateConfirmationField('category', category)
                          }
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              {
                                color: active
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

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Data
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.inputButton,
                      {
                        backgroundColor: colors.inputBackground,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: colors.text }}>
                      {new Date(
                        confirmationForm.transactionAt
                      ).toLocaleDateString('pt-BR')}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(confirmationForm.transactionAt)}
                      mode="date"
                      display="default"
                      onChange={handleConfirmationDateChange}
                    />
                  )}

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Forma de pagamento
                  </Text>
                  <View style={styles.segmentRowWrap}>
                    {paymentMethodOptions.map((option) => {
                      const active =
                        confirmationForm.paymentMethod === option.value;

                      return (
                        <TouchableOpacity
                          key={option.label}
                          style={[
                            styles.pillButton,
                            {
                              backgroundColor: active
                                ? colors.primary
                                : colors.surfaceSecondary,
                            },
                          ]}
                          onPress={() =>
                            updateConfirmationField('paymentMethod', option.value)
                          }
                        >
                          <Text
                            style={[
                              styles.pillButtonText,
                              {
                                color: active ? '#FFFFFF' : colors.text,
                              },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      style={[
                        styles.pillButton,
                        {
                          backgroundColor:
                            confirmationForm.paymentMethod === null
                              ? colors.primary
                              : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() =>
                        updateConfirmationField('paymentMethod', null)
                      }
                    >
                      <Text
                        style={[
                          styles.pillButtonText,
                          {
                            color:
                              confirmationForm.paymentMethod === null
                                ? '#FFFFFF'
                                : colors.text,
                          },
                        ]}
                      >
                        Não informado
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Conta/Cartão
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
                    placeholder="Conta ou cartão"
                    placeholderTextColor={colors.textMuted}
                    value={confirmationForm.accountOrCard ?? ''}
                    onChangeText={(value) =>
                      updateConfirmationField('accountOrCard', value)
                    }
                  />

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

                  <View style={styles.confirmationActions}>
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        {
                          backgroundColor: colors.surfaceSecondary,
                        },
                      ]}
                      onPress={resetConfirmationState}
                      disabled={submitting}
                    >
                      <Text
                        style={[
                          styles.secondaryButtonText,
                          { color: colors.text },
                        ]}
                      >
                        Cancelar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.confirmPrimaryButton,
                        { backgroundColor: colors.primary },
                        submitting && styles.buttonDisabled,
                      ]}
                      onPress={handleConfirmParsedTransaction}
                      disabled={submitting}
                    >
                      <Text style={styles.buttonText}>
                        {submitting ? 'Confirmando...' : 'Salvar ajustado'}
                      </Text>
                    </TouchableOpacity>
                  </View>
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
              {transactionsSectionTitle}
            </Text>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhuma transação encontrada para o período e filtros selecionados.
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
  periodCard: {
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  periodControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  periodLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  periodDates: {
    fontSize: 12,
    marginTop: 2,
  },
  currentMonthButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  currentMonthButtonText: {
    fontWeight: '700',
  },
  userCard: {
    padding: 16,
    borderRadius: 18,
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 15,
  },
  inputButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmPrimaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
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
  confirmationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  segmentRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonText: {
    fontWeight: '700',
  },
  pillButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillButtonText: {
    fontWeight: '600',
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