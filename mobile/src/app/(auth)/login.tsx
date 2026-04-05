import { useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../services/api';
import { saveToken } from '../../services/authStorage';
import { useAppTheme } from '../../hooks/useAppTheme';

export default function LoginScreen() {
  const { colors } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha email e senha.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      await saveToken(response.data.token);

      Alert.alert('Sucesso', 'Login realizado com sucesso.');
      router.replace('/home');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ?? 'Não foi possível realizar login.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
            <View
              style={[
                styles.heroIcon,
                {
                  backgroundColor:
                    colors.primarySoft ?? colors.surfaceSecondary,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Entrar</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Acesse o Sentinela e continue registrando sua vida financeira com
              rapidez.
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
              Dados de acesso
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Email
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
              placeholder="Digite seu email"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Senha
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
              placeholder="Digite sua senha"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={() => router.push('/register')}
              disabled={submitting}
            >
              <Text
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                Criar conta
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.helperCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.helperTitle, { color: colors.text }]}>
              Primeiro acesso?
            </Text>
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              Crie sua conta para começar a registrar transações, acompanhar
              dívidas e visualizar seus dashboards.
            </Text>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
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
  formCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  helperCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  helperTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});