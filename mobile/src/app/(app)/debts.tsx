import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';

import { api } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { formatCurrencyBRL, formatDateBR } from '../../utils/formatters';
import type { Debt } from '../../types';

type DebtType = 'to_receive' | 'to_pay';
type DebtStatus = 'pending' | 'received' | 'paid';
type DebtTypeFilter = 'all' | DebtType;
type DebtStatusFilter = 'all' | 'pending' | 'resolved';

type DebtMessageFeedback =
  | {
      status: 'needs_confirmation';
      message: string;
      ambiguities: string[];
      originalMessage: string;
    }
  | {
      status: 'not_found';
      message: string;
      originalMessage: string;
    }
  | {
      status: 'unable_to_parse';
      message: string;
      originalMessage: string;
    }
  | null;

const quickExamples = [
  'João me deve 80 do almoço',
  'Devo 200 a mainha',
  'João já pagou',
  'Paguei Maria',
];

export default function DebtsScreen() {
  const { colors } = useAppTheme();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DebtTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<DebtStatusFilter>('all');

  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<DebtType>('to_receive');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const [messageFeedback, setMessageFeedback] =
    useState<DebtMessageFeedback>(null);

  async function loadDebts(showInitialLoading = false) {
    try {
      if (showInitialLoading) {
        setLoading(true);
      }

      const response = await api.get<Debt[]>('/debts');
      setDebts(response.data);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar a caderneta.';

      Alert.alert('Erro', apiMessage);
    } finally {
      if (showInitialLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadDebts(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDebts(false);
    }, [])
  );

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadDebts(false);
    } finally {
      setRefreshing(false);
    }
  }

  function resetForm() {
    setPersonName('');
    setType('to_receive');
    setAmount('');
    setDescription('');
    setDueDate(null);
    setShowDueDatePicker(false);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    resetForm();
  }

  function resetMessageFeedback() {
    setMessageFeedback(null);
  }

  async function handleCreateDebt() {
    if (!personName.trim() || !description.trim() || !amount.trim()) {
      Alert.alert(
        'Atenção',
        'Preencha nome, descrição e valor antes de salvar.'
      );
      return;
    }

    const parsedAmount = Number(amount.replace(/\./g, '').replace(',', '.'));

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }

    try {
      setSaving(true);

      await api.post('/debts', {
        personName: personName.trim(),
        type,
        amount: parsedAmount,
        description: description.trim(),
        status: 'pending',
        dueDate: dueDate ? dueDate.toISOString() : null,
      });

      closeCreateModal();
      Keyboard.dismiss();
      await loadDebts(false);

      Alert.alert('Sucesso', 'Dívida adicionada com sucesso.');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível criar a dívida.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleMessageAction() {
    if (!message.trim()) {
      Alert.alert('Atenção', 'Digite uma mensagem.');
      return;
    }

    try {
      setSubmittingMessage(true);
      resetMessageFeedback();

      const trimmedMessage = message.trim();

      const response = await api.post('/debts/message', {
        message: trimmedMessage,
      });

      const result = response.data;

      if (result?.status === 'created') {
        setMessage('');
        Keyboard.dismiss();
        await loadDebts(false);

        Alert.alert(
          'Sucesso',
          result?.message ?? 'Dívida registrada com sucesso.'
        );
        return;
      }

      if (result?.status === 'settled') {
        setMessage('');
        Keyboard.dismiss();
        await loadDebts(false);

        Alert.alert(
          'Sucesso',
          result?.message ?? 'Baixa realizada com sucesso.'
        );
        return;
      }

      if (result?.status === 'needs_confirmation') {
        setMessageFeedback({
          status: 'needs_confirmation',
          message: result?.message ?? 'A mensagem ficou ambígua.',
          ambiguities: Array.isArray(result?.ambiguities)
            ? result.ambiguities
            : [],
          originalMessage: trimmedMessage,
        });
        return;
      }

      if (result?.status === 'not_found') {
        setMessageFeedback({
          status: 'not_found',
          message:
            result?.message ??
            'Nenhuma dívida compatível foi encontrada para essa mensagem.',
          originalMessage: trimmedMessage,
        });
        return;
      }

      if (result?.status === 'unable_to_parse') {
        setMessageFeedback({
          status: 'unable_to_parse',
          message:
            result?.message ?? 'Não foi possível interpretar a mensagem.',
          originalMessage: trimmedMessage,
        });
        return;
      }

      Alert.alert('Atenção', 'Resposta inesperada ao processar a mensagem.');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível processar a mensagem da dívida.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setSubmittingMessage(false);
    }
  }

  async function handleUpdateDebtStatus(debt: Debt) {
    const nextStatus: DebtStatus =
      debt.type === 'to_receive' ? 'received' : 'paid';

    try {
      setUpdatingStatusId(debt.id);

      await api.patch(`/debts/${debt.id}/status`, {
        status: nextStatus,
      });

      await loadDebts(false);

      Alert.alert(
        'Sucesso',
        debt.type === 'to_receive'
          ? 'Dívida marcada como recebida.'
          : 'Dívida marcada como paga.'
      );
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível atualizar o status da dívida.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleDeleteDebt(id: number) {
    try {
      setDeletingId(id);

      await api.delete(`/debts/${id}`);
      await loadDebts(false);

      Alert.alert('Sucesso', 'Dívida removida com sucesso.');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível remover a dívida.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDeleteDebt(id: number) {
    Alert.alert(
      'Excluir dívida',
      'Tem certeza que deseja excluir esta dívida?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => handleDeleteDebt(id),
        },
      ]
    );
  }

  function handleDueDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    setShowDueDatePicker(false);

    if (event.type !== 'set' || !selectedDate) {
      return;
    }

    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(12, 0, 0, 0);

    setDueDate(normalizedDate);
  }

  function goToEditDebt(id: number) {
    router.push({
      pathname: '/debt-edit/[id]',
      params: { id: String(id) },
    });
  }

  function goToDebtDetails(id: number) {
    router.push({
      pathname: '/debt/[id]',
      params: { id: String(id) },
    });
  }

  function formatCurrency(value: number) {
    return formatCurrencyBRL(value);
  }

  function getDebtTypeLabel(value: DebtType) {
    return value === 'to_receive' ? 'A receber' : 'A pagar';
  }

  function getDebtStatusLabel(value: DebtStatus) {
    switch (value) {
      case 'pending':
        return 'Pendente';
      case 'received':
        return 'Recebido';
      case 'paid':
        return 'Pago';
      default:
        return value;
    }
  }

  function applyQuickExample(example: string) {
    setMessage(example);
    resetMessageFeedback();
  }

  function getFeedbackConfig() {
    if (!messageFeedback) return null;

    if (messageFeedback.status === 'needs_confirmation') {
      return {
        title: 'Preciso de mais clareza',
        subtitle:
          'Entendi parte da mensagem, mas ainda preciso que você ajuste ou deixe a frase mais específica.',
        tone: colors.danger,
        bg: colors.dangerSoft,
      };
    }

    if (messageFeedback.status === 'not_found') {
      return {
        title: 'Nada encontrado',
        subtitle:
          'Não encontrei uma dívida pendente compatível com a frase enviada.',
        tone: colors.primary,
        bg: colors.surfaceSecondary,
      };
    }

    return {
      title: 'Não consegui interpretar',
      subtitle:
        'A mensagem ficou genérica demais. Reescreva de forma mais direta.',
      tone: colors.danger,
      bg: colors.dangerSoft,
    };
  }

  const feedbackConfig = useMemo(
    () => getFeedbackConfig(),
    [messageFeedback, colors]
  );

  const totalToReceive = useMemo(
    () =>
      debts
        .filter(
          (debt) => debt.type === 'to_receive' && debt.status === 'pending'
        )
        .reduce((sum, debt) => sum + debt.amount, 0),
    [debts]
  );

  const totalToPay = useMemo(
    () =>
      debts
        .filter((debt) => debt.type === 'to_pay' && debt.status === 'pending')
        .reduce((sum, debt) => sum + debt.amount, 0),
    [debts]
  );

  const filteredDebts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return debts.filter((debt) => {
      const matchesType =
        typeFilter === 'all' ? true : debt.type === typeFilter;

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
          ? debt.status === 'pending'
          : debt.status !== 'pending';

      const searchableText = `${debt.personName} ${debt.description}`.toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : searchableText.includes(normalizedSearch);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [debts, search, typeFilter, statusFilter]);

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim().length > 0 ||
      typeFilter !== 'all' ||
      statusFilter !== 'all'
    );
  }, [search, typeFilter, statusFilter]);

  const listTitle = hasActiveFilters ? 'Dívidas filtradas' : 'Dívidas';

  function renderDebtCard(item: Debt) {
    const isReceive = item.type === 'to_receive';
    const isPending = item.status === 'pending';

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.9}
        style={[
          styles.debtCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => goToDebtDetails(item.id)}
      >
        <View style={styles.debtHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.personName, { color: colors.text }]}>
              {item.personName}
            </Text>
            <Text style={[styles.debtDescription, { color: colors.textMuted }]}>
              {item.description}
            </Text>
          </View>

          <Text
            style={[
              styles.debtAmount,
              { color: isReceive ? colors.success : colors.danger },
            ]}
          >
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <Text style={[styles.debtMeta, { color: colors.textMuted }]}>
          Tipo: {getDebtTypeLabel(item.type)}
        </Text>
        <Text style={[styles.debtMeta, { color: colors.textMuted }]}>
          Status: {getDebtStatusLabel(item.status)}
        </Text>
        <Text style={[styles.debtMeta, { color: colors.textMuted }]}>
          Vencimento:{' '}
          {item.dueDate ? formatDateBR(item.dueDate) : 'Não informado'}
        </Text>
        <Text style={[styles.debtHint, { color: colors.textMuted }]}>
          Toque para ver mais detalhes
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.editButton,
              { backgroundColor: colors.surfaceSecondary },
            ]}
            onPress={() => goToEditDebt(item.id)}
          >
            <Text style={[styles.editButtonText, { color: colors.text }]}>
              Editar
            </Text>
          </TouchableOpacity>

          {isPending && (
            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => handleUpdateDebtStatus(item)}
              disabled={updatingStatusId === item.id}
            >
              <Text style={styles.primaryActionButtonText}>
                {updatingStatusId === item.id
                  ? 'Atualizando...'
                  : isReceive
                  ? 'Recebido'
                  : 'Pago'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: colors.dangerSoft },
            ]}
            onPress={() => confirmDeleteDebt(item.id)}
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
          Carregando caderneta...
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
          data={filteredDebts}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              <View
                style={[
                  styles.headerCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.title, { color: colors.text }]}>
                  Caderneta
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Acompanhe quem te deve e quem você precisa pagar.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.createButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createButtonText}>Adicionar dívida</Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.messageCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.messageTitle, { color: colors.text }]}>
                  Mensagem inteligente
                </Text>
                <Text
                  style={[styles.messageSubtitle, { color: colors.textMuted }]}
                >
                  Exemplos: "João me deve 80 do almoço", "Devo 200 a mainha" ou
                  "João já pagou"
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.examplesRow}
                >
                  {quickExamples.map((example) => (
                    <TouchableOpacity
                      key={example}
                      style={[
                        styles.exampleChip,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => applyQuickExample(example)}
                    >
                      <Text
                        style={[styles.exampleChipText, { color: colors.text }]}
                      >
                        {example}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: messageFeedback ? colors.danger : colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Digite a mensagem da dívida"
                  placeholderTextColor={colors.textMuted}
                  value={message}
                  onChangeText={(value) => {
                    setMessage(value);
                    if (messageFeedback) {
                      resetMessageFeedback();
                    }
                  }}
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButtonInline,
                    { backgroundColor: colors.primary },
                    submittingMessage && styles.buttonDisabled,
                  ]}
                  onPress={handleMessageAction}
                  disabled={submittingMessage}
                >
                  <Text style={styles.primaryButtonText}>
                    {submittingMessage ? 'Processando...' : 'Enviar mensagem'}
                  </Text>
                </TouchableOpacity>
              </View>

              {messageFeedback && feedbackConfig && (
                <View
                  style={[
                    styles.feedbackCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.feedbackHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.feedbackTitle, { color: colors.text }]}>
                        {feedbackConfig.title}
                      </Text>
                      <Text
                        style={[
                          styles.feedbackSubtitle,
                          { color: colors.textMuted },
                        ]}
                      >
                        {feedbackConfig.subtitle}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.feedbackBadge,
                        { backgroundColor: feedbackConfig.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.feedbackBadgeText,
                          { color: feedbackConfig.tone },
                        ]}
                      >
                        Revisar
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.feedbackPreviewCard,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.feedbackPreviewLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      Mensagem enviada
                    </Text>
                    <Text
                      style={[
                        styles.feedbackPreviewValue,
                        { color: colors.text },
                      ]}
                    >
                      {messageFeedback.originalMessage}
                    </Text>
                  </View>

                  <Text style={[styles.feedbackMainMessage, { color: colors.text }]}>
                    {messageFeedback.message}
                  </Text>

                  {messageFeedback.status === 'needs_confirmation' &&
                    messageFeedback.ambiguities.length > 0 && (
                      <View style={styles.feedbackAttentionBox}>
                        <Text
                          style={[
                            styles.feedbackAttentionTitle,
                            { color: colors.text },
                          ]}
                        >
                          Pontos de atenção
                        </Text>

                        <View style={styles.feedbackChipsWrap}>
                          {messageFeedback.ambiguities.map((item, index) => (
                            <View
                              key={`${item}-${index}`}
                              style={[
                                styles.feedbackChip,
                                {
                                  backgroundColor: colors.dangerSoft,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.feedbackChipText,
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

                  <View
                    style={[
                      styles.rewriteHintCard,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.rewriteHintTitle, { color: colors.text }]}
                    >
                      Tente reescrever assim
                    </Text>
                    <Text
                      style={[
                        styles.rewriteHintText,
                        { color: colors.textMuted },
                      ]}
                    >
                      • "João me deve 80 do almoço"{'\n'}
                      • "Paguei Maria"{'\n'}
                      • "Devo 120 a Pedro do ingresso"
                    </Text>
                  </View>

                  <View style={styles.feedbackActions}>
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                      onPress={() => {
                        resetMessageFeedback();
                        setMessage('');
                        Keyboard.dismiss();
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
                        resetMessageFeedback();
                      }}
                    >
                      <Text style={styles.primaryButtonText}>
                        Ajustar mensagem
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.summaryGrid}>
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.summaryLabel, { color: colors.textMuted }]}
                  >
                    A receber
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {formatCurrency(totalToReceive)}
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
                  <Text
                    style={[styles.summaryLabel, { color: colors.textMuted }]}
                  >
                    A pagar
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.danger }]}>
                    {formatCurrency(totalToPay)}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.filtersBar,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.filtersButton,
                    { backgroundColor: colors.surfaceSecondary },
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
                      setStatusFilter('all');
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

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {listTitle}
              </Text>
            </>
          }
          renderItem={({ item }) => renderDebtCard(item)}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhuma dívida encontrada para os filtros atuais.
            </Text>
          }
        />
      </KeyboardAvoidingView>

      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Buscar por pessoa ou descrição"
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Tipo
              </Text>
              <View style={styles.filterRow}>
                {[
                  ['all', 'Todos'],
                  ['to_receive', 'A receber'],
                  ['to_pay', 'A pagar'],
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
                            : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() => setTypeFilter(value as DebtTypeFilter)}
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
                Status
              </Text>
              <View style={styles.filterRow}>
                {[
                  ['all', 'Todos'],
                  ['pending', 'Pendentes'],
                  ['resolved', 'Resolvidas'],
                ].map(([value, label]) => {
                  const active = statusFilter === value;

                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.surfaceSecondary,
                        },
                      ]}
                      onPress={() => setStatusFilter(value as DebtStatusFilter)}
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

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                  onPress={() => {
                    setSearch('');
                    setTypeFilter('all');
                    setStatusFilter('all');
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

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Nova dívida
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Nome da pessoa
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
                placeholder="Ex.: João"
                placeholderTextColor={colors.textMuted}
                value={personName}
                onChangeText={setPersonName}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Tipo
              </Text>
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor:
                        type === 'to_receive'
                          ? colors.primary
                          : colors.surfaceSecondary,
                    },
                  ]}
                  onPress={() => setType('to_receive')}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color: type === 'to_receive' ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    A receber
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor:
                        type === 'to_pay'
                          ? colors.primary
                          : colors.surfaceSecondary,
                    },
                  ]}
                  onPress={() => setType('to_pay')}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      {
                        color: type === 'to_pay' ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    A pagar
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
                placeholder="Ex.: 80,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
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
                placeholder="Ex.: Almoço que paguei"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Vencimento
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputButton,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowDueDatePicker(true)}
              >
                <Text style={{ color: colors.text }}>
                  {dueDate
                    ? formatDateBR(dueDate)
                    : 'Selecionar data (opcional)'}
                </Text>
              </TouchableOpacity>

              {showDueDatePicker && (
                <DateTimePicker
                  value={dueDate ?? new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDueDateChange}
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                  onPress={closeCreateModal}
                  disabled={saving}
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
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    saving && styles.buttonDisabled,
                  ]}
                  onPress={handleCreateDebt}
                  disabled={saving}
                >
                  <Text style={styles.primaryButtonText}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Text>
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
  headerCard: {
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 14,
  },
  createButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  messageCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  messageSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  examplesRow: {
    gap: 8,
    paddingBottom: 10,
  },
  exampleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  exampleChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButtonInline: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  feedbackCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedbackSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feedbackBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackPreviewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  feedbackPreviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  feedbackPreviewValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  feedbackMainMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  feedbackAttentionBox: {
    marginBottom: 14,
  },
  feedbackAttentionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  feedbackChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  feedbackChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feedbackChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rewriteHintCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  rewriteHintTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  rewriteHintText: {
    fontSize: 13,
    lineHeight: 20,
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  filtersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  filtersButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  clearFiltersButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearFiltersButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipText: {
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  debtCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  debtHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  personName: {
    fontSize: 17,
    fontWeight: '700',
  },
  debtDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  debtMeta: {
    fontSize: 13,
    marginBottom: 4,
  },
  debtHint: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 16,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
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
  segmentRow: {
    flexDirection: 'row',
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
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
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
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});