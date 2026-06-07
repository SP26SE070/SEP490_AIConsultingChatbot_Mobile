import { useState, useCallback, useEffect } from 'react';
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
import { router } from 'expo-router';
import { getDashboardAnalytics, type DashboardAnalytics } from '../../lib/api/analytics';
import { getTenantInfo } from '../../lib/api/tenant-settings';
import { getUserPermissions, getUserRoles, refreshUser } from '../../lib/auth-store';
import { AppShell } from '../../components/layout/AppShell';
import { AppLogo } from '../../components/brand/AppLogo';
import { useLanguageStore, translations } from '../../lib/language-store';
import { useResponsive } from '../../lib/useResponsive';
import { useNotification } from '../../lib/notification';

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

function StatCard({ icon, title, value, subtitle, color, bgColor, responsive }: {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  bgColor: string;
  responsive: { iconWrapSize: number; iconRadius: number; iconSize: number; valueSize: number; titleSize: number; subtitleSize: number; padding: number };
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: bgColor, padding: responsive.padding }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '25', width: responsive.iconWrapSize, height: responsive.iconWrapSize, borderRadius: responsive.iconRadius }]}>
        <Ionicons name={icon as any} size={responsive.iconSize} color={color} />
      </View>
      <Text style={[statStyles.value, { fontSize: responsive.valueSize }]}>{typeof value === 'number' ? formatNumber(value) : value}</Text>
      <Text style={[statStyles.title, { fontSize: responsive.titleSize }]}>{title}</Text>
      {subtitle && <Text style={[statStyles.subtitle, { color, fontSize: responsive.subtitleSize }]}>{subtitle}</Text>}
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
    minWidth: 140,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  title: {
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
  subtitle: {
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

function BarChartCard({ data, title, styles: chartStyles }: {
  data: { label: string; value: number; color: string }[];
  title: string;
  styles: ReturnType<typeof StyleSheet.create>;
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

// ============ MAIN ============

export default function AnalyticsScreen() {
  const { width, sz, fs } = useResponsive();
  const { language } = useLanguageStore();
  const t = translations[language];
  const { showToast } = useNotification();

  // Permission guard — only for non-admin
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    getUserRoles().then(roles => {
      if (roles.includes('ROLE_TENANT_ADMIN') || roles.includes('ROLE_SUPER_ADMIN')) {
        setHasAccess(true);
      } else {
        // Refresh permissions from backend in case admin just granted them
        refreshUser().then(() => getUserPermissions()).then(perms => {
          setHasAccess(perms.includes('ANALYTICS_VIEW'));
        });
      }
    });
  }, []);
  // Extra styles responsive values
  const retryBtnMarginT = sz(8);
  const headerCardRadius = sz(20);
  const headerLeftGap = sz(8);
  const badgeChipGap = sz(6);
  const sectionTitleGap = sz(6);
  const footerGap = sz(8);
  const errorContentPadding = sz(24);
  const errorIconSize = sz(80);
  const errorIconRadius = sz(40);

  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  useEffect(() => {
    getTenantInfo().then(info => {
      if (info?.logoUrl) setTenantLogo(info.logoUrl);
    }).catch(() => {});
  }, []);

  // Responsive values
  const isSmall = width < 375;
  const contentPadding = sz(16);
  const contentPaddingBottom = sz(40);
  const sectionGap = sz(20);
  const statsGap = sz(12);
  const loadingIconSize = sz(80);
  const loadingIconRadius = sz(40);
  const loadingTextSize = fs(15);
  const errorTitleSize = fs(18);
  const errorTextSize = fs(14);
  const retryBtnPaddingH = sz(20);
  const retryBtnPaddingV = sz(12);
  const retryBtnRadius = sz(12);
  const retryBtnTextSize = fs(15);
  const headerCardPadding = sz(20);
  const badgeChipPaddingH = sz(12);
  const badgeChipPaddingV = sz(6);
  const badgeChipRadius = sz(20);
  const badgeTextSize = fs(12);
  const welcomeTextSize = fs(18);
  const refreshBtnSize = sz(40);
  const refreshBtnRadius = sz(12);
  const sectionTitleSize = fs(16);
  const footerPaddingV = sz(24);
  const footerIconSize = sz(40);
  const footerIconRadius = sz(12);
  const footerTextSize = fs(13);

  // StatCard responsive values
  const statIconWrapSize = sz(48);
  const statIconRadius = sz(14);
  const statIconSize = fs(22);
  const statValueSize = fs(24);
  const statTitleSize = fs(12);
  const statSubtitleSize = fs(11);

  // Chart responsive values
  const chartPadding = sz(20);
  const chartHeaderGap = sz(10);
  const chartHeaderBottom = sz(20);
  const chartTitleSize = fs(16);
  const chartBarsGap = sz(16);
  const chartBarItemGap = sz(8);
  const chartBarLabelSize = fs(13);
  const chartBarValueSize = fs(14);
  const chartBarHeight = sz(10);
  const chartBarRadius = sz(5);

  // Status card responsive values
  const statusHeaderGap = sz(10);
  const statusHeaderBottom = sz(16);
  const statusTitleSize = fs(16);
  const statusProgressHeight = sz(12);
  const statusProgressRadius = sz(6);
  const statusProgressBottom = sz(16);
  const statusLegendGap = sz(12);

  // Legend responsive values
  const legendDotSize = sz(10);
  const legendDotRadius = sz(5);
  const legendLabelSize = fs(12);
  const legendValueSize = fs(12);

  const statResponsive = {
    iconWrapSize: statIconWrapSize,
    iconRadius: statIconRadius,
    iconSize: statIconSize,
    valueSize: statValueSize,
    titleSize: statTitleSize,
    subtitleSize: statSubtitleSize,
    padding: sz(16),
  };

  // Chart component styles (needs to be inside component for sz/fs)
  const chartStyles = StyleSheet.create({
    card: {
      backgroundColor: '#1e293b',
      borderRadius: chartPadding,
      padding: chartPadding,
      borderWidth: 1,
      borderColor: '#334155',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: chartHeaderGap,
      marginBottom: chartHeaderBottom,
    },
    title: {
      fontSize: chartTitleSize,
      fontWeight: '700',
      color: '#f1f5f9',
    },
    bars: {
      gap: chartBarsGap,
    },
    barItem: {
      gap: chartBarItemGap,
    },
    barLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    barLabel: {
      fontSize: chartBarLabelSize,
      color: '#94a3b8',
      fontWeight: '500',
    },
    barValue: {
      fontSize: chartBarValueSize,
      fontWeight: '700',
    },
    barBg: {
      height: chartBarHeight,
      backgroundColor: '#334155',
      borderRadius: chartBarRadius,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: chartBarRadius,
    },
  });

  const statusStyles = StyleSheet.create({
    card: {
      backgroundColor: '#1e293b',
      borderRadius: chartPadding,
      padding: chartPadding,
      borderWidth: 1,
      borderColor: '#334155',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: statusHeaderGap,
      marginBottom: statusHeaderBottom,
    },
    title: {
      fontSize: statusTitleSize,
      fontWeight: '700',
      color: '#f1f5f9',
    },
    progressBg: {
      flexDirection: 'row',
      height: statusProgressHeight,
      backgroundColor: '#334155',
      borderRadius: statusProgressRadius,
      overflow: 'hidden',
      marginBottom: statusProgressBottom,
    },
    progressSeg: {
      height: '100%',
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: statusLegendGap,
    },
  });

  const legendStyles = StyleSheet.create({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sz(6),
    },
    dot: {
      width: legendDotSize,
      height: legendDotSize,
      borderRadius: legendDotRadius,
    },
    label: {
      fontSize: legendLabelSize,
      color: '#94a3b8',
    },
    value: {
      fontSize: legendValueSize,
      fontWeight: '700',
    },
  });

  const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: contentPadding, paddingBottom: contentPaddingBottom, gap: sectionGap },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingContent: { alignItems: 'center' },
    loadingIcon: { backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#94a3b8' },
    errorContent: { alignItems: 'center' },
    errorIcon: { backgroundColor: 'rgba(248, 113, 113, 0.15)', alignItems: 'center', justifyContent: 'center' },
    errorTitle: { color: '#f1f5f9', fontWeight: '700' },
    errorText: { color: '#94a3b8', textAlign: 'center' },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10b981',
      marginTop: retryBtnMarginT,
      borderRadius: retryBtnRadius,
      paddingHorizontal: retryBtnPaddingH,
      paddingVertical: retryBtnPaddingV,
    },
    retryBtnText: { color: '#fff', fontWeight: '600', fontSize: retryBtnTextSize },
    headerCard: {
      backgroundColor: '#1e293b',
      borderRadius: headerCardRadius,
      padding: headerCardPadding,
      borderWidth: 1,
      borderColor: '#334155',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
      overflow: 'hidden',
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerLeft: { gap: headerLeftGap },
    badgeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: badgeChipGap,
      paddingHorizontal: badgeChipPaddingH,
      paddingVertical: badgeChipPaddingV,
      borderRadius: badgeChipRadius,
      alignSelf: 'flex-start',
    },
    badgeText: { fontSize: badgeTextSize, fontWeight: '600' },
    welcomeText: { color: '#f1f5f9', fontSize: welcomeTextSize, fontWeight: '700' },
    refreshBtn: {
      width: refreshBtnSize,
      height: refreshBtnSize,
      borderRadius: refreshBtnRadius,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      color: '#f1f5f9',
      fontSize: sectionTitleSize,
      fontWeight: '700',
      gap: sectionTitleGap,
    },
    statsRow: { flexDirection: 'row', gap: statsGap },
    footer: { alignItems: 'center', paddingVertical: footerPaddingV, gap: footerGap },
    footerIcon: {
      width: footerIconSize,
      height: footerIconSize,
      borderRadius: footerIconRadius,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerText: { color: '#64748b', fontSize: footerTextSize },
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
          {completed > 0 && <View style={[statusStyles.progressSeg, { flex: completed, backgroundColor: '#22c55e' }]} />}
          {processing > 0 && <View style={[statusStyles.progressSeg, { flex: processing, backgroundColor: '#3b82f6' }]} />}
          {pending > 0 && <View style={[statusStyles.progressSeg, { flex: pending, backgroundColor: '#f59e0b' }]} />}
          {failed > 0 && <View style={[statusStyles.progressSeg, { flex: failed, backgroundColor: '#ef4444' }]} />}
          {total === 0 && <View style={[statusStyles.progressSeg, { flex: 1, backgroundColor: '#334155' }]} />}
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

  async function loadAnalytics() {
    let capturedRoles: string[] = [];
    try {
      setError(null);
      const [result, roles] = await Promise.all([
        getDashboardAnalytics(),
        getUserRoles(),
      ]);
      setData(result);
      setUserRole(roles && roles.length > 0 ? roles[0] : null);
    } catch (e: any) {
      if (e?.status === 401 || e?.message?.includes('đăng nhập') || e?.status === 403) {
        // No token or no permission — show 0 values instead of error
        setData({
          llmUsage: {
            totalTokensUsed: 0,
            totalRequests: 0,
            tokensThisMonth: 0,
            requestsThisMonth: 0,
            tokensToday: 0,
            requestsToday: 0,
            averageTokensPerRequest: 0,
          },
          documentStats: {
            totalDocuments: 0,
            totalChunks: 0,
            averageChunksPerDocument: 0,
            embeddingStatusBreakdown: { COMPLETED: 0, PROCESSING: 0, PENDING: 0, FAILED: 0 },
          },
        });
        setUserRole(capturedRoles[0] || null);
      } else {
        setError(t.cannotLoadData);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { loadAnalytics(); }, []));

  // Permission denied state
  if (hasAccess === false) {
    return (
      <AppShell title={t.analytics}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <View style={[styles.errorIcon, { width: sz(80), height: sz(80), borderRadius: sz(40) }]}>
              <Ionicons name="shield-outline" size={sz(40)} color="#f59e0b" />
            </View>
            <Text style={[styles.errorTitle, { fontSize: fs(18) }]}>
              {language === 'vi' ? 'Không có quyền truy cập' : 'Access Denied'}
            </Text>
            <Text style={[styles.errorText, { fontSize: fs(14) }]}>
              {language === 'vi'
                ? 'Bạn chưa được cấp quyền xem thống kê. Vui lòng liên hệ quản trị viên.'
                : 'You do not have permission to view analytics. Please contact your administrator.'}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { paddingHorizontal: sz(20), paddingVertical: sz(12), borderRadius: sz(12) }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={sz(18)} color="#fff" />
              <Text style={[styles.retryBtnText, { fontSize: fs(15) }]}>
                {language === 'vi' ? 'Quay lại' : 'Go Back'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppShell>
    );
  }

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
            <View style={[styles.loadingIcon, { width: loadingIconSize, height: loadingIconSize, borderRadius: loadingIconRadius }]}>
              <Ionicons name="analytics" size={sz(40)} color="#10b981" />
            </View>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={[styles.loadingText, { fontSize: loadingTextSize }]}>{t.loading}</Text>
          </View>
        </View>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title={t.analytics} subtitle={language === 'vi' ? 'AI Analytics' : 'AI Analytics'}>
        <View style={styles.loadingContainer}>
          <View style={[styles.errorContent, { padding: errorContentPadding }]}>
            <View style={[styles.errorIcon, { width: errorIconSize, height: errorIconSize, borderRadius: errorIconRadius }]}>
              <Ionicons name="cloud-offline" size={sz(48)} color="#f87171" />
            </View>
            <Text style={[styles.errorTitle, { fontSize: errorTitleSize }]}>{t.somethingWentWrong}</Text>
            <Text style={[styles.errorText, { fontSize: errorTextSize }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryBtn, { paddingHorizontal: retryBtnPaddingH, paddingVertical: retryBtnPaddingV, borderRadius: retryBtnRadius }]} onPress={loadAnalytics}>
              <Ionicons name="refresh" size={sz(18)} color="#fff" />
              <Text style={[styles.retryBtnText, { fontSize: retryBtnTextSize }]}>{t.retry}</Text>
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
            responsive={statResponsive}
          />
          <StatCard
            icon="document-text"
            title={t.tokensUsed}
            value={llmUsage.totalTokensUsed}
            subtitle={`${t.avgPerRequest} ${llmUsage.averageTokensPerRequest.toFixed(0)}`}
            color="#3b82f6"
            bgColor="#1e293b"
            responsive={statResponsive}
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
            responsive={statResponsive}
          />
          <StatCard
            icon="time"
            title={t.thisMonth}
            value={llmUsage.requestsThisMonth}
            subtitle={`${formatNumber(llmUsage.tokensThisMonth)} tokens`}
            color="#f59e0b"
            bgColor="#1e293b"
            responsive={statResponsive}
          />
        </View>

        {/* Chart */}
        <BarChartCard
          title={t.requests}
          styles={chartStyles}
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
            responsive={statResponsive}
          />
          <StatCard
            icon="layers"
            title={t.totalChunks}
            value={documentStats.totalChunks}
            subtitle={language === 'vi' ? 'đoạn' : 'chunks'}
            color="#8b5cf6"
            bgColor="#1e293b"
            responsive={statResponsive}
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
          styles={chartStyles}
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
            <AppLogo size={20} tenantLogoUrl={tenantLogo} />
          </View>
          <Text style={styles.footerText}>
            {language === 'vi' ? 'AI Chatbot For Tenants' : 'AI Chatbot For Tenants'}
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}
