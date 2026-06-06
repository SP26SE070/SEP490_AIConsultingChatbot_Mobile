import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getAccessToken } from '../../lib/auth-store';
import { API_BASE_URL } from '../../lib/api/config';
import { ConfirmModal, SuccessModal, ErrorModal } from '../../components/ui/CustomModal';
import { useNotification } from '../../lib/notification';
import { useResponsive } from '../../lib/useResponsive';

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
  const { showError } = useNotification();
  const { sz, fs, gap, width } = useResponsive();
  
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
        showError(errData?.message || (isVi ? 'Không thể từ chối tổ chức' : 'Cannot reject tenant'), t.error);
      }
    } catch (e) {
      showError(isVi ? 'Đã xảy ra lỗi' : 'An error occurred', t.error);
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
          <Text style={[styles.loadingText, { fontSize: fs(15) }]}>{t.loading}</Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={t.approveTenant} subtitle={isVi ? 'Quản lý tổ chức' : 'Manage Tenants'}>
      {/* Summary Stats */}
      <View style={[styles.summaryRow, { paddingHorizontal: sz(16), paddingVertical: sz(12), gap: sz(10) }]}>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(245, 158, 11, 0.08)', paddingVertical: sz(14), paddingHorizontal: sz(8), borderRadius: sz(16) }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)', width: sz(36), height: sz(36), borderRadius: sz(10), marginBottom: sz(6) }]}>
            <Ionicons name="time-outline" size={sz(18)} color="#f59e0b" />
          </View>
          <Text style={[styles.summaryValue, { fontSize: fs(22) }]}>{pendingCount}</Text>
          <Text style={[styles.summaryLabel, { fontSize: fs(11), marginTop: sz(2) }]}>{isVi ? 'Chờ duyệt' : 'Pending'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(34, 197, 94, 0.08)', paddingVertical: sz(14), paddingHorizontal: sz(8), borderRadius: sz(16) }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.15)', width: sz(36), height: sz(36), borderRadius: sz(10), marginBottom: sz(6) }]}>
            <Ionicons name="checkmark-circle-outline" size={sz(18)} color="#22c55e" />
          </View>
          <Text style={[styles.summaryValue, { fontSize: fs(22) }]}>{tenants.filter(t => t.status === 'ACTIVE').length}</Text>
          <Text style={[styles.summaryLabel, { fontSize: fs(11), marginTop: sz(2) }]}>{isVi ? 'Hoạt động' : 'Active'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(148, 163, 184, 0.08)', paddingVertical: sz(14), paddingHorizontal: sz(8), borderRadius: sz(16) }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(148, 163, 184, 0.15)', width: sz(36), height: sz(36), borderRadius: sz(10), marginBottom: sz(6) }]}>
            <Ionicons name="business-outline" size={sz(18)} color="#94a3b8" />
          </View>
          <Text style={[styles.summaryValue, { fontSize: fs(22) }]}>{tenants.length}</Text>
          <Text style={[styles.summaryLabel, { fontSize: fs(11), marginTop: sz(2) }]}>{isVi ? 'Tổng cộng' : 'Total'}</Text>
        </View>
      </View>

      {/* Tenant List */}
      <FlatList
        data={tenants}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingHorizontal: sz(16), paddingBottom: sz(20), gap: sz(12) }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { paddingVertical: sz(60), paddingHorizontal: sz(20) }]}>
            <View style={[styles.emptyIconWrap, { width: sz(80), height: sz(80), borderRadius: sz(40), marginBottom: sz(16) }]}>
              <Ionicons name="business-outline" size={sz(40)} color="#10b981" />
            </View>
            <Text style={[styles.emptyTitle, { fontSize: fs(17), marginBottom: sz(6) }]}>{isVi ? 'Chưa có tổ chức nào' : 'No organizations yet'}</Text>
            <Text style={[styles.emptySubtitle, { fontSize: fs(13) }]}>{isVi ? 'Danh sách tổ chức đăng ký sẽ xuất hiện tại đây' : 'Registered organizations will appear here'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = getStatusInfo(item.status);
          const isPending = item.status === 'PENDING';
          const isProcessingThis = processing === item.id;

          return (
            <TouchableOpacity 
              style={[styles.card, { padding: sz(16), borderRadius: sz(16) }]} 
              onPress={() => openDetail(item)}
              activeOpacity={0.75}
            >
              {/* Header */}
              <View style={[styles.cardHeader, { marginBottom: sz(12) }]}>
                <View style={[styles.cardLeft, { gap: sz(12) }]}>
                  <View style={[styles.cardIcon, { backgroundColor: statusInfo.bg, width: sz(40), height: sz(40), borderRadius: sz(12) }]}>
                    <Ionicons name={statusInfo.icon as any} size={sz(18)} color={statusInfo.color} />
                  </View>
                  <View style={styles.cardTitleGroup}>
                    <Text style={[styles.cardTitle, { fontSize: fs(15), letterSpacing: sz(0.2) }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.cardEmail, { fontSize: fs(12), marginTop: sz(3) }]} numberOfLines={1}>{item.contactEmail}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusInfo.bg, paddingHorizontal: sz(10), paddingVertical: sz(5), borderRadius: sz(20) }]}>
                  <Text style={[styles.statusPillText, { color: statusInfo.color, fontSize: fs(11) }]}>
                    {isVi ? statusInfo.labelVi : statusInfo.labelEn}
                  </Text>
                </View>
              </View>

              {/* Representative */}
              {item.representativeName && (
                <View style={[styles.repRow, { marginBottom: sz(12), gap: sz(6) }]}>
                  <View style={[styles.repItem, { gap: sz(4) }]}>
                    <Ionicons name="person-outline" size={sz(13)} color="#64748b" />
                    <Text style={[styles.repText, { fontSize: fs(12) }]}>{item.representativeName}</Text>
                  </View>
                  {item.representativePosition && (
                    <Text style={[styles.repSep, { fontSize: fs(12) }]}>·</Text>
                  )}
                  {item.representativePosition && (
                    <View style={[styles.repItem, { gap: sz(4) }]}>
                      <Ionicons name="briefcase-outline" size={sz(13)} color="#64748b" />
                      <Text style={[styles.repText, { fontSize: fs(12) }]}>{item.representativePosition}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={[styles.cardFooter, { paddingTop: sz(10), gap: sz(10) }]}>
                {isPending ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionReject, { paddingVertical: sz(10), paddingHorizontal: sz(14), borderRadius: sz(10), gap: sz(5) }]}
                      onPress={() => openRejectModal(item.id)}
                      disabled={isProcessingThis}
                    >
                      <Ionicons name="close-circle" size={sz(15)} color="#f87171" />
                      <Text style={[styles.actionRejectText, { fontSize: fs(13) }]}>{isVi ? 'Từ chối' : 'Reject'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionApprove, { paddingVertical: sz(10), borderRadius: sz(10), gap: sz(5) }]}
                      onPress={() => openApproveConfirm(item.id)}
                      disabled={isProcessingThis}
                    >
                      {isProcessingThis ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={sz(15)} color="#fff" />
                          <Text style={[styles.actionApproveText, { fontSize: fs(13) }]}>{isVi ? 'Duyệt' : 'Approve'}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={[styles.viewDetailRow, { gap: sz(4) }]}>
                    <Text style={[styles.viewDetailText, { fontSize: fs(13) }]}>{isVi ? 'Xem chi tiết' : 'View details'}</Text>
                    <Ionicons name="chevron-forward" size={sz(15)} color="#10b981" />
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
          <View style={[styles.modalHeader, { paddingHorizontal: sz(20), paddingVertical: sz(16) }]}>
            <Text style={[styles.modalHeaderTitle, { fontSize: fs(18), letterSpacing: sz(0.3) }]}>{isVi ? 'Chi tiết tổ chức' : 'Organization Details'}</Text>
            <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={[styles.modalCloseBtn, { padding: sz(4) }]}>
              <Ionicons name="close" size={sz(22)} color="#f1f5f9" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={[styles.modalScrollContent, { padding: sz(16), paddingBottom: sz(32) }]}>
            {selectedTenant && (
              <>
                {/* Status Banner */}
                <View style={[styles.statusBanner, { marginBottom: sz(16) }]}>
                  {(() => {
                    const info = getStatusInfo(selectedTenant.status);
                    return (
                      <View style={[styles.statusBannerInner, { backgroundColor: info.bg, paddingVertical: sz(12), borderRadius: sz(12), gap: sz(8) }]}>
                        <Ionicons name={info.icon as any} size={sz(22)} color={info.color} />
                        <Text style={[styles.statusBannerText, { color: info.color, fontSize: fs(15) }]}>
                          {isVi ? info.labelVi : info.labelEn}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Company Section */}
                <View style={[styles.section, { marginBottom: sz(16) }]}>
                  <Text style={[styles.sectionTitle, { fontSize: fs(14), marginBottom: sz(10), letterSpacing: sz(0.3) }]}>
                    <Ionicons name="business" size={sz(15)} color="#10b981" /> {isVi ? 'Thông tin công ty' : 'Company Information'}
                  </Text>
                  <View style={[styles.infoCard, { paddingHorizontal: sz(14), borderRadius: sz(14) }]}>
                    <InfoRow label={isVi ? 'Tên công ty' : 'Company Name'} value={selectedTenant.name} />
                    <InfoRow label={isVi ? 'Email liên hệ' : 'Contact Email'} value={selectedTenant.contactEmail} />
                    {selectedTenant.address && <InfoRow label={isVi ? 'Địa chỉ' : 'Address'} value={selectedTenant.address} />}
                    {selectedTenant.website && <InfoRow label={isVi ? 'Website' : 'Website'} value={selectedTenant.website} isLink />}
                    {selectedTenant.companySize && <InfoRow label={isVi ? 'Quy mô' : 'Company Size'} value={selectedTenant.companySize} />}
                  </View>
                </View>

                {/* Representative Section */}
                <View style={[styles.section, { marginBottom: sz(16) }]}>
                  <Text style={[styles.sectionTitle, { fontSize: fs(14), marginBottom: sz(10), letterSpacing: sz(0.3) }]}>
                    <Ionicons name="person" size={sz(15)} color="#10b981" /> {isVi ? 'Người đại diện' : 'Representative'}
                  </Text>
                  <View style={[styles.infoCard, { paddingHorizontal: sz(14), borderRadius: sz(14) }]}>
                    {selectedTenant.representativeName && <InfoRow label={isVi ? 'Họ tên' : 'Full Name'} value={selectedTenant.representativeName} />}
                    {selectedTenant.representativePosition && <InfoRow label={isVi ? 'Chức vụ' : 'Position'} value={selectedTenant.representativePosition} />}
                    {selectedTenant.representativePhone && <InfoRow label={isVi ? 'Điện thoại' : 'Phone'} value={selectedTenant.representativePhone} />}
                  </View>
                </View>

                {/* Request Section */}
                <View style={[styles.section, { marginBottom: sz(16) }]}>
                  <Text style={[styles.sectionTitle, { fontSize: fs(14), marginBottom: sz(10), letterSpacing: sz(0.3) }]}>
                    <Ionicons name="document-text" size={sz(15)} color="#10b981" /> {isVi ? 'Yêu cầu đăng ký' : 'Registration Request'}
                  </Text>
                  <View style={[styles.infoCard, { paddingHorizontal: sz(14), borderRadius: sz(14) }]}>
                    <InfoRow label={isVi ? 'Ngày đăng ký' : 'Request Date'} value={formatDate(selectedTenant.requestedAt || selectedTenant.createdAt)} />
                    {selectedTenant.requestMessage && (
                      <View style={[styles.messageBox, { paddingVertical: sz(10) }]}>
                        <Text style={[styles.messageLabel, { fontSize: fs(12), marginBottom: sz(6) }]}>{isVi ? 'Lời nhắn' : 'Message'}</Text>
                        <Text style={[styles.messageText, { fontSize: fs(13), lineHeight: fs(20) }]}>"{selectedTenant.requestMessage}"</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Review Info */}
                {(selectedTenant.reviewedAt || selectedTenant.rejectionReason) && (
                  <View style={[styles.section, { marginBottom: sz(16) }]}>
                    <Text style={[styles.sectionTitle, { fontSize: fs(14), marginBottom: sz(10), letterSpacing: sz(0.3) }]}>
                      <Ionicons name="shield-checkmark" size={sz(15)} color="#10b981" /> {isVi ? 'Thông tin duyệt' : 'Review Information'}
                    </Text>
                    <View style={[styles.infoCard, { paddingHorizontal: sz(14), borderRadius: sz(14) }]}>
                      {selectedTenant.approvedByName && <InfoRow label={isVi ? 'Người duyệt' : 'Approved By'} value={selectedTenant.approvedByName} />}
                      {selectedTenant.rejectedByName && <InfoRow label={isVi ? 'Người từ chối' : 'Rejected By'} value={selectedTenant.rejectedByName} />}
                      {selectedTenant.reviewedAt && <InfoRow label={isVi ? 'Ngày duyệt' : 'Reviewed At'} value={formatDate(selectedTenant.reviewedAt)} />}
                      {selectedTenant.rejectionReason && (
                        <View style={[styles.messageBox, { paddingVertical: sz(10) }]}>
                          <Text style={[styles.messageLabel, { fontSize: fs(12), marginBottom: sz(6) }]}>{isVi ? 'Lý do từ chối' : 'Rejection Reason'}</Text>
                          <Text style={[styles.messageText, { fontSize: fs(13), lineHeight: fs(20) }]}>{selectedTenant.rejectionReason}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Login Info Notice */}
                {selectedTenant.status === 'ACTIVE' && (
                  <View style={[styles.loginInfoNotice, { padding: sz(14), borderRadius: sz(12), gap: sz(10) }]}>
                    <Ionicons name="mail-outline" size={sz(20)} color="#3b82f6" />
                    <Text style={[styles.loginInfoText, { fontSize: fs(13), lineHeight: fs(18) }]}>
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
            <View style={[styles.modalActions, { padding: sz(16), gap: sz(12) }]}>
              {selectedTenant.status === 'PENDING' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionRejectLarge, { paddingVertical: sz(14), borderRadius: sz(12), gap: sz(6) }]}
                    onPress={() => {
                      setDetailModalOpen(false);
                      openRejectModal(selectedTenant.id);
                    }}
                    disabled={processing === selectedTenant.id}
                  >
                    <Ionicons name="close-circle" size={sz(20)} color="#f87171" />
                    <Text style={[styles.actionRejectLargeText, { fontSize: fs(14) }]}>{isVi ? 'Từ chối' : 'Reject'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionApproveLarge, { paddingVertical: sz(14), borderRadius: sz(12), gap: sz(6) }]}
                    onPress={() => openApproveConfirm(selectedTenant.id)}
                    disabled={processing === selectedTenant.id}
                  >
                    {processing === selectedTenant.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={sz(20)} color="#fff" />
                        <Text style={[styles.actionApproveLargeText, { fontSize: fs(14) }]}>{isVi ? 'Duyệt tổ chức' : 'Approve'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
              {selectedTenant.status === 'ACTIVE' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionResend, { paddingVertical: sz(14), borderRadius: sz(12), gap: sz(6) }]}
                    onPress={() => openResendConfirm(selectedTenant.id)}
                    disabled={processing === selectedTenant.id}
                  >
                    {processing === selectedTenant.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="mail-outline" size={sz(20)} color="#fff" />
                        <Text style={[styles.actionResendText, { fontSize: fs(14) }]}>{isVi ? 'Gửi lại thông tin' : 'Resend Credentials'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionSuspendLarge, { paddingVertical: sz(14), borderRadius: sz(12), gap: sz(6) }]}
                    onPress={() => openSuspendConfirm(selectedTenant.id)}
                    disabled={processing === selectedTenant.id}
                  >
                    <Ionicons name="pause-circle" size={sz(20)} color="#f87171" />
                    <Text style={[styles.actionSuspendLargeText, { fontSize: fs(14) }]}>{isVi ? 'Tạm ngưng' : 'Suspend'}</Text>
                  </TouchableOpacity>
                </>
              )}
              {selectedTenant.status === 'SUSPENDED' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionActivateLarge, { paddingVertical: sz(14), borderRadius: sz(12), gap: sz(6) }]}
                    onPress={() => handleActivate(selectedTenant.id)}
                    disabled={processing === selectedTenant.id}
                  >
                    {processing === selectedTenant.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="play-circle" size={sz(20)} color="#fff" />
                        <Text style={[styles.actionActivateLargeText, { fontSize: fs(14) }]}>{isVi ? 'Kích hoạt lại' : 'Activate'}</Text>
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
          <View style={[styles.rejectModalContent, { padding: sz(20), borderRadius: sz(16) }]}>
            <View style={[styles.rejectModalHeader, { marginBottom: sz(16) }]}>
              <Text style={[styles.rejectModalTitle, { fontSize: fs(18) }]}>{isVi ? 'Lý do từ chối' : 'Rejection Reason'}</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={sz(22)} color="#f1f5f9" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.rejectInput, { padding: sz(14), fontSize: fs(15), borderRadius: sz(12), minHeight: sz(100), marginBottom: sz(16) }]}
              placeholder={isVi ? 'Nhập lý do từ chối (tùy chọn)' : 'Enter rejection reason (optional)'}
              placeholderTextColor="#64748b"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={[styles.rejectModalActions, { gap: sz(12) }]}>
              <TouchableOpacity
                style={[styles.rejectCancelBtn, { paddingVertical: sz(14), borderRadius: sz(12) }]}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={[styles.rejectCancelText, { fontSize: fs(14) }]}>{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectConfirmBtn, { paddingVertical: sz(14), borderRadius: sz(12) }]}
                onPress={handleReject}
                disabled={processing === pendingTenantId}
              >
                {processing === pendingTenantId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.rejectConfirmText, { fontSize: fs(14) }]}>{isVi ? 'Xác nhận từ chối' : 'Confirm Reject'}</Text>
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

      {/* InfoRow component - defined inline to access responsive hooks */}
      {null}
    </AppShell>
  );

  // InfoRow component defined at end of function to access responsive hooks
  function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
    return (
      <View style={[infoStyles.row, { paddingVertical: sz(8) }]}>
        <Text style={[infoStyles.label, { fontSize: fs(13) }]}>{label}</Text>
        <Text style={[infoStyles.value, { fontSize: fs(13) }, isLink && infoStyles.link]} numberOfLines={2}>{value}</Text>
      </View>
    );
  }
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#64748b', flex: 1 },
  value: { color: '#f1f5f9', fontWeight: '500', textAlign: 'right', flex: 1 },
  link: { color: '#3b82f6' },
});

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8' },
  
  // Summary
  summaryRow: { flexDirection: 'row' },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryIconWrap: { alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontWeight: '700', color: '#f1f5f9' },
  summaryLabel: { color: '#94a3b8' },
  
  // List
  list: { flexGrow: 1 },
  
  // Empty
  emptyCard: { alignItems: 'center' },
  emptyIconWrap: { backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.2)' },
  emptyTitle: { fontWeight: '700', color: '#f1f5f9' },
  emptySubtitle: { color: '#64748b', textAlign: 'center' },
  
  // Card
  card: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: { alignItems: 'center', justifyContent: 'center' },
  cardTitleGroup: { flex: 1 },
  cardTitle: { fontWeight: '600', color: '#f1f5f9' },
  cardEmail: { color: '#64748b' },
  statusPill: {},
  statusPillText: { fontWeight: '600' },
  
  // Representative
  repRow: { flexDirection: 'row', alignItems: 'center' },
  repItem: { flexDirection: 'row', alignItems: 'center' },
  repSep: { color: '#64748b' },
  repText: { color: '#94a3b8' },
  
  // Card Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  actionReject: { flexDirection: 'row', alignItems: 'center' },
  actionRejectText: { color: '#f87171', fontWeight: '600' },
  actionApprove: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981' },
  actionApproveText: { color: '#fff', fontWeight: '600' },
  actionDisabled: { opacity: 0.6 },
  viewDetailRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  viewDetailText: { color: '#10b981', fontWeight: '500' },
  
  // Modal
  modalWrap: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalHeaderTitle: { fontWeight: '700', color: '#f1f5f9' },
  modalCloseBtn: {},
  modalScroll: { flex: 1 },
  modalScrollContent: {},
  
  statusBanner: {},
  statusBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statusBannerText: { fontWeight: '700' },
  
  section: {},
  sectionTitle: { fontWeight: '700', color: '#10b981' },
  infoCard: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  messageBox: { borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.1)' },
  messageLabel: { color: '#64748b' },
  messageText: { color: '#f1f5f9', fontStyle: 'italic' },

  loginInfoNotice: { flexDirection: 'row', alignItems: 'center' },
  loginInfoText: { flex: 1, color: '#93c5fd' },
  
  // Modal Actions
  modalActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1e293b' },
  actionRejectLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionRejectLargeText: { color: '#f87171', fontWeight: '600' },
  actionApproveLarge: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981' },
  actionApproveLargeText: { color: '#fff', fontWeight: '600' },
  actionResend: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6' },
  actionResendText: { color: '#fff', fontWeight: '600' },
  actionSuspendLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionSuspendLargeText: { color: '#f87171', fontWeight: '600' },
  actionActivateLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981' },
  actionActivateLargeText: { color: '#fff', fontWeight: '600' },

  // Reject Modal
  rejectModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  rejectModalContent: { backgroundColor: '#1e293b', width: '100%', maxWidth: 400 },
  rejectModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rejectModalTitle: { fontWeight: '700', color: '#f1f5f9' },
  rejectInput: { backgroundColor: '#0f172a', color: '#f1f5f9', textAlignVertical: 'top', borderWidth: 1, borderColor: '#334155' },
  rejectModalActions: { flexDirection: 'row' },
  rejectCancelBtn: { flex: 1, borderRadius: 12, backgroundColor: '#334155', alignItems: 'center' },
  rejectCancelText: { color: '#94a3b8', fontWeight: '600' },
  rejectConfirmBtn: { flex: 1.5, borderRadius: 12, backgroundColor: '#f87171', alignItems: 'center' },
  rejectConfirmText: { color: '#fff', fontWeight: '600' },
});
