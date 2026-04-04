import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { api } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { AuthUser } from '../../types';

export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  async function loadProfile() {
    try {
      setLoading(true);
      const response = await api.get<{ user: AuthUser }>('/auth/me');
      setName(response.data.user.name);
    } catch (error: any) {
      console.error(error);
      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar o perfil.';
      Alert.alert('Erro', apiMessage);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe um nome válido.');
      return;
    }

    try {
      setSaving(true);
      await api.put('/auth/profile', { name });
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
      router.back();
    } catch (error: any) {
      console.error(error);
      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível atualizar o perfil.';
      Alert.alert('Erro', apiMessage);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando perfil...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Editar perfil
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Seu nome"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          saving && styles.buttonDisabled,
        ]}
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
    padding: 16,
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
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
});