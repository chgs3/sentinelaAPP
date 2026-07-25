import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { api } from '../../../services/api';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { formatCurrencyBRL, formatDateBR } from '../../../utils/formatters';
import type { Debt } from '../../../types';

type DebtType = 'to_receive' | 'to_pay';
type DebtStatus = 'pending' | 'received' | 'paid';

export default function EditDebtScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<DebtType>('to_receive');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<DebtStatus>('pending');
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const loadDebt = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get<Debt[]>('/debts');
      const found = response.data.find((item) => item.id === Number(id));

      if (!found) {
        Alert.alert('Erro', 'Dívida não encontrada.');
        router.back();
        return;
      }

      setPersonName(found.personName);
      setType(found.type);
      setAmount(String(found.amount));
      setDescription(found.description);
      setStatus(found.status);
      setDueDate(found.dueDate ? new Date(found.dueDate) : null);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar a dívida.';

      Alert.alert('Erro', apiMessage);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDebt();
  }, [loadDebt]);

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

  async function handleSave() {
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

      await api.put(`/debts/${id}`, {
        personName: personName.trim(),
        type,
        amount: parsedAmount,
        description: description.trim(),
        status,
        dueDate: dueDate ? dueDate.toISOString() : null,
      });

      Alert.alert('Sucesso', 'Dívida atualizada com sucesso.', [
        {
          text: 'OK',
          onPress: () => router.replace('/debts'),
        },
      ]);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível atualizar a dívida.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setSaving(false);
    }
  }

  const previewAmount = useMemo(() => {
    const parsed = Number(amount.replace(/\./g, '').replace(',', '.'));

    if (Number.isNaN(parsed) || parsed <= 0) {
      return 'R$ 0,00';
    }

    return formatCurrencyBRL(parsed);
  }, [amount]);

  const typeConfig = useMemo(() => {
    if (type === 'to_receive') {
      return {
        label: 'A receber',
        color: colors.success,
        bg: colors.successSoft,
      };
    }

    return {
      label: 'A pagar',
      color: colors.danger,
      bg: colors.dangerSoft,
    };
  }, [type, colors]);

  function getStatusLabel(value: DebtStatus) {
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

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando dívida...
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Editar dívida
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Atualize os dados da caderneta antes de salvar.
                </Text>
              </View>

              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: typeConfig.bg },
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: typeConfig.color },
                  ]}
                >
                  {typeConfig.label}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.previewLabel, { color: colors.textMuted }]}
              >
                Valor atual da edição
              </Text>
              <Text
                style={[
                  styles.previewValue,
                  {
                    color:
                      type === 'to_receive' ? colors.success : colors.danger,
                  },
                ]}
              >
                {previewAmount}
              </Text>
              <Text
                style={[styles.previewMeta, { color: colors.textMuted }]}
              >
                Status: {getStatusLabel(status)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Informações principais
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

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tipo</Text>
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

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Valor</Text>
            <TextInput
              style={[
                styles.input,
                styles.highlightInput,
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
              placeholder="Descrição"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Situação da dívida
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Status
            </Text>
            <View style={styles.segmentRowWrap}>
              {(['pending', 'received', 'paid'] as DebtStatus[]).map((item) => {
                const active = status === item;

                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.pillButton,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.surfaceSecondary,
                      },
                    ]}
                    onPress={() => setStatus(item)}
                  >
                    <Text
                      style={[
                        styles.pillButtonText,
                        {
                          color: active ? '#FFFFFF' : colors.text,
                        },
                      ]}
                    >
                      {getStatusLabel(item)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              saving && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 32,
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
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
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
  previewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  previewValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  previewMeta: {
    fontSize: 13,
    marginTop: 6,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
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
  highlightInput: {
    borderWidth: 1.5,
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
  saveButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
