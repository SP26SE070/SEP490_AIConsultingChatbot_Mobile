import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getAccessToken } from '../../lib/auth-store';
import { API_BASE_URL } from '../../lib/api/config';
import { ConfirmModal, SuccessModal, ErrorModal } from '../../components/ui/CustomModal';

interface Tenant {
  id: string;
  name: string;
  address?: string;
  website?: string;
  companySize?: string;
  contactEmail: string;
  representativeName?: string;
  representativePosition?: string;
  representativePhone?: string;
  requestMessage?: string;
  requestedAt?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  reviewedByName?: string;
  approvedByName?: string;
  rejectedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', labelVi: 'Chờ duyệt', labelEn: 'Pending', icon: 'time-outline' },
  ACTIVE: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', labelVi: 'Hoạt động', labelEn: 'Active', icon: 'checkmark-circle-outline' },
  SUSPENDED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', labelVi: 'Tạm ngưng', labelEn: 'Suspended', icon: 'pause-circle-outline' },
  REJECTED: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', labelVi: 'Từ chối', labelEn: 'Rejected', icon: 'close-circle-outline' },
};

export default function StaffOrganizationsScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const isVi = language === 'vi';
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);

  // Modal states
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  async function fetchTenants() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/staff/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTenants(data.content || data || []);
    } catch (e) {
      console.warn('Failed to fetch tenants:', e);
      setTenants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchTenants();
    }, [])
  );

  function openDetail(tenant: Tenant) {
    setSelectedTenant(tenant);
    setDetailModalOpen(true);
  }

  async function handleApprove(tenantId: string, closeAfter = false) {
    setProcessing(tenantId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/staff/tenants/${tenantId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccessMessage(isVi ? 'Đã duyệt tổ chức. Email với thông tin đăng nhập đã được gửi.' : 'Tenant approved. Email with login information has been sent.');
        setShowSuccessModal(true);
        if (closeAfter) {
          setDetailModalOpen(false);
          setSelectedTenant(null);
        }
        fetchTenants();
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(errData?.message || (isVi ? 'Không thể duyệt tổ chức' : 'Cannot approve tenant'));
        setShowErrorModal(true);
      }
    } catch (e) {
      setErrorMessage(isVi ? 'Đã xảy ra lỗi' : 'An error occurred');
      setShowErrorModal(true);
    } finally {
      setProcessing(null);
    }
  }

  function openApproveConfirm(tenantId: string) {
    setPendingActionId(tenantId);
    setShowApproveConfirm(true);
  }

  function openRejectModal(tenantId: string) {
    setPendingTenantId(tenantId);
    setRejectReason('');
    setShowRejectModal(true);
  }

  async function handleReject() {
    if (!pendingTenantId) return;
    
    setProcessing(pendingTenantId);
    try {
      const token = await getAccessToken();
      const reasonParam = rejectReason.trim() ? `?reason=${encodeURIComponent(rejectReason.trim())}` : '';
      const res = await fetch(`${API_BASE_URL}/api/v1/staff/tenants/${pendingTenantId}/reject${reasonParam}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShowRejectModal(false);
        setDetailModalOpen(false);
        setSelectedTenant(null);
        fetchTenants();
      } else {
        const errData = await res.json().catch(() => null);
        Alert.alert(t.error, errData?.message || (isVi ? 'Không thể từ chối tổ chức' : 'Cannot reject tenant'));
      }
    } catch (e) {
      Alert.alert(t.error, isVi ? 'Đã xảy ra lỗi' : 'An error occurred');
    } finally {
      setProcessing(null);
      setPendingTenantId(null);
    }
  }

  async function handleResendCredentials(tenantId: string) {
    setProcessing(tenantId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/staff/tenants/${tenantId}/resend-credentials`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccessMessage(isVi ? 'Đã gửi lại thông tin đăng nhập qua email.' : 'Login information has been resent via email.');
        setShowSuccessModal(true);
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(errData?.message || (isVi ? 'Không thể gửi lại' : 'Cannot resend'));
        setShowErrorModal(true);
      }
    } catch (e) {
      setErrorMessage(isVi ? 'Đã xảy ra lỗi' : 'An error occurred');
      setShowErrorModal(true);
    } finally {
      setProcessing(null);
    }
  }

  function openResendConfirm(tenantId: string) {
    setPendingActionId(tenantId);
    setShowResendConfirm(true);
  }

  async function handleSuspend(tenantId: string) {
    setProcessing(tenantId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/staff/tenants/${tenantId}/suspend`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDetailModalOpen(false);
        setSelectedTenant(null);
        fetchTenants();
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(errData?.message || (isVi ? 'Không thể tạm ngưng' : 'Cannot suspend'));
        setShowErrorModal(true);
      }
    } catch (e) {
      setErrorMessage(isVi ? 'Đã xảy ra lỗi' : 'An error occurred');
      setShowErrorModal(true);
    } finally {
      setProcessing(null);
    }
  }

  function openSuspendConfirm(tenantId: string) {
    setPendingActionId(tenantId);
    setShowSuspendConfirm(true);
  }

  async function handleActivate(tenantId: string) {
    setProcessing(tenantId);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/staff/tenants/${tenantId}/activate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDetailModalOpen(false);
        setSelectedTenant(null);
        fetchTenants();
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(errData?.message || (isVi ? 'Không thể kích hoạt' : 'Cannot activate'));
        setShowErrorModal(true);
      }
    } catch (e) {
      setErrorMessage(isVi ? 'Đã xảy ra lỗi' : 'An error occurred');
      setShowErrorModal(true);
    } finally {
      setProcessing(null);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchTenants();
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function getStatusInfo(status: string) {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
  }

  const pendingCount = tenants.filter(t => t.status === 'PENDING').length;

  if (loading) {
    return (
      <AppShell title={t.approveTenant} subtitle={isVi ? 'Quản lý tổ chức' : 'Manage Tenants'}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={t.approveTenant} subtitle={isVi ? 'Quản lý tổ chức' : 'Manage Tenants'}>
      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Ionicons name="time-outline" size={18} color="#f59e0b" />
          </View>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>{isVi ? 'Chờ duyệt' : 'Pending'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
          </View>
          <Text style={styles.summaryValue}>{tenants.filter(t => t.status === 'ACTIVE').length}</Text>
          <Text style={styles.summaryLabel}>{isVi ? 'Hoạt động' : 'Active'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(148, 163, 184, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
            <Ionicons name="business-outline" size={18} color="#94a3b8" />
          </View>
          <Text style={styles.summaryValue}>{tenants.length}</Text>
          <Text style={styles.summaryLabel}>{isVi ? 'Tổng cộng' : 'Total'}</Text>
        </View>
      </View>

      {/* Tenant List */}
      <FlatList
        data={tenants}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="business-outline" size={40} color="#10b981" />
            </View>
            <Text style={styles.emptyTitle}>{isVi ? 'Chưa có tổ chức nào' : 'No organizations yet'}</Text>
            <Text style={styles.emptySubtitle}>{isVi ? 'Danh sách tổ chức đăng ký sẽ xuất hiện tại đây' : 'Registered organizations will appear here'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = getStatusInfo(item.status);
          const isPending = item.status === 'PENDING';
          const isProcessingThis = processing === item.id;

          return (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => openDetail(item)}
              activeOpacity={0.75}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: statusInfo.bg }]}>
                    <Ionicons name={statusInfo.icon as any} size={18} color={statusInfo.color} />
                  </View>
                  <View style={styles.cardTitleGroup}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardEmail} numberOfLines={1}>{item.contactEmail}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                    {isVi ? statusInfo.labelVi : statusInfo.labelEn}
                  </Text>
                </View>
              </View>

              {/* Representative */}
              {item.representativeName && (
                <View style={styles.repRow}>
                  <View style={styles.repItem}>
                    <Ionicons name="person-outline" size={13} color="#64748b" />
                    <Text style={styles.repText}>{item.representativeName}</Text>
                  </View>
                  {item.representativePosition && (
                    <Text style={styles.repSep}>·</Text>
                  )}
                  {item.representativePosition && (
                    <View style={styles.repItem}>
                      <Ionicons name="briefcase-outline" size={13} color="#64748b" />
                      <Text style={styles.repText}>{item.representativePosition}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.cardFooter}>
                {isPending ? (
                  <>
                    <TouchableOpacity
                      style={styles.actionReject}
                      onPress={() => openRejectModal(item.id)}
                      disabled={isProcessingThis}
                    >
                      <Ionicons name="close-circle" size={15} color="#f87171" />
                      <Text style={styles.actionRejectText}>{isVi ? 'Từ chối' : 'Reject'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionApprove, isProcessingThis && styles.actionDisabled]}
                      onPress={() => openApproveConfirm(item.id)}
                      disabled={isProcessingThis}
                    >
                      {isProcessingThis ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={15} color="#fff" />
                          <Text style={styles.actionApproveText}>{isVi ? 'Duyệt' : 'Approve'}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailText}>{isVi ? 'Xem chi tiết' : 'View details'}</Text>
                    <Ionicons name="chevron-forward" size={15} color="#10b981" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Detail Modal */}
      <Modal
        visible={detailModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{isVi ? 'Chi tiết tổ chức' : 'Organization Details'}</Text>
            <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#f1f5f9" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {selectedTenant && (
              <>
                {/* Status Banner */}
                <View style={styles.statusBanner}>
                  {(() => {
                    const info = getStatusInfo(selectedTenant.status);
                    return (
                      <View style={[styles.statusBannerInner, { backgroundColor: info.bg }]}>
                        <Ionicons name={info.icon as any} size={22} color={info.color} />
                        <Text style={[styles.statusBannerText, { color: info.color }]}>
                          {isVi ? info.labelVi : info.labelEn}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Company Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="business" size={15} color="#10b981" /> {isVi ? 'Thông tin công ty' : 'Company Information'}
                  </Text>
                  <View style={styles.infoCard}>
                    <InfoRow label={isVi ? 'Tên công ty' : 'Company Name'} value={selectedTenant.name} />
                    <InfoRow label={isVi ? 'Email liên hệ' : 'Contact Email'} value={selectedTenant.contactEmail} />
                    {selectedTenant.address && <InfoRow label={isVi ? 'Địa chỉ' : 'Address'} value={selectedTenant.address} />}
                    {selectedTenant.website && <InfoRow label={isVi ? 'Website' : 'Website'} value={selectedTenant.website} isLink />}
                    {selectedTenant.companySize && <InfoRow label={isVi ? 'Quy mô' : 'Company Size'} value={selectedTenant.companySize} />}
                  </View>
                </View>

                {/* Representative Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="person" size={15} color="#10b981" /> {isVi ? 'Người đại diện' : 'Representative'}
                  </Text>
                  <View style={styles.infoCard}>
                    {selectedTenant.representativeName && <InfoRow label={isVi ? 'Họ tên' : 'Full Name'} value={selectedTenant.representativeName} />}
                    {selectedTenant.representativePosition && <InfoRow label={isVi ? 'Chức vụ' : 'Position'} value={selectedTenant.representativePosition} />}
                    {selectedTenant.representativePhone && <InfoRow label={isVi ? 'Điện thoại' : 'Phone'} value={selectedTenant.representativePhone} />}
                  </View>
                </View>

                {/* Request Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="document-text" size={15} color="#10b981" /> {isVi ? 'Yêu cầu đăng ký' : 'Registration Request'}
                  </Text>
                  <View style={styles.infoCard}>
                    <InfoRow label={isVi ? 'Ngày đăng ký' : 'Request Date'} value={formatDate(selectedTenant.requestedAt || selectedTenant.createdAt)} />
                    {selectedTenant.requestMessage && (
                      <View style={styles.messageBox}>
                        <Text style={styles.messageLabel}>{isVi ? 'Lời nhắn' : 'Message'}</Text>
                        <Text style={styles.messageText}>"{selectedTenant.requestMessage}"</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Review Info */}
                {(selectedTenant.reviewedAt || selectedTenant.rejectionReason) && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      <Ionicons name="shield-checkmark" size={15} color="#10b981" /> {isVi ? 'Thông tin duyệt' : 'Review Information'}
                    </Text>
                    <View style={styles.infoCard}>
                      {selectedTenant.approvedByName && <InfoRow label={isVi ? 'Người duyệt' : 'Approved By'} value={selectedTenant.approvedByName} />}
                      {selectedTenant.rejectedByName && <InfoRow label={isVi ? 'Người từ chối' : 'Rejected By'} value={selectedTenant.rejectedByName} />}
                      {selectedTenant.reviewedAt && <InfoRow label={isVi ? 'Ngày duyệt' : 'Reviewed At'} value={formatDate(selectedTenant.reviewedAt)} />}
                      {selectedTenant.rejectionReason && (
                        <View style={styles.messageBox}>
                          <Text style={styles.messageLabel}>{isVi ? 'Lý do từ chối' : 'Rejection Reason'}</Text>
                          <Text style={styles.messageText}>{selectedTenant.rejectionReason}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Login Info Notice */}
                {selectedTenant.status === 'ACTIVE' && (
                  <View style={styles.loginInfoNotice}>
                    <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                    <Text style={styles.loginInfoText}>
                      {isVi ? 'Thông tin đăng nhập đã được gửi qua email đến' : 'Login credentials have been sent via email to'}
                      {' '}{selectedTenant.contactEmail}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Modal Actions */}
          {selectedTenant && (
            <View style={styles.modalActions}>
              {selectedTenant.status === 'PENDING' && (
                <>
                  <TouchableOpacity
                    style={styles.actionRejectLarge}
                    onPress={() => {
                      setDetailModalOpen(false);
                      openRejectModal(selectedTenant.id);
                    }}
                    disabled={processing === selectedTenant.id}
                  >
                    <Ionicons name="close-circle" size={20} color="#f87171" />
                    <Text style={styles.actionRejectLargeText}>{isVi ? 'Từ chối' : 'Reject'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionApproveLarge, processing === selectedTenant.id && styles.actionDisabled]}
                    onPress={() => openApproveConfirm(selectedTenant.id)}
                    disabled={processing === selectedTenant.id}
                  >
                    {processing === selectedTenant.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.actionApproveLargeText}>{isVi ? 'Duyệt tổ chức' : 'Approve'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
              {selectedTenant.status === 'ACTIVE' && (
                <>
                  <TouchableOpacity
                    style={styles.actionResend}
                    onPress={() => openResendConfirm(selectedTenant.id)}
                    disabled={processing === selectedTenant.id}
                  >
                    {processing === selectedTenant.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="mail-outline" size={20} color="#fff" />
                        <Text style={styles.actionResendText}>{isVi ? 'Gửi lại thông tin' : 'Resend Credentials'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionSuspendLarge}
                    onPress={() => openSuspendConfirm(selectedTenant.id)}
                    disabled={processing === selectedTenant.id}
                  >
                    <Ionicons name="pause-circle" size={20} color="#f87171" />
                    <Text style={styles.actionSuspendLargeText}>{isVi ? 'Tạm ngưng' : 'Suspend'}</Text>
                  </TouchableOpacity>
                </>
              )}
              {selectedTenant.status === 'SUSPENDED' && (
                <>
                  <TouchableOpacity
                    style={styles.actionActivateLarge}
                    onPress={() => handleActivate(selectedTenant.id)}
                    disabled={processing === selectedTenant.id}
                  >
                    {processing === selectedTenant.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="play-circle" size={20} color="#fff" />
                        <Text style={styles.actionActivateLargeText}>{isVi ? 'Kích hoạt lại' : 'Activate'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModalContent}>
            <View style={styles.rejectModalHeader}>
              <Text style={styles.rejectModalTitle}>{isVi ? 'Lý do từ chối' : 'Rejection Reason'}</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={22} color="#f1f5f9" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.rejectInput}
              placeholder={isVi ? 'Nhập lý do từ chối (tùy chọn)' : 'Enter rejection reason (optional)'}
              placeholderTextColor="#64748b"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={styles.rejectCancelBtn}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.rejectCancelText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectConfirmBtn}
                onPress={handleReject}
                disabled={processing === pendingTenantId}
              >
                {processing === pendingTenantId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.rejectConfirmText}>{isVi ? 'Xác nhận từ chối' : 'Confirm Reject'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        visible={showApproveConfirm}
        title={isVi ? 'Xác nhận duyệt' : 'Confirm Approval'}
        message={isVi ? 'Bạn có chắc muốn duyệt tổ chức này? Thông tin đăng nhập sẽ được gửi qua email.' : 'Are you sure you want to approve this tenant? Login information will be sent via email.'}
        confirmText={isVi ? 'Duyệt' : 'Approve'}
        icon="checkmark-circle"
        iconColor="#10b981"
        onConfirm={() => {
          setShowApproveConfirm(false);
          if (pendingActionId) handleApprove(pendingActionId, true);
        }}
        onCancel={() => setShowApproveConfirm(false)}
        loading={processing === pendingActionId}
      />

      {/* Resend Credentials Confirmation Modal */}
      <ConfirmModal
        visible={showResendConfirm}
        title={isVi ? 'Gửi lại thông tin' : 'Resend Credentials'}
        message={isVi ? 'Gửi lại email chứa thông tin đăng nhập cho tổ chức này?' : 'Resend email with login information to this organization?'}
        confirmText={isVi ? 'Gửi' : 'Send'}
        icon="mail"
        iconColor="#3b82f6"
        onConfirm={() => {
          setShowResendConfirm(false);
          if (pendingActionId) handleResendCredentials(pendingActionId);
        }}
        onCancel={() => setShowResendConfirm(false)}
        loading={processing === pendingActionId}
      />

      {/* Suspend Confirmation Modal */}
      <ConfirmModal
        visible={showSuspendConfirm}
        title={isVi ? 'Tạm ngưng tổ chức' : 'Suspend Organization'}
        message={isVi ? 'Bạn có chắc muốn tạm ngưng tổ chức này?' : 'Are you sure you want to suspend this organization?'}
        confirmText={isVi ? 'Tạm ngưng' : 'Suspend'}
        confirmStyle="danger"
        icon="pause-circle"
        iconColor="#f87171"
        onConfirm={() => {
          setShowSuspendConfirm(false);
          if (pendingActionId) handleSuspend(pendingActionId);
        }}
        onCancel={() => setShowSuspendConfirm(false)}
        loading={processing === pendingActionId}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={isVi ? 'Thành công' : 'Success'}
        message={successMessage}
        buttonText={isVi ? 'Đã hiểu' : 'Got it'}
        onClose={() => setShowSuccessModal(false)}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        title={isVi ? 'Đã xảy ra lỗi' : 'Error'}
        message={errorMessage}
        buttonText={isVi ? 'Đóng' : 'Close'}
        onClose={() => setShowErrorModal(false)}
      />
    </AppShell>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, isLink && infoStyles.link]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.1)' },
  label: { fontSize: 13, color: '#64748b', flex: 1 },
  value: { fontSize: 13, color: '#f1f5f9', fontWeight: '500', textAlign: 'right', flex: 1 },
  link: { color: '#3b82f6' },
});

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 15 },
  
  // Summary
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16 },
  summaryIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  
  // List
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  
  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.2)' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  
  // Card
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitleGroup: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', letterSpacing: 0.2 },
  cardEmail: { fontSize: 12, color: '#64748b', marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  
  // Representative
  repRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  repItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  repSep: { color: '#64748b', fontSize: 12 },
  repText: { fontSize: 12, color: '#94a3b8' },
  
  // Card Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  actionReject: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(248, 113, 113, 0.12)' },
  actionRejectText: { fontSize: 13, color: '#f87171', fontWeight: '600' },
  actionApprove: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#10b981' },
  actionApproveText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  actionDisabled: { opacity: 0.6 },
  viewDetailRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  viewDetailText: { fontSize: 13, color: '#10b981', fontWeight: '500' },
  
  // Modal
  modalWrap: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', letterSpacing: 0.3 },
  modalCloseBtn: { padding: 4 },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16, paddingBottom: 32 },
  
  statusBanner: { marginBottom: 16 },
  statusBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  statusBannerText: { fontSize: 15, fontWeight: '700' },
  
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#10b981', marginBottom: 10, letterSpacing: 0.3 },
  infoCard: { backgroundColor: '#1e293b', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#334155' },
  messageBox: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.1)' },
  messageLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  messageText: { fontSize: 13, color: '#f1f5f9', fontStyle: 'italic', lineHeight: 20 },

  loginInfoNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  loginInfoText: { flex: 1, fontSize: 13, color: '#93c5fd', lineHeight: 18 },
  
  // Modal Actions
  modalActions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  actionRejectLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(248, 113, 113, 0.12)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.2)' },
  actionRejectLargeText: { fontSize: 14, color: '#f87171', fontWeight: '600' },
  actionApproveLarge: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10b981' },
  actionApproveLargeText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  actionResend: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#3b82f6' },
  actionResendText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  actionSuspendLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(248, 113, 113, 0.12)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.2)' },
  actionSuspendLargeText: { fontSize: 14, color: '#f87171', fontWeight: '600' },
  actionActivateLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10b981' },
  actionActivateLargeText: { fontSize: 14, color: '#fff', fontWeight: '600' },

  // Reject Modal
  rejectModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  rejectModalContent: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  rejectModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rejectModalTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  rejectInput: { backgroundColor: '#0f172a', borderRadius: 12, padding: 14, fontSize: 15, color: '#f1f5f9', minHeight: 100, textAlignVertical: 'top', marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  rejectModalActions: { flexDirection: 'row', gap: 12 },
  rejectCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#334155', alignItems: 'center' },
  rejectCancelText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  rejectConfirmBtn: { flex: 1.5, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f87171', alignItems: 'center' },
  rejectConfirmText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});
