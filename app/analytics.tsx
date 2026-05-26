import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getDashboardAnalytics, type DashboardAnalytics } from '../lib/api/analytics';
import { getUserRoles } from '../lib/auth-store';
import { COLORS } from '../lib/theme';
import { AppShell } from '../components/layout/AppShell';
import { useLanguageStore, translations } from '../lib/language-store';

// ============ HELPERS ============

function formatNumber(num: number): string {
  if (num === null || num === undefined) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  try {
    return num.toLocaleString('vi-VN');
  } catch {
    return num.toString();
  }
}

// ============ ICON COMPONENT ============

function IconCircle({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <View style={[iconStyles.circle, { width: size, height: size, backgroundColor: color + '20' }]}>
      <Ionicons name={name as any} size={size * 0.5} color={color} />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  circle: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ============ CHART COMPONENTS ============

function BarChart({ data, maxValue, barColor = COLORS.accent }: {
  data: { label: string; value: number; color?: string }[];
  maxValue: number;
  barColor?: string;
}) {
  return (
    <View style={barStyles.container}>
      {data.map((item, index) => {
        const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <View key={index} style={barStyles.row}>
            <Text style={barStyles.label}>{item.label}</Text>
            <View style={barStyles.barBg}>
              <View
                style={[
                  barStyles.barFill,
                  {
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: item.color || barColor,
                  }
                ]}
              />
            </View>
            <Text style={barStyles.value}>{formatNumber(item.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 60, fontSize: 11, color: COLORS.textMuted },
  barBg: { flex: 1, height: 16, backgroundColor: COLORS.surfaceLight, borderRadius: 8, minWidth: 60 },
  barFill: { height: 16, borderRadius: 8 },
  value: { width: 50, fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'right' },
});

// Segmented bar chart
function SegmentedBar({ segments, total, height = 20 }: {
  segments: { value: number; color: string; label: string }[];
  total: number;
  height?: number;
}) {
  if (total === 0) return null;

  const activeSegments = segments.filter(s => s.value > 0);

  return (
    <View style={segStyles.wrapper}>
      <View style={[segStyles.bar, { height }]}>
        {activeSegments.map((seg, idx) => {
          const pct = (seg.value / total) * 100;
          return (
            <View
              key={idx}
              style={[
                segStyles.segment,
                { width: `${pct}%`, backgroundColor: seg.color }
              ]}
            />
          );
        })}
      </View>
      <View style={segStyles.legend}>
        {activeSegments.map((seg, idx) => (
          <View key={idx} style={segStyles.legendItem}>
            <View style={[segStyles.dot, { backgroundColor: seg.color }]} />
            <Text style={segStyles.legendLabel}>{seg.label}</Text>
            <Text style={segStyles.legendValue}>{formatNumber(seg.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrapper: { gap: 8 },
  bar: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden' },
  segment: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: COLORS.textMuted },
  legendValue: { fontSize: 11, fontWeight: '700', color: COLORS.text },
});

// ============ STAT CARD ============

function StatCard({ icon, title, value, sub, color = COLORS.accent }: {
  icon: string;
  title: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <View style={cardStyles.wrap}>
      <View style={cardStyles.inner}>
        <IconCircle name={icon} color={color} size={48} />
        <Text style={cardStyles.value}>{typeof value === 'number' ? formatNumber(value) : value}</Text>
        <Text style={cardStyles.title}>{title}</Text>
        {sub && <Text style={[cardStyles.sub, { color }]}>{sub}</Text>}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 90, maxWidth: 120 },
  inner: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  value: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 6 },
  title: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  sub: { fontSize: 9, marginTop: 2, fontWeight: '600', textAlign: 'center' },
});

// ============ PROGRESS CARD ============

function ProgressCard({ title, value, max, color, icon }: {
  title: string;
  value: number;
  max: number;
  color: string;
  icon: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <View style={progressStyles.card}>
      <View style={progressStyles.header}>
        <IconCircle name={icon} color={color} size={40} />
        <Text style={progressStyles.title}>{title}</Text>
      </View>
      <Text style={[progressStyles.value, { color }]}>{formatNumber(value)}</Text>
      <View style={progressStyles.progressBg}>
        <View style={[progressStyles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={progressStyles.sub}>trên {formatNumber(max)}</Text>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { fontSize: 11, fontWeight: '600', color: COLORS.text, flex: 1 },
  value: { fontSize: 20, fontWeight: '800', color: COLORS.accent, marginBottom: 4 },
  progressBg: { height: 5, backgroundColor: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  sub: { fontSize: 9, color: COLORS.textMuted, marginTop: 3 },
});

// ============ STYLES ============

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 32, gap: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  loadingText: { color: COLORS.textMuted, fontSize: 15, marginTop: 8 },
  errorIcon: { fontSize: 64, marginBottom: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  errorText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statsGrid3: { flexDirection: 'row', gap: 8 },
  comparisonGrid: { flexDirection: 'row', gap: 10 },
  comparisonCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  comparisonIcon: { marginBottom: 8 },
  comparisonLabel: { fontSize: 11, color: COLORS.textMuted },
  comparisonValue: { fontSize: 28, fontWeight: '800', color: COLORS.accent, marginVertical: 4 },
  comparisonSub: { fontSize: 11, color: COLORS.textMuted },
  footer: { textAlign: 'center', color: COLORS.textDim, fontSize: 11, marginTop: 8 },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: COLORS.accent },
});

// ============ MAIN ============

export default function AnalyticsScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  async function loadAnalytics() {
    try {
      setError(null);
      const [result, roles] = await Promise.all([
        getDashboardAnalytics(),
        getUserRoles(),
      ]);
      setData(result);
      setUserRole(roles?.[0] || null);
    } catch (e: any) {
      console.warn('Analytics error:', e);
      if (e?.status === 401) {
        setError(t.sessionExpired);
      } else if (e?.status === 403) {
        setError(language === 'vi' ? 'Bạn không có quyền xem phân tích này.' : 'You do not have permission to view this analytics.');
      } else {
        setError(language === 'vi' ? 'Không thể tải dữ liệu. Vui lòng thử lại.' : 'Cannot load data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { loadAnalytics(); }, []));

  function onRefresh() {
    setRefreshing(true);
    loadAnalytics();
  }

  function getRoleBadge() {
    switch (userRole) {
      case 'ROLE_TENANT_ADMIN':
        return { text: 'Quản trị viên', icon: 'shield-checkmark', color: COLORS.accent };
      case 'ROLE_STAFF':
        return { text: 'Nhân viên', icon: 'person', color: '#3b82f6' };
      case 'ROLE_EMPLOYEE':
        return { text: 'Nhân viên', icon: 'person-outline', color: '#8b5cf6' };
      default:
        return { text: 'Người dùng', icon: 'accessibility', color: COLORS.textMuted };
    }
  }

  if (loading) {
    return (
      <AppShell title="Phân tích" subtitle="Thống kê AI">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Phân tích" subtitle="Thống kê AI">
        <View style={styles.centered}>
          <Ionicons name="cloud-offline" size={64} color={COLORS.textMuted} />
          <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </AppShell>
    );
  }

  if (!data) return null;

  // Default values
  const defaultBreakdown = { COMPLETED: 0, PROCESSING: 0, PENDING: 0, FAILED: 0 };
  const defaultLlmUsage = {
    totalTokensUsed: 0, totalRequests: 0, tokensThisMonth: 0,
    requestsThisMonth: 0, tokensToday: 0, requestsToday: 0, averageTokensPerRequest: 0,
  };
  const defaultDocStats = {
    totalDocuments: 0, totalChunks: 0, averageChunksPerDocument: 0,
    embeddingStatusBreakdown: defaultBreakdown,
  };

  const llmUsage = data.llmUsage || defaultLlmUsage;
  const documentStats = data.documentStats || defaultDocStats;
  const badge = getRoleBadge();

  const embeddingSegments = [
    { value: documentStats.embeddingStatusBreakdown.COMPLETED, color: '#22c55e', label: t.completed },
    { value: documentStats.embeddingStatusBreakdown.PROCESSING, color: '#3b82f6', label: t.processing },
    { value: documentStats.embeddingStatusBreakdown.PENDING, color: '#f59e0b', label: t.waiting },
    { value: documentStats.embeddingStatusBreakdown.FAILED, color: '#ef4444', label: t.failed },
  ].filter(s => s.value > 0);

  return (
    <AppShell title={t.analytics} subtitle="AI Analytics">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Role Badge */}
        <View style={styles.badgeContainer}>
          <Ionicons name={badge.icon as any} size={16} color={badge.color} />
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>

        {/* LLM Stats */}
        <Text style={styles.sectionTitle}>{t.useAI}</Text>
        <View style={styles.statsGrid3}>
          <StatCard
            icon="chatbubbles"
            title={t.totalRequests}
            value={llmUsage.totalRequests}
            sub={`${formatNumber(llmUsage.requestsThisMonth)}/${language === 'vi' ? 'tháng' : 'month'}`}
          />
          <StatCard
            icon="document-text"
            title={t.tokensUsed}
            value={llmUsage.totalTokensUsed}
            sub={`avg ${llmUsage.averageTokensPerRequest.toFixed(0)}/req`}
            color="#3b82f6"
          />
          <StatCard
            icon="calendar"
            title={t.today}
            value={llmUsage.requestsToday}
            sub={`${formatNumber(llmUsage.tokensToday)} tokens`}
            color="#8b5cf6"
          />
        </View>

        {/* Requests Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t.requests}</Text>
          <BarChart
            data={[
              { label: language === 'vi' ? 'Hôm nay' : 'Today', value: llmUsage.requestsToday, color: COLORS.accent },
              { label: language === 'vi' ? 'Tháng này' : 'This month', value: llmUsage.requestsThisMonth, color: '#3b82f6' },
              { label: language === 'vi' ? 'Tổng' : 'Total', value: llmUsage.totalRequests, color: '#8b5cf6' },
            ]}
            maxValue={llmUsage.totalRequests || 1}
          />
        </View>

        {/* Progress Cards */}
        <View style={styles.statsGrid}>
          <ProgressCard
            title={language === 'vi' ? 'Yêu cầu tháng' : 'Monthly requests'}
            value={llmUsage.requestsThisMonth}
            max={llmUsage.requestsThisMonth * 1.2 || 100}
            color={COLORS.accent}
            icon="bar-chart"
          />
          <ProgressCard
            title={language === 'vi' ? 'Tokens hôm nay' : 'Tokens today'}
            value={llmUsage.tokensToday}
            max={llmUsage.tokensToday * 1.5 || 1000}
            color="#3b82f6"
            icon="analytics"
          />
        </View>

        {/* Document Stats */}
        <Text style={styles.sectionTitle}>{t.documents}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="folder"
            title={t.totalDocuments}
            value={documentStats.totalDocuments}
            sub={`avg ${documentStats.averageChunksPerDocument.toFixed(1)} chunks`}
            color="#f59e0b"
          />
          <StatCard
            icon="layers"
            title={t.totalChunks}
            value={documentStats.totalChunks}
            sub={language === 'vi' ? 'chunks' : 'chunks'}
            color="#8b5cf6"
          />
        </View>

        {/* Embedding Status */}
        {embeddingSegments.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{t.embeddingStatus}</Text>
            <SegmentedBar
              segments={embeddingSegments}
              total={documentStats.totalDocuments}
              height={28}
            />
          </View>
        )}

        {/* Embedding Breakdown */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t.embeddingDetails}</Text>
          <BarChart
            data={embeddingSegments}
            maxValue={documentStats.totalDocuments || 1}
            barColor="#22c55e"
          />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {language === 'vi' ? 'Cập nhật' : 'Updated'}: {(() => {
            try { return new Date().toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'); }
            catch { return new Date().toLocaleString(); }
          })()}
        </Text>
      </ScrollView>
    </AppShell>
  );
}
