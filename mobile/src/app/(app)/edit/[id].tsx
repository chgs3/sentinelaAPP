import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { api } from '../../../services/api';
import type { Transaction } from '../../../types';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountOrCard, setAccountOrCard] = useState('');

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
      setPaymentMethod(transaction.paymentMethod ?? '');
      setAccountOrCard(transaction.accountOrCard ?? '');
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

    if (Number.isNaN(parsedAmount)) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }

    try {
      setSaving(true);

      await api.put(`/transactions/${id}`, {
        description,
        category,
        amount: parsedAmount,
        paymentMethod: paymentMethod.trim() || null,
        accountOrCard: accountOrCard.trim() || null,
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
      <TextInput
        style={styles.input}
        value={paymentMethod}
        onChangeText={setPaymentMethod}
        placeholder="Ex.: Crédito, Débito, Pix, Dinheiro"
      />

      <Text style={styles.label}>Conta/Cartão</Text>
      <TextInput
        style={styles.input}
        value={accountOrCard}
        onChangeText={setAccountOrCard}
        placeholder="Ex.: Nubank, Inter, PicPay"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 16,
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