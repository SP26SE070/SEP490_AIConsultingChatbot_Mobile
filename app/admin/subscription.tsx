import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, ScrollView, Image, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getAccessToken, refreshUser } from '../../lib/auth-store';
import { API_BASE_URL } from '../../lib/api/config';
import { getPaymentHistory, confirmPendingPayment, type PaymentHistoryItem, type PaymentStatus } from '../../lib/api/payment';
import { useNotification } from '../../lib/notification';
import { useResponsive } from '../../lib/useResponsive';

interface Subscription {
  subscription_id?: string;
  id?: string;
  tier?: string;
  status?: string;
  is_trial?: boolean;
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
  price?: number;
  currency?: string;
  billing_cycle?: string;
  auto_renew?: boolean;
  autoRenew?: boolean;
  max_users?: number;
  max_documents?: number;
  max_api_calls?: number;
  cancelledAt?: string;
  nextBillingDate?: string;
  payment_id?: string;
  qr_image_url?: string;
  qr_content?: string;
  transaction_code?: string;
  expires_at?: string;
}

interface PaymentInfo {
  payment_id: string;
  subscription_id: string;
  transaction_code: string;
  amount: number;
  currency: string;
  qr_image_url?: string;
  qr_content?: string;
  expires_at?: string;
  tier: string;
  billing_cycle: string;
  bank_account?: string;
  bank_name?: string;
  account_name?: string;
  polling_interval_seconds?: number;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string;
  period: string;
  features: string[];
  recommended?: boolean;
  tier: string;
  monthlyPrice?: number;
  quarterlyPrice?: number;
  yearlyPrice?: number;
  displayOrder?: number;
  isActive?: boolean;
}

type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const BILLING_CYCLES: Array<{ value: BillingCycle; labelVi: string; labelEn: string }> = [
  { value: 'MONTHLY', labelVi: 'Theo tháng', labelEn: 'Monthly' },
  { value: 'QUARTERLY', labelVi: 'Theo quý', labelEn: 'Quarterly' },
  { value: 'YEARLY', labelVi: 'Theo năm', labelEn: 'Yearly' },
];

const DEFAULT_FEATURES_BY_CODE: Record<string, string[]> = {
  TRIAL: ['Dùng thử miễn phí', 'Giới hạn trong thời gian trial'],
  STARTER: ['100 lượt chat/tháng', 'Tài liệu cơ bản', 'Độ chính xác 85-90%', 'Hỗ trợ email'],
  STANDARD: ['1,000 lượt chat/tháng', 'Tài liệu mở rộng', 'Độ chính xác 90-95%', 'Hỗ trợ ưu tiên & xuất báo cáo'],
  ENTERPRISE: ['Chat không giới hạn', 'Toàn bộ tài liệu', 'Độ chính xác 95-98%', 'Hỗ trợ 24/7, tùy chỉnh AI & API'],
};

const DEFAULT_DESCRIPTIONS: Record<string, { vi: string; en: string }> = {
  TRIAL: { 
    vi: 'Thử nghiệm toàn bộ tính năng của nền tảng',
    en: 'Test all platform features'
  },
  STARTER: { 
    vi: 'Phù hợp cho doanh nghiệp nhỏ và startup',
    en: 'Perfect for small businesses and startups'
  },
  STANDARD: { 
    vi: 'Lý tưởng cho doanh nghiệp vừa và nhu cầu cao',
    en: 'Ideal for medium-sized businesses'
  },
  ENTERPRISE: { 
    vi: 'Giải pháp toàn diện cho doanh nghiệp lớn',
    en: 'Comprehensive solution for enterprises'
  },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; labelVi: string; labelEn: string }> = {
  ACTIVE: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', icon: 'checkmark-circle', labelVi: 'Hoạt động', labelEn: 'Active' },
  EXPIRED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', icon: 'alert-circle', labelVi: 'Hết hạn', labelEn: 'Expired' },
  CANCELLED: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', icon: 'close-circle', labelVi: 'Đã hủy cuối kỳ', labelEn: 'Cancelled at period end' },
  PENDING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: 'time', labelVi: 'Chờ xử lý', labelEn: 'Pending' },
};

const TIER_NAMES_VI: Record<string, string> = {
  STARTER: 'Khởi đầu',
  STANDARD: 'Tiêu chuẩn',
  ENTERPRISE: 'Doanh nghiệp',
  TRIAL: 'Dùng thử',
};

const TIER_NAMES_EN: Record<string, string> = {
  STARTER: 'Starter',
  STANDARD: 'Standard',
  ENTERPRISE: 'Enterprise',
  TRIAL: 'Trial',
};

const POPULAR_PLAN_CODE = 'STANDARD';

function isPopularPlan(plan: Pick<Plan, 'code' | 'tier' | 'id'>) {
  const code = (plan.code || plan.tier || plan.id || '').toString().toUpperCase();
  return code === POPULAR_PLAN_CODE;
}

export default function AdminSubscriptionScreen() {
  const { width, sz, fs } = useResponsive();
  const { language } = useLanguageStore();
  const t = translations[language];
  const { showToast, showSuccess, showError, showInfo, showConfirm } = useNotification();

  // Responsive values
  const isSmall = width < 375;
  const tabsPaddingTop = sz(12);
  const tabPaddingV = sz(12);
  const tabPaddingH = sz(16);
  const tabRadius = sz(10);
  const tabTextSize = fs(14);
  const contentPadding = sz(16);
  const contentPaddingBottom = sz(32);
  
  // Current Plan Card
  const currentPlanPadding = sz(20);
  const currentPlanRadius = sz(20);
  const planIconWrapSize = sz(56);
  const planIconRadius = sz(16);
  const currentPlanNameSize = fs(24);
  const statusBadgePaddingH = sz(10);
  const statusBadgePaddingV = sz(4);
  const statusBadgeRadius = sz(20);
  const statusTextSize = fs(12);
  const priceValueSize = fs(32);
  const pricePeriodSize = fs(16);
  const trialBadgePaddingH = sz(12);
  const trialBadgePaddingV = sz(6);
  const trialBadgeRadius = sz(20);
  const trialTextSize = fs(12);
  const currentPlanMetaGap = sz(12);
  const metaItemGap = sz(10);
  const metaLabelSize = fs(14);
  const cancelButtonPaddingV = sz(12);
  const cancelButtonRadius = sz(10);
  const cancelButtonTextSize = fs(14);
  const autoRenewButtonPaddingV = sz(12);
  const autoRenewButtonRadius = sz(10);
  const autoRenewButtonTextSize = fs(14);
  
  // Limits Card
  const limitsCardPadding = sz(16);
  const limitsCardRadius = sz(16);
  const limitsTitleSize = fs(16);
  const limitRowGap = sz(10);
  const limitRowMarginB = sz(8);
  const limitTextSize = fs(14);
  
  // Empty State
  const emptyIconSize = sz(80);
  const emptyIconRadius = sz(40);
  const emptyTitleSize = fs(20);
  const emptySubtitleSize = fs(14);
  const selectPlanBtnPaddingH = sz(24);
  const selectPlanBtnPaddingV = sz(14);
  const selectPlanBtnRadius = sz(12);
  const selectPlanBtnTextSize = fs(15);
  
  // Plans
  const plansPadding = sz(16);
  const cycleRowGap = sz(10);
  const cycleChipPaddingH = sz(16);
  const cycleChipPaddingV = sz(10);
  const cycleChipRadius = sz(12);
  const cycleChipTextSize = fs(14);
  const planCardPadding = sz(20);
  const planCardRadius = sz(20);
  const popularBadgePaddingH = sz(12);
  const popularBadgePaddingV = sz(6);
  const popularBadgeRadius = sz(20);
  const popularBadgeTextSize = fs(11);
  const planNameSize = fs(28);
  const planPriceSize = fs(32);
  const planPeriodSize = fs(14);
  const planDescTextSize = fs(14);
  const planDescLineHeight = fs(20);
  const planFeatureRowGap = sz(8);
  const planFeatureBulletSize = fs(16);
  const planFeatureBulletLineHeight = fs(20);
  const planFeatureTextSize = fs(14);
  const planFeatureLineHeight = fs(20);
  
  // Confirm Modal
  const confirmOverlayPadding = sz(20);
  const confirmModalPadding = sz(20);
  const confirmModalRadius = sz(20);
  const confirmModalTitleSize = fs(18);
  const confirmModalLabelSize = fs(12);
  const confirmModalValueSize = fs(16);
  const confirmModalPriceSize = fs(28);
  const confirmModalCycleLabelSize = fs(14);
  const confirmModalActionsGap = sz(10);
  const confirmModalBtnPaddingV = sz(13);
  const confirmModalBtnRadius = sz(12);
  const confirmModalBtnTextSize = fs(14);
  
  // Payment
  const paymentCardPadding = sz(20);
  const paymentCardRadius = sz(20);
  const paymentTitleSize = fs(20);
  const qrContainerPadding = sz(20);
  const qrContainerRadius = sz(16);
  const qrImageSize = sz(200);
  const qrHintSize = fs(13);
  const paymentInfoGap = sz(16);
  const paymentRowPaddingB = sz(12);
  const paymentLabelSize = fs(13);
  const paymentValueSize = fs(15);
  const paymentAmountSize = fs(18);
  const paymentContentPaddingH = sz(12);
  const paymentContentPaddingV = sz(8);
  const paymentContentRadius = sz(8);
  const paymentContentSize = fs(15);
  const expiresInfoPaddingH = sz(12);
  const expiresInfoPaddingV = sz(8);
  const expiresInfoRadius = sz(8);
  const expiresTextSize = fs(13);
  const paymentNoteSize = fs(13);
  const paymentNoteLineHeight = fs(20);
  const pollingStatusPaddingH = sz(14);
  const pollingStatusPaddingV = sz(12);
  const pollingStatusRadius = sz(12);
  const pollingStatusTextSize = fs(14);
  
  // Success Modal
  const successOverlayPadding = sz(20);
  const successModalPadding = sz(24);
  const successModalRadius = sz(24);
  const successTitleSize = fs(22);
  const successSubtitleSize = fs(14);
  const successSubtitleLineHeight = fs(20);
  const successDetailsPadding = sz(16);
  const successDetailsRadius = sz(16);
  const successDetailsRowGap = sz(12);
  const successDetailLabelSize = fs(13);
  const successDetailValueSize = fs(14);
  const successButtonPaddingV = sz(14);
  const successButtonRadius = sz(14);
  const successButtonTextSize = fs(15);
  
  // History
  const historyTitleSize = fs(18);
  const historySubtitleSize = fs(13);
  const historySubtitleLineHeight = fs(18);
  const historyCardPadding = sz(16);
  const historyCardRadius = sz(16);
  const historyTierBadgePaddingH = sz(10);
  const historyTierBadgePaddingV = sz(4);
  const historyTierBadgeRadius = sz(20);
  const historyTierTextSize = fs(12);
  const historyStatusBadgePaddingH = sz(10);
  const historyStatusBadgePaddingV = sz(4);
  const historyStatusBadgeRadius = sz(20);
  const historyStatusTextSize = fs(11);
  const historyAmountSize = fs(24);
  const historyRowMarginB = sz(8);
  const historyLabelSize = fs(11);
  const historyLabelLineHeight = fs(20);
  const historyValueSize = fs(14);

  const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { color: '#94a3b8', fontSize: 15 },

    tabsScroll: { maxHeight: 56 },
    tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8, paddingBottom: 4 },
    tab: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderRadius: 8, backgroundColor: '#1e293b' },
    tabActive: { backgroundColor: '#10b981' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
    tabTextActive: { color: '#fff' },

    content: { flex: 1, backgroundColor: '#0f172a' },
    contentPadding: { padding: 16, paddingBottom: 24 },

    currentPlanCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 0, marginBottom: 16 },
    currentPlanHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
    planIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    currentPlanInfo: { flex: 1 },
    currentPlanName: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    statusText: { fontSize: 12, fontWeight: '600' },

    currentPlanPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 16 },
    priceValue: { fontSize: 28, fontWeight: '700', color: '#f1f5f9' },
    pricePeriod: { fontSize: 14, color: '#64748b' },

    trialBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59, 130, 246, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 16 },
    trialText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },

    currentPlanMeta: { gap: 12, marginBottom: 16 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaLabel: { fontSize: 13, color: '#94a3b8' },

    cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(248, 113, 113, 0.1)', marginTop: 8 },
    cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#f87171' },

    autoRenewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(148, 163, 184, 0.1)', marginTop: 8 },
    autoRenewButtonText: { fontSize: 14, fontWeight: '600' },

    limitsCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
    limitsTitle: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', marginBottom: 12 },
    limitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    limitText: { fontSize: 14, color: '#94a3b8' },

    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
    selectPlanBtn: { backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    selectPlanBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

    plansContainer: { flex: 1, padding: 16, backgroundColor: '#0f172a' },
    cycleRow: { flexDirection: 'row', gap: 8, marginBottom: 16, justifyContent: 'center' },
    cycleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1e293b', borderWidth: 1.5, borderColor: '#334155' },
    cycleChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    cycleChipText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
    cycleChipTextActive: { color: '#fff' },
    plansScroll: { flex: 1 },

    planCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: 'transparent' },
    planCardPopular: { borderColor: '#34d399' },
    planCardCurrent: { borderWidth: 2, borderColor: '#22c55e' },
    planCardSelected: { borderWidth: 2, borderColor: '#10b981' },

    popularBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 1, backgroundColor: '#10b981' },
    popularBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    currentBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 1 },
    currentBadgeOnPopular: { top: 44 },
    currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    selectedIndicator: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    planHeader: { marginBottom: 16 },
    planName: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
    planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    planPrice: { fontSize: 24, fontWeight: '700', color: '#64748b' },
    planPeriod: { fontSize: 14, color: '#94a3b8', fontWeight: '400' },

    planDescriptionText: { fontSize: 14, color: '#94a3b8', marginBottom: 12, lineHeight: 20 },
    planDescriptionTextSelected: { color: '#e2e8f0' },

    planDescription: { marginBottom: 16, gap: 8 },
    planFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    planFeatureBullet: { fontSize: 16, lineHeight: 20, color: '#94a3b8', marginRight: -2 },
    planFeatureBulletSelected: { color: '#f1f5f9' },
    planFeatureText: { flex: 1, fontSize: 14, color: '#94a3b8', lineHeight: 20 },
    planFeatureTextSelected: { color: '#f1f5f9' },

    selectAction: { marginTop: 8, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    selectActionText: { fontSize: 14, fontWeight: '600', color: '#fff' },

    confirmSection: { marginTop: 8, marginBottom: 24 },
    confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 14 },
    confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    confirmNote: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 10 },

    confirmOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.82)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    confirmModal: { width: '100%', maxWidth: 420, backgroundColor: '#0f172a', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.16)' },
    confirmModalTitle: { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginBottom: 14 },
    confirmModalLabel: { fontSize: 12, color: '#94a3b8', marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
    confirmModalValue: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
    confirmModalPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    confirmModalPrice: { fontSize: 24, fontWeight: '700', color: '#10b981' },
    confirmModalCycleLabel: { fontSize: 14, color: '#94a3b8' },
    confirmModalActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
    confirmWarning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    confirmWarningText: {
      flex: 1,
      color: '#f59e0b',
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 18,
    },
    confirmModalCancel: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1e293b' },
    confirmModalCancelText: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
    confirmModalConfirm: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#10b981' },
    confirmModalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    paymentCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20 },
    paymentHeader: { alignItems: 'center', marginBottom: 24 },
    paymentTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginTop: 12 },
    qrContainer: { alignItems: 'center', marginBottom: 24, backgroundColor: '#fff', padding: 16, borderRadius: 12 },
    qrImage: { width: 180, height: 180 },
    qrHint: { fontSize: 13, color: '#64748b', marginTop: 12, textAlign: 'center' },
    paymentInfo: { gap: 12, marginBottom: 20 },
    paymentRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.1)', paddingBottom: 12 },
    paymentLabel: { fontSize: 13, color: '#64748b', marginBottom: 4 },
    paymentValue: { fontSize: 14, color: '#f1f5f9', fontWeight: '500' },
    paymentAmount: { fontSize: 20, color: '#22c55e', fontWeight: '700' },
    paymentContent: { fontSize: 14, color: '#10b981', fontWeight: '600', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    expiresInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 16 },
    expiresText: { fontSize: 13, color: '#f59e0b', fontWeight: '500' },
    paymentNote: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
    pollingStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(245, 158, 11, 0.12)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 16 },
    pollingStatusText: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },

    successOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    successModal: { width: '100%', maxWidth: 420, backgroundColor: '#0f172a', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', alignItems: 'center' },
    successIconWrap: { marginBottom: 16 },
    successTitle: { fontSize: 22, fontWeight: '700', color: '#f8fafc', textAlign: 'center', marginBottom: 8 },
    successSubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    successDetails: { width: '100%', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, gap: 12, marginBottom: 20 },
    successDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    successDetailLabel: { fontSize: 13, color: '#64748b' },
    successDetailValue: { fontSize: 14, fontWeight: '600', color: '#f1f5f9', textAlign: 'right', flex: 1 },
    successButton: { width: '100%', backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    successButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    historyHeader: { marginBottom: 16 },
    historyTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
    historySubtitle: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
    historyLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
    historyEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
    historyEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9', marginTop: 8 },
    historyEmptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
    historyCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
    historyCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
    historyTierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    historyTierText: { fontSize: 11, fontWeight: '700' },
    historyStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    historyStatusText: { fontSize: 11, fontWeight: '700' },
    historyAmount: { fontSize: 18, fontWeight: '700', color: '#10b981', marginBottom: 12 },
    historyRow: { marginBottom: 8 },
    historyLabel: { fontSize: 11, color: '#64748b', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
    historyValue: { fontSize: 13, color: '#e2e8f0', fontWeight: '500' },
  });

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'plans' | 'current' | 'payment' | 'history'>('current');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('MONTHLY');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const API_BASE = `${API_BASE_URL}/api/v1`;

  function getTierName(tier?: string): string {
    if (!tier) return '-';
    return language === 'vi' 
      ? (TIER_NAMES_VI[tier] || tier) 
      : (TIER_NAMES_EN[tier] || tier);
  }

  function getTierId(tier: string): string {
    return tier.toLowerCase();
  }

  function getPlanColor(tier?: string) {
    const name = tier?.toLowerCase() || '';
    switch (name) {
      case 'starter': return { primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'standard': return { primary: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' };
      case 'enterprise': return { primary: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' };
      case 'trial': return { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
      default: return { primary: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
    }
  }

  function getPlanIcon(tier?: string) {
    const name = tier?.toLowerCase() || '';
    switch (name) {
      case 'starter': return 'star';
      case 'standard': return 'rocket';
      case 'enterprise': return 'sparkles';
      case 'trial': return 'gift';
      default: return 'diamond';
    }
  }

  function mapPlanResponse(plan: any): Plan {
    const code = (plan.code || plan.tier || plan.name || 'PLAN').toString().toUpperCase();
    let features: string[] = [];
    
    if (typeof plan.features === 'string') {
      // Split by newline, then by comma+space to separate individual features
      features = plan.features
        .split(/\r?\n/)
        .flatMap((line: string) => line.split(/,\s+/)) // Split by ", " to preserve "2,000"
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
    } else if (Array.isArray(plan.features)) {
      features = plan.features;
    }

    // Clean features: remove ALL checkmarks, bullets, and special symbols
    const cleanedFeatures = features
      .map((f: string) => {
        // Remove checkmarks, bullets, dashes and other symbols from anywhere in the string
        return f
          .replace(/[✅✔☑✓◻️⬜▪•◆★✐✑✒✕✖✗✘✙✚✛✜✝✞✟]/g, ' ')
          .replace(/^[\s\-*•·]+/, '')
          .replace(/[\s\-*•·]+$/, '')
          .replace(/\s+/g, ' ')
          .trim();
      })
      .filter(f => f.length > 0);

    const descriptionData = DEFAULT_DESCRIPTIONS[code];
    const description = language === 'vi' ? descriptionData?.vi : descriptionData?.en;

    return {
      id: code.toLowerCase(),
      code,
      tier: code,
      name: plan.name || code,
      description,
      period: language === 'vi' ? 'tháng' : 'month',
      features: cleanedFeatures.length > 0 ? cleanedFeatures : (DEFAULT_FEATURES_BY_CODE[code] || []),
      recommended: code === POPULAR_PLAN_CODE,
      monthlyPrice: Number(plan.monthlyPrice || 0),
      quarterlyPrice: Number(plan.quarterlyPrice || 0),
      yearlyPrice: Number(plan.yearlyPrice || 0),
      displayOrder: plan.displayOrder,
      isActive: plan.isActive,
    };
  }

  function getSelectedPlan() {
    return availablePlans.find(plan => plan.id === selectedPlanId) || null;
  }

  function getPlanPrice(plan: Plan | null | undefined, cycle: BillingCycle) {
    if (!plan) return 0;
    if (cycle === 'QUARTERLY') return plan.quarterlyPrice || plan.monthlyPrice || 0;
    if (cycle === 'YEARLY') return plan.yearlyPrice || plan.monthlyPrice || 0;
    return plan.monthlyPrice || 0;
  }

  async function fetchSubscription() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/tenant-subscription/my-subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else if (res.status === 404) {
        setSubscription(null);
      }
    } catch (e) {
      console.warn('Failed to fetch subscription:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchPaymentHistory() {
    try {
      setHistoryLoading(true);
      const data = await getPaymentHistory();
      setPaymentHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Failed to fetch payment history:', e);
      setPaymentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchAvailablePlans() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/subscriptions/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch plans');
      const data = await res.json();
      const plans = (Array.isArray(data) ? data : []).map(mapPlanResponse).filter((plan: Plan) => plan.isActive !== false);
      setAvailablePlans(plans);
    } catch (e) {
      console.warn('Failed to fetch available plans:', e);
      setAvailablePlans([]);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
      fetchAvailablePlans();
      fetchPaymentHistory();
    }, [])
  );

  useEffect(() => {
    if (selectedTab === 'history') {
      fetchPaymentHistory();
    }
  }, [selectedTab]);

  useEffect(() => {
    const paymentId = paymentInfo?.payment_id;
    if (!paymentId) {
      setPaymentStatus(null);
      return;
    }

    let cancelled = false;
    const intervalMs = (paymentInfo.polling_interval_seconds ?? 5) * 1000;

    async function checkPaymentStatus() {
      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_BASE}/payment/status/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;

        const data = await res.json();
        setPaymentStatus(data.status);

        if (data.status === 'SUCCESS') {
          setPaymentInfo(null);
          setPaymentStatus(null);
          setSelectedTab('current');

          const subRes = await fetch(`${API_BASE}/tenant-subscription/my-subscription`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (subRes.ok && !cancelled) {
            setSubscription(await subRes.json());
            setShowPaymentSuccessModal(true);
            fetchPaymentHistory();
          }
        } else if (data.status === 'FAILED' || data.status === 'EXPIRED' || data.status === 'CANCELLED') {
          showError(
            language === 'vi'
              ? 'Thanh toán không thành công hoặc đã hết hạn. Vui lòng thử lại.'
              : 'Payment failed or expired. Please try again.',
            language === 'vi' ? 'Lỗi thanh toán' : 'Payment Error'
          );
        }
      } catch {
        // keep polling
      }
    }

    checkPaymentStatus();
    const interval = setInterval(checkPaymentStatus, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [paymentInfo?.payment_id, paymentInfo?.polling_interval_seconds, language, showError]);

  function onRefresh() {
    setRefreshing(true);
    fetchSubscription();
    fetchAvailablePlans();
    fetchPaymentHistory();
  }

  async function handleCheckPayment(paymentId: string) {
    const confirmed = await showConfirm({
      title: language === 'vi' ? 'Xác nhận thanh toán' : 'Confirm Payment',
      message: language === 'vi'
        ? 'Bạn đã chuyển khoản thành công? Nhấn Xác nhận để kích hoạt gói đăng ký.'
        : 'Have you transferred successfully? Press Confirm to activate your subscription.',
      confirmText: language === 'vi' ? 'Xác nhận đã chuyển tiền' : 'Confirm Transfer',
      cancelText: language === 'vi' ? 'Chưa' : 'Not yet',
      icon: 'checkmark-circle',
      iconColor: '#10b981',
    });
    if (!confirmed) return;

    try {
      await confirmPendingPayment(paymentId);
      await refreshUser();
      showSuccess(
        language === 'vi'
          ? 'Xác nhận thanh toán thành công! Gói đăng ký đã được kích hoạt.'
          : 'Payment confirmed! Your subscription is now active.',
        language === 'vi' ? 'Thành công' : 'Success'
      );
      fetchSubscription();
      fetchPaymentHistory();
      setSelectedTab('current');
      setShowPaymentSuccessModal(true);
    } catch (e: any) {
      showError(
        e?.message || (language === 'vi' ? 'Không thể xác nhận thanh toán.' : 'Cannot confirm payment.'),
        language === 'vi' ? 'Lỗi' : 'Error'
      );
    }
  }

  function getPaymentStatusInfo(status?: PaymentStatus | string) {
    switch (status) {
      case 'SUCCESS':
        return {
          label: language === 'vi' ? 'Đã thanh toán' : 'Paid',
          color: '#22c55e',
          bg: 'rgba(34, 197, 94, 0.12)',
          icon: 'checkmark-circle' as const,
        };
      case 'FAILED':
        return {
          label: language === 'vi' ? 'Thất bại' : 'Failed',
          color: '#f87171',
          bg: 'rgba(248, 113, 113, 0.12)',
          icon: 'close-circle' as const,
        };
      case 'EXPIRED':
        return {
          label: language === 'vi' ? 'Hết hạn' : 'Expired',
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          icon: 'time' as const,
        };
      case 'CANCELLED':
        return {
          label: language === 'vi' ? 'Đã hủy' : 'Cancelled',
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          icon: 'close-circle' as const,
        };
      default:
        return {
          label: language === 'vi' ? 'Chờ xử lý' : 'Pending',
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
          icon: 'time' as const,
        };
    }
  }

  function formatPrice(price?: number) {
    if (!price) return '-';
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  }

  function getStatusInfo(status?: string) {
    return STATUS_CONFIG[status || 'PENDING'] || STATUS_CONFIG.PENDING;
  }

  function getBillingCycleLabel(cycle?: string) {
    if (!cycle) return language === 'vi' ? 'tháng' : 'month';
    switch (cycle) {
      case 'YEARLY': return language === 'vi' ? 'năm' : 'year';
      case 'QUARTERLY': return language === 'vi' ? 'quý' : 'quarter';
      case 'MONTHLY': return language === 'vi' ? 'tháng' : 'month';
      default: return language === 'vi' ? 'tháng' : 'month';
    }
  }

  function closeConfirmModal() {
    setShowConfirmModal(false);
    setSelectedPlanId(null);
  }

  function openConfirmPlan(planId: string) {
    const plan = availablePlans.find(item => item.id === planId);
    if (!plan) {
      showError(
        language === 'vi' ? 'Không tìm thấy thông tin gói. Vui lòng thử lại.' : 'Plan not found. Please try again.',
        language === 'vi' ? 'Lỗi' : 'Error'
      );
      return;
    }
    setSelectedPlanId(planId);
    setSelectedCycle('MONTHLY');
    setPaymentInfo(null);
    setSelectedTab('plans');
    setShowConfirmModal(true);
  }

  async function startPurchase(planId: string) {
    const plan = availablePlans.find(item => item.id === planId);
    if (!plan) return;

    setSelectedPlanId(planId);
    setProcessing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/subscriptions/select-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: plan.code || plan.tier || 'STARTER',
          cycle: selectedCycle,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.payment_id) {
          setPaymentInfo(data as PaymentInfo);
          setSelectedTab('payment');
          setShowConfirmModal(false);
          showInfo(language === 'vi' ? 'Vui lòng hoàn tất thanh toán.' : 'Please complete your payment.', language === 'vi' ? 'Thông tin thanh toán' : 'Payment Information');
        } else {
          showSuccess(language === 'vi' ? 'Đã kích hoạt gói dùng thử!' : 'Trial plan activated!', language === 'vi' ? 'Thành công' : 'Success');
          fetchSubscription();
          setSelectedTab('current');
          setShowConfirmModal(false);
        }
      } else {
        showError(data?.error || data?.message || (language === 'vi' ? 'Không thể chọn gói.' : 'Cannot select plan.'), language === 'vi' ? 'Lỗi' : 'Error');
      }
    } catch (e) {
      showError(language === 'vi' ? 'Không thể kết nối máy chủ.' : 'Cannot connect to server.', language === 'vi' ? 'Lỗi' : 'Error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleSelectPlan() {
    if (!selectedPlanId) return;
    await startPurchase(selectedPlanId);
  }

  async function handleCancelSubscription() {
    const confirmed = await showConfirm({
      title: language === 'vi' ? 'Hủy gói' : 'Cancel Subscription',
      message: language === 'vi' ? 'Bạn có chắc muốn hủy gói này?' : 'Are you sure you want to cancel this subscription?',
      confirmText: language === 'vi' ? 'Hủy gói' : 'Cancel',
      cancelText: language === 'vi' ? 'Không' : 'No',
      confirmStyle: 'danger',
      icon: 'close-circle',
      iconColor: '#ef4444',
    });
    if (!confirmed) return;

    setProcessing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/subscriptions/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'User requested cancellation' }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showSuccess(language === 'vi' ? 'Đã huỷ gói thành công!' : 'Subscription cancelled successfully!', language === 'vi' ? 'Thành công' : 'Success');
        fetchSubscription();
      } else {
        showError(data?.error || (language === 'vi' ? 'Không thể huỷ gói.' : 'Cannot cancel subscription.'), language === 'vi' ? 'Lỗi' : 'Error');
      }
    } catch (e) {
      showError(language === 'vi' ? 'Không thể kết nối máy chủ.' : 'Cannot connect to server.', language === 'vi' ? 'Lỗi' : 'Error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleToggleAutoRenew() {
    if (!subscription) return;
    const nextValue = !subscription.auto_renew && !subscription.autoRenew;
    
    setProcessing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/subscriptions/auto-renew?autoRenew=${nextValue}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      
      if (res.ok) {
        showSuccess(
          nextValue
            ? (language === 'vi' ? 'Đã bật tự động gia hạn' : 'Auto-renew enabled')
            : (language === 'vi' ? 'Đã tắt tự động gia hạn' : 'Auto-renew disabled'),
          language === 'vi' ? 'Thành công' : 'Success'
        );
        fetchSubscription();
      } else {
        showError(data?.error || (language === 'vi' ? 'Không thể cập nhật.' : 'Cannot update.'), language === 'vi' ? 'Lỗi' : 'Error');
      }
    } catch (e) {
      showError(language === 'vi' ? 'Không thể kết nối máy chủ.' : 'Cannot connect to server.', language === 'vi' ? 'Lỗi' : 'Error');
    } finally {
      setProcessing(false);
    }
  }

  const tier = subscription?.tier;
  const colors = getPlanColor(tier);
  const statusInfo = getStatusInfo(subscription?.status);
  const isCancelled = !!subscription?.cancelledAt;
  const isTrial = subscription?.is_trial;

  if (loading) {
    return (
      <AppShell title={language === 'vi' ? 'Đăng ký gói' : 'Subscription'}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={language === 'vi' ? 'Đăng ký gói' : 'Subscription'}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'current' && styles.tabActive]}
          onPress={() => setSelectedTab('current')}
        >
          <Text style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>
            {language === 'vi' ? 'Gói hiện tại' : 'Current'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'plans' && styles.tabActive]}
          onPress={() => setSelectedTab('plans')}
        >
          <Text style={[styles.tabText, selectedTab === 'plans' && styles.tabTextActive]}>
            {language === 'vi' ? 'Các gói' : 'Plans'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'history' && styles.tabActive]}
          onPress={() => setSelectedTab('history')}
        >
          <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>
            {language === 'vi' ? 'Lịch sử GD' : 'History'}
          </Text>
        </TouchableOpacity>
        {paymentInfo && (
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'payment' && styles.tabActive]}
            onPress={() => setSelectedTab('payment')}
          >
            <Text style={[styles.tabText, selectedTab === 'payment' && styles.tabTextActive]}>
              {language === 'vi' ? 'Thanh toán' : 'Payment'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Current Plan Tab */}
      {selectedTab === 'current' && (
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          }
        >
          {subscription ? (
            <>
              {/* Current Plan Card */}
              <View style={styles.currentPlanCard}>
                <View style={styles.currentPlanHeader}>
                  <View style={[styles.planIconWrap, { backgroundColor: colors.bg }]}>
                    <Ionicons 
                      name={getPlanIcon(tier) as any} 
                      size={28} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={styles.currentPlanInfo}>
                    <Text style={styles.currentPlanName}>{getTierName(tier)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.labelVi}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.currentPlanPrice}>
                  <Text style={styles.priceValue}>{formatPrice(subscription.price)}</Text>
                  <Text style={styles.pricePeriod}>/ {getBillingCycleLabel(subscription.billing_cycle)}</Text>
                </View>

                {isTrial && (
                  <View style={styles.trialBadge}>
                    <Ionicons name="gift" size={14} color="#3b82f6" />
                    <Text style={styles.trialText}>
                      {language === 'vi' ? 'Gói dùng thử' : 'Trial Plan'}
                    </Text>
                  </View>
                )}

                <View style={styles.currentPlanMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <Text style={styles.metaLabel}>
                      {language === 'vi' ? 'Bắt đầu' : 'Start'}: {formatDate(subscription.start_date || subscription.startDate)}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color="#64748b" />
                    <Text style={styles.metaLabel}>
                      {language === 'vi' ? 'Hết hạn' : 'Expires'}: {formatDate(subscription.end_date || subscription.endDate || subscription.nextBillingDate)}
                    </Text>
                  </View>
                  {!isTrial && (
                    <View style={styles.metaItem}>
                      <Ionicons 
                        name={subscription.auto_renew || subscription.autoRenew ? 'repeat' : 'pause-circle-outline'} 
                        size={16} 
                        color={subscription.auto_renew || subscription.autoRenew ? '#22c55e' : '#64748b'} 
                      />
                      <Text style={[styles.metaLabel, { color: subscription.auto_renew || subscription.autoRenew ? '#22c55e' : '#64748b' }]}>
                        {subscription.auto_renew || subscription.autoRenew 
                          ? (language === 'vi' ? 'Tự động gia hạn' : 'Auto renew')
                          : (language === 'vi' ? 'Không tự động gia hạn' : 'No auto renew')
                        }
                      </Text>
                    </View>
                  )}
                </View>

                {/* Cancel Subscription Button */}
                {!isTrial && subscription.status === 'ACTIVE' && !isCancelled && (
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={handleCancelSubscription}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={18} color="#f87171" />
                    <Text style={styles.cancelButtonText}>
                      {language === 'vi' ? 'Huỷ gói' : 'Cancel Subscription'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Auto Renew Toggle */}
                {!isTrial && subscription.status === 'ACTIVE' && (
                  <TouchableOpacity 
                    style={styles.autoRenewButton}
                    onPress={handleToggleAutoRenew}
                    disabled={processing}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="swap-horizontal" size={18} color={subscription.auto_renew || subscription.autoRenew ? '#22c55e' : '#64748b'} />
                    <Text style={[styles.autoRenewButtonText, { color: subscription.auto_renew || subscription.autoRenew ? '#22c55e' : '#64748b' }]}>
                      {language === 'vi' 
                        ? ((subscription.auto_renew || subscription.autoRenew) ? 'Tắt tự động gia hạn' : 'Bật tự động gia hạn')
                        : ((subscription.auto_renew || subscription.autoRenew) ? 'Disable auto-renew' : 'Enable auto-renew')
                      }
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Limits Info */}
              {(subscription.max_users || subscription.max_documents || subscription.max_api_calls) && (
                <View style={styles.limitsCard}>
                  <Text style={styles.limitsTitle}>
                    {language === 'vi' ? 'Giới hạn sử dụng' : 'Usage Limits'}
                  </Text>
                  {subscription.max_users && (
                    <View style={styles.limitRow}>
                      <Ionicons name="people" size={16} color="#64748b" />
                      <Text style={styles.limitText}>
                        {language === 'vi' ? 'Người dùng' : 'Users'}: {subscription.max_users}
                      </Text>
                    </View>
                  )}
                  {subscription.max_documents && (
                    <View style={styles.limitRow}>
                      <Ionicons name="document-text" size={16} color="#64748b" />
                      <Text style={styles.limitText}>
                        {language === 'vi' ? 'Tài liệu' : 'Documents'}: {subscription.max_documents}
                      </Text>
                    </View>
                  )}
                  {subscription.max_api_calls && (
                    <View style={styles.limitRow}>
                      <Ionicons name="chatbubbles" size={16} color="#64748b" />
                      <Text style={styles.limitText}>
                        {language === 'vi' ? 'Lượt chat/tháng' : 'Chat requests/month'}: {subscription.max_api_calls.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="card-outline" size={48} color="#10b981" />
              </View>
              <Text style={styles.emptyTitle}>
                {language === 'vi' ? 'Chưa có gói đăng ký' : 'No subscription yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {language === 'vi' 
                  ? 'Chọn một gói phù hợp với nhu cầu của bạn'
                  : 'Choose a plan that fits your needs'
                }
              </Text>
              <TouchableOpacity 
                style={styles.selectPlanBtn}
                onPress={() => setSelectedTab('plans')}
              >
                <Text style={styles.selectPlanBtnText}>
                  {language === 'vi' ? 'Chọn gói ngay' : 'Select a plan'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Plans Tab */}
      {selectedTab === 'plans' && (
        <View style={styles.plansContainer}>
          <ScrollView style={styles.plansScroll} showsVerticalScrollIndicator={false}>
            {availablePlans.map((plan) => {
              const planColors = getPlanColor(plan.tier);
              const isCurrent = tier?.toLowerCase() === plan.id;
              const isSelected = selectedPlanId === plan.id;
              const isPopular = isPopularPlan(plan);
              const displayPrice = plan.monthlyPrice || 0;
              const cycleLabel = language === 'vi' ? 'tháng' : 'month';
              
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isPopular && styles.planCardPopular,
                    isCurrent && styles.planCardCurrent,
                    isSelected && styles.planCardSelected,
                  ]}
                  onPress={() => !isCurrent && openConfirmPlan(plan.id)}
                  activeOpacity={0.85}
                >
                  {isPopular && (
                    <View style={styles.popularBadge}>
                      <Ionicons name="star" size={10} color="#fff" />
                      <Text style={styles.popularBadgeText}>
                        {language === 'vi' ? 'Phổ biến' : 'Popular'}
                      </Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={[styles.currentBadge, isPopular && styles.currentBadgeOnPopular]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                      <Text style={styles.currentBadgeText}>
                        {language === 'vi' ? 'Gói hiện tại' : 'Current'}
                      </Text>
                    </View>
                  )}
                  {isSelected && !isCurrent && (
                    <View style={[styles.selectedIndicator, { backgroundColor: planColors.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}

                  <View style={styles.planHeader}>
                    <Text style={[styles.planName, isSelected && { color: '#f1f5f9' }]}>{plan.name}</Text>
                    <View style={styles.planPriceRow}>
                      <Text style={[styles.planPrice, { color: planColors.primary }]}>
                        {formatPrice(displayPrice)}
                      </Text>
                      <Text style={styles.planPeriod}>/{cycleLabel}</Text>
                    </View>
                  </View>

                  {plan.description && (
                    <Text style={[styles.planDescriptionText, isSelected && styles.planDescriptionTextSelected]}>
                      {plan.description}
                    </Text>
                  )}

                  <View style={styles.planDescription}>
                    {plan.features.map((feature, idx) => (
                      <View key={idx} style={styles.planFeatureRow}>
                        <Text style={[styles.planFeatureBullet, isSelected && styles.planFeatureBulletSelected]}>•</Text>
                        <Text style={[styles.planFeatureText, isSelected && styles.planFeatureTextSelected]}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Payment History Tab */}
      {selectedTab === 'history' && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing || historyLoading} onRefresh={onRefresh} tintColor="#10b981" />
          }
        >
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>
              {language === 'vi' ? 'Lịch sử giao dịch' : 'Transaction History'}
            </Text>
            <Text style={styles.historySubtitle}>
              {language === 'vi'
                ? 'Theo dõi các giao dịch thanh toán gói đăng ký'
                : 'Track subscription payment transactions'}
            </Text>
          </View>

          {historyLoading && paymentHistory.length === 0 ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>{t.loading}</Text>
            </View>
          ) : paymentHistory.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="receipt-outline" size={48} color="#64748b" />
              <Text style={styles.historyEmptyTitle}>
                {language === 'vi' ? 'Chưa có giao dịch' : 'No transactions yet'}
              </Text>
              <Text style={styles.historyEmptyText}>
                {language === 'vi'
                  ? 'Lịch sử sẽ hiện sau khi bạn thanh toán gói đăng ký.'
                  : 'History will appear after you make a subscription payment.'}
              </Text>
            </View>
          ) : (
            paymentHistory.map((item) => {
              const statusInfo = getPaymentStatusInfo(item.status);
              const tierColors = getPlanColor(item.tier);
              return (
                <View key={item.payment_id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <View style={[styles.historyTierBadge, { backgroundColor: tierColors.bg }]}>
                      <Text style={[styles.historyTierText, { color: tierColors.primary }]}>
                        {getTierName(item.tier)}
                      </Text>
                    </View>
                    <View style={[styles.historyStatusBadge, { backgroundColor: statusInfo.bg }]}>
                      <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
                      <Text style={[styles.historyStatusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.historyAmount}>
                    {typeof item.amount === 'number'
                      ? formatPrice(item.amount)
                      : '-'}
                  </Text>

                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>
                      {language === 'vi' ? 'Mã giao dịch' : 'Transaction code'}
                    </Text>
                    <Text style={styles.historyValue} numberOfLines={2}>
                      {item.transaction_code}
                    </Text>
                  </View>

                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>
                      {language === 'vi' ? 'Ngày tạo' : 'Created'}
                    </Text>
                    <Text style={styles.historyValue}>{formatDate(item.created_at)}</Text>
                  </View>

                  {item.paid_at && (
                    <View style={styles.historyRow}>
                      <Text style={styles.historyLabel}>
                        {language === 'vi' ? 'Ngày thanh toán' : 'Paid at'}
                      </Text>
                      <Text style={styles.historyValue}>{formatDate(item.paid_at)}</Text>
                    </View>
                  )}

                  {item.status === 'PENDING' && (
                    <TouchableOpacity
                      style={{ marginTop: 12, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
                      onPress={() => handleCheckPayment(item.payment_id)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 13 }}>
                        {language === 'vi' ? 'Kiểm tra thanh toán' : 'Check payment status'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={closeConfirmModal}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>
              {language === 'vi' ? 'Xác nhận đăng ký gói' : 'Confirm subscription'}
            </Text>

            <Text style={styles.confirmModalLabel}>
              {language === 'vi' ? 'Gói đã chọn' : 'Selected plan'}
            </Text>
            <Text style={styles.confirmModalValue}>
              {getSelectedPlan()?.name || '-'}
            </Text>

            <Text style={styles.confirmModalLabel}>
              {language === 'vi' ? 'Chu kỳ thanh toán' : 'Billing cycle'}
            </Text>
            <View style={styles.cycleRow}>
              {BILLING_CYCLES.map(cycle => {
                const isActive = selectedCycle === cycle.value;
                return (
                  <TouchableOpacity
                    key={cycle.value}
                    style={[styles.cycleChip, isActive && styles.cycleChipActive]}
                    onPress={() => setSelectedCycle(cycle.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cycleChipText, isActive && styles.cycleChipTextActive]}>
                      {language === 'vi' ? cycle.labelVi : cycle.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.confirmModalLabel}>
              {language === 'vi' ? 'Giá tiền' : 'Price'}
            </Text>
            <View style={styles.confirmModalPriceRow}>
              <Text style={styles.confirmModalPrice}>
                {formatPrice(getPlanPrice(getSelectedPlan(), selectedCycle))}
              </Text>
              <Text style={styles.confirmModalCycleLabel}>
                / {getBillingCycleLabel(selectedCycle)}
              </Text>
            </View>

            {subscription && subscription.status === 'ACTIVE' && !subscription.cancelledAt && (
              <View style={styles.confirmWarning}>
                <Ionicons name="information-circle" size={16} color="#f59e0b" />
                <Text style={styles.confirmWarningText}>
                  {language === 'vi'
                    ? 'Gói mới sẽ thay thế gói hiện tại khi thanh toán thành công. Gói cũ vẫn có hiệu lực đến hết kỳ thanh toán.'
                    : 'New plan will replace the current plan upon successful payment. The old plan remains active until end of billing period.'}
                </Text>
              </View>
            )}

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancel}
                onPress={closeConfirmModal}
                disabled={processing}
              >
                <Text style={styles.confirmModalCancelText}>
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalConfirm}
                onPress={handleSelectPlan}
                disabled={processing || !getSelectedPlan()}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmModalConfirmText}>
                    {language === 'vi' ? 'Tiếp tục thanh toán' : 'Continue to payment'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Tab */}
      {selectedTab === 'payment' && paymentInfo && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Ionicons name="qr-code" size={32} color="#10b981" />
              <Text style={styles.paymentTitle}>
                {language === 'vi' ? 'Thông tin thanh toán' : 'Payment Information'}
              </Text>
            </View>

            {paymentInfo.qr_image_url && (
              <View style={styles.qrContainer}>
                <Image 
                  source={{ uri: paymentInfo.qr_image_url }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrHint}>
                  {language === 'vi' ? 'Quét mã QR để thanh toán' : 'Scan QR code to pay'}
                </Text>
              </View>
            )}

            <View style={styles.paymentInfo}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  {language === 'vi' ? 'Mã giao dịch' : 'Transaction Code'}
                </Text>
                <Text style={styles.paymentValue}>{paymentInfo.transaction_code}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  {language === 'vi' ? 'Số tiền' : 'Amount'}
                </Text>
                <Text style={styles.paymentAmount}>{formatPrice(paymentInfo.amount)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  {language === 'vi' ? 'Ngân hàng' : 'Bank'}
                </Text>
                <Text style={styles.paymentValue}>{paymentInfo.bank_name || '-'}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  {language === 'vi' ? 'Số tài khoản' : 'Account Number'}
                </Text>
                <Text style={styles.paymentValue}>{paymentInfo.bank_account || '-'}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  {language === 'vi' ? 'Tên tài khoản' : 'Account Name'}
                </Text>
                <Text style={styles.paymentValue}>{paymentInfo.account_name || '-'}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  {language === 'vi' ? 'Nội dung chuyển khoản' : 'Transfer Content'}
                </Text>
                <Text style={styles.paymentContent}>{paymentInfo.qr_content || paymentInfo.transaction_code}</Text>
              </View>
            </View>

            {paymentInfo.expires_at && (
              <View style={styles.expiresInfo}>
                <Ionicons name="time-outline" size={14} color="#f59e0b" />
                <Text style={styles.expiresText}>
                  {language === 'vi' 
                    ? `Hết hạn: ${formatDate(paymentInfo.expires_at)}`
                    : `Expires: ${formatDate(paymentInfo.expires_at)}`
                  }
                </Text>
              </View>
            )}

            {(paymentStatus === 'PENDING' || !paymentStatus) && (
              <View style={styles.pollingStatus}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.pollingStatusText}>
                  {language === 'vi'
                    ? 'Đang chờ xác nhận thanh toán...'
                    : 'Waiting for payment confirmation...'}
                </Text>
              </View>
            )}

            <Text style={styles.paymentNote}>
              {language === 'vi' 
                ? 'Vui lòng chuyển khoản đúng số tiền và nội dung bên trên. Gói sẽ được kích hoạt sau khi thanh toán được xác nhận.'
                : 'Please transfer the exact amount with the content above. Your plan will be activated after payment is confirmed.'
              }
            </Text>
          </View>
        </ScrollView>
      )}

      <Modal
        visible={showPaymentSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentSuccessModal(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={72} color="#10b981" />
            </View>
            <Text style={styles.successTitle}>
              {language === 'vi' ? 'Thanh toán thành công!' : 'Payment Successful!'}
            </Text>
            <Text style={styles.successSubtitle}>
              {language === 'vi'
                ? 'Gói đăng ký của bạn đã được kích hoạt.'
                : 'Your subscription has been activated.'}
            </Text>

            {subscription && (
              <View style={styles.successDetails}>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>
                    {language === 'vi' ? 'Gói' : 'Plan'}
                  </Text>
                  <Text style={styles.successDetailValue}>{getTierName(subscription.tier)}</Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>
                    {language === 'vi' ? 'Chu kỳ' : 'Billing cycle'}
                  </Text>
                  <Text style={styles.successDetailValue}>
                    {getBillingCycleLabel(subscription.billing_cycle)}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>
                    {language === 'vi' ? 'Ngày kích hoạt' : 'Start date'}
                  </Text>
                  <Text style={styles.successDetailValue}>
                    {formatDate(subscription.start_date || subscription.startDate)}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>
                    {language === 'vi' ? 'Ngày hết hạn' : 'End date'}
                  </Text>
                  <Text style={styles.successDetailValue}>
                    {formatDate(subscription.end_date || subscription.endDate || subscription.nextBillingDate)}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowPaymentSuccessModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.successButtonText}>
                {language === 'vi' ? 'Xem gói hiện tại' : 'View current plan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}
