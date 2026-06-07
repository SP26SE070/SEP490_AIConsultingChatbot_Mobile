import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getDashboardAnalytics, type DashboardAnalytics } from '../lib/api/analytics';
import { getUserRoles } from '../lib/auth-store';
import { AppShell } from '../components/layout/AppShell';
import { useLanguageStore, translations } from '../lib/language-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// ============ CARD COMPONENTS ============

function StatCard({ icon, title, value, subtitle, color, bgColor }: {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: bgColor }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '25' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={statStyles.value}>{typeof value === 'number' ? formatNumber(value) : value}</Text>
      <Text style={statStyles.title}>{title}</Text>
      {subtitle && <Text style={[statStyles.subtitle, { color }]}>{subtitle}</Text>}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: (SCREEN_WIDTH - 60) / 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

// ============ CHART COMPONENTS ============

function ProgressRing({ progress, color, size = 80, strokeWidth = 8 }: {
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[ringStyles.container, { width: size, height: size }]}>
      <View style={[ringStyles.track, {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: '#1e293b',
      }]} />
      <View style={[ringStyles.progress, {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        borderRightColor: 'transparent',
        borderBottomColor: progress > 50 ? color : 'transparent',
        borderLeftColor: progress > 75 ? color : 'transparent',
        borderTopColor: progress > 25 ? color : 'transparent',
        transform: [{ rotate: '-45deg' }],
      }]} />
      <View style={[ringStyles.inner, {
        width: size - strokeWidth * 2 - 8,
        height: size - strokeWidth * 2 - 8,
        borderRadius: (size - strokeWidth * 2 - 8) / 2,
      }]}>
        <Text style={ringStyles.percent}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
  },
  progress: {
    position: 'absolute',
  },
  inner: {
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
  },
});

function BarChartCard({ data, title }: {
  data: { label: string; value: number; color: string }[];
  title: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={chartStyles.card}>
      <View style={chartStyles.header}>
        <Ionicons name="bar-chart" size={20} color="#10b981" />
        <Text style={chartStyles.title}>{title}</Text>
      </View>
      <View style={chartStyles.bars}>
        {data.map((item, index) => {
          const pct = (item.value / maxValue) * 100;
          return (
            <View key={index} style={chartStyles.barItem}>
              <View style={chartStyles.barLabelRow}>
                <Text style={chartStyles.barLabel}>{item.label}</Text>
                <Text style={[chartStyles.barValue, { color: item.color }]}>
                  {formatNumber(item.value)}
                </Text>
              </View>
              <View style={chartStyles.barBg}>
                <View style={[chartStyles.barFill, { width: `${pct}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  bars: {
    gap: 16,
  },
  barItem: {
    gap: 8,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  barValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  barBg: {
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
});

function StatusCard({ title, completed, processing, pending, failed }: {
  title: string;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
}) {
  const total = completed + processing + pending + failed;
  
  return (
    <View style={statusStyles.card}>
      <View style={statusStyles.header}>
        <Ionicons name="layers" size={20} color="#10b981" />
        <Text style={statusStyles.title}>{title}</Text>
      </View>
      
      <View style={statusStyles.progressBg}>
        {completed > 0 && (
          <View style={[statusStyles.progressSeg, { flex: completed, backgroundColor: '#22c55e' }]} />
        )}
        {processing > 0 && (
          <View style={[statusStyles.progressSeg, { flex: processing, backgroundColor: '#3b82f6' }]} />
        )}
        {pending > 0 && (
          <View style={[statusStyles.progressSeg, { flex: pending, backgroundColor: '#f59e0b' }]} />
        )}
        {failed > 0 && (
          <View style={[statusStyles.progressSeg, { flex: failed, backgroundColor: '#ef4444' }]} />
        )}
        {total === 0 && (
          <View style={[statusStyles.progressSeg, { flex: 1, backgroundColor: '#334155' }]} />
        )}
      </View>

      <View style={statusStyles.legend}>
        <StatusLegend color="#22c55e" label="Hoàn tất" value={completed} />
        <StatusLegend color="#3b82f6" label="Xử lý" value={processing} />
        <StatusLegend color="#f59e0b" label="Chờ" value={pending} />
        <StatusLegend color="#ef4444" label="Lỗi" value={failed} />
      </View>
    </View>
  );
}

function StatusLegend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={legendStyles.label}>{label}</Text>
      <Text style={[legendStyles.value, { color }]}>{formatNumber(value)}</Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  progressBg: {
    flexDirection: 'row',
    height: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressSeg: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});

const legendStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
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
      if (e?.status === 401) {
        setError(t.sessionExpired);
      } else if (e?.status === 403) {
        setError(t.noPermission);
      } else {
        setError(t.cannotLoadData);
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
        return { text: t.admin, icon: 'shield-checkmark', color: '#10b981' };
      case 'ROLE_STAFF':
        return { text: t.staff, icon: 'person', color: '#3b82f6' };
      case 'ROLE_EMPLOYEE':
        return { text: t.employee, icon: 'person-outline', color: '#8b5cf6' };
      default:
        return { text: t.user, icon: 'accessibility', color: '#94a3b8' };
    }
  }

  if (loading) {
    return (
      <AppShell title={t.analytics} subtitle={language === 'vi' ? 'AI Analytics' : 'AI Analytics'}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <View style={styles.loadingIcon}>
              <Ionicons name="analytics" size={40} color="#10b981" />
            </View>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>{t.loading}</Text>
          </View>
        </View>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title={t.analytics} subtitle={language === 'vi' ? 'AI Analytics' : 'AI Analytics'}>
        <View style={styles.loadingContainer}>
          <View style={styles.errorContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="cloud-offline" size={48} color="#f87171" />
            </View>
            <Text style={styles.errorTitle}>{t.somethingWentWrong}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadAnalytics}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryBtnText}>{t.retry}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppShell>
    );
  }

  if (!data) return null;

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

  const { COMPLETED, PROCESSING, PENDING, FAILED } = documentStats.embeddingStatusBreakdown;

  return (
    <AppShell title={t.analytics} subtitle={language === 'vi' ? 'AI Analytics' : 'AI Analytics'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={[styles.badgeChip, { backgroundColor: badge.color + '20' }]}>
                <Ionicons name={badge.icon as any} size={14} color={badge.color} />
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
              </View>
              <Text style={styles.welcomeText}>{t.aiActivity}</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Usage Section */}
        <Text style={styles.sectionTitle}>
          <Ionicons name="sparkles" size={16} color="#10b981" /> {t.useAI}
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            icon="chatbubbles"
            title={t.totalRequests}
            value={llmUsage.totalRequests}
            subtitle={`${formatNumber(llmUsage.requestsThisMonth)} ${t.thisMonth}`}
            color="#10b981"
            bgColor="#1e293b"
          />
          <StatCard
            icon="document-text"
            title={t.tokensUsed}
            value={llmUsage.totalTokensUsed}
            subtitle={`${t.avgPerRequest} ${llmUsage.averageTokensPerRequest.toFixed(0)}`}
            color="#3b82f6"
            bgColor="#1e293b"
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="calendar"
            title={t.today}
            value={llmUsage.requestsToday}
            subtitle={`${formatNumber(llmUsage.tokensToday)} tokens`}
            color="#8b5cf6"
            bgColor="#1e293b"
          />
          <StatCard
            icon="time"
            title={t.thisMonth}
            value={llmUsage.requestsThisMonth}
            subtitle={`${formatNumber(llmUsage.tokensThisMonth)} tokens`}
            color="#f59e0b"
            bgColor="#1e293b"
          />
        </View>

        {/* Chart */}
        <BarChartCard
          title={t.requests}
          data={[
            { label: t.today, value: llmUsage.requestsToday, color: '#10b981' },
            { label: t.thisMonth, value: llmUsage.requestsThisMonth, color: '#3b82f6' },
            { label: t.total, value: llmUsage.totalRequests, color: '#8b5cf6' },
          ]}
        />

        {/* Documents Section */}
        <Text style={styles.sectionTitle}>
          <Ionicons name="folder" size={16} color="#f59e0b" /> {t.documents}
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            icon="folder"
            title={t.totalDocuments}
            value={documentStats.totalDocuments}
            subtitle={`${t.avgChunks} ${documentStats.averageChunksPerDocument.toFixed(1)}`}
            color="#f59e0b"
            bgColor="#1e293b"
          />
          <StatCard
            icon="layers"
            title={t.totalChunks}
            value={documentStats.totalChunks}
            subtitle={language === 'vi' ? 'đoạn' : 'chunks'}
            color="#8b5cf6"
            bgColor="#1e293b"
          />
        </View>

        {/* Embedding Status */}
        <StatusCard
          title={t.embeddingStatus}
          completed={COMPLETED}
          processing={PROCESSING}
          pending={PENDING}
          failed={FAILED}
        />

        {/* Embedding Details Chart */}
        <BarChartCard
          title={t.embeddingDetails}
          data={[
            { label: t.completed, value: COMPLETED, color: '#22c55e' },
            { label: t.processing, value: PROCESSING, color: '#3b82f6' },
            { label: t.waiting, value: PENDING, color: '#f59e0b' },
            { label: t.failed, value: FAILED, color: '#ef4444' },
          ]}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerIcon}>
            <Ionicons name="sparkles" size={16} color="#10b981" />
          </View>
          <Text style={styles.footerText}>
            AI Chatbot • {t.updated}: {new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  errorContent: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  headerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    gap: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeText: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  footerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#64748b',
    fontSize: 13,
  },
});
