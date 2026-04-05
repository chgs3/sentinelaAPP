import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../hooks/useAppTheme';

export default function SettingsScreen() {
  const { colors, mode, toggleThemeMode } = useAppTheme();

  const isDark = mode === 'dark';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
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
              styles.heroIcon,
              { backgroundColor: colors.primarySoft ?? colors.surfaceSecondary },
            ]}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Configurações
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Personalize o visual do Sentinela e acompanhe as preferências
            disponíveis do aplicativo.
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
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: colors.primarySoft ?? colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="color-palette-outline"
                size={18}
                color={colors.primary}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Aparência
              </Text>
              <Text
                style={[styles.sectionDescription, { color: colors.textMuted }]}
              >
                Ajuste o tema do app para o seu estilo de uso.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.highlightCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.highlightTopRow}>
              <View style={styles.highlightTextBlock}>
                <Text style={[styles.highlightLabel, { color: colors.textMuted }]}>
                  Tema atual
                </Text>
                <Text style={[styles.highlightValue, { color: colors.text }]}>
                  {isDark ? 'Modo escuro' : 'Modo claro'}
                </Text>
              </View>

              <View
                style={[
                  styles.themeBadge,
                  {
                    backgroundColor: isDark
                      ? colors.primarySoft ?? colors.surface
                      : colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={14}
                  color={colors.primary}
                />
                <Text style={[styles.themeBadgeText, { color: colors.primary }]}>
                  {isDark ? 'Escuro' : 'Claro'}
                </Text>
              </View>
            </View>

            <Text
              style={[styles.highlightDescription, { color: colors.textMuted }]}
            >
              Altere entre uma visualização mais escura para foco e conforto
              visual, ou uma visualização mais clara para ambientes iluminados.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryActionButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={toggleThemeMode}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color="#FFFFFF"
              style={styles.actionIcon}
            />
            <Text style={styles.primaryActionButtonText}>
              {isDark ? 'Trocar para modo claro' : 'Trocar para modo escuro'}
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
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: colors.primarySoft ?? colors.surfaceSecondary },
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
              <Text
                style={[styles.sectionDescription, { color: colors.textMuted }]}
              >
                Informações gerais sobre a versão atual do Sentinela.
              </Text>
            </View>
          </View>

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
                Nome
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                Sentinela
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Versão
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                1.0.0
              </Text>
            </View>

            <View style={styles.infoRowLast}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                Registro principal
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                Mensagem inteligente
              </Text>
            </View>
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
                { backgroundColor: colors.primarySoft ?? colors.surfaceSecondary },
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
                Em breve
              </Text>
              <Text
                style={[styles.sectionDescription, { color: colors.textMuted }]}
              >
                Espaço reservado para novas preferências do app.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.roadmapCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.roadmapItem}>
              <View
                style={[
                  styles.roadmapDot,
                  { backgroundColor: colors.primary },
                ]}
              />
              <Text style={[styles.roadmapText, { color: colors.textMuted }]}>
                Preferências do parser de mensagens
              </Text>
            </View>

            <View style={styles.roadmapItem}>
              <View
                style={[
                  styles.roadmapDot,
                  { backgroundColor: colors.primary },
                ]}
              />
              <Text style={[styles.roadmapText, { color: colors.textMuted }]}>
                Configuração de comportamento do registro automático
              </Text>
            </View>

            <View style={styles.roadmapItem}>
              <View
                style={[
                  styles.roadmapDot,
                  { backgroundColor: colors.primary },
                ]}
              />
              <Text style={[styles.roadmapText, { color: colors.textMuted }]}>
                Preferências avançadas de visualização
              </Text>
            </View>
          </View>
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
    lineHeight: 18,
  },
  highlightCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  highlightTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  highlightTextBlock: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  highlightDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  themeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  themeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryActionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionIcon: {
    marginRight: 8,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
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
  roadmapCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  roadmapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  roadmapText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});