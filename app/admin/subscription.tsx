import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, ScrollView, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getAccessToken } from '../../lib/auth-store';

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
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  recommended?: boolean;
  tier: string;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    tier: 'STARTER',
    name: 'Starter',
    price: 299000,
    period: 'tháng',
    features: [
      '100 lượt chat/tháng',
      'Tài liệu cơ bản',
      'Độ chính xác 85-90%',
      'Hỗ trợ email',
    ],
  },
  {
    id: 'standard',
    tier: 'STANDARD',
    name: 'Standard',
    price: 999000,
    period: 'tháng',
    features: [
      '1,000 lượt chat/tháng',
      'Tài liệu mở rộng',
      'Độ chính xác 90-95%',
      'Hỗ trợ ưu tiên & xuất báo cáo',
    ],
    recommended: true,
  },
  {
    id: 'enterprise',
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    price: 2999000,
    period: 'tháng',
    features: [
      'Chat không giới hạn',
      'Toàn bộ tài liệu',
      'Độ chính xác 95-98%',
      'Hỗ trợ 24/7, tùy chỉnh AI & API',
    ],
  },
];

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

export default function AdminSubscriptionScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'plans' | 'current' | 'payment'>('current');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const API_BASE = 'http://10.0.2.2:8080/api/v1';

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

  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
    }, [])
  );

  function onRefresh() {
    setRefreshing(true);
    fetchSubscription();
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
      default: return language === 'vi' ? 'tháng' : 'month';
    }
  }

  async function handleSelectPlan(planId: string) {
    setSelectedPlanId(planId);
    setProcessing(true);
    try {
      const token = await getAccessToken();
      const plan = PLANS.find(p => p.id === planId);
      
      const res = await fetch(`${API_BASE}/subscriptions/select-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tier: plan?.tier || 'STARTER',
          cycle: 'MONTHLY'
        }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (res.ok) {
        if (data.payment_id) {
          // Paid plan - redirect to payment tab
          setPaymentInfo(data as PaymentInfo);
          setSelectedTab('payment');
          Alert.alert(
            language === 'vi' ? 'Thông tin thanh toán' : 'Payment Information',
            language === 'vi' ? 'Vui lòng hoàn tất thanh toán.' : 'Please complete your payment.'
          );
        } else {
          // Trial plan - success
          Alert.alert(
            language === 'vi' ? 'Thành công' : 'Success',
            language === 'vi' ? 'Đã kích hoạt gói dùng thử!' : 'Trial plan activated!',
            [{ text: 'OK', onPress: () => {
              fetchSubscription();
              setSelectedTab('current');
            }}]
          );
        }
      } else {
        Alert.alert(
          language === 'vi' ? 'Lỗi' : 'Error',
          data?.error || data?.message || (language === 'vi' ? 'Không thể chọn gói.' : 'Cannot select plan.')
        );
        setSelectedPlanId(null);
      }
    } catch (e) {
      Alert.alert(
        language === 'vi' ? 'Lỗi' : 'Error',
        language === 'vi' ? 'Không thể kết nối máy chủ.' : 'Cannot connect to server.'
      );
      setSelectedPlanId(null);
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelSubscription() {
    Alert.prompt(
      language === 'vi' ? 'Lý do hủy' : 'Cancellation Reason',
      language === 'vi' ? 'Vui lòng nhập lý do hủy gói:' : 'Please enter reason for cancellation:',
      [
        { text: language === 'vi' ? 'Không' : 'Cancel', style: 'cancel' },
        { 
          text: language === 'vi' ? 'Huỷ gói' : 'Confirm', 
          onPress: async (reason) => {
            setProcessing(true);
            try {
              const token = await getAccessToken();
              const res = await fetch(`${API_BASE}/subscriptions/cancel`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: reason || 'User requested cancellation' }),
              });
              const data = await res.json().catch(() => ({}));
              
              if (res.ok) {
                Alert.alert(
                  language === 'vi' ? 'Thành công' : 'Success',
                  language === 'vi' ? 'Đã huỷ gói thành công!' : 'Subscription cancelled successfully!',
                );
                fetchSubscription();
              } else {
                Alert.alert(
                  language === 'vi' ? 'Lỗi' : 'Error',
                  data?.error || (language === 'vi' ? 'Không thể huỷ gói.' : 'Cannot cancel subscription.')
                );
              }
            } catch (e) {
              Alert.alert(
                language === 'vi' ? 'Lỗi' : 'Error',
                language === 'vi' ? 'Không thể kết nối máy chủ.' : 'Cannot connect to server.'
              );
            } finally {
              setProcessing(false);
            }
          }
        },
      ],
      'plain-text'
    );
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
        Alert.alert(
          language === 'vi' ? 'Thành công' : 'Success',
          nextValue 
            ? (language === 'vi' ? 'Đã bật tự động gia hạn' : 'Auto-renew enabled')
            : (language === 'vi' ? 'Đã tắt tự động gia hạn' : 'Auto-renew disabled')
        );
        fetchSubscription();
      } else {
        Alert.alert(
          language === 'vi' ? 'Lỗi' : 'Error',
          data?.error || (language === 'vi' ? 'Không thể cập nhật.' : 'Cannot update.')
        );
      }
    } catch (e) {
      Alert.alert(
        language === 'vi' ? 'Lỗi' : 'Error',
        language === 'vi' ? 'Không thể kết nối máy chủ.' : 'Cannot connect to server.'
      );
    } finally {
      setProcessing(false);
    }
  }

  function selectPlan(planId: string) {
    setSelectedPlanId(planId);
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
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'current' && styles.tabActive]}
          onPress={() => setSelectedTab('current')}
        >
          <Text style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>
            {language === 'vi' ? 'Gói hiện tại' : 'Current Plan'}
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
      </View>

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
          <Text style={styles.plansSubtitle}>
            {language === 'vi' 
              ? 'Chọn gói phù hợp với nhu cầu của bạn'
              : 'Choose the plan that fits your needs'
            }
          </Text>

          <ScrollView style={styles.plansScroll} showsVerticalScrollIndicator={false}>
            {PLANS.map((plan) => {
              const planColors = getPlanColor(plan.tier);
              const isCurrent = tier?.toLowerCase() === plan.id;
              const isSelected = selectedPlanId === plan.id;
              
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    plan.recommended && styles.planCardRecommended,
                    isCurrent && styles.planCardCurrent,
                    isSelected && styles.planCardSelected,
                  ]}
                  onPress={() => !isCurrent && selectPlan(plan.id)}
                  activeOpacity={0.85}
                >
                  {plan.recommended && !isCurrent && (
                    <View style={[styles.recommendedBadge, { backgroundColor: planColors.primary }]}>
                      <Ionicons name="star" size={10} color="#fff" />
                      <Text style={styles.recommendedBadgeText}>
                        {language === 'vi' ? 'Phổ biến' : 'Popular'}
                      </Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={styles.currentBadge}>
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
                    <View style={[styles.planIcon, { backgroundColor: isSelected ? planColors.bg : 'rgba(100, 116, 139, 0.1)' }]}>
                      <Ionicons 
                        name={getPlanIcon(plan.tier) as any} 
                        size={28} 
                        color={isSelected ? planColors.primary : '#64748b'} 
                      />
                    </View>
                    <View style={styles.planTitleGroup}>
                      <Text style={[styles.planName, isSelected && { color: '#f1f5f9' }]}>{plan.name}</Text>
                      <Text style={[styles.planPrice, isSelected && { color: planColors.primary }]}>
                        {formatPrice(plan.price)}
                        <Text style={styles.planPeriod}>/{plan.period}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={16} color={isSelected ? planColors.primary : '#64748b'} />
                        <Text style={[styles.featureText, isSelected && styles.featureTextSelected]}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {isSelected && !isCurrent && (
                    <View style={[styles.selectAction, { backgroundColor: planColors.primary }]}>
                      <Text style={styles.selectActionText}>
                        {language === 'vi' ? 'Đã chọn gói này' : 'Plan selected'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Confirm Button */}
            {selectedPlanId && (
              <View style={styles.confirmSection}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => handleSelectPlan(selectedPlanId)}
                  disabled={processing}
                  activeOpacity={0.8}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="card" size={20} color="#fff" />
                      <Text style={styles.confirmButtonText}>
                        {language === 'vi' ? `Thanh toán gói ${PLANS.find(p => p.id === selectedPlanId)?.name}` : `Pay for ${PLANS.find(p => p.id === selectedPlanId)?.name} Plan`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.confirmNote}>
                  {language === 'vi' 
                    ? 'Bạn sẽ được chuyển đến trang thanh toán'
                    : 'You will be redirected to payment page'
                  }
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

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

            <Text style={styles.paymentNote}>
              {language === 'vi' 
                ? 'Vui lòng chuyển khoản đúng số tiền và nội dung bên trên. Gói sẽ được kích hoạt sau khi thanh toán được xác nhận.'
                : 'Please transfer the exact amount with the content above. Your plan will be activated after payment is confirmed.'
              }
            </Text>
          </View>
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 15 },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#1e293b' },
  tabActive: { backgroundColor: '#10b981' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#fff' },

  content: { flex: 1 },
  contentPadding: { padding: 16, paddingBottom: 32 },

  // Current Plan Card
  currentPlanCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, borderWidth: 0, marginBottom: 16 },
  currentPlanHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  planIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  currentPlanInfo: { flex: 1 },
  currentPlanName: { fontSize: 24, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '600' },
  
  currentPlanPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 16 },
  priceValue: { fontSize: 32, fontWeight: '700', color: '#f1f5f9' },
  pricePeriod: { fontSize: 16, color: '#64748b' },

  trialBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59, 130, 246, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  trialText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },

  currentPlanMeta: { gap: 12, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaLabel: { fontSize: 14, color: '#94a3b8' },

  cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(248, 113, 113, 0.1)', marginTop: 8 },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#f87171' },

  autoRenewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(148, 163, 184, 0.1)', marginTop: 8 },
  autoRenewButtonText: { fontSize: 14, fontWeight: '600' },

  // Limits Card
  limitsCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  limitsTitle: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', marginBottom: 12 },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  limitText: { fontSize: 14, color: '#94a3b8' },

  // Empty State
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  selectPlanBtn: { backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  selectPlanBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Plans
  plansContainer: { flex: 1, padding: 16 },
  plansSubtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 16 },
  plansScroll: { flex: 1 },

  planCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, paddingTop: 24, marginBottom: 16, borderWidth: 0, position: 'relative', overflow: 'visible' },
  planCardRecommended: { borderWidth: 0 },
  planCardCurrent: { borderWidth: 2, borderColor: '#22c55e' },
  planCardSelected: { borderWidth: 2, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)' },

  recommendedBadge: { position: 'absolute', top: -10, left: 16, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, zIndex: 1 },
  recommendedBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  currentBadge: { position: 'absolute', top: -10, left: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, zIndex: 1 },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  selectedIndicator: { position: 'absolute', top: -10, right: 16, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  planIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  planTitleGroup: { flex: 1 },
  planName: { fontSize: 22, fontWeight: '700', color: '#94a3b8' },
  planPrice: { fontSize: 24, fontWeight: '700', color: '#64748b', marginTop: 2 },
  planPeriod: { fontSize: 14, color: '#64748b', fontWeight: '400' },

  planFeatures: { marginBottom: 12, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, color: '#64748b', flex: 1 },
  featureTextSelected: { color: '#f1f5f9', fontWeight: '500' },

  selectAction: { marginTop: 8, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  selectActionText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  confirmSection: { marginTop: 8, marginBottom: 24 },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 14 },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  confirmNote: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 10 },

  // Payment
  paymentCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20 },
  paymentHeader: { alignItems: 'center', marginBottom: 24 },
  paymentTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginTop: 12 },
  qrContainer: { alignItems: 'center', marginBottom: 24, backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  qrImage: { width: 200, height: 200 },
  qrHint: { fontSize: 13, color: '#64748b', marginTop: 12, textAlign: 'center' },
  paymentInfo: { gap: 16, marginBottom: 20 },
  paymentRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.1)', paddingBottom: 12 },
  paymentLabel: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  paymentValue: { fontSize: 15, color: '#f1f5f9', fontWeight: '500' },
  paymentAmount: { fontSize: 18, color: '#22c55e', fontWeight: '700' },
  paymentContent: { fontSize: 15, color: '#10b981', fontWeight: '600', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  expiresInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 16 },
  expiresText: { fontSize: 13, color: '#f59e0b', fontWeight: '500' },
  paymentNote: { fontSize: 13, color: '#94a3b8', lineHeight: 20 },
});
