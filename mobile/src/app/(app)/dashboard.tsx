import { useEffect, useMemo, useState } from 'react';
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

import { api } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import {
  formatCurrencyBRL,
  formatDateBR,
  formatMonthYearShort,
} from '../../utils/formatters';
import type {
  CategorySummary,
  DailySummaryItem,
  MonthlyClosure,
  MonthlyComparison,
  MonthlySummary,
} from '../../types';

function getMonthRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const formatDate = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function formatMonthYear(date: Date) {
  return formatMonthYearShort(date);
}

function formatClosureLabel(month: number, year: number) {
  return formatMonthYearShort(new Date(year, month - 1, 1));
}

function formatDiffCurrency(value: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
  const abs = Math.abs(value);

  return `${prefix}${formatCurrencyBRL(abs)}`;
}

function formatDiffNumber(value: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${prefix}${Math.abs(value)}`;
}

export default function DashboardScreen() {
  const { colors } = useAppTheme();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [closures, setClosures] = useState<MonthlyClosure[]>([]);
  const [comparison, setComparison] = useState<MonthlyComparison | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingMonth, setClosingMonth] = useState(false);
  const [reopeningMonth, setReopeningMonth] = useState(false);

  const period = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);

  async function loadDashboard(showLoading = false) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;

      const [
        summaryResponse,
        categoriesResponse,
        closuresResponse,
        comparisonResponse,
        dailyResponse,
      ] = await Promise.all([
        api.get<MonthlySummary>('/summary/period', {
          params: {
            startDate: period.startDate,
            endDate: period.endDate,
          },
        }),
        api.get<CategorySummary[]>('/summary/categories', {
          params: {
            startDate: period.startDate,
            endDate: period.endDate,
          },
        }),
        api.get<MonthlyClosure[]>('/monthly-closures', {
          params: { year },
        }),
        api.get<MonthlyComparison>('/summary/comparison', {
          params: { month, year },
        }),
        api.get<DailySummaryItem[]>('/summary/daily', {
          params: { month, year },
        }),
      ]);

      setSummary(summaryResponse.data);
      setCategories(categoriesResponse.data);
      setClosures(closuresResponse.data);
      setComparison(comparisonResponse.data);
      setDailySummary(dailyResponse.data);
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível carregar o dashboard.';

      Alert.alert('Erro', apiMessage);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadDashboard(true);
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [period.startDate, period.endDate]);

  function goToPreviousMonth() {
    setSelectedMonth((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() - 1);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  }

  function goToNextMonth() {
    setSelectedMonth((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + 1);
      return new Date(next.getFullYear(), next.getMonth(), 1);
    });
  }

  function goToCurrentMonth() {
    const now = new Date();
    setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  async function performCloseMonth() {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();

    try {
      setClosingMonth(true);

      await api.post('/monthly-closures', {
        month,
        year,
      });

      await loadDashboard(false);

      Alert.alert('Sucesso', 'Mês fechado com sucesso.');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível fechar o mês.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setClosingMonth(false);
    }
  }

  function handleCloseMonth() {
    Alert.alert(
      'Fechar mês',
      `Deseja fechar ${formatMonthYear(
        selectedMonth
      )}? Isso criará um snapshot do período.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Fechar mês',
          onPress: performCloseMonth,
        },
      ]
    );
  }

  async function performReopenMonth() {
    if (!currentClosure) return;

    try {
      setReopeningMonth(true);

      await api.delete(`/monthly-closures/${currentClosure.id}`);
      await loadDashboard(false);

      Alert.alert('Sucesso', 'Mês reaberto com sucesso.');
    } catch (error: any) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ??
        'Não foi possível reabrir o mês.';

      Alert.alert('Erro', apiMessage);
    } finally {
      setReopeningMonth(false);
    }
  }

  function handleReopenMonth() {
    Alert.alert(
      'Reabrir mês',
      `Deseja reabrir ${formatMonthYear(
        selectedMonth
      )}? O snapshot de fechamento será removido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reabrir mês',
          onPress: performReopenMonth,
        },
      ]
    );
  }

  function formatCurrency(value: number) {
    return formatCurrencyBRL(value);
  }

  const maxCategoryTotal = useMemo(() => {
    if (categories.length === 0) return 0;
    return Math.max(...categories.map((item) => item.total));
  }, [categories]);

  const currentClosure = useMemo(() => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();

    return (
      closures.find((item) => item.month === month && item.year === year) ??
      null
    );
  }, [closures, selectedMonth]);

  const meaningfulDailySummary = useMemo(
    () => dailySummary.filter((item) => item.totalTransactions > 0),
    [dailySummary]
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Carregando dashboard...
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
            styles.periodCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.periodTitle, { color: colors.text }]}>
            Período do dashboard
          </Text>

          <View style={styles.periodControls}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={goToPreviousMonth}
            >
              <Text style={[styles.periodButtonText, { color: colors.text }]}>
                {'<'}
              </Text>
            </TouchableOpacity>

            <View style={styles.periodLabelContainer}>
              <Text style={[styles.periodLabel, { color: colors.text }]}>
                {formatMonthYear(selectedMonth)}
              </Text>
              <Text style={[styles.periodDates, { color: colors.textMuted }]}>
                {formatDateBR(period.startDate)} até {formatDateBR(period.endDate)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.periodButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
              onPress={goToNextMonth}
            >
              <Text style={[styles.periodButtonText, { color: colors.text }]}>
                {'>'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.currentMonthButton,
              { backgroundColor: colors.surfaceSecondary },
            ]}
            onPress={goToCurrentMonth}
          >
            <Text
              style={[styles.currentMonthButtonText, { color: colors.text }]}
            >
              Ir para o mês atual
            </Text>
          </TouchableOpacity>

          {currentClosure ? (
            <TouchableOpacity
              style={[
                styles.closeMonthButton,
                { backgroundColor: colors.surfaceSecondary },
                reopeningMonth && styles.buttonDisabled,
              ]}
              onPress={handleReopenMonth}
              disabled={reopeningMonth}
            >
              <Text
                style={[
                  styles.closeMonthButtonText,
                  { color: colors.text },
                ]}
              >
                {reopeningMonth ? 'Reabrindo...' : 'Reabrir mês'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.closeMonthButton,
                { backgroundColor: colors.primary },
                closingMonth && styles.buttonDisabled,
              ]}
              onPress={handleCloseMonth}
              disabled={closingMonth}
            >
              <Text
                style={[
                  styles.closeMonthButtonText,
                  { color: '#FFFFFF' },
                ]}
              >
                {closingMonth ? 'Fechando...' : 'Fechar mês'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardsGrid}>
          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              Receitas
            </Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {formatCurrency(summary?.totalIncomes ?? 0)}
            </Text>
          </View>

          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              Despesas
            </Text>
            <Text style={[styles.metricValue, { color: colors.danger }]}>
              {formatCurrency(summary?.totalExpenses ?? 0)}
            </Text>
          </View>

          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              Saldo
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {formatCurrency(summary?.balance ?? 0)}
            </Text>
          </View>

          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              Transações
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {summary?.totalTransactions ?? 0}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Comparativo com mês anterior
          </Text>

          {comparison ? (
            <>
              <Text style={[styles.comparisonSubtitle, { color: colors.textMuted }]}>
                Atual: {formatClosureLabel(comparison.current.month, comparison.current.year)}
              </Text>
              <Text style={[styles.comparisonSubtitle, { color: colors.textMuted }]}>
                Anterior: {formatClosureLabel(comparison.previous.month, comparison.previous.year)}
              </Text>

              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: colors.text }]}>
                  Receitas
                </Text>
                <Text style={[styles.comparisonCurrent, { color: colors.text }]}>
                  {formatCurrency(comparison.current.totalIncomes)}
                </Text>
                <Text
                  style={[
                    styles.comparisonDiff,
                    {
                      color:
                        comparison.diff.totalIncomes >= 0
                          ? colors.success
                          : colors.danger,
                    },
                  ]}
                >
                  {formatDiffCurrency(comparison.diff.totalIncomes)}
                </Text>
              </View>

              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: colors.text }]}>
                  Despesas
                </Text>
                <Text style={[styles.comparisonCurrent, { color: colors.text }]}>
                  {formatCurrency(comparison.current.totalExpenses)}
                </Text>
                <Text
                  style={[
                    styles.comparisonDiff,
                    {
                      color:
                        comparison.diff.totalExpenses <= 0
                          ? colors.success
                          : colors.danger,
                    },
                  ]}
                >
                  {formatDiffCurrency(comparison.diff.totalExpenses)}
                </Text>
              </View>

              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: colors.text }]}>
                  Saldo
                </Text>
                <Text style={[styles.comparisonCurrent, { color: colors.text }]}>
                  {formatCurrency(comparison.current.balance)}
                </Text>
                <Text
                  style={[
                    styles.comparisonDiff,
                    {
                      color:
                        comparison.diff.balance >= 0
                          ? colors.success
                          : colors.danger,
                    },
                  ]}
                >
                  {formatDiffCurrency(comparison.diff.balance)}
                </Text>
              </View>

              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: colors.text }]}>
                  Transações
                </Text>
                <Text style={[styles.comparisonCurrent, { color: colors.text }]}>
                  {comparison.current.totalTransactions}
                </Text>
                <Text
                  style={[
                    styles.comparisonDiff,
                    { color: colors.textMuted },
                  ]}
                >
                  {formatDiffNumber(comparison.diff.totalTransactions)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Não foi possível carregar o comparativo do mês.
            </Text>
          )}
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
            Evolução diária
          </Text>

          {meaningfulDailySummary.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Não há movimentações diárias nesse período.
            </Text>
          ) : (
            meaningfulDailySummary.map((item) => (
              <View
                key={item.date}
                style={[
                  styles.dailyCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.dailyHeader}>
                  <Text style={[styles.dailyDate, { color: colors.text }]}>
                    {formatDateBR(`${item.date}T00:00:00`)}
                  </Text>
                  <Text
                    style={[styles.dailyTransactions, { color: colors.textMuted }]}
                  >
                    {item.totalTransactions} transação(ões)
                  </Text>
                </View>

                <Text style={[styles.dailyMeta, { color: colors.textMuted }]}>
                  Receitas: {formatCurrency(item.totalIncomes)}
                </Text>
                <Text style={[styles.dailyMeta, { color: colors.textMuted }]}>
                  Despesas: {formatCurrency(item.totalExpenses)}
                </Text>
                <Text
                  style={[
                    styles.dailyMeta,
                    {
                      color:
                        item.balance >= 0 ? colors.success : colors.danger,
                    },
                  ]}
                >
                  Saldo do dia: {formatCurrency(item.balance)}
                </Text>
              </View>
            ))
          )}
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
            Gastos por categoria
          </Text>

          {categories.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Não há despesas nesse período para exibir no dashboard.
            </Text>
          ) : (
            categories.map((item) => {
              const widthPercent =
                maxCategoryTotal > 0 ? (item.total / maxCategoryTotal) * 100 : 0;

              return (
                <View key={item.category} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Text
                      style={[styles.categoryName, { color: colors.text }]}
                    >
                      {item.category}
                    </Text>
                    <Text
                      style={[styles.categoryTotal, { color: colors.text }]}
                    >
                      {formatCurrency(item.total)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.categoryBarTrack,
                      { backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${Math.max(widthPercent, 8)}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[styles.categoryCount, { color: colors.textMuted }]}
                  >
                    {item.count} transação(ões)
                  </Text>
                </View>
              );
            })
          )}
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
            Ciclos fechados
          </Text>

          {closures.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhum mês foi fechado ainda.
            </Text>
          ) : (
            closures.map((closure) => (
              <View
                key={closure.id}
                style={[
                  styles.closureCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.closureTitle, { color: colors.text }]}>
                  {formatClosureLabel(closure.month, closure.year)}
                </Text>
                <Text style={[styles.closureMeta, { color: colors.textMuted }]}>
                  Receitas: {formatCurrency(closure.totalIncomes)}
                </Text>
                <Text style={[styles.closureMeta, { color: colors.textMuted }]}>
                  Despesas: {formatCurrency(closure.totalExpenses)}
                </Text>
                <Text style={[styles.closureMeta, { color: colors.textMuted }]}>
                  Saldo: {formatCurrency(closure.balance)}
                </Text>
                <Text style={[styles.closureMeta, { color: colors.textMuted }]}>
                  Transações: {closure.totalTransactions}
                </Text>
                <Text style={[styles.closureMeta, { color: colors.textMuted }]}>
                  Fechado em: {formatDateBR(closure.closedAt)}
                </Text>
              </View>
            ))
          )}
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  periodCard: {
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  periodControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonText: {
    fontSize: 20,
    fontWeight: '700',
  },
  periodLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodDates: {
    fontSize: 12,
    marginTop: 2,
  },
  currentMonthButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  currentMonthButtonText: {
    fontWeight: '700',
  },
  closeMonthButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeMonthButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  comparisonSubtitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#99999933',
  },
  comparisonLabel: {
    flex: 1.2,
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonCurrent: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  comparisonDiff: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  dailyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  dailyDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  dailyTransactions: {
    fontSize: 12,
  },
  dailyMeta: {
    fontSize: 13,
    marginBottom: 3,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  categoryItem: {
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  categoryTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryBarTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: 10,
    borderRadius: 999,
  },
  categoryCount: {
    fontSize: 12,
    marginTop: 6,
  },
  closureCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  closureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  closureMeta: {
    fontSize: 13,
    marginBottom: 3,
  },
});