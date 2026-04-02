import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { api } from '../../../services/api';
import type { Transaction } from '../../../types';

const paymentMethodOptions = [
  { label: 'Crédito', value: 'credit' },
  { label: 'Débito', value: 'debit' },
  { label: 'Pix', value: 'pix' },
  { label: 'Dinheiro', value: 'cash' },
];

const accountOptions = [
  'nubank',
  'inter',
  'picpay',
  'caixa',
  'itau',
  'bradesco',
  'santander',
  'banco do brasil',
];

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [accountOrCard, setAccountOrCard] = useState<string | null>(null);
  const [customAccount, setCustomAccount] = useState('');

  async function loadTransaction() {
    try {
      setLoading(true);

      const response = await api.get<Transaction[]>('/transactions');
      const transaction = response.data.find((item) => item.id === Number(id));

      if (!transaction) {
        Alert.alert('Erro', 'Transação não encontrada.');
        router.back();
        return;
      }

      setDescription(transaction.description);
      setCategory(transaction.category);
      setAmount(String(transaction.amount));
      setPaymentMethod(transaction.paymentMethod ?? null);

      const currentAccount = transaction.accountOrCard ?? null;

      if (currentAccount && accountOptions.includes(currentAccount)) {
        setAccountOrCard(currentAccount);
        setCustomAccount('');
      } else {
        setAccountOrCard(null);
        setCustomAccount(currentAccount ?? '');
      }
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar a transação.';

      Alert.alert('Erro', apiMessage);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!description.trim() || !category.trim() || !amount.trim()) {
      Alert.alert('Atenção', 'Preencha descrição, categoria e valor.');
      return;
    }

    const parsedAmount = Number(amount.replace(',', '.'));

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }

    const finalAccountOrCard =
      customAccount.trim() || accountOrCard || null;

    try {
      setSaving(true);

      await api.put(`/transactions/${id}`, {
        description: description.trim(),
        category: category.trim(),
        amount: parsedAmount,
        paymentMethod,
        accountOrCard: finalAccountOrCard,
      });

      Alert.alert('Sucesso', 'Transação atualizada com sucesso.');
      router.back();
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

  function togglePaymentMethod(value: string) {
    setPaymentMethod((current) => (current === value ? null : value));
  }

  function toggleAccount(value: string) {
    if (accountOrCard === value) {
      setAccountOrCard(null);
      return;
    }

    setAccountOrCard(value);
    setCustomAccount('');
  }

  useEffect(() => {
    loadTransaction();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando transação...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Editar transação</Text>

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição"
        />

        <Text style={styles.label}>Categoria</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="Categoria"
        />

        <Text style={styles.label}>Valor</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Valor"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Forma de pagamento</Text>
        <View style={styles.chipsRow}>
          {paymentMethodOptions.map((option) => {
            const isActive = paymentMethod === option.value;

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => togglePaymentMethod(option.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Conta/Cartão</Text>
        <View style={styles.chipsRow}>
          {accountOptions.map((option) => {
            const isActive = accountOrCard === option;

            return (
              <TouchableOpacity
                key={option}
                style={[styles.chip, isActive && styles.chipActiveDark]}
                onPress={() => toggleAccount(option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Conta/Cartão personalizado</Text>
        <TextInput
          style={styles.input}
          value={customAccount}
          onChangeText={setCustomAccount}
          placeholder="Ex.: carteira, neon, wise..."
        />

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: '#2563EB',
  },
  chipActiveDark: {
    backgroundColor: '#111827',
  },
  chipText: {
    color: '#111827',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  button: {
    marginTop: 20,
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
});