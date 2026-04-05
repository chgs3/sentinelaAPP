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

      await api.put('/auth/profile', { name: name.trim() });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
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
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando perfil...
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <Text style={[styles.title, { color: colors.text }]}>
              Editar perfil
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Atualize seu nome para manter sua conta do Sentinela sempre em dia.
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Informações pessoais
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

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
                onPress={() => router.back()}
                disabled={saving}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
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
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  label: {
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
    marginBottom: 16,
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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