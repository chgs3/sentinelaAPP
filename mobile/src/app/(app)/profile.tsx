import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { api } from '../../services/api';
import { removeToken } from '../../services/authStorage';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { AuthUser } from '../../types';

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      setLoading(true);
      const response = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(response.data.user);
    } catch (error: any) {
      console.error(error);
      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar o perfil.';
      Alert.alert('Erro', apiMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await removeToken();
    router.replace('/login');
  }

  function goToEditProfile() {
    router.push('/edit-profile');
  }

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.textMuted }]}>Nome</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {user?.name ?? 'Não informado'}
        </Text>

        <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {user?.email ?? 'Não informado'}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: colors.surfaceSecondary },
        ]}
        onPress={goToEditProfile}
      >
        <Text style={[styles.actionButtonText, { color: colors.text }]}>
          Editar perfil
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.logoutButton,
          { backgroundColor: colors.dangerSoft },
        ]}
        onPress={handleLogout}
      >
        <Text style={[styles.logoutButtonText, { color: colors.danger }]}>
          Sair da conta
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
    fontSize: 30,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  logoutButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
});