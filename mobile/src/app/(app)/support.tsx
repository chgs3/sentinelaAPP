import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { api } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import type {
  AuthUser,
  SupportCategory,
  SupportPayload,
  SupportResponse,
} from '../../types';

const categoryOptions: Array<{
  label: string;
  value: SupportCategory;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { label: 'Bug', value: 'bug', icon: 'bug-outline' },
  { label: 'Sugestão', value: 'suggestion', icon: 'bulb-outline' },
  { label: 'Dúvida', value: 'question', icon: 'help-circle-outline' },
  { label: 'Melhoria', value: 'improvement', icon: 'sparkles-outline' },
];

function getAppVersion() {
  const version =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version;

  return version ?? '1.0.0';
}

function getPlatformName() {
  return Platform.OS;
}

function getDeviceModel() {
  return Device.modelName ?? 'Não informado';
}

function getOsVersion() {
  if (typeof Device.osVersion === 'string') {
    return Device.osVersion;
  }

  return 'Não informado';
}

function getMimeTypeFromUri(uri?: string | null) {
  if (!uri) return 'image/jpeg';

  const lowerUri = uri.toLowerCase();

  if (lowerUri.endsWith('.png')) return 'image/png';
  if (lowerUri.endsWith('.webp')) return 'image/webp';
  if (lowerUri.endsWith('.heic')) return 'image/heic';
  if (lowerUri.endsWith('.jpg') || lowerUri.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  return 'image/jpeg';
}

function getFileNameFromUri(uri?: string | null) {
  if (!uri) {
    return `support-image-${Date.now()}.jpg`;
  }

  const parts = uri.split('/');
  const lastPart = parts[parts.length - 1];

  if (!lastPart) {
    return `support-image-${Date.now()}.jpg`;
  }

  return lastPart;
}

export default function SupportScreen() {
  const { colors } = useAppTheme();

  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);

  const [category, setCategory] = useState<SupportCategory>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentMimeType, setAttachmentMimeType] = useState<string | null>(
    null
  );
  const [attachmentFileName, setAttachmentFileName] = useState<string | null>(
    null
  );
  const [attachmentPreviewUri, setAttachmentPreviewUri] = useState<
    string | null
  >(null);

  const technicalInfo = useMemo(
    () => ({
      appVersion: getAppVersion(),
      platform: getPlatformName(),
      deviceModel: getDeviceModel(),
      osVersion: getOsVersion(),
    }),
    []
  );

  async function loadUser() {
    try {
      setLoadingUser(true);
      const response = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(response.data.user);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar seus dados para o suporte.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  function resetAttachment() {
    setAttachmentBase64(null);
    setAttachmentMimeType(null);
    setAttachmentFileName(null);
    setAttachmentPreviewUri(null);
  }

  function resetForm() {
    setCategory('bug');
    setSubject('');
    setMessage('');
    resetAttachment();
  }

  async function handlePickImage() {
    try {
      setPickingImage(true);

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          'Permita o acesso à galeria para anexar um print.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset) {
        Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
        return;
      }

      if (!asset.base64) {
        Alert.alert('Erro', 'Não foi possível ler a imagem selecionada.');
        return;
      }

      const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        Alert.alert(
          'Imagem muito grande',
          'Escolha uma imagem de até 3 MB para enviar no suporte.'
        );
        return;
      }

      setAttachmentBase64(asset.base64);
      setAttachmentMimeType(asset.mimeType ?? getMimeTypeFromUri(asset.uri));
      setAttachmentFileName(asset.fileName ?? getFileNameFromUri(asset.uri));
      setAttachmentPreviewUri(asset.uri);
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem da galeria.');
    } finally {
      setPickingImage(false);
    }
  }

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Atenção', 'Preencha assunto e mensagem antes de enviar.');
      return;
    }

    const payload: SupportPayload = {
      category,
      subject: subject.trim(),
      message: message.trim(),
      appVersion: technicalInfo.appVersion,
      platform: technicalInfo.platform,
      deviceModel: technicalInfo.deviceModel,
      osVersion: technicalInfo.osVersion,
      attachmentBase64,
      attachmentMimeType,
      attachmentFileName,
    };

    try {
      setSubmitting(true);

      const response = await api.post<SupportResponse>('/support', payload);

      const emailInfo = response.data.emailNotification;

      resetForm();

      if (emailInfo?.sent) {
        Alert.alert(
          'Suporte enviado',
          'Seu chamado foi registrado e a notificação por e-mail também foi enviada.'
        );
        return;
      }

      Alert.alert(
        'Suporte enviado',
        'Seu chamado foi registrado com sucesso.'
      );
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível enviar sua solicitação de suporte.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingUser) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
        edges={['bottom']}
      >
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando suporte...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
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
                name="help-buoy-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Suporte</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Envie bugs, dúvidas, sugestões e melhorias. As informações
              técnicas do app vão junto para facilitar a análise.
            </Text>
          </View>

          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Tipo de chamado
            </Text>

            <View style={styles.categoryGrid}>
              {categoryOptions.map((option) => {
                const active = category === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.surfaceSecondary,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(option.value)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={active ? '#FFFFFF' : colors.text}
                    />
                    <Text
                      style={[
                        styles.categoryCardText,
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
              Assunto
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
              placeholder="Ex.: Erro ao salvar transação"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
              maxLength={120}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Mensagem
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Descreva o problema, contexto, passos para reproduzir ou a sua sugestão."
              placeholderTextColor={colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              maxLength={1500}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Print do problema
            </Text>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
                pickingImage && styles.buttonDisabled,
              ]}
              onPress={handlePickImage}
              disabled={pickingImage}
            >
              <Ionicons
                name="image-outline"
                size={18}
                color={colors.text}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                {pickingImage ? 'Abrindo galeria...' : 'Selecionar imagem'}
              </Text>
            </TouchableOpacity>

            {attachmentPreviewUri && (
              <View
                style={[
                  styles.attachmentCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Image
                  source={{ uri: attachmentPreviewUri }}
                  style={styles.attachmentPreview}
                  resizeMode="cover"
                />

                <View style={styles.attachmentInfo}>
                  <Text
                    style={[styles.attachmentTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {attachmentFileName ?? 'Imagem anexada'}
                  </Text>

                  <Text
                    style={[
                      styles.attachmentMeta,
                      { color: colors.textMuted },
                    ]}
                  >
                    {attachmentMimeType ?? 'image/jpeg'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.removeAttachmentButton,
                    { backgroundColor: colors.dangerSoft },
                  ]}
                  onPress={resetAttachment}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Enviando...' : 'Enviar chamado'}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Informações que serão enviadas
            </Text>

            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Usuário
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.name ?? 'Não informado'}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  E-mail
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.email ?? 'Não informado'}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Versão do app
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {technicalInfo.appVersion}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Plataforma
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {technicalInfo.platform}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Dispositivo
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {technicalInfo.deviceModel}
                </Text>
              </View>

              <View style={styles.infoRowLast}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Versão do SO
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {technicalInfo.osVersion}
                </Text>
              </View>
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
  sectionCard: {
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: '700',
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
  textArea: {
    minHeight: 140,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  attachmentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentPreview: {
    width: 58,
    height: 58,
    borderRadius: 12,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  attachmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  attachmentMeta: {
    fontSize: 12,
  },
  removeAttachmentButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  infoRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoRowLast: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 21,
  },
});