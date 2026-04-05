import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {
  FontSize,
  FontWeight,
  Radius,
  Spacing,
} from '../../constants/appTheme';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatMonthYearShort,
  formatPaymentMethod,
  getFirstName,
} from '../../utils/formatters';
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
  return formatMonthYearShort(date);
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
  const [showFiltersModal, setShowFiltersModal] = useState(false);

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

      const trimmedMessage = message.trim();

      const response = await api.post<ParseMessageResponse>('/messages/parse', {
        message: trimmedMessage,
      });

      setMessage('');
      Keyboard.dismiss();

      const result = response.data;

      if (result.status === 'created') {
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
      console.error('Erro em handleSubmitMessage:', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        data: error?.response?.data,
        request: error?.request,
      });

      const apiMessage =
        error?.response?.data?.message ??
        error?.message ??
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
      Keyboard.dismiss();
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
    return formatCurrencyBRL(value);
  }

  function getConfidenceLevel(confidence?: number) {
    if (confidence === undefined || confidence === null) {
      return {
        label: 'Sem nível informado',
        tone: colors.textMuted,
        bg: colors.surfaceSecondary,
      };
    }

    if (confidence >= 0.8) {
      return {
        label: 'Alta confiança',
        tone: colors.success,
        bg: colors.successSoft,
      };
    }

    if (confidence >= 0.6) {
      return {
        label: 'Confiança moderada',
        tone: colors.primary,
        bg: colors.primarySoft,
      };
    }

    return {
      label: 'Baixa confiança',
      tone: colors.danger,
      bg: colors.dangerSoft,
    };
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

  const confidenceInfo = useMemo(() => {
    if (!confirmationForm) return null;
    return getConfidenceLevel(confirmationForm.confidence);
  }, [confirmationForm, colors]);

  const confirmationSummary = useMemo(() => {
    if (!confirmationForm) return null;

    const typeLabel =
      confirmationForm.type === 'income' ? 'Receita' : 'Despesa';

    return `${typeLabel} de ${formatCurrency(
      Number(confirmationAmount.replace(/\./g, '').replace(',', '.')) || 0
    )} em ${confirmationForm.category || 'categoria não definida'}`;
  }, [confirmationForm, confirmationAmount]);

  function renderTransaction({ item }: { item: Transaction }) {
    return (
      <TouchableOpacity
        style={[
          styles.transactionCard,
          {
            backgroundColor: colors.card,
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
          Data: {formatDateBR(item.transactionAt)}
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
              { backgroundColor: colors.cardMuted },
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
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTransaction}
          keyboardShouldPersistTaps="handled"
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
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.userGreeting, { color: colors.text }]}>
                  Olá, {getFirstName(user?.name)}
                </Text>
                <Text style={[styles.userSubtext, { color: colors.textMuted }]}>
                  Vamos organizar seu mês.
                </Text>
              </View>

              <View
                style={[
                  styles.periodCard,
                  {
                    backgroundColor: colors.card,
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
                      { backgroundColor: colors.cardMuted },
                    ]}
                    onPress={goToPreviousMonth}
                  >
                    <Text
                      style={[styles.periodButtonText, { color: colors.text }]}
                    >
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
                      {formatDateBR(period.startDate)} até{' '}
                      {formatDateBR(period.endDate)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.periodButton,
                      { backgroundColor: colors.cardMuted },
                    ]}
                    onPress={goToNextMonth}
                  >
                    <Text
                      style={[styles.periodButtonText, { color: colors.text }]}
                    >
                      {'>'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.currentMonthButton,
                    { backgroundColor: colors.cardMuted },
                  ]}
                  onPress={goToCurrentMonth}
                >
                  <Text
                    style={[
                      styles.currentMonthButtonText,
                      { color: colors.text },
                    ]}
                  >
                    Ir para o mês atual
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  Resumo do período
                </Text>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryMetric}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      Receitas
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.success }]}>
                      {formatCurrency(summary?.totalIncomes ?? 0)}
                    </Text>
                  </View>

                  <View style={styles.summaryMetric}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      Despesas
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.danger }]}>
                      {formatCurrency(summary?.totalExpenses ?? 0)}
                    </Text>
                  </View>

                  <View style={styles.summaryMetric}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      Saldo
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {formatCurrency(summary?.balance ?? 0)}
                    </Text>
                  </View>

                  <View style={styles.summaryMetric}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      Transações
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {summary?.totalTransactions ?? 0}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.formCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.formTitle, { color: colors.text }]}>
                  Registrar por mensagem
                </Text>
                <Text style={[styles.formSubtitle, { color: colors.textMuted }]}>
                  Ex.: Gastei 32,50 com uber
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Digite sua mensagem"
                  placeholderTextColor={colors.inputPlaceholder}
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
                      styles.confirmationCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.confirmationHeader}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.confirmationTitle, { color: colors.text }]}
                        >
                          Revise antes de salvar
                        </Text>
                        <Text
                          style={[
                            styles.confirmationSubtitle,
                            { color: colors.textMuted },
                          ]}
                        >
                          O Sentinela entendeu sua mensagem, mas quer sua
                          confirmação antes de registrar.
                        </Text>
                      </View>

                      {confidenceInfo && (
                        <View
                          style={[
                            styles.confidenceBadge,
                            { backgroundColor: confidenceInfo.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.confidenceBadgeText,
                              { color: confidenceInfo.tone },
                            ]}
                          >
                            {confidenceInfo.label}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View
                      style={[
                        styles.summaryPreviewCard,
                        {
                          backgroundColor: colors.cardMuted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.summaryPreviewLabel,
                          { color: colors.textMuted },
                        ]}
                      >
                        Resumo entendido
                      </Text>
                      <Text
                        style={[
                          styles.summaryPreviewValue,
                          { color: colors.text },
                        ]}
                      >
                        {confirmationSummary}
                      </Text>
                    </View>

                    {pendingConfirmation.ambiguities.length > 0 && (
                      <View style={styles.attentionBox}>
                        <Text
                          style={[styles.attentionTitle, { color: colors.text }]}
                        >
                          Pontos de atenção
                        </Text>

                        <View style={styles.ambiguitiesWrap}>
                          {pendingConfirmation.ambiguities.map((item, index) => (
                            <View
                              key={`${item}-${index}`}
                              style={[
                                styles.ambiguityChip,
                                {
                                  backgroundColor: colors.dangerSoft,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.ambiguityChipText,
                                  { color: colors.danger },
                                ]}
                              >
                                {item}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Ajustes
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
                                : colors.cardMuted,
                          },
                        ]}
                        onPress={() =>
                          updateConfirmationField('type', 'expense')
                        }
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
                                : colors.cardMuted,
                          },
                        ]}
                        onPress={() =>
                          updateConfirmationField('type', 'income')
                        }
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
                        styles.highlightInput,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Valor"
                      placeholderTextColor={colors.inputPlaceholder}
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
                          borderColor:
                            confirmationForm.description === 'Pagamento' ||
                            confirmationForm.description === 'Recebimento' ||
                            confirmationForm.description === 'Pagamento via Pix' ||
                            confirmationForm.description === 'Recebimento via Pix'
                              ? colors.danger
                              : colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Descrição"
                      placeholderTextColor={colors.inputPlaceholder}
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
                          borderColor:
                            confirmationForm.category === 'Outros'
                              ? colors.danger
                              : colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Categoria"
                      placeholderTextColor={colors.inputPlaceholder}
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
                                  : colors.cardMuted,
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
                          borderColor: colors.inputBorder,
                        },
                      ]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={{ color: colors.text }}>
                        {formatDateBR(confirmationForm.transactionAt)}
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
                                  : colors.cardMuted,
                              },
                            ]}
                            onPress={() =>
                              updateConfirmationField(
                                'paymentMethod',
                                option.value
                              )
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
                                : colors.cardMuted,
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
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Conta ou cartão"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={confirmationForm.accountOrCard ?? ''}
                      onChangeText={(value) =>
                        updateConfirmationField('accountOrCard', value)
                      }
                    />

                    <View style={styles.confirmationActions}>
                      <TouchableOpacity
                        style={[
                          styles.secondaryButton,
                          {
                            backgroundColor: colors.cardMuted,
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
                  styles.filtersBar,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.filtersButton,
                    { backgroundColor: colors.cardMuted },
                  ]}
                  onPress={() => setShowFiltersModal(true)}
                >
                  <Text
                    style={[styles.filtersButtonText, { color: colors.text }]}
                  >
                    Filtros
                  </Text>
                </TouchableOpacity>

                {hasActiveFilters && (
                  <TouchableOpacity
                    style={[
                      styles.clearFiltersButton,
                      { backgroundColor: colors.dangerSoft },
                    ]}
                    onPress={() => {
                      setSearch('');
                      setTypeFilter('all');
                      setCategoryFilter('Todas');
                    }}
                  >
                    <Text
                      style={[
                        styles.clearFiltersButtonText,
                        { color: colors.danger },
                      ]}
                    >
                      Limpar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.listTitle, { color: colors.text }]}>
                {transactionsSectionTitle}
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhuma transação encontrada
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Tente ajustar os filtros ou registre uma movimentação por
                mensagem.
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>

      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Filtros
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Busca
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Buscar por descrição, categoria, pix, nubank..."
                placeholderTextColor={colors.inputPlaceholder}
                value={search}
                onChangeText={setSearch}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
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
                        styles.filterChip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.cardMuted,
                        },
                      ]}
                      onPress={() =>
                        setTypeFilter(value as TransactionTypeFilter)
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: active ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Categoria
              </Text>
              <View style={styles.filterRow}>
                {categories.map((category) => {
                  const active = categoryFilter === category;

                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.cardMuted,
                        },
                      ]}
                      onPress={() => setCategoryFilter(category)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: active ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.cardMuted },
                  ]}
                  onPress={() => {
                    setSearch('');
                    setTypeFilter('all');
                    setCategoryFilter('Todas');
                  }}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.text },
                    ]}
                  >
                    Limpar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowFiltersModal(false);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.lg,
    fontSize: FontSize.lg,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  userCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  userGreeting: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  userSubtext: {
    marginTop: Spacing.xs,
    fontSize: FontSize.md,
  },
  periodCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  periodTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  periodControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  periodButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  periodLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  periodDates: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  currentMonthButton: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  currentMonthButtonText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  summaryGrid: {
    gap: Spacing.md,
  },
  summaryMetric: {
    gap: Spacing.xs,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  formCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  confirmationCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  confirmationHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  confirmationTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  confirmationSubtitle: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  confidenceBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confidenceBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  summaryPreviewCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryPreviewLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  summaryPreviewValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    lineHeight: 22,
  },
  attentionBox: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  attentionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  ambiguitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  ambiguityChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ambiguityChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: Spacing.md,
    fontSize: FontSize.md,
  },
  highlightInput: {
    borderWidth: 1.5,
  },
  inputButton: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: Spacing.md,
  },
  button: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmPrimaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
  primaryButton: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  segmentRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  segmentButton: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  pillButton: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillButtonText: {
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
  },
  filtersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  filtersButton: {
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersButtonText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  clearFiltersButton: {
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearFiltersButtonText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipText: {
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
  },
  categoriesRow: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  categoryChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: Spacing.sm,
  },
  categoryChipText: {
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
  },
  listTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  transactionCard: {
    padding: 15,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  transactionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    flex: 1,
    textTransform: 'capitalize',
  },
  transactionAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  transactionMeta: {
    fontSize: FontSize.sm,
    marginBottom: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  editButtonText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderWidth: 1,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});