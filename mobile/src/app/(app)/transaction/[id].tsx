import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { api } from '../../../services/api';
import type { Transaction } from '../../../types';

export default function TransactionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  async function loadTransaction() {
    try {
      setLoading(true);

      const response = await api.get<Transaction[]>('/transactions');
      const foundTransaction = response.data.find(
        (item) => item.id === Number(id)
      );

      if (!foundTransaction) {
        Alert.alert('Erro', 'Transação não encontrada.');
        router.back();
        return;
      }

      setTransaction(foundTransaction);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar a transação.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);

      await api.delete(`/transactions/${id}`);
      Alert.alert('Sucesso', 'Transação excluída com sucesso.');
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível excluir a transação.');
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Excluir transação',
      'Tem certeza que deseja excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: handleDelete,
        },
      ]
    );
  }

  function goToEdit() {
    router.push({
      pathname: '/edit/[id]' as const,
      params: { id: String(id) },
    });
  }

  function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
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

  if (!transaction) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Detalhes da transação</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Descrição</Text>
        <Text style={styles.value}>{transaction.description}</Text>

        <Text style={styles.label}>Tipo</Text>
        <Text style={styles.value}>
          {transaction.type === 'income' ? 'Receita' : 'Despesa'}
        </Text>

        <Text style={styles.label}>Valor</Text>
        <Text style={styles.value}>{formatCurrency(transaction.amount)}</Text>

        <Text style={styles.label}>Categoria</Text>
        <Text style={styles.value}>{transaction.category}</Text>

        <Text style={styles.label}>Data</Text>
        <Text style={styles.value}>
          {new Date(transaction.transactionAt).toLocaleDateString('pt-BR')}
        </Text>

        <Text style={styles.label}>Pagamento</Text>
        <Text style={styles.value}>
          {transaction.paymentMethod ?? 'Não informado'}
        </Text>

        <Text style={styles.label}>Conta/Cartão</Text>
        <Text style={styles.value}>
          {transaction.accountOrCard ?? 'Não informado'}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.editButton} onPress={goToEdit}>
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={confirmDelete}
          disabled={deleting}
        >
          <Text style={styles.deleteButtonText}>
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Text>
        </TouchableOpacity>
      </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 10,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#111827',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
});