import { useEffect, useState } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../services/api';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { formatPaymentMethod } from '../../../utils/formatters';
import type { Transaction } from '../../../types';

type EditableTransactionType = 'expense' | 'income';
type EditablePaymentMethod = 'credit' | 'debit' | 'pix' | 'cash' | null;

const paymentMethodOptions: Array<{
  label: string;
  value: EditablePaymentMethod;
}> = [
  { label: 'Pix', value: 'pix' },
  { label: 'Crédito', value: 'credit' },
  { label: 'Débito', value: 'debit' },
  { label: 'Dinheiro', value: 'cash' },
  { label: 'Não informado', value: null },
];

export default function EditTransactionScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [type, setType] = useState<EditableTransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [transactionAt, setTransactionAt] = useState(new Date());
  const [paymentMethod, setPaymentMethod] =
    useState<EditablePaymentMethod>(null);
  const [accountOrCard, setAccountOrCard] = useState('');

  async function loadTransaction() {
    try {
      setLoading(true);

      const response = await api.get<Transaction[]>('/transactions');
      const found = response.data.find((item) => item.id === Number(id));

      if (!found) {
        Alert.alert('Erro', 'Transação não encontrada.');
        router.back();
        return;
      }

      setType(found.type);
      setAmount(String(found.amount));
      setDescription(found.description);
      setCategory(found.category);
      setTransactionAt(new Date(found.transactionAt));
      setPaymentMethod(found.paymentMethod);
      setAccountOrCard(found.accountOrCard ?? '');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar a transação para edição.';

      Alert.alert('Erro', apiMessage);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransaction();
  }, []);

  function handleDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    setShowDatePicker(false);

    if (event.type !== 'set' || !selectedDate) {
      return;
    }

    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(12, 0, 0, 0);

    setTransactionAt(normalizedDate);
  }

  async function handleSave() {
    if (!description.trim() || !category.trim() || !amount.trim()) {
      Alert.alert(
        'Atenção',
        'Preencha descrição, categoria e valor antes de salvar.'
      );
      return;
    }

    const parsedAmount = Number(
      amount.replace(/\./g, '').replace(',', '.')
    );

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }

    try {
      setSaving(true);

      await api.put(`/transactions/${id}`, {
        type,
        amount: parsedAmount,
        description: description.trim(),
        category: category.trim(),
        transactionAt: transactionAt.toISOString(),
        paymentMethod,
        accountOrCard: accountOrCard.trim() || null,
      });

      Alert.alert('Sucesso', 'Transação atualizada com sucesso.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível atualizar a transação.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando transação...
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
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              Editar transação
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tipo</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor:
                      type === 'expense'
                        ? colors.primary
                        : colors.surfaceSecondary,
                  },
                ]}
                onPress={() => setType('expense')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color: type === 'expense' ? '#FFFFFF' : colors.text,
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
                      type === 'income'
                        ? colors.primary
                        : colors.surfaceSecondary,
                  },
                ]}
                onPress={() => setType('income')}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color: type === 'income' ? '#FFFFFF' : colors.text,
                    },
                  ]}
                >
                  Receita
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Valor</Text>
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
              value={category}
              onChangeText={setCategory}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Data</Text>
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
                {transactionAt.toLocaleDateString('pt-BR')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={transactionAt}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Forma de pagamento
            </Text>

            <Text style={[styles.currentPaymentText, { color: colors.textMuted }]}>
              Atual: {formatPaymentMethod(paymentMethod)}
            </Text>

            <View style={styles.segmentRowWrap}>
              {paymentMethodOptions.map((option) => {
                const active = paymentMethod === option.value;

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
                    onPress={() => setPaymentMethod(option.value)}
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
              value={accountOrCard}
              onChangeText={setAccountOrCard}
            />

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
          </View>
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
    padding: 16,
  },
  title: {
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
  currentPaymentText: {
    fontSize: 13,
    marginBottom: 10,
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
    borderRadius: 14,
    paddingVertical: 14,
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