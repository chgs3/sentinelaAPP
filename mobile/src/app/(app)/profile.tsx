import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
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
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja encerrar sua sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await removeToken();
            router.replace('/login');
          },
        },
      ]
    );
  }

  function goToEditProfile() {
    router.push('/edit-profile');
  }

  function getInitials(name?: string | null) {
    if (!name?.trim()) return 'SN';

    const parts = name.trim().split(' ').filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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
      edges={['bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
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
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {getInitials(user?.name)}
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Gerencie suas informações e personalize sua conta no Sentinela.
          </Text>
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Informações da conta
          </Text>

          <View
            style={[
              styles.infoRow,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.label, { color: colors.textMuted }]}>Nome</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {user?.name ?? 'Não informado'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {user?.email ?? 'Não informado'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.actionsCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Ações
          </Text>

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
    alignItems: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  actionsCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    lineHeight: 22,
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
