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
import { useAppTheme } from '../../hooks/useAppTheme';

export default function RegisterScreen() {
  const { colors } = useAppTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha nome, email e senha.');
      return;
    }

    try {
      setSubmitting(true);

      await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      Alert.alert('Sucesso', 'Conta criada com sucesso.', [
        {
          text: 'Ir para login',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ?? 'Não foi possível criar a conta.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setSubmitting(false);
    }
  }

  function goToLogin() {
    router.push('/login');
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
                name="person-add-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Criar conta
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Comece a usar o Sentinela para registrar gastos, acompanhar
              dívidas e visualizar sua vida financeira com mais clareza.
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
              Nome
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
              placeholder="Digite seu nome"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              editable={!submitting}
            />

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
              editable={!submitting}
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
              placeholder="Crie uma senha"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Criando...' : 'Criar conta'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={goToLogin}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                Já tenho conta
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
              Como funciona
            </Text>
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              Depois de criar sua conta, você será redirecionado para a tela de
              login para entrar no app com suas credenciais.
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