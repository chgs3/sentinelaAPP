import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../hooks/useAppTheme';

export default function SettingsScreen() {
  const { colors, mode, toggleThemeMode } = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Personalize o Sentinela do seu jeito.
      </Text>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
          </View>

          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Aparência
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
              Ajuste o visual do app.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.settingButton,
            { backgroundColor: colors.surfaceSecondary },
          ]}
          onPress={toggleThemeMode}
        >
          <View style={styles.settingLeft}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Ionicons
                name={mode === 'dark' ? 'moon' : 'sunny'}
                size={18}
                color={colors.primary}
              />
            </View>

            <View style={styles.settingTextBlock}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Tema do app
              </Text>
              <Text
                style={[
                  styles.settingDescriptionText,
                  { color: colors.textMuted },
                ]}
              >
                Alterne entre modo escuro e claro.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.valueBadge,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.settingValue, { color: colors.primary }]}>
              {mode === 'dark' ? 'Escuro' : 'Claro'}
            </Text>
          </View>
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
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={colors.primary}
            />
          </View>

          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Aplicativo
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
              Informações do Sentinela.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.infoRow,
            { borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
            Nome
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            Sentinela
          </Text>
        </View>

        <View
          style={[
            styles.infoRow,
            { borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
            Versão
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            1.0.0
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
            Registro
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            Somente por mensagem
          </Text>
        </View>
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
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Ionicons
              name="sparkles-outline"
              size={18}
              color={colors.primary}
            />
          </View>

          <View style={styles.sectionHeaderText}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Futuras preferências
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
              Espaço reservado para novas opções do app.
            </Text>
          </View>
        </View>

        <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
          Em breve você poderá configurar preferências do parser, comportamento do registro e outras personalizações do Sentinela.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  settingButton: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextBlock: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescriptionText: {
    fontSize: 13,
    marginTop: 2,
  },
  valueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
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
  placeholderText: {
    fontSize: 14,
    lineHeight: 21,
  },
});