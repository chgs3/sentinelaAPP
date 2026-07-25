import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../services/api';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { formatCurrencyBRL, formatDateBR } from '../../../utils/formatters';
import type { Debt } from '../../../types';

type DebtType = 'to_receive' | 'to_pay';
type DebtStatus = 'pending' | 'received' | 'paid';

export default function DebtDetailsScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDebt = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get<Debt[]>('/debts');
      const found = response.data.find((item) => item.id === Number(id));

      if (!found) {
        Alert.alert('Erro', 'Dívida não encontrada.', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
        return;
      }

      setDebt(found);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar os detalhes da dívida.';

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

  useEffect(() => {
    loadDebt();
  }, [loadDebt]);

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

  const debtTone = useMemo(() => {
    if (!debt) return colors.text;
    return debt.type === 'to_receive' ? colors.success : colors.danger;
  }, [debt, colors]);

  const statusTone = useMemo(() => {
    if (!debt) {
      return {
        text: colors.text,
        bg: colors.surfaceSecondary,
      };
    }

    switch (debt.status) {
      case 'received':
        return {
          text: colors.success,
          bg: colors.primarySoft,
        };
      case 'paid':
        return {
          text: colors.primary,
          bg: colors.primarySoft,
        };
      default:
        return {
          text: colors.text,
          bg: colors.surfaceSecondary,
        };
    }
  }, [debt, colors]);

  function goToEditDebt() {
    if (!debt) return;

    router.push({
      pathname: '/debt-edit/[id]',
      params: { id: String(debt.id) },
    });
  }

  async function handleUpdateStatus() {
    if (!debt || debt.status !== 'pending') return;

    const nextStatus: DebtStatus =
      debt.type === 'to_receive' ? 'received' : 'paid';

    try {
      setUpdatingStatus(true);

      await api.patch(`/debts/${debt.id}/status`, {
        status: nextStatus,
      });

      Alert.alert(
        'Sucesso',
        debt.type === 'to_receive'
          ? 'Dívida marcada como recebida.'
          : 'Dívida marcada como paga.'
      );

      await loadDebt();
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível atualizar o status da dívida.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function confirmDeleteDebt() {
    if (!debt) return;

    Alert.alert(
      'Excluir dívida',
      'Tem certeza que deseja excluir esta dívida?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: handleDeleteDebt,
        },
      ]
    );
  }

  async function handleDeleteDebt() {
    if (!debt) return;

    try {
      setDeleting(true);

      await api.delete(`/debts/${debt.id}`);

      Alert.alert('Sucesso', 'Dívida removida com sucesso.', [
        {
          text: 'OK',
          onPress: () => router.replace('/debts'),
        },
      ]);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível remover a dívida.';

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

  if (!debt) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Dívida não encontrada.
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
                {debt.personName}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {debt.description}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusTone.bg },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: statusTone.text },
                ]}
              >
                {getDebtStatusLabel(debt.status)}
              </Text>
            </View>
          </View>

          <Text style={[styles.amount, { color: debtTone }]}>
            {formatCurrency(debt.amount)}
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
              {debt.type === 'to_receive'
                ? `${debt.personName} te deve ${formatCurrency(debt.amount)}`
                : `Você deve ${formatCurrency(debt.amount)} para ${debt.personName}`}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Tipo</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {getDebtTypeLabel(debt.type)}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Status
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {getDebtStatusLabel(debt.status)}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Descrição
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {debt.description}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Vencimento
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {debt.dueDate ? formatDateBR(debt.dueDate) : 'Não informado'}
            </Text>
          </View>

          <View style={styles.infoGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Criada em
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {formatDateBR(debt.createdAt)}
            </Text>
          </View>

          <View style={styles.infoGroupLast}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Última atualização
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {formatDateBR(debt.updatedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.secondaryActionButton,
              { backgroundColor: colors.surfaceSecondary },
            ]}
            onPress={goToEditDebt}
          >
            <Text style={[styles.secondaryActionButtonText, { color: colors.text }]}>
              Editar dívida
            </Text>
          </TouchableOpacity>

          {debt.status === 'pending' && (
            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                { backgroundColor: colors.primary },
                updatingStatus && styles.buttonDisabled,
              ]}
              onPress={handleUpdateStatus}
              disabled={updatingStatus}
            >
              <Text style={styles.primaryActionText}>
                {updatingStatus
                  ? 'Atualizando...'
                  : debt.type === 'to_receive'
                  ? 'Marcar como recebida'
                  : 'Marcar como paga'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: colors.dangerSoft },
              deleting && styles.buttonDisabled,
            ]}
            onPress={confirmDeleteDebt}
            disabled={deleting}
          >
            <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
              {deleting ? 'Excluindo...' : 'Excluir dívida'}
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
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeText: {
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
  primaryActionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
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
